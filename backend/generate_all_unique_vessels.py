import os
import time
import math
import datetime
import json
import numpy as np
import pandas as pd
import polars as pl
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AIS_CSV_PATH = os.path.join(os.path.dirname(BASE_DIR), "AIS Vessel Data", "ais-2026-06-04.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
OUTPUT_PATH = os.path.join(BASE_DIR, "all_unique_vessels.json")

print(f"Loading raw AIS data from: {AIS_CSV_PATH}")
t0 = time.time()

# 1. Polars scan and extract last known record for each unique MMSI
lazy_df = pl.scan_csv(AIS_CSV_PATH, infer_schema_length=10000, ignore_errors=True)
unique_df = (
    lazy_df
    .sort("base_date_time")
    .group_by("mmsi")
    .last()
    .collect()
)

print(f"Extracted {len(unique_df):,} unique vessels in {time.time() - t0:.2f}s")

# Port definitions to assign nearest port and calculate port context
PORTS_CONFIG = {
    "USLAX": {"name": "Port of Los Angeles & Long Beach", "lat": 33.7432, "lon": -118.2673, "b_cap": 85, "a_cap": 45},
    "USHOU": {"name": "Port of Houston", "lat": 29.7529, "lon": -95.0503, "b_cap": 120, "a_cap": 60},
    "USNYC": {"name": "Port of New York & New Jersey", "lat": 40.6728, "lon": -74.1235, "b_cap": 65, "a_cap": 30},
    "USSAV": {"name": "Port of Savannah", "lat": 32.1315, "lon": -81.1412, "b_cap": 42, "a_cap": 25},
    "USMSY": {"name": "Port of New Orleans", "lat": 29.9312, "lon": -90.0715, "b_cap": 95, "a_cap": 50},
    "USSEA": {"name": "Port of Seattle & Tacoma (NWSA)", "lat": 47.6062, "lon": -122.3321, "b_cap": 55, "a_cap": 28},
    "USMIA": {"name": "PortMiami", "lat": 25.7781, "lon": -80.1794, "b_cap": 38, "a_cap": 20},
    "USCRP": {"name": "Port of Corpus Christi", "lat": 27.8106, "lon": -97.3994, "b_cap": 50, "a_cap": 35}
}

ORIGIN_PORTS = [
    "Shanghai, China (CNSHA)", "Rotterdam, Netherlands (NLRTM)", "Busan, South Korea (KRPUS)",
    "Antwerp, Belgium (BEANR)", "Santos, Brazil (BRSSZ)", "Tokyo, Japan (JPTYO)",
    "Singapore (SGSIN)", "Veracruz, Mexico (MXVER)", "Hamburg, Germany (DEHAM)",
    "Ningbo-Zhoushan, China (CNNGB)", "Kaohsiung, Taiwan (TWKHH)", "Cartagena, Colombia (COCTG)"
]

STATUS_DESCRIPTIONS = {
    0: "Under way using engine",
    1: "At anchor",
    2: "Not under command",
    3: "Restricted manoeuvrability",
    4: "Constrained by draft",
    5: "Moored / Berthed",
    6: "Aground",
    7: "Engaged in fishing",
    8: "Under way sailing",
    15: "Undefined"
}

TYPE_DESCRIPTIONS = {
    70: "Cargo / Container (General)",
    71: "Cargo / Hazardous Cat A",
    72: "Cargo / Hazardous Cat B",
    73: "Cargo / Hazardous Cat C",
    74: "Cargo / Hazardous Cat D",
    79: "Cargo / No Additional Info",
    80: "Tanker / Crude Petroleum",
    81: "Tanker / Hazardous Cat A",
    82: "Tanker / Hazardous Cat B",
    83: "Tanker / Hazardous Cat C",
    84: "Tanker / Hazardous Cat D",
    89: "Tanker / No Additional Info",
    31: "Tug / Towing Vessel",
    32: "Tug / Towing Long / Broad",
    52: "Tug / Push Towing Tender",
    60: "Passenger / Cruise Liner",
    69: "Passenger / Ferry",
    30: "Fishing Fleet",
    36: "Sailing Vessel",
    37: "Pleasure Craft / Yacht",
    50: "Pilot Boarding Craft",
    51: "Search and Rescue Vessel",
    53: "Port Tender / Harbor Workboat",
    55: "Law Enforcement / Coast Guard",
    90: "Special Purpose Vessel",
    99: "Dry Bulk / Heavy Lift"
}

def get_vessel_type_label(type_code):
    if not type_code or type_code < 0:
        return "Cargo / Commercial"
    if type_code in TYPE_DESCRIPTIONS:
        return TYPE_DESCRIPTIONS[type_code]
    if 70 <= type_code <= 79:
        return "Cargo / Container"
    if 80 <= type_code <= 89:
        return "Tanker / Liquid Bulk"
    if type_code in [31, 32, 52]:
        return "Tug / Towing"
    if 60 <= type_code <= 69:
        return "Passenger / Cruise"
    return f"Special Craft (Type {type_code})"

def get_status_label(status_code):
    if status_code in STATUS_DESCRIPTIONS:
        return STATUS_DESCRIPTIONS[status_code]
    return "Under way using engine"

# Load trained XGBoost models
vessel_cls_model = xgb.XGBClassifier()
vessel_cls_model.load_model(os.path.join(MODELS_DIR, "vessel_congestion_classifier.json"))

vessel_reg_model = xgb.XGBRegressor()
vessel_reg_model.load_model(os.path.join(MODELS_DIR, "vessel_delay_regressor.json"))

print("Loaded XGBoost Vessel Classifier & Regressor.")

# Vectorized feature creation
records = unique_df.to_dicts()
print(f"Processing {len(records)} records...")

feature_rows = []
enriched_records = []

port_items = list(PORTS_CONFIG.items())
port_lats = np.array([p[1]["lat"] for p in port_items])
port_lons = np.array([p[1]["lon"] for p in port_items])

for r in records:
    mmsi = int(r["mmsi"])
    vlat = float(r["latitude"]) if r["latitude"] is not None else 33.74
    vlon = float(r["longitude"]) if r["longitude"] is not None else -118.26
    
    # Filter out wild outliers outside plausible maritime navigation bounds if any
    if vlat < -90 or vlat > 90 or vlon < -180 or vlon > 180:
        continue

    vsog = float(r["sog"]) if r["sog"] is not None else 0.0
    vcog = float(r["cog"]) if r["cog"] is not None else 0.0
    vhead = int(r["heading"]) if r["heading"] is not None and r["heading"] != 511 else int(vcog)
    vlen = int(r["length"]) if r["length"] is not None else 120
    vwid = int(r["width"]) if r["width"] is not None else 20
    vdraft = float(r["draft"]) if r["draft"] is not None else 7.5
    vtc = int(r["vessel_type"]) if r["vessel_type"] is not None else 70
    vst = int(r["status"]) if r["status"] is not None else 0
    vcg = int(r["cargo"]) if r["cargo"] is not None else vtc
    vtcvr = str(r["transceiver"]).strip().upper() if r["transceiver"] else "A"
    
    vname = str(r["vessel_name"]).strip() if r["vessel_name"] and str(r["vessel_name"]).strip() != "" else f"VESSEL-{mmsi}"
    imo = str(r["imo"]).strip() if r["imo"] and str(r["imo"]).strip() not in ["", "0"] else f"IMO{900000 + (mmsi % 99999)}"
    call_sign = str(r["call_sign"]).strip() if r["call_sign"] and str(r["call_sign"]).strip() != "" else f"WD{mmsi % 9999}"
    btime = str(r["base_date_time"]) if r["base_date_time"] else "2026-06-04 12:00:00"

    # Find nearest port among the 8 hubs
    dists_sq = (port_lats - vlat)**2 + (port_lons - vlon)**2
    nearest_idx = int(np.argmin(dists_sq))
    nearest_pid, nearest_pcfg = port_items[nearest_idx]
    dist_to_port_km = round(float(math.sqrt(dists_sq[nearest_idx]) * 111.0), 1)
    dist_to_anch_km = round(max(0.5, dist_to_port_km - 8.0), 1)

    is_anchored = 1 if (vst == 1 or (dist_to_port_km < 25 and vsog < 1.0 and vst != 5)) else 0
    is_berthed = 1 if (vst == 5 or (dist_to_port_km < 5.0 and vsog < 0.4)) else 0
    is_inbound = 1 if (vsog >= 1.5 and not is_berthed) else 0

    if is_anchored:
        op_status = "At Anchor"
    elif is_berthed:
        op_status = "Moored / Berthed"
    else:
        op_status = "Underway Using Engine"

    # Approximate port congestion state proxy
    port_anch_ratio = 0.65 if is_anchored else 0.45
    port_berth_util = 0.75 if is_berthed else 0.60

    feature_rows.append({
        "sog": vsog,
        "cog": vcog,
        "draft": vdraft,
        "length": vlen,
        "width": vwid,
        "vessel_type": vtc,
        "status": vst,
        "distance_to_port_km": dist_to_port_km,
        "distance_to_anchorage_km": dist_to_anch_km,
        "port_anchorage_queue_ratio": port_anch_ratio,
        "port_berth_utilization_pct": port_berth_util,
        "is_anchored": is_anchored,
        "is_berthed": is_berthed,
        "is_inbound": is_inbound
    })

    enriched_records.append({
        "mmsi": mmsi,
        "base_date_time": btime,
        "longitude": round(vlon, 5),
        "latitude": round(vlat, 5),
        "sog": round(vsog, 1),
        "cog": round(vcog, 1),
        "heading": vhead,
        "vessel_name": vname,
        "imo": imo,
        "call_sign": call_sign,
        "vessel_type": vtc,
        "vessel_type_label": get_vessel_type_label(vtc),
        "status": vst,
        "status_label": get_status_label(vst),
        "operational_status": op_status,
        "length": vlen,
        "width": vwid,
        "draft": round(vdraft, 1),
        "cargo": vcg,
        "cargo_label": "Containerized Freight" if 70 <= vtc <= 79 else ("Petroleum & Chemicals" if 80 <= vtc <= 89 else "Commercial Cargo"),
        "transceiver": vtcvr,
        "origin_port": ORIGIN_PORTS[mmsi % len(ORIGIN_PORTS)],
        "destination_id": nearest_pid,
        "destination_name": nearest_pcfg["name"],
        "distance_to_port_km": dist_to_port_km,
        "is_anchored": is_anchored,
        "is_berthed": is_berthed
    })

print(f"Running vectorized XGBoost batch predictions across all {len(feature_rows)} vessels...")
t_pred_0 = time.time()
feat_df = pd.DataFrame(feature_rows)

pred_delays = vessel_reg_model.predict(feat_df)
pred_delays = np.clip(np.round(pred_delays, 1), 0.5, 72.0)

pred_probas = vessel_cls_model.predict_proba(feat_df)
pred_cong_probs = np.clip(np.round((pred_probas[:, 1] * 0.70 + pred_probas[:, 2] * 1.0) * 100).astype(int), 5, 99)
conf_scores = np.round(np.max(pred_probas, axis=1) * 100, 1)

print(f"Batch prediction completed in {time.time() - t_pred_0:.2f}s!")

# Merge predictions into records
final_vessels = []
for i, rec in enumerate(enriched_records):
    p_delay = float(pred_delays[i])
    c_prob = int(pred_cong_probs[i])
    conf = float(conf_scores[i])

    try:
        base_dt = datetime.datetime.strptime(rec["base_date_time"], "%Y-%m-%d %H:%M:%S")
    except Exception:
        base_dt = datetime.datetime(2026, 6, 4, 12, 0, 0)

    nominal_hrs = max(2.0, round(rec["distance_to_port_km"] / 22.0, 1))
    sched_dt = base_dt + datetime.timedelta(hours=nominal_hrs)
    pred_dt = sched_dt + datetime.timedelta(hours=p_delay)

    sched_eta = sched_dt.strftime("%Y-%m-%d %H:%M UTC")
    pred_eta = pred_dt.strftime("%Y-%m-%d %H:%M UTC")

    dwt_est = max(3000, int(rec["length"] * rec["width"] * rec["draft"] * 0.70))
    cargo_val = int(dwt_est * (1200 if 70 <= rec["vessel_type"] <= 79 else (800 if 80 <= rec["vessel_type"] <= 89 else 400)))
    cargo_val = min(350000000, max(5000000, cargo_val))
    hourly_dem = 1800 + (cargo_val * 0.000012)
    dem_loss = int(round(p_delay * hourly_dem))

    factors = []
    if rec["is_anchored"]:
        factors.append("Vessel holding in anchorage queue")
    if rec["draft"] >= 13.0:
        factors.append(f"Deep draft ({rec['draft']}m) requires tidal / deepwater berth window")
    if rec["length"] >= 300:
        factors.append(f"ULCV vessel size ({rec['length']}m LOA) requires dedicated Super Post-Panamax cranes")
    if rec["distance_to_port_km"] > 50:
        factors.append(f"Inbound coastal transit ({rec['distance_to_port_km']} km to port)")
    if not factors:
        factors.append("Nominal pilotage and fairway approach")

    severity = "Critical" if p_delay >= 22.0 else ("Severe" if p_delay >= 12.0 else ("Moderate" if p_delay >= 5.0 else "On Schedule"))

    rec["predicted_delay_hours"] = p_delay
    rec["delay_variance_hours"] = p_delay
    rec["congestion_likelihood_pct"] = c_prob
    rec["confidence_score_pct"] = conf
    rec["scheduled_eta"] = sched_eta
    rec["predicted_eta"] = pred_eta
    rec["delay_severity"] = severity
    rec["cargo_value_usd"] = cargo_val
    rec["estimated_loss_usd"] = dem_loss
    rec["key_factors"] = factors

    final_vessels.append(rec)

print(f"Saving {len(final_vessels):,} unique vessels to {OUTPUT_PATH}...")
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(final_vessels, f)

file_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
print(f"Successfully saved {len(final_vessels):,} unique vessels ({file_mb:.2f} MB) in total time: {time.time() - t0:.2f}s")

