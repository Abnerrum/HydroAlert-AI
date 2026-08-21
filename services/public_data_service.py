from __future__ import annotations

import json
from urllib.parse import urlencode
from urllib.request import urlopen


def consultar_open_meteo(latitude: float, longitude: float, timeout: int = 8) -> dict:
    params = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": "precipitation,rain",
            "hourly": "precipitation_probability,precipitation",
            "forecast_hours": 6,
            "timezone": "America/Sao_Paulo",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    with urlopen(url, timeout=timeout) as resposta:  # nosec - URL fixa, apenas parâmetros numéricos
        dados = json.load(resposta)
    return {
        "fonte": "Open-Meteo",
        "licenca": "CC BY 4.0",
        "url_consultada": url,
        "coordenadas": {"latitude": latitude, "longitude": longitude},
        "atual": dados.get("current", {}),
        "horario": dados.get("hourly", {}),
    }


def catalogo_fontes() -> list[dict]:
    """Catálogo de fontes previstas na documentação do Projeto Integrador."""
    return [
        {
            "nome": "Open-Meteo",
            "uso": "previsão horária complementar no protótipo",
            "integracao": "ATIVA",
            "tipo": "API",
        },
        {
            "nome": "CEMADEN",
            "uso": "pluviometria, monitoramento e apoio à pesquisa de eventos",
            "integracao": "PLANEJADA",
            "tipo": "FONTE_PUBLICA",
        },
        {
            "nome": "ANA / Hidroweb",
            "uso": "séries históricas hidrológicas e níveis/vazões",
            "integracao": "PLANEJADA",
            "tipo": "FONTE_PUBLICA",
        },
        {
            "nome": "INMET",
            "uso": "estações meteorológicas, precipitação e variáveis atmosféricas",
            "integracao": "PLANEJADA",
            "tipo": "FONTE_PUBLICA",
        },
        {
            "nome": "CIMEHGO / SEMAD Goiás",
            "uso": "monitoramento e contexto hidrometeorológico regional de Goiás",
            "integracao": "PLANEJADA",
            "tipo": "FONTE_PUBLICA",
        },
    ]
