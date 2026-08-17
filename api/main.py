import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from database.mongodb import status_mongodb
from iot.config import SENSORES
from logging_config import configurar_logging
from ml.model_service import prever_proximo_nivel, status_modelo
from services.alerts_service import avaliar_alertas
from services.telemetry_service import calcular_resumo, obter_telemetria
from services.territory_service import catalogo_localidades, montar_painel_territorial
from services.weather_service import clima_atual

logger = configurar_logging("hydroalert.api")

BASE_DIR = Path(__file__).resolve().parents[1]
DASHBOARD_DIR = BASE_DIR / "dashboard"

app = FastAPI(
    title="HydroAlert AI API",
    description="API academica para telemetria hidrometeorologica, analise territorial e ML.",
    version="0.8.0",
)

# CORS: por padrao libera qualquer origem (prototipo academico com dashboard
# servido pela propria API). Para restringir, defina CORS_ORIGINS no .env,
# por exemplo: CORS_ORIGINS=https://meu-dominio.com,https://app.meu-dominio.com
_origens_env = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS = [origem.strip() for origem in _origens_env.split(",") if origem.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verificar_token_api(request: Request, call_next):
    """Protege os endpoints /api/* quando API_TOKEN esta definido no ambiente.

    Sem API_TOKEN configurado a API permanece aberta (uso local/academico).
    O dashboard estatico e o /health continuam acessiveis em ambos os casos.
    """
    token = os.getenv("API_TOKEN")
    if token and request.url.path.startswith("/api"):
        if request.headers.get("X-API-Key") != token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token de API ausente ou invalido."},
            )
    return await call_next(request)


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
        "sensores_configurados": len(SENSORES),
    }


@app.get("/api/sensores")
def sensores():
    return {"sensores": SENSORES}


@app.get("/api/localidades")
def localidades():
    return catalogo_localidades()


@app.get("/api/painel")
def painel(
    estado: str | None = None,
    municipio: str | None = None,
    regiao: str | None = None,
    bairro: str | None = None,
    sensor_id: str | None = None,
    limite: int = Query(default=300, ge=1, le=1000),
):
    return montar_painel_territorial(
        estado=estado,
        municipio=municipio,
        regiao=regiao,
        bairro=bairro,
        sensor_id=sensor_id,
        limite=limite,
    )


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


@app.get("/api/alertas")
def alertas(
    municipio: str | None = None,
    severidade: str | None = Query(
        default=None, pattern="^(CRITICA|ALTA|MEDIA)$"
    ),
):
    """Alertas automaticos avaliados por severidade e regiao."""
    return avaliar_alertas(municipio=municipio, severidade=severidade)


@app.get("/api/clima/{sensor_id}")
def clima(sensor_id: str):
    """Precipitacao real atual (Open-Meteo) para o ponto do sensor."""
    dados = clima_atual(sensor_id)
    if not dados.get("disponivel") and "desconhecido" in dados.get("erro", ""):
        raise HTTPException(status_code=404, detail=dados["erro"])
    return dados


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
