const { client } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { rows } = await client.execute('SELECT * FROM teammates ORDER BY name ASC');
      return res.status(200).json(rows);
    } 
    
    if (req.method === 'POST') {
      const t = req.body;
      let { id } = req.query;
      
      if (id) {
        await client.execute({
          sql: `UPDATE teammates SET name = ?, role = ?, email = ? WHERE id = ?`,
          args: [t.name, t.role, t.email, id]
        });
      } else {
        id = 'tm-' + Date.now();
        await client.execute({
          sql: `INSERT INTO teammates (id, name, role, email) VALUES (?, ?, ?, ?)`,
          args: [id, t.name, t.role, t.email]
        });
      }
      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID required' });
      
      await client.execute({ sql: 'DELETE FROM teammates WHERE id = ?', args: [id] });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error("Teammates API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process teammates request" });
  }
}
