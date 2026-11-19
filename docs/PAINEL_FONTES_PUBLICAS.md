# Visão nacional por fontes públicas — modo padrão da hospedagem

## Status
A Visão nacional do site Netlify **não utiliza o simulador de 2.700 sensores virtuais**. Consultas são feitas a provedores públicos. Se a fonte falha, o valor aparece como **Sem dados**, sem preencher zeros falsos.

## Open-Meteo — meteorologia modelada
- Fonte: https://open-meteo.com/en/docs
- Localização: uma coordenada representativa por capital das 27 UFs; outros municípios podem ser consultados na aba Meteorologia Brasil.
- Dados: temperatura do ar e precipitação no intervalo disponibilizado pelo provedor, identificados como **modelo meteorológico**, não observações em pluviômetros.
- Recência: somente pontos com horário até quatro horas atrás entram nos cartões de valor recente. A página solicita atualização a cada 10 minutos enquanto estiver aberta.
- Temperatura média exibida: **média aritmética dos pontos de capitais com dados disponíveis**; não é temperatura média ponderada do país nem estadual.
- O número de capitais com chuva representa **contagem de locais com precipitação estimada positiva**, não a soma de milímetros pelo país.

## INPE — focos de calor
- Fonte: https://data.inpe.br/queimadas/portal/dados-abertos/
- Coleta: função Netlify `/.netlify/functions/focos-inpe` lê as últimas seis edições CSV (~10 min cada). Atualização da página a cada 10 min.
- São **detecções térmicas de satélite**; não é número de incêndios confirmados nem área queimada.
- Quando a função estiver indisponível, o painel exibe **Sem dados**; não retorna 0.

## Hidrologia física — pendente
- A API atual da ANA/HidroWeb requer autorização para acesso programático: https://www.snirh.gov.br/hidroweb/acesso-api
- A API PED/SWS do Cemaden requer token para consultar observações, conforme o Swagger: https://sws.cemaden.gov.br/PED/api/ui/swagger.json
- Pluviômetros públicos podem ser visualizados no mapa oficial: https://www2.cemaden.gov.br/mapainterativo/
- Não importamos séries hidrológicas de serviços sem autorização; por isso **níveis reais dos rios, vazões, sensores físicos por UF, alertas oficiais e previsões de inundação em produção** permanecem não integrados.
- 100 sensores **reais** por estado não podem ser garantidos sem inventário e comunicação das estações.

## Modo de execução e segurança
- A hospedagem usa `VITE_DEMO_MODE=true` para habilitar serviços de front-end estático. **Esse nome histórico não significa que a tela continue usando sensores simulados.**
- O endpoint local `/api/painel` da hospedagem reporta **zero sensores hidrológicos conectados**, não 2.700 virtuais.
- A aba ESP32 físico continua separada e sem leituras enquanto não houver backend de coleta real.
- O arquivo `frontend/src/simuladorNacional.js` é preservado somente para estudo; ele não é importado na tela principal nem no retorno `demoResponse`.

## Testes
```bash
cd frontend
npm ci
npm test
npm run build
```

Os testes cobrem tratamento de valores ausentes, filtros de UF, tempo de atualização, precipitação zero válida, indisponibilidade do INPE e rejeição de coordenadas falsas.

**Nunca utilize este painel como sistema oficial de alerta ou única fonte para decisões de emergência.**
