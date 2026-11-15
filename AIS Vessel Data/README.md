# AIS Vessel Data Source

## Dataset Specifications
- **Source**: NOAA Marine Cadastre AIS Archive (National Oceanic and Atmospheric Administration & Bureau of Ocean Energy Management)
- **Direct Portal**: [https://marinecadastre.gov/ais/](https://marinecadastre.gov/ais/)
- **File**: `ais-2026-06-04.csv`
- **Total Records**: 4,881,191 AIS telemetry points (472.13 MB uncompressed)
- **Coverage**: 24-hour continuous surveillance across all US coastal zones and major ports.

## Git & Vercel Deployment Note
Because raw CSV files larger than 100MB exceed GitHub's maximum file size limit, the raw CSV `ais-2026-06-04.csv` is excluded from git tracking via `.gitignore`.

The production-ready extracts and models are fully pre-compiled and tracked in the repository:
1. `backend/ports_data.json` - Complete port-level traffic density, anchorage queues, and operational metrics.
2. `backend/all_unique_vessels.json` - Full feature profiles for all 20,690 distinct maritime vessels.
3. `backend/unique_vessels_compact.json` - High-performance compact payload for real-time Leaflet canvas rendering.
4. `backend/models/*.json` - Pre-trained, serialized XGBoost classifiers and regressors.

When running locally with `Run.bat`, place `ais-2026-06-04.csv` in this folder to allow offline retraining via `backend/ingest_and_train_ais.py` if desired.

