// Vercel Serverless Function: /api/data
// Handles real-time telemetry storage and retrieval for the Microplastic Detection System

let latestTelemetry = {
  turbidityRaw: 1720,
  voltage: 1.38,
  irDetected: 0,
  contaminationRisk: 0,
  buzzerActive: 0,
  rssi: -58,
  uptime: 145,
  source: 'simulation-default',
  timestamp: new Date().toISOString()
};

export default function handler(req, res) {
  // CORS configuration for IoT devices & external dashboards
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST: Receive telemetry readings from ESP32 or external client
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const raw = Number(body.turbidityRaw ?? body.turbidity ?? 0);
      const ir = Number(body.irDetected ?? body.ir ?? 0);
      const volt = Number(body.voltage ?? ((raw / 4095) * 3.3));
      const risk = (ir === 1 && raw > 2000) ? 1 : (Number(body.contaminationRisk) || 0);
      const buzzer = Number(body.buzzerActive ?? risk);
      const rssi = Number(body.rssi ?? -60);
      const uptime = Number(body.uptime ?? Math.floor(process.uptime()));

      latestTelemetry = {
        turbidityRaw: raw,
        voltage: Number(volt.toFixed(2)),
        irDetected: ir,
        contaminationRisk: risk,
        buzzerActive: buzzer,
        rssi: rssi,
        uptime: uptime,
        source: 'esp32-live',
        timestamp: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        message: 'Telemetry received successfully',
        data: latestTelemetry
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload'
      });
    }
  }

  // GET: Return latest telemetry to dashboard
  return res.status(200).json(latestTelemetry);
}
