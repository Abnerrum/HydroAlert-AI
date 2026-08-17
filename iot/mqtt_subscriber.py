import argparse
import json

import paho.mqtt.client as mqtt
from pydantic import ValidationError
from pymongo.errors import PyMongoError

from database.mongodb import preparar_banco, salvar_telemetria
from logging_config import configurar_logging

from .config import (
    ARQUIVO_MQTT_RECEBIDO,
    MQTT_BROKER,
    MQTT_KEEPALIVE,
    MQTT_PORT,
    MQTT_QOS,
    MQTT_TOPIC_WILDCARD,
    PASTA_DADOS,
    aplicar_credenciais_mqtt,
)
from .schemas import validar_leitura

logger = configurar_logging("hydroalert.mqtt_subscriber")


def salvar_recebido(dados: dict) -> None:
    """Persiste localmente cada mensagem MQTT recebida em formato JSONL."""
    PASTA_DADOS.mkdir(parents=True, exist_ok=True)
    with ARQUIVO_MQTT_RECEBIDO.open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps(dados, ensure_ascii=False) + "\n")


def persistir_mongodb(dados: dict) -> str | None:
    """Salva a telemetria no MongoDB sem interromper o MQTT se o banco cair."""
    try:
        return salvar_telemetria(dados)
    except PyMongoError as erro:
        logger.warning(
            "MongoDB indisponivel; leitura mantida apenas no JSONL. Detalhe: %s",
            erro,
        )
        return None


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        logger.info("Conectado ao broker. Assinando: %s", MQTT_TOPIC_WILDCARD)
        client.subscribe(MQTT_TOPIC_WILDCARD, qos=MQTT_QOS)
    else:
        logger.error("Falha na conexao MQTT. reason_code=%s", reason_code)


def on_message(client, userdata, msg):
    try:
        dados = json.loads(msg.payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.warning("Mensagem invalida recebida em %s: %r", msg.topic, msg.payload)
        return

    if not isinstance(dados, dict):
        logger.warning(
            "Mensagem ignorada em %s: payload JSON nao e um objeto.", msg.topic
        )
        return

    try:
        validar_leitura(dados)
    except ValidationError as erro:
        logger.warning(
            "Telemetria fora do schema em %s e foi descartada. Erros: %s",
            msg.topic,
            erro.error_count(),
        )
        return

    salvar_recebido(dados)
    mongo_id = persistir_mongodb(dados)
    banco = "MongoDB" if mongo_id else "JSONL"

    logger.info(
        "RECEBIDO | %s | Sensor: %s | Chuva: %s mm | Nivel: %s m | Risco: %s | Persistencia: %s",
        msg.topic,
        dados.get("sensor_id"),
        dados.get("chuva_mm"),
        dados.get("nivel_m"),
        dados.get("risco"),
        banco,
    )


def criar_cliente() -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="hydroalert-subscriber",
        protocol=mqtt.MQTTv311,
    )
    aplicar_credenciais_mqtt(client)
    client.on_connect = on_connect
    client.on_message = on_message
    return client


def executar(broker: str, porta: int) -> None:
    client = criar_cliente()

    try:
        try:
            preparar_banco()
            logger.info("MongoDB conectado. Telemetria sera persistida no banco NoSQL.")
        except PyMongoError as erro:
            logger.warning(
                "MongoDB indisponivel. O subscriber continuara usando JSONL como fallback."
            )
            logger.warning("Detalhe MongoDB: %s", erro)

        logger.info("Conectando ao broker MQTT em %s:%s...", broker, porta)
        client.connect(broker, porta, MQTT_KEEPALIVE)
        logger.info("Aguardando telemetria. Use Ctrl+C para encerrar.")
        client.loop_forever()
    except (ConnectionRefusedError, OSError) as erro:
        logger.error("Nao foi possivel conectar ao broker MQTT. Detalhe: %s", erro)
        logger.error(
            "Confirme se o Eclipse Mosquitto esta instalado e em execucao em %s:%s.",
            broker,
            porta,
        )
    except KeyboardInterrupt:
        logger.info("Subscriber encerrado pelo usuario.")
    finally:
        try:
            client.disconnect()
        except Exception:  # noqa: BLE001 - desconexao e melhor esforco
            pass


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Subscriber MQTT + MongoDB da telemetria do HydroAlert AI"
    )
    parser.add_argument(
        "--broker",
        default=MQTT_BROKER,
        help=f"Endereco do broker MQTT (padrao: {MQTT_BROKER}).",
    )
    parser.add_argument(
        "--porta",
        type=int,
        default=MQTT_PORT,
        help=f"Porta do broker MQTT (padrao: {MQTT_PORT}).",
    )
    args = parser.parse_args()

    if not 1 <= args.porta <= 65535:
        parser.error("--porta deve estar entre 1 e 65535")

    executar(args.broker, args.porta)


if __name__ == "__main__":
    main()
