# Etapa 5 — Dashboard Web

## Objetivo

Transformar a telemetria em uma visão operacional simples para demonstrar o projeto integrador.

## Executar

O dashboard é servido pela própria API. Execute:

```powershell
python -m uvicorn api.main:app --reload
```

Abra:

```text
http://127.0.0.1:8000
```

## Recursos

- filtro por sensor;
- quantidade de registros analisados;
- chuva média;
- nível máximo;
- risco atual;
- gráfico de nível da água;
- gráfico de chuva;
- distribuição dos riscos;
- tabela com telemetria recente;
- estado da API e do MongoDB;
- estado do modelo de Machine Learning;
- atualização automática a cada 10 segundos.

## Fonte dos dados

O dashboard consulta a FastAPI. A API prioriza MongoDB e utiliza JSONL como fallback quando necessário.

## Observação acadêmica

O painel mostra dados simulados. Ele contém aviso explícito para não ser interpretado como alerta oficial.

## Critério de conclusão

- página abre em `http://127.0.0.1:8000`;
- cards recebem valores da API;
- gráficos são renderizados;
- filtro de sensor funciona;
- tabela mostra as leituras recentes.
