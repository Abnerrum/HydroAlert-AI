"""Reproduz o experimento acadêmico HydroAlert-AI em uma pasta isolada.

Execute: python -m scripts.reproduzir_experimento --saida resultados/seed42
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

import joblib

RAIZ = Path(__file__).resolve().parents[1]
NUM_CICLOS = 120
NUM_SENSORES = 12
SEED = 42


def validar_telemetria(caminho: Path) -> dict:
    """Verifica a integridade mínima da série simulada antes do treino."""
    contagens: dict[str, int] = {}
    ciclos: set[int] = set()
    with caminho.open(encoding="utf-8") as arquivo:
        for indice, linha in enumerate(arquivo, start=1):
            try:
                registro = json.loads(linha)
            except json.JSONDecodeError as erro:
                raise ValueError(f"JSON inválido na linha {indice}") from erro
            sensor = registro.get("sensor_id")
            ciclo = (registro.get("simulacao") or {}).get("ciclo")
            if not sensor or not isinstance(ciclo, int):
                raise ValueError(f"Leitura incompleta na linha {indice}")
            contagens[sensor] = contagens.get(sensor, 0) + 1
            ciclos.add(ciclo)
    if len(contagens) != NUM_SENSORES or set(contagens.values()) != {NUM_CICLOS}:
        raise ValueError("Esperados 12 sensores, com 120 leituras por sensor.")
    if ciclos != set(range(1, NUM_CICLOS + 1)):
        raise ValueError("O histórico deve conter os ciclos consecutivos de 1 a 120.")
    return {"registros": sum(contagens.values()), "sensores": len(contagens), "ciclos": len(ciclos)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--saida", type=Path, default=RAIZ / "resultados" / "seed42")
    args = parser.parse_args()
    saida = args.saida.resolve()
    dados = saida / "dados"
    dados.mkdir(parents=True, exist_ok=True)
    modelo = saida / "modelo_nivel.joblib"
    telemetria = dados / "telemetria.jsonl"
    if telemetria.exists():
        telemetria.unlink()  # evita duplicação entre execuções
    ambiente = os.environ.copy()
    ambiente.update({
        "DATA_DIR": str(dados),
        "HYDRO_MODEL_PATH": str(modelo),
        "MONGO_URI": "mongodb://127.0.0.1:1/",
        "MONGO_TIMEOUT_MS": "200",
    })
    comando_simulador = [
        sys.executable, "-m", "iot.sensor_simulator", "--ciclos", str(NUM_CICLOS),
        "--intervalo", "0", "--passo-minutos", "15", "--seed", str(SEED),
    ]
    with (saida / "simulacao.log").open("w", encoding="utf-8") as log:
        subprocess.run(comando_simulador, cwd=RAIZ, env=ambiente, stdout=log, check=True)
    qualidade = validar_telemetria(telemetria)
    subprocess.run([sys.executable, "-m", "ml.train_model"], cwd=RAIZ, env=ambiente, check=True)
    metricas = joblib.load(modelo)["metrics"]
    relatorio = {
        "natureza": "simulacao_academica_nao_e_alerta_oficial",
        "parametros": {"seed": SEED, "ciclos": NUM_CICLOS, "passo_minutos": 15},
        "qualidade": qualidade,
        "metricas": metricas,
        "nota": "Datas de geração variam; compare valores com os artigos antes de citar.",
    }
    caminho = saida / "metricas.json"
    caminho.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Experimento completo: {qualidade['registros']} registros; métricas em {caminho}")


if __name__ == "__main__":
    main()
