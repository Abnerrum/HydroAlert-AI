# HydroAlert AI

Protótipo acadêmico de **alerta preditivo de inundações urbanas** que integra IoT, MQTT, MongoDB, FastAPI, Dashboard Web, geointeligência e Machine Learning.

> **Aviso:** os sensores, coordenadas e medições atuais são simulados. O projeto não representa um sistema oficial de alerta e não deve ser usado para tomada de decisão operacional real.

## Visão geral

O HydroAlert AI demonstra um fluxo completo de monitoramento hidrometeorológico, desde a geração de dados dos sensores até armazenamento, API, visualização territorial e análise preditiva.

O sistema já consegue:

- simular sensores de chuva e nível da água;
- distribuir uma rede acadêmica por vários municípios de Goiás;
- transmitir telemetria em tempo real via MQTT;
- validar automaticamente cada mensagem recebida (schema Pydantic);
- receber e persistir dados em JSONL e MongoDB (com índices otimizados);
- disponibilizar os dados por uma API REST com FastAPI;
- filtrar o sistema por Estado, Município, Região, Bairro e Sensor;
- exibir mapa interativo com Leaflet e OpenStreetMap;
- alternar camadas de Risco, Chuva e Nível no mapa;
- apresentar alertas simulados e detalhes de cada ponto;
- **avaliar alertas automáticos por severidade (MÉDIA, ALTA, CRÍTICA)**;
- **consultar chuva real via Open-Meteo** para os pontos monitorados;
- exibir indicadores e gráficos executivos;
- compartilhar temporariamente o Dashboard pela internet com Cloudflare Quick Tunnel;
- preparar os dados para Data Science e Machine Learning;
- **comparar o modelo de ML com um baseline de persistência** (MAE, RMSE e R²).

## Arquitetura atual

```text
Rede simulada de sensores em Goiás
              ↓
      Paho MQTT Publisher
              ↓
     Eclipse Mosquitto :1883
              ↓
      Paho MQTT Subscriber
       (validação Pydantic)
           ↙        ↘
     JSONL local    MongoDB :27017
                        ↓
                     FastAPI
                        ↓
   API territorial /api/painel + /api/alertas + /api/clima
                        ↓
       Dashboard + Mapa + Filtros + Alertas
                        ↓
               Data Science + ML

Compartilhamento de teste:
Dashboard local → Cloudflare Quick Tunnel → Link público temporário
```

## Status do projeto

| Etapa | Módulo | Status |
|---|---|---|
| 1 | Simulador IoT | ✅ Validada |
| 2 | MQTT + Mosquitto | ✅ Validada |
| 3 | MongoDB | ✅ Validada (índices otimizados) |
| 4 | FastAPI | ✅ Validada |
| 5 | Dashboard Web | ✅ Validada |
| 6 | Data Science + Machine Learning | ✅ Baseline validado contra persistência |
| 7 | Previsão de 1h, 3h e 6h | ⏳ Planejada |
| 8 | Mapa territorial Leaflet/OpenStreetMap | ✅ Protótipo implementado |
| 9 | Alertas inteligentes / LLM | 🧪 Alertas por regras implementados — LLM planejado |
| 10 | Revisão humana | ⏳ Planejada |
| 11 | Power BI + backtesting | ⏳ Planejada |
| 12 | Infraestrutura (CI, Docker, segurança) | ✅ Implementada |

## Tecnologias

- Python 3
- Paho MQTT
- Eclipse Mosquitto
- MongoDB / PyMongo
- FastAPI
- Uvicorn
- Pydantic
- HTML, CSS e JavaScript
- Chart.js
- Leaflet
- OpenStreetMap
- Open-Meteo (clima real, sem chave)
- Pandas
- Scikit-learn
- Joblib
- Docker / Docker Compose
- GitHub Actions (CI com ruff + testes)
- Cloudflare Quick Tunnel
- Git / GitHub

## Documentação

A documentação detalhada está em `docs/`.

- `docs/ETAPA_01_IOT.md`
- `docs/ETAPA_02_MQTT.md`
- `docs/ETAPA_03_MONGODB.md`
- `docs/ETAPA_04_FASTAPI.md`
- `docs/ETAPA_05_DASHBOARD.md`
- `docs/ETAPA_06_DATA_SCIENCE_ML.md`
- `docs/ETAPA_08_MAPA_TERRITORIAL.md`
- **`docs/GUIA_COMPLETO_EXECUCAO_E_COMPARTILHAMENTO.md`** — instalação, execução, Git/GitHub, MongoDB, MQTT, FastAPI e compartilhamento público.

## Instalação rápida no Visual Studio Code

```powershell
git clone https://github.com/Abnerrum/HydroAlert-AI.git
cd HydroAlert-AI
git switch main
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Executar o sistema

### Opção A — Docker Compose (recomendado)

Sobe Mosquitto, MongoDB, Subscriber e API com um comando:

```powershell
docker compose up --build
```

Para incluir o publisher da rede simulada:

```powershell
docker compose --profile simulacao up --build
```

Acesse:

```text
Dashboard: http://127.0.0.1:8000
Swagger:   http://127.0.0.1:8000/docs
```

### Opção B — Execução manual

#### Terminal 1 — Subscriber MQTT + MongoDB

```powershell
python -m iot.mqtt_subscriber
```

#### Terminal 2 — Publisher da rede simulada

```powershell
python -m iot.mqtt_publisher --ciclos 10 --intervalo 0.5
```

#### Terminal 3 — FastAPI + Centro de Operações

```powershell
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Acesse:

```text
Dashboard: http://127.0.0.1:8000
Swagger:   http://127.0.0.1:8000/docs
Health:    http://127.0.0.1:8000/health
```

## Endpoints principais

| Endpoint | Descrição |
|---|---|
| `GET /api/painel` | Painel territorial com filtros hierárquicos |
| `GET /api/telemetria` | Telemetria bruta (MongoDB ou JSONL) |
| `GET /api/resumo` | Indicadores executivos |
| `GET /api/alertas` | Alertas automáticos por severidade e região |
| `GET /api/clima/{sensor_id}` | Chuva real atual via Open-Meteo |
| `GET /api/ml/status` | Status e métricas do modelo (inclui baseline) |
| `GET /api/ml/prever/{sensor_id}` | Previsão do próximo nível |

## Alertas automáticos

O módulo `services/alerts_service.py` avalia as leituras recentes de cada sensor e gera alertas por regras:

- **CRÍTICA** — risco CRÍTICO ou nível acima da cota crítica;
- **ALTA** — risco ALTO ou 2+ leituras consecutivas acima da cota de alerta;
- **MÉDIA** — risco MODERADO ou 3+ leituras consecutivas com nível subindo.

Consulta com filtros:

```text
GET /api/alertas
GET /api/alertas?municipio=Goiania
GET /api/alertas?severidade=CRITICA
```

## Clima real (Open-Meteo)

O endpoint `/api/clima/{sensor_id}` consulta a precipitação real atual nas coordenadas do ponto monitorado, usando a API pública Open-Meteo (gratuita, sem chave). Se a API externa estiver indisponível, o sistema responde `disponivel: false` e continua operando com os dados simulados.

## Segurança e configuração

Toda a configuração pode ser feita por variáveis de ambiente — copie `.env.example` para `.env`:

- **API_TOKEN** — quando definido, todos os endpoints `/api/*` exigem o header `X-API-Key`;
- **CORS_ORIGINS** — origens permitidas no CORS (padrão `*` para o protótipo);
- **MQTT_USERNAME / MQTT_PASSWORD** — autenticação opcional no broker;
- **MONGO_TTL_DIAS** — expiração automática de telemetria antiga;
- **LOG_LEVEL** — nível de log (DEBUG, INFO, WARNING, ERROR).

> Ao expor o dashboard pelo Cloudflare Tunnel, defina `API_TOKEN` para restringir o acesso aos dados da API.

## Central territorial

A interface permite navegar de forma hierárquica:

```text
Brasil
  ↓
Goiás
  ↓
Município
  ↓
Região
  ↓
Bairro
  ↓
Sensor
```

O mapa possui três camadas principais:

- **Risco** — classificação BAIXO, MODERADO, ALTO, CRÍTICO ou SEM DADOS;
- **Chuva** — intensidade simulada da precipitação mais recente;
- **Nível** — comparação do nível atual com as cotas simuladas de atenção, alerta e nível crítico.

A rede acadêmica atual possui pontos simulados em Goiânia, Aparecida de Goiânia, Anápolis, Rio Verde, Luziânia, Trindade e Senador Canedo.

## MongoDB

Instalação pelo PowerShell como Administrador:

```powershell
winget install --id MongoDB.Server -e --accept-source-agreements --accept-package-agreements
```

Verificar:

```powershell
Get-Service MongoDB
Test-NetConnection localhost -Port 27017
```

Configuração padrão:

```text
mongodb://localhost:27017/
Database: hydroalert_ai
Collection: telemetria
```

Índices criados automaticamente pelo subscriber (`preparar_banco`):

- `sensor_id + timestamp` — consultas por sensor;
- `risco` — filtros de alertas;
- `timestamp` — consultas globais recentes;
- `localizacao.municipio + timestamp` — painel territorial por município;
- `recebido_em` (TTL, opcional) — expiração automática via `MONGO_TTL_DIAS`.

## Machine Learning

Treino do modelo:

```powershell
python -m ml.train_model
```

A cada treino o sistema:

1. monta o dataset supervisionado a partir da telemetria;
2. separa treino/teste respeitando a ordem temporal;
3. treina um `RandomForestRegressor`;
4. compara com o **baseline de persistência** ("próximo nível = nível atual");
5. registra MAE, RMSE e R² de ambos em `models/treinos.jsonl`;
6. sinaliza se o modelo superou o baseline (`supera_baseline`).

## Compartilhar o Dashboard pela internet

Com o FastAPI rodando na porta 8000, execute o Cloudflare Quick Tunnel em outro terminal:

```powershell
& "$env:USERPROFILE\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
```

O terminal exibirá um endereço semelhante a:

```text
https://nome-aleatorio.trycloudflare.com
```

Esse link pode ser compartilhado enquanto o FastAPI, o computador e o túnel permanecerem ligados.

> O endereço é temporário e normalmente muda quando um novo Quick Tunnel é criado.
> Recomenda-se definir `API_TOKEN` antes de compartilhar o link.

## Testes automatizados e CI

```powershell
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

O repositório possui GitHub Actions (`.github/workflows/ci.yml`) que executa lint (ruff) e toda a suíte de testes em Python 3.11 e 3.12 a cada push e pull request.

## Sincronização VS Code ↔ GitHub

Trazer alterações do GitHub:

```powershell
git switch main
git pull origin main
```

Enviar alterações locais:

```powershell
git add .
git commit -m "Atualiza HydroAlert AI"
git push origin main
```

## Próximas evoluções

1. previsão de nível/risco para 1h, 3h e 6h;
2. mapa de calor e manchas simuladas de inundação;
3. polígonos municipais e bairros no mapa;
4. alertas inteligentes com LLM e revisão humana para alertas críticos;
5. alimentar o modelo com a chuva real do Open-Meteo;
6. TLS no broker MQTT;
7. Power BI e backtesting por evento de chuva.

---

**Projeto Integrador — HydroAlert AI**
