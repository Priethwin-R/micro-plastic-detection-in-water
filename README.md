# Microplastic Detection in Water

An embedded IoT system for detecting the presence of microplastics in water samples using optical and turbidity sensing mechanisms, integrated with real-time alerting and a modern web dashboard deployed on **Vercel**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPriethwin-R%2Fmicro-plastic-detection-in-water)

---

## 📌 Project Overview
Microplastics in aquatic ecosystems pose severe threats to the environment and human health. This project implements an embedded prototype utilizing optical sensing (turbidity and light scattering / photodiode) paired with an ESP32 microcontroller to detect suspended particles in water. When contaminant levels exceed defined thresholds, the system triggers alerts on an I2C LCD and buzzer, while simultaneously streaming sensor readings to a cloud web dashboard hosted on **Vercel**.

---

## 🌐 Vercel Live Deployment
The web dashboard is fully configured for zero-config deployment on **Vercel**:
- **Primary Dashboard**: `index.html` (served automatically at root `/`)
- **Serverless Cloud API**: `api/data.js` (handles both telemetry retrieval and ESP32 HTTP POST updates)
- **Vercel Config**: `vercel.json` (routing, clean URLs, and CORS headers)
- **Demo Mode**: Built-in interactive simulator allowing anyone viewing the deployment to test clean water baselines, microplastic spikes, and turbidity thresholds without needing a physical sensor connected.

### How to Deploy on Vercel:
1. Go to [Vercel](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Select this repository: `micro-plastic-detection-in-water`.
4. Leave all build settings as default (Framework Preset: **Other** / Root Directory: `./`).
5. Click **Deploy**. Your dashboard will be live on `https://<project-name>.vercel.app` in seconds!

---

## 🚀 Key Features
- **Real-Time Particle Detection**: Measures water turbidity and light transmission/scattering to identify suspended particulate matter.
- **Audio & Visual Alerts**: Instant alerts through an onboard active buzzer, a 16x2 I2C LCD display, and browser audio alerts.
- **Interactive Cloud Dashboard**: Responsive HTML5/JavaScript dashboard with real-time Chart.js telemetry charts, circular SVG gauge, and live activity stream.
- **Serverless API (`/api/data`)**: Cloud endpoint supporting `GET` (dashboard telemetry) and `POST` (remote ESP32 telemetry injection).
- **Interactive Simulation Controls**: Test presets ("Clean Water", "Microplastic Spike", manual turbidity slider) directly in the browser.

---

## 🛠️ Hardware Requirements
- **Microcontroller**: ESP32 Development Board
- **Sensors**:
  - Turbidity Sensor (Analog input on GPIO 34)
  - IR / Photodiode Sensor with Laser transmitter (GPIO 15)
- **Display**: 16x2 I2C Liquid Crystal Display (LCD) (Address: `0x27`, SDA: 21, SCL: 22)
- **Alert Mechanism**: 5V Active Buzzer (GPIO 4)
- **Other**: Breadboard, jumper wires, test cuvettes, and 5V power supply

---

## 📂 Repository Contents
- **`index.html`**: Production Vercel web dashboard with interactive simulation, cloud API, and local ESP32 modes.
- **`api/data.js`**: Vercel Serverless Function handling CORS, telemetry caching, and ESP32 REST POST requests.
- **`vercel.json`**: Vercel routing and CORS headers configuration.
- **`package.json`**: Project metadata and deployment configuration.
- **`priethwin_github_microplastic_project/`**:
  - `priethwin_github_arduniocodemicroplastic_project.ino`: Standalone ESP32 sketch for local hardware testing.
  - `esp32_wifi_cloud_telemetry.ino`: ESP32 sketch with Wi-Fi and automatic HTTP POST telemetry to Vercel.
- **`code fi.txt`**: Original ESP32 source code.
- **`embded dashboard new one.html`**: Original offline dashboard template.

---

## 💻 Firmware Setup & Flashing
1. Open the [Arduino IDE](https://www.arduino.cc/en/software).
2. Choose your sketch from `priethwin_github_microplastic_project/`:
   - For standalone LCD/Buzzer: `priethwin_github_arduniocodemicroplastic_project.ino`
   - For live cloud streaming to Vercel: `esp32_wifi_cloud_telemetry.ino` (set your Wi-Fi SSID, Password, and your Vercel URL).
3. Install the **ESP32 Board Package** (`esp32` by Espressif Systems).
4. Install required libraries:
   - `LiquidCrystal_I2C` (by Frank de Brabander)
   - `Wire.h` (Built-in)
   - `WiFi.h` & `HTTPClient.h` (Built-in for ESP32)
5. Connect your ESP32 via USB, select your board and COM port, and click **Upload**.
6. Open Serial Monitor at **115200 baud** to monitor live sensor logs.
