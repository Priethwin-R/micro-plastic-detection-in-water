#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const int TURBIDITY_PIN = 34;
const int IR_SENSOR_PIN = 15;
const int BUZZER_PIN = 4;

const int TURBIDITY_THRESHOLD = 2000;

// Change to HIGH if your IR sensor outputs HIGH on detection
const int IR_DETECTED_LEVEL = LOW;

LiquidCrystal_I2C lcd(0x27, 16, 2);

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

delay(2000);
lcd.clear();

analogReadResolution(12);
}

void loop() {
int turbidityValue = analogRead(TURBIDITY_PIN);
int irValue = digitalRead(IR_SENSOR_PIN);

bool irDetected = (irValue == IR_DETECTED_LEVEL);
bool turbidityHigh = (turbidityValue > TURBIDITY_THRESHOLD);

Serial.print("Turbidity: ");
Serial.print(turbidityValue);

Serial.print(" | IR: ");
Serial.print(irValue);

Serial.print(" | Status: ");

lcd.setCursor(0, 0);
lcd.print("Turbidity:");
lcd.print(turbidityValue);
lcd.print("    ");

if (irDetected && turbidityHigh) {
digitalWrite(BUZZER_PIN, HIGH);

lcd.setCursor(0, 1);
lcd.print("Particle Found  ");

Serial.println("Possible particle detected");

} else {
digitalWrite(BUZZER_PIN, LOW);


lcd.setCursor(0, 1);
lcd.print("Not Detected    ");

Serial.println("No detection");


}

delay(500);
}
