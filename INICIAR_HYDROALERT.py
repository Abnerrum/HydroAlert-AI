#!/usr/bin/env python3
"""Inicia o HydroAlert AI com Docker Compose e abre o dashboard.

Compatível com Windows, macOS e Linux. Requer Docker Desktop ou Docker Engine
com o plugin Docker Compose v2 instalado.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8000"
DOCKER_DESKTOP = Path(os.environ.get("PROGRAMFILES", r"C:\Program Files")) / "Docker" / "Docker" / "Docker Desktop.exe"


def run(command: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    print(f"\n> {' '.join(command)}")
    return subprocess.run(command, cwd=ROOT, check=check, text=True)


def docker_command() -> list[str]:
    docker = shutil.which("docker")
    if not docker:
        raise RuntimeError("Docker não foi encontrado. Instale o Docker Desktop e tente novamente.")
    return [docker]


def docker_ready(docker: list[str]) -> bool:
    return subprocess.run([*docker, "info"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0


def try_start_docker_desktop() -> None:
    if sys.platform.startswith("win") and DOCKER_DESKTOP.exists():
        print("Docker Desktop não está pronto. Iniciando automaticamente...")
        subprocess.Popen([str(DOCKER_DESKTOP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def wait_for_docker(docker: list[str], timeout: int = 90) -> None:
    try_start_docker_desktop()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if docker_ready(docker):
            return
        time.sleep(3)
    raise RuntimeError("Docker não ficou disponível. Abra o Docker Desktop e execute o iniciador novamente.")


def wait_for_api(timeout: int = 120) -> None:
    deadline = time.monotonic() + timeout
    health_url = f"{URL}/health"
    print("Aguardando a API ficar pronta...")
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(health_url, timeout=3) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(2)
    raise RuntimeError("A API demorou mais que o esperado para iniciar. Verifique os logs do Docker.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Inicia o HydroAlert AI em Windows, macOS ou Linux.")
    parser.add_argument("--sem-navegador", action="store_true", help="não abre o navegador automaticamente")
    parser.add_argument("--simulacao", action="store_true", help="inicia também o publisher de telemetria simulada")
    args = parser.parse_args()

    try:
        docker = docker_command()
        wait_for_docker(docker)
        command = [*docker, "compose", "up", "-d", "--build"]
        if args.simulacao:
            command.extend(["--profile", "simulacao"])
        run(command)
        wait_for_api()
        print(f"\nHydroAlert AI está online: {URL}")
        if not args.sem_navegador:
            webbrowser.open(URL)
        return 0
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"\nERRO: {error}", file=sys.stderr)
        print("Consulte docs/GUIA_INICIADOR_MULTIPLATAFORMA.md para ajuda.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
