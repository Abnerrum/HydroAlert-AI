import json
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

from services.esp32_service import consultar_esp32, listar_leituras_esp32


class TestEsp32APIData(unittest.TestCase):
    @staticmethod
    def _escrever(caminho, itens):
        caminho.write_text(
            "\n".join(json.dumps(item, ensure_ascii=False) if isinstance(item, dict) else item
                      for item in itens) + "\n", encoding="utf-8"
        )

    @staticmethod
    def _pacote(data, sensor="ESP32-REAL-001", **alteracoes):
        pacote = {
            "origem": "ESP32_FISICO", "sensor_id": sensor,
            "timestamp": data.isoformat(), "distancia_cm": 25.0,
            "altura_referencia_cm": None, "nivel_m": None,
            "temperatura_c": 24.5, "umidade_pct": 70.0, "chuva_mm": None,
            "status_sensor": "OK",
        }
        pacote.update(alteracoes)
        return pacote

    def test_ausencia_de_hardware_nao_cria_dados(self):
        with tempfile.TemporaryDirectory() as pasta:
            resultado = consultar_esp32(caminho=Path(pasta) / "nao_existe.jsonl")
        self.assertEqual(resultado["status"], "sem_leituras")
        self.assertEqual(resultado["quantidade"], 0)
        self.assertIsNone(resultado["ultima_leitura"])

    def test_descarta_simulados_malformados_e_chuva_falsa(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta) / "esp32_real.jsonl"
            agora = datetime.now(UTC)
            self._escrever(caminho, [
                self._pacote(agora, origem="SIMULACAO_ACADEMICA"),
                "{quebrado",
                self._pacote(agora, chuva_mm=0),
                self._pacote(agora),
            ])
            resposta = consultar_esp32(caminho=caminho, agora=agora)
        self.assertEqual(resposta["quantidade"], 1)
        self.assertEqual(resposta["status"], "recente")
        self.assertFalse(resposta["tem_nivel_calibrado"])
        self.assertIsNone(resposta["ultima_leitura"]["chuva_mm"])

    def test_filtro_e_recencia_e_calibracao(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta) / "esp32_real.jsonl"
            agora = datetime.now(UTC)
            anterior = agora - timedelta(minutes=6)
            self._escrever(caminho, [
                self._pacote(anterior, sensor="ESP32-A", altura_referencia_cm=50, nivel_m=0.25),
                self._pacote(agora, sensor="ESP32-B"),
            ])
            resultado = consultar_esp32(caminho=caminho, sensor_id="ESP32-A", agora=agora)
            self.assertEqual(resultado["status"], "desatualizado")
            self.assertTrue(resultado["tem_nivel_calibrado"])
            self.assertEqual(len(listar_leituras_esp32(caminho=caminho)), 2)


if __name__ == "__main__":
    unittest.main()
