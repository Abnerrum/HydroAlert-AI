# HydroAlert AI

Protótipo acadêmico de **alerta preditivo de inundações urbanas** que integra IoT, MQTT, MongoDB, FastAPI, Dashboard Web e Machine Learning.

> **Aviso:** os sensores, coordenadas e medições atuais são simulados. O projeto não representa um sistema oficial de alerta e não deve ser usado para tomada de decisão operacional real.

## Visão geral

O HydroAlert AI foi criado para demonstrar um fluxo completo de monitoramento hidrometeorológico, desde a geração dos dados dos sensores até a visualização e análise preditiva.

O sistema é capaz de:

- simular sensores de chuva e nível da água;
- transmitir telemetria em tempo real via MQTT;
- receber e armazenar dados localmente e no MongoDB;
- disponibilizar os dados por uma API REST com FastAPI;
- exibir indicadores e gráficos em um Dashboard Web;
- preparar séries temporais para Data Science;
- treinar um modelo de Machine Learning para previsão do próximo nível da água.

## Arquitetura

```text
Sensores simulados em Python
          ↓
   Paho MQTT Publisher
          ↓
 Eclipse Mosquitto :1883
          ↓
  Paho MQTT Subscriber
       ↙           ↘
 JSONL local      MongoDB :27017
                     ↓
                  FastAPI
                     ↓
             Dashboard Web
                     ↓
          Data Science + ML
```

## Status do projeto

| Etapa | Módulo | Status |
|---|---|---|
| 1 | Simulador IoT | ✅ Validada |
| 2 | MQTT + Mosquitto | ✅ Validada |
| 3 | MongoDB | 🧪 Implementada — validação local pendente |
| 4 | FastAPI | 🧪 Implementada — validação local pendente |
| 5 | Dashboard Web | 🧪 Implementada — validação local pendente |
| 6 | Data Science + Machine Learning | 🧪 Baseline implementado — treino e validação pendentes |
| 7 | Previsão de 1h, 3h e 6h | ⏳ Planejada |
| 8 | Mapa Leaflet/OpenStreetMap | ⏳ Planejada |
| 9 | Copiloto com LLM/NLP | ⏳ Planejada |
| 10 | Revisão humana | ⏳ Planejada |
| 11 | Power BI + backtesting | ⏳ Planejada |

## Tecnologias

- Python 3
- Paho MQTT
- Eclipse Mosquitto
- MongoDB / PyMongo
- FastAPI
- Uvicorn
- HTML, CSS e JavaScript
- Chart.js
- Pandas
- Scikit-learn
- Joblib

## Estrutura do projeto

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
├── tests/
├── requirements.txt
└── README.md
```

## Como executar no Visual Studio Code

### 1. Clonar o projeto

```powershell
git clone https://github.com/Abnerrum/HydroAlert-AI.git
cd HydroAlert-AI
```

### 2. Baixar as alterações e entrar na branch atual

```powershell
git fetch origin
git switch etapas-03-a-06
```

### 3. Criar o ambiente virtual

```powershell
python -m venv .venv
```

### 4. Ativar o ambiente no PowerShell

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 5. Instalar as dependências

```powershell
python -m pip install -r requirements.txt
```

## Etapa 1 — Simulador IoT

Executar cinco ciclos de teste:

```powershell
python -m iot.sensor_simulator --ciclos 5
```

Os dados são gravados em:

```text
data/telemetria.jsonl
```

Cada leitura contém informações como chuva, nível da água, tendência e classificação de risco.

## Etapa 2 — MQTT

O broker utilizado no desenvolvimento é o Eclipse Mosquitto em:

```text
localhost:1883
```

### Terminal 1 — Subscriber

```powershell
python -m iot.mqtt_subscriber
```

### Terminal 2 — Publisher

```powershell
python -m iot.mqtt_publisher --ciclos 10
```

Fluxo:

```text
Publisher → Mosquitto → Subscriber → mqtt_recebido.jsonl
```

## Etapa 3 — MongoDB

O subscriber tenta salvar cada mensagem recebida no banco:

```text
Database:   hydroalert_ai
Collection: telemetria
URI padrão: mongodb://localhost:27017/
```

Se o MongoDB estiver indisponível, o sistema continua salvando os dados no JSONL local.

Documentação detalhada:

```text
docs/ETAPA_03_MONGODB.md
```

## Etapa 4 — FastAPI

Inicie a API:

```powershell
python -m uvicorn api.main:app --reload
```

Acesse:

```text
Dashboard: http://127.0.0.1:8000
Swagger:   http://127.0.0.1:8000/docs
Health:    http://127.0.0.1:8000/health
```

Endpoints principais:

```text
GET /api/sensores
GET /api/telemetria
GET /api/resumo
GET /api/ml/status
GET /api/ml/prever/{sensor_id}
```

## Etapa 5 — Dashboard Web

O Dashboard apresenta:

- quantidade de leituras;
- quantidade de sensores;
- nível médio;
- chuva acumulada;
- maior nível registrado;
- distribuição dos níveis de risco;
- gráfico de nível da água;
- gráfico de chuva;
- filtro por sensor;
- tabela das leituras recentes;
- status do MongoDB;
- status do modelo de Machine Learning.

Para visualizar, mantenha a API rodando e abra:

```text
http://127.0.0.1:8000
```

## Etapa 6 — Data Science e Machine Learning

O primeiro baseline usa **RandomForestRegressor** para estimar o próximo nível da água com base em variáveis como:

- chuva atual;
- nível atual;
- variação do nível;
- cotas de atenção, alerta e nível crítico.

Para gerar uma base maior:

```powershell
python -m iot.mqtt_publisher --ciclos 100 --intervalo 0.2
```

Treinar o modelo:

```powershell
python -m ml.train_model
```

O modelo treinado é salvo localmente em:

```text
models/modelo_nivel.joblib
```

A métrica inicial utilizada é **MAE — Mean Absolute Error**, medida em metros.

## Demonstração completa

Com Mosquitto e MongoDB em execução, abra três terminais.

### Terminal 1

```powershell
python -m iot.mqtt_subscriber
```

### Terminal 2

```powershell
python -m iot.mqtt_publisher --ciclos 100 --intervalo 1
```

### Terminal 3

```powershell
python -m uvicorn api.main:app --reload
```

Depois acesse:

```text
http://127.0.0.1:8000
```

## Testes automatizados

```powershell
python -m unittest discover -s tests -v
```

## Próximas evoluções

A próxima fase do projeto será focada em previsão temporal mais próxima de um cenário real:

1. previsão explícita de risco para 1h, 3h e 6h;
2. mapa interativo com Leaflet e OpenStreetMap;
3. cálculo de áreas expostas;
4. backtesting por evento de chuva;
5. métricas de falso alarme e antecedência do alerta;
6. integração com Power BI;
7. módulo de IA/LLM para apoio à interpretação dos dados;
8. fluxo de revisão humana antes da emissão de alertas.

## Finalidade acadêmica

O HydroAlert AI é um projeto de estudo voltado à integração de **IoT, bancos NoSQL, APIs, visualização de dados, Data Science e Inteligência Artificial** em um cenário de prevenção de inundações urbanas.

---

Desenvolvido como Projeto Integrador — HydroAlert AI.