import json
from collections import Counter

from pymongo.errors import PyMongoError

from database.mongodb import listar_telemetria
from iot.config import ARQUIVO_MQTT_RECEBIDO, ARQUIVO_TELEMETRIA


def _carregar_jsonl(caminho, limite: int, sensor_id: str | None) -> list[dict]:
    if not caminho.exists():
        return []

    registros = []
    with caminho.open("r", encoding="utf-8") as arquivo:
        for linha in arquivo:
            linha = linha.strip()
            if not linha:
                continue
            try:
                registro = json.loads(linha)
            except json.JSONDecodeError:
                continue
            if sensor_id and registro.get("sensor_id") != sensor_id:
                continue
            registros.append(registro)

    return list(reversed(registros[-limite:]))


def obter_telemetria(
    limite: int = 100,
    sensor_id: str | None = None,
) -> tuple[list[dict], str]:
    limite = max(1, min(int(limite), 5000))

    try:
        registros = listar_telemetria(limite=limite, sensor_id=sensor_id)
        if registros:
            return registros, "mongodb"
    except PyMongoError:
        pass

    registros = _carregar_jsonl(ARQUIVO_MQTT_RECEBIDO, limite, sensor_id)
    if registros:
        return registros, "mqtt_jsonl"

    return _carregar_jsonl(ARQUIVO_TELEMETRIA, limite, sensor_id), "telemetria_jsonl"


def calcular_resumo(registros: list[dict], fonte: str) -> dict:
    if not registros:
        return {
            "fonte": fonte,
            "total": 0,
            "chuva_media_mm": 0.0,
            "nivel_medio_m": 0.0,
            "nivel_maximo_m": 0.0,
            "risco_atual": "SEM_DADOS",
            "riscos": {},
            "ultima_leitura": None,
        }

    chuvas = [float(r.get("chuva_mm", 0) or 0) for r in registros]
    niveis = [float(r.get("nivel_m", 0) or 0) for r in registros]
    riscos = Counter(str(r.get("risco", "DESCONHECIDO")) for r in registros)
    ultima = registros[0]

    return {
        "fonte": fonte,
        "total": len(registros),
        "chuva_media_mm": round(sum(chuvas) / len(chuvas), 2),
        "nivel_medio_m": round(sum(niveis) / len(niveis), 3),
        "nivel_maximo_m": round(max(niveis), 3),
        "risco_atual": ultima.get("risco", "DESCONHECIDO"),
        "riscos": dict(riscos),
        "ultima_leitura": ultima,
    }
