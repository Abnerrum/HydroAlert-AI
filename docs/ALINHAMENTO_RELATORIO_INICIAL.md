# HydroAlert AI v2 — Alinhamento com o Relatório Inicial

Este documento relaciona os requisitos acadêmicos do Projeto Integrador à implementação atual do protótipo.

> O HydroAlert AI continua sendo um protótipo acadêmico. Sensores, cotas, manchas e métricas presentes na base de demonstração são simulados e não constituem alerta oficial.

## 1. Problema e objetivo

O sistema demonstra o fluxo completo para monitoramento e alerta preditivo de inundações urbanas:

```text
Sensor / fonte pública
        ↓
Telemetria IoT / MQTT
        ↓
JSONL + MongoDB (NoSQL)
        ↓
Tratamento + indicadores hidrometeorológicos
        ↓
Modelo ML 1h / 3h / 6h
        ↓
Classificação de risco + lead time
        ↓
Dashboard / mapa / Power BI
        ↓
Revisão humana de alertas críticos
```

## 2. Variáveis e indicadores implementados

O relatório solicita precipitação acumulada, intensidade, nível, tendência, distância até cotas, lead time, falsos alarmes e áreas expostas. A versão v2 implementa:

- chuva da leitura;
- chuva acumulada em 15 min, 1h, 3h, 6h e 24h;
- intensidade equivalente de chuva em mm/h;
- nível atual da água;
- variação e tendência do nível;
- distância até cota de atenção, alerta e crítica;
- percentual da cota crítica atingida;
- previsão de nível para 1h, 3h e 6h;
- risco previsto por horizonte;
- incerteza aproximada entre árvores do Random Forest;
- lead time estimado do primeiro horizonte de alerta;
- taxa de falsos alarmes, precision, recall e F1 no holdout temporal;
- área exposta estimada em manchas simuladas.

Implementação principal: `services/indicator_service.py`, `ml/features.py`, `ml/train_model.py` e `services/backtesting_service.py`.

## 3. Metodologia de simulação aprimorada

O simulador v2 utiliza um **relógio hidrológico acelerado**. Por padrão, cada ciclo avança 15 minutos no timestamp simulado, mesmo quando os ciclos são gerados em poucos segundos no computador.

Isso permite gerar uma série de 24h ou mais para testar acumulados e previsões sem esperar um dia real.

Exemplo:

```powershell
python -m iot.sensor_simulator --ciclos 120 --intervalo 0 --passo-minutos 15 --seed 42
```

120 ciclos representam 30 horas hidrológicas simuladas.

## 4. Data Science e validação temporal

O modelo utiliza `RandomForestRegressor` separado para cada horizonte de 1h, 3h e 6h.

A divisão é cronológica:

- 75% iniciais: treinamento;
- 25% finais: teste/holdout temporal;
- sem embaralhar o futuro com o passado.

As features incluem chuva atual e acumulada, nível, variação, distância até cotas e percentual da cota crítica.

Métricas calculadas:

- MAE;
- RMSE;
- R²;
- precision;
- recall;
- F1;
- taxa de falsos alarmes;
- verdadeiros/falsos positivos e negativos.

O endpoint `GET /api/backtesting` utiliza o holdout registrado no artefato do modelo quando disponível.

## 5. Qualidade de dados

A versão v2 adiciona avaliação automática da telemetria em `services/data_quality_service.py`.

São verificados:

- completude dos campos obrigatórios;
- timestamps válidos;
- faixas numéricas plausíveis para o protótipo;
- coerência entre cotas de atenção, alerta e crítica;
- duplicidade por sensor + timestamp.

O resultado gera um score percentual e status `EXCELENTE`, `BOM`, `ATENCAO` ou `CRITICO`.

Endpoint:

```text
GET /api/qualidade-dados
```

## 6. Alertas e revisão humana

A classificação interna é mantida para compatibilidade:

| Risco interno | Nível operacional |
|---|---|
| BAIXO | NORMAL |
| MODERADO | ATENÇÃO |
| ALTO | ALERTA |
| CRÍTICO | EMERGÊNCIA |

O alerta pode ser:

- `ATUAL`: a severidade já está presente na leitura mais recente;
- `PREDITIVO`: o modelo prevê severidade maior em um horizonte futuro.

Alertas críticos/emergência exigem revisão humana e ficam como `PENDENTE` até aprovação ou rejeição.

Endpoints:

```text
GET  /api/alertas
GET  /api/revisoes
POST /api/revisoes
```

## 7. Business Intelligence

O dashboard web foi ampliado para exibir:

- chuva acumulada 1h;
- lead time;
- score de qualidade dos dados;
- área exposta estimada;
- previsões 1h/3h/6h por sensor;
- alertas atuais e preditivos;
- painel de backtesting;
- governança e revisões pendentes.

O CSV para Power BI agora contém também acumulados, intensidade, distância até cotas e percentual da cota crítica.

Endpoint:

```text
GET /api/power-bi/exportar
```

## 8. Fontes públicas

O catálogo inclui:

- Open-Meteo — integração ativa complementar;
- CEMADEN — planejada;
- ANA / Hidroweb — planejada;
- INMET — planejada;
- CIMEHGO / SEMAD Goiás — planejada.

A documentação do Projeto Integrador cita essas fontes como base futura. A versão v2 não finge integração oficial inexistente: somente Open-Meteo está efetivamente consultado pelo código atual.

## 9. Big Data

O protótipo demonstra princípios de arquitetura para volume, velocidade e variedade usando MQTT, NoSQL e pipeline de dados. A base acadêmica atual **não possui escala suficiente para ser caracterizada como uma carga real de Big Data em produção**. Essa distinção deve ser mantida na apresentação.

## 10. Limitações e próximos passos

Antes de qualquer uso real ainda são necessários:

1. séries oficiais de CEMADEN/ANA/INMET/CIMEHGO;
2. calibração por bacia, córrego e ponto de monitoramento;
3. limites territoriais oficiais do IBGE e mapas reais de suscetibilidade;
4. modelo hidrológico/hidráulico para manchas reais de inundação;
5. autenticação, perfis e trilha de auditoria persistente para revisores;
6. validação com eventos históricos reais e participação da Defesa Civil;
7. testes de disponibilidade, segurança e escalabilidade.
