import argparse
import json
import random
import time

import paho.mqtt.client as mqtt

from .config import (
    INTERVALO_PADRAO_SEGUNDOS,
    MQTT_BROKER,
    MQTT_KEEPALIVE,
    MQTT_PORT,
    MQTT_QOS,
    MQTT_TOPIC_PREFIX,
    SENSORES,
)
from .sensor_simulator import gerar_leitura, salvar_leitura


def criar_cliente() -> mqtt.Client:
    return mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="hydroalert-simulador-publisher",
        protocol=mqtt.MQTTv311,
    )


def publicar_leitura(client: mqtt.Client, leitura: dict) -> None:
    topico = f"{MQTT_TOPIC_PREFIX}/{leitura['sensor_id']}"
    payload = json.dumps(leitura, ensure_ascii=False)

    resultado = client.publish(topico, payload, qos=MQTT_QOS, retain=False)
    resultado.wait_for_publish()

    if resultado.rc != mqtt.MQTT_ERR_SUCCESS:
        raise RuntimeError(f"Falha ao publicar no MQTT. Codigo: {resultado.rc}")

    print(
        f"PUBLICADO | {topico} | "
        f"Chuva: {leitura['chuva_mm']:>5.2f} mm | "
        f"Nivel: {leitura['nivel_m']:>5.3f} m | "
        f"Risco: {leitura['risco']}"
    )


def executar(intervalo: float, ciclos: int | None, broker: str, porta: int) -> None:
    client = criar_cliente()

    try:
        print(f"Conectando ao broker MQTT em {broker}:{porta}...")
        client.connect(broker, porta, MQTT_KEEPALIVE)
        client.loop_start()
        print("Conectado ao Mosquitto. Iniciando publicacao da telemetria.\n")

        niveis = {
            sensor["sensor_id"]: round(random.uniform(0.70, 1.30), 3)
            for sensor in SENSORES
        }

        ciclo_atual = 0

        while ciclos is None or ciclo_atual < ciclos:
            ciclo_atual += 1
            print(f"Ciclo MQTT {ciclo_atual}")

            for sensor in SENSORES:
                leitura = gerar_leitura(sensor, niveis)
                salvar_leitura(leitura)
                publicar_leitura(client, leitura)

            if ciclos is None or ciclo_atual < ciclos:
                time.sleep(intervalo)

    except (ConnectionRefusedError, OSError) as erro:
        print("\nERRO: nao foi possivel conectar ao broker MQTT.")
        print(f"Detalhe: {erro}")
        print("Confirme se o Eclipse Mosquitto esta instalado e em execucao na porta 1883.")
    except KeyboardInterrupt:
        print("\nPublicacao encerrada pelo usuario.")
    finally:
        try:
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Publisher MQTT dos sensores simulados do HydroAlert AI"
    )
    parser.add_argument("--broker", default=MQTT_BROKER)
    parser.add_argument("--porta", type=int, default=MQTT_PORT)
    parser.add_argument(
        "--intervalo",
        type=float,
        default=INTERVALO_PADRAO_SEGUNDOS,
    )
    parser.add_argument(
        "--ciclos",
        type=int,
        default=None,
        help="Quantidade de ciclos. Se omitido, executa ate Ctrl+C.",
    )
    args = parser.parse_args()

    if args.intervalo < 0:
        parser.error("--intervalo nao pode ser negativo")
    if args.ciclos is not None and args.ciclos <= 0:
        parser.error("--ciclos deve ser maior que zero")

    executar(args.intervalo, args.ciclos, args.broker, args.porta)


if __name__ == "__main__":
    main()
