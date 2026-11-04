# HydroAlert-AI — Documentação técnica: Simulação, dados físicos e dados públicos

**Projeto Integrador | SENAI FATESG | Revisão: 03/11/2026**  
**Escopo:** protótipo acadêmico de monitoramento e alerta preditivo experimental de inundações urbanas em Goiás.

> **IMPORTANTE:** não é uma plataforma oficial de alertas. Os testes apresentados com dados simulados não certificam o funcionamento em situações reais de enchente.

## 1. Objetivo

Demonstrar a arquitetura de aquisição de telemetria hidrometeorológica, persistência NoSQL, processamento, previsão experimental e visualização, diferenciando dados gerados por simulação, leituras medidas em hardware físico e consultas a serviços públicos externos.

## 2. Tipos e origem dos dados

| Grupo | Origem | Exemplo | Estado verificado | Como identificar |
|---|---|---|---|---|
| Simulação acadêmica | `iot/sensor_simulator.py` e `iot/mqtt_publisher.py` | chuva, nível, cotas, tendência, risco e localização demonstrativa | execução de 120 ciclos e treino informados nos prints da demonstração local | `origem: "SIMULACAO_ACADEMICA"`, `sensor_id` contendo `-SIM-` |
| Medição física de bancada | ESP32 + HC-SR04 + DHT11 | distância até a água, nível estimado, temperatura e umidade | firmware criado; aquisição física **não comprovada** nos prints enviados | `origem: "ESP32_REAL_LAB"`, `sensor_id: "ESP32-LAB-001"` |
| Fonte meteorológica externa | `services/public_data_service.py` | consulta de precipitação atual e previsão horária via Open-Meteo | código de consulta implementado, não equivale a histórico importado no MongoDB | resposta com `fonte: "Open-Meteo"` |
| Fontes hidrológicas públicas planejadas | CEMADEN, ANA/Hidroweb, INMET e CIMEHGO | pluviometria, nível/vazão, históricos e monitoramento regional | listadas no catálogo; integração **planejada**, não operacional | ainda não há contrato de persistência padronizado |

**Dado físico não significa automaticamente dado validado.** Uma leitura do ESP32 só deve ser descrita como "medida" após verificação do sensor e sua recepção; ela permanece não calibrada até comparação com referência conhecida. Dados externos publicados por terceiros também exigem fonte, timestamp, licença, unidade e validação de qualidade.

## 3. Simulação acadêmica

### 3.1 Motivação

O protótipo necessita de histórico para exercitar a arquitetura mesmo sem pluviômetros e réguas hidrométricas instalados. A simulação reproduz matematicamente cenários artificiais de chuva, mudança de nível, classificação de risco e alertas. Não representa eventos históricos observados.

### 3.2 Algoritmo

O módulo `iot/sensor_simulator.py`:

1. Escolhe uma precipitação não negativa para cada ciclo.
2. Atualiza o nível anterior por uma relação simplificada entre chuva, drenagem e ruído aleatório.
3. Calcula `variacao_nivel_m` e `tendencia`.
4. Compara o nível às cotas **simuladas** de atenção, alerta e crítica.
5. Anexa horário, identificação e metadados de localização **aproximados e demonstrativos**.
6. Persiste uma trilha JSONL e, pelo publisher, publica via MQTT.

Classificação simplificada:

- `BAIXO`: abaixo da cota de atenção;
- `MODERADO`: a partir da cota de atenção;
- `ALTO`: a partir da cota de alerta;
- `CRITICO`: a partir da cota crítica.

### 3.3 Linha do tempo da demonstração

O comando utilizado no preparador gera 120 ciclos simulados com passo hidrológico de 15 minutos, aproximadamente **30 horas de tempo simulado**. O argumento `--intervalo 0.05` acelera a execução em tempo real; portanto, timestamps simulados não devem ser confundidos com observações feitas naquele instante.

```powershell
docker compose up -d --build mosquitto mongo subscriber api
docker compose run --rm publisher python -m iot.mqtt_publisher --ciclos 120 --intervalo 0.05 --passo-minutos 15 --seed 42
docker compose run --rm trainer
docker compose ps
```

Para demonstração contínua com **dados simulados**:

```powershell
docker compose --profile simulacao up -d publisher
```

Essa etapa não coleta dados do ESP32. As informações artificiais devem aparecer com origem simulada.

## 4. Hardware IoT — dados físicos de bancada

### 4.1 Componentes

- ESP32: aquisição e transmissão de telemetria por Wi-Fi/MQTT;
- HC-SR04 (modelo aparente): medida da distância à superfície da água;
- DHT11 (modelo aparente): temperatura e umidade relativa;
- Protoboard, jumpers e alimentação USB.

**A fiação precisa ser confirmada fisicamente antes de energizar.** O sinal ECHO de módulos HC-SR04 alimentados a 5 V precisa ser reduzido a 3,3 V antes de chegar ao ESP32. A eletrônica não pode entrar em contato com água.

### 4.2 Transformação da medida

```text
nivel_m = max(0, (altura_referencia_cm - distancia_cm) / 100)
```

Exemplo **fictício de bancada**, com altura de referência calibrada em 50 cm:

| Distância sensor–água | Nível estimado | Classificação didática |
|---:|---:|---|
| 50 cm | 0 cm | BAIXO |
| 28 cm | 22 cm | MODERADO |
| 18 cm | 32 cm | ALTO |
| 8 cm | 42 cm | CRITICO |

As cotas didáticas do firmware são 20, 30 e 40 cm. **Não são cotas oficiais de rios nem parâmetros de Defesa Civil.**

### 4.3 O que o hardware NÃO mede

- O DHT11 **não** mede precipitação.
- O HC-SR04 **não** mede chuva nem vazão, apenas distância.
- O hardware fotografado não contém pluviômetro comprovado.

O firmware atual envia `"chuva_mm": 0` **somente por compatibilidade com o schema legado**, junto com `"chuva_medida": false`. Esse zero **não significa ausência de chuva**. Dados assim não podem alimentar cálculos de chuva acumulada ou treinar modelos que assumem precipitação observada; será necessário corrigir o pipeline ou filtrar esses registros.

### 4.4 Exemplo didático de payload (não é leitura observada)

```json
{
  "sensor_id": "ESP32-LAB-001",
  "timestamp": "2026-11-03T20:00:00-03:00",
  "origem": "ESP32_REAL_LAB",
  "status_sensor": "ONLINE",
  "nivel_m": 0.32,
  "distancia_cm": 18.0,
  "altura_referencia_cm": 50.0,
  "temperatura_c": 28.0,
  "umidade_pct": 78.0,
  "chuva_mm": 0,
  "chuva_medida": false,
  "risco": "ALTO"
}
```

Valores e horário acima são inventados para documentar o formato.

### 4.5 Integração prevista

```text
ESP32 + sensores físicos
    → Wi-Fi (rede local privada)
    → MQTT Mosquitto: hydroalert/telemetria/ESP32-LAB-001
    → iot/mqtt_subscriber.py (validação Pydantic)
    → MongoDB / hydroalert_ai / telemetria
      + fallback JSONL
    → GET /api/telemetria?sensor_id=ESP32-LAB-001
    → Dashboard, após mapeamento específico da estação
```

O cadastro territorial do mapa ainda apresenta pontos simulados; **a estação física não entra automaticamente no mapa**. A recepção MQTT foi preparada, mas o teste ponta a ponta com o ESP32 real depende de carregamento do firmware, configuração de Wi-Fi/IP e observação de leituras recebidas.

Instruções de hardware: [ESP32_HARDWARE_REAL.md](ESP32_HARDWARE_REAL.md).

## 5. Banco de dados, API e rastreabilidade

Os dados recebidos por MQTT passam por `iot/mqtt_subscriber.py` e são salvos em:

- **MongoDB:** banco `hydroalert_ai`, coleção `telemetria`;
- **Fallback JSONL:** `data/mqtt_recebido.jsonl`, quando há falha no banco;
- **Simulador direto:** `data/telemetria.jsonl`.

Rotas úteis:

| Endpoint | Utilidade |
|---|---|
| `/health` | API e status de MongoDB/ML |
| `/api/telemetria?sensor_id=ESP32-LAB-001` | buscar leituras do ESP32 |
| `/api/telemetria` | registros recentes |
| `/api/ml/status` | status de treino, validação e métricas |
| `/api/painel` | visão territorial |
| `/api/clima-publico?latitude=-16.6869&longitude=-49.2648` | consulta externa à Open-Meteo |

Na exportação e análise, preservar: `sensor_id`, `origem`, `timestamp`, unidade, fonte, local, confiabilidade e, sempre que possível, versão de calibração. **Não agregar simulações e medições físicas sem separação explícita.**

## 6. Machine Learning e limitações

O sistema usa modelos Random Forest para horizontes de 1 h, 3 h e 6 h. O treinamento observado nos prints do terminal concluiu com sucesso, mas sobre dados que não comprovam desempenho em enchentes reais.

Na saída `/api/ml/status` mostrada em 03/11/2026:

| Horizonte | MAE modelo (m) | MAE persistência (m) | Supera baseline? |
|---|---:|---:|---|
| 1h | 0,1752 | 0,0993 | Não |
| 3h | 0,2846 | 0,2174 | Não |
| 6h | 0,3717 | 0,3669 | Não |

O MAE é o erro médio absoluto; **menor é melhor**. Os modelos treinados não superaram o baseline simples. As taxas de falso alarme informadas nos prints foram aproximadamente 6,38%, 13,19% e 31,58% para 1, 3 e 6 horas, respectivamente, nas respectivas amostras de teste. Esses percentuais se referem à validação no protótipo, não a uma rede operacional.

A análise deve evitar vazamento temporal, separar treino e teste cronologicamente, conferir frequência das amostras e não treinar dados simulados como se fossem eventos naturais medidos.

## 7. Critérios de validação experimental

### 7.1 Demonstração simulada — evidências já apresentadas

- [x] Imagens Docker de API/subscriber construídas;
- [x] MongoDB e Mosquitto `healthy`;
- [x] API `healthy` e subscriber iniciado;
- [x] Preparador de demonstração concluído;
- [x] Modelo treinado e `treinado: true` na API;
- [ ] Dashboard visual confirmado após correção de `/assets` (a validar no notebook).

### 7.2 Hardware físico — pendências reais

- [ ] Conferir pinagem ECHO/TRIG/DHT e divisor de tensão;
- [ ] Compilar e gravar firmware na placa;
- [ ] Confirmar Wi-Fi e sincronização de horário;
- [ ] Confirmar publicação MQTT em rede privada;
- [ ] Confirmar recebimento pelo subscriber e persistência no MongoDB;
- [ ] Conferir leituras na API filtrando `ESP32-LAB-001`;
- [ ] Comparar níveis com régua ou referência de medição;
- [ ] Testar falhas de sensor e reconexão;
- [ ] Isolar dados físicos de métricas de chuva e do treinamento inadequado;
- [ ] Registrar local, data, autor, resultados e limitações do ensaio.

### 7.3 Modelo de relatório de ensaio

| Campo | Registro a preencher |
|---|---|
| Data/hora da coleta | Pendente |
| Identificador do ESP32 | ESP32-LAB-001 |
| Local e montagem | Pendente |
| Altura real de referência | Pendente |
| Distância de referência manual | Pendente |
| Distância reportada pelo HC-SR04 | Pendente |
| Erro absoluto (cm) | Pendente |
| Temperatura / umidade observadas | Pendente |
| Recepção MQTT / MongoDB | Pendente |
| Observações / falhas | Pendente |

## 8. Recomendações científicas e de segurança

1. Utilizar simulação para demonstrar tecnologia, nunca para comprovar capacidade de alerta operacional.
2. Identificar os registros físicos por origem, sensor, calibração e unidade.
3. Integrar pluviometria real antes de usar chuva como entrada de IA de campo.
4. Confrontar dados físicos com instrumento de referência e dados públicos de origem identificável.
5. Não tratar alertas críticos como válidos automaticamente: manter revisão humana.
6. Não expor o broker MQTT anônimo na internet; proteger autenticação, rede e credenciais.
7. Avaliar previsões com eventos históricos reais e comparar com baselines antes de qualquer implantação.

## 9. Referências internas do código

- `iot/sensor_simulator.py`
- `iot/mqtt_publisher.py`
- `iot/mqtt_subscriber.py`
- `iot/schemas.py`
- `iot/esp32/hydroalert_esp32.ino`
- `services/public_data_service.py`
- `services/telemetry_service.py`
- `ml/train_model.py`
- `docs/VALIDACAO_V2.md`
- `docs/ESP32_HARDWARE_REAL.md`

**Conclusão:** a arquitetura de software e o treinamento demonstrativo foram exercitados; a aquisição com o ESP32 físico e a validação com eventos reais ainda são etapas futuras. A separação entre simulação, sensores e fontes externas é requisito para a integridade do Projeto Integrador.
