import unittest

from services.telemetry_service import calcular_resumo


class TestTelemetryService(unittest.TestCase):
    def test_calcular_resumo(self):
        registros = [
            {
                "sensor_id": "GYN-SIM-001",
                "chuva_mm": 10.0,
                "nivel_m": 1.5,
                "risco": "MODERADO",
                "timestamp": "2026-08-15T20:00:00-03:00",
            },
            {
                "sensor_id": "GYN-SIM-001",
                "chuva_mm": 0.0,
                "nivel_m": 1.0,
                "risco": "BAIXO",
                "timestamp": "2026-08-15T19:59:55-03:00",
            },
        ]

        resumo = calcular_resumo(registros, "teste")
        self.assertEqual(resumo["total"], 2)
        self.assertEqual(resumo["chuva_media_mm"], 5.0)
        self.assertEqual(resumo["nivel_medio_m"], 1.25)
        self.assertEqual(resumo["nivel_maximo_m"], 1.5)
        self.assertEqual(resumo["risco_atual"], "MODERADO")
        self.assertEqual(resumo["riscos"]["BAIXO"], 1)

    def test_resumo_sem_dados(self):
        resumo = calcular_resumo([], "teste")
        self.assertEqual(resumo["total"], 0)
        self.assertEqual(resumo["risco_atual"], "SEM_DADOS")


if __name__ == "__main__":
    unittest.main()
