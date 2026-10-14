// Vercel Serverless Function: /api/history
// Returns historical sensor logs from Neon PostgreSQL

const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_P9aDEo0MByKX@ep-wandering-star-b5zfvt1r-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hostMatch = DEFAULT_DATABASE_URL.match(/@([^/:]+)/);
  const host = hostMatch ? hostMatch[1] : 'ep-wandering-star-b5zfvt1r-pooler.c-7.us-east-2.aws.neon.tech';

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));

  try {
    const neonRes = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': DEFAULT_DATABASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `SELECT id, turbidity_raw, voltage, ir_detected, contamination_risk, buzzer_active, rssi, uptime, source, created_at
                FROM telemetry_logs
                ORDER BY created_at DESC
                LIMIT ${limit};`
      })
    });

    if (!neonRes.ok) {
      throw new Error(`Neon error: ${neonRes.status}`);
    }

    const data = await neonRes.json();
    return res.status(200).json({
      success: true,
      count: data.rows ? data.rows.length : 0,
      rows: data.rows || []
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
