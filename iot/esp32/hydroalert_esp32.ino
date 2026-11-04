#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>
#include <math.h>

// Ajuste Wi-Fi e IP do PC Docker. Nunca use localhost no ESP32.
const char* WIFI_SSID="SEU_WIFI";
const char* WIFI_PASS="SUA_SENHA";
const char* MQTT_HOST="192.168.1.100";
const char* DEVICE_ID="ESP32-LAB-001";
const char* TOPIC="hydroalert/telemetria/ESP32-LAB-001";
const int TRIG=19, ECHO=18, DHT_PIN=4;
const float ALTURA_CM=50.0f; // calibrar com recipiente real
DHT dht(DHT_PIN,DHT11);
WiFiClient net;
PubSubClient mqtt(net);
unsigned long ultimo=0;

bool conectarWiFi() {
  if(WiFi.status()==WL_CONNECTED) return true;
  WiFi.begin(WIFI_SSID,WIFI_PASS);
  for(int i=0;i<20 && WiFi.status()!=WL_CONNECTED;i++) delay(500);
  return WiFi.status()==WL_CONNECTED;
}
bool conectarMQTT() {
  if(mqtt.connected()) return true;
  if(!conectarWiFi()) return false;
  bool ok=mqtt.connect("hydroalert-esp32-lab");
  Serial.printf("MQTT: %s (codigo=%d)\n",ok?"conectado":"falhou",mqtt.state());
  return ok;
}
float medirDistancia() {
  digitalWrite(TRIG,LOW); delayMicroseconds(2);
  digitalWrite(TRIG,HIGH); delayMicroseconds(10); digitalWrite(TRIG,LOW);
  unsigned long duracao=pulseIn(ECHO,HIGH,30000UL);
  if(duracao==0) return NAN;
  return duracao*0.0343f/2.0f;
}
const char* risco(float nivel) {
  if(nivel>=0.40f) return "CRITICO";
  if(nivel>=0.30f) return "ALTO";
  if(nivel>=0.20f) return "MODERADO";
  return "BAIXO";
}
void publicar() {
  if(!conectarMQTT()) return;
  float dist=medirDistancia(), temp=dht.readTemperature(), hum=dht.readHumidity();
  if(!isfinite(dist)||dist<2||dist>ALTURA_CM+5||!isfinite(temp)||!isfinite(hum)) {
    Serial.println("Leitura invalida; verifique sensor/cabos/calibracao");
    return;
  }
  struct tm t;
  if(!getLocalTime(&t,1500)) {Serial.println("Aguardando horario NTP");return;}
  char stamp[40];
  strftime(stamp,sizeof(stamp),"%Y-%m-%dT%H:%M:%S-03:00",&t);
  float nivel=fmaxf(0,(ALTURA_CM-dist)/100.0f);
  char json[768];
  // chuva_mm=0 e SOMENTE compatibilidade com schema antigo: chuva_medida=false.
  // NAO utilizar esse zero em indicadores de chuva ou treinamento preditivo.
  snprintf(json,sizeof(json),
    "{\"sensor_id\":\"%s\",\"timestamp\":\"%s\","
    "\"nome\":\"Estacao IoT bancada\",\"origem\":\"ESP32_REAL_LAB\","
    "\"status_sensor\":\"ONLINE\",\"chuva_mm\":0,\"chuva_medida\":false,"
    "\"nivel_m\":%.3f,\"temperatura_c\":%.2f,\"umidade_pct\":%.2f,"
    "\"distancia_cm\":%.2f,\"altura_referencia_cm\":%.2f,"
    "\"cota_atencao_m\":0.20,\"cota_alerta_m\":0.30,"
    "\"cota_critica_m\":0.40,\"risco\":\"%s\"}",
    DEVICE_ID,stamp,nivel,temp,hum,dist,ALTURA_CM,risco(nivel));
  if(mqtt.publish(TOPIC,json)) Serial.println(json);
  else Serial.println("Falha no publish MQTT");
}
void setup(){
  Serial.begin(115200);
  pinMode(TRIG,OUTPUT); pinMode(ECHO,INPUT);
  dht.begin();
  mqtt.setServer(MQTT_HOST,1883);
  mqtt.setBufferSize(1024);
  if(conectarWiFi()) configTime(-3*3600,0,"pool.ntp.org","time.google.com");
  ultimo=millis()-10000UL;
}
void loop(){
  if(!mqtt.connected()) conectarMQTT();
  if(mqtt.connected()) mqtt.loop();
  if(millis()-ultimo>=10000UL){ultimo=millis();publicar();}
  delay(100);
}
