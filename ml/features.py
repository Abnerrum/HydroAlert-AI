from __future__ import annotations

from statistics import median

import pandas as pd

from services.indicator_service import enriquecer_indicadores

FEATURES = [
    "chuva_mm",
    "chuva_acum_15m_mm",
    "chuva_acum_1h_mm",
    "chuva_acum_3h_mm",
    "chuva_acum_6h_mm",
    "chuva_acum_24h_mm",
    "intensidade_chuva_mm_h",
    "nivel_m",
    "variacao_nivel_m",
    "distancia_alerta_m",
    "distancia_critica_m",
    "percentual_cota_critica",
    "cota_atencao_m",
    "cota_alerta_m",
    "cota_critica_m",
]
HORIZONTES = (1, 3, 6)
TARGET = "nivel_futuro_m"


def _passos_horizonte(grupo: pd.DataFrame, horizonte_h: int) -> int:
    passos_meta = []
    if "simulacao" in grupo.columns:
        for valor in grupo["simulacao"].dropna():
            if isinstance(valor, dict):
                passo = valor.get("passo_hidrologico_min")
                try:
                    if float(passo) > 0:
                        passos_meta.append(float(passo))
                except (TypeError, ValueError):
                    pass
    if passos_meta:
        minutos = median(passos_meta)
        return max(1, round(horizonte_h * 60 / minutos))

    diffs = grupo["timestamp"].sort_values().diff().dt.total_seconds().dropna() / 60
    diffs = diffs[diffs > 0]
    if not diffs.empty:
        cadencia = float(diffs.median())
        if cadencia < 5:
            return max(1, horizonte_h)
        return max(1, round(horizonte_h * 60 / cadencia))

    return max(1, horizonte_h)


def construir_dataset(registros: list[dict], horizonte_h: int = 1) -> pd.DataFrame:
    if horizonte_h not in HORIZONTES:
        raise ValueError(f"Horizonte invalido: {horizonte_h}. Use 1, 3 ou 6 horas.")
    if not registros:
        return pd.DataFrame(columns=FEATURES + [TARGET])

    enriquecidos = enriquecer_indicadores(registros)
    df = pd.DataFrame(enriquecidos).copy()
    obrigatorias = {"sensor_id", "timestamp", "nivel_m", "chuva_mm", "variacao_nivel_m",
                    "cota_atencao_m", "cota_alerta_m", "cota_critica_m"}
    ausentes = obrigatorias.difference(df.columns)
    if ausentes:
        raise ValueError(f"Campos ausentes para ML: {sorted(ausentes)}")

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    for coluna in FEATURES:
        if coluna not in df.columns:
            df[coluna] = 0.0
        df[coluna] = pd.to_numeric(df[coluna], errors="coerce")

    df = df.dropna(subset=["sensor_id", "timestamp", *FEATURES])
    df = df.sort_values(["sensor_id", "timestamp"])

    partes = []
    for _, grupo in df.groupby("sensor_id", sort=False):
        grupo = grupo.copy().sort_values("timestamp")
        passos = _passos_horizonte(grupo, horizonte_h)
        grupo[TARGET] = grupo["nivel_m"].shift(-passos)
        grupo["passos_horizonte"] = passos
        grupo["horizonte_h"] = horizonte_h
        partes.append(grupo)

    if not partes:
        return pd.DataFrame(columns=FEATURES + [TARGET])

    resultado = pd.concat(partes, ignore_index=True)
    resultado = resultado.dropna(subset=[TARGET])
    return resultado.sort_values("timestamp").reset_index(drop=True)


def vetorizar_leitura(leitura: dict) -> list[float]:
    vetor = []
    for coluna in FEATURES:
        try:
            vetor.append(float(leitura.get(coluna, 0) or 0))
        except (TypeError, ValueError):
            vetor.append(0.0)
    return vetor
