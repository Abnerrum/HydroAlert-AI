# Rede nacional virtual — 100 sensores por UF

## Objetivo

Atender à demonstração da seleção de estados sem exibir 0/0 em Mato Grosso ou outros estados **quando a página está em modo de simulação**. A implementação é **100% VIRTUAL** e não indica 100 sensores físicos ativos.

- 26 estados + Distrito Federal = **27 UFs**.
- **100 nós virtuais por UF** = 2.700 configurados.
- Ao selecionar uma UF (por exemplo, Mato Grosso), o mapa carrega **100 pontos sintéticos** com IDs `VIRT-MT-001` a `VIRT-MT-100`.
- Na opção **Brasil**, são mostrados só **108 marcadores de amostra** (4 por UF), para evitar travamentos do navegador, enquanto o indicador informa 2.700 nós configurados.
- Se selecionar um município diferente da capital da UF, não são inventadas posições nesse município. O protótipo avisa que não há pontos virtuais para aquele recorte.

## Procedência e limites

Este simulador gera coordenadas **ilustrativas próximas às capitais**, com uma distribuição angular determinística, e leituras fictícias de chuva e nível. **Nenhuma coordenada corresponde necessariamente a rio, estação oficial ou propriedade.** Níveis de água e risco são apenas números para testar interface e componentes, não representam medições nem predições corretas.

A geração ocorre em janelas locais de 30 segundos, sem banco de dados e sem dependência de APIs pagas. Os cenários de alerta são fictícios e não geram notificações oficiais. As fontes Open-Meteo (modelos de meteorologia) e INPE (detecção satelital) continuam em abas separadas. A aba do **ESP32 físico não recebe leituras simuladas**.

**Importante:** para ativar de verdade 100 dispositivos físicos, é preciso ter hardware instalado, comunicação MQTT/USB ou LoRa, provisionamento, autenticação, armazenamento e validação da localização e dos sensores. O código do simulador não instala nenhum equipamento.

## Código

- `frontend/src/simuladorNacional.js` — geração determinística, filtros e indicadores.
- `frontend/src/demo.js` — dados do modo demonstrativo, sem falsas leituras físicas.
- `frontend/src/simuladorNacional.test.js` — testes das 27 UFs, 100 nós em cada, 2.700 no país, ausência de sensores físicos e filtro municipal.
- `frontend/src/App.jsx` — etiquetas de **simulação acadêmica** no mapa, cartões, alertas e tabela.

## Testes

```bash
cd frontend
npm ci
npm test
npm run build
```

A API real continua servindo sensores configurados e suas leituras próprias; o simulador nacional só é acionado no modo demonstrativo do frontend, não sobrepondo dados reais.
