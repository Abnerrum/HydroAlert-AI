# HydroAlert AI — Base44 dev environment

Academic prototype for predictive urban flood alerting (IoT/MQTT → MongoDB → FastAPI → dashboard + ML).

## Stack
- Python 3.12 / FastAPI + Uvicorn (API on port 8000, internal only)
- React + Vite (frontend dev server with HMR, host port 3000 → container 5173)
- MongoDB 7 (telemetry store), Eclipse Mosquitto 2 (MQTT broker)
- pandas / scikit-learn / joblib (ML), paho-mqtt

## Architecture (single origin)
- `web` (Vite dev server) is the public entry point on host port 3000.
- Vite proxies `/api/*` and `/health` to the `api` container (port 8000) via `VITE_API_PROXY=http://api:8000`.
- Frontend source in `frontend/src/` hot-reloads via Vite HMR; Python API hot-reloads via uvicorn `--reload`.
- The `dashboard/` directory holds the pre-built output (`vite build` → `../dashboard`); not used during dev.

## Run
```
docker compose -f docker-compose.base44.yml up -d --build
```
Services: `mosquitto`, `mongo`, `api` (uvicorn --reload, internal), `web` (Vite dev, host port 3000), `subscriber` (MQTT→Mongo), `publisher` (simulated sensors, publishes every 5s).

`Dockerfile.base44` installs `requirements.txt` only (deps cached in image); app source is bind-mounted at `/app`, so Python edits hot-reload via uvicorn `--reload`. The `web` service uses `node:22-slim`, runs `npm install` then `npx vite --host 0.0.0.0 --port 5173`; `frontend/` is bind-mounted so React edits hot-reload via Vite HMR.

## Verify
- `curl http://localhost:3000/` → Vite-served HTML (includes `/@vite/client` and `/src/main.jsx`)
- `curl http://localhost:3000/health` → `{"status":"ok","mongodb":{"conectado":true},...}` (proxied to API)
- `curl http://localhost:3000/api/telemetria?limite=2` → live records from MongoDB (proxied to API)

## Notes / quirks
- No external credentials required. All infra is local compose services. `API_TOKEN` is empty (no auth on `/api/*`).
- The repo's own `docker-compose.yml` builds a production image (`COPY . .`) and is NOT used for dev; `docker-compose.base44.yml` is the dev runbook.
- `cloudflared` (tunnel/sharing feature) is intentionally NOT installed in the dev image; the `/api/compartilhamento/*` endpoints will fail if invoked, but the dashboard does not depend on them.
- ML model is not trained by default (`machine_learning.treinado: false`); run `docker compose -f docker-compose.base44.yml run --rm api python -m ml.train_model` to generate `/app/models/modelo_nivel.joblib`.
- Telemetry falls back to JSONL files under `data/` when MongoDB is unreachable, so the dashboard renders even before the DB is up.
- `vite.config.js` has a custom `brazilMapViewPlugin` that transforms `src/App.jsx` at build/dev time to adjust the map view to national bounds.
- To rebuild the static dashboard (for production): `docker compose -f docker-compose.base44.yml run --rm web npx vite build` (output goes to `../dashboard`).
