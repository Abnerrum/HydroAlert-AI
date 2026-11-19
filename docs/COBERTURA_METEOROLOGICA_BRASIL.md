# Meteorologia Brasil — cobertura das 27 unidades federativas

Este módulo amplia as consultas do HydroAlert-AI às **26 capitais estaduais e Brasília (DF)** com **modelos meteorológicos Open-Meteo**. O usuário pode escolher uma UF e outro município no filtro IBGE para consultar seu ponto aproximado com geocodificação. As coordenadas das capitais não representam estações instaladas.

## Fontes e transparência

- **IBGE:** catálogo das 27 UFs e municípios por UF. O backend já tinha 27 UFs; a demonstração Netlify listava apenas seis.
- **Open-Meteo Forecast:** temperatura (°C), umidade (%), precipitação (mm no intervalo atual do modelo) e vento (km/h), em horário UTC. **Dados de modelos**, não medições de pluviômetros.
- **Open-Meteo Geocoding:** busca de municípios por nome e estado. Falhas são informadas e não se inventam coordenadas.
- **ANA/HidroWeb, CEMADEN, INMET:** outras fontes de observações hidrometeorológicas para futuras integrações. O acesso automatizado ao HidroWeb requer autorização da ANA; essas séries **não estão integradas** neste módulo.

## API

```text
GET /api/meteorologia/brasil
GET /api/meteorologia/brasil?forcar=true
```

Resposta: `fonte`, `tipo=meteorologia_modelada`, `capital_total=27`, `com_dados` e `pontos`. Cada ponto inclui `uf`, `capital`, `latitude`, `longitude`, `disponivel`, `timestamp_utc`, `temperatura_c`, `umidade_pct`, `precipitacao_mm`, `vento_kmh`. Dados indisponíveis são `null`, não zero.

A API FastAPI faz três lotes de nove capitais em paralelo e usa cache por dez minutos quando obtém dados. A demonstração Netlify busca a mesma fonte diretamente pelo navegador e não exibe valores simulados como meteorologia real. O catálogo geográfico `services/capitais_brasil.json` é compartilhado por frontend e backend.

## Limitações

A cobertura nacional representa **um ponto meteorológico por capital**, não o monitoramento de todos os municípios, bairros e rios. Meteorologia modelada por si só **não determina risco de inundação**: faltam séries confiáveis de nível d'água, cotas de alerta, dados de drenagem e validação em campo. O protótipo não emite alertas oficiais nem substitui a Defesa Civil. Os pontos de Goiás do painel IoT continuam sendo demonstrações acadêmicas separadas.

As APIs externas podem estar indisponíveis ou ter restrições de uso. Para operação comercial, consulte as condições atuais de licença do Open-Meteo.

## Testes

```bash
python -m unittest tests.test_meteorologia_brasil -v
cd frontend
npm ci
npm test
npm run build
```

No painel, clique **Meteorologia Brasil** e selecione a capital. Nos filtros acima, escolha uma **UF** e um **município** para buscar outra localidade. **Atualizar clima** solicita novos dados; erros são mostrados sem preencher valores fictícios.

Fontes:
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/geocoding-api
- https://servicodados.ibge.gov.br/api/docs/localidades
- https://www.snirh.gov.br/hidroweb/acesso-api
