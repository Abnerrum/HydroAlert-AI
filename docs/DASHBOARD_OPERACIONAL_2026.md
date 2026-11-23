# Dashboard operacional (2026-11-23)

A tela inicial do HydroAlert-AI foi redesenhada para seguir o conceito visual do projeto: quatro indicadores, mapa satelital interativo, gráfico de chuva e central de alertas. O mapa mantém filtros por UF/município e o acesso às demais abas foi preservado.

- **Chuva e temperatura:** consulta direta ao Open-Meteo, com dados meteorológicos de modelo e previsão horária das próximas 6 horas. Não representa previsão hidrológica de elevação do rio.
- **Nível e sensores físicos:** dependem da API FastAPI e de registros recebidos e validados. Sem telemetria, mostram "Sem leitura" e "0" em vez de valores fictícios.
- **Mapa:** imagem satelital Esri ou ruas OpenStreetMap; ponto azul é apenas localização geográfica quando não há sensor. Pontos oriundos da API mostram origem experimental/simulada nos detalhes.
- **Risco:** sem medições físicas suficientes, exibe "Não avaliado", nunca "Baixo" sem comprovação. Registros acadêmicos, quando houver, são identificados como não oficiais.
- **Navegação:** as abas de fontes públicas, meteorologia do Brasil, queimadas INPE, sensores, ESP32 físico, histórico e IA preditiva continuam disponíveis.

## Hospedagem

O arquivo `netlify.toml` já configura build React/Vite com `VITE_DEMO_MODE=true` e publicação de `frontend/dist`. Quando o Netlify está conectado ao `main`, cada push aciona automaticamente um novo build. Esse site estático **não** hospeda MongoDB, broker MQTT, firmware ESP32 nem o backend FastAPI. Para a arquitetura física completa, execute os serviços do `docker-compose.yml` separadamente e configure a URL da API após autenticar e proteger o backend.

## Validação

```bash
cd frontend
npm ci
npm test
npm run build
```

O gráfico de chuva depende da disponibilidade do Open-Meteo. O status da plataforma não declara sensores conectados. Este é um protótipo acadêmico e não substitui avisos da Defesa Civil.
