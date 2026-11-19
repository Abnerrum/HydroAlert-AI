# HydroAlert-AI v3.0.0 — ESP32, IA e Monitoramento de Inundações

**Primeira versão de lançamento do HydroAlert-AI no GitHub.** Projeto Integrador acadêmico SENAI FATESG (2026).

## Destaques

- **ESP32 físico — HC-SR04 + DHT11:** firmware Arduino e coletor Python por USB com gravação de CSV e JSONL, além da nova aba **ESP32 físico** no React e do endpoint `GET /api/esp32/leituras`.
- **Separação de fontes:** a coleta física não é confundida com os sensores simulados. Sem calibração, o nível da água fica ausente; sem pluviômetro, não há chuva medida pelo ESP32.
- **Painel web (React, Vite e Leaflet):** mapas, indicadores, filtros territoriais, histórico e visualização das previsões experimentais.
- **API REST com FastAPI:** serviços de telemetria, qualidade de dados, alertas e consulta de fontes meteorológicas públicas.
- **Inteligência Artificial:** Random Forest com horizontes experimentais de **1, 3 e 6 horas**, backtesting e comparação com baseline de persistência.
- **Experimento reproduzível:** 12 sensores **simulados**, 120 ciclos de 15 minutos, 1.440 registros e seed 42; `python -m scripts.reproduzir_experimento --saida resultados/seed42`.
- **Documentação:** guias de instalação, operação, ESP32, montagem elétrica, pesquisa científica e limitações do modelo.

## Começar

1. Baixe os arquivos-fonte da versão pela seção **Assets** deste lançamento ou clone o repositório.
2. Consulte o [README](https://github.com/Abnerrum/HydroAlert-AI/blob/main/README.md).
3. Para testar o ESP32 físico, siga o [guia de integração](https://github.com/Abnerrum/HydroAlert-AI/blob/main/docs/INTEGRACAO_ESP32_REAL.md).
4. Para consultar os resultados do estudo, veja [resultados experimentais](https://github.com/Abnerrum/HydroAlert-AI/blob/main/docs/RESULTADOS_EXPERIMENTAIS_2026.md).

## Situação e limitações importantes

**Protótipo acadêmico, não é um sistema oficial de alerta.** O estudo contém dados simulados e seus resultados não comprovam capacidade de antecipar inundações reais. O Random Forest **não superou o baseline de persistência em MAE** no experimento relatado. O código foi preparado para ESP32, mas a gravação no dispositivo e a coleta física em campo ainda precisam de validação. A prévia hospedada no Netlify é uma **demonstração**, não um serviço de monitoramento real.

*Esta versão identifica e organiza o estado do projeto em novembro de 2026; publicá-la como Release não instala o sistema em servidores nem coloca sensores físicos online.*
