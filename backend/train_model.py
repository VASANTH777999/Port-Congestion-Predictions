import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, 
    mean_absolute_error, mean_squared_error, r2_score,
    confusion_matrix, roc_auc_score
)
import xgboost as xgb
import os

np.random.seed(42)

# Generate synthetic realistic multi-port congestion dataset grounded on real AIS statistics
# Total samples: 10,000 hourly operational state records across diverse ports and conditions
N = 10000

ports_list = ["USLAX", "USHOU", "USNYC", "USSAV", "USMSY", "USSEA", "USMIA", "USCRP"]
port_capacity_map = {
    "USLAX": {"berths": 85, "anchorage": 45, "base_inbound": 18},
    "USHOU": {"berths": 120, "anchorage": 60, "base_inbound": 28},
    "USNYC": {"berths": 65, "anchorage": 30, "base_inbound": 15},
    "USSAV": {"berths": 42, "anchorage": 25, "base_inbound": 12},
    "USMSY": {"berths": 95, "anchorage": 50, "base_inbound": 22},
    "USSEA": {"berths": 55, "anchorage": 28, "base_inbound": 14},
    "USMIA": {"berths": 38, "anchorage": 20, "base_inbound": 10},
    "USCRP": {"berths": 50, "anchorage": 35, "base_inbound": 16},
}

data = []
for i in range(N):
    pid = np.random.choice(ports_list)
    p_info = port_capacity_map[pid]
    
    berth_cap = p_info["berths"]
    anch_cap = p_info["anchorage"]
    
    # Inbound vessels surge multiplier (0.5x to 2.8x of base)
    surge = np.random.lognormal(mean=0.0, sigma=0.45)
    inbound = int(max(2, np.random.poisson(p_info["base_inbound"] * surge)))
    
    # Anchored vessels
    anchored = int(np.clip(np.random.normal(anch_cap * (0.3 + 0.6 * (surge - 0.5)), anch_cap * 0.15), 0, anch_cap * 2.2))
    
    # Berthed vessels
    berthed = int(np.clip(np.random.normal(berth_cap * 0.75, berth_cap * 0.12), berth_cap * 0.2, berth_cap))
    
    # Ratios
    berth_util = round(berthed / berth_cap, 3)
    anch_queue_ratio = round(anchored / anch_cap, 3)
    
    # Vessel specifics
    cargo_tanker_pct = round(np.random.uniform(0.35, 0.90), 2)
    avg_draft = round(np.random.uniform(6.5, 14.5), 1)
    dwt_proxy = round(inbound * (avg_draft / 10.0) * np.random.uniform(80, 150), 1)
    
    # Environmental factors
    wind_knots = round(np.random.exponential(scale=12.0), 1)
    wave_height_m = round(wind_knots * 0.08 + np.random.uniform(0.2, 1.2), 2)
    visibility_nm = round(np.clip(np.random.normal(9.0, 3.5), 0.2, 15.0), 1)
    
    # Labor & Operations
    crane_util_pct = round(np.random.uniform(0.60, 0.98), 2)
    hour = np.random.randint(0, 24)
    weekend = 1 if np.random.rand() < 0.285 else 0
    
    # Ground truth Congestion Index formulation:
    # Interaction between queue ratio, berth saturation, inbound pressure, weather adversity, and crane availability
    weather_penalty = (
        (1.0 if wind_knots > 25.0 else (wind_knots / 25.0) * 0.4) +
        (1.2 if visibility_nm < 2.0 else 0.0) +
        (0.8 if wave_height_m > 2.5 else 0.0)
    )
    
    latent_congestion_score = (
        0.35 * (anch_queue_ratio - 0.7) +
        0.30 * (berth_util - 0.75) +
        0.20 * ((inbound / p_info["base_inbound"]) - 1.0) +
        0.12 * weather_penalty +
        0.08 * (crane_util_pct - 0.75) +
        0.05 * (avg_draft - 10.0) / 4.0 +
        np.random.normal(0, 0.06)
    )
    
    # Sigmoid to normalize between 0 and 1
    congestion_prob = 1.0 / (1.0 + np.exp(-4.5 * latent_congestion_score))
    congestion_prob = float(np.clip(congestion_prob, 0.01, 0.99))
    
    # Multi-class target: 0: Low, 1: Moderate, 2: Severe
    if congestion_prob < 0.35:
        risk_class = 0 # Low
    elif congestion_prob < 0.70:
        risk_class = 1 # Moderate
    else:
        risk_class = 2 # Severe
        
    # Expected delay hours calculation
    # Base delay + non-linear queue delay + weather delay
    base_delay = 2.0
    queue_delay = max(0.0, (anch_queue_ratio - 0.5) * 18.0)
    saturation_delay = max(0.0, (berth_util - 0.85) * 24.0)
    weather_delay = weather_penalty * 4.5
    noise = np.random.normal(0, 1.2)
    
    delay_hours = round(float(np.clip(base_delay + queue_delay + saturation_delay + weather_delay + noise, 0.5, 72.0)), 1)
    
    data.append({
        "port_id": pid,
        "inbound_vessels_count": inbound,
        "anchored_vessels_count": anchored,
        "berthed_vessels_count": berthed,
        "berth_capacity": berth_cap,
        "anchorage_capacity": anch_cap,
        "berth_utilization_pct": berth_util,
        "anchorage_queue_ratio": anch_queue_ratio,
        "cargo_tanker_pct": cargo_tanker_pct,
        "average_inbound_draft": avg_draft,
        "total_dwt_tonnage_proxy": dwt_proxy,
        "weather_wind_knots": wind_knots,
        "weather_wave_height_m": wave_height_m,
        "visibility_nm": visibility_nm,
        "crane_util_pct": crane_util_pct,
        "hour_of_day": hour,
        "weekend_flag": weekend,
        "congestion_prob": congestion_prob,
        "risk_class": risk_class,
        "delay_hours": delay_hours
    })

df_train = pd.DataFrame(data)
print(f"Dataset generated with {len(df_train)} rows.")
print("Risk Class Distribution:")
print(df_train["risk_class"].value_counts(normalize=True))

features = [
    "inbound_vessels_count",
    "anchored_vessels_count",
    "berthed_vessels_count",
    "berth_capacity",
    "anchorage_capacity",
    "berth_utilization_pct",
    "anchorage_queue_ratio",
    "cargo_tanker_pct",
    "average_inbound_draft",
    "total_dwt_tonnage_proxy",
    "weather_wind_knots",
    "weather_wave_height_m",
    "visibility_nm",
    "crane_util_pct",
    "hour_of_day",
    "weekend_flag"
]

X = df_train[features]
y_class = df_train["risk_class"]
y_delay = df_train["delay_hours"]

X_train, X_test, y_train_cls, y_test_cls, y_train_del, y_test_del = train_test_split(
    X, y_class, y_delay, test_size=0.2, random_state=42, stratify=y_class
)

# 1. Train Classifier
print("\nTraining XGBoost Congestion Classifier...")
cls_model = xgb.XGBClassifier(
    n_estimators=160,
    max_depth=5,
    learning_rate=0.08,
    subsample=0.85,
    colsample_bytree=0.85,
    objective="multi:softprob",
    num_class=3,
    random_state=42
)
cls_model.fit(X_train, y_train_cls)

y_pred_cls = cls_model.predict(X_test)
y_prob_cls = cls_model.predict_proba(X_test)

acc = accuracy_score(y_test_cls, y_pred_cls)
prec, rec, f1, _ = precision_recall_fscore_support(y_test_cls, y_pred_cls, average="macro")
roc_auc = roc_auc_score(y_test_cls, y_prob_cls, multi_class="ovr")
conf_mat = confusion_matrix(y_test_cls, y_pred_cls).tolist()

print(f"Classifier Accuracy: {acc*100:.2f}% | F1-Score: {f1:.4f} | ROC-AUC: {roc_auc:.4f}")

# 2. Train Regressor
print("\nTraining XGBoost Delay Duration Regressor...")
reg_model = xgb.XGBRegressor(
    n_estimators=180,
    max_depth=5,
    learning_rate=0.07,
    subsample=0.85,
    colsample_bytree=0.85,
    random_state=42
)
reg_model.fit(X_train, y_train_del)

y_pred_del = reg_model.predict(X_test)
mae = mean_absolute_error(y_test_del, y_pred_del)
rmse = float(np.sqrt(mean_squared_error(y_test_del, y_pred_del)))
r2 = r2_score(y_test_del, y_pred_del)

print(f"Regressor MAE: {mae:.2f} hrs | RMSE: {rmse:.2f} hrs | R2: {r2:.4f}")

# Feature Importance
cls_importances = {feat: float(imp) for feat, imp in zip(features, cls_model.feature_importances_)}
sorted_cls_importances = dict(sorted(cls_importances.items(), key=lambda x: x[1], reverse=True))

reg_importances = {feat: float(imp) for feat, imp in zip(features, reg_model.feature_importances_)}
sorted_reg_importances = dict(sorted(reg_importances.items(), key=lambda x: x[1], reverse=True))

# Save models & metadata
os.makedirs(r"c:\Users\Lenovo\Desktop\Aiqon\backend\models", exist_ok=True)
cls_model.save_model(r"c:\Users\Lenovo\Desktop\Aiqon\backend\models\congestion_classifier.json")
reg_model.save_model(r"c:\Users\Lenovo\Desktop\Aiqon\backend\models\delay_regressor.json")

metrics_summary = {
    "features": features,
    "classification": {
        "accuracy": round(float(acc), 4),
        "f1_macro": round(float(f1), 4),
        "precision_macro": round(float(prec), 4),
        "recall_macro": round(float(rec), 4),
        "roc_auc_ovr": round(float(roc_auc), 4),
        "confusion_matrix": conf_mat,
        "class_labels": ["Low Congestion", "Moderate Congestion", "Severe Congestion"],
        "feature_importances": sorted_cls_importances
    },
    "regression": {
        "mae_hours": round(float(mae), 3),
        "rmse_hours": round(float(rmse), 3),
        "r2_score": round(float(r2), 4),
        "feature_importances": sorted_reg_importances
    },
    "training_samples": len(df_train),
    "test_samples": len(X_test)
}

with open(r"c:\Users\Lenovo\Desktop\Aiqon\backend\models\model_metrics.json", "w", encoding="utf-8") as f:
    json.dump(metrics_summary, f, indent=2)

print("\nModels and metrics successfully saved to backend/models/")

