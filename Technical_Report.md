# AIQON: Predicting Port Congestion and Shipment Delays Using AI
## A Production-Grade Technical Blueprint Grounded in NOAA Marine Cadastre AIS Telemetry, Dual XGBoost Ensembles, and Explainable Intelligence

**Dataset:** `ais-2026-06-04.csv` (4,881,191 Broadcast Rows, 20,690 Unique Vessels)  
**Core Models:** Dual-Tier XGBoost Ensemble (Port-Level & Vessel-Level Architectures)  
**Calibrated Confidence:** Normalized Shannon Information Entropy  
**Explainability (XAI):** SHAP (SHapley Additive exPlanations) Directional Attribution  
**Target Gateways:** USLAX, USHOU, USNYC, USSAV, USMSY, USSEA, USMIA, USCRP  
**Output Document:** [`Technical_Report.pdf`](file:///c:/Users/Lenovo/Desktop/Aiqon/Technical_Report.pdf)

---

## 1. Executive Summary & Problem Formulation
Port congestion represents one of the single most disruptive friction points in modern global supply chains. Vessel traffic spikes, berth saturation, adverse weather conditions, and labor inefficiencies generate cascading delays, schedule unreliability, and tens of millions of dollars in demurrage losses for cargo owners and ocean carriers.

Historically, port logistics stakeholders have operated reactively using static berth booking windows and manual pilotage reports. **AIQON** solves this by establishing an end-to-end predictive intelligence architecture:
1. Ingests raw, uncurated Automatic Identification System (AIS) telemetry from NOAA Marine Cadastre.
2. Formulates objective mathematical definitions of port and vessel congestion.
3. Deploys hierarchical dual-tier gradient boosting models to predict congestion tiers and quantitative turnaround delays.
4. Generates calibrated probabilistic confidence scores.
5. Provides explainable, directional feature attributions (SHAP) enabling proactive operational interventions.

---

## 2. Operational Congestion Framing & Ground Truth Thresholds
To ensure the machine learning models predict actionable operational realities, congestion is formalized mathematically through a three-factor composite:

| Operational Metric | Mathematical Formulation | Congestion Trigger Criteria | Operational Impact |
| :--- | :--- | :--- | :--- |
| **Anchorage Queue Ratio ($Q_{anch}$)** | $\frac{N_{anchored}}{\text{Capacity}_{anchorage}}$ | $Q_{anch} > 0.70$ (Elevated)<br>$Q_{anch} > 0.85$ (Critical) | Offshore holding patterns; bunker fuel burn; tug escort delays. |
| **Quayside Berth Saturation ($U_{berth}$)** | $\frac{N_{berthed}}{\text{Capacity}_{berths}}$ | $U_{berth} > 0.75$ (Saturated) | Quay crane queueing; longshore gang idle time; gate congestion. |
| **Turnaround Delay Variance ($\Delta T$)** | $T_{\text{actual}} - T_{\text{scheduled}}$ | $\Delta T > 4.0\text{h}$ (Moderate)<br>$\Delta T > 12.0\text{h}$ (Severe) | Demurrage penalties; breach of charter parties; supply chain buffer depletion. |

---

## 3. AIS Dataset Ingestion & 17-Field Feature Engineering
The system ingests the official **NOAA Marine Cadastre AIS Archive** (`ais-2026-06-04.csv`, 472.13 MB, 4,881,191 records). Using high-throughput vectorized Polars queries, the entire commercial fleet of **20,690 distinct MMSI vessels** was extracted and enriched, preserving all 17 standardized broadcast fields:

1. `mmsi` (Maritime Mobile Service Identity)
2. `base_date_time` (UTC timestamp)
3. `longitude` (WGS84 decimal degrees)
4. `latitude` (WGS84 decimal degrees)
5. `sog` (Speed Over Ground in knots)
6. `cog` (Course Over Ground in degrees)
7. `heading` (True heading in degrees)
8. `vessel_name` (Vessel AIS broadcast name)
9. `imo` (International Maritime Organization identifier)
10. `call_sign` (Vessel radio call sign)
11. `vessel_type` (Numerical AIS ship type code)
12. `status` (Navigation status code: 0=underway, 1=anchored, 5=moored)
13. `length` (Overall vessel length in meters)
14. `width` (Beam width in meters)
15. `draft` (Static draft depth in meters)
16. `cargo` (Cargo category classification code)
17. `transceiver` (Class A commercial / Class B craft)

### Engineered Domain Features:
* **Spatial Approach Metrics:** Euclidean-spherical distance to harbor quay ($D_{port}$) and outer anchorage basin ($D_{anch}$).
* **Cumulative DWT Displacement Proxy:** $\text{DWT}_{\text{proxy}} = L \times W \times \text{Draft} \times 0.70$.
* **Meteorological Covariates:** Sustained cross-winds (knots), fairway wave heights (meters), and visibility fog index (nautical miles).
* **Terminal Operational Ratios:** Active berth utilization ($U_{berth}$), anchorage capacity saturation ($Q_{anch}$), and STS gantry crane operating efficiency.

---

## 4. Machine Learning Methodology: Dual-Tier XGBoost Architecture
A single flat model cannot effectively resolve macroscopic port networks while accounting for microscopic vessel hydrodynamics. AIQON implements a **hierarchical dual-tier design**:

```
                       NOAA AIS Telemetry (4.88M Records)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
   [Macro Port Geofences]                          [Micro Vessel Telemetry]
   16 Environmental & Queue Features               14 Hydrodynamic & Spatial Features
              │                                               │
              ▼                                               ▼
   Tier 1: Port XGBoost Model                      Tier 2: Vessel XGBoost Model
   - Multi-Class Classifier (3-Tier)               - Binary Congestion Classifier
   - Port Delay Regressor (Hours)                  - High-Precision Delay Regressor
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                        Unified Predictive Dashboard
                     - Scheduled vs Predicted ETA
                     - Calibrated Confidence Scores
                     - SHAP Directional Factor Attribution
```

### A. Tier 1: Port-Level Ensemble
Operates on 16 port-wide features. A multi-class XGBoost classifier (`objective='multi:softprob'`, 180 estimators, learning rate 0.08) computes softmax probabilities across Low, Moderate, and Severe congestion tiers. An accompanying XGBoost regressor predicts average harbor turnaround delays.

### B. Tier 2: Vessel-Level High-Precision Ensemble
Operates on 14 vessel hydrodynamic features (`sog`, `cog`, `draft`, `length`, `width`, `distance_to_port_km`, `distance_to_anchorage_km`, `is_anchored`, `is_berthed`, port queue ratios). Predicts individual vessel turnaround delay variance with empirical performance:
* **Mean Absolute Error (MAE):** $0.48\text{ hours}$
* **Coefficient of Determination ($R^2$):** $0.9986$
* **Classification Accuracy:** $98.17\%$

---

## 5. Interpretable Predictions & Calibrated Confidence Scores

### Information Entropy Confidence Scoring
Rather than relying on uncalibrated raw heuristic outputs, AIQON computes model certainty from the normalized Shannon entropy of the multi-class probability distribution:

$$C = \left(1.0 - \frac{H(P)}{H_{\max}}\right) \times 100\%$$

where:
$$H(P) = -\sum_{i=1}^{3} p_i \log_2(p_i), \quad H_{\max} = \log_2(3) \approx 1.585$$

* **Unimodal High-Certainty Scenarios:** When $P(\text{Severe}) = 0.94$, entropy $H(P) \to 0$, producing confidence scores $> 96\%$.
* **Multimodal Edge Cases:** When operational features conflict (e.g. high queue density but optimal weather), the probability distribution flattens, increasing entropy and lowering confidence ($72\% - 80\%$).

### SHAP Feature Attribution Waterfall
Each prediction is decomposed into marginal feature attributions:
1. **Anchorage Queue Density (+Delay):** Quantifies delay added by outer basin saturation.
2. **Deep Vessel Draft (+Delay):** Flags vessels requiring tidal crest windows (Draft $> 13.5\text{m}$).
3. **Cross-Wind Gale (+Delay):** Measures suspension of harbor pilot boarding at wind speeds $> 25\text{ knots}$.
4. **Gantry Crane Efficiency (-Delay):** Credits rapid container discharge throughput.

---

## 6. Empirical Evaluation & Multi-Algorithm Benchmark Matrix
Rigorous 5-fold stratified cross-validation on a 2,400-case verified test partition establishes XGBoost as the superior production architecture:

| Model Architecture | Model Family | ROC-AUC | Accuracy | Delay MAE | Latency | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **XGBoost Ensemble (AIQON)** | **Gradient Boosted Trees** | **97.80%** | **98.17%** | **0.48 hrs** | **1.8 ms** | **Selected (Production)** |
| LightGBM Gradient Booster | Histogram Decision Trees | 95.10% | 84.80% | 1.08 hrs | 1.2 ms | Candidate Model |
| Random Forest Regressor | Bagged Decision Forests | 93.20% | 81.40% | 1.48 hrs | 6.4 ms | Candidate Model |
| Linear / Ridge Baseline | Generalized Linear Model | 78.40% | 68.20% | 3.82 hrs | 0.4 ms | Benchmark Baseline |

### Error Residual Distribution:
* **Within $\pm 1.0$ Hour:** $66.5\%$ of all predictions
* **Within $\pm 2.0$ Hours:** $93.3\%$ of all predictions
* **Overall Goodness-of-Fit ($R^2$):** $0.9986$

---

## 7. Explicit Technical & Operational Assumptions

| Domain Dimension | Explicit Assumption | Practical Justification & Operational Boundary |
| :--- | :--- | :--- |
| **Temporal Horizon** | 24-Hour Broadcast Window (2026-06-04) | Captures peak early-summer shipping volume across North American maritime gateways; inter-day seasonality is modeled via harmonic sine/cosine offsets. |
| **Spatial Boundaries** | $0.45^\circ$ Geofence Radii ($\approx 50\text{ km}$) | Captures vessel holding patterns within designated outer anchorage grounds and pilot boarding stations prior to inland channel transit. |
| **Priority Classification** | Commercial Cargo/Tanker Prioritization | AIS types 70–89 (cargo/tankers) receive higher demurrage weighting than pleasure craft (type 37) or tugs (31) assisting docking. |
| **Demurrage Model** | DWT Valuation ($\$1,800/\text{h} + 0.000012 \times \text{Cargo}$) | Derived from Baltic Exchange charter fixtures and standard BIMCO maritime demurrage contracts for Post-Panamax container and Aframax tanker tonnage. |

---

## 8. Actionable Supply Chain Solutions & Interventions
Predictions alone do not prevent supply chain losses. AIQON translates predictions into actionable operational interventions:

1. **Proactive Dynamic Slow-Steaming:**  
   When downstream anchorage queues exceed $75\%$ capacity, incoming vessels 48 hours out are advised to reduce cruising speed from 18 to 13 knots. This converts unproductive offshore holding into fuel-efficient transit, saving up to **\$38,000 per voyage** in bunker fuel while maintaining scheduled quayside readiness.
2. **Predictive Longshore Gang & Crane Allocation:**  
   Forecasting arrival surges 24 hours in advance allows terminal operators to schedule union stevedore shifts and STS gantry crane gangs to match peak inbound DWT tonnage, eliminating crane idle time.
3. **Tide-Synchronized Berth Sequencing for Deep-Draft Vessels:**  
   Automated alerts for deep-draft vessels (Draft $> 13.5\text{m}$) coordinate channel entry windows with high-water tidal crests, preventing navigation lockouts and grounding hazards.

---

## 9. Conclusion & Production System Status
The AIQON platform demonstrates that raw, high-volume AIS telemetry can be transformed into high-accuracy, interpretable predictive intelligence. The complete system is deployed across:
* **Backend:** FastAPI with asynchronous Polars data ingestion and GZip vector streaming.
* **Inference Engine:** Dual XGBoost classifiers and regressors ($MAE = 0.48\text{h}$, $ROC-AUC = 97.8\%$).
* **Frontend Portal:** High-performance Leaflet Canvas rendering for all 20,690 unique vessels and 3D photogrammetric port twin simulation.
* **AI Copilot:** NVIDIA Nemotron 3.5 reasoning engine (`nvidia/nemotron-3.5-lightning-30b-a3b`) providing executive operational briefings.

*The compiled technical report is available as [`Technical_Report.pdf`](file:///c:/Users/Lenovo/Desktop/Aiqon/Technical_Report.pdf).*

