const { client } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { phone } = req.query;
      
      if (phone) {
        const { rows } = await client.execute({
          sql: 'SELECT * FROM users WHERE phone = ?',
          args: [phone]
        });
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = { ...rows[0], orderIds: rows[0].orderIds ? JSON.parse(rows[0].orderIds) : [] };
        return res.status(200).json(user);
      } else {
        const { rows } = await client.execute('SELECT * FROM users ORDER BY registeredAt DESC');
        const users = rows.map(r => ({ ...r, orderIds: r.orderIds ? JSON.parse(r.orderIds) : [] }));
        return res.status(200).json(users);
      }
    } 
    
    if (req.method === 'POST') {
      const u = req.body;
      if (!u.phone) return res.status(400).json({ error: 'Phone required' });
      
      const orderIds = JSON.stringify(u.orderIds || []);
      
      // Check if user exists
      const { rows } = await client.execute({ sql: 'SELECT phone FROM users WHERE phone = ?', args: [u.phone] });
      
      if (rows.length > 0) {
        let setClauses = [];
        let args = [];
        const updatableFields = ['name', 'uid', 'passwordHash', 'lastLoginAt'];
        
        updatableFields.forEach(field => {
          if (u[field] !== undefined) {
            setClauses.push(`${field} = ?`);
            args.push(u[field]);
          }
        });
        
        if (u.orderIds !== undefined) {
          setClauses.push(`orderIds = ?`);
          args.push(orderIds);
        }
        
        if (setClauses.length > 0) {
          args.push(u.phone);
          await client.execute({
            sql: `UPDATE users SET ${setClauses.join(', ')} WHERE phone = ?`,
            args
          });
        }
      } else {
        await client.execute({
          sql: `INSERT INTO users (phone, name, uid, passwordHash, orderIds, lastLoginAt) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [u.phone, u.name, u.uid, u.passwordHash, orderIds, u.lastLoginAt || new Date().toISOString()]
        });
      }
      return res.status(200).json({ success: true, phone: u.phone });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error("Users API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process users request" });
  }
}
