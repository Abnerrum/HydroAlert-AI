import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from ml.features import FEATURES, TARGET, construir_dataset
from services.telemetry_service import obter_telemetria

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "modelo_nivel.joblib"
HISTORICO_PATH = MODELS_DIR / "treinos.jsonl"


def avaliar(y_real, y_previsto) -> dict:
    """Calcula MAE, RMSE e R2 de um conjunto de previsoes."""
    mae = float(mean_absolute_error(y_real, y_previsto))
    mse = float(mean_squared_error(y_real, y_previsto))
    r2 = float(r2_score(y_real, y_previsto)) if len(y_real) > 1 else float("nan")
    return {
        "mae_m": round(mae, 4),
        "rmse_m": round(mse**0.5, 4),
        "r2": round(r2, 4),
    }


def treinar_modelo() -> dict:
    registros, fonte = obter_telemetria(limite=5000)
    dataset = construir_dataset(registros)

    if len(dataset) < 12:
        raise RuntimeError(
            "Dados insuficientes para treino. Gere pelo menos 12 amostras supervisionadas. "
            f"Amostras atuais: {len(dataset)}"
        )

    X = dataset[FEATURES]
    y = dataset[TARGET]

    X_treino, X_teste, y_treino, y_teste = train_test_split(
        X,
        y,
        test_size=0.25,
        shuffle=False,
    )

    modelo = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        n_jobs=-1,
    )
    modelo.fit(X_treino, y_treino)
    previsoes = modelo.predict(X_teste)

    # Baseline ingenuo de persistencia: "proximo nivel = nivel atual".
    # O modelo so e considerado util se superar esse baseline no MAE.
    previsoes_baseline = X_teste["nivel_m"].to_numpy()

    metricas_modelo = avaliar(y_teste, previsoes)
    metricas_baseline = avaliar(y_teste, previsoes_baseline)

    metricas = {
        "mae_m": metricas_modelo["mae_m"],
        "modelo": metricas_modelo,
        "baseline_persistencia": metricas_baseline,
        "supera_baseline": metricas_modelo["mae_m"] < metricas_baseline["mae_m"],
        "amostras": int(len(dataset)),
        "treino": int(len(X_treino)),
        "teste": int(len(X_teste)),
        "fonte": fonte,
        "treinado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    artefato = {
        "model": modelo,
        "features": FEATURES,
        "metrics": metricas,
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(artefato, MODEL_PATH)
    registrar_historico(metricas)
    return metricas


def registrar_historico(metricas: dict) -> None:
    """Anexa as metricas de cada treino em models/treinos.jsonl."""
    with HISTORICO_PATH.open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps(metricas, ensure_ascii=False) + "\n")


def main() -> None:
    try:
        metricas = treinar_modelo()
    except (RuntimeError, ValueError) as erro:
        print(f"ERRO DE TREINO: {erro}")
        raise SystemExit(1) from erro

    modelo = metricas["modelo"]
    baseline = metricas["baseline_persistencia"]

    print("Modelo treinado com sucesso.")
    print(f"Arquivo: {MODEL_PATH}")
    print(f"Amostras: {metricas['amostras']}")
    print(f"Fonte: {metricas['fonte']}")
    print(
        f"Modelo   -> MAE: {modelo['mae_m']} m | "
        f"RMSE: {modelo['rmse_m']} m | R2: {modelo['r2']}"
    )
    print(
        f"Baseline -> MAE: {baseline['mae_m']} m | "
        f"RMSE: {baseline['rmse_m']} m | R2: {baseline['r2']}"
    )
    print(f"Supera baseline de persistencia: {metricas['supera_baseline']}")


if __name__ == "__main__":
    main()
