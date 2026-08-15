# Etapa 4 — FastAPI

## Objetivo

Disponibilizar a telemetria do HydroAlert AI por uma API HTTP para o dashboard, futuras integrações, BI e serviços de inteligência artificial.

## Executar

Com o ambiente virtual ativo:

```powershell
python -m uvicorn api.main:app --reload
```

A API ficará disponível em:

```text
http://127.0.0.1:8000
```

Documentação Swagger:

```text
http://127.0.0.1:8000/docs
```

## Endpoints

### Saúde do sistema

```text
GET /health
```

Mostra o estado da API, MongoDB e modelo de Machine Learning.

### Sensores configurados

```text
GET /api/sensores
```

### Telemetria

```text
GET /api/telemetria?limite=100
GET /api/telemetria?limite=100&sensor_id=GYN-SIM-001
```

A API tenta consultar o MongoDB. Se ele estiver indisponível ou sem registros, usa os arquivos JSONL locais como fallback.

### Resumo

```text
GET /api/resumo
GET /api/resumo?sensor_id=GYN-SIM-001
```

Retorna quantidade, chuva média, nível médio, nível máximo, risco atual e distribuição de riscos.

### Machine Learning

```text
GET /api/ml/status
GET /api/ml/prever/GYN-SIM-001
```

A previsão só fica disponível depois do treinamento descrito na Etapa 6.

## Critério de conclusão

- servidor FastAPI inicia sem erro;
- `/docs` abre no navegador;
- `/api/telemetria` retorna dados;
- `/api/resumo` calcula indicadores;
- API continua respondendo com JSONL caso o MongoDB esteja temporariamente offline.
