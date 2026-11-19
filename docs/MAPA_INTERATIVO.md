# Mapa interativo no HydroAlert-AI

A tela de mapa foi redesenhada com o **padrão de navegação de plataformas de monitoramento** (grande mapa, lista lateral, painel de detalhes e controles de visualização), inspirada em conceitos presentes na Cobli, mas sem copiar a identidade visual nem usar seus mapas proprietários.

## Funcionalidades

- Pesquisa de sensor, nome e município sem depender de acentos.
- Filtragem por risco: todos, crítico, alto, moderado, baixo e sem dados.
- Marcadores e lista sincronizados; clicar no sensor centraliza o mapa e apresenta suas medições, coordenadas e data.
- Mapas neutro (CARTO/OpenStreetMap), ruas (OpenStreetMap) e satélite (Esri); cada camada preserva as atribuições devidas.
- Camadas de risco, círculos ilustrativos de precipitação e pontos demonstrativos de apoio.
- Zoom, enquadrar sensores e modo expandido com tecla Esc.
- Adaptação para computador e celular. O painel mantém a aba principal e a consulta por CEP.

## Garantias e limites

Este é um **protótipo acadêmico**. Os pontos do dashboard e os valores podem ser simulados; a cor dos marcadores não representa alerta oficial. Coordenadas ausentes ou inválidas são ignoradas, não preenchidas automaticamente. O mapa não afirma que existam sensores físicos onde só há simulação.

Os círculos de chuva apenas variam com os números informados; **não constituem uma interpolação meteorológica nem um mapa de calor validado**. Os pontos de apoio são **fictícios** e não se calcula uma rota real para eles. Integrações com Google Maps/Trânsito/Cobli, histórico real de trajetos e roteamento exigiriam APIs, fontes e validação adicionais.

A telemetria do ESP32 permanece separada na aba específica; o mapa territorial não usa automaticamente dados físicos sem localização e calibração verificadas.

## Desenvolvimento e testes

Na pasta frontend:

```bash
npm ci
npm test
npm run build
```

Os testes verificam filtro textual, risco e exclusão de coordenadas inválidas. Verifique manualmente, ao abrir o site, o clique em marcadores, o mapa expandido e a rolagem da lista em tamanhos de tela distintos.

## Base cartográfica sem chave de API (2026)

O modo **Ruas e lugares** usa OpenFreeMap Bright com MapLibre GL Leaflet, e o **Mapa claro** usa o estilo Liberty. Nenhum dos dois exige chave de API. Em caso de incompatibilidade com WebGL ou falha de acesso, o sistema ativa o mapa de ruas do OpenStreetMap. O modo **Satélite** permanece com mosaico Esri. O serviço CARTO antigo foi removido porque a tela estava mostrando **API KEY REQUIRED**.

Foi acrescentada uma busca manual de endereços por Nominatim/OSM (um pedido apenas ao clicar em Buscar, sem autocomplete). Os marcadores de sensores continuam acadêmicos e não são estações oficiais. Para usar os mapas proprietários do Google, seria necessária uma chave da Maps JavaScript API com faturamento habilitado.

### Dependências

- `maplibre-gl` e `@maplibre/maplibre-gl-leaflet`
- Estilos públicos do OpenFreeMap: `https://tiles.openfreemap.org/styles/bright` e `https://tiles.openfreemap.org/styles/liberty`

Lembre-se de manter os créditos dos fornecedores de mapa visíveis e de respeitar suas condições de uso. O acesso às camadas públicas exige conexão à internet.
