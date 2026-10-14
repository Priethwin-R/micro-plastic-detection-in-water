#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ===================== Wi-Fi Configuration =====================
const char* WIFI_SSID     = "Prithwin";
const char* WIFI_PASSWORD = "FETSLUCK";

// ===================== Neon PostgreSQL Cloud DB =================
// Neon HTTP SQL API Endpoint
const char* NEON_SQL_URL     = "https://ep-wandering-star-b5zfvt1r-pooler.c-7.us-east-2.aws.neon.tech/sql";
// Neon Database Connection String
const char* NEON_CONN_STRING = "postgresql://neondb_owner:npg_P9aDEo0MByKX@ep-wandering-star-b5zfvt1r-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";

// ===================== Hardware Pin Definitions ================
const int TURBIDITY_PIN = 34; // Analog Turbidity Sensor
const int IR_SENSOR_PIN = 15; // Optical IR / Photodiode Sensor
const int BUZZER_PIN    = 4;  // Active Buzzer Alert

const int TURBIDITY_THRESHOLD = 2000;
const int IR_DETECTED_LEVEL   = LOW; // LOW when particle blocks optical path

// I2C 16x2 LCD Display (0x27 address, SDA: GPIO 21, SCL: GPIO 22)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Timing control for database logging
unsigned long lastDbSync = 0;
const unsigned long DB_SYNC_INTERVAL = 3000; // Log to Neon DB every 3 seconds
bool lastRiskLogged = false;

// Function prototype
void logTelemetryToNeon(int turbidity, float voltage, int ir, int risk, int buzzer);

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n--- Microplastic Detection System Starting ---");

  // Configure hardware pins
  pinMode(TURBIDITY_PIN, INPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize I2C LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Microplastic");
  lcd.setCursor(0, 1);
  lcd.print("Detection System");

  analogReadResolution(12); // ESP32 12-bit ADC (0 - 4095)

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi:");
  lcd.setCursor(0, 1);
  lcd.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] IP Address: ");
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Connection timed out. Operating in offline sensor mode.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Offline");
    lcd.setCursor(0, 1);
    lcd.print("Local Mode Active");
  }

  delay(2000);
  lcd.clear();
}

void loop() {
  // Read optical & turbidity sensors
  int turbidityValue = analogRead(TURBIDITY_PIN);
  int irValue = digitalRead(IR_SENSOR_PIN);

  float voltage = (turbidityValue / 4095.0) * 3.3;
  bool irDetected = (irValue == IR_DETECTED_LEVEL);
  bool turbidityHigh = (turbidityValue > TURBIDITY_THRESHOLD);
  bool contaminationRisk = (irDetected && turbidityHigh);

  // Print telemetry to Serial Monitor
  Serial.print("Turbidity: ");
  Serial.print(turbidityValue);
  Serial.print(" (");
  Serial.print(voltage, 2);
  Serial.print("V) | IR: ");
  Serial.print(irValue);
  Serial.print(" | Risk: ");
  Serial.print(contaminationRisk ? "CONTAMINATED" : "CLEAN");

  // Update LCD Display Row 0
  lcd.setCursor(0, 0);
  lcd.print("Turbidity:");
  lcd.print(turbidityValue);
  lcd.print("    ");

  // Decision & Alert Handling
  if (contaminationRisk) {
    digitalWrite(BUZZER_PIN, HIGH);
    lcd.setCursor(0, 1);
    lcd.print("Particle Found! ");
    Serial.println(" --> [ALERT] Possible microplastic particle detected!");
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    lcd.setCursor(0, 1);
    lcd.print("Not Detected    ");
    Serial.println(" --> [OK] No detection");
  }

  // Neon PostgreSQL Cloud Sync:
  // Sync immediately if contamination state changes, OR every DB_SYNC_INTERVAL (3 seconds)
  bool timeToSync = (millis() - lastDbSync >= DB_SYNC_INTERVAL);
  bool urgentAlert = (contaminationRisk && !lastRiskLogged);

  if (WiFi.status() == WL_CONNECTED && (timeToSync || urgentAlert)) {
    lastDbSync = millis();
    lastRiskLogged = contaminationRisk;

    logTelemetryToNeon(
      turbidityValue,
      voltage,
      irDetected ? 1 : 0,
      contaminationRisk ? 1 : 0,
      contaminationRisk ? 1 : 0
    );
  }

  delay(500);
}

// Function to execute direct SQL INSERT into Neon PostgreSQL
void logTelemetryToNeon(int turbidity, float voltage, int ir, int risk, int buzzer) {
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate validation for lightweight embedded TLS

  HTTPClient http;
  if (!http.begin(client, NEON_SQL_URL)) {
    Serial.println("[Neon DB] Failed to initialize HTTPS connection");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Neon-Connection-String", NEON_CONN_STRING);

  // Construct SQL query
  int rssi = WiFi.RSSI();
  unsigned long uptime = millis() / 1000;

  String sql = "INSERT INTO telemetry_logs (turbidity_raw, voltage, ir_detected, contamination_risk, buzzer_active, rssi, uptime, source) VALUES (" +
               String(turbidity) + ", " +
               String(voltage, 2) + ", " +
               String(ir) + ", " +
               String(risk) + ", " +
               String(buzzer) + ", " +
               String(rssi) + ", " +
               String(uptime) + ", 'esp32-direct');";

  // Escape quotation for JSON payload
  String jsonBody = "{\"query\":\"" + sql + "\"}";

  int httpCode = http.POST(jsonBody);

  if (httpCode == HTTP_CODE_OK || httpCode == 200) {
    Serial.println("[Neon DB] Telemetry record logged to Neon PostgreSQL!");
  } else if (httpCode > 0) {
    Serial.printf("[Neon DB] HTTP Response code: %d\n", httpCode);
  } else {
    Serial.printf("[Neon DB] POST Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
