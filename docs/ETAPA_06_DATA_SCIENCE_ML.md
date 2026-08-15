# Etapa 6 — Data Science e Machine Learning

## Objetivo

Criar um baseline de Machine Learning para aprender a relação entre chuva, nível atual, variação do nível e cotas operacionais.

Nesta etapa o modelo prevê o **próximo nível da série**. Os horizontes específicos de 1h, 3h e 6h pertencem à Etapa 7.

## Dados usados

O treinamento tenta utilizar até 5000 registros da mesma camada de dados utilizada pela API:

1. MongoDB, quando houver registros;
2. `data/mqtt_recebido.jsonl` como fallback;
3. `data/telemetria.jsonl` como segundo fallback.

## Atributos

```text
chuva_mm
nivel_m
variacao_nivel_m
cota_atencao_m
cota_alerta_m
cota_critica_m
```

O alvo é o nível da próxima leitura do mesmo sensor.

## Modelo

Baseline:

```text
RandomForestRegressor
```

A separação treino/teste é cronológica (`shuffle=False`) para evitar embaralhar o futuro com o passado nesta primeira avaliação.

## Gerar dados

Para aumentar a base:

```powershell
python -m iot.mqtt_publisher --ciclos 100 --intervalo 0.2
```

Mantenha o subscriber aberto para receber e persistir os dados.

## Treinar

```powershell
python -m ml.train_model
```

Resultado esperado:

```text
Modelo treinado com sucesso.
Arquivo: ...\models\modelo_nivel.joblib
Amostras: ...
MAE: ... m
```

O arquivo `.joblib` é gerado localmente e não é enviado para o GitHub.

## Métrica

A métrica inicial é MAE (Mean Absolute Error), em metros. Quanto menor, melhor.

## Usar pela API

Estado do modelo:

```text
GET /api/ml/status
```

Previsão do próximo passo:

```text
GET /api/ml/prever/GYN-SIM-001
```

## Limitações atuais

- dados ainda são simulados;
- a previsão é do próximo passo, não de 1h/3h/6h;
- não existe validação por evento de inundação nesta etapa;
- o backtesting completo ficará para etapas posteriores;
- o modelo não deve ser utilizado para decisão operacional real.

## Critério de conclusão

- dataset supervisionado é construído;
- modelo treina com os dados disponíveis;
- MAE é calculado;
- artefato é salvo em `models/modelo_nivel.joblib`;
- API consegue informar o estado e produzir inferência do modelo treinado.
