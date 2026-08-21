import unittest
from datetime import datetime, timedelta, timezone

from ml.features import construir_dataset
from services.alert_service import gerar_alertas
from services.data_quality_service import avaliar_qualidade
from services.indicator_service import enriquecer_indicadores


class TestIndicatorsQuality(unittest.TestCase):
    def _registro(self, indice: int, chuva: float = 2.0, nivel: float = 1.2):
        inicio = datetime(2026, 8, 20, 10, 0, tzinfo=timezone(timedelta(hours=-3)))
        return {
            "sensor_id": "T-1",
            "timestamp": (inicio + timedelta(minutes=15 * indice)).isoformat(),
            "chuva_mm": chuva,
            "nivel_m": nivel + indice * 0.02,
            "variacao_nivel_m": 0.02,
            "cota_atencao_m": 1.8,
            "cota_alerta_m": 2.4,
            "cota_critica_m": 3.0,
            "risco": "BAIXO",
            "simulacao": {"ciclo": indice + 1, "passo_hidrologico_min": 15},
        }

    def test_acumulados_hidrometeorologicos(self):
        registros = [self._registro(i) for i in range(5)]
        enriquecidos = enriquecer_indicadores(registros)
        ultimo = enriquecidos[-1]
        self.assertEqual(ultimo["chuva_acum_1h_mm"], 8.0)
        self.assertEqual(ultimo["intensidade_chuva_mm_h"], 8.0)
        self.assertIn("distancia_alerta_m", ultimo)

    def test_dataset_respeita_passo_de_15_minutos(self):
        registros = [self._registro(i) for i in range(8)]
        dataset = construir_dataset(registros, horizonte_h=1)
        self.assertEqual(len(dataset), 4)
        self.assertEqual(int(dataset.iloc[0]["passos_horizonte"]), 4)

    def test_score_qualidade(self):
        registros = [self._registro(i) for i in range(4)]
        resultado = avaliar_qualidade(registros)
        self.assertEqual(resultado["score_percentual"], 100.0)
        self.assertEqual(resultado["status"], "EXCELENTE")

    def test_alerta_preditivo_critico_exige_revisao(self):
        ponto = {
            "sensor_id": "T-1",
            "municipio": "Goiania",
            "bairro": "Centro",
            "nivel_m": 1.2,
            "risco": "BAIXO",
            "timestamp": "2026-08-20T10:00:00-03:00",
            "previsoes": [
                {"horizonte_h": 1, "risco_previsto": "MODERADO"},
                {"horizonte_h": 3, "risco_previsto": "CRITICO"},
            ],
        }
        alerta = gerar_alertas([ponto])[0]
        self.assertEqual(alerta["tipo"], "PREDITIVO")
        self.assertEqual(alerta["severidade"], "CRITICO")
        self.assertTrue(alerta["requer_revisao_humana"])
        self.assertEqual(alerta["lead_time_h"], 3)


if __name__ == "__main__":
    unittest.main()
