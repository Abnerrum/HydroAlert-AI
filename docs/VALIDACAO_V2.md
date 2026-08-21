# Validação técnica — HydroAlert AI v2

> Data da validação: 20/08/2026
> Escopo: protótipo acadêmico com telemetria simulada. Não representa desempenho operacional real.

## Suíte automatizada

- 26 testes automatizados executados com sucesso.
- Cobertura funcional: simulador, MQTT, telemetria, indicadores, qualidade, ML, alertas, revisão humana, GeoJSON, backtesting e exportação BI.

## Backtesting temporal

O relatório do projeto exige avaliação de lead time e falsos alarmes. O HydroAlert v2 utiliza o último período temporal como holdout e compara o modelo com um baseline simples de persistência.

| Horizonte | Amostras | MAE modelo (m) | MAE persistência (m) | Precisão | Recall | F1 | Falso alarme |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1h | 408 | 0.1785 | 0.0847 | 0.5782 | 0.9659 | 0.7234 | 42.18% |
| 3h | 384 | 0.3632 | 0.1656 | 0.4213 | 0.9375 | 0.5814 | 57.87% |
| 6h | 348 | 0.3036 | 0.2748 | 0.3957 | 0.7857 | 0.5263 | 60.43% |

## Interpretação responsável

- O modelo apresenta **recall alto**, ou seja, tende a capturar muitos eventos de ultrapassagem da cota.
- A **taxa de falso alarme ainda é elevada**, principalmente nos horizontes de 3h e 6h.
- No conjunto simulado atual, o baseline de persistência ainda possui MAE menor que o Random Forest. Isso fica documentado em vez de ser ocultado.
- Portanto, as previsões devem ser tratadas como **experimentais**, e alertas de emergência continuam sujeitos a revisão humana.

## Próxima validação necessária

1. Substituir ou complementar a simulação por séries históricas reais de CEMADEN/ANA/INMET/CIMEHGO.
2. Incluir previsão de precipitação futura e atributos de bacia/drenagem, pois o nível futuro depende de chuva que ainda não aconteceu no instante da leitura.
3. Recalibrar limiares e comparar novos modelos com o baseline de persistência.
4. Só promover um modelo para uso de alerta após demonstrar ganho consistente em MAE/F1 e redução de falsos alarmes em eventos reais.
