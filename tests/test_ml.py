import unittest

from ml.features import FEATURES, TARGET, construir_dataset, vetorizar_leitura


class TestML(unittest.TestCase):
    def setUp(self):
        base = {
            "sensor_id": "GYN-SIM-001",
            "chuva_mm": 5.0,
            "nivel_m": 1.0,
            "variacao_nivel_m": 0.02,
            "cota_atencao_m": 1.8,
            "cota_alerta_m": 2.4,
            "cota_critica_m": 3.0,
        }
        self.registros = []
        for indice, nivel in enumerate([1.0, 1.1, 1.15]):
            item = dict(base)
            item["timestamp"] = f"2026-08-15T20:00:0{indice}-03:00"
            item["nivel_m"] = nivel
            self.registros.append(item)

    def test_construir_dataset_cria_alvo_proximo_nivel(self):
        dataset = construir_dataset(self.registros)
        self.assertEqual(len(dataset), 2)
        self.assertIn(TARGET, dataset.columns)
        self.assertAlmostEqual(dataset.iloc[0][TARGET], 1.1)
        self.assertAlmostEqual(dataset.iloc[1][TARGET], 1.15)

    def test_vetorizar_leitura_respeita_features(self):
        vetor = vetorizar_leitura(self.registros[0])
        self.assertEqual(len(vetor), len(FEATURES))
        self.assertEqual(vetor[0], 5.0)


if __name__ == "__main__":
    unittest.main()
