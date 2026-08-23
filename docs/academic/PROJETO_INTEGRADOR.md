# Projeto Integrador — HydroAlert AI

## Tema
Sistema inteligente de alerta preditivo de inundações urbanas com integração de IoT, NoSQL, Data Science, Business Intelligence e Inteligência Artificial.

## Objetivo geral
Desenvolver um protótipo acadêmico capaz de receber ou simular dados hidrometeorológicos, armazenar séries temporais, analisar chuva e nível da água, classificar risco e apoiar previsões para horizontes de 1h, 3h e 6h.

## Objetivos específicos
- Simular sensores de chuva e nível com identificação territorial.
- Utilizar MQTT como camada de comunicação IoT.
- Persistir telemetria em arquitetura NoSQL com MongoDB e fallback acadêmico.
- Disponibilizar endpoints por FastAPI.
- Construir um dashboard territorial com mapa, filtros, KPIs e gráficos.
- Treinar e validar modelos de Machine Learning para previsão de nível/risco.
- Gerar alertas por severidade e região.
- Manter revisão humana no fluxo de alertas críticos.
- Exportar indicadores para uso em Business Intelligence.
- Documentar limitações, qualidade dos dados e resultados de backtesting.

## Arquitetura

```text
Sensores simulados / fontes públicas
             ↓
            MQTT
             ↓
      MongoDB / JSONL
             ↓
 Serviços de qualidade e território
             ↓
 Machine Learning 1h / 3h / 6h
             ↓
 Risco + alerta + revisão humana
             ↓
 FastAPI + Dashboard + Mapa
             ↓
     Exportação para BI
```

## Front-end
O centro de operações utiliza HTML, CSS, JavaScript, Chart.js e Leaflet. A interface foi organizada para funcionar como um painel operacional, com navegação lateral, filtros territoriais, KPIs, mapa de sensores, alertas, gráficos de chuva e nível, estado do modelo e tabela de telemetria.

Os assets de melhoria visual ficam separados em:

```text
dashboard/assets/css/
dashboard/assets/js/
```

Essa separação mantém compatibilidade com os arquivos-base já existentes e facilita futuras evoluções do front-end.

## Status atual
O protótipo possui API FastAPI, telemetria simulada, integração MQTT/MongoDB, serviços territoriais, dashboard, mapa, indicadores, Machine Learning, alertas, revisão humana, backtesting e exportação para BI. Os resultados atuais continuam acadêmicos e devem ser validados com séries históricas e estações oficiais antes de qualquer aplicação operacional real.

## Próximas evoluções
1. Integrar séries históricas oficiais de CEMADEN, ANA/Hidroweb, INMET e CIMEHGO.
2. Calibrar os modelos por bacia e ponto de monitoramento.
3. Incorporar polígonos oficiais de municípios, bairros e áreas suscetíveis.
4. Evoluir manchas simuladas para modelagem hidrológica/hidráulica.
5. Criar autenticação e perfis de revisor.
6. Executar backtesting com eventos históricos reais.
7. Integrar visualmente no dashboard os indicadores avançados de governança e validação.
8. Preparar uma versão demonstrativa publicável para apresentação acadêmica.