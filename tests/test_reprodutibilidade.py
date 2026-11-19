import json
import tempfile
import unittest
from pathlib import Path

from scripts.reproduzir_experimento import NUM_CICLOS, NUM_SENSORES, validar_telemetria


class TestReprodutibilidade(unittest.TestCase):
    def test_valida_12_sensores_e_120_ciclos(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta) / "telemetria.jsonl"
            with caminho.open("w", encoding="utf-8") as arquivo:
                for ciclo in range(1, NUM_CICLOS + 1):
                    for sensor in range(NUM_SENSORES):
                        arquivo.write(json.dumps({
                            "sensor_id": f"sensor-{sensor}", "simulacao": {"ciclo": ciclo}
                        }) + "\n")
            self.assertEqual(validar_telemetria(caminho), {
                "registros": 1440, "sensores": 12, "ciclos": 120
            })

    def test_rejeita_serie_incompleta(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta) / "telemetria.jsonl"
            caminho.write_text(json.dumps({
                "sensor_id": "sensor-1", "simulacao": {"ciclo": 1}
            }) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "12 sensores"):
                validar_telemetria(caminho)


if __name__ == "__main__":
    unittest.main()
