import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database.mongodb import status_mongodb
from iot.config import SENSORES
from logging_config import configurar_logging
from ml.model_service import prever_horizontes, prever_proximo_nivel, status_modelo
from services.alert_service import listar_revisoes, registrar_revisao
from services.backtesting_service import executar_backtesting, exportar_power_bi
from services.data_quality_service import avaliar_qualidade
from services.public_data_service import catalogo_fontes, consultar_open_meteo
from services.telemetry_service import calcular_resumo, obter_telemetria
from services.territory_service import catalogo_localidades, montar_painel_territorial
from services.tunnel_service import iniciar_tunnel, parar_tunnel, status_tunnel
from services.weather_service import clima_atual

logger = configurar_logging("hydroalert.api")

BASE_DIR = Path(__file__).resolve().parents[1]
DASHBOARD_DIR = BASE_DIR / "dashboard"

app = FastAPI(
    title="HydroAlert AI API",
    description="API academica para telemetria hidrometeorologica, analise territorial, alertas preditivos e ML.",
    version="2.0.0",
)

_origens_env = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS = [origem.strip() for origem in _origens_env.split(",") if origem.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verificar_token_api(request: Request, call_next):
    """Protege /api/* quando API_TOKEN estiver configurado."""
    token = os.getenv("API_TOKEN")
    if token and request.url.path.startswith("/api"):
        if request.headers.get("X-API-Key") != token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token de API ausente ou invalido."},
            )
    return await call_next(request)


app.mount("/static", StaticFiles(directory=str(DASHBOARD_DIR)), name="static")


class RevisaoEntrada(BaseModel):
    alerta_id: str = Field(min_length=3, max_length=200)
    decisao: str
    revisor: str = Field(min_length=2, max_length=100)
    justificativa: str = Field(min_length=5, max_length=1000)


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
        "compartilhamento": status_tunnel(),
    }


@app.get("/api/compartilhamento/status")
def compartilhamento_status():
    return status_tunnel()


@app.post("/api/compartilhamento/iniciar")
def compartilhamento_iniciar():
    try:
        return iniciar_tunnel()
    except RuntimeError as erro:
        raise HTTPException(status_code=503, detail=str(erro)) from erro


@app.post("/api/compartilhamento/parar")
def compartilhamento_parar():
    return parar_tunnel()


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


@app.get("/api/qualidade-dados")
def qualidade_dados(
    limite: int = Query(default=1000, ge=1, le=5000),
    sensor_id: str | None = None,
):
    registros, fonte = obter_telemetria(limite=limite, sensor_id=sensor_id)
    return {"fonte": fonte, **avaliar_qualidade(registros)}


@app.get("/api/alertas")
def alertas(
    estado: str | None = None,
    municipio: str | None = None,
    regiao: str | None = None,
    bairro: str | None = None,
    sensor_id: str | None = None,
    severidade: str | None = Query(
        default=None,
        pattern="^(CRITICA|ALTA|MEDIA|CRITICO|ALTO|MODERADO)$",
    ),
):
    painel = montar_painel_territorial(
        estado=estado,
        municipio=municipio,
        regiao=regiao,
        bairro=bairro,
        sensor_id=sensor_id,
        limite=1000,
    )
    itens = list(painel.get("alertas", []))
    if severidade:
        mapa = {
            "CRITICA": "CRITICO",
            "ALTA": "ALTO",
            "MEDIA": "MODERADO",
            "CRITICO": "CRITICO",
            "ALTO": "ALTO",
            "MODERADO": "MODERADO",
        }
        alvo = mapa[severidade]
        itens = [item for item in itens if item.get("severidade") == alvo]
    return {
        "fonte": painel.get("fonte"),
        "total": len(itens),
        "metricas": painel.get("metricas_alerta", {}),
        "alertas": itens,
    }


@app.get("/api/clima/{sensor_id}")
def clima(sensor_id: str):
    """Precipitação real atual via Open-Meteo para o ponto do sensor."""
    dados = clima_atual(sensor_id)
    if not dados.get("disponivel") and "desconhecido" in dados.get("erro", ""):
        raise HTTPException(status_code=404, detail=dados["erro"])
    return dados


@app.get("/api/fontes-publicas")
def fontes_publicas():
    return {
        "fontes": catalogo_fontes(),
        "aviso": "Uso acadêmico; valide licença e disponibilidade na fonte.",
    }


@app.get("/api/clima-publico")
def clima_publico(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    try:
        return consultar_open_meteo(latitude, longitude)
    except Exception as erro:
        raise HTTPException(status_code=502, detail=f"Fonte pública indisponível: {erro}") from erro


@app.get("/api/ml/status")
def ml_status():
    return status_modelo()


@app.get("/api/ml/prever/{sensor_id}")
def ml_prever(sensor_id: str):
    registros, fonte = obter_telemetria(limite=500, sensor_id=sensor_id)
    if not registros:
        raise HTTPException(status_code=404, detail="Sensor sem telemetria disponivel.")

    try:
        previsao = prever_proximo_nivel(registros[0])
    except FileNotFoundError as erro:
        raise HTTPException(status_code=503, detail=str(erro)) from erro

    previsao["fonte_telemetria"] = fonte
    return previsao


@app.get("/api/ml/prever-horizontes/{sensor_id}")
def ml_prever_horizontes(sensor_id: str):
    registros, fonte = obter_telemetria(limite=500, sensor_id=sensor_id)
    if not registros:
        raise HTTPException(status_code=404, detail="Sensor sem telemetria disponível.")
    try:
        resultado = prever_horizontes(registros[0])
    except FileNotFoundError as erro:
        raise HTTPException(status_code=503, detail=str(erro)) from erro
    resultado["fonte_telemetria"] = fonte
    return resultado


@app.get("/api/revisoes")
def revisoes():
    return {"revisoes": listar_revisoes()}


@app.post("/api/revisoes", status_code=201)
def revisar_alerta(entrada: RevisaoEntrada):
    try:
        return registrar_revisao(
            entrada.alerta_id,
            entrada.decisao.upper(),
            entrada.revisor,
            entrada.justificativa,
        )
    except ValueError as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from erro


@app.get("/api/backtesting")
def backtesting():
    registros, fonte = obter_telemetria(limite=5000)
    return {"fonte": fonte, **executar_backtesting(registros)}


@app.get("/api/power-bi/exportar", response_class=FileResponse)
def power_bi_exportar():
    registros, _ = obter_telemetria(limite=5000)
    if not registros:
        raise HTTPException(status_code=404, detail="Não há telemetria para exportar.")
    caminho = exportar_power_bi(registros)
    return FileResponse(caminho, media_type="text/csv", filename=caminho.name)
