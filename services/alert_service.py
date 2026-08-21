from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

ARQUIVO = Path(__file__).resolve().parents[1] / "data" / "revisoes.json"
ORDEM = {"BAIXO": 0, "MODERADO": 1, "ALTO": 2, "CRITICO": 3, "SEM_DADOS": -1}
NIVEL_OPERACIONAL = {
    "BAIXO": "NORMAL",
    "MODERADO": "ATENCAO",
    "ALTO": "ALERTA",
    "CRITICO": "EMERGENCIA",
    "SEM_DADOS": "SEM_DADOS",
}


def _ler() -> list[dict]:
    if not ARQUIVO.exists():
        return []
    try:
        return json.loads(ARQUIVO.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _ultima_revisao(alerta_id: str) -> dict | None:
    for revisao in reversed(_ler()):
        if revisao.get("alerta_id") == alerta_id:
            return revisao
    return None


def _risco_pico_preditivo(ponto: dict) -> tuple[str, int | None]:
    previsoes = ponto.get("previsoes") or []
    if isinstance(previsoes, dict):
        previsoes = previsoes.get("previsoes") or []
    if not previsoes:
        return "SEM_DADOS", None

    pico = max(
        previsoes,
        key=lambda p: ORDEM.get(str(p.get("risco_previsto", "SEM_DADOS")), -1),
    )
    risco = str(pico.get("risco_previsto", "SEM_DADOS"))
    lead_time = next(
        (
            int(p.get("horizonte_h"))
            for p in sorted(previsoes, key=lambda x: int(x.get("horizonte_h", 999)))
            if ORDEM.get(str(p.get("risco_previsto", "SEM_DADOS")), -1) >= ORDEM["ALTO"]
        ),
        None,
    )
    return risco, lead_time


def gerar_alertas(pontos: list[dict], minimo: str = "MODERADO") -> list[dict]:
    alertas = []
    for ponto in pontos:
        risco_atual = str(ponto.get("risco", "BAIXO"))
        risco_previsto, lead_time = _risco_pico_preditivo(ponto)
        severidade = max(
            (risco_atual, risco_previsto),
            key=lambda risco: ORDEM.get(risco, -1),
        )

        if ORDEM.get(severidade, 0) < ORDEM.get(minimo, 1):
            continue

        tipo = "PREDITIVO" if ORDEM.get(risco_previsto, -1) > ORDEM.get(risco_atual, -1) else "ATUAL"
        timestamp = ponto.get("timestamp") or "sem-data"
        alerta_id = f"{ponto['sensor_id']}:{timestamp}:{severidade}:{tipo}"
        requer_revisao = severidade == "CRITICO"
        revisao = _ultima_revisao(alerta_id)

        status_revisao = "AUTOMATICO"
        if requer_revisao:
            status_revisao = revisao.get("decisao") if revisao else "PENDENTE"

        alertas.append(
            {
                "id": alerta_id,
                "sensor_id": ponto["sensor_id"],
                "severidade": severidade,
                "nivel_operacional": NIVEL_OPERACIONAL.get(severidade, severidade),
                "tipo": tipo,
                "risco_atual": risco_atual,
                "risco_previsto": risco_previsto,
                "lead_time_h": lead_time,
                "municipio": ponto["municipio"],
                "bairro": ponto["bairro"],
                "nivel_m": ponto.get("nivel_m"),
                "chuva_acum_1h_mm": ponto.get("chuva_acum_1h_mm"),
                "chuva_acum_3h_mm": ponto.get("chuva_acum_3h_mm"),
                "status_revisao": status_revisao,
                "requer_revisao_humana": requer_revisao,
                "ultima_revisao": revisao,
            }
        )

    return sorted(
        alertas,
        key=lambda a: (ORDEM.get(a["severidade"], 0), -(a.get("lead_time_h") or 999)),
        reverse=True,
    )


def registrar_revisao(alerta_id: str, decisao: str, revisor: str, justificativa: str) -> dict:
    if decisao not in {"APROVADO", "REJEITADO"}:
        raise ValueError("Decisão deve ser APROVADO ou REJEITADO.")
    registro = {
        "revisao_id": str(uuid4()),
        "alerta_id": alerta_id,
        "decisao": decisao,
        "revisor": revisor.strip(),
        "justificativa": justificativa.strip(),
        "revisado_em": datetime.now(timezone.utc).isoformat(),
    }
    historico = _ler()
    historico.append(registro)
    ARQUIVO.parent.mkdir(parents=True, exist_ok=True)
    ARQUIVO.write_text(json.dumps(historico, ensure_ascii=False, indent=2), encoding="utf-8")
    return registro


def listar_revisoes() -> list[dict]:
    return list(reversed(_ler()))
