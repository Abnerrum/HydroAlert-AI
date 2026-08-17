import os

os.environ.setdefault("MONGO_TIMEOUT_MS", "200")

import unittest  # noqa: E402
from unittest.mock import patch  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

from api.main import app  # noqa: E402


class TestAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        resposta = self.client.get("/health")
        self.assertEqual(resposta.status_code, 200)
        corpo = resposta.json()
        self.assertEqual(corpo["status"], "ok")
        self.assertIn("mongodb", corpo)
        self.assertGreater(corpo["sensores_configurados"], 0)

    def test_listar_sensores(self):
        resposta = self.client.get("/api/sensores")
        self.assertEqual(resposta.status_code, 200)
        self.assertGreater(len(resposta.json()["sensores"]), 0)

    def test_localidades(self):
        resposta = self.client.get("/api/localidades")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("Goiania", resposta.json()["municipios"])

    def test_painel(self):
        resposta = self.client.get("/api/painel")
        self.assertEqual(resposta.status_code, 200)
        corpo = resposta.json()
        self.assertIn("pontos", corpo)
        self.assertIn("resumo", corpo)

    def test_painel_com_filtro_municipio(self):
        resposta = self.client.get("/api/painel", params={"municipio": "Anapolis"})
        self.assertEqual(resposta.status_code, 200)
        corpo = resposta.json()
        self.assertEqual(corpo["territorio"]["municipios"], ["Anapolis"])

    def test_alertas(self):
        resposta = self.client.get("/api/alertas")
        self.assertEqual(resposta.status_code, 200)
        corpo = resposta.json()
        self.assertIn("alertas", corpo)
        self.assertEqual(corpo["total"], len(corpo["alertas"]))

    def test_alertas_severidade_invalida(self):
        resposta = self.client.get("/api/alertas", params={"severidade": "URGENTE"})
        self.assertEqual(resposta.status_code, 422)

    def test_clima_sensor_desconhecido(self):
        resposta = self.client.get("/api/clima/SENSOR-INEXISTENTE")
        self.assertEqual(resposta.status_code, 404)

    def test_ml_status(self):
        resposta = self.client.get("/api/ml/status")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("treinado", resposta.json())

    def test_ml_prever_sensor_sem_dados(self):
        resposta = self.client.get("/api/ml/prever/SENSOR-INEXISTENTE")
        self.assertEqual(resposta.status_code, 404)

    def test_api_aberta_sem_token_configurado(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("API_TOKEN", None)
            resposta = self.client.get("/api/sensores")
        self.assertEqual(resposta.status_code, 200)

    def test_api_exige_token_quando_configurado(self):
        with patch.dict(os.environ, {"API_TOKEN": "segredo-teste"}):
            sem_token = self.client.get("/api/sensores")
            com_token_errado = self.client.get(
                "/api/sensores", headers={"X-API-Key": "errado"}
            )
            com_token = self.client.get(
                "/api/sensores", headers={"X-API-Key": "segredo-teste"}
            )
        self.assertEqual(sem_token.status_code, 401)
        self.assertEqual(com_token_errado.status_code, 401)
        self.assertEqual(com_token.status_code, 200)

    def test_health_livre_mesmo_com_token(self):
        with patch.dict(os.environ, {"API_TOKEN": "segredo-teste"}):
            resposta = self.client.get("/health")
        self.assertEqual(resposta.status_code, 200)


if __name__ == "__main__":
    unittest.main()
