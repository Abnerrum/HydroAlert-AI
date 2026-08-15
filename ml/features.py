import pandas as pd

FEATURES = [
    "chuva_mm",
    "nivel_m",
    "variacao_nivel_m",
    "cota_atencao_m",
    "cota_alerta_m",
    "cota_critica_m",
]
TARGET = "nivel_proximo_m"


def construir_dataset(registros: list[dict]) -> pd.DataFrame:
    if not registros:
        return pd.DataFrame(columns=FEATURES + [TARGET])

    df = pd.DataFrame(registros).copy()
    obrigatorias = {"sensor_id", "timestamp", *FEATURES}
    ausentes = obrigatorias.difference(df.columns)
    if ausentes:
        raise ValueError(f"Campos ausentes para ML: {sorted(ausentes)}")

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    for coluna in FEATURES:
        df[coluna] = pd.to_numeric(df[coluna], errors="coerce")

    df = df.dropna(subset=["sensor_id", "timestamp", *FEATURES])
    df = df.sort_values(["sensor_id", "timestamp"])
    df[TARGET] = df.groupby("sensor_id")["nivel_m"].shift(-1)
    df = df.dropna(subset=[TARGET])
    return df.reset_index(drop=True)


def vetorizar_leitura(leitura: dict) -> list[float]:
    return [float(leitura.get(coluna, 0) or 0) for coluna in FEATURES]
