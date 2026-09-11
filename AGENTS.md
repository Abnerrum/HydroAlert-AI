# HydroAlert AI — Base44 dev environment

Academic prototype for predictive urban flood alerting (IoT/MQTT → MongoDB → FastAPI → React dashboard + ML).

## Stack
- React 18 + Vite (`frontend/`, dev server on host port **3000**, proxies `/api` and `/health` to the API)
- Python 3.12 / FastAPI + Uvicorn (API on host port **8000**; also serves the legacy static dashboard at `/` and `/static/*`)
- MongoDB 7 (telemetry store), Eclipse Mosquitto 2 (MQTT broker)
- pandas / scikit-learn / joblib (ML), paho-mqtt; frontend deps: react-leaflet, recharts, lucide-react

## Run
```
docker compose -f docker-compose.base44.yml up -d --build
```
Services: `mosquitto`, `mongo`, `api` (uvicorn --reload, host port 8000), `frontend` (vite dev, host port 3000), `subscriber` (MQTT→Mongo), `publisher` (simulated sensors, publishes every 5s).

- API source is bind-mounted at `/app` (uvicorn `--reload`); frontend source at `/frontend` (vite HMR).
- `frontend/vite.config.js` proxy target: `API_PROXY_TARGET` env (defaults to `http://localhost:8000` for local dev outside docker); compose sets it to `http://api:8000`.
- `npm run build` outputs to `../dashboard` with `emptyOutDir: true` — it REPLACES the legacy vanilla dashboard served by the API at `/`.

## Verify
- `curl http://localhost:3000/` → React dashboard (vite dev)
- `curl http://localhost:8000/health` → `{"status":"ok","mongodb":{"conectado":true},...}`
- `curl http://localhost:8000/api/telemetria?limite=2` → live records (`"fonte":"mongodb"`)
- React app calls relative URLs (`/api/*`, `/health`) through the vite proxy — single origin, no CORS needed for the preview.

## Notes / quirks
- No external credentials required. All infra is local compose services. `API_TOKEN` is empty (no auth on `/api/*`); when set, the API requires `X-API-Key` and the frontend reads `VITE_API_TOKEN`.
- The repo's own `docker-compose.yml` builds a production image (`COPY . .`) and is NOT used for dev; `docker-compose.base44.yml` is the dev runbook.
- `cloudflared` is installed in the dev image (`Dockerfile.base44`); the `/api/compartilhamento/*` endpoints create a Cloudflare Quick Tunnel for a temporary public link. The sandbox DNS resolver often can't resolve the new `*.trycloudflare.com` subdomain immediately, so `tunnel_service.py` marks the tunnel as ready even when internal DNS validation fails — the link works externally.
- ML model is not trained by default (`machine_learning.treinado: false`); run `docker compose -f docker-compose.base44.yml run --rm api python -m ml.train_model` to generate `/app/models/modelo_nivel.joblib` (or use the `ml` profile in the repo's own compose).
- Telemetry falls back to JSONL files under `data/` when MongoDB is unreachable, so the dashboard renders even before the DB is up.
- The catalog (`/api/localidades`) now lists all 27 UFs (`estados_brasil`); municipalities come from the public IBGE API (needs internet from the browser).
