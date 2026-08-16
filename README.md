# HydroAlert AI

Protótipo acadêmico de **alerta preditivo de inundações urbanas** que integra IoT, MQTT, MongoDB, FastAPI, Dashboard Web, geointeligência e Machine Learning.

> **Aviso:** os sensores, coordenadas e medições atuais são simulados. O projeto não representa um sistema oficial de alerta e não deve ser usado para tomada de decisão operacional real.

## Visão geral

O HydroAlert AI demonstra um fluxo completo de monitoramento hidrometeorológico, desde a geração de dados dos sensores até armazenamento, API, visualização territorial e análise preditiva.

O sistema já consegue:

- simular sensores de chuva e nível da água;
- distribuir uma rede acadêmica por vários municípios de Goiás;
- transmitir telemetria em tempo real via MQTT;
- receber e persistir dados em JSONL e MongoDB;
- disponibilizar os dados por uma API REST com FastAPI;
- filtrar o sistema por Estado, Município, Região, Bairro e Sensor;
- exibir mapa interativo com Leaflet e OpenStreetMap;
- alternar camadas de Risco, Chuva e Nível no mapa;
- apresentar alertas simulados e detalhes de cada ponto;
- exibir indicadores e gráficos executivos;
- compartilhar temporariamente o Dashboard pela internet com Cloudflare Quick Tunnel;
- preparar os dados para Data Science e Machine Learning.

## Arquitetura atual

```text
Rede simulada de sensores em Goiás
              ↓
      Paho MQTT Publisher
              ↓
     Eclipse Mosquitto :1883
              ↓
      Paho MQTT Subscriber
           ↙        ↘
     JSONL local    MongoDB :27017
                        ↓
                     FastAPI
                        ↓
           API territorial /api/painel
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
| 3 | MongoDB | ✅ Validada |
| 4 | FastAPI | ✅ Validada |
| 5 | Dashboard Web | ✅ Validada |
| 6 | Data Science + Machine Learning | 🧪 Baseline implementado — treino e validação pendentes |
| 7 | Previsão de 1h, 3h e 6h | ⏳ Planejada |
| 8 | Mapa territorial Leaflet/OpenStreetMap | ✅ Protótipo implementado |
| 9 | Alertas inteligentes / LLM | ⏳ Planejada |
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
- Leaflet
- OpenStreetMap
- Pandas
- Scikit-learn
- Joblib
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

### Terminal 1 — Subscriber MQTT + MongoDB

```powershell
python -m iot.mqtt_subscriber
```

### Terminal 2 — Publisher da rede simulada

```powershell
python -m iot.mqtt_publisher --ciclos 10 --intervalo 0.5
```

### Terminal 3 — FastAPI + Centro de Operações

```powershell
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Acesse:

```text
Dashboard: http://127.0.0.1:8000
Swagger:   http://127.0.0.1:8000/docs
Health:    http://127.0.0.1:8000/health
```

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

## Testes automatizados

```powershell
python -m unittest discover -s tests -v
```

## Próximas evoluções

1. finalizar e validar o modelo de Machine Learning;
2. previsão de nível/risco para 1h, 3h e 6h;
3. mapa de calor e manchas simuladas de inundação;
4. polígonos municipais e bairros no mapa;
5. alertas automáticos por severidade e região;
6. integração acadêmica com fontes públicas de clima e chuva;
7. revisão humana para alertas críticos;
8. Power BI e backtesting por evento de chuva.

---

**Projeto Integrador — HydroAlert AI**
