import argparse
import json

import paho.mqtt.client as mqtt

from .config import (
    ARQUIVO_MQTT_RECEBIDO,
    MQTT_BROKER,
    MQTT_KEEPALIVE,
    MQTT_PORT,
    MQTT_QOS,
    MQTT_TOPIC_WILDCARD,
    PASTA_DADOS,
)


def salvar_recebido(dados: dict) -> None:
    """Persiste localmente cada mensagem MQTT recebida em formato JSONL."""
    PASTA_DADOS.mkdir(parents=True, exist_ok=True)
    with ARQUIVO_MQTT_RECEBIDO.open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps(dados, ensure_ascii=False) + "\n")


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"Conectado ao broker. Assinando: {MQTT_TOPIC_WILDCARD}")
        client.subscribe(MQTT_TOPIC_WILDCARD, qos=MQTT_QOS)
    else:
        print(f"Falha na conexao MQTT. reason_code={reason_code}")


def on_message(client, userdata, msg):
    try:
        dados = json.loads(msg.payload.decode("utf-8"))

        if not isinstance(dados, dict):
            print(f"Mensagem ignorada em {msg.topic}: payload JSON nao e um objeto.")
            return

        salvar_recebido(dados)

        print(
            f"RECEBIDO | {msg.topic} | "
            f"Sensor: {dados.get('sensor_id')} | "
            f"Chuva: {dados.get('chuva_mm')} mm | "
            f"Nivel: {dados.get('nivel_m')} m | "
            f"Risco: {dados.get('risco')}"
        )
    except (json.JSONDecodeError, UnicodeDecodeError):
        print(f"Mensagem invalida recebida em {msg.topic}: {msg.payload!r}")


def criar_cliente() -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="hydroalert-subscriber",
        protocol=mqtt.MQTTv311,
    )
    client.on_connect = on_connect
    client.on_message = on_message
    return client


def executar(broker: str, porta: int) -> None:
    client = criar_cliente()

    try:
        print(f"Conectando ao broker MQTT em {broker}:{porta}...")
        client.connect(broker, porta, MQTT_KEEPALIVE)
        print("Aguardando telemetria. Use Ctrl+C para encerrar.\n")
        client.loop_forever()
    except (ConnectionRefusedError, OSError) as erro:
        print("\nERRO: nao foi possivel conectar ao broker MQTT.")
        print(f"Detalhe: {erro}")
        print(
            "Confirme se o Eclipse Mosquitto esta instalado e em execucao "
            f"em {broker}:{porta}."
        )
    except KeyboardInterrupt:
        print("\nSubscriber encerrado pelo usuario.")
    finally:
        try:
            client.disconnect()
        except Exception:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Subscriber MQTT da telemetria do HydroAlert AI"
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
