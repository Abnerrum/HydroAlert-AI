from __future__ import annotations

from functools import lru_cache
from statistics import pstdev

import joblib
import pandas as pd

from ml.features import FEATURES, HORIZONTES, vetorizar_leitura
from ml.train_model import MODEL_PATH, MODEL_VERSION

ORDEM_RISCO = {"BAIXO": 0, "MODERADO": 1, "ALTO": 2, "CRITICO": 3}


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
        features_artefato = artefato.get("features", [])
        atualizado = features_artefato == FEATURES and str(artefato.get("version", "1.0")) == MODEL_VERSION
        return {
            "treinado": True,
            "atualizado": atualizado,
            "versao": artefato.get("version", "1.0"),
            "arquivo": str(MODEL_PATH),
            "metricas": artefato.get("metrics", {}),
            "mensagem": None if atualizado else "Modelo legado detectado; recomenda-se executar python -m ml.train_model.",
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


def _vetor_para_artefato(leitura: dict, artefato: dict) -> list[float]:
    nomes = artefato.get("features") or FEATURES
    if nomes == FEATURES:
        return vetorizar_leitura(leitura)
    vetor = []
    for nome in nomes:
        try:
            vetor.append(float(leitura.get(nome, 0) or 0))
        except (TypeError, ValueError):
            vetor.append(0.0)
    return vetor


def _incerteza_floresta(modelo, vetor: list[float]) -> float | None:
    estimadores = getattr(modelo, "estimators_", None)
    if not estimadores:
        return None
    try:
        matriz = pd.DataFrame([vetor]).to_numpy()
        valores = [float(arvore.predict(matriz)[0]) for arvore in estimadores]
        return round(float(pstdev(valores)), 3) if len(valores) > 1 else 0.0
    except Exception:
        return None


def prever_horizontes(leitura: dict) -> dict:
    artefato = carregar_artefato()
    vetor = _vetor_para_artefato(leitura, artefato)
    modelos = artefato.get("models")
    if not modelos:
        modelos = {1: artefato["model"]}

    previsoes = []
    for horizonte in HORIZONTES:
        modelo = modelos.get(horizonte) or modelos.get(str(horizonte))
        if not modelo:
            continue
        nomes_features = artefato.get("features") or FEATURES
        frame = pd.DataFrame([vetor], columns=nomes_features)
        nivel = max(0.0, float(modelo.predict(frame)[0]))
        risco = classificar_risco_previsto(nivel, leitura)
        previsoes.append(
            {
                "horizonte_h": horizonte,
                "nivel_previsto_m": round(nivel, 3),
                "risco_previsto": risco,
                "incerteza_m": _incerteza_floresta(modelo, vetor),
            }
        )

    lead_time = next(
        (p["horizonte_h"] for p in previsoes if ORDEM_RISCO.get(p["risco_previsto"], 0) >= ORDEM_RISCO["ALTO"]),
        None,
    )
    risco_pico = max(
        (p["risco_previsto"] for p in previsoes),
        key=lambda risco: ORDEM_RISCO.get(risco, -1),
        default="SEM_DADOS",
    )

    return {
        "sensor_id": leitura.get("sensor_id"),
        "timestamp_referencia": leitura.get("timestamp"),
        "nivel_atual_m": leitura.get("nivel_m"),
        "chuva_acum_1h_mm": leitura.get("chuva_acum_1h_mm"),
        "chuva_acum_3h_mm": leitura.get("chuva_acum_3h_mm"),
        "chuva_acum_6h_mm": leitura.get("chuva_acum_6h_mm"),
        "previsoes": previsoes,
        "lead_time_estimado_h": lead_time,
        "risco_pico_previsto": risco_pico,
        "modelo": f"RandomForestRegressor-multi-horizonte-v{artefato.get('version', '1.0')}",
        "observacao": "Horizontes acadêmicos; não usar como alerta oficial.",
    }


def prever_proximo_nivel(leitura: dict) -> dict:
    """Compatibilidade com clientes antigos."""
    resultado = prever_horizontes(leitura)
    if not resultado["previsoes"]:
        raise RuntimeError("Artefato de modelo sem horizonte disponível.")
    primeira = resultado["previsoes"][0]
    return {
        **resultado,
        "nivel_proximo_previsto_m": primeira["nivel_previsto_m"],
        "risco_previsto": primeira["risco_previsto"],
    }
