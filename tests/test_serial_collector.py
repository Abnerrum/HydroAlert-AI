import json
import tempfile
import unittest
from pathlib import Path

from iot.serial_collector import salvar, validar_pacote


class TestColetorFisico(unittest.TestCase):
    def pacote(self, **alteracoes):
        dados = dict(sensor_id="ESP32-REAL-001", origem="ESP32_FISICO",
                     distancia_cm=20, altura_referencia_cm=50,
                     temperatura_c=25, umidade_pct=60, uptime_ms=5000)
        dados.update(alteracoes)
        return json.dumps(dados)

    def test_calibra_nivel_sem_inventar_chuva(self):
        dados = validar_pacote(self.pacote())
        self.assertEqual(dados["nivel_m"], 0.3)
        self.assertIsNone(dados["chuva_mm"])
        self.assertTrue(dados["timestamp"].endswith("+00:00"))

    def test_sem_calibracao_ou_sem_eco_nao_gera_nivel(self):
        for alteracoes in ({"altura_referencia_cm": None}, {"distancia_cm": None},
                           {"distancia_cm": 60}):
            with self.subTest(alteracoes=alteracoes):
                dados = validar_pacote(self.pacote(**alteracoes))
                self.assertIsNone(dados["nivel_m"])

    def test_rejeita_medicoes_invalidas(self):
        for alteracoes in ({"distancia_cm": -1}, {"umidade_pct": 101},
                           {"temperatura_c": float("nan")}, {"chuva_mm": 0},
                           {"distancia_cm": True}, {"origem": "SIMULACAO_ACADEMICA"}):
            with self.subTest(alteracoes=alteracoes), self.assertRaises(ValueError):
                validar_pacote(self.pacote(**alteracoes))

    def test_falha_dht_preserva_distancia(self):
        dados = validar_pacote(self.pacote(temperatura_c=None, umidade_pct=None))
        self.assertEqual(dados["status_sensor"], "PARCIAL")
        self.assertEqual(dados["distancia_cm"], 20)

    def test_salva_dois_registros_e_um_cabecalho(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta)
            dados = validar_pacote(self.pacote())
            salvar(dados, caminho)
            salvar(dados, caminho)
            self.assertEqual(len((caminho / "esp32_real.csv").read_text().splitlines()), 3)
            linhas = (caminho / "esp32_real.jsonl").read_text().splitlines()
            self.assertEqual(len(linhas), 2)
            self.assertEqual(json.loads(linhas[0]), dados)
