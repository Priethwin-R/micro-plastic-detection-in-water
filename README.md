# Microplastic Detection in Water

An embedded IoT system for detecting the presence of microplastics in water samples using optical and turbidity sensing mechanisms, integrated with real-time alerting and web dashboards.

---

## 📌 Project Overview
Microplastics in aquatic ecosystems pose severe threats to the environment and human health. This project implements a hardware-software prototype utilizing optical sensing (turbidity and light scattering / photodiode) paired with an ESP32 microcontroller to detect suspended particles in water. When contaminant levels exceed defined thresholds, the system triggers alerts on an I2C LCD and buzzer, while simultaneously exposing sensor readings via web dashboards.

---

## 🚀 Key Features
- **Real-Time Particle Detection**: Measures water turbidity and light transmission/scattering to identify suspended particulate matter.
- **Audio & Visual Alerts**: Instant alerts through an onboard active buzzer and a 16x2 I2C LCD display.
- **Interactive Web Dashboards**: Responsive HTML/JavaScript dashboards (`embded dashboard new one.html` and `webdash.html`) featuring real-time charts (Chart.js), threshold indicators, and status monitoring.
- **Serial Telemetry**: Logs sensor values (turbidity, photodiode levels, detection flags) over 115200 baud serial connection for calibration and debugging.

---

## 🛠️ Hardware Requirements
- **Microcontroller**: ESP32 Development Board
- **Sensors**:
  - Turbidity Sensor (Analog input)
  - IR / Photodiode Sensor with Laser transmitter
- **Display**: 16x2 I2C Liquid Crystal Display (LCD) (Address: `0x27`)
- **Alert Mechanism**: 5V Active Buzzer
- **Other**: Breadboard, jumper wires, test tubes/cuvettes, and 5V power supply

---

## 📂 Repository Contents
- **`code fi.txt`**: Main ESP32 / Arduino firmware incorporating turbidity sensor, IR sensor, 16x2 I2C LCD, and buzzer alerts.
- **`embded project test code.txt`**: Experimental firmware calibrating laser and photodiode analog readings against detection thresholds.
- **`embded dashboard new one.html`**: Comprehensive IoT web dashboard with interactive charts, gauge displays, and status history.
- **`webdash.html`**: Lightweight telemetry viewer.
- **`PROJECT.. MICROPLASTIC DETECTION.pptx` / `001.pptx`**: Project presentations covering problem statement, system architecture, methodology, and results.
- **Project Reports & Lab Records**: Supporting academic and lab documentation.

---

## 💻 Firmware Setup & Flashing
1. Open the [Arduino IDE](https://www.arduino.cc/en/software).
2. Install the **ESP32 Board Package** (`esp32` by Espressif Systems).
3. Install required libraries:
   - `LiquidCrystal_I2C` (by Frank de Brabander)
   - `Wire.h` (Built-in)
4. Copy code from `code fi.txt` (or `embded project test code.txt`) into a new `.ino` sketch.
5. Connect your ESP32 via USB, select your board and COM port, and click **Upload**.
6. Open Serial Monitor at **115200 baud** to view real-time readings.
