import unittest
from unittest.mock import patch

from services.alerts_service import _avaliar_sensor, avaliar_alertas

SENSOR = {
    "sensor_id": "GYN-SIM-001",
    "nome": "Ponto Simulado 01 - Centro",
    "estado": "Goias",
    "uf": "GO",
    "municipio": "Goiania",
    "regiao": "Central",
    "bairro": "Setor Central",
    "latitude": -16.6869,
    "longitude": -49.2648,
    "cota_atencao_m": 1.80,
    "cota_alerta_m": 2.40,
    "cota_critica_m": 3.00,
}


def leitura(nivel, variacao=0.01, risco="BAIXO"):
    return {
        "sensor_id": "GYN-SIM-001",
        "nivel_m": nivel,
        "variacao_nivel_m": variacao,
        "risco": risco,
        "cota_alerta_m": 2.40,
        "cota_critica_m": 3.00,
        "timestamp": "2026-08-15T20:00:00-03:00",
    }


class TestAlertsService(unittest.TestCase):
    def test_sem_alerta_quando_baixo(self):
        alerta = _avaliar_sensor(SENSOR, [leitura(1.0)])
        self.assertIsNone(alerta)

    def test_alerta_critico_acima_da_cota(self):
        alerta = _avaliar_sensor(SENSOR, [leitura(3.10, risco="CRITICO")])
        self.assertEqual(alerta["severidade"], "CRITICA")

    def test_alerta_alto_consecutivas_acima_da_cota(self):
        leituras = [leitura(2.45, risco="ALTO"), leitura(2.50, risco="ALTO")]
        alerta = _avaliar_sensor(SENSOR, leituras)
        self.assertEqual(alerta["severidade"], "ALTA")

    def test_alerta_medio_tendencia_subida(self):
        leituras = [leitura(1.0, 0.02), leitura(1.02, 0.02), leitura(1.04, 0.02)]
        alerta = _avaliar_sensor(SENSOR, leituras)
        self.assertEqual(alerta["severidade"], "MEDIA")

    def test_avaliar_alertas_agrega_e_filtra(self):
        registros = [leitura(3.10, risco="CRITICO")]
        with patch(
            "services.alerts_service.obter_telemetria",
            return_value=(registros, "teste"),
        ):
            resultado = avaliar_alertas()
            filtrado = avaliar_alertas(municipio="Anapolis")

        self.assertEqual(resultado["total"], 1)
        self.assertEqual(resultado["alertas"][0]["municipio"], "Goiania")
        self.assertEqual(filtrado["total"], 0)


if __name__ == "__main__":
    unittest.main()
