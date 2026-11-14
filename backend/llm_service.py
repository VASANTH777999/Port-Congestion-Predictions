import requests
import json
import os

NVIDIA_API_KEY = os.environ.get(
    "NVIDIA_API_KEY", 
    "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"
)
NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b"
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def generate_local_expert_explanation(prediction_data: dict) -> dict:
    port_name = prediction_data.get("port_name", "Unknown Port")
    likelihood = prediction_data.get("congestion_likelihood_pct", 50.0)
    risk_level = prediction_data.get("risk_level", "Moderate")
    delay_hours = prediction_data.get("expected_delay_hours", 12.0)
    conf = prediction_data.get("confidence_score_pct", 80.0)
    metrics = prediction_data.get("operational_metrics", {})
    drivers = prediction_data.get("top_contributing_factors", [])
    
    driver_texts = []
    for d in drivers[:3]:
        action_word = "is elevating" if d["direction"] == "increases_delay" else "is stabilizing"
        driver_texts.append(f"{d['name']} ({action_word} queue pressure)")
    
    top_drivers_summary = ", ".join(driver_texts) if driver_texts else "vessel arrival volume and berth availability"
    
    exec_summary = (
        f"AI assessment indicates a **{risk_level.upper()}** condition at {port_name} with an estimated "
        f"congestion likelihood of **{likelihood}%** (Model Confidence: **{conf}%**). Approaching and waiting vessels "
        f"should plan for an average operational turnaround delay of **{delay_hours} hours**."
    )
    
    root_cause = (
        f"The primary driver is elevated queue pressure from {top_drivers_summary}. "
        f"Current berth utilization is at {metrics.get('berth_utilization_pct', 75)}% with {metrics.get('anchored_vessels', 15)} "
        f"vessels held in outer anchorages. Meteorological conditions (Wind: {metrics.get('wind_speed_knots', 12)} kts, "
        f"Waves: {metrics.get('wave_height_m', 1.0)}m) are exerting additional navigational constraints."
    )
    
    recommendations = [
        f"Implement dynamic Virtual Arrival (slow-steaming) protocols for inbound vessels >25nm out to reduce outer anchorage idling.",
        f"Prioritize pilotage boarding and tug dispatch for high-draft commercial container/tanker vessels.",
        f"Coordinate with terminal rail & drayage operators to extend container gate operating hours during off-peak windows.",
        f"Direct secondary barge tows and non-critical workboats to alternate staging fairways."
    ]
    
    return {
        "status": "success",
        "model_used": "Maritime-Expert-Engine (Local Fallback)",
        "executive_summary": exec_summary,
        "root_cause_analysis": root_cause,
        "actionable_recommendations": recommendations,
        "operational_posture": "Action Required" if likelihood > 50 else "Standard Monitoring"
    }

def explain_congestion_with_nemotron(prediction_data: dict) -> dict:
    port_name = prediction_data.get("port_name", "Target Port")
    likelihood = prediction_data.get("congestion_likelihood_pct", 50.0)
    risk_level = prediction_data.get("risk_level", "Moderate")
    delay_hours = prediction_data.get("expected_delay_hours", 12.0)
    conf = prediction_data.get("confidence_score_pct", 80.0)
    metrics = prediction_data.get("operational_metrics", {})
    drivers = prediction_data.get("top_contributing_factors", [])
    
    system_prompt = (
        "You are an elite Senior Maritime Logistics Director & AI Port Operations Analyst. "
        "Analyze the provided port congestion telemetry and machine learning prediction metrics. "
        "Provide an authoritative, clear, and actionable explanation. "
        "Respond ONLY with a valid JSON object strictly adhering to this structure:\n"
        "{\n"
        '  "executive_summary": "High-level 2-sentence summary of the congestion status, likelihood, and expected delay.",\n'
        '  "root_cause_analysis": "Detailed diagnosis of the physical, meteorological, and operational bottlenecks.",\n'
        '  "actionable_recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],\n'
        '  "operational_posture": "Optimal" or "Elevated Caution" or "Critical Mitigation Required"\n'
        "}"
    )
    
    user_content = (
        f"PORT CONGESTION TELEMETRY:\n"
        f"- Port: {port_name}\n"
        f"- Predicted Congestion Likelihood: {likelihood}%\n"
        f"- Congestion Classification: {risk_level}\n"
        f"- Model Confidence Score: {conf}%\n"
        f"- Estimated Turnaround Delay: {delay_hours} hours\n"
        f"- Active Berthed Vessels: {metrics.get('berthed_vessels')} (Utilization: {metrics.get('berth_utilization_pct')}%)\n"
        f"- Outer Anchorage Queue: {metrics.get('anchored_vessels')} vessels (Queue ratio: {metrics.get('anchorage_queue_ratio')})\n"
        f"- Inbound Vessels (24h window): {metrics.get('inbound_vessels')}\n"
        f"- Environmental State: Wind {metrics.get('wind_speed_knots')} kts, Waves {metrics.get('wave_height_m')} m, Visibility {metrics.get('visibility_nm')} nm\n"
        f"- Top Contributing Factors: {json.dumps([d['name'] for d in drivers[:4]])}\n"
        f"\nGenerate the structured operational explanation."
    )
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.2,
        "max_tokens": 1200
    }
    
    try:
        response = requests.post(NVIDIA_URL, headers=headers, json=payload, timeout=20)
        if response.status_code == 200:
            res_json = response.json()
            choice = res_json.get("choices", [{}])[0]
            msg = choice.get("message", {})
            raw_content = msg.get("content")
            
            # If content is null, inspect reasoning_content
            if not raw_content and msg.get("reasoning_content"):
                reasoning = msg.get("reasoning_content", "")
                # try to extract json from reasoning if available
                if "{" in reasoning and "}" in reasoning:
                    start = reasoning.rfind("{")
                    end = reasoning.rfind("}") + 1
                    raw_content = reasoning[start:end]
                    
            if raw_content:
                # Clean code fences if present
                clean = raw_content.strip()
                if clean.startswith("```json"):
                    clean = clean[7:]
                if clean.startswith("```"):
                    clean = clean[3:]
                if clean.endswith("```"):
                    clean = clean[:-3]
                clean = clean.strip()
                
                try:
                    parsed = json.loads(clean)
                    return {
                        "status": "success",
                        "model_used": "NVIDIA Nemotron-3.5-Lightning-30B",
                        "executive_summary": parsed.get("executive_summary", ""),
                        "root_cause_analysis": parsed.get("root_cause_analysis", ""),
                        "actionable_recommendations": parsed.get("actionable_recommendations", []),
                        "operational_posture": parsed.get("operational_posture", "Action Required")
                    }
                except Exception:
                    pass
    except Exception as e:
        print(f"NVIDIA API request exception: {e}")
        
    # Return resilient local expert fallback
    return generate_local_expert_explanation(prediction_data)

def ask_maritime_copilot(query: str, context_port_id: str = "USLAX") -> dict:
    from ml_engine import predict_port_congestion, PORTS_STORE
    
    pred = predict_port_congestion(context_port_id)
    port_name = pred["port_name"]
    
    system_prompt = (
        f"You are the Aiqon Autonomous Maritime Copilot powered by NVIDIA Nemotron. "
        f"You are currently monitoring {port_name} (Congestion Likelihood: {pred['congestion_likelihood_pct']}%, "
        f"Delay: {pred['expected_delay_hours']} hrs, Risk: {pred['risk_level']}). "
        f"Provide direct, professional, expert maritime guidance in 2-3 paragraphs."
    )
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        "temperature": 0.3,
        "max_tokens": 800
    }
    
    try:
        response = requests.post(NVIDIA_URL, headers=headers, json=payload, timeout=20)
        if response.status_code == 200:
            choice = response.json().get("choices", [{}])[0]
            msg = choice.get("message", {})
            content = msg.get("content")
            if not content and msg.get("reasoning_content"):
                content = msg.get("reasoning_content")
            if content:
                return {
                    "status": "success",
                    "model": "NVIDIA Nemotron-3.5-Lightning-30B",
                    "reply": content
                }
    except Exception as e:
        print(f"Copilot exception: {e}")
        
    return {
        "status": "fallback",
        "model": "Aiqon Maritime Rule Engine",
        "reply": f"Based on live telemetry for {port_name}, current congestion likelihood is {pred['congestion_likelihood_pct']}% with an anticipated turnaround delay of {pred['expected_delay_hours']} hours. Berth utilization is {pred['operational_metrics']['berth_utilization_pct']}% and {pred['operational_metrics']['anchored_vessels']} vessels are currently queued in outer anchorages. We recommend adjusting speed over ground (SOG) on approach to optimize berth synchronization."
    }

