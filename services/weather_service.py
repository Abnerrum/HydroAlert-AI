"""Integracao academica com a API publica Open-Meteo (sem chave).

Busca a precipitacao atual real para as coordenadas de um ponto de
monitoramento. Em caso de indisponibilidade da API externa, retorna
`disponivel: False` e o sistema segue operando com os dados simulados.
"""

import json
import os
import time
import urllib.error
import urllib.request

from iot.config import SENSORES
from logging_config import configurar_logging

logger = configurar_logging("hydroalert.clima")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_SEGUNDOS = float(os.getenv("OPEN_METEO_TIMEOUT_S", "5"))
CACHE_TTL_SEGUNDOS = int(os.getenv("OPEN_METEO_CACHE_TTL_S", "300"))

SENSOR_POR_ID = {sensor["sensor_id"]: sensor for sensor in SENSORES}
_cache: dict[str, tuple[float, dict]] = {}


def clima_atual(sensor_id: str) -> dict:
    """Retorna a precipitacao atual real para o ponto do sensor informado."""
    sensor = SENSOR_POR_ID.get(sensor_id)
    if not sensor:
        return {
            "disponivel": False,
            "erro": f"Sensor desconhecido: {sensor_id}",
        }

    agora = time.time()
    if sensor_id in _cache:
        expira_em, dados = _cache[sensor_id]
        if agora < expira_em:
            return dados

    url = (
        f"{OPEN_METEO_URL}"
        f"?latitude={sensor['latitude']}"
        f"&longitude={sensor['longitude']}"
        "&current=precipitation,rain,showers,relative_humidity_2m,temperature_2m"
        "&timezone=America%2FSao_Paulo"
    )

    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_SEGUNDOS) as resposta:
            payload = json.loads(resposta.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as erro:
        logger.warning("Open-Meteo indisponivel para %s: %s", sensor_id, erro)
        return {
            "disponivel": False,
            "sensor_id": sensor_id,
            "erro": "API Open-Meteo indisponivel no momento.",
        }

    atual = payload.get("current", {})
    dados = {
        "disponivel": True,
        "fonte": "open-meteo",
        "sensor_id": sensor_id,
        "municipio": sensor["municipio"],
        "uf": sensor["uf"],
        "timestamp": atual.get("time"),
        "precipitacao_mm": atual.get("precipitation"),
        "chuva_mm": atual.get("rain"),
        "pancadas_mm": atual.get("showers"),
        "temperatura_c": atual.get("temperature_2m"),
        "umidade_relativa_pct": atual.get("relative_humidity_2m"),
        "observacao": (
            "Dado meteorologico real do ponto aproximado do sensor simulado. "
            "Uso exclusivamente academico."
        ),
    }
    _cache[sensor_id] = (agora + CACHE_TTL_SEGUNDOS, dados)
    return dados
