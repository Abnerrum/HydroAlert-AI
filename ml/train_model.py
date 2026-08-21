from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)

from ml.features import FEATURES, HORIZONTES, TARGET, construir_dataset
from services.indicator_service import estimar_cadencia_minutos
from services.telemetry_service import obter_telemetria

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "modelo_nivel.joblib"
MODEL_VERSION = "2.0"


def _metricas_classificacao(y_real, y_prev, cotas_alerta) -> dict:
    real = [float(y) >= float(c) for y, c in zip(y_real, cotas_alerta)]
    previsto = [float(y) >= float(c) for y, c in zip(y_prev, cotas_alerta)]

    tp = sum(1 for r, p in zip(real, previsto) if r and p)
    fp = sum(1 for r, p in zip(real, previsto) if not r and p)
    fn = sum(1 for r, p in zip(real, previsto) if r and not p)
    tn = sum(1 for r, p in zip(real, previsto) if not r and not p)
    positivos_previstos = tp + fp

    return {
        "precision": round(float(precision_score(real, previsto, zero_division=0)), 4),
        "recall": round(float(recall_score(real, previsto, zero_division=0)), 4),
        "f1": round(float(f1_score(real, previsto, zero_division=0)), 4),
        "taxa_falso_alarme": round(fp / positivos_previstos, 4) if positivos_previstos else 0.0,
        "verdadeiros_positivos": tp,
        "falsos_positivos": fp,
        "falsos_negativos": fn,
        "verdadeiros_negativos": tn,
    }


def treinar_modelo() -> dict:
    registros, fonte = obter_telemetria(limite=5000)
    modelos, metricas, importancias = {}, {}, {}

    for horizonte in HORIZONTES:
        dataset = construir_dataset(registros, horizonte)
        if len(dataset) < 24:
            raise RuntimeError(
                f"Dados insuficientes para {horizonte}h. Gere mais histórico hidrológico. "
                f"Amostras atuais: {len(dataset)}. Sugestão: "
                "python -m iot.sensor_simulator --ciclos 120 --intervalo 0 --passo-minutos 15"
            )

        dataset = dataset.sort_values("timestamp").reset_index(drop=True)
        corte = max(1, int(len(dataset) * 0.75))
        treino, teste = dataset.iloc[:corte], dataset.iloc[corte:]
        if teste.empty:
            raise RuntimeError(f"Conjunto de teste vazio para horizonte {horizonte}h.")

        modelo = RandomForestRegressor(
            n_estimators=350,
            max_depth=14,
            min_samples_leaf=2,
            random_state=42 + horizonte,
            n_jobs=-1,
        )
        modelo.fit(treino[FEATURES], treino[TARGET])
        previsoes = modelo.predict(teste[FEATURES])
        modelos[horizonte] = modelo

        classificacao = _metricas_classificacao(
            teste[TARGET],
            previsoes,
            teste["cota_alerta_m"],
        )

        mae_modelo = float(mean_absolute_error(teste[TARGET], previsoes))
        previsao_persistencia = teste["nivel_m"].astype(float)
        mae_persistencia = float(mean_absolute_error(teste[TARGET], previsao_persistencia))

        metricas[f"{horizonte}h"] = {
            "mae_m": round(mae_modelo, 4),
            "rmse_m": round(float(mean_squared_error(teste[TARGET], previsoes) ** 0.5), 4),
            "r2": round(float(r2_score(teste[TARGET], previsoes)), 4) if len(teste) > 1 else None,
            "mae_persistencia_m": round(mae_persistencia, 4),
            "supera_baseline": mae_modelo < mae_persistencia,
            "amostras": len(dataset),
            "treino": len(treino),
            "teste": len(teste),
            "test_start_timestamp": teste.iloc[0]["timestamp"].isoformat() if not teste.empty else None,
            "lead_time_h": horizonte,
            **classificacao,
        }
        importancias[f"{horizonte}h"] = sorted(
            (
                {"feature": nome, "importancia": round(float(valor), 5)}
                for nome, valor in zip(FEATURES, modelo.feature_importances_)
            ),
            key=lambda item: item["importancia"],
            reverse=True,
        )

    artefato = {
        "version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "models": modelos,
        "features": FEATURES,
        "metrics": {
            "horizontes": metricas,
            "fonte": fonte,
            "validacao": "holdout_temporal_25pct",
            "cadencia_estimada_min": estimar_cadencia_minutos(registros),
            "criterio_evento": "nivel_futuro >= cota_alerta",
            "feature_importance": importancias,
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

    print("Modelo HydroAlert AI v2 treinado com sucesso.")
    print(f"Arquivo: {MODEL_PATH}")
    print(f"Horizontes validados: {', '.join(metricas['horizontes'])}")
    print(f"Fonte: {metricas['fonte']}")
    print(f"Cadencia estimada: {metricas.get('cadencia_estimada_min')} min")


if __name__ == "__main__":
    main()
