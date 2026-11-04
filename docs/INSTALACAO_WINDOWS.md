# Instalar depois de extrair o ZIP

1. Extraia o ZIP inteiro em uma pasta gravavel. Nao execute dentro do ZIP.
2. Feche a Arduino IDE para evitar instalacoes simultaneas no pacote ESP32.
3. Abra `INSTALAR_TUDO.bat` com dois cliques.
4. Escolha **1** (coleta USB) ou **2** (projeto completo).
5. Aguarde o resultado final. A primeira instalacao baixa arquivos grandes;
   o console mostra cada etapa e erros interrompem o processo.

O instalador usa Python 3.12 (instala via winget se ausente), cria `.venv`,
instala pyserial e, no modo completo, as dependencias de `requirements.txt`.
Reutiliza o Arduino CLI do PATH ou da Arduino IDE no local padrao; se ausente,
instala Arduino IDE pelo winget. Instala esp32:esp32, DHT sensor library e
Adafruit Unified Sensor, depois compila o firmware para ESP32 Dev Module.
Usa o arquivo `.arduinoIDE/arduino-cli.yaml` quando disponivel para compartilhar
as pastas configuradas na IDE. Reabra a IDE apos a instalacao.

No modo completo, instala Docker Desktop se o comando docker estiver ausente.
O dashboard ja esta incluido: Node.js nao e necessario para executa-lo.
MongoDB e Mosquitto sao executados pelos containers do projeto.
Abra Docker Desktop e conclua seus termos/configuracao, WSL2/virtualizacao e
reinicializacao quando solicitados. Depois abra `INICIAR_HYDROALERT.bat`.

## Primeiro teste fisico

Abra `iot/esp32/hydroalert_sensores/hydroalert_sensores.ino` na Arduino IDE.
Confira a ligacao no [guia USB](COLETA_ESP32_USB.md), selecione a placa e a porta
e clique em Carregar. O instalador apenas compila: nao grava automaticamente.
Feche o Monitor Serial e abra `COLETAR_ESP32.bat`; escolha o numero da porta.
Os arquivos reais ficam em `data/esp32_real.csv` e `data/esp32_real.jsonl`.
Essa coleta ainda nao alimenta automaticamente o dashboard de simulacao.

## Se houver erro

- Sem winget: atualize **Instalador de Aplicativo** na Microsoft Store ou instale
  Python 3.12 e Arduino IDE pelos sites oficiais antes de executar novamente.
- Driver USB: o modelo depende do conversor da placa (FTDI, CP210x, CH340 etc.).
  Nao ha instalacao generica de driver; use o fabricante identificado no Windows.
- Download interrompido: confira internet e execute o instalador novamente.
- Maquina institucional: instalacoes podem pedir credenciais do administrador.
- Docker instalado mas indisponivel: abra Docker Desktop e aguarde o motor iniciar.

Nao inclui instaladores binarios no ZIP; baixa dependencias durante a execucao.
Reexecutar reaproveita o ambiente e os pacotes ja instalados.
Referencias: https://docs.arduino.cc/arduino-cli/commands-reference/arduino-cli_core_install
e https://docs.arduino.cc/arduino-cli/commands-reference/arduino-cli_lib_install
