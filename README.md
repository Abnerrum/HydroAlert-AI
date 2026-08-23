# HydroAlert AI v2

Protótipo acadêmico de **alerta preditivo de inundações urbanas** com integração de IoT, MQTT, NoSQL, Data Science, Business Intelligence e revisão humana.

> **Uso acadêmico.** Sensores, coordenadas, cotas, manchas e parte da base incluída no projeto são simulados. O sistema não é um serviço oficial de alerta e não deve ser utilizado para decisões de segurança pública.

## O que mudou na versão 2

A versão foi revisada para ficar mais coerente com o Relatório Inicial do Projeto Integrador. Agora o projeto inclui:

- relógio hidrológico simulado de 15 minutos por ciclo;
- chuva acumulada em 15 min, 1h, 3h, 6h e 24h;
- intensidade de precipitação, tendência e distância até as cotas;
- previsão de nível e risco para 1h, 3h e 6h;
- incerteza aproximada das previsões do Random Forest;
- lead time estimado;
- alertas atuais e preditivos;
- escala operacional Normal, Atenção, Alerta e Emergência;
- revisão humana obrigatória para alertas críticos/emergência;
- avaliação de qualidade dos dados;
- backtesting temporal com MAE, precision, recall, F1 e taxa de falsos alarmes;
- área exposta estimada nas manchas simuladas;
- exportação ampliada para Power BI;
- API com indicadores de governança e validação, pronta para evolução do dashboard;
- catálogo de Open-Meteo, CEMADEN, ANA/Hidroweb, INMET e CIMEHGO.

## Arquitetura

```text
Sensores simulados / fontes públicas
                ↓
             MQTT
                ↓
      JSONL + MongoDB / NoSQL
                ↓
       Qualidade + indicadores
                ↓
    Data Science / ML 1h 3h 6h
                ↓
      Risco + lead time + alerta
                ↓
      FastAPI + Dashboard + Mapa
                ↓
     Power BI + Revisão Humana
```

## Tecnologias

- Python 3
- FastAPI / Uvicorn
- Paho MQTT / Eclipse Mosquitto
- MongoDB / PyMongo
- Pandas
- Scikit-learn / Random Forest
- Joblib
- HTML, CSS e JavaScript
- Chart.js
- Leaflet + OpenStreetMap
- Power BI via exportação CSV
- Docker Desktop / Docker Compose
- Git / GitHub

## Estrutura principal

```text
api/                 FastAPI e endpoints
dashboard/           Centro de operações web
database/            MongoDB
iot/                 simulador, publisher e subscriber MQTT
ml/                  features, treino e inferência
services/            alertas, indicadores, qualidade, território e backtesting
data/                 telemetria acadêmica
models/               artefato do modelo
docker/               configuração do broker Mosquitto
docs/                 documentação técnica
tests/                testes automatizados
Dockerfile            imagem Python/FastAPI
docker-compose.yml    orquestra API, MongoDB, MQTT e ML
```

## Instalação no Windows / VS Code

No PowerShell:

```powershell
git clone https://github.com/Abnerrum/HydroAlert-AI.git
cd HydroAlert-AI
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Execução recomendada com Docker Desktop

Com o Docker Desktop aberto e o Engine em execução, o projeto pode subir sem instalar MongoDB ou Mosquitto manualmente no Windows.

### Primeira preparação da demonstração

Depois de clonar ou atualizar o repositório, execute no PowerShell:

```powershell
git pull
.\PREPARAR_DOCKER_DEMO.bat
```

Esse processo:

1. constrói a imagem Python do HydroAlert;
2. inicia Eclipse Mosquitto;
3. inicia MongoDB 7;
4. inicia o subscriber MQTT;
5. inicia a API FastAPI;
6. gera 120 ciclos de telemetria simulada;
7. persiste os dados no MongoDB e no volume compartilhado;
8. treina o modelo Random Forest de 1h, 3h e 6h.

Ao final, abra:

```text
Dashboard: http://localhost:8000
Swagger:   http://localhost:8000/docs
Health:    http://localhost:8000/health
ML Status: http://localhost:8000/api/ml/status
```

### Iniciar novamente depois da primeira preparação

```powershell
.\INICIAR_DOCKER.bat
```

Ou diretamente pelo Docker Compose:

```powershell
docker compose up -d --build mosquitto mongo subscriber api
```

### Simulação MQTT contínua

```powershell
docker compose --profile simulacao up -d publisher
```

Para acompanhar a telemetria:

```powershell
docker compose logs -f publisher subscriber
```

### Treinar novamente o modelo

```powershell
docker compose run --rm trainer
```

### Verificar os containers

```powershell
docker compose ps
```

Os serviços possuem healthchecks para MongoDB, Mosquitto e FastAPI. No estado normal, os serviços principais devem aparecer como `Up`/`healthy`.

### Parar o ambiente

```powershell
.\PARAR_DOCKER.bat
```

Ou:

```powershell
docker compose down
```

Esse comando preserva os volumes. Para apagar também MongoDB, telemetria e modelo armazenados nos volumes Docker:

```powershell
docker compose down -v
```

### Portas utilizadas

| Serviço | Porta | Uso |
|---|---:|---|
| FastAPI / Dashboard | 8000 | sistema web e API |
| MongoDB | 27017 | banco NoSQL |
| Eclipse Mosquitto | 1883 | broker MQTT |

## Execução rápida sem MQTT

A forma mais simples para demonstração acadêmica é gerar uma série acelerada e abrir a API:

```powershell
python -m iot.sensor_simulator --ciclos 120 --intervalo 0 --passo-minutos 15 --seed 42
python -m ml.train_model
python -m uvicorn api.main:app --reload --port 8000
```

Abra:

```text
Dashboard: http://127.0.0.1:8000
Swagger:   http://127.0.0.1:8000/docs
Health:    http://127.0.0.1:8000/health
```

### Por que 120 ciclos?

Cada ciclo representa 15 minutos hidrológicos. Assim, 120 ciclos geram aproximadamente 30 horas de histórico simulado sem precisar esperar 30 horas reais.

## Execução completa com MQTT + MongoDB sem Docker

### Terminal 1 — Subscriber

```powershell
python -m iot.mqtt_subscriber
```

### Terminal 2 — Publisher

```powershell
python -m iot.mqtt_publisher --ciclos 120 --intervalo 0.2 --passo-minutos 15
```

### Terminal 3 — Treinamento

```powershell
python -m ml.train_model
```

### Terminal 4 — API e dashboard

```powershell
python -m uvicorn api.main:app --reload --port 8000
```

## Principais endpoints

| Endpoint | Função |
|---|---|
| `/api/painel` | visão territorial completa |
| `/api/telemetria` | telemetria recente |
| `/api/resumo` | KPIs hidrometeorológicos |
| `/api/qualidade-dados` | score de qualidade |
| `/api/ml/status` | status e métricas do modelo |
| `/api/ml/prever-horizontes/{sensor_id}` | previsão 1h/3h/6h |
| `/api/alertas` | alertas atuais e preditivos |
| `/api/revisoes` | histórico de revisão humana |
| `/api/backtesting` | validação temporal e falsos alarmes |
| `/api/power-bi/exportar` | CSV para BI |
| `/api/fontes-publicas` | catálogo de fontes |
| `/api/clima-publico` | consulta Open-Meteo |

## Machine Learning

A versão v2 utiliza um modelo Random Forest por horizonte.

Features principais:

```text
chuva_mm
chuva_acum_15m_mm
chuva_acum_1h_mm
chuva_acum_3h_mm
chuva_acum_6h_mm
chuva_acum_24h_mm
intensidade_chuva_mm_h
nivel_m
variacao_nivel_m
distancia_alerta_m
distancia_critica_m
percentual_cota_critica
cotas operacionais
```

A validação é cronológica: 75% iniciais para treino e 25% finais para teste.

As métricas documentadas nesta versão foram obtidas **somente em telemetria simulada**, portanto não podem ser interpretadas como desempenho real em enchentes.

A validação atual também mostra que o Random Forest ainda **não supera o baseline de persistência em MAE** e possui falsos alarmes relevantes nos horizontes longos. Isso foi mantido de forma explícita como limitação científica e está detalhado em `docs/VALIDACAO_V2.md`.

## Alertas e revisão humana

Escala operacional:

```text
BAIXO     → NORMAL
MODERADO  → ATENÇÃO
ALTO      → ALERTA
CRÍTICO   → EMERGÊNCIA
```

Um alerta pode ser `ATUAL` ou `PREDITIVO`. Emergências exigem revisão humana antes de serem consideradas validadas no fluxo acadêmico.

A API já permite registrar **aprovação ou rejeição**, nome do revisor e justificativa por meio de `POST /api/revisoes`, mantendo o histórico em `data/revisoes.json`. A interface visual de revisão pode ser ampliada em uma próxima evolução do dashboard.

## Power BI

Acesse:

```text
GET /api/power-bi/exportar
```

O CSV contém chuva atual/acumulada, nível, tendência, distância até cotas, percentual da cota crítica, risco e localização.

## Testes e CI

```powershell
python -m unittest discover -s tests -v
```

A versão entregue possui testes para:

- simulador e classificação de risco;
- MQTT;
- telemetria;
- indicadores hidrometeorológicos;
- qualidade dos dados;
- datasets e horizontes de ML;
- alertas preditivos e revisão humana;
- GeoJSON;
- backtesting;
- exportação Power BI.

O repositório também contém GitHub Actions para executar `ruff` e a suíte de testes em Python 3.11 e 3.12.

## Documentação importante

- `docs/ALINHAMENTO_RELATORIO_INICIAL.md`
- `docs/ETAPA_01_IOT.md`
- `docs/ETAPA_02_MQTT.md`
- `docs/ETAPA_03_MONGODB.md`
- `docs/ETAPA_04_FASTAPI.md`
- `docs/ETAPA_05_DASHBOARD.md`
- `docs/ETAPA_06_DATA_SCIENCE_ML.md`
- `docs/ETAPA_08_MAPA_TERRITORIAL.md`
- `docs/ETAPAS_07_A_12_ANALISE_AVANCADA.md`
- `docs/GUIA_COMPLETO_EXECUCAO_E_COMPARTILHAMENTO.md`

## Limitações reais do protótipo

Ainda faltam, para uma evolução de pesquisa aplicada:

1. integração validada com séries oficiais de CEMADEN, ANA/Hidroweb, INMET e CIMEHGO;
2. calibração por bacia/ponto de monitoramento;
3. mapas oficiais de limites e suscetibilidade;
4. manchas calculadas por modelagem hidrológica/hidráulica;
5. autenticação e controle de acesso de revisores;
6. backtesting com eventos históricos reais;
7. homologação com especialistas/Defesa Civil;
8. ensaios de disponibilidade, segurança e escalabilidade;
9. integração visual completa dos novos indicadores de governança no dashboard.

A arquitetura usa componentes associados a cenários de Big Data, mas a base atual é de protótipo acadêmico e não representa volume real de produção.

---

**Projeto Integrador — HydroAlert AI v2**
