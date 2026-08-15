# Etapa 3 — MongoDB

## Objetivo

Persistir no MongoDB as mensagens recebidas pelo subscriber MQTT. O arquivo `data/mqtt_recebido.jsonl` continua existindo como trilha local e fallback.

Fluxo:

```text
Publisher MQTT
    ↓
Mosquitto
    ↓
Subscriber
    ├──→ data/mqtt_recebido.jsonl
    └──→ MongoDB / hydroalert_ai / telemetria
```

## 1. Instalar MongoDB Community no Windows

Use o instalador oficial do MongoDB Community e marque a opção para instalar o MongoDB como serviço do Windows. O serviço padrão se chama `MongoDB` e normalmente usa a porta `27017`.

O `mongosh` é instalado separadamente se você quiser usar o shell do MongoDB.

## 2. Confirmar o serviço

No PowerShell:

```powershell
Get-Service MongoDB
```

Se estiver parado, abra o PowerShell como Administrador e use:

```powershell
Start-Service MongoDB
```

## 3. Instalar dependências do projeto

```powershell
python -m pip install -r requirements.txt
```

## 4. Executar o subscriber

Com Mosquitto e MongoDB rodando:

```powershell
python -m iot.mqtt_subscriber
```

O início esperado é:

```text
MongoDB conectado. Telemetria sera persistida no banco NoSQL.
Conectando ao broker MQTT em localhost:1883...
```

Depois execute em outro terminal:

```powershell
python -m iot.mqtt_publisher --ciclos 20
```

Cada mensagem deverá mostrar `Persistencia: MongoDB`.

## Configuração

Os valores padrão são:

```text
MONGO_URI=mongodb://localhost:27017/
MONGO_DATABASE=hydroalert_ai
MONGO_COLLECTION=telemetria
```

Eles podem ser sobrescritos por variáveis de ambiente. Consulte `.env.example`.

## Resiliência

Se o MongoDB estiver indisponível, o subscriber não para. A mensagem é mantida em `data/mqtt_recebido.jsonl` e a API também consegue usar JSONL como fallback.

## Critério de conclusão

- MongoDB em execução;
- subscriber conectado ao broker MQTT;
- mensagens publicadas e recebidas;
- registros inseridos na collection `hydroalert_ai.telemetria`;
- fallback JSONL funcionando quando o banco estiver desligado.
