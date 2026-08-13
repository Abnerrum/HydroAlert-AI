import argparse
import json
import random
import time
from datetime import datetime, timedelta, timezone

from .config import (
    ARQUIVO_TELEMETRIA,
    INTERVALO_PADRAO_SEGUNDOS,
    PASTA_DADOS,
    SENSORES,
)

FUSO_BRASILIA = timezone(timedelta(hours=-3))


def classificar_risco(nivel_m: float, sensor: dict) -> str:
    if nivel_m >= sensor["cota_critica_m"]:
        return "CRITICO"
    if nivel_m >= sensor["cota_alerta_m"]:
        return "ALTO"
    if nivel_m >= sensor["cota_atencao_m"]:
        return "MODERADO"
    return "BAIXO"


def gerar_chuva_mm() -> float:
    """Gera chuva simulada em mm para o intervalo atual."""
    sorteio = random.random()

    if sorteio < 0.50:
        chuva = 0.0
    elif sorteio < 0.75:
        chuva = random.uniform(0.2, 4.0)
    elif sorteio < 0.92:
        chuva = random.uniform(4.0, 15.0)
    else:
        chuva = random.uniform(15.0, 35.0)

    return round(chuva, 2)


def atualizar_nivel(nivel_anterior: float, chuva_mm: float) -> float:
    """Relaciona chuva e nivel de forma simplificada para fins academicos."""
    resposta_hidrologica = chuva_mm * random.uniform(0.004, 0.010)
    drenagem = random.uniform(0.005, 0.025)
    ruido = random.uniform(-0.01, 0.01)

    novo_nivel = nivel_anterior + resposta_hidrologica - drenagem + ruido
    return round(max(0.20, min(novo_nivel, 4.50)), 3)


def gerar_leitura(sensor: dict, niveis: dict[str, float]) -> dict:
    chuva_mm = gerar_chuva_mm()
    nivel_anterior = niveis[sensor["sensor_id"]]
    nivel_atual = atualizar_nivel(nivel_anterior, chuva_mm)
    niveis[sensor["sensor_id"]] = nivel_atual

    variacao = round(nivel_atual - nivel_anterior, 3)

    if variacao > 0.05:
        tendencia = "SUBINDO_RAPIDAMENTE"
    elif variacao > 0.005:
        tendencia = "SUBINDO"
    elif variacao < -0.005:
        tendencia = "DIMINUINDO"
    else:
        tendencia = "ESTAVEL"

    return {
        "sensor_id": sensor["sensor_id"],
        "nome": sensor["nome"],
        "timestamp": datetime.now(FUSO_BRASILIA).isoformat(timespec="seconds"),
        "localizacao": {
            "latitude": sensor["latitude"],
            "longitude": sensor["longitude"],
            "municipio": "Goiania",
            "uf": "GO",
        },
        "chuva_mm": chuva_mm,
        "nivel_m": nivel_atual,
        "variacao_nivel_m": variacao,
        "tendencia": tendencia,
        "cota_atencao_m": sensor["cota_atencao_m"],
        "cota_alerta_m": sensor["cota_alerta_m"],
        "cota_critica_m": sensor["cota_critica_m"],
        "risco": classificar_risco(nivel_atual, sensor),
        "status_sensor": "ONLINE",
        "origem": "SIMULACAO_ACADEMICA",
    }


def salvar_leitura(leitura: dict) -> None:
    PASTA_DADOS.mkdir(parents=True, exist_ok=True)
    with ARQUIVO_TELEMETRIA.open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps(leitura, ensure_ascii=False) + "\n")


def imprimir_leitura(leitura: dict) -> None:
    print(
        f"[{leitura['timestamp']}] "
        f"{leitura['sensor_id']} | "
        f"Chuva: {leitura['chuva_mm']:>5.2f} mm | "
        f"Nivel: {leitura['nivel_m']:>5.3f} m | "
        f"Tendencia: {leitura['tendencia']:<20} | "
        f"Risco: {leitura['risco']}"
    )


def executar_simulacao(intervalo: float, ciclos: int | None) -> None:
    niveis = {
        sensor["sensor_id"]: round(random.uniform(0.70, 1.30), 3)
        for sensor in SENSORES
    }

    print("=" * 100)
    print("HYDROALERT AI - ETAPA 1: SIMULADOR DE SENSORES HIDROMETEOROLOGICOS")
    print("Regiao piloto: Goiania/GO | Dados 100% simulados para fins academicos")
    print("=" * 100)

    ciclo_atual = 0

    try:
        while ciclos is None or ciclo_atual < ciclos:
            ciclo_atual += 1
            print(f"\nCiclo {ciclo_atual}")

            for sensor in SENSORES:
                leitura = gerar_leitura(sensor, niveis)
                salvar_leitura(leitura)
                imprimir_leitura(leitura)

            if ciclos is None or ciclo_atual < ciclos:
                time.sleep(intervalo)

    except KeyboardInterrupt:
        print("\nSimulacao encerrada pelo usuario.")

    print(f"\nTelemetria salva em: {ARQUIVO_TELEMETRIA}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Simulador IoT da Etapa 1 do HydroAlert AI"
    )
    parser.add_argument(
        "--intervalo",
        type=float,
        default=INTERVALO_PADRAO_SEGUNDOS,
        help="Intervalo, em segundos, entre os ciclos (padrao: 5).",
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

    executar_simulacao(args.intervalo, args.ciclos)


if __name__ == "__main__":
    main()
