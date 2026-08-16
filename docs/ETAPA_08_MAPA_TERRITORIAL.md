# Etapa 8 — Mapa Territorial e Geointeligência

## Objetivo

Evoluir o HydroAlert AI de um dashboard analítico para uma central de monitoramento territorial, semelhante a sistemas de acompanhamento meteorológico e hidrológico.

> Toda a rede desta etapa é simulada para fins acadêmicos. Os pontos e coordenadas não representam estações oficiais.

## O que foi implementado

- mapa interativo com Leaflet e OpenStreetMap;
- rede piloto simulada distribuída em municípios de Goiás;
- filtros encadeados por Estado, Município, Região, Bairro e Sensor;
- visualização estadual, municipal e local;
- camadas de mapa para Risco, Chuva e Nível;
- pontos coloridos conforme a condição simulada;
- painel territorial com quantidade de municípios, bairros e sensores;
- lista de prioridades/alertas da rede;
- detalhes do sensor selecionado no mapa;
- gráficos filtrados conforme o território selecionado;
- comparação de nível por sensor;
- registros agrupados por município;
- API territorial em `/api/painel`;
- catálogo geográfico em `/api/localidades`.

## Rede simulada

A configuração atual contém pontos acadêmicos em localidades como:

- Goiânia;
- Aparecida de Goiânia;
- Anápolis;
- Rio Verde;
- Luziânia;
- Trindade;
- Senador Canedo.

Os três sensores originais de Goiânia foram mantidos para preservar compatibilidade com os registros anteriores do MongoDB.

## Fluxo

```text
Sensores simulados em vários municípios
            ↓
         MQTT
            ↓
        MongoDB
            ↓
        FastAPI
            ↓
 API territorial /api/painel
            ↓
 Mapa + filtros + gráficos + alertas
```

## Como testar após atualizar o projeto

### 1. Atualizar a branch main

```powershell
git switch main
git pull origin main
```

### 2. Ativar o ambiente

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 3. Manter o subscriber ligado

```powershell
python -m iot.mqtt_subscriber
```

### 4. Gerar dados para toda a nova rede simulada

Em outro terminal:

```powershell
python -m iot.mqtt_publisher --ciclos 10 --intervalo 0.5
```

Como a rede agora possui mais sensores simulados, esses ciclos vão popular o MongoDB com dados de vários municípios.

### 5. Rodar a API

```powershell
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Abrir:

```text
http://127.0.0.1:8000
```

## Filtros do sistema

O usuário pode navegar em níveis:

```text
Brasil
  ↓
Goiás
  ↓
Município
  ↓
Região
  ↓
Bairro
  ↓
Sensor
```

Quando o filtro muda, mapa, KPIs, alertas, gráficos e tabela passam a representar apenas o território selecionado.

## Camadas do mapa

### Risco

Usa cores para representar a classificação simulada:

- BAIXO;
- MODERADO;
- ALTO;
- CRÍTICO;
- SEM DADOS.

### Chuva

O tamanho e a cor dos pontos variam conforme o volume de chuva da leitura mais recente.

### Nível

O ponto é comparado às cotas simuladas de atenção, alerta e nível crítico.

## Próximas melhorias geográficas

- polígonos de municípios e bairros;
- mapa de calor de chuva;
- manchas simuladas de inundação;
- radar meteorológico/chuva por grade;
- previsão de deslocamento de chuva;
- integração com dados públicos reais para pesquisa acadêmica;
- histórico de eventos por localidade;
- alertas por região e severidade;
- previsão de risco em 1h, 3h e 6h no mapa.
