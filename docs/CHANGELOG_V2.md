# Changelog — HydroAlert AI v2

## Backend

- FastAPI atualizado para versão de projeto 2.0.0.
- Novo endpoint `/api/qualidade-dados`.
- Novo endpoint `/api/alertas`.
- `/api/painel` agora retorna qualidade, métricas de alerta, previsões e área exposta estimada.
- Previsão busca histórico do sensor para que acumulados hidrometeorológicos estejam disponíveis.

## IoT / simulação

- Relógio hidrológico acelerado.
- Passo configurável em minutos (`--passo-minutos`).
- Seed reprodutível (`--seed`).
- Resposta do nível ajustada para permitir elevação e recessão da lâmina d'água.
- Nível operacional Normal/Atenção/Alerta/Emergência.

## Dados

- Acumulados 15m, 1h, 3h, 6h e 24h.
- Intensidade equivalente em mm/h.
- Distância até cotas.
- Percentual da cota crítica.
- Score de qualidade por completude, validade e unicidade.

## Machine Learning

- Features hidrometeorológicas ampliadas.
- Horizonte convertido em passos conforme cadência da série.
- Random Forest separado para 1h, 3h e 6h.
- Holdout temporal de 25%.
- MAE, RMSE, R², precision, recall, F1 e taxa de falsos alarmes.
- Importância das variáveis registrada no artefato.
- Estimativa de incerteza entre árvores na inferência.

## Backtesting

- Baseline de persistência mantido.
- Avaliação do modelo por horizonte.
- Métricas de evento baseadas em ultrapassagem da cota de alerta.
- Uso do período de holdout registrado pelo treinamento quando disponível.

## Alertas e governança

- Alertas atuais e preditivos.
- Lead time do primeiro horizonte de alerta.
- Emergências exigem revisão humana.
- Histórico de aprovação/rejeição mantido localmente.
- Formulário de revisão humana no próprio dashboard para aprovar/rejeitar alertas críticos com responsável e justificativa.

## BI / dashboard

- KPIs de chuva acumulada, lead time, qualidade e área exposta.
- Detalhes de previsão 1h/3h/6h por sensor.
- Painel de backtesting e falsos alarmes.
- Painel de governança.
- Exportação Power BI ampliada.
- Corrigida inicialização do Leaflet; zoom control fica oculto conforme configuração atual.

## Testes

- Suíte ampliada para 26 testes automatizados.
- Testes de indicadores, cadência 15 min, qualidade e alerta preditivo.
