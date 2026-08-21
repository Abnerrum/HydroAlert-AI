import argparse
import json
import random
import time
from datetime import datetime, timedelta

import paho.mqtt.client as mqtt

from logging_config import configurar_logging

from .config import (
    INTERVALO_PADRAO_SEGUNDOS,
    MQTT_BROKER,
    MQTT_KEEPALIVE,
    MQTT_PORT,
    MQTT_QOS,
    MQTT_TOPIC_PREFIX,
    SENSORES,
    aplicar_credenciais_mqtt,
)
from .sensor_simulator import FUSO_BRASILIA, gerar_leitura, salvar_leitura

logger = configurar_logging("hydroalert.mqtt_publisher")


def criar_cliente() -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="hydroalert-simulador-publisher",
        protocol=mqtt.MQTTv311,
    )
    aplicar_credenciais_mqtt(client)
    return client


def publicar_leitura(client: mqtt.Client, leitura: dict) -> None:
    topico = f"{MQTT_TOPIC_PREFIX}/{leitura['sensor_id']}"
    payload = json.dumps(leitura, ensure_ascii=False)

    resultado = client.publish(topico, payload, qos=MQTT_QOS, retain=False)
    resultado.wait_for_publish()

    if resultado.rc != mqtt.MQTT_ERR_SUCCESS:
        raise RuntimeError(f"Falha ao publicar no MQTT. Codigo: {resultado.rc}")

    logger.info(
        "PUBLICADO | %s | Chuva: %5.2f mm | Nivel: %5.3f m | Risco: %s",
        topico,
        leitura["chuva_mm"],
        leitura["nivel_m"],
        leitura["risco"],
    )


def executar(
    intervalo: float,
    ciclos: int | None,
    broker: str,
    porta: int,
    passo_minutos: int = 15,
    tempo_real: bool = False,
    seed: int | None = None,
) -> None:
    if seed is not None:
        random.seed(seed)

    client = criar_cliente()

    try:
        logger.info("Conectando ao broker MQTT em %s:%s...", broker, porta)
        client.connect(broker, porta, MQTT_KEEPALIVE)
        client.loop_start()
        logger.info("Conectado ao Mosquitto. Iniciando publicacao da telemetria.")

        niveis = {
            sensor["sensor_id"]: round(random.uniform(0.70, 1.30), 3)
            for sensor in SENSORES
        }
        instante_simulado = datetime.now(FUSO_BRASILIA).replace(second=0, microsecond=0)
        ciclo_atual = 0

        while ciclos is None or ciclo_atual < ciclos:
            ciclo_atual += 1
            instante = datetime.now(FUSO_BRASILIA) if tempo_real else instante_simulado
            logger.info(
                "Ciclo MQTT %d | instante hidrologico %s",
                ciclo_atual,
                instante.isoformat(timespec="minutes"),
            )

            for sensor in SENSORES:
                leitura = gerar_leitura(
                    sensor,
                    niveis,
                    timestamp=instante,
                    ciclo=ciclo_atual,
                    passo_hidrologico_min=passo_minutos,
                )
                salvar_leitura(leitura)
                publicar_leitura(client, leitura)

            if not tempo_real:
                instante_simulado += timedelta(minutes=passo_minutos)

            if ciclos is None or ciclo_atual < ciclos:
                time.sleep(intervalo)

    except (ConnectionRefusedError, OSError) as erro:
        logger.error("Nao foi possivel conectar ao broker MQTT. Detalhe: %s", erro)
        logger.error(
            "Confirme se o Eclipse Mosquitto esta instalado e em execucao na porta %s.",
            porta,
        )
    except KeyboardInterrupt:
        logger.info("Publicacao encerrada pelo usuario.")
    finally:
        try:
            client.loop_stop()
            client.disconnect()
        except Exception:  # noqa: BLE001 - desconexao e melhor esforco
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
    parser.add_argument(
        "--passo-minutos",
        type=int,
        default=15,
        help="Minutos hidrologicos avancados por ciclo no modo acelerado.",
    )
    parser.add_argument(
        "--tempo-real",
        action="store_true",
        help="Usa o relogio real em vez do relogio hidrologico acelerado.",
    )
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()

    if args.intervalo < 0:
        parser.error("--intervalo nao pode ser negativo")
    if args.ciclos is not None and args.ciclos <= 0:
        parser.error("--ciclos deve ser maior que zero")
    if args.passo_minutos <= 0:
        parser.error("--passo-minutos deve ser maior que zero")

    executar(
        args.intervalo,
        args.ciclos,
        args.broker,
        args.porta,
        passo_minutos=args.passo_minutos,
        tempo_real=args.tempo_real,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
