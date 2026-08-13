# HydroAlert AI

Sistema inteligente de alerta preditivo de inundações urbanas com IoT, NoSQL, Data Science, BI e Inteligência Artificial.

> Projeto acadêmico. Os sensores, coordenadas e medições da Etapa 1 são simulados e não representam alertas oficiais.

## Objetivo

Construir um protótipo capaz de coletar telemetria hidrometeorológica, analisar chuva e nível da água e, nas próximas etapas, integrar MQTT, MongoDB, FastAPI, Machine Learning, LLM, mapas, BI e revisão humana.

## Etapa 1 — Simulador IoT

A primeira etapa gera telemetria simulada para Goiânia/GO com:

- chuva em milímetros;
- nível da água em metros;
- variação do nível;
- tendência do nível;
- cota de atenção, alerta e crítica;
- classificação de risco;
- localização do sensor;
- data/hora;
- status do sensor.

Os registros são gravados em `data/telemetria.jsonl`.

## Estrutura atual

```text
HydroAlert-AI/
├── data/
│   └── .gitkeep
├── docs/
│   └── ETAPA_01_IOT.md
├── iot/
│   ├── __init__.py
│   ├── config.py
│   └── sensor_simulator.py
├── tests/
│   └── test_sensor_simulator.py
├── .gitignore
├── requirements.txt
├── run_etapa1.bat
└── README.md
```

## Como rodar no Visual Studio Code

### 1. Clonar o projeto

```bash
git clone https://github.com/Abnerrum/HydroAlert-AI.git
cd HydroAlert-AI
```

### 2. Criar o ambiente virtual

```bash
python -m venv .venv
```

### 3. Ativar no Windows

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Ou Prompt de Comando:

```cmd
.venv\Scripts\activate.bat
```

### 4. Instalar dependências

```bash
pip install -r requirements.txt
```

A Etapa 1 usa somente a biblioteca padrão do Python.

### 5. Rodar 10 ciclos de teste

```bash
python -m iot.sensor_simulator --ciclos 10
```

### 6. Rodar continuamente

```bash
python -m iot.sensor_simulator
```

Para encerrar use `Ctrl + C`.

### Atalho no Windows

Também é possível executar:

```text
run_etapa1.bat
```

## Testes automatizados

```bash
python -m unittest discover -s tests -v
```

## Roadmap

1. ✅ Simulador de sensores IoT
2. ⏳ MQTT + Eclipse Mosquitto + Paho MQTT
3. ⏳ MongoDB
4. ⏳ FastAPI
5. ⏳ Dashboard Web
6. ⏳ Data Science e Machine Learning
7. ⏳ Previsão de 1h, 3h e 6h
8. ⏳ Mapa Leaflet/OpenStreetMap
9. ⏳ Copiloto com LLM/NLP e ferramentas
10. ⏳ Revisão humana
11. ⏳ Power BI e backtesting
