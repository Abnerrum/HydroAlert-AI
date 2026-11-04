"""Escolhe uma porta enumerada sem interpolar entrada em comandos de shell."""

from pathlib import Path
import subprocess
import sys


def main():
    try:
        from serial.tools import list_ports
    except ImportError:
        print("Execute INSTALAR_TUDO.bat para instalar pyserial.")
        return 1
    portas = list(list_ports.comports())
    if not portas:
        print("Nenhuma porta encontrada. Confira cabo USB de dados e driver da sua placa.")
        return 1
    for indice, porta in enumerate(portas, 1):
        print(f"{indice} - {porta.device}: {porta.description}")
    try:
        indice = int(input("Numero da porta do ESP32: "))
        if not 1 <= indice <= len(portas):
            raise ValueError
    except ValueError:
        print("Escolha invalida.")
        return 1
    print("Feche o Monitor Serial da Arduino IDE antes de coletar.")
    return subprocess.call(
        [sys.executable, "-m", "iot.serial_collector", "--porta", portas[indice - 1].device],
        cwd=Path(__file__).resolve().parents[1],
    )


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nColeta encerrada.")
