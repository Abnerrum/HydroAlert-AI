from __future__ import annotations

from collections import defaultdict, deque
from copy import deepcopy
from datetime import datetime, timedelta
from statistics import median

JANELAS_CHUVA_MINUTOS = {
    "15m": 15,
    "1h": 60,
    "3h": 180,
    "6h": 360,
    "24h": 1440,
}


def _parse_timestamp(valor) -> datetime | None:
    if not valor:
        return None
    try:
        return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _float(valor, default: float = 0.0) -> float:
    try:
        return float(valor)
    except (TypeError, ValueError):
        return default


def estimar_cadencia_minutos(registros: list[dict]) -> float | None:
    """Estima a cadência mediana entre leituras do mesmo sensor."""
    por_sensor: dict[str, list[datetime]] = defaultdict(list)
    for registro in registros:
        ts = _parse_timestamp(registro.get("timestamp"))
        sid = str(registro.get("sensor_id") or "")
        if sid and ts:
            por_sensor[sid].append(ts)

    intervalos = []
    for timestamps in por_sensor.values():
        ordenados = sorted(set(timestamps))
        for anterior, atual in zip(ordenados, ordenados[1:], strict=False):
            minutos = (atual - anterior).total_seconds() / 60
            if minutos > 0:
                intervalos.append(minutos)

    if not intervalos:
        return None
    return round(float(median(intervalos)), 3)


def enriquecer_indicadores(registros: list[dict]) -> list[dict]:
    """
    Calcula indicadores hidrometeorológicos exigidos no relatório acadêmico.

    A função preserva a ordem de entrada. Os acumulados são calculados por sensor,
    com base nos timestamps reais/simulados da telemetria.
    """
    if not registros:
        return []

    documentos = [deepcopy(r) for r in registros]
    por_sensor: dict[str, list[tuple[int, dict, datetime]]] = defaultdict(list)

    for indice, registro in enumerate(documentos):
        sid = str(registro.get("sensor_id") or "")
        ts = _parse_timestamp(registro.get("timestamp"))
        if sid and ts:
            por_sensor[sid].append((indice, registro, ts))

    for itens in por_sensor.values():
        itens.sort(key=lambda item: item[2])
        filas = {nome: deque() for nome in JANELAS_CHUVA_MINUTOS}
        soma = {nome: 0.0 for nome in JANELAS_CHUVA_MINUTOS}

        for _, registro, ts in itens:
            chuva = max(0.0, _float(registro.get("chuva_mm")))

            for nome, minutos in JANELAS_CHUVA_MINUTOS.items():
                limite = ts - timedelta(minutes=minutos)
                fila = filas[nome]
                while fila and fila[0][0] <= limite:
                    _, valor_antigo = fila.popleft()
                    soma[nome] -= valor_antigo
                fila.append((ts, chuva))
                soma[nome] += chuva
                registro[f"chuva_acum_{nome}_mm"] = round(
                    max(0.0, soma[nome]),
                    2,
                )

            registro["intensidade_chuva_mm_h"] = round(
                _float(registro.get("chuva_acum_15m_mm")) * 4.0,
                2,
            )

            nivel = _float(registro.get("nivel_m"))
            atencao = _float(registro.get("cota_atencao_m"), 999.0)
            alerta = _float(registro.get("cota_alerta_m"), 999.0)
            critica = _float(registro.get("cota_critica_m"), 999.0)

            registro["distancia_atencao_m"] = round(atencao - nivel, 3)
            registro["distancia_alerta_m"] = round(alerta - nivel, 3)
            registro["distancia_critica_m"] = round(critica - nivel, 3)
            registro["percentual_cota_critica"] = round(
                (nivel / critica * 100.0) if critica > 0 else 0.0,
                2,
            )

    return documentos


def indicadores_ultima_leitura(registro: dict | None) -> dict:
    if not registro:
        return {
            "chuva_acum_15m_mm": 0.0,
            "chuva_acum_1h_mm": 0.0,
            "chuva_acum_3h_mm": 0.0,
            "chuva_acum_6h_mm": 0.0,
            "chuva_acum_24h_mm": 0.0,
            "intensidade_chuva_mm_h": 0.0,
            "distancia_alerta_m": None,
            "distancia_critica_m": None,
            "percentual_cota_critica": 0.0,
        }

    campos = [
        "chuva_acum_15m_mm",
        "chuva_acum_1h_mm",
        "chuva_acum_3h_mm",
        "chuva_acum_6h_mm",
        "chuva_acum_24h_mm",
        "intensidade_chuva_mm_h",
        "distancia_alerta_m",
        "distancia_critica_m",
        "percentual_cota_critica",
    ]
    return {campo: registro.get(campo) for campo in campos}
