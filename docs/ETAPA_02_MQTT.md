# Etapa 2 — MQTT com Eclipse Mosquitto e Paho MQTT

## Objetivo

Fazer os sensores simulados da Etapa 1 enviarem telemetria por MQTT em tempo real.

Fluxo desta etapa:

```text
Sensores simulados (Python)
        ↓
Publisher Paho MQTT
        ↓
Eclipse Mosquitto (broker local)
        ↓
Subscriber Paho MQTT
        ↓
data/mqtt_recebido.jsonl
```

## 1. Atualizar dependências Python

Com o ambiente virtual ativo:

```powershell
python -m pip install -r requirements.txt
```

A Etapa 2 usa `paho-mqtt`.

## 2. Instalar o Eclipse Mosquitto no Windows

Baixe o instalador oficial para Windows em:

https://mosquitto.org/download/

Para um Windows 64 bits, use o instalador x64 disponível na página oficial.

O caminho padrão costuma ser:

```text
C:\Program Files\mosquitto
```

## 3. Testar o broker

Abra um NOVO terminal PowerShell e execute:

```powershell
& "C:\Program Files\mosquitto\mosquitto.exe" -v
```

Deixe esse terminal aberto.

Para o nosso MVP, o broker será usado apenas localmente em `localhost:1883`.

Se aparecer um erro informando que a porta `1883` já está em uso, o Mosquitto pode já estar executando como serviço do Windows. Nesse caso, não abra uma segunda instância e siga para o subscriber.

## 4. Abrir o subscriber

Abra outro terminal do VS Code, ative o `.venv` e execute:

```powershell
python -m iot.mqtt_subscriber
```

Resultado esperado:

```text
Conectado ao broker. Assinando: hydroalert/telemetria/+
Aguardando telemetria. Use Ctrl+C para encerrar.
```

O subscriber também aceita outro endereço e porta de broker:

```powershell
python -m iot.mqtt_subscriber --broker localhost --porta 1883
```

## 5. Abrir o publisher

Abra um terceiro terminal do VS Code e execute:

```powershell
python -m iot.mqtt_publisher --ciclos 10
```

O publisher gera os dados dos sensores e publica em tópicos como:

```text
hydroalert/telemetria/GYN-SIM-001
hydroalert/telemetria/GYN-SIM-002
hydroalert/telemetria/GYN-SIM-003
```

Também é possível configurar broker, porta e intervalo:

```powershell
python -m iot.mqtt_publisher --broker localhost --porta 1883 --intervalo 2 --ciclos 10
```

## 6. Resultado esperado

No terminal do publisher:

```text
PUBLICADO | hydroalert/telemetria/GYN-SIM-001 | Chuva: 5.20 mm | Nivel: 1.204 m | Risco: BAIXO
```

No terminal do subscriber:

```text
RECEBIDO | hydroalert/telemetria/GYN-SIM-001 | Sensor: GYN-SIM-001 | Chuva: 5.2 mm | Nivel: 1.204 m | Risco: BAIXO
```

As mensagens recebidas também serão salvas em:

```text
data/mqtt_recebido.jsonl
```

Cada linha do arquivo representa uma leitura JSON completa recebida pelo subscriber.

## 7. Testes automatizados

Execute:

```powershell
python -m unittest discover -s tests -v
```

Os testes da Etapa 2 verificam:

- montagem do tópico MQTT de cada sensor;
- serialização do payload JSON;
- uso do QoS configurado;
- inscrição do subscriber no tópico `hydroalert/telemetria/+`;
- gravação do arquivo JSONL;
- rejeição de mensagens inválidas.

## 8. Atalhos no Windows

Subscriber:

```text
run_mqtt_subscriber.bat
```

Publisher (10 ciclos):

```text
run_mqtt_publisher.bat
```

## Solução de problemas

### `ConnectionRefusedError`

Confirme se o Mosquitto está executando e se a porta é `1883`.

### `No module named paho`

Execute:

```powershell
python -m pip install -r requirements.txt
```

### Publisher envia, mas subscriber não recebe

Confirme se os dois estão usando o mesmo broker e a mesma porta. O subscriber deve estar aberto antes do publisher para visualizar toda a demonstração.

### Arquivo `mqtt_recebido.jsonl` não apareceu

O arquivo só é criado depois que pelo menos uma mensagem MQTT válida é recebida.

## Critério de conclusão

A Etapa 2 estará validada quando:

- o broker Mosquitto estiver em execução;
- o subscriber conectar ao broker;
- o publisher publicar as mensagens;
- o subscriber receber as mesmas mensagens;
- `data/mqtt_recebido.jsonl` for criado com os dados recebidos;
- os testes automatizados forem executados sem erro.

Depois disso, o subscriber será evoluído na Etapa 3 para persistir a telemetria em MongoDB.
