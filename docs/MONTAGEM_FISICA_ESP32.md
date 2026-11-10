# Montagem física do ESP32 — HydroAlert-AI (10/11/2026)

## Componentes observados
A fotografia enviada mostra um ESP32 Dev Module em protoboard, um sensor azul que parece ser DHT11 e um módulo com transdutores circulares que parece ser HC-SR04. A identificação e os pinos **não podem ser confirmados pela foto**, pois fios e inscrições estão encobertos. Há um cabo USB conectado à placa, mas **não há comprovação de comunicação COM, firmware gravado ou leituras reais**.

## Antes de energizar: confira com o cabo USB desconectado
O firmware atual em `iot/esp32/hydroalert_sensores/hydroalert_sensores.ino` espera:

| Sensor | Terminal | ESP32 |
| --- | --- | --- |
| HC-SR04 | VCC | 5V/VIN (somente se disponível/adequado à sua placa) |
| HC-SR04 | GND | GND |
| HC-SR04 | TRIG | GPIO25 |
| HC-SR04 | ECHO | GPIO26 **por divisor resistivo** |
| DHT11 (módulo) | VCC | 3V3, se suportado pelo módulo |
| DHT11 (módulo) | GND | GND |
| DHT11 (módulo) | DATA | GPIO27 |

**RISCO ELÉTRICO:** o ECHO do HC-SR04 pode fornecer 5 V e **não deve ser ligado diretamente a um GPIO do ESP32 de 3,3 V**. Use, por exemplo, dois resistores de 10 kΩ em série entre ECHO e GND, conectando GPIO26 ao ponto médio (aprox. 2,5 V quando ECHO=5 V). Confira as etiquetas dos pinos e as especificações reais dos módulos. Não use apenas cores de fios. Se o DHT11 for o componente avulso de quatro pinos, pode exigir resistor pull-up no DATA; módulos costumam ter esse resistor integrado.

## Instalação e teste no Windows
O histórico registra Arduino IDE 2.3.10, pacote ESP32, bibliotecas Adafruit e compilação bem-sucedida. A etapa pendente era o driver **FT232R USB UART** (Código 28), com porta da Arduino IDE indisponível. O Windows Update com erro não impede a instalação manual do driver correto.

1. Com os fios conferidos e USB desconectado, obtenha o driver VCP em https://ftdichip.com/drivers/vcp-drivers/ (somente se o dispositivo for mesmo FT232R; outros chips podem requerer CP210x/CH340).
2. Instale o driver; reconecte o USB ao computador usando cabo com dados.
3. Abra **Gerenciador de Dispositivos → Portas (COM e LPT)** e anote a porta atribuída. Se não aparecer, investigue driver, cabo e conexão; não invente uma COM.
4. Na Arduino IDE, abra `iot/esp32/hydroalert_sensores/hydroalert_sensores.ino`; escolha **ESP32 Dev Module** e a porta COM correta.
5. Clique em **Carregar** (não em Depurar). Se o upload não iniciar, consulte o erro antes de tentar BOOT.
6. Abra o Monitor Serial em **115200 baud**. O firmware emite uma linha JSON a cada ~5 segundos, com temperatura, umidade, distância e campos ausentes como `null`.
7. **Feche o Monitor Serial** antes de executar a coleta por Python:

```powershell
cd C:\Users\Aluno\Documents\HydroAlert-AI
.\COLETAR_ESP32.bat
```

A coleta pergunta qual das portas detectadas usar e cria/acrescenta `data/esp32_real.csv` e `data/esp32_real.jsonl`. Encerre com Ctrl+C.

Se o ambiente Python ainda não estiver preparado, execute `INSTALAR_TUDO.bat` uma vez e escolha o modo coleta USB. A aplicação pode coletar por USB **sem Docker ou MongoDB**.

## O que ainda não está concluído
- Conferência visual/eletrônica de cada conexão e proteção ECHO.
- Instalação do driver e porta COM reconhecida no computador.
- Envio e execução do firmware na placa física; comprovação de amostras.
- Calibração da altura de referência: `ALTURA_REFERENCIA_CM=0` indica não calibrado; `nivel_m` fica nulo.
- Integração de medições reais ao dashboard/ML, que requer tratamento para precipitação ausente, localização e regras de alerta. Um DHT11 mede **umidade do ar**, não chuva. Não simular `chuva_mm=0` como se fosse medição.

Consulte também [COLETA_ESP32_USB.md](COLETA_ESP32_USB.md) e [RETOMAR_TESTE_ESP32.md](RETOMAR_TESTE_ESP32.md).
