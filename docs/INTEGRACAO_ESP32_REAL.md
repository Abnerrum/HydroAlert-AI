# Integração do ESP32 físico — HydroAlert-AI (novembro de 2026)

> **Status:** código preparado e testável em software, mas **sem confirmação de envio de firmware nem de captura real**. A documentação de 04/11 aponta pendência do driver FT232R/porta COM. Não apresentar os números simulados do painel como medições reais.

## Hardware da documentação da equipe

- Placa: **ESP32 Dev Module** (Arduino IDE).
- Ultrassônico: HC-SR04 — **TRIG GPIO25** e **ECHO GPIO26 apenas com divisor de tensão** (ECHO pode estar em 5 V; GPIO ESP32 não aceita 5 V).
- Temperatura/umidade: DHT11 — **DATA GPIO27**, confira tensão e pinagem reais do módulo.
- USB: cabo de dados, driver USB-serial adequado e monitor a **115200 baud**.
- **Sem pluviômetro:** umidade relativa do DHT11 não equivale à precipitação.
- **Calibração obrigatória para nível:** ajustar `ALTURA_REFERENCIA_CM` no sketch com a distância em cm até a referência de nível zero. Sem calibração, `nivel_m=null`.

## Fluxo implementado

```text
HC-SR04 + DHT11
      |
     ESP32 (firmware Arduino com JSON por USB, a cada ~5 segundos)
      |
  Porta COM / USB (115200)
      |
  python -m iot.serial_collector
      |
  data/esp32_real.jsonl e data/esp32_real.csv
      |
  GET /api/esp32/leituras (FastAPI)
      |
  Aba "ESP32 físico" (React) — dados isolados da simulação
```

O backend não inventa chuva, nível, localização nem risco. A telemetria física **não entra automaticamente no MongoDB, no treinamento, no mapa territorial nem nos alertas**: esses fluxos usam um contrato com variáveis simuladas distintas e ainda exigem calibração, novas fontes e validação para uso real.

## Executar no Windows

1. Revise a fiação com a placa desconectada. Consulte [montagem](MONTAGEM_FISICA_ESP32.md).
2. Resolva primeiro o driver USB/COM conforme [ponto de retomada](RETOMAR_TESTE_ESP32.md). **Não presuma COM5:** descubra a porta.
3. Abra `iot/esp32/hydroalert_sensores/hydroalert_sensores.ino` na Arduino IDE, escolha **ESP32 Dev Module**, confira as bibliotecas **DHT sensor library** e **Adafruit Unified Sensor**, ajuste a calibração somente se medida, e clique em **Carregar**.
4. Se as leituras JSON aparecerem no Monitor Serial a 115200, feche-o. No PowerShell, na raiz do projeto:

```powershell
python -m pip install -r requirements-hardware.txt
python -m iot.serial_collector --listar
python -m iot.serial_collector --porta COM5
```

Substitua `COM5` pela porta realmente identificada; mantenha o terminal do coletor aberto.

5. Em **outro terminal**, com as dependências Python do projeto instaladas:

```powershell
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Consulte `http://127.0.0.1:8000/api/esp32/leituras`. **Para ver a aba no front React atualizado**, execute `cd frontend` e `npm install`, seguido de `npm run dev`, e abra a URL indicada pelo Vite. A versão estática do Netlify é demonstrativa e não recebe dados USB remotamente sem a implantação e configuração de uma API própria.

## Regras de qualidade e proveniência

- A API aceita apenas registros locais com `origem=ESP32_FISICO`, data com fuso e identificador válido; ignora JSON malformado e dados do simulador.
- Estado `recente` indica que o registro tem até dois minutos. Não é um teste de conectividade da porta USB.
- Se `altura_referencia_cm` está ausente, o nível fica **não calibrado**.
- `chuva_mm=null` é diferente de 0 mm. O DHT11 mede umidade do ar, não chuva.
- Os arquivos CSV/JSONL ficam no computador que está ligado ao dispositivo. O GitHub contém o código, não medições reais.
- Coleta em bancada não comprova adequação a rios, intempéries, estabilidade elétrica ou segurança pública.

## Testes de código

```bash
python -m unittest tests.test_serial_collector tests.test_esp32_service -v
```

**Próxima etapa:** validar eletricamente o ECHO com divisor, reconhecer a COM e coletar leituras reais; depois cadastrar localização verificada e integrar pluviômetro ou fontes oficiais calibradas. Alertas automáticos de emergência precisam de homologação e revisão humana.
