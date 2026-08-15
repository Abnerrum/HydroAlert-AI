import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import paho.mqtt.client as mqtt

from iot.config import MQTT_QOS, MQTT_TOPIC_PREFIX, MQTT_TOPIC_WILDCARD
from iot.mqtt_publisher import publicar_leitura
from iot.mqtt_subscriber import on_connect, on_message, salvar_recebido


class ResultadoPublicacaoFake:
    def __init__(self):
        self.rc = mqtt.MQTT_ERR_SUCCESS
        self.wait_called = False

    def wait_for_publish(self):
        self.wait_called = True


class ClientePublisherFake:
    def __init__(self):
        self.chamadas = []
        self.resultado = ResultadoPublicacaoFake()

    def publish(self, topico, payload, qos, retain):
        self.chamadas.append(
            {
                "topico": topico,
                "payload": payload,
                "qos": qos,
                "retain": retain,
            }
        )
        return self.resultado


class TestMQTT(unittest.TestCase):
    def setUp(self):
        self.leitura = {
            "sensor_id": "GYN-SIM-001",
            "chuva_mm": 8.5,
            "nivel_m": 1.45,
            "risco": "BAIXO",
            "origem": "SIMULACAO_ACADEMICA",
        }

    def test_publicar_leitura_monta_topico_e_payload(self):
        cliente = ClientePublisherFake()
        publicar_leitura(cliente, self.leitura)
        self.assertEqual(len(cliente.chamadas), 1)
        chamada = cliente.chamadas[0]
        self.assertEqual(
            chamada["topico"],
            f"{MQTT_TOPIC_PREFIX}/{self.leitura['sensor_id']}",
        )
        self.assertEqual(json.loads(chamada["payload"]), self.leitura)
        self.assertEqual(chamada["qos"], MQTT_QOS)
        self.assertFalse(chamada["retain"])
        self.assertTrue(cliente.resultado.wait_called)

    def test_on_connect_assina_topico_wildcard(self):
        cliente = MagicMock()
        on_connect(cliente, None, None, 0, None)
        cliente.subscribe.assert_called_once_with(MQTT_TOPIC_WILDCARD, qos=MQTT_QOS)

    def test_salvar_recebido_grava_jsonl(self):
        with tempfile.TemporaryDirectory() as pasta:
            pasta_dados = Path(pasta)
            arquivo = pasta_dados / "mqtt_recebido.jsonl"
            with patch("iot.mqtt_subscriber.PASTA_DADOS", pasta_dados), patch(
                "iot.mqtt_subscriber.ARQUIVO_MQTT_RECEBIDO", arquivo
            ):
                salvar_recebido(self.leitura)

            linhas = arquivo.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(linhas), 1)
            self.assertEqual(json.loads(linhas[0]), self.leitura)

    def test_on_message_processa_json_valido(self):
        mensagem = SimpleNamespace(
            topic=f"{MQTT_TOPIC_PREFIX}/GYN-SIM-001",
            payload=json.dumps(self.leitura).encode("utf-8"),
        )

        with patch("iot.mqtt_subscriber.salvar_recebido") as salvar, patch(
            "iot.mqtt_subscriber.persistir_mongodb",
            return_value="mongo-id",
        ) as persistir:
            on_message(None, None, mensagem)

        salvar.assert_called_once_with(self.leitura)
        persistir.assert_called_once_with(self.leitura)

    def test_on_message_ignora_payload_invalido(self):
        mensagem = SimpleNamespace(
            topic=f"{MQTT_TOPIC_PREFIX}/GYN-SIM-001",
            payload=b"nao-e-json",
        )
        with patch("iot.mqtt_subscriber.salvar_recebido") as salvar:
            on_message(None, None, mensagem)
        salvar.assert_not_called()

    def test_on_message_ignora_json_que_nao_seja_objeto(self):
        mensagem = SimpleNamespace(
            topic=f"{MQTT_TOPIC_PREFIX}/GYN-SIM-001",
            payload=b"[1, 2, 3]",
        )
        with patch("iot.mqtt_subscriber.salvar_recebido") as salvar:
            on_message(None, None, mensagem)
        salvar.assert_not_called()


if __name__ == "__main__":
    unittest.main()
