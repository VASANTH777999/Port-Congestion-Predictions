import json
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
full_path = os.path.join(base_dir, "all_unique_vessels.json")
compact_path = os.path.join(base_dir, "unique_vessels_compact.json")

print("Loading full vessels data...")
with open(full_path, "r", encoding="utf-8") as f:
    vessels = json.load(f)

compact_list = []
cleaned_vessels = []

for v in vessels:
    v["predicted_delay_hours"] = round(float(v["predicted_delay_hours"]), 1)
    v["delay_variance_hours"] = round(float(v["delay_variance_hours"]), 1)
    v["confidence_score_pct"] = round(float(v["confidence_score_pct"]), 1)
    v["draft"] = round(float(v["draft"]), 1)
    v["sog"] = round(float(v["sog"]), 1)
    v["cog"] = round(float(v["cog"]), 1)
    v["latitude"] = round(float(v["latitude"]), 5)
    v["longitude"] = round(float(v["longitude"]), 5)
    
    cleaned_vessels.append(v)
    
    # Compact map structure with all 17 fields + AI predictions
    compact_list.append({
        "mmsi": v["mmsi"],
        "lat": v["latitude"],
        "lon": v["longitude"],
        "sog": v["sog"],
        "cog": v["cog"],
        "head": v["heading"],
        "name": v["vessel_name"],
        "imo": v["imo"],
        "cs": v["call_sign"],
        "type": v["vessel_type"],
        "type_lbl": v["vessel_type_label"],
        "st": v["status"],
        "st_lbl": v["status_label"],
        "op_st": v["operational_status"],
        "len": v["length"],
        "wid": v["width"],
        "draft": v["draft"],
        "cg": v["cargo"],
        "cg_lbl": v["cargo_label"],
        "tcvr": v["transceiver"],
        "time": v["base_date_time"],
        "dest": v["destination_name"],
        "dest_id": v["destination_id"],
        "dist_km": v["distance_to_port_km"],
        "delay": v["predicted_delay_hours"],
        "risk": v["congestion_likelihood_pct"],
        "conf": v["confidence_score_pct"],
        "sched": v["scheduled_eta"],
        "pred": v["predicted_eta"],
        "sev": v["delay_severity"],
        "loss": v["estimated_loss_usd"],
        "factor": v["key_factors"][0] if v.get("key_factors") else "Nominal transit"
    })

print("Saving cleaned full vessels...")
with open(full_path, "w", encoding="utf-8") as f:
    json.dump(cleaned_vessels, f)

print(f"Saving compact vessels ({len(compact_list)})...")
with open(compact_path, "w", encoding="utf-8") as f:
    json.dump(compact_list, f)

full_sz = os.path.getsize(full_path) / (1024 * 1024)
compact_sz = os.path.getsize(compact_path) / (1024 * 1024)
print(f"Done! Cleaned full: {full_sz:.2f} MB, Compact: {compact_sz:.2f} MB")

