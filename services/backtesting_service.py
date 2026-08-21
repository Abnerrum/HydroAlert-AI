from __future__ import annotations

import csv
from pathlib import Path

import joblib

from ml.features import FEATURES, HORIZONTES, TARGET, construir_dataset
from ml.train_model import MODEL_PATH

EXPORT_DIR = Path(__file__).resolve().parents[1] / "exports"


def _metricas_evento(reais, previstos, cotas) -> dict:
    observado = [float(r) >= float(c) for r, c in zip(reais, cotas)]
    previsto = [float(p) >= float(c) for p, c in zip(previstos, cotas)]

    tp = sum(1 for o, p in zip(observado, previsto) if o and p)
    fp = sum(1 for o, p in zip(observado, previsto) if not o and p)
    fn = sum(1 for o, p in zip(observado, previsto) if o and not p)
    tn = sum(1 for o, p in zip(observado, previsto) if not o and not p)

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    taxa_falso_alarme = fp / (tp + fp) if tp + fp else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "taxa_falso_alarme": round(taxa_falso_alarme, 4),
        "verdadeiros_positivos": tp,
        "falsos_positivos": fp,
        "falsos_negativos": fn,
        "verdadeiros_negativos": tn,
    }


def _carregar_modelos() -> tuple[dict, list[str], dict]:
    if not MODEL_PATH.exists():
        return {}, FEATURES, {}
    try:
        artefato = joblib.load(MODEL_PATH)
        return (
            artefato.get("models") or {},
            artefato.get("features") or FEATURES,
            artefato.get("metrics", {}).get("horizontes", {}),
        )
    except Exception:
        return {}, FEATURES, {}


def _vetores(dataset, nomes_features: list[str]):
    dados = dataset.copy()
    for coluna in nomes_features:
        if coluna not in dados.columns:
            dados[coluna] = 0.0
    return dados[nomes_features]


def executar_backtesting(registros: list[dict]) -> dict:
    resultados = []
    modelos, features_modelo, metricas_treino = _carregar_modelos()

    for horizonte in HORIZONTES:
        df = construir_dataset(registros, horizonte)
        if df.empty:
            continue

        chave = f"{horizonte}h"
        inicio_teste = metricas_treino.get(chave, {}).get("test_start_timestamp")
        if inicio_teste:
            try:
                inicio = __import__("pandas").to_datetime(inicio_teste, utc=True)
                df_holdout = df[df["timestamp"] >= inicio].copy()
                if not df_holdout.empty:
                    df = df_holdout
            except Exception:
                pass

        observado = df[TARGET].astype(float)
        persistencia = df["nivel_m"].astype(float)
        erro_persistencia = (observado - persistencia).abs()

        item = {
            "horizonte_h": horizonte,
            "eventos": len(df),
            "mae_persistencia_m": round(float(erro_persistencia.mean()), 4),
            "pico_observado_m": round(float(observado.max()), 3),
            "lead_time_avaliado_h": horizonte,
            "baseline_evento": _metricas_evento(observado, persistencia, df["cota_alerta_m"]),
        }

        modelo = modelos.get(horizonte) or modelos.get(str(horizonte))
        if modelo is not None:
            try:
                previsoes = modelo.predict(_vetores(df, features_modelo))
                erro_modelo = (observado - previsoes).abs()
                item["modelo"] = {
                    "disponivel": True,
                    "mae_m": round(float(erro_modelo.mean()), 4),
                    "ganho_mae_vs_persistencia_percentual": round(
                        (1 - float(erro_modelo.mean()) / float(erro_persistencia.mean())) * 100,
                        2,
                    ) if float(erro_persistencia.mean()) > 0 else 0.0,
                    **_metricas_evento(observado, previsoes, df["cota_alerta_m"]),
                }
            except Exception as erro:
                item["modelo"] = {"disponivel": False, "erro": str(erro)}
        else:
            item["modelo"] = {"disponivel": False, "motivo": "Modelo não treinado para este horizonte."}

        resultados.append(item)

    return {
        "metodo_referencia": "persistencia",
        "criterio_evento": "nivel_futuro >= cota_alerta",
        "resultados": resultados,
        "observacao": "Backtesting acadêmico no holdout temporal quando o artefato registra a data de início do teste; recalcular com dados oficiais antes de uso real.",
    }


def exportar_power_bi(registros: list[dict]) -> Path:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    caminho = EXPORT_DIR / "hydroalert_powerbi.csv"
    campos = [
        "timestamp",
        "sensor_id",
        "municipio",
        "bairro",
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
        "risco",
        "nivel_operacional",
        "tendencia",
        "origem",
    ]
    with caminho.open("w", newline="", encoding="utf-8-sig") as arquivo:
        writer = csv.DictWriter(arquivo, fieldnames=campos, delimiter=";")
        writer.writeheader()
        for r in reversed(registros):
            loc = r.get("localizacao", {})
            writer.writerow(
                {
                    "timestamp": r.get("timestamp"),
                    "sensor_id": r.get("sensor_id"),
                    "municipio": loc.get("municipio"),
                    "bairro": loc.get("bairro"),
                    "chuva_mm": r.get("chuva_mm"),
                    "chuva_acum_15m_mm": r.get("chuva_acum_15m_mm"),
                    "chuva_acum_1h_mm": r.get("chuva_acum_1h_mm"),
                    "chuva_acum_3h_mm": r.get("chuva_acum_3h_mm"),
                    "chuva_acum_6h_mm": r.get("chuva_acum_6h_mm"),
                    "chuva_acum_24h_mm": r.get("chuva_acum_24h_mm"),
                    "intensidade_chuva_mm_h": r.get("intensidade_chuva_mm_h"),
                    "nivel_m": r.get("nivel_m"),
                    "variacao_nivel_m": r.get("variacao_nivel_m"),
                    "distancia_alerta_m": r.get("distancia_alerta_m"),
                    "distancia_critica_m": r.get("distancia_critica_m"),
                    "percentual_cota_critica": r.get("percentual_cota_critica"),
                    "risco": r.get("risco"),
                    "nivel_operacional": r.get("nivel_operacional"),
                    "tendencia": r.get("tendencia"),
                    "origem": r.get("origem"),
                }
            )
    return caminho
