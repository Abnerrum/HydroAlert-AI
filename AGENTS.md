# HydroAlert AI — Base44 dev environment

Academic prototype for predictive urban flood alerting (IoT/MQTT → MongoDB → FastAPI → dashboard + ML).

## Stack
- Python 3.12 / FastAPI + Uvicorn (serves the dashboard AND the API on one origin, port 8000 in-container → host 3000)
- MongoDB 7 (telemetry store), Eclipse Mosquitto 2 (MQTT broker)
- pandas / scikit-learn / joblib (ML), paho-mqtt

## Run
```
docker compose -f docker-compose.base44.yml up -d --build
```
Services: `mosquitto`, `mongo`, `api` (uvicorn --reload, host port 3000), `subscriber` (MQTT→Mongo), `publisher` (simulated sensors, publishes every 5s).

`Dockerfile.base44` installs `requirements.txt` only (deps cached in image); app source is bind-mounted at `/app`, so edits hot-reload via uvicorn `--reload`.

## Verify
- `curl http://localhost:3000/health` → `{"status":"ok","mongodb":{"conectado":true},...}`
- `curl http://localhost:3000/` → dashboard HTML
- `curl http://localhost:3000/api/telemetria?limite=2` → live records (`"fonte":"mongodb"`)
- Dashboard JS calls relative URLs (`/api/*`, `/health`) — single origin, no CORS config needed.

## Notes / quirks
- No external credentials required. All infra is local compose services. `API_TOKEN` is empty (no auth on `/api/*`).
- The repo's own `docker-compose.yml` builds a production image (`COPY . .`) and is NOT used for dev; `docker-compose.base44.yml` is the dev runbook.
- `cloudflared` is installed in the dev image (`Dockerfile.base44`); the `/api/compartilhamento/*` endpoints create a Cloudflare Quick Tunnel for a temporary public link. The sandbox DNS resolver often can't resolve the new `*.trycloudflare.com` subdomain immediately, so `tunnel_service.py` marks the tunnel as ready even when internal DNS validation fails — the link works externally.
- ML model is not trained by default (`machine_learning.treinado: false`); run `docker compose -f docker-compose.base44.yml run --rm api python -m ml.train_model` to generate `/app/models/modelo_nivel.joblib` (or use the `ml` profile in the repo's own compose).
- Telemetry falls back to JSONL files under `data/` when MongoDB is unreachable, so the dashboard renders even before the DB is up.
