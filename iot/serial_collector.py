"""Coleta USB independente do simulador; nunca inventa chuva ou geolocalizacao."""

import argparse
import csv
import json
import math
from datetime import UTC, datetime
from pathlib import Path

COLUNAS = (
    "timestamp", "sensor_id", "origem", "uptime_ms", "distancia_cm",
    "temperatura_c", "umidade_pct", "altura_referencia_cm", "nivel_m",
    "chuva_mm", "status_sensor",
)


def validar_pacote(linha: str) -> dict:
    dados = json.loads(linha)
    if not isinstance(dados, dict) or dados.get("origem") != "ESP32_FISICO":
        raise ValueError("Pacote nao pertence ao firmware fisico")
    sensor = dados.get("sensor_id")
    if not isinstance(sensor, str) or not 1 <= len(sensor) <= 64:
        raise ValueError("sensor_id invalido")
    limites = {
        "distancia_cm": (2, 400), "temperatura_c": (0, 50),
        "umidade_pct": (0, 100), "altura_referencia_cm": (0.001, 400),
        "nivel_m": (0, 4), "uptime_ms": (0, 4294967295),
    }
    for campo, (minimo, maximo) in limites.items():
        valor = dados.get(campo)
        if valor is not None and (
            isinstance(valor, bool) or not isinstance(valor, (int, float))
            or not math.isfinite(valor) or not minimo <= valor <= maximo
        ):
            raise ValueError(f"{campo} invalido")
    # O firmware nao possui pluviometro. Ausencia nao equivale a chuva zero.
    if dados.get("chuva_mm") is not None:
        raise ValueError("Este dispositivo nao mede chuva")
    distancia = dados.get("distancia_cm")
    altura = dados.get("altura_referencia_cm")
    dados["nivel_m"] = (
        round((altura - distancia) / 100, 5)
        if altura is not None and distancia is not None and distancia <= altura
        else None
    )
    dados["status_sensor"] = (
        "OK" if all(dados.get(c) is not None for c in
                    ("distancia_cm", "temperatura_c", "umidade_pct")) else "PARCIAL"
    )
    dados["timestamp"] = datetime.now(UTC).isoformat()
    return {campo: dados.get(campo) for campo in COLUNAS}


def salvar(dados: dict, pasta: Path) -> None:
    pasta.mkdir(parents=True, exist_ok=True)
    with (pasta / "esp32_real.jsonl").open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps(dados, ensure_ascii=False, allow_nan=False) + "\n")
    caminho_csv = pasta / "esp32_real.csv"
    cabecalho = not caminho_csv.exists() or caminho_csv.stat().st_size == 0
    with caminho_csv.open("a", newline="", encoding="utf-8") as arquivo:
        writer = csv.DictWriter(arquivo, fieldnames=COLUNAS)
        if cabecalho:
            writer.writeheader()
        writer.writerow(dados)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--porta", help="Ex.: COM5 ou /dev/ttyUSB0")
    parser.add_argument("--listar", action="store_true", help="Lista portas USB")
    parser.add_argument("--pasta", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    args = parser.parse_args()
    try:
        import serial
        from serial.tools import list_ports
    except ImportError:
        parser.exit(1, "Instale: python -m pip install -r requirements-hardware.txt\n")
    if args.listar:
        for porta in list_ports.comports():
            print(f"{porta.device}: {porta.description}")
        return
    if not args.porta:
        parser.error("Informe --porta ou use --listar")
    try:
        with serial.Serial(args.porta, 115200, timeout=2) as conexao:
            print(f"Coletando em {args.porta}. Arquivos em {args.pasta.resolve()}. Ctrl+C encerra.")
            while True:
                linha = conexao.read_until(b"\n", size=2048)
                if not linha:
                    continue
                try:
                    dados = validar_pacote(linha.decode("utf-8"))
                except (ValueError, UnicodeDecodeError) as erro:
                    print(f"Linha ignorada (inicializacao/pacote invalido): {erro}")
                    continue
                salvar(dados, args.pasta)
                print(json.dumps(dados, ensure_ascii=False))
    except KeyboardInterrupt:
        print("\nColeta encerrada; arquivos preservados.")
    except (serial.SerialException, OSError) as erro:
        parser.exit(1, f"Falha na coleta: {erro}. Confira cabo, driver e porta; feche o Monitor Serial.\n")


if __name__ == "__main__":
    main()
