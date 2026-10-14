// Vercel Serverless Function: /api/data
// Connects to Neon PostgreSQL for real-time telemetry storage and retrieval

const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_P9aDEo0MByKX@ep-wandering-star-b5zfvt1r-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Neon HTTP SQL Query Helper (runs over native fetch, zero cold-start, 100% serverless compatible)
async function executeSql(query, params = []) {
  const hostMatch = DEFAULT_DATABASE_URL.match(/@([^/:]+)/);
  const host = hostMatch ? hostMatch[1] : 'ep-wandering-star-b5zfvt1r-pooler.c-7.us-east-2.aws.neon.tech';

  let finalQuery = query;
  if (params.length > 0) {
    params.forEach((val, idx) => {
      const placeholder = new RegExp(`\\$${idx + 1}`, 'g');
      const formatted = typeof val === 'number' ? val : `'${String(val).replace(/'/g, "''")}'`;
      finalQuery = finalQuery.replace(placeholder, formatted);
    });
  }

  const res = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': DEFAULT_DATABASE_URL,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: finalQuery })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Neon SQL Error: ${res.status} - ${errorText}`);
  }

  const result = await res.json();
  return result.rows || [];
}

// Ensure database table exists
let tableChecked = false;
async function ensureTable() {
  if (tableChecked) return;
  try {
    await executeSql(`
      CREATE TABLE IF NOT EXISTS telemetry_logs (
        id SERIAL PRIMARY KEY,
        turbidity_raw INT NOT NULL,
        voltage NUMERIC(4,2) NOT NULL,
        ir_detected INT NOT NULL DEFAULT 0,
        contamination_risk INT NOT NULL DEFAULT 0,
        buzzer_active INT NOT NULL DEFAULT 0,
        rssi INT DEFAULT -60,
        uptime INT DEFAULT 0,
        source VARCHAR(50) DEFAULT 'esp32',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    tableChecked = true;
  } catch (err) {
    console.error('Failed to auto-create table:', err.message);
  }
}

export default async function handler(req, res) {
  // Open CORS configuration for IoT devices & Web dashboards
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

  await ensureTable();

  // POST: Receive new telemetry from ESP32 or Dashboard and persist to Neon PostgreSQL
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const raw = Math.round(Number(body.turbidityRaw ?? body.turbidity ?? 0));
      const ir = Number(body.irDetected ?? body.ir ?? 0);
      const volt = Number(body.voltage ?? ((raw / 4095) * 3.3));
      const risk = (ir === 1 && raw > 2000) ? 1 : (Number(body.contaminationRisk) || 0);
      const buzzer = Number(body.buzzerActive ?? risk);
      const rssi = Math.round(Number(body.rssi ?? -60));
      const uptime = Math.round(Number(body.uptime ?? 0));
      const source = String(body.source || 'esp32-live').slice(0, 50);

      const rows = await executeSql(
        `INSERT INTO telemetry_logs (turbidity_raw, voltage, ir_detected, contamination_risk, buzzer_active, rssi, uptime, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, turbidity_raw, voltage, ir_detected, contamination_risk, buzzer_active, rssi, uptime, source, created_at;`,
        [raw, volt.toFixed(2), ir, risk, buzzer, rssi, uptime, source]
      );

      const inserted = rows[0] || {};

      return res.status(200).json({
        success: true,
        message: 'Telemetry saved to Neon PostgreSQL successfully',
        data: {
          id: inserted.id,
          turbidityRaw: inserted.turbidity_raw,
          voltage: Number(inserted.voltage),
          irDetected: inserted.ir_detected,
          contaminationRisk: inserted.contamination_risk,
          buzzerActive: inserted.buzzer_active,
          rssi: inserted.rssi,
          uptime: inserted.uptime,
          source: inserted.source,
          createdAt: inserted.created_at,
          dbConnected: true
        }
      });
    } catch (err) {
      console.error('POST Error:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  // GET: Fetch latest telemetry and recent history from Neon PostgreSQL
  try {
    const rows = await executeSql(
      `SELECT id, turbidity_raw, voltage, ir_detected, contamination_risk, buzzer_active, rssi, uptime, source, created_at
       FROM telemetry_logs
       ORDER BY created_at DESC
       LIMIT 25;`
    );

    if (rows && rows.length > 0) {
      const latest = rows[0];
      return res.status(200).json({
        turbidityRaw: latest.turbidity_raw,
        voltage: Number(latest.voltage),
        irDetected: latest.ir_detected,
        contaminationRisk: latest.contamination_risk,
        buzzerActive: latest.buzzer_active,
        rssi: latest.rssi,
        uptime: latest.uptime,
        source: latest.source,
        timestamp: latest.created_at,
        dbConnected: true,
        history: rows.map(r => ({
          id: r.id,
          turbidityRaw: r.turbidity_raw,
          voltage: Number(r.voltage),
          irDetected: r.ir_detected,
          contaminationRisk: r.contamination_risk,
          createdAt: r.created_at
        }))
      });
    }

    // Default response if table is currently empty
    return res.status(200).json({
      turbidityRaw: 1650,
      voltage: 1.33,
      irDetected: 0,
      contaminationRisk: 0,
      buzzerActive: 0,
      rssi: -58,
      uptime: 0,
      source: 'neon-db-ready',
      timestamp: new Date().toISOString(),
      dbConnected: true,
      history: []
    });
  } catch (err) {
    console.error('GET Error:', err.message);
    return res.status(200).json({
      turbidityRaw: 1650,
      voltage: 1.33,
      irDetected: 0,
      contaminationRisk: 0,
      buzzerActive: 0,
      rssi: -60,
      uptime: 0,
      source: 'fallback',
      timestamp: new Date().toISOString(),
      dbConnected: false,
      dbError: err.message
    });
  }
}
