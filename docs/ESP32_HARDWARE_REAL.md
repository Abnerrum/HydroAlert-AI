# ESP32 físico no HydroAlert-AI

Firmware: iot/esp32/hydroalert_esp32.ino. Protótipo acadêmico de bancada; não constitui alerta oficial.

## Hardware e segurança

Instale na Arduino IDE as bibliotecas PubSubClient, DHT sensor library (Adafruit) e Adafruit Unified Sensor. Selecione ESP32 Dev Module.

Pinagem SUGERIDA, a verificar na fiação real: HC-SR04 TRIG = GPIO19, ECHO = GPIO18; DHT11 DATA = GPIO4; GND comum.
HC-SR04 ECHO geralmente fornece 5 V: use divisor resistivo para 3,3 V no GPIO18. Nunca conecte ECHO 5 V diretamente ao ESP32. Consulte as tensões do seu módulo DHT11.
Calibre ALTURA_CM com a distância sensor-fundo do recipiente. Cotas de risco 20/30/40 cm são didáticas, não oficiais. Mantenha a eletrônica longe da água.

## Executar

1. Inicie Docker Desktop no Windows e, na pasta do projeto, execute:

    docker compose up -d --build mosquitto mongo subscriber api
    docker compose ps

2. Descubra o IPv4 do computador com ipconfig. Configure WIFI_SSID, WIFI_PASS e MQTT_HOST no firmware. O IP deve ser o do PC na mesma rede Wi-Fi, não localhost.
3. Permita conexão TCP 1883 somente na rede privada local (firewall Windows). Não exponha o broker MQTT anônimo na internet.
4. Carregue o firmware pela Arduino IDE e abra o Monitor Serial em 115200 baud.
5. Verifique mensagens com: docker compose logs -f subscriber
6. Abra: http://localhost:8000/api/telemetria?sensor_id=ESP32-LAB-001
7. Dashboard: http://localhost:8000 ; documentação API: http://localhost:8000/docs

## Limitações dos dados

HC-SR04 mede distância, que o firmware converte em nível da água. DHT11 mede temperatura e umidade, não chuva.
O firmware envia chuva_mm=0 só para satisfazer o schema legado e marca chuva_medida=false. Zero NÃO significa ausência de chuva. Filtre esses registros de métricas e modelos pluviométricos.
Para exibir a estação no mapa territorial, será necessário cadastrá-la no catálogo, que atualmente contém pontos simulados.
Não usar o sistema como serviço de previsão ou alerta real. Cotas e sensores precisam de validação, sensores de chuva e calibração.

## Diagnóstico

MQTT desconectado: confira Wi-Fi, IP do PC, porta 1883, Docker e firewall.
Leitura inválida: confirme TRIG/ECHO, divisor 5 V para 3,3 V, alimentação e DHT11.
Sem horário: o ESP32 precisa sincronizar NTP antes de publicar.
Sem dados: confira docker compose logs subscriber e a API /api/telemetria.