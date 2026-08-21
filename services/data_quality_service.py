from __future__ import annotations

from collections import Counter
from datetime import datetime

CAMPOS_OBRIGATORIOS = (
    "sensor_id",
    "timestamp",
    "chuva_mm",
    "nivel_m",
    "cota_atencao_m",
    "cota_alerta_m",
    "cota_critica_m",
    "risco",
)


def _timestamp_valido(valor) -> bool:
    if not valor:
        return False
    try:
        datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
        return True
    except (TypeError, ValueError):
        return False


def _numero(valor) -> float | None:
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def avaliar_qualidade(registros: list[dict]) -> dict:
    if not registros:
        return {
            "total_registros": 0,
            "score_percentual": 0.0,
            "completude_percentual": 0.0,
            "duplicidade_percentual": 0.0,
            "registros_invalidos": 0,
            "duplicados": 0,
            "problemas": {"sem_dados": 1},
            "status": "SEM_DADOS",
        }

    problemas = Counter()
    chaves = Counter()
    campos_esperados = len(CAMPOS_OBRIGATORIOS) * len(registros)
    campos_presentes = 0
    invalidos = 0

    for registro in registros:
        registro_invalido = False
        for campo in CAMPOS_OBRIGATORIOS:
            valor = registro.get(campo)
            if valor not in (None, ""):
                campos_presentes += 1
            else:
                problemas[f"campo_ausente:{campo}"] += 1
                registro_invalido = True

        sid = str(registro.get("sensor_id") or "")
        ts = str(registro.get("timestamp") or "")
        if sid and ts:
            chaves[(sid, ts)] += 1

        if not _timestamp_valido(registro.get("timestamp")):
            problemas["timestamp_invalido"] += 1
            registro_invalido = True

        chuva = _numero(registro.get("chuva_mm"))
        nivel = _numero(registro.get("nivel_m"))
        if chuva is None or chuva < 0 or chuva > 500:
            problemas["chuva_fora_faixa"] += 1
            registro_invalido = True
        if nivel is None or nivel < 0 or nivel > 20:
            problemas["nivel_fora_faixa"] += 1
            registro_invalido = True

        cotas = [_numero(registro.get(c)) for c in ("cota_atencao_m", "cota_alerta_m", "cota_critica_m")]
        if any(c is None for c in cotas) or not (cotas[0] < cotas[1] < cotas[2]):
            problemas["cotas_inconsistentes"] += 1
            registro_invalido = True

        if registro_invalido:
            invalidos += 1

    duplicados = sum(max(0, quantidade - 1) for quantidade in chaves.values())
    completude = campos_presentes / campos_esperados * 100 if campos_esperados else 0
    duplicidade = duplicados / len(registros) * 100
    validade = max(0.0, 100.0 - invalidos / len(registros) * 100)
    unicidade = max(0.0, 100.0 - duplicidade)
    score = completude * 0.40 + validade * 0.40 + unicidade * 0.20

    if score >= 95:
        status = "EXCELENTE"
    elif score >= 85:
        status = "BOM"
    elif score >= 70:
        status = "ATENCAO"
    else:
        status = "CRITICO"

    return {
        "total_registros": len(registros),
        "score_percentual": round(score, 2),
        "completude_percentual": round(completude, 2),
        "duplicidade_percentual": round(duplicidade, 2),
        "registros_invalidos": invalidos,
        "duplicados": duplicados,
        "problemas": dict(problemas),
        "status": status,
        "criterios": {
            "completude_peso": 0.40,
            "validade_peso": 0.40,
            "unicidade_peso": 0.20,
        },
    }
