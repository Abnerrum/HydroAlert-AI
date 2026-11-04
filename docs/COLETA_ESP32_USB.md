# Coleta real: ESP32 + HC-SR04 + DHT11 por USB

As fotos sugerem esses componentes; confirme os nomes impressos nas placas.
Os fios escondem os terminais: os GPIOs abaixo sao uma configuracao proposta,
nao uma identificacao das conexoes das fotos. Desligue o USB antes de ajustar.

## Ligacao proposta

| Componente | Terminal | ESP32 |
| --- | --- | --- |
| HC-SR04 | VCC | 5V/VIN da placa alimentada por USB (confira sua placa) |
| HC-SR04 | GND | GND comum |
| HC-SR04 | TRIG | GPIO25 |
| HC-SR04 | ECHO | GPIO26 **com divisor de tensao** |
| Modulo DHT11 | VCC/+ | 3V3, se o seu modulo suportar essa alimentacao |
| Modulo DHT11 | DATA/S/OUT | GPIO27 |
| Modulo DHT11 | GND/- | GND comum |

**Nao ligue ECHO de 5V diretamente ao ESP32.** Use dois resistores de 10 kΩ:
ECHO ao primeiro resistor; outra ponta ao GPIO26 e ao segundo resistor;
outra ponta do segundo ao GND. Isso reduz 5V a aproximadamente 2,5V.
Nao e possivel confirmar nas fotos se existe divisor. Confira antes de energizar.
Referencia: https://learn.adafruit.com/distance-measurement-ultrasound-hcsr04/connect-the-sensor

Confira a ordem dos pinos impressa no modulo DHT11; nao confie na cor dos fios.
Um DHT11 avulso precisa de pull-up DATA–3V3 (4,7–10 kΩ); modulos de tres pinos
costumam trazer esse resistor. Se o seu modulo exige 5V, adapte tambem o nivel
logico de DATA para 3,3V conforme sua documentacao.

## Gravar no ESP32

1. Na Arduino IDE, instale o pacote de placas **esp32 by Espressif Systems**.
2. Instale **DHT sensor library by Adafruit** e **Adafruit Unified Sensor**.
3. Abra `iot/esp32/hydroalert_sensores/hydroalert_sensores.ino`.
4. Confira os GPIOs no inicio do arquivo e selecione sua placa (normalmente
   ESP32 Dev Module para esse formato) e a porta USB.
5. Grave. Se a placa nao iniciar a gravacao, segure BOOT durante a conexao.
6. No Monitor Serial, selecione **115200 baud**. Sai uma linha JSON a cada
   aproximadamente 5 segundos; leituras com falha sao `null`.

## Coletar no computador (Windows)

No terminal, dentro da pasta do projeto:

```powershell
python -m pip install -r requirements-hardware.txt
python -m iot.serial_collector --listar
python -m iot.serial_collector --porta COM5
```

Troque COM5 pela porta listada. Feche o Monitor Serial da Arduino IDE antes
de iniciar: somente um programa deve abrir a porta. Se nao aparecer porta,
confira cabo de dados, driver USB da sua placa e Gerenciador de Dispositivos.
No Linux, use por exemplo `--porta /dev/ttyUSB0`.

O coletor acrescenta o horario UTC do computador no recebimento e salva:

- `data/esp32_real.csv`: abre no Excel; valores ausentes ficam vazios.
- `data/esp32_real.jsonl`: uma leitura por linha, com `null` para ausencias.

Ctrl+C encerra preservando os dados. Se o cabo desconectar, reconecte e execute
o comando novamente; registros novos sao acrescentados aos arquivos.
Nao exige Wi-Fi, Docker, MQTT, MongoDB nem servico pago.

## Calibrar nivel da agua

Fixe o ultrassonico acima da superficie, apontando para baixo. Meca em cm a
distancia da face do sensor ao fundo seco/referencia de nivel zero.
Coloque esse valor em `ALTURA_REFERENCIA_CM` e grave novamente.
Exemplo: referencia 50 cm e distancia medida 20 cm resultam em nivel 0,30 m.
Sem calibracao, salva distancia e deixa nivel ausente. Distancia maior que
a referencia tambem deixa nivel ausente; confira a montagem/calibracao.
Mantenha a superficie entre 2 e 400 cm do sensor; o HC-SR04 comum nao deve
ser submerso. Testar com a mao confirma distancia, nao mede nivel real de rio.

## Limites e integracao com o sistema existente

Este conjunto mede **distancia, temperatura e umidade relativa do ar**.
Umidade nao e precipitacao: `chuva_mm` fica ausente porque nao ha pluviometro.
Nao inventa coordenadas, cotas de alerta ou classificacao de risco.

A coleta fica separada da simulacao. O dashboard/MQTT existente exige
`chuva_mm` numerica e nivel valido; por isso estes arquivos **nao entram
automaticamente no painel nem no treino de ML**. Nao publique esses pacotes
no topico de telemetria existente: serao rejeitados pelo contrato atual.
Uma integracao posterior precisa tratar chuva ausente em indicadores/ML,
cadastrar localizacao real e definir cotas adequadas ao local.

## Validacao

```bash
python -m unittest discover -s tests -p test_serial_collector.py -v
```

Os testes cobrem calibracao, ausencia de eco/DHT, rejeicao de valores invalidos,
separacao de dados simulados e gravacao CSV/JSONL. A gravacao/compilacao do
firmware e a validacao eletrica precisam ser realizadas na placa fisica.
