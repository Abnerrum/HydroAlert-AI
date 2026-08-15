from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

from ml.features import FEATURES, TARGET, construir_dataset
from services.telemetry_service import obter_telemetria

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "modelo_nivel.joblib"


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
    mae = float(mean_absolute_error(y_teste, previsoes))

    artefato = {
        "model": modelo,
        "features": FEATURES,
        "metrics": {
            "mae_m": round(mae, 4),
            "amostras": int(len(dataset)),
            "treino": int(len(X_treino)),
            "teste": int(len(X_teste)),
            "fonte": fonte,
        },
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(artefato, MODEL_PATH)
    return artefato["metrics"]


def main() -> None:
    try:
        metricas = treinar_modelo()
    except (RuntimeError, ValueError) as erro:
        print(f"ERRO DE TREINO: {erro}")
        raise SystemExit(1)

    print("Modelo treinado com sucesso.")
    print(f"Arquivo: {MODEL_PATH}")
    print(f"Amostras: {metricas['amostras']}")
    print(f"MAE: {metricas['mae_m']} m")
    print(f"Fonte: {metricas['fonte']}")


if __name__ == "__main__":
    main()
