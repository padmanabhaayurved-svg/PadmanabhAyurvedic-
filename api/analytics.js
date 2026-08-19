const { client } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { days } = req.query;
      const d = parseInt(days) || 30;
      
      const { rows } = await client.execute({
        sql: `SELECT * FROM analytics WHERE timestamp >= datetime('now', '-${d} days') ORDER BY timestamp ASC`,
        args: []
      });
      
      return res.status(200).json(rows);
    } 
    
    if (req.method === 'POST') {
      const { type, path, device, productId } = req.body;
      
      await client.execute({
        sql: `INSERT INTO analytics (type, path, device, productId) VALUES (?, ?, ?, ?)`,
        args: [type, path, device, productId]
      });
      return res.status(201).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error("Analytics API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process analytics request" });
  }
}
