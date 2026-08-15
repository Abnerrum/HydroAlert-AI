# HydroAlert AI

Sistema inteligente acadêmico de alerta preditivo de inundações urbanas com IoT, MQTT, NoSQL, FastAPI, Dashboard Web e Machine Learning.

> Os sensores, coordenadas e medições atuais são simulados. O projeto não representa alerta oficial e não deve ser usado para tomada de decisão operacional real.

## Objetivo

Construir um protótipo capaz de coletar telemetria hidrometeorológica, transmitir dados em tempo real, armazenar séries no MongoDB, disponibilizar uma API, visualizar indicadores e evoluir para previsão de risco de inundação.

## Arquitetura atual

```text
Sensores simulados Python
        ↓
Paho MQTT Publisher
        ↓
Eclipse Mosquitto :1883
        ↓
Paho MQTT Subscriber
        ├──→ JSONL local
        └──→ MongoDB :27017
                  ↓
               FastAPI
                  ↓
        Dashboard Web / API
                  ↓
         Data Science + ML
```

## Etapas concluídas no código

### Etapa 1 — Simulador IoT ✅

```powershell
python -m iot.sensor_simulator --ciclos 10
```

Gera chuva, nível, variação, tendência, cotas e classificação de risco para três sensores simulados em Goiânia/GO.

### Etapa 2 — MQTT ✅

Subscriber:

```powershell
python -m iot.mqtt_subscriber
```

Publisher:

```powershell
python -m iot.mqtt_publisher --ciclos 10
```

O fluxo MQTT foi validado localmente com Eclipse Mosquitto.

### Etapa 3 — MongoDB ✅ Código implementado

O subscriber agora tenta persistir cada mensagem em:

```text
Database: hydroalert_ai
Collection: telemetria
```

Configuração padrão:

```text
mongodb://localhost:27017/
```

Se o MongoDB estiver offline, o projeto continua salvando no JSONL local.

Documentação: `docs/ETAPA_03_MONGODB.md`.

### Etapa 4 — FastAPI ✅ Código implementado

Executar:

```powershell
python -m uvicorn api.main:app --reload
```

Abrir:

```text
Dashboard: http://127.0.0.1:8000
Swagger:   http://127.0.0.1:8000/docs
Health:    http://127.0.0.1:8000/health
```

Principais endpoints:

```text
GET /api/sensores
GET /api/telemetria
GET /api/resumo
GET /api/ml/status
GET /api/ml/prever/{sensor_id}
```

Documentação: `docs/ETAPA_04_FASTAPI.md`.

### Etapa 5 — Dashboard Web ✅ Código implementado

O dashboard contém:

- cards de indicadores;
- filtro por sensor;
- gráfico de nível;
- gráfico de chuva;
- distribuição de risco;
- tabela de telemetria recente;
- status do MongoDB;
- status do modelo de ML;
- atualização automática.

Documentação: `docs/ETAPA_05_DASHBOARD.md`.

### Etapa 6 — Data Science e Machine Learning ✅ Baseline implementado

O baseline usa `RandomForestRegressor` para prever o próximo nível da série a partir de chuva, nível atual, variação e cotas operacionais.

Gerar uma base maior:

```powershell
python -m iot.mqtt_publisher --ciclos 100 --intervalo 0.2
```

Treinar:

```powershell
python -m ml.train_model
```

O modelo é salvo localmente em:

```text
models/modelo_nivel.joblib
```

A métrica inicial é MAE em metros. O artefato treinado não é versionado no GitHub.

Documentação: `docs/ETAPA_06_DATA_SCIENCE_ML.md`.

## Instalação no Visual Studio Code

### 1. Clonar

```powershell
git clone https://github.com/Abnerrum/HydroAlert-AI.git
cd HydroAlert-AI
```

### 2. Selecionar a branch das Etapas 3–6

```powershell
git fetch origin
git switch etapas-03-a-06
```

### 3. Criar ambiente virtual

```powershell
python -m venv .venv
```

### 4. Ativar no PowerShell

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 5. Instalar dependências

```powershell
python -m pip install -r requirements.txt
```

## Executar demonstração completa

### Terminal 1 — Subscriber MQTT + MongoDB

```powershell
python -m iot.mqtt_subscriber
```

### Terminal 2 — Publisher dos sensores

```powershell
python -m iot.mqtt_publisher --ciclos 100 --intervalo 1
```

### Terminal 3 — API + Dashboard

```powershell
python -m uvicorn api.main:app --reload
```

Depois abra `http://127.0.0.1:8000`.

Quando houver dados suficientes, treine o modelo:

```powershell
python -m ml.train_model
```

## Testes automatizados

```powershell
python -m unittest discover -s tests -v
```

## Estrutura

```text
HydroAlert-AI/
├── api/
│   └── main.py
├── dashboard/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── database/
│   └── mongodb.py
├── data/
├── docs/
│   ├── ETAPA_01_IOT.md
│   ├── ETAPA_02_MQTT.md
│   ├── ETAPA_03_MONGODB.md
│   ├── ETAPA_04_FASTAPI.md
│   ├── ETAPA_05_DASHBOARD.md
│   └── ETAPA_06_DATA_SCIENCE_ML.md
├── iot/
│   ├── config.py
│   ├── sensor_simulator.py
│   ├── mqtt_publisher.py
│   └── mqtt_subscriber.py
├── ml/
│   ├── features.py
│   ├── model_service.py
│   └── train_model.py
├── models/
├── services/
│   └── telemetry_service.py
└── tests/
```

## Roadmap

1. ✅ Simulador de sensores IoT
2. ✅ MQTT + Eclipse Mosquitto + Paho MQTT
3. ✅ MongoDB — implementação pronta; validar localmente
4. ✅ FastAPI — implementação pronta; validar localmente
5. ✅ Dashboard Web — implementação pronta; validar localmente
6. ✅ Data Science e Machine Learning — baseline pronto; treinar e validar localmente
7. ⏳ Previsão de 1h, 3h e 6h
8. ⏳ Mapa Leaflet/OpenStreetMap
9. ⏳ Copiloto com LLM/NLP e ferramentas
10. ⏳ Revisão humana
11. ⏳ Power BI e backtesting por evento
