# Dados de queimadas quase em tempo real — INPE

## Fonte e frequência

O HydroAlert-AI lê o diretório público de CSVs do **Programa Queimadas do INPE** em
`https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/`.

O serviço seleciona as **seis edições mais recentes** (em geral cerca de **uma hora de arquivos**) e atualiza a visualização a cada **10 minutos** enquanto a aba está aberta. Isso não é uma conexão em fluxo contínuo, nem garante que cada satélite revisite qualquer região em dez minutos. A data/hora e a idade do último arquivo aparecem na tela.

Cada ponto é uma **detecção de foco de calor**, e não uma confirmação de incêndio, área queimada ou ocorrência individual distinta. O número de detecções não deve ser apresentado como número de incêndios.

## Implantação

- **Netlify**: `frontend/netlify/functions/focos-inpe.mjs` opera como proxy seguro de leitura dos CSVs. A pasta de funções é relativa ao diretório base `frontend` de `netlify.toml`.
- **FastAPI local/Docker**: `GET /api/queimadas` e `GET /api/queimadas?uf=GO` consultam o INPE via `services/queimadas_service.py`.
- O mapa usa **OpenStreetMap** (ruas) ou mosaicos **Esri** (satélite), separados da API de focos.
- Não é necessária uma chave paga de NASA FIRMS nem expomos credenciais de terceiros.
- **Testes:** `python -m unittest tests.test_queimadas_service -v` e `npm test` dentro de `frontend`.

## Integridade e limites

O serviço ignora coordenadas inválidas, locais fora do recorte brasileiro e linhas cujo país ou UF não são reconhecidos. Os arquivos são processados sem dados fictícios. Falhas totais retornam erro explícito; respostas parciais são sinalizadas. O total reflete todos os registros válidos e distintos encontrados nesses arquivos, mas apenas **até 600 marcadores** são mostrados para proteger o desempenho. A seleção por UF acontece **antes** desse limite.

Não são mostradas previsões de incêndio, rotas de fuga ou índices de emergência. As detecções por satélite não substituem verificações de autoridades e podem ter atraso. Fontes oficiais:

- https://data.inpe.br/queimadas/portal/dados-abertos/
- https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/

## Meteorologia

A aba Meteorologia Brasil usa **Open-Meteo**, com dados de modelos para 27 capitais; atualização manual e automática em intervalos de dez minutos. A precipitação modelada não constitui medição de um pluviômetro nem serve sozinha para classificar risco de inundação.

Para ampliar o sistema a níveis reais de rios e alertas oficiais, ainda é preciso integrar estações de ANA/HidroWeb, CEMADEN e outros órgãos, considerando autorizações e limitações de acesso.
