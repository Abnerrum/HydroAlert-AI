import unittest

from pydantic import ValidationError

from iot.schemas import validar_leitura


class TestSchemas(unittest.TestCase):
    def test_leitura_minima_valida(self):
        leitura = validar_leitura(
            {"sensor_id": "GYN-SIM-001", "chuva_mm": 8.5, "nivel_m": 1.45}
        )
        self.assertEqual(leitura.sensor_id, "GYN-SIM-001")
        self.assertIsNone(leitura.risco)

    def test_leitura_completa_valida(self):
        leitura = validar_leitura(
            {
                "sensor_id": "GYN-SIM-001",
                "chuva_mm": 12.0,
                "nivel_m": 2.5,
                "risco": "ALTO",
                "localizacao": {"latitude": -16.68, "longitude": -49.26},
                "campo_extra": "preservado",
            }
        )
        self.assertEqual(leitura.localizacao.latitude, -16.68)

    def test_rejeita_sem_sensor_id(self):
        with self.assertRaises(ValidationError):
            validar_leitura({"chuva_mm": 1.0, "nivel_m": 1.0})

    def test_rejeita_chuva_negativa(self):
        with self.assertRaises(ValidationError):
            validar_leitura(
                {"sensor_id": "GYN-SIM-001", "chuva_mm": -1.0, "nivel_m": 1.0}
            )

    def test_rejeita_tipo_invalido(self):
        with self.assertRaises(ValidationError):
            validar_leitura(
                {"sensor_id": "GYN-SIM-001", "chuva_mm": "muita", "nivel_m": 1.0}
            )


if __name__ == "__main__":
    unittest.main()
