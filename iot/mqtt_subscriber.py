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
        salvar_recebido(dados)

        print(
            f"RECEBIDO | {msg.topic} | "
            f"Sensor: {dados.get('sensor_id')} | "
            f"Chuva: {dados.get('chuva_mm')} mm | "
            f"Nivel: {dados.get('nivel_m')} m | "
            f"Risco: {dados.get('risco')}"
        )
    except json.JSONDecodeError:
        print(f"Mensagem invalida recebida em {msg.topic}: {msg.payload!r}")


def main() -> None:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="hydroalert-subscriber",
        protocol=mqtt.MQTTv311,
    )
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        print(f"Conectando ao broker MQTT em {MQTT_BROKER}:{MQTT_PORT}...")
        client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
        print("Aguardando telemetria. Use Ctrl+C para encerrar.\n")
        client.loop_forever()
    except (ConnectionRefusedError, OSError) as erro:
        print("\nERRO: nao foi possivel conectar ao broker MQTT.")
        print(f"Detalhe: {erro}")
        print("Confirme se o Eclipse Mosquitto esta instalado e em execucao na porta 1883.")
    except KeyboardInterrupt:
        print("\nSubscriber encerrado pelo usuario.")
    finally:
        try:
            client.disconnect()
        except Exception:
            pass


if __name__ == "__main__":
    main()
