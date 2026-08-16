# Guia Completo — Execução, Testes e Compartilhamento do HydroAlert AI

Este documento registra o fluxo que foi implementado e validado no **HydroAlert AI**, desde a preparação do ambiente até a publicação temporária do Dashboard pela internet.

> **Importante:** o projeto é acadêmico. Os sensores, coordenadas, medições e classificações de risco são simulados e não substituem alertas oficiais da Defesa Civil, CEMADEN ou outros órgãos públicos.

## 1. O que já foi implementado

### Etapa 1 — Simulador IoT ✅ Validada

Foram criados sensores simulados em Python para gerar dados hidrometeorológicos, incluindo:

- chuva em milímetros;
- nível da água em metros;
- variação do nível;
- tendência do nível;
- cotas de atenção, alerta e crítica;
- classificação de risco.

Executar cinco ciclos:

```powershell
python -m iot.sensor_simulator --ciclos 5
```

Os dados também são gravados em:

```text
data/telemetria.jsonl
```

---

### Etapa 2 — MQTT + Eclipse Mosquitto ✅ Validada

Foi implementada comunicação MQTT entre os sensores simulados e o receptor da aplicação.

Fluxo:

```text
Sensores simulados
      ↓
Paho MQTT Publisher
      ↓
Eclipse Mosquitto :1883
      ↓
Paho MQTT Subscriber
      ↓
data/mqtt_recebido.jsonl
```

Verificar/iniciar o broker Mosquitto no Windows:

```powershell
& "C:\Program Files\mosquitto\mosquitto.exe" -v
```

> Se aparecer erro informando que a porta `1883` já está em uso, verifique se o Mosquitto já está rodando como serviço do Windows.

```powershell
Get-Service mosquitto
```

Terminal do subscriber:

```powershell
python -m iot.mqtt_subscriber
```

Terminal do publisher:

```powershell
python -m iot.mqtt_publisher --ciclos 10
```

Quando estiver funcionando, o subscriber exibirá mensagens `RECEBIDO` e o publisher exibirá mensagens `PUBLICADO`.

---

### Etapa 3 — MongoDB ✅ Validada

Foi instalado o MongoDB Community Server e integrado ao subscriber MQTT.

Instalação pelo PowerShell como Administrador:

```powershell
winget install --id MongoDB.Server -e --accept-source-agreements --accept-package-agreements
```

Verificar o serviço:

```powershell
Get-Service MongoDB
```

Resultado esperado:

```text
Running  MongoDB  MongoDB Server (MongoDB)
```

Testar a porta padrão:

```powershell
Test-NetConnection localhost -Port 27017
```

Resultado importante:

```text
TcpTestSucceeded : True
```

Configuração utilizada pelo HydroAlert:

```text
URI:        mongodb://localhost:27017/
Database:   hydroalert_ai
Collection: telemetria
```

Testar a conexão do Python:

```powershell
python -c "from database.mongodb import preparar_banco, status_mongodb; preparar_banco(); print(status_mongodb())"
```

Consultar a quantidade de documentos:

```powershell
python -c "from database.mongodb import contar_documentos; print('Documentos no MongoDB:', contar_documentos())"
```

O subscriber salva os dados no MongoDB e mantém o JSONL como apoio/fallback.

---

### Etapa 4 — FastAPI ✅ Validada

A API conecta o banco de dados, o Dashboard Web e os módulos de Machine Learning.

Iniciar a aplicação:

```powershell
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Quando estiver funcionando, o terminal mostrará:

```text
Started server process
Application startup complete
Uvicorn running on http://127.0.0.1:8000
```

Acessos locais:

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

Se aparecer `WinError 10048`, a porta `8000` já está sendo utilizada por outra instância do Uvicorn.

Verificar:

```powershell
Get-NetTCPConnection -LocalPort 8000
```

Nesse caso, não é necessário iniciar outro servidor se o Dashboard já estiver abrindo normalmente.

---

### Etapa 5 — Dashboard Web ✅ Validada

O Dashboard Web foi integrado à FastAPI e ao MongoDB.

A tela apresenta:

- status `API + MongoDB online`;
- quantidade de registros analisados;
- chuva média;
- nível máximo da água;
- risco atual;
- filtro por sensor;
- gráfico do nível da água;
- gráfico de chuva;
- tabela de telemetria recente;
- atualização dos dados pela API.

Para abrir localmente:

```text
http://127.0.0.1:8000
```

---

### Etapa 6 — Data Science e Machine Learning 🧪 Implementada, validação pendente

Foi implementado um primeiro baseline com `RandomForestRegressor`.

O modelo usa dados como:

- chuva atual;
- nível atual;
- variação do nível;
- cotas de atenção, alerta e crítica.

Gerar uma base maior:

```powershell
python -m iot.mqtt_publisher --ciclos 100 --intervalo 0.2
```

Treinar:

```powershell
python -m ml.train_model
```

Artefato gerado localmente:

```text
models/modelo_nivel.joblib
```

A métrica inicial é MAE — Mean Absolute Error, em metros.

---

## 2. Preparação do projeto no Visual Studio Code

### Clonar o repositório

```powershell
git clone https://github.com/Abnerrum/HydroAlert-AI.git
cd HydroAlert-AI
```

### Trabalhar na branch principal

```powershell
git switch main
git pull origin main
```

### Criar o ambiente virtual

```powershell
python -m venv .venv
```

### Ativar no PowerShell

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Também é possível usar:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### Instalar as bibliotecas

```powershell
python -m pip install -r requirements.txt
```

### Rodar os testes automatizados

```powershell
python -m unittest discover -s tests -v
```

---

## 3. Execução completa para demonstração

Antes de iniciar, confirme:

```powershell
Get-Service MongoDB
Get-Service mosquitto
```

Abra terminais separados no VS Code.

### Terminal 1 — Subscriber MQTT + MongoDB

```powershell
python -m iot.mqtt_subscriber
```

Mantenha aberto.

### Terminal 2 — Publisher dos sensores

```powershell
python -m iot.mqtt_publisher --ciclos 100 --intervalo 1
```

Para um teste menor:

```powershell
python -m iot.mqtt_publisher --ciclos 10
```

### Terminal 3 — FastAPI + Dashboard

```powershell
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Depois abra:

```text
http://127.0.0.1:8000
```

---

## 4. Compartilhar o Dashboard pela internet

O endereço `127.0.0.1:8000` funciona apenas no próprio computador.

Para compartilhar temporariamente com professor, colegas ou equipe, foi utilizado **Cloudflare Quick Tunnel**.

### Opção A — instalar pelo winget

```powershell
winget install --id Cloudflare.cloudflared -e
```

Se o terminal reconhecer o comando:

```powershell
cloudflared --version
```

inicie o túnel:

```powershell
cloudflared tunnel --url http://127.0.0.1:8000
```

### Opção B — se o Windows não reconhecer `cloudflared`

Criar uma pasta local:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\cloudflared" | Out-Null
```

Baixar o executável:

```powershell
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "$env:USERPROFILE\cloudflared\cloudflared.exe"
```

Testar:

```powershell
& "$env:USERPROFILE\cloudflared\cloudflared.exe" --version
```

Criar o Quick Tunnel:

```powershell
& "$env:USERPROFILE\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
```

O terminal exibirá uma mensagem semelhante a:

```text
Your quick Tunnel has been created! Visit it at:
https://nome-aleatorio.trycloudflare.com
```

Esse endereço `https://...trycloudflare.com` é o link que pode ser compartilhado.

### Atenção sobre o link público

- o Quick Tunnel é temporário;
- o endereço pode mudar quando o túnel for reiniciado;
- o computador precisa permanecer ligado;
- o FastAPI precisa continuar rodando na porta `8000`;
- o terminal do `cloudflared` precisa permanecer aberto;
- para uso permanente/produção deve ser utilizada uma hospedagem ou um túnel configurado com conta/domínio.

Fluxo de compartilhamento:

```text
Navegador de outra pessoa
          ↓
https://xxxxx.trycloudflare.com
          ↓
Cloudflare Quick Tunnel
          ↓
http://127.0.0.1:8000
          ↓
FastAPI + Dashboard
          ↓
MongoDB
```

---

## 5. Sincronização entre Visual Studio Code e GitHub

O repositório local está conectado a:

```text
https://github.com/Abnerrum/HydroAlert-AI.git
```

Verificar:

```powershell
git remote -v
```

### Trazer alterações do GitHub para o VS Code

```powershell
git switch main
git pull origin main
```

### Enviar alterações do VS Code para o GitHub

```powershell
git add .
git commit -m "Atualiza HydroAlert AI"
git push origin main
```

### Conferir o estado

```powershell
git status
```

Resultado ideal:

```text
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## 6. Problemas encontrados e soluções

### `fatal: not a git repository`

A pasta usada inicialmente tinha sido baixada como ZIP. A solução foi clonar o repositório com `git clone`.

### PowerShell bloqueando `Activate.ps1`

Usar no terminal atual:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Mosquitto: porta 1883 já em uso

Significa que outro processo, normalmente o próprio serviço do Mosquitto, já está utilizando a porta.

```powershell
Get-Service mosquitto
```

### `Get-Service MongoDB` não encontra o serviço

MongoDB ainda não estava instalado. Foi resolvido com:

```powershell
winget install --id MongoDB.Server -e --accept-source-agreements --accept-package-agreements
```

### Uvicorn: `WinError 10048`

A porta 8000 já está ocupada por outro processo.

```powershell
Get-NetTCPConnection -LocalPort 8000
```

### `cloudflared` não reconhecido

O executável foi baixado manualmente e executado pelo caminho completo:

```powershell
& "$env:USERPROFILE\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
```

### VS Code não consegue abrir automaticamente o link do Quick Tunnel

Isso não significa que o túnel falhou. Copie manualmente o endereço `https://...trycloudflare.com` mostrado no terminal e cole no navegador.

---

## 7. Próximas etapas planejadas

### Etapa 6 — finalizar e validar Machine Learning

- gerar mais histórico;
- treinar o Random Forest;
- medir MAE;
- analisar qualidade da previsão;
- exibir previsão no Dashboard.

### Etapa 7 — previsão para 1h, 3h e 6h

- modelos de previsão temporal;
- risco futuro por horizonte;
- nível previsto;
- confiança/métrica do modelo.

### Etapa 8 — mapa interativo

- Leaflet;
- OpenStreetMap;
- localização dos sensores;
- marcadores por nível de risco.

### Etapa 9 — alertas inteligentes

- alertas automáticos por chuva, nível e previsão;
- regras para BAIXO, MODERADO, ALTO e CRÍTICO;
- apoio de IA/LLM para interpretação dos dados.

### Etapa 10 — revisão humana

- confirmação de alertas críticos;
- registro de decisão do operador;
- auditoria.

### Etapa 11 — Power BI e backtesting

- indicadores históricos;
- análise por evento de chuva;
- falsos positivos e falsos negativos;
- antecedência dos alertas;
- avaliação do desempenho do sistema.

---

## 8. Arquitetura atual validada

```text
Sensores simulados Python
          ↓
Paho MQTT Publisher
          ↓
Eclipse Mosquitto
          ↓
Paho MQTT Subscriber
       ↙          ↘
JSONL local      MongoDB
                    ↓
                 FastAPI
                    ↓
               Dashboard
                    ↓
            Machine Learning

Compartilhamento de teste:
Dashboard local → Cloudflare Quick Tunnel → Link público temporário
```

---

**Projeto Integrador — HydroAlert AI**
