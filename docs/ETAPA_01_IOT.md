# Etapa 1 — Simulador IoT

## Objetivo

Criar a primeira fonte de dados do HydroAlert AI antes da integração com sensores físicos e MQTT.

Nesta etapa, o sistema simula três pontos de monitoramento em Goiânia/GO e produz telemetria hidrometeorológica em intervalos regulares.

## Dados gerados

Cada leitura contém:

- `sensor_id`;
- nome do ponto;
- timestamp;
- latitude e longitude;
- chuva em milímetros;
- nível da água em metros;
- variação do nível;
- tendência;
- cota de atenção;
- cota de alerta;
- cota crítica;
- classificação de risco;
- status do sensor;
- origem da informação.

## Classificação de risco

A classificação da Etapa 1 é baseada somente nas cotas simuladas:

- BAIXO: nível abaixo da cota de atenção;
- MODERADO: nível igual ou superior à cota de atenção;
- ALTO: nível igual ou superior à cota de alerta;
- CRÍTICO: nível igual ou superior à cota crítica.

Essa regra ainda não representa a IA preditiva. Nas etapas de Data Science, o risco será complementado por previsões de 1h, 3h e 6h, chuva acumulada, tendência temporal e histórico de eventos.

## Persistência local

A telemetria é salva em:

```text
data/telemetria.jsonl
```

O formato JSON Lines facilita a leitura incremental e a migração posterior para MongoDB.

## Execução

```bash
python -m iot.sensor_simulator --ciclos 10
```

Execução contínua:

```bash
python -m iot.sensor_simulator
```

## Testes

```bash
python -m unittest discover -s tests -v
```

## Próxima etapa

A Etapa 2 adicionará MQTT com Eclipse Mosquitto e Paho MQTT.

Fluxo esperado:

```text
Sensor simulado -> MQTT Publisher -> Mosquitto -> MQTT Subscriber -> armazenamento
```

## Observação acadêmica

Todos os dados e coordenadas usados nesta etapa são simulados. O protótipo não deve ser interpretado como sistema oficial de alerta de inundação.
