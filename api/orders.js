const { client } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { userId } = req.query;
      let sql = 'SELECT * FROM orders';
      let args = [];
      
      if (userId) {
        sql += ' WHERE userId = ? ORDER BY createdAt DESC';
        args.push(userId);
      } else {
        sql += ' ORDER BY createdAt DESC LIMIT 500';
      }
      
      const { rows } = await client.execute({ sql, args });
      const orders = rows.map(r => ({
        ...r,
        items: r.items ? JSON.parse(r.items) : [],
        address: r.address ? JSON.parse(r.address) : null
      }));
      
      return res.status(200).json(orders);
    } 
    
    if (req.method === 'POST') {
      const o = req.body;
      const id = o.id || 'ord-' + Date.now();
      const items = JSON.stringify(o.items || []);
      const address = JSON.stringify(o.address || null);
      
      const isCOD = ((o.paymentMethod || o.payment || '').toUpperCase().includes('COD') || (o.paymentMethod || o.payment || '').toUpperCase().includes('CASH') || (o.paymentId && String(o.paymentId).startsWith('COD_')));
      const paymentMethod = isCOD ? 'COD' : (o.paymentMethod || o.payment || 'COD');
      const paymentId = o.paymentId || (isCOD ? 'COD_' + Date.now() : null);

      await client.execute({
        sql: `INSERT INTO orders 
          (id, userId, phone, customerName, customerPhone, customerEmail, items, address, subtotal, shipping, tax, total, currency, status, paymentMethod, paymentId) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, o.userId, o.phone, o.customerName, o.customerPhone, o.customerEmail, items, address,
          o.subtotal, o.shipping, o.tax, o.total, o.currency || 'INR', o.status || 'pending', paymentMethod, paymentId
        ]
      });
      return res.status(201).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Order ID required' });
      
      const o = req.body;
      let setClauses = [];
      let args = [];
      
      const updatableFields = ['status', 'paymentMethod', 'paymentId', 'trackingId', 'shipmentId', 'courierCompany', 'courierCharge', 'srOrderId', 'awb', 'srStatus'];
      updatableFields.forEach(field => {
        if (o[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          args.push(o[field]);
        }
      });
      
      if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });
      
      setClauses.push(`updatedAt = CURRENT_TIMESTAMP`);
      args.push(id);
      
      await client.execute({
        sql: `UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`,
        args
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error("Orders API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process orders request" });
  }
}
