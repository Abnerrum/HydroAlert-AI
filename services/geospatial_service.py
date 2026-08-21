from __future__ import annotations

import math


def _anel(lat: float, lon: float, raio_km: float, vertices: int = 24) -> list[list[float]]:
    pontos = []
    for i in range(vertices + 1):
        angulo = 2 * math.pi * i / vertices
        dlat = raio_km / 111.0 * math.sin(angulo)
        dlon = raio_km / (111.0 * max(0.2, math.cos(math.radians(lat)))) * math.cos(angulo)
        pontos.append([round(lon + dlon, 6), round(lat + dlat, 6)])
    return pontos


def gerar_camadas(pontos: list[dict]) -> dict:
    """GeoJSON acadêmico: áreas aproximadas, nunca limites/cartografia oficial."""
    calor, inundacao, bairros = [], [], []
    area_total_estimada = 0.0

    for ponto in pontos:
        lat, lon = float(ponto["latitude"]), float(ponto["longitude"])
        nivel = float(ponto.get("nivel_m") or 0)
        critica = float(ponto.get("cota_critica_m") or 3)
        intensidade_atual = min(1.0, max(0.0, nivel / critica))

        risco_previsto = str(ponto.get("risco_pico_previsto") or "SEM_DADOS")
        fator_previsto = {"MODERADO": 0.55, "ALTO": 0.75, "CRITICO": 1.0}.get(risco_previsto, 0.0)
        intensidade = max(intensidade_atual, fator_previsto)

        base = {
            "sensor_id": ponto["sensor_id"],
            "municipio": ponto["municipio"],
            "bairro": ponto["bairro"],
            "risco": ponto.get("risco", "SEM_DADOS"),
            "risco_previsto": risco_previsto,
            "lead_time_h": ponto.get("lead_time_estimado_h"),
        }
        calor.append(
            {
                "type": "Feature",
                "properties": {**base, "intensidade": round(intensidade, 3)},
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            }
        )

        if intensidade >= 0.55:
            raio_km = 0.25 + intensidade * 0.90
            area_km2 = math.pi * raio_km**2
            area_total_estimada += area_km2
            inundacao.append(
                {
                    "type": "Feature",
                    "properties": {
                        **base,
                        "simulado": True,
                        "raio_estimado_km": round(raio_km, 3),
                        "area_exposta_km2_estimada": round(area_km2, 3),
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [_anel(lat, lon, raio_km)],
                    },
                }
            )

        bairros.append(
            {
                "type": "Feature",
                "properties": {**base, "tipo": "bairro_aproximado"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [_anel(lat, lon, 1.25)],
                },
            }
        )

    return {
        "aviso": "Polígonos e manchas aproximados para demonstração acadêmica; não são cartografia oficial.",
        "resumo": {
            "manchas_simuladas": len(inundacao),
            "area_exposta_km2_estimada": round(area_total_estimada, 3),
        },
        "calor": {"type": "FeatureCollection", "features": calor},
        "inundacao": {"type": "FeatureCollection", "features": inundacao},
        "bairros": {"type": "FeatureCollection", "features": bairros},
    }
