from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database.mongodb import status_mongodb
from iot.config import SENSORES
from ml.model_service import prever_proximo_nivel, status_modelo
from services.telemetry_service import calcular_resumo, obter_telemetria

BASE_DIR = Path(__file__).resolve().parents[1]
DASHBOARD_DIR = BASE_DIR / "dashboard"

app = FastAPI(
    title="HydroAlert AI API",
    description="API academica para telemetria hidrometeorologica e ML.",
    version="0.6.0",
)

app.mount("/static", StaticFiles(directory=str(DASHBOARD_DIR)), name="static")


@app.get("/", response_class=FileResponse, include_in_schema=False)
def dashboard():
    return str(DASHBOARD_DIR / "index.html")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mongodb": status_mongodb(),
        "machine_learning": status_modelo(),
    }


@app.get("/api/sensores")
def sensores():
    return {"sensores": SENSORES}


@app.get("/api/telemetria")
def telemetria(
    limite: int = Query(default=100, ge=1, le=5000),
    sensor_id: str | None = None,
):
    registros, fonte = obter_telemetria(limite=limite, sensor_id=sensor_id)
    return {
        "fonte": fonte,
        "quantidade": len(registros),
        "registros": registros,
    }


@app.get("/api/resumo")
def resumo(
    limite: int = Query(default=200, ge=1, le=5000),
    sensor_id: str | None = None,
):
    registros, fonte = obter_telemetria(limite=limite, sensor_id=sensor_id)
    return calcular_resumo(registros, fonte)


@app.get("/api/ml/status")
def ml_status():
    return status_modelo()


@app.get("/api/ml/prever/{sensor_id}")
def ml_prever(sensor_id: str):
    registros, fonte = obter_telemetria(limite=1, sensor_id=sensor_id)
    if not registros:
        raise HTTPException(status_code=404, detail="Sensor sem telemetria disponivel.")

    try:
        previsao = prever_proximo_nivel(registros[0])
    except FileNotFoundError as erro:
        raise HTTPException(status_code=503, detail=str(erro)) from erro

    previsao["fonte_telemetria"] = fonte
    return previsao
