# Documentação — HydroAlert AI

Esta pasta concentra a documentação técnica e acadêmica do Projeto Integrador.

## Organização recomendada

### Projeto Integrador
- `academic/PROJETO_INTEGRADOR.md` — visão acadêmica consolidada, objetivos, metodologia, entregas e status.
- `ALINHAMENTO_RELATORIO_INICIAL.md` — alinhamento com o relatório inicial.

### Etapas técnicas
- `ETAPA_01_IOT.md` — sensores e simulação IoT.
- `ETAPA_02_MQTT.md` — mensageria MQTT.
- `ETAPA_03_MONGODB.md` — persistência NoSQL.
- `ETAPA_04_FASTAPI.md` — API e serviços.
- `ETAPA_05_DASHBOARD.md` — dashboard web.
- `ETAPA_06_DATA_SCIENCE_ML.md` — Data Science e Machine Learning.
- `ETAPAS_07_A_12_ANALISE_AVANCADA.md` — evolução analítica.
- `ETAPA_08_MAPA_TERRITORIAL.md` — geointeligência e mapa.

### Execução e validação
- `GUIA_COMPLETO_EXECUCAO_E_COMPARTILHAMENTO.md` — execução local, demonstração e compartilhamento.
- `VALIDACAO_V2.md` — validações e limitações atuais.
- `CHANGELOG_V2.md` — histórico de evolução.

## Estrutura funcional do repositório

```text
HydroAlert-AI/
├── api/                 # FastAPI e endpoints
├── dashboard/           # Front-end do centro de operações
│   ├── index.html
│   ├── app.js            # Lógica de dados e gráficos
│   ├── styles.css        # Estilos-base compatíveis
│   └── assets/
│       ├── css/          # Camadas visuais e temas
│       └── js/           # UX e comportamento da interface
├── database/            # MongoDB e persistência
├── iot/                 # Simuladores e MQTT
├── ml/                  # Features, treino e inferência
├── services/            # Regras de negócio e análises
├── data/                # Dados acadêmicos e telemetria
├── models/              # Artefatos de Machine Learning
├── tests/               # Testes automatizados
├── docker/              # Configurações auxiliares de containers
└── docs/                # Documentação técnica e acadêmica
```

A organização foi feita de forma incremental para não quebrar imports Python, Docker, rotas FastAPI ou arquivos já usados nas demonstrações.