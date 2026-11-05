# Ponto de retomada — teste físico do HydroAlert-AI

Registro de 04/11/2026 (horário de Brasília), baseado nas telas do computador de teste e no trabalho desta sessão.

## Onde paramos

**Instalação do driver FTDI pendente.** O Windows detectou `FT232R USB UART` em Outros dispositivos, com Código 28 (driver não instalado). A opção Porta na Arduino IDE está desabilitada. O Windows Update apresentou “Ocorreu um problema. Tente reabrir as Configurações mais tarde”.

Próxima ação: baixar o instalador VCP no site oficial https://ftdichip.com/drivers/vcp-drivers/ (link “setup executable”), extrair o ZIP se necessário, executar e concluir a instalação. Desconectar/reconectar o USB e conferir se aparece **USB Serial Port (COM...)** em Portas (COM e LPT). A instalação desse driver ainda não foi confirmada.

## O que já foi feito

| Item | Situação observada |
| --- | --- |
| Git para Windows | Instalado; versão exibida: 2.56.0.windows.4 |
| Repositório local | Clonado em `C:\Users\Aluno\Documents\HydroAlert-AI` e atualizado com git pull |
| Reconhecimento do Git no terminal | Foi necessário acrescentar `C:\Program Files\Git\cmd` ao PATH da sessão; configuração permanente não confirmada |
| Arduino IDE | Instalada; versão exibida: 2.3.10 |
| Idioma da IDE | Português (Brasil) |
| Sketchbook | `C:\Users\Aluno\Documents\Arduino` |
| URL de placas | `https://espressif.github.io/arduino-esp32/package_esp32_index.json` |
| Pacote ESP32 | esp32 por Espressif Systems; versão 3.3.12 exibida durante a instalação |
| Python | Python 3.12.10 instalado pelo winget |
| Ambiente da coleta | Instalador USB terminou com sucesso, preparando .venv e pyserial |
| Biblioteca DHT | DHT sensor library 1.4.7 instalada |
| Biblioteca auxiliar | Adafruit Unified Sensor 1.1.15 instalada |
| Firmware | Compilado com sucesso para esp32:esp32:esp32 |
| Uso de memória na compilação | 274884 bytes de programa (20%); 22132 bytes de variáveis globais (6%) |
| Arquivo na Arduino IDE | hydroalert_sensores.ino aberto |
| Placa selecionada | Corrigida de ESP32C5 Dev Module para **ESP32 Dev Module** |
| Porta serial | Ainda indisponível; falta resolver driver FT232R |
| Envio do firmware | Ainda não confirmado |
| Dados reais coletados | Ainda não confirmados |
| Docker/MongoDB/MQTT | Instalação/execução local não confirmada nesta etapa USB |

O GitHub guarda código, requisitos, instalador e este registro. Programas instalados no Windows, drivers e .venv não são incorporados ao repositório; o instalador recria o ambiente quando necessário.

## Código e instaladores já publicados

- `INSTALAR_TUDO.bat`: inicia preparação para Windows.
- `scripts/instalar_windows.ps1`: encontra/instala Python 3.12; corrigido o encerramento prematuro quando o launcher não encontra esse runtime.
- `scripts/instalar_projeto.py`: opções USB e completa; prepara dependências e compila o firmware.
- `requirements-hardware.txt`: requisito pyserial.
- `iot/esp32/hydroalert_sensores/hydroalert_sensores.ino`: ESP32 + HC-SR04 + DHT11.
- `iot/serial_collector.py`: valida e salva medições.
- `COLETAR_ESP32.bat` e `scripts/coletar_usb.py`: seleção da porta e coleta.
- `docs/INSTALACAO_WINDOWS.md` e `docs/COLETA_ESP32_USB.md`: guias completos.
- Testes: cinco do coletor e quatro do instalador passaram no ambiente de desenvolvimento. Os testes do instalador simulam comandos externos; o sucesso real da compilação foi posteriormente confirmado na tela do Windows.

## Retomar depois de instalar o driver

1. Conferir no Gerenciador de Dispositivos a porta COM real; não assumir COM3 ou COM5.
2. Conferir ligações com USB desligado: TRIG GPIO25, ECHO GPIO26 **com divisor de tensão**, DATA DHT11 GPIO27 e terra comum. A continuidade dos fios e o divisor não foram validados pelas fotos.
3. Abrir a Arduino IDE e o arquivo:

   `C:\Users\Aluno\Documents\HydroAlert-AI\iot\esp32\hydroalert_sensores\hydroalert_sensores.ino`

4. Selecionar **ESP32 Dev Module** e **Ferramentas → Porta → COM correspondente**.
5. Usar **Carregar**, seta simples → (segundo botão), ou **Ctrl+U**. O botão com inseto inicia depuração e gerou os erros gdb-server/OpenOCD observados; esses erros não demonstram falha na compilação.
6. Esperar confirmação de envio. Se necessário, investigar a mensagem exata; não repetir instalações sem diagnóstico.
7. Para ver leituras, abrir Monitor Serial a **115200 baud**.
8. Fechar o Monitor Serial antes de iniciar a coleta pelo computador:

```powershell
cd C:\Users\Aluno\Documents\HydroAlert-AI
.\COLETAR_ESP32.bat
```

Escolher o número da porta enumerada. Encerrar com Ctrl+C. Arquivos esperados: `data/esp32_real.csv` e `data/esp32_real.jsonl`.

## Atualizar o projeto

```powershell
cd C:\Users\Aluno\Documents\HydroAlert-AI
git pull origin main
```

Se o terminal não reconhecer Git, o caminho instalado já foi confirmado:

```powershell
$env:Path += ";C:\Program Files\Git\cmd"
git --version
```

A preparação com `INSTALAR_TUDO.bat` já terminou no computador de teste. Não é necessário repeti-la em cada coleta. Só repetir se faltar dependência ou houver mudança de requisitos. Em outro computador, preparar o ambiente uma vez.

## Limites das medições

- Mede distância, temperatura e umidade do ar.
- `ALTURA_REFERENCIA_CM` está inicialmente em zero: nível fica ausente até calibrar e gravar novamente.
- O conjunto não inclui pluviômetro; `chuva_mm` permanece null, sem inventar chuva zero.
- Testar distância com a mão não comprova medição de nível de rio.
- Coleta física ainda separada do dashboard/MQTT/treino de ML. Não há confirmação de integração automática nem de previsão com dados reais.
