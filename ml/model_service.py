from functools import lru_cache

import joblib

from ml.features import vetorizar_leitura
from ml.train_model import MODEL_PATH


@lru_cache(maxsize=1)
def carregar_artefato() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Modelo ainda nao treinado. Execute: python -m ml.train_model"
        )
    return joblib.load(MODEL_PATH)


def recarregar_modelo() -> None:
    carregar_artefato.cache_clear()


def status_modelo() -> dict:
    if not MODEL_PATH.exists():
        return {
            "treinado": False,
            "arquivo": str(MODEL_PATH),
            "mensagem": "Execute python -m ml.train_model para gerar o modelo.",
        }

    try:
        artefato = carregar_artefato()
        return {
            "treinado": True,
            "arquivo": str(MODEL_PATH),
            "metricas": artefato.get("metrics", {}),
        }
    except Exception as erro:
        return {
            "treinado": False,
            "arquivo": str(MODEL_PATH),
            "erro": str(erro),
        }


def classificar_risco_previsto(nivel: float, leitura: dict) -> str:
    if nivel >= float(leitura.get("cota_critica_m", 999)):
        return "CRITICO"
    if nivel >= float(leitura.get("cota_alerta_m", 999)):
        return "ALTO"
    if nivel >= float(leitura.get("cota_atencao_m", 999)):
        return "MODERADO"
    return "BAIXO"


def prever_proximo_nivel(leitura: dict) -> dict:
    artefato = carregar_artefato()
    modelo = artefato["model"]
    vetor = [vetorizar_leitura(leitura)]
    nivel_previsto = float(modelo.predict(vetor)[0])

    return {
        "sensor_id": leitura.get("sensor_id"),
        "nivel_atual_m": leitura.get("nivel_m"),
        "nivel_proximo_previsto_m": round(nivel_previsto, 3),
        "risco_previsto": classificar_risco_previsto(nivel_previsto, leitura),
        "modelo": "RandomForestRegressor-baseline",
        "observacao": "Previsao do proximo passo da serie. Horizontes 1h/3h/6h ficam para a Etapa 7.",
    }
