/*
  ESP32 Microplastic Detection System with Vercel Cloud Telemetry
  Features:
  - Turbidity sensor reading (GPIO 34)
  - Optical IR sensor reading (GPIO 15)
  - Active buzzer alert (GPIO 4)
  - 16x2 I2C LCD display (SDA 21, SCL 22, addr 0x27)
  - Wi-Fi connection and HTTP POST telemetry to Vercel (/api/data)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Wi-Fi Credentials - Update with your network credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Vercel deployment URL (e.g., https://your-project.vercel.app/api/data)
const char* VERCEL_API_URL = "https://micro-plastic-detection-in-water.vercel.app/api/data";

// Hardware Pin Definitions
const int TURBIDITY_PIN = 34;
const int IR_SENSOR_PIN = 15;
const int BUZZER_PIN    = 4;

// Thresholds
const int TURBIDITY_THRESHOLD = 2000;
const int IR_DETECTED_LEVEL   = LOW; // LOW when obstacle is present

LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long lastCloudSync = 0;
const unsigned long CLOUD_SYNC_INTERVAL = 1500; // Send cloud telemetry every 1.5s

void setup() {
  Serial.begin(115200);

  pinMode(TURBIDITY_PIN, INPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Microplastic");
  lcd.setCursor(0, 1);
  lcd.print("Detection System");

  analogReadResolution(12);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWi-Fi connection failed. Continuing in local-only mode.");
  }

  delay(1500);
  lcd.clear();
}

void loop() {
  int turbidityValue = analogRead(TURBIDITY_PIN);
  int irValue = digitalRead(IR_SENSOR_PIN);

  bool irDetected = (irValue == IR_DETECTED_LEVEL);
  bool turbidityHigh = (turbidityValue > TURBIDITY_THRESHOLD);
  bool contaminationRisk = (irDetected && turbidityHigh);

  // LCD display update
  lcd.setCursor(0, 0);
  lcd.print("Turbidity:");
  lcd.print(turbidityValue);
  lcd.print("    ");

  if (contaminationRisk) {
    digitalWrite(BUZZER_PIN, HIGH);
    lcd.setCursor(0, 1);
    lcd.print("Particle Found  ");
    Serial.println("ALERT: Microplastic particles detected!");
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    lcd.setCursor(0, 1);
    lcd.print("Not Detected    ");
    Serial.println("Normal: No microplastics detected");
  }

  // Send telemetry to Vercel Cloud API
  if (WiFi.status() == WL_CONNECTED && (millis() - lastCloudSync > CLOUD_SYNC_INTERVAL)) {
    lastCloudSync = millis();
    sendTelemetryToVercel(turbidityValue, irDetected ? 1 : 0, contaminationRisk ? 1 : 0);
  }

  delay(500);
}

void sendTelemetryToVercel(int turbidity, int ir, int risk) {
  HTTPClient http;
  http.begin(VERCEL_API_URL);
  http.addHeader("Content-Type", "application/json");

  float voltage = (turbidity / 4095.0) * 3.3;
  int rssi = WiFi.RSSI();
  unsigned long uptime = millis() / 1000;

  String jsonPayload = "{";
  jsonPayload += "\"turbidityRaw\":" + String(turbidity) + ",";
  jsonPayload += "\"voltage\":" + String(voltage, 2) + ",";
  jsonPayload += "\"irDetected\":" + String(ir) + ",";
  jsonPayload += "\"contaminationRisk\":" + String(risk) + ",";
  jsonPayload += "\"buzzerActive\":" + String(risk) + ",";
  jsonPayload += "\"rssi\":" + String(rssi) + ",";
  jsonPayload += "\"uptime\":" + String(uptime);
  jsonPayload += "}";

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("[Cloud] POST status: %d\n", httpCode);
  } else {
    Serial.printf("[Cloud] POST failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
