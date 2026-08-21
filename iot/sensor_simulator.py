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


def nivel_operacional(risco: str) -> str:
    return {
        "BAIXO": "NORMAL",
        "MODERADO": "ATENCAO",
        "ALTO": "ALERTA",
        "CRITICO": "EMERGENCIA",
    }.get(risco, "SEM_DADOS")


def gerar_chuva_mm() -> float:
    """Gera precipitação simulada para um passo hidrológico de 15 minutos."""
    sorteio = random.random()

    if sorteio < 0.48:
        chuva = 0.0
    elif sorteio < 0.72:
        chuva = random.uniform(0.1, 2.5)
    elif sorteio < 0.90:
        chuva = random.uniform(2.5, 9.0)
    elif sorteio < 0.975:
        chuva = random.uniform(9.0, 20.0)
    else:
        chuva = random.uniform(20.0, 40.0)

    return round(chuva, 2)


def atualizar_nivel(nivel_anterior: float, chuva_mm: float) -> float:
    """Resposta hidrológica simplificada para prototipação acadêmica."""
    fator_intensidade = 1.0 + max(0.0, chuva_mm - 8.0) / 18.0
    resposta_hidrologica = chuva_mm * random.uniform(0.0045, 0.0105) * fator_intensidade
    drenagem_base = random.uniform(0.014, 0.032)
    drenagem_por_nivel = max(0.0, nivel_anterior - 1.10) * 0.010
    drenagem = drenagem_base + drenagem_por_nivel
    ruido = random.uniform(-0.008, 0.008)

    novo_nivel = nivel_anterior + resposta_hidrologica - drenagem + ruido
    return round(max(0.20, min(novo_nivel, 4.50)), 3)


def gerar_leitura(
    sensor: dict,
    niveis: dict[str, float],
    timestamp: datetime | None = None,
    ciclo: int | None = None,
    passo_hidrologico_min: int = 15,
) -> dict:
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

    risco = classificar_risco(nivel_atual, sensor)
    instante = timestamp or datetime.now(FUSO_BRASILIA)

    return {
        "sensor_id": sensor["sensor_id"],
        "nome": sensor["nome"],
        "timestamp": instante.isoformat(timespec="seconds"),
        "localizacao": {
            "latitude": sensor["latitude"],
            "longitude": sensor["longitude"],
            "estado": sensor["estado"],
            "uf": sensor["uf"],
            "municipio": sensor["municipio"],
            "regiao": sensor["regiao"],
            "bairro": sensor["bairro"],
        },
        "chuva_mm": chuva_mm,
        "nivel_m": nivel_atual,
        "variacao_nivel_m": variacao,
        "tendencia": tendencia,
        "cota_atencao_m": sensor["cota_atencao_m"],
        "cota_alerta_m": sensor["cota_alerta_m"],
        "cota_critica_m": sensor["cota_critica_m"],
        "risco": risco,
        "nivel_operacional": nivel_operacional(risco),
        "status_sensor": "ONLINE",
        "origem": "SIMULACAO_ACADEMICA",
        "simulacao": {
            "ciclo": ciclo,
            "passo_hidrologico_min": passo_hidrologico_min,
        },
    }


def salvar_leitura(leitura: dict) -> None:
    PASTA_DADOS.mkdir(parents=True, exist_ok=True)
    with ARQUIVO_TELEMETRIA.open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps(leitura, ensure_ascii=False) + "\n")


def imprimir_leitura(leitura: dict) -> None:
    local = leitura.get("localizacao", {})
    print(
        f"[{leitura['timestamp']}] "
        f"{leitura['sensor_id']} | "
        f"{local.get('municipio', '--')}/{local.get('uf', '--')} | "
        f"Chuva: {leitura['chuva_mm']:>5.2f} mm | "
        f"Nivel: {leitura['nivel_m']:>5.3f} m | "
        f"Tendencia: {leitura['tendencia']:<20} | "
        f"Risco: {leitura['risco']}"
    )


def executar_simulacao(
    intervalo: float,
    ciclos: int | None,
    passo_minutos: int = 15,
    tempo_real: bool = False,
    seed: int | None = None,
) -> None:
    if seed is not None:
        random.seed(seed)

    niveis = {
        sensor["sensor_id"]: round(random.uniform(0.70, 1.30), 3)
        for sensor in SENSORES
    }

    instante_simulado = datetime.now(FUSO_BRASILIA).replace(second=0, microsecond=0)

    print("=" * 112)
    print("HYDROALERT AI - REDE SIMULADA DE SENSORES HIDROMETEOROLOGICOS")
    print("Cobertura piloto: Estado de Goias | Dados 100% simulados para fins academicos")
    print(f"Pontos simulados ativos: {len(SENSORES)}")
    print(f"Passo hidrologico: {'tempo real' if tempo_real else f'{passo_minutos} min/ciclo'}")
    print("=" * 112)

    ciclo_atual = 0

    try:
        while ciclos is None or ciclo_atual < ciclos:
            ciclo_atual += 1
            instante_ciclo = datetime.now(FUSO_BRASILIA) if tempo_real else instante_simulado
            print(f"\nCiclo {ciclo_atual} | instante hidrologico {instante_ciclo.isoformat(timespec='minutes')}")

            for sensor in SENSORES:
                leitura = gerar_leitura(
                    sensor,
                    niveis,
                    timestamp=instante_ciclo,
                    ciclo=ciclo_atual,
                    passo_hidrologico_min=passo_minutos,
                )
                salvar_leitura(leitura)
                imprimir_leitura(leitura)

            if not tempo_real:
                instante_simulado += timedelta(minutes=passo_minutos)

            if ciclos is None or ciclo_atual < ciclos:
                time.sleep(intervalo)

    except KeyboardInterrupt:
        print("\nSimulacao encerrada pelo usuario.")

    print(f"\nTelemetria salva em: {ARQUIVO_TELEMETRIA}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Simulador hidrometeorologico do HydroAlert AI"
    )
    parser.add_argument(
        "--intervalo",
        type=float,
        default=INTERVALO_PADRAO_SEGUNDOS,
        help="Segundos reais entre ciclos. Use 0 para gerar historico rapidamente.",
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
        help="Minutos hidrologicos avancados por ciclo no modo simulado (padrao: 15).",
    )
    parser.add_argument(
        "--tempo-real",
        action="store_true",
        help="Usa o relogio real em vez do relogio hidrologico acelerado.",
    )
    parser.add_argument("--seed", type=int, default=None, help="Seed para reproducibilidade academica.")
    args = parser.parse_args()

    if args.intervalo < 0:
        parser.error("--intervalo nao pode ser negativo")
    if args.ciclos is not None and args.ciclos <= 0:
        parser.error("--ciclos deve ser maior que zero")
    if args.passo_minutos <= 0:
        parser.error("--passo-minutos deve ser maior que zero")

    executar_simulacao(
        args.intervalo,
        args.ciclos,
        passo_minutos=args.passo_minutos,
        tempo_real=args.tempo_real,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
