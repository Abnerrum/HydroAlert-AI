"""Instalacao Windows retomavel; nao grava firmware nem altera drivers USB."""

import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
URL_ESP32 = "https://espressif.github.io/arduino-esp32/package_esp32_index.json"
SKETCH = ROOT / "iot" / "esp32" / "hydroalert_sensores"


def executar(argumentos):
    print("\n> " + subprocess.list2cmdline([str(a) for a in argumentos]), flush=True)
    subprocess.run([str(a) for a in argumentos], cwd=ROOT, check=True)


def instalar_app(pacote):
    winget = shutil.which("winget")
    if not winget:
        raise RuntimeError(f"Instale {pacote} ou atualize o Instalador de Aplicativo na Microsoft Store.")
    executar([winget, "install", "--id", pacote, "--exact", "--source", "winget",
              "--accept-source-agreements", "--accept-package-agreements"])


def localizar_cli():
    encontrado = shutil.which("arduino-cli")
    if encontrado:
        return Path(encontrado)
    bases = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Arduino IDE",
        Path(os.environ.get("PROGRAMFILES", "")) / "Arduino IDE",
    ]
    for base in bases:
        caminho = base / "resources" / "app" / "lib" / "backend" / "resources" / "arduino-cli.exe"
        if caminho.is_file():
            return caminho
    return None


def preparar_python(completo):
    python_venv = ROOT / ".venv" / "Scripts" / "python.exe"
    if not python_venv.is_file():
        executar([sys.executable, "-m", "venv", ROOT / ".venv"])
    executar([python_venv, "-m", "pip", "install", "--upgrade", "pip"])
    executar([python_venv, "-m", "pip", "install", "-r", "requirements-hardware.txt"])
    if completo:
        executar([python_venv, "-m", "pip", "install", "-r", "requirements.txt"])
    executar([python_venv, "-m", "pip", "check"])


def preparar_esp32():
    cli = localizar_cli()
    if cli is None:
        instalar_app("ArduinoSA.IDE")
        cli = localizar_cli()
    if cli is None:
        raise RuntimeError("Arduino CLI nao localizado. Instale Arduino IDE no local padrao e execute novamente.")
    comando = [cli]
    config_ide = Path.home() / ".arduinoIDE" / "arduino-cli.yaml"
    if config_ide.is_file():
        comando += ["--config-file", config_ide]
    executar([*comando, "core", "update-index", "--additional-urls", URL_ESP32])
    executar([*comando, "core", "install", "esp32:esp32", "--additional-urls", URL_ESP32])
    executar([*comando, "lib", "update-index"])
    executar([*comando, "lib", "install", "DHT sensor library", "Adafruit Unified Sensor"])
    executar([*comando, "compile", "--fqbn", "esp32:esp32:esp32", SKETCH])


def main():
    if sys.platform != "win32":
        raise RuntimeError("Este instalador e para Windows 10/11.")
    print("HydroAlert AI - feche a Arduino IDE antes de continuar. Internet necessaria.")
    print("1 - Sensores ESP32 por USB (mais leve, sem Docker)")
    print("2 - Completo: sensores, dependencias Python e Docker Desktop para o painel/MQTT/MongoDB")
    escolha = input("Escolha 1 ou 2: ").strip()
    if escolha not in {"1", "2"}:
        raise RuntimeError("Opcao invalida. Execute novamente e escolha 1 ou 2.")
    preparar_python(completo=escolha == "2")
    preparar_esp32()
    if escolha == "2":
        if not shutil.which("docker"):
            instalar_app("Docker.DockerDesktop")
        print("Abra Docker Desktop, conclua a configuracao/termos e habilite WSL2 se solicitado.")
        print("Pode ser necessario reiniciar o Windows. Depois use INICIAR_HYDROALERT.bat.")
    print("\nInstalacao concluida; firmware compilado. Nenhum programa foi gravado na placa.")
    print("Abra o .ino na Arduino IDE, confira os pinos, selecione ESP32 Dev Module e a porta, e carregue.")
    print("Depois feche o Monitor Serial e abra COLETAR_ESP32.bat.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as erro:
        print(f"\nInstalacao interrompida: {erro}. Corrija a causa e execute novamente.", file=sys.stderr)
        sys.exit(1)
