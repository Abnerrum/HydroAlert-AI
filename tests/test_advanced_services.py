import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from services.alert_service import gerar_alertas, registrar_revisao
from services.backtesting_service import executar_backtesting, exportar_power_bi
from services.geospatial_service import gerar_camadas


class TestAdvancedServices(unittest.TestCase):
    def setUp(self):
        self.ponto = {"sensor_id": "T-1", "municipio": "Goiania", "bairro": "Centro",
                      "latitude": -16.68, "longitude": -49.26, "nivel_m": 3.1,
                      "cota_critica_m": 3, "risco": "CRITICO", "timestamp": "2026-08-17T10:00:00-03:00"}

    def test_camadas_sao_geojson(self):
        camadas = gerar_camadas([self.ponto])
        self.assertEqual(camadas["calor"]["type"], "FeatureCollection")
        self.assertEqual(len(camadas["inundacao"]["features"]), 1)
        self.assertEqual(camadas["bairros"]["features"][0]["geometry"]["type"], "Polygon")

    def test_critico_exige_revisao(self):
        alerta = gerar_alertas([self.ponto])[0]
        self.assertTrue(alerta["requer_revisao_humana"])
        self.assertEqual(alerta["status_revisao"], "PENDENTE")

    def test_revisao_invalida(self):
        with self.assertRaises(ValueError):
            registrar_revisao("x:1", "TALVEZ", "Teste", "Justificativa")

    def test_backtesting_tres_horizontes(self):
        registros = []
        for i in range(10):
            registros.append({"sensor_id": "T-1", "timestamp": f"2026-08-17T{i:02}:00:00-03:00",
                              "chuva_mm": i, "nivel_m": 1 + i / 10, "variacao_nivel_m": .1,
                              "cota_atencao_m": 1.8, "cota_alerta_m": 2.4, "cota_critica_m": 3})
        resultado = executar_backtesting(registros)
        self.assertEqual([r["horizonte_h"] for r in resultado["resultados"]], [1, 3, 6])

    def test_exportacao_power_bi(self):
        registro = {**self.ponto, "localizacao": {"municipio": "Goiania", "bairro": "Centro"},
                    "chuva_mm": 5, "tendencia": "SUBINDO"}
        with tempfile.TemporaryDirectory() as pasta:
            with patch("services.backtesting_service.EXPORT_DIR", Path(pasta)):
                caminho = exportar_power_bi([registro])
                self.assertIn("sensor_id", caminho.read_text(encoding="utf-8-sig"))


if __name__ == "__main__":
    unittest.main()
