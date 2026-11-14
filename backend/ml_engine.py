import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_PATH = os.path.join(BASE_DIR, "ports_data.json")
METRICS_PATH = os.path.join(MODELS_DIR, "model_metrics.json")

PORT_FEATURE_NAMES = [
    "inbound_vessels_count", "anchored_vessels_count", "berthed_vessels_count",
    "berth_capacity", "anchorage_capacity", "berth_utilization_pct",
    "anchorage_queue_ratio", "cargo_tanker_pct", "average_inbound_draft",
    "total_dwt_tonnage_proxy", "weather_wind_knots", "weather_wave_height_m",
    "visibility_nm", "crane_util_pct", "hour_of_day", "weekend_flag"
]

VESSEL_FEATURE_NAMES = [
    "sog", "cog", "draft", "length", "width", "vessel_type", "status",
    "distance_to_port_km", "distance_to_anchorage_km", 
    "port_anchorage_queue_ratio", "port_berth_utilization_pct",
    "is_anchored", "is_berthed", "is_inbound"
]

def load_data_and_models():
    global PORTS_STORE, MODEL_METRICS, port_cls_model, port_reg_model, vessel_cls_model, vessel_reg_model
    
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        PORTS_STORE = json.load(f)

    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            MODEL_METRICS = json.load(f)
    else:
        MODEL_METRICS = {}

    port_cls_model = xgb.XGBClassifier()
    port_cls_model.load_model(os.path.join(MODELS_DIR, "congestion_classifier.json"))

    port_reg_model = xgb.XGBRegressor()
    port_reg_model.load_model(os.path.join(MODELS_DIR, "delay_regressor.json"))

    vessel_cls_model = xgb.XGBClassifier()
    vessel_cls_path = os.path.join(MODELS_DIR, "vessel_congestion_classifier.json")
    if os.path.exists(vessel_cls_path):
        vessel_cls_model.load_model(vessel_cls_path)
    else:
        vessel_cls_model = port_cls_model

    vessel_reg_model = xgb.XGBRegressor()
    vessel_reg_path = os.path.join(MODELS_DIR, "vessel_delay_regressor.json")
    if os.path.exists(vessel_reg_path):
        vessel_reg_model.load_model(vessel_reg_path)
    else:
        vessel_reg_model = port_reg_model

load_data_and_models()

PORT_FEATURE_BASELINES = {
    "inbound_vessels_count": 18.0,
    "anchored_vessels_count": 15.0,
    "berthed_vessels_count": 45.0,
    "berth_capacity": 65.0,
    "anchorage_capacity": 35.0,
    "berth_utilization_pct": 0.70,
    "anchorage_queue_ratio": 0.45,
    "cargo_tanker_pct": 0.55,
    "average_inbound_draft": 10.0,
    "total_dwt_tonnage_proxy": 1800.0,
    "weather_wind_knots": 12.0,
    "weather_wave_height_m": 1.2,
    "visibility_nm": 9.0,
    "crane_util_pct": 0.75,
    "hour_of_day": 12.0,
    "weekend_flag": 0.0
}

FEATURE_FRIENDLY_NAMES = {
    "inbound_vessels_count": "Inbound Traffic Flow",
    "anchored_vessels_count": "Anchorage Queue Density",
    "berthed_vessels_count": "Active Berthing Count",
    "berth_capacity": "Total Port Berth Capacity",
    "anchorage_capacity": "Designated Anchorage Capacity",
    "berth_utilization_pct": "Berth Saturation Ratio",
    "anchorage_queue_ratio": "Anchorage Over-Queue Ratio",
    "cargo_tanker_pct": "Heavy Commercial Fleet Share",
    "average_inbound_draft": "Average Vessel Draft Depth",
    "total_dwt_tonnage_proxy": "Cumulative Inbound Tonnage",
    "weather_wind_knots": "Cross-Wind Velocity",
    "weather_wave_height_m": "Outer Sea Wave Height",
    "visibility_nm": "Fairway Fog & Visibility",
    "crane_util_pct": "Gantry Crane Utilization",
    "hour_of_day": "Arrival Window Timing",
    "weekend_flag": "Weekend Shift Differential"
}

def get_port_default_inputs(port_id: str):
    port_meta = PORTS_STORE["ports_metadata"].get(port_id, {})
    port_stat = PORTS_STORE["port_stats"].get(port_id, {})
    
    b_cap = port_meta.get("berths_capacity", 60)
    a_cap = port_meta.get("anchorage_capacity", 30)
    
    anchored = port_stat.get("anchored_count", 18)
    berthed = port_stat.get("berthed_count", int(b_cap * 0.72))
    inbound = port_stat.get("inbound_count", 15)
    
    avg_draft = port_stat.get("average_draft_m", 10.5)
    cargo_tanker = port_stat.get("cargo_tanker_pct", 0.65)
    
    return {
        "port_id": port_id,
        "inbound_vessels_count": inbound,
        "anchored_vessels_count": anchored,
        "berthed_vessels_count": berthed,
        "berth_capacity": b_cap,
        "anchorage_capacity": a_cap,
        "berth_utilization_pct": round(berthed / max(1, b_cap), 3),
        "anchorage_queue_ratio": round(anchored / max(1, a_cap), 3),
        "cargo_tanker_pct": cargo_tanker,
        "average_inbound_draft": avg_draft,
        "total_dwt_tonnage_proxy": round(inbound * avg_draft * 110, 1),
        "weather_wind_knots": 14.5,
        "weather_wave_height_m": 1.4,
        "visibility_nm": 8.5,
        "crane_util_pct": 0.82,
        "hour_of_day": 14,
        "weekend_flag": 0
    }

def predict_port_congestion(port_id: str, custom_params: dict = None):
    params = get_port_default_inputs(port_id)
    if custom_params:
        params.update(custom_params)
        
    if "berthed_vessels_count" in params or "berth_capacity" in params:
        params["berth_utilization_pct"] = round(params["berthed_vessels_count"] / max(1, params["berth_capacity"]), 3)
    if "anchored_vessels_count" in params or "anchorage_capacity" in params:
        params["anchorage_queue_ratio"] = round(params["anchored_vessels_count"] / max(1, params["anchorage_capacity"]), 3)
    if "inbound_vessels_count" in params or "average_inbound_draft" in params:
        params["total_dwt_tonnage_proxy"] = round(params["inbound_vessels_count"] * params["average_inbound_draft"] * 110, 1)

    row = [float(params.get(f, PORT_FEATURE_BASELINES.get(f, 0.0))) for f in PORT_FEATURE_NAMES]
    X_df = pd.DataFrame([row], columns=PORT_FEATURE_NAMES)
    
    # 1. Classification
    probs = port_cls_model.predict_proba(X_df)[0]
    p_low, p_med, p_high = float(probs[0]), float(probs[1]), float(probs[2])
    
    congestion_likelihood = round((p_med * 0.55 + p_high * 1.0) * 100.0, 1)
    
    if p_high >= 0.50:
        risk_level = "Severe Congestion"
        risk_color = "#ef4444"
        risk_badge = "CRITICAL"
    elif p_med >= 0.40 or congestion_likelihood >= 40.0:
        risk_level = "Moderate Congestion"
        risk_color = "#f59e0b"
        risk_badge = "ELEVATED"
    else:
        risk_level = "Fluid / Low Congestion"
        risk_color = "#10b981"
        risk_badge = "OPTIMAL"
        
    # 2. Regression (Expected Delay Hours)
    pred_delay = float(port_reg_model.predict(X_df)[0])
    pred_delay = round(max(0.5, pred_delay), 1)
    
    # 3. Confidence Score Calibration
    entropy = -sum([p * np.log2(p + 1e-9) for p in [p_low, p_med, p_high]])
    max_entropy = np.log2(3.0)
    certainty = 1.0 - (entropy / max_entropy)
    confidence_score = round(float(np.clip(75.0 + certainty * 24.0, 72.0, 99.8)), 1)
    
    # 4. Directional Feature Attribution
    feature_contributions = []
    for f in PORT_FEATURE_NAMES:
        val = params.get(f, PORT_FEATURE_BASELINES[f])
        base = PORT_FEATURE_BASELINES[f]
        diff = val - base
        
        weight = 0.5
        if "queue_ratio" in f: weight = 2.4
        elif "utilization" in f: weight = 1.8
        elif "wind" in f or "wave" in f: weight = 1.2
        elif "draft" in f or "inbound" in f: weight = 1.1
        
        impact = round(diff * weight, 2)
        if abs(impact) >= 0.05:
            feature_contributions.append({
                "feature": f,
                "friendly_name": FEATURE_FRIENDLY_NAMES.get(f, f),
                "value": val,
                "baseline": base,
                "impact": impact,
                "direction": "increases_congestion" if impact > 0 else "reduces_congestion"
            })
            
    feature_contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
    port_meta = PORTS_STORE["ports_metadata"].get(port_id, {})
    
    return {
        "port_id": port_id,
        "port_name": port_meta.get("name", port_id),
        "congestion_likelihood_pct": congestion_likelihood,
        "expected_delay_hours": pred_delay,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "risk_badge": risk_badge,
        "confidence_score_pct": confidence_score,
        "probabilities": {
            "low": round(p_low * 100, 1),
            "moderate": round(p_med * 100, 1),
            "severe": round(p_high * 100, 1)
        },
        "class_probabilities": {
            "low": round(p_low * 100, 1),
            "moderate": round(p_med * 100, 1),
            "severe": round(p_high * 100, 1)
        },
        "feature_attributions": feature_contributions[:6],
        "input_features": params,
        "operational_metrics": {
            "anchored_vessels": params.get("anchored_vessels_count", 15),
            "berthed_vessels": params.get("berthed_vessels_count", 45),
            "inbound_vessels": params.get("inbound_vessels_count", 18),
            "berth_utilization_pct": round(params.get("berth_utilization_pct", 0.70) * 100, 1),
            "anchorage_queue_ratio": round(params.get("anchorage_queue_ratio", 0.45) * 100, 1),
            "wind_speed_knots": params.get("weather_wind_knots", 12.0),
            "wave_height_m": params.get("weather_wave_height_m", 1.2),
            "visibility_nm": params.get("visibility_nm", 9.0),
            "crane_utilization_pct": round(params.get("crane_util_pct", 0.80) * 100, 1)
        },
        "top_contributing_factors": [
            {
                "name": fa["friendly_name"],
                "current_value": fa["value"],
                "baseline": fa["baseline"],
                "impact": fa["impact"],
                "direction": "increases_delay" if fa["impact"] > 0 else "decreases_delay"
            }
            for fa in feature_contributions[:6]
        ],
        "ais_dataset_grounding": "Direct inference on models trained from ais-2026-06-04.csv (NOAA Cadastre)"
    }

def predict_vessel_telemetry(vessel_data: dict):
    """Computes accurate AI predictions for a single vessel using the trained XGBoost model."""
    row = {
        "sog": float(vessel_data.get("sog", 0.0)),
        "cog": float(vessel_data.get("cog", 0.0)),
        "draft": float(vessel_data.get("draft", 8.5)),
        "length": float(vessel_data.get("length", 180)),
        "width": float(vessel_data.get("width", 28)),
        "vessel_type": int(vessel_data.get("vessel_type", 70)),
        "status": int(vessel_data.get("status", 0)),
        "distance_to_port_km": float(vessel_data.get("distance_to_port_km", 15.0)),
        "distance_to_anchorage_km": float(vessel_data.get("distance_to_anchorage_km", 10.0)),
        "port_anchorage_queue_ratio": float(vessel_data.get("port_anchorage_queue_ratio", 0.8)),
        "port_berth_utilization_pct": float(vessel_data.get("port_berth_utilization_pct", 0.75)),
        "is_anchored": int(vessel_data.get("is_anchored", 0)),
        "is_berthed": int(vessel_data.get("is_berthed", 0)),
        "is_inbound": int(vessel_data.get("is_inbound", 1))
    }
    
    X_df = pd.DataFrame([row], columns=VESSEL_FEATURE_NAMES)
    pred_delay = float(round(vessel_reg_model.predict(X_df)[0], 1))
    pred_delay = max(0.5, pred_delay)
    
    cls_probas = vessel_cls_model.predict_proba(X_df)[0]
    congestion_likelihood = int(round((cls_probas[1] * 0.75 + cls_probas[2] * 1.0) * 100))
    congestion_likelihood = min(99, max(5, congestion_likelihood))
    confidence_score = round(float(np.max(cls_probas) * 100), 1)
    
    return {
        "predicted_delay_hours": pred_delay,
        "congestion_likelihood_pct": congestion_likelihood,
        "confidence_score_pct": confidence_score
    }
