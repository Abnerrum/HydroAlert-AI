# HydroAlert AI

Sistema inteligente de alerta preditivo de inundações urbanas com IoT, NoSQL, Data Science, BI e Inteligência Artificial.

> Projeto acadêmico. Os sensores, coordenadas e medições atuais são simulados e não representam alertas oficiais.

## Objetivo

Construir um protótipo capaz de coletar telemetria hidrometeorológica, analisar chuva e nível da água e integrar MQTT, MongoDB, FastAPI, Machine Learning, LLM, mapas, BI e revisão humana.

## Etapa 1 — Simulador IoT ✅

A primeira etapa gera telemetria simulada para Goiânia/GO com chuva, nível da água, variação, tendência, cotas e classificação de risco.

Os registros locais são gravados em:

```text
data/telemetria.jsonl
```

Executar 10 ciclos:

```powershell
python -m iot.sensor_simulator --ciclos 10
```

## Etapa 2 — MQTT ✅ Código concluído

A segunda etapa adiciona comunicação MQTT entre os sensores simulados e um receptor. O fluxo está implementado; a validação de integração deve ser executada localmente com o Eclipse Mosquitto em funcionamento.

```text
Sensores simulados
       ↓
Paho MQTT Publisher
       ↓
Eclipse Mosquitto
       ↓
Paho MQTT Subscriber
       ↓
data/mqtt_recebido.jsonl
```

### Dependência

```powershell
python -m pip install -r requirements.txt
```

### Broker MQTT

Instale o Eclipse Mosquitto no Windows e mantenha o broker local em execução na porta `1883`.

Documentação detalhada:

```text
docs/ETAPA_02_MQTT.md
```

### Terminal 1 — Subscriber

```powershell
python -m iot.mqtt_subscriber
```

Também é possível informar broker e porta:

```powershell
python -m iot.mqtt_subscriber --broker localhost --porta 1883
```

### Terminal 2 — Publisher

```powershell
python -m iot.mqtt_publisher --ciclos 10
```

Tópicos utilizados:

```text
hydroalert/telemetria/GYN-SIM-001
hydroalert/telemetria/GYN-SIM-002
hydroalert/telemetria/GYN-SIM-003
```

### Testes da Etapa 2

```powershell
python -m unittest discover -s tests -v
```

Os testes cobrem publicação, tópico, payload, QoS, inscrição do subscriber, persistência JSONL e rejeição de mensagens inválidas.

## Estrutura atual

```text
HydroAlert-AI/
├── data/
│   └── .gitkeep
├── docs/
│   ├── ETAPA_01_IOT.md
│   └── ETAPA_02_MQTT.md
├── iot/
│   ├── __init__.py
│   ├── config.py
│   ├── sensor_simulator.py
│   ├── mqtt_publisher.py
│   └── mqtt_subscriber.py
├── tests/
│   ├── test_sensor_simulator.py
│   └── test_mqtt.py
├── .gitignore
├── requirements.txt
├── run_etapa1.bat
├── run_mqtt_publisher.bat
├── run_mqtt_subscriber.bat
└── README.md
```

## Como rodar no Visual Studio Code

### Clonar

```bash
git clone https://github.com/Abnerrum/HydroAlert-AI.git
cd HydroAlert-AI
```

### Criar ambiente virtual

```powershell
python -m venv .venv
```

### Ativar no PowerShell

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### Instalar dependências

```powershell
python -m pip install -r requirements.txt
```

## Testes automatizados

```powershell
python -m unittest discover -s tests -v
```

## Roadmap

1. ✅ Simulador de sensores IoT
2. ✅ MQTT + Eclipse Mosquitto + Paho MQTT — código concluído; validar integração local
3. ⏳ MongoDB
4. ⏳ FastAPI
5. ⏳ Dashboard Web
6. ⏳ Data Science e Machine Learning
7. ⏳ Previsão de 1h, 3h e 6h
8. ⏳ Mapa Leaflet/OpenStreetMap
9. ⏳ Copiloto com LLM/NLP e ferramentas
10. ⏳ Revisão humana
11. ⏳ Power BI e backtesting
