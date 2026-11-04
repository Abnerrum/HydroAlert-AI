// ESP32 Dev Module + HC-SR04 + DHT11. Confira a ligacao no guia.
// Bibliotecas: DHT sensor library (Adafruit) e Adafruit Unified Sensor.
#include <DHT.h>
#include <math.h>

constexpr int PIN_TRIG = 25;
constexpr int PIN_ECHO = 26;  // ECHO somente atraves de divisor de tensao!
constexpr int PIN_DHT = 27;
constexpr uint32_t INTERVALO_MS = 5000;
// Distancia do sensor ao fundo seco, em cm. Zero = nao calibrado.
constexpr float ALTURA_REFERENCIA_CM = 0.0f;
constexpr char SENSOR_ID[] = "ESP32-REAL-001";
DHT dht(PIN_DHT, DHT11);

void numeroOuNull(float valor) {
  if (isfinite(valor)) Serial.print(valor, 3);
  else Serial.print("null");
}

float distanciaCm() {
  float amostras[5];
  int total = 0;
  for (int i = 0; i < 5; ++i) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);
    unsigned long duracao = pulseIn(PIN_ECHO, HIGH, 30000UL);
    float cm = duracao * 0.0343f / 2.0f;
    if (duracao && cm >= 2.0f && cm <= 400.0f) amostras[total++] = cm;
    delay(60);
  }
  if (total < 3) return NAN;
  for (int i = 0; i < total; ++i)
    for (int j = i + 1; j < total; ++j)
      if (amostras[j] < amostras[i]) {
        float temp = amostras[i]; amostras[i] = amostras[j]; amostras[j] = temp;
      }
  return amostras[total / 2];
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT);
  dht.begin();
  delay(2000);
}

void loop() {
  float temperatura = dht.readTemperature();
  float umidade = dht.readHumidity();
  if (!isfinite(temperatura) || temperatura < 0 || temperatura > 50) temperatura = NAN;
  if (!isfinite(umidade) || umidade < 0 || umidade > 100) umidade = NAN;
  float distancia = distanciaCm();
  float nivel = NAN;
  if (ALTURA_REFERENCIA_CM > 0 && isfinite(distancia) && distancia <= ALTURA_REFERENCIA_CM)
    nivel = (ALTURA_REFERENCIA_CM - distancia) / 100.0f;
  Serial.print("{\"sensor_id\":\""); Serial.print(SENSOR_ID);
  Serial.print("\",\"origem\":\"ESP32_FISICO\",\"uptime_ms\":"); Serial.print(millis());
  Serial.print(",\"distancia_cm\":"); numeroOuNull(distancia);
  Serial.print(",\"temperatura_c\":"); numeroOuNull(temperatura);
  Serial.print(",\"umidade_pct\":"); numeroOuNull(umidade);
  Serial.print(",\"altura_referencia_cm\":");
  numeroOuNull(ALTURA_REFERENCIA_CM > 0 ? ALTURA_REFERENCIA_CM : NAN);
  Serial.print(",\"nivel_m\":"); numeroOuNull(nivel);
  Serial.print(",\"chuva_mm\":null,\"status_sensor\":\"");
  Serial.print(isfinite(distancia) && isfinite(temperatura) && isfinite(umidade) ? "OK" : "PARCIAL");
  Serial.println("\"}");
  delay(INTERVALO_MS);
}
