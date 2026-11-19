# HydroAlert-AI — Resultados experimentais e limitações (2026)

> **Protótipo acadêmico, não operacional.** As previsões são de sensores **simulados**, não de estações oficiais. Não utilize para avisos de Defesa Civil ou decisões de segurança.

## Base e método dos artigos fornecidos

- **12 sensores simulados**, em **7 municípios goianos**, com **1.440 leituras**.
- **120 ciclos** de **15 minutos**, totalizando 30 horas simuladas; **seed = 42**.
- Entradas: chuva e acumulados, nível da água, sua variação e distância às cotas.
- Três modelos Random Forest, para **1 h, 3 h e 6 h**, com **75% treino e 25% teste cronológicos** e comparação com a **persistência** (repetição do último nível observado).
- Testes: **348**, **324** e **288** instantes, respectivamente.

A semente fixa reproduz as condições do experimento; os timestamps variam, pois o simulador inicia no instante da execução. Os resultados abaixo foram **reportados no artigo científico SBC enviado pela equipe**, não obtidos por sensores físicos.

## Resultados publicados no artigo (dados simulados)

| Horizonte | MAE RF (m) | MAE persistência (m) | RMSE RF (m) | RMSE persistência (m) | Precisão | Revocação | F1 | FAR* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 h | 0,1752 | 0,0993 | 0,2337 | 0,1511 | 0,9362 | 0,8889 | 0,9119 | 0,0638 |
| 3 h | 0,2846 | 0,2174 | 0,4172 | 0,2990 | 0,8681 | 0,8495 | 0,8587 | 0,1319 |
| 6 h | 0,3717 | 0,3669 | 0,5012 | 0,5047 | 0,6842 | 0,6190 | 0,6500 | 0,3158 |

*FAR é definido no artigo como `FP/(TP+FP) = 1 - precisão`. Essa razão também é conhecida como **false discovery rate (FDR)**; não corresponde à taxa de falso positivo `FP/(FP+TN)`.*

O Random Forest **não superou o baseline em MAE em nenhum horizonte**. Apenas em 6 h apresentou RMSE marginalmente menor que o da persistência. O F1 caiu e os falsos alertas entre os positivos previstos cresceram com a antecedência. Isso **valida a montagem do pipeline**, não a eficácia operacional para avisar a população.

## Reproduzir a avaliação

Na raiz do repositório, após instalar `requirements.txt`:

```bash
python -m scripts.reproduzir_experimento --saida resultados/seed42
```

O comando gera `resultados/seed42/dados/telemetria.jsonl`, confirma as **1.440 leituras**, treina os modelos e grava `resultados/seed42/metricas.json` e um log da simulação. Define o caminho alternativo `HYDRO_MODEL_PATH` para **não sobrescrever** o modelo de trabalho; usa um diretório de dados próprio e uma conexão MongoDB desabilitada, recorrendo ao JSONL. Não exige Docker. Os resultados de novas execuções devem ser conferidos antes de uma citação acadêmica, pois versões das dependências e diferenças de ambiente podem alterar métricas.

## Diferenças, riscos e próximos passos

1. **Cotas:** o artigo SBC apresenta faixas gerais de 1,50 m, 2,50 m e 3,20 m; o código utiliza **cotas individuais por sensor** de `iot/config.py`. Essas definições não devem ser confundidas.
2. **Sensores:** coordenadas e leituras são simuladas. A existência de firmware ESP32 não comprova teste físico nem calibração de bancada ou campo.
3. **Validação:** o trabalho aplica uma única janela cronológica. Evoluir para validação temporal múltipla, incluindo prevenção de vazamento de informação entre treino e teste.
4. **Fontes reais:** integrar e validar séries históricas de ANA/HidroWeb, CEMADEN, INMET e CIMEHGO, com limites hidrológicos calibrados por bacia.
5. **Alertas:** manter aprovação humana para emergências, trilha de auditoria e validação com autoridades competentes antes de qualquer implantação.

**Base documental fornecida pela equipe:** `HydroAlert_AI_Artigo_com_secao_dados.docx` (versão detalhada) e `artigo_sbc_HydroAlert_AI_atualizado (1).docx` (artigo SBC). Os valores desta página devem ser tratados como **resultados relatados nesses documentos**, e não como comprovação de ambiente operacional.
