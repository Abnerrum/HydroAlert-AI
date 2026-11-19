"""Consulta telemetria capturada do ESP32 por USB, sem mesclar com simulação.

Origem é declarada pelo firmware e validada no coletor. Um arquivo local
não comprova calibração em campo; o status representa somente recência dos dados.
"""

from __future__ import annotations

import json
import math
from collections import deque
from datetime import UTC, datetime
from pathlib import Path

from iot.config import PASTA_DADOS

CAMINHO_ESP32 = PASTA_DADOS / "esp32_real.jsonl"
CAMPOS_NUMERICOS = (
    "uptime_ms", "distancia_cm", "temperatura_c", "umidade_pct",
    "altura_referencia_cm", "nivel_m",
)
CAMPOS = (
    "timestamp", "sensor_id", "origem", *CAMPOS_NUMERICOS,
    "chuva_mm", "status_sensor",
)


def _validar_registro(dados) -> dict | None:
    if not isinstance(dados, dict) or dados.get("origem") != "ESP32_FISICO":
        return None
    identificador = dados.get("sensor_id")
    if not isinstance(identificador, str) or not 1 <= len(identificador) <= 64:
        return None
    timestamp = dados.get("timestamp")
    if not isinstance(timestamp, str):
        return None
    try:
        data = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    if data.tzinfo is None:
        return None
    if dados.get("chuva_mm") is not None:
        return None  # DHT11 não é pluviômetro
    for campo in CAMPOS_NUMERICOS:
        valor = dados.get(campo)
        if valor is not None and (
            isinstance(valor, bool) or not isinstance(valor, (int, float))
            or not math.isfinite(valor)
        ):
            return None
    return {chave: dados.get(chave) for chave in CAMPOS}


def listar_leituras_esp32(
    limite: int = 50, sensor_id: str | None = None, caminho: Path | None = None
) -> list[dict]:
    """Retorna apenas leituras físicas válidas, da mais recente para a mais antiga."""
    caminho = caminho or CAMINHO_ESP32
    if not caminho.is_file():
        return []
    ultimas = deque(maxlen=max(1, min(limite, 500)))
    with caminho.open("r", encoding="utf-8") as arquivo:
        for linha in arquivo:
            try:
                registro = _validar_registro(json.loads(linha))
            except (json.JSONDecodeError, UnicodeError):
                continue
            if registro and (sensor_id is None or registro["sensor_id"] == sensor_id):
                ultimas.append(registro)
    return list(reversed(ultimas))


def consultar_esp32(
    limite: int = 50, sensor_id: str | None = None, caminho: Path | None = None,
    agora: datetime | None = None,
) -> dict:
    leituras = listar_leituras_esp32(limite=limite, sensor_id=sensor_id, caminho=caminho)
    ultima = leituras[0] if leituras else None
    status = "sem_leituras"
    idade_segundos = None
    if ultima:
        data = datetime.fromisoformat(ultima["timestamp"].replace("Z", "+00:00"))
        idade_segundos = max(0, int(((agora or datetime.now(UTC)) - data).total_seconds()))
        status = "recente" if idade_segundos <= 120 else "desatualizado"
    return {
        "fonte": "ESP32_FISICO_USB",
        "status": status,
        "quantidade": len(leituras),
        "idade_ultima_leitura_s": idade_segundos,
        "ultima_leitura": ultima,
        "leituras": leituras,
        "tem_nivel_calibrado": bool(
            ultima and ultima["altura_referencia_cm"] is not None
            and ultima["nivel_m"] is not None
        ),
        "observacao": (
            "Somente arquivo de leituras USB: dados não misturados com simulação, "
            "sem geolocalização oficial, chuva ou classificação de risco. "
            "Recente significa registro recente, não confirmação de conexão USB."
        ),
    }
