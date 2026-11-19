"""Meteorologia modelada de capitais de 27 UFs — não são níveis de rios.

Open-Meteo fornece estimativas/saídas de modelos, não medições de estações.
Qualquer indisponibilidade resulta em valores ausentes, nunca sintéticos.
"""

from __future__ import annotations

import json
import math
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock
from urllib.parse import urlencode
from urllib.request import urlopen

CAPITAIS = json.loads(
    (Path(__file__).resolve().with_name("capitais_brasil.json")).read_text(encoding="utf-8")
)
API = "https://api.open-meteo.com/v1/forecast"
VARIAVEIS = "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m"
_CACHE: tuple[float, dict] | None = None
_LOCK = Lock()


def _numero(valor):
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return None
    return float(valor) if math.isfinite(valor) else None


def _converter(capital: dict, resposta: dict | None) -> dict:
    atual = resposta.get("current") if isinstance(resposta, dict) else None
    atual = atual if isinstance(atual, dict) else {}
    horario = atual.get("time") if isinstance(atual.get("time"), str) else None
    medicao = {
        "temperatura_c": _numero(atual.get("temperature_2m")),
        "umidade_pct": _numero(atual.get("relative_humidity_2m")),
        "precipitacao_mm": _numero(atual.get("precipitation")),
        "vento_kmh": _numero(atual.get("wind_speed_10m")),
    }
    disponivel = bool(horario and any(valor is not None for valor in medicao.values()))
    return {
        **capital,
        "tipo": "meteorologia_modelada",
        "disponivel": disponivel,
        "timestamp_utc": horario + "Z" if disponivel else None,
        **(medicao if disponivel else dict.fromkeys(medicao)),
    }


def _lote(capitais: list[dict]) -> list[dict]:
    params = urlencode({
        "latitude": ",".join(str(c["latitude"]) for c in capitais),
        "longitude": ",".join(str(c["longitude"]) for c in capitais),
        "current": VARIAVEIS,
        "timezone": "GMT",
    })
    timeout = min(20.0, max(1.0, float(os.getenv("OPEN_METEO_TIMEOUT_S", "8"))))
    with urlopen(API + "?" + params, timeout=timeout) as req:  # nosec: URL fixa, coords locais
        payload = json.load(req)
    lista = payload if isinstance(payload, list) else [payload]
    if len(lista) != len(capitais):
        raise ValueError("Retorno do provedor incompatível com as capitais consultadas")
    return [_converter(capital, dado) for capital, dado in zip(capitais, lista, strict=True)]


def consultar_meteorologia_brasil(forcar: bool = False) -> dict:
    """Consulta 27 capitais em 3 lotes com cache 10 min; falhas parciais explícitas."""
    global _CACHE
    with _LOCK:
        if _CACHE and not forcar and time.monotonic() < _CACHE[0]:
            return _CACHE[1]

    grupos = [CAPITAIS[i:i + 9] for i in range(0, len(CAPITAIS), 9)]
    por_uf = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(_lote, g): g for g in grupos}
        for future in as_completed(futures):
            grupo = futures[future]
            try:
                resultados = future.result()
            except (OSError, ValueError, TimeoutError, TypeError):
                resultados = [_converter(item, None) for item in grupo]
            for ponto in resultados:
                por_uf[ponto["uf"]] = ponto
    pontos = [por_uf[capital["uf"]] for capital in CAPITAIS]
    retornado = {
        "fonte": "Open-Meteo",
        "tipo": "meteorologia_modelada",
        "unidades_federativas": 27,
        "localidades": "capitais (1 ponto de referência por UF)",
        "capital_total": len(CAPITAIS),
        "com_dados": sum(p["disponivel"] for p in pontos),
        "pontos": pontos,
        "aviso": (
            "Dados de modelos meteorológicos Open-Meteo, não leituras de sensores "
            "hidrológicos. Um ponto aproximado por capital, não cobertura de todos "
            "os municípios, rios ou bairros. Sem classificação de risco de inundação."
        ),
    }
    with _LOCK:
        if retornado["com_dados"]:
            _CACHE = (time.monotonic() + 600, retornado)
    return retornado
