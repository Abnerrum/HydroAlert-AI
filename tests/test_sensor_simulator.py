import unittest

from iot.config import SENSORES
from iot.sensor_simulator import classificar_risco, gerar_leitura


class TestSensorSimulator(unittest.TestCase):
    def setUp(self):
        self.sensor = SENSORES[0]

    def test_classificacao_baixo(self):
        self.assertEqual(classificar_risco(1.0, self.sensor), "BAIXO")

    def test_classificacao_moderado(self):
        self.assertEqual(
            classificar_risco(self.sensor["cota_atencao_m"], self.sensor),
            "MODERADO",
        )

    def test_classificacao_alto(self):
        self.assertEqual(
            classificar_risco(self.sensor["cota_alerta_m"], self.sensor),
            "ALTO",
        )

    def test_classificacao_critico(self):
        self.assertEqual(
            classificar_risco(self.sensor["cota_critica_m"], self.sensor),
            "CRITICO",
        )

    def test_gerar_leitura(self):
        niveis = {sensor["sensor_id"]: 1.0 for sensor in SENSORES}
        leitura = gerar_leitura(self.sensor, niveis)

        self.assertEqual(leitura["sensor_id"], self.sensor["sensor_id"])
        self.assertIn("chuva_mm", leitura)
        self.assertIn("nivel_m", leitura)
        self.assertIn("risco", leitura)
        self.assertEqual(leitura["origem"], "SIMULACAO_ACADEMICA")


if __name__ == "__main__":
    unittest.main()
