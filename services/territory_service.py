from __future__ import annotations

from copy import deepcopy

from iot.config import SENSORES
from services.telemetry_service import calcular_resumo, obter_telemetria

SENSOR_POR_ID = {sensor["sensor_id"]: sensor for sensor in SENSORES}


def catalogo_localidades() -> dict:
    estados = sorted({sensor["estado"] for sensor in SENSORES})
    municipios = sorted({sensor["municipio"] for sensor in SENSORES})
    regioes = sorted({sensor["regiao"] for sensor in SENSORES})
    bairros = sorted({sensor["bairro"] for sensor in SENSORES})

    return {
        "estados": estados,
        "municipios": municipios,
        "regioes": regioes,
        "bairros": bairros,
        "sensores": SENSORES,
    }


def _normalizar(valor: str | None) -> str:
    return (valor or "").strip().casefold()


def filtrar_sensores(
    estado: str | None = None,
    municipio: str | None = None,
    regiao: str | None = None,
    bairro: str | None = None,
    sensor_id: str | None = None,
) -> list[dict]:
    resultado = []

    for sensor in SENSORES:
        if estado and _normalizar(sensor["estado"]) != _normalizar(estado):
            continue
        if municipio and _normalizar(sensor["municipio"]) != _normalizar(municipio):
            continue
        if regiao and _normalizar(sensor["regiao"]) != _normalizar(regiao):
            continue
        if bairro and _normalizar(sensor["bairro"]) != _normalizar(bairro):
            continue
        if sensor_id and sensor["sensor_id"] != sensor_id:
            continue
        resultado.append(sensor)

    return resultado


def enriquecer_registro(registro: dict) -> dict:
    documento = deepcopy(registro)
    sensor = SENSOR_POR_ID.get(documento.get("sensor_id"))

    if not sensor:
        return documento

    localizacao = documento.setdefault("localizacao", {})
    localizacao.setdefault("latitude", sensor["latitude"])
    localizacao.setdefault("longitude", sensor["longitude"])
    localizacao.setdefault("estado", sensor["estado"])
    localizacao.setdefault("uf", sensor["uf"])
    localizacao.setdefault("municipio", sensor["municipio"])
    localizacao.setdefault("regiao", sensor["regiao"])
    localizacao.setdefault("bairro", sensor["bairro"])
    documento.setdefault("nome", sensor["nome"])
    return documento


def montar_painel_territorial(
    estado: str | None = None,
    municipio: str | None = None,
    regiao: str | None = None,
    bairro: str | None = None,
    sensor_id: str | None = None,
    limite: int = 300,
) -> dict:
    sensores = filtrar_sensores(
        estado=estado,
        municipio=municipio,
        regiao=regiao,
        bairro=bairro,
        sensor_id=sensor_id,
    )
    ids_permitidos = {sensor["sensor_id"] for sensor in sensores}

    # Para o prototipo academico carregamos uma janela ampla e filtramos em Python.
    # Isso preserva compatibilidade com documentos antigos que ainda nao tinham
    # todos os metadados territoriais gravados no MongoDB.
    registros, fonte = obter_telemetria(limite=5000)
    registros = [enriquecer_registro(r) for r in registros if r.get("sensor_id") in ids_permitidos]
    registros = registros[: max(1, min(int(limite), 1000))]

    resumo = calcular_resumo(registros, fonte)

    ultima_por_sensor: dict[str, dict] = {}
    for registro in registros:
        sid = registro.get("sensor_id")
        if sid and sid not in ultima_por_sensor:
            ultima_por_sensor[sid] = registro

    pontos = []
    for sensor in sensores:
        leitura = ultima_por_sensor.get(sensor["sensor_id"])
        pontos.append(
            {
                **sensor,
                "ultima_leitura": leitura,
                "status": leitura.get("status_sensor", "SEM_DADOS") if leitura else "SEM_DADOS",
                "risco": leitura.get("risco", "SEM_DADOS") if leitura else "SEM_DADOS",
                "chuva_mm": leitura.get("chuva_mm", 0) if leitura else 0,
                "nivel_m": leitura.get("nivel_m", 0) if leitura else 0,
                "tendencia": leitura.get("tendencia", "--") if leitura else "--",
                "timestamp": leitura.get("timestamp") if leitura else None,
            }
        )

    riscos_prioridade = {"CRITICO": 4, "ALTO": 3, "MODERADO": 2, "BAIXO": 1, "SEM_DADOS": 0}
    pontos_ordenados = sorted(
        pontos,
        key=lambda item: (
            riscos_prioridade.get(str(item.get("risco")), 0),
            float(item.get("nivel_m") or 0),
        ),
        reverse=True,
    )

    municipios_ativos = sorted({sensor["municipio"] for sensor in sensores})
    bairros_ativos = sorted({sensor["bairro"] for sensor in sensores})
    sensores_com_dados = sum(1 for ponto in pontos if ponto["ultima_leitura"])

    return {
        "fonte": fonte,
        "filtros": {
            "estado": estado or "",
            "municipio": municipio or "",
            "regiao": regiao or "",
            "bairro": bairro or "",
            "sensor_id": sensor_id or "",
        },
        "territorio": {
            "sensores_configurados": len(sensores),
            "sensores_com_dados": sensores_com_dados,
            "municipios": municipios_ativos,
            "bairros": bairros_ativos,
        },
        "resumo": resumo,
        "pontos": pontos_ordenados,
        "registros": registros,
    }
