# Etapas 7 a 12 — análise avançada v2

## Etapa 7 — Previsão 1h, 3h e 6h

O modelo possui um `RandomForestRegressor` por horizonte. A API retorna nível previsto, risco previsto, incerteza aproximada e lead time.

```text
GET /api/ml/prever-horizontes/GYN-SIM-001
```

## Etapa 8 — Mapa territorial e áreas expostas

`GET /api/painel` inclui:

- pontos por sensor;
- camada de calor;
- manchas simuladas;
- polígonos aproximados de bairros;
- área exposta estimada em km².

Essas geometrias são demonstrativas e não substituem limites oficiais nem modelagem hidráulica.

## Etapa 9 — Alertas automáticos

O backend combina risco atual e previsão para produzir alertas `ATUAL` ou `PREDITIVO`.

Escala operacional:

```text
NORMAL → ATENÇÃO → ALERTA → EMERGÊNCIA
```

```text
GET /api/alertas
```

## Etapa 10 — Revisão humana

Alertas de emergência ficam pendentes de revisão humana.

```json
POST /api/revisoes
{
  "alerta_id": "ID retornado em /api/alertas",
  "decisao": "APROVADO",
  "revisor": "Responsável pela validação",
  "justificativa": "Leituras, tendência e previsão verificadas no cenário acadêmico."
}
```

## Etapa 11 — Power BI e backtesting por evento

O backtesting calcula MAE e métricas de evento para cada horizonte e, quando o modelo v2 registra o início do teste, utiliza o holdout temporal.

```text
GET /api/backtesting
GET /api/power-bi/exportar
```

O CSV inclui os principais indicadores hidrometeorológicos do relatório.

## Etapa 12 — Fontes públicas

Integração ativa no protótipo:

- Open-Meteo.

Fontes catalogadas para próxima etapa:

- CEMADEN;
- ANA / Hidroweb;
- INMET;
- CIMEHGO / SEMAD Goiás.

## Qualidade dos dados

A versão v2 também acrescenta uma camada transversal de qualidade:

```text
GET /api/qualidade-dados
```

O score considera completude, validade e unicidade.

## Critérios de aceite v2

- 1h/3h/6h respeitam a cadência temporal;
- acumulados 15m/1h/3h/6h/24h disponíveis;
- alertas preditivos gerados;
- crítico/emergência exige revisão;
- backtesting usa holdout quando disponível;
- qualidade da base mensurada;
- CSV de BI inclui indicadores ampliados;
- testes automatizados aprovados;
- limitações acadêmicas explicitadas.
