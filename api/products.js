const { client } = require('./db');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { deleted } = req.query;
      let sql = 'SELECT * FROM products';
      const args = [];
      
      if (deleted !== undefined) {
        sql += ' WHERE deleted = ?';
        args.push(deleted === 'true' ? 1 : 0);
      }
      sql += ' ORDER BY sortOrder ASC';
      
      const { rows } = await client.execute({ sql, args });
      // Parse JSON strings back to objects where needed
      const products = rows.map(r => ({
        ...r,
        images: r.images ? JSON.parse(r.images) : [],
        deleted: r.deleted === 1,
        inStock: r.inStock === 1
      }));
      
      return res.status(200).json(products);
    } 
    
    if (req.method === 'POST') {
      const p = req.body;
      const id = p.id || 'p-' + Date.now();
      const images = JSON.stringify(p.images || []);
      
      await client.execute({
        sql: `INSERT INTO products 
          (id, name, nameHi, nameMr, price, mrp, category, images, description, usage, ingredients, inStock, sortOrder, deleted) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, p.name, p.nameHi, p.nameMr, p.price, p.mrp, p.category, images, 
          p.description, p.usage, p.ingredients, p.inStock ? 1 : 0, p.sortOrder || 0, 0
        ]
      });
      return res.status(201).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Product ID required' });
      
      const p = req.body;
      let setClauses = [];
      let args = [];
      
      const updatableFields = ['name', 'nameHi', 'nameMr', 'price', 'mrp', 'category', 'description', 'usage', 'ingredients', 'sortOrder'];
      updatableFields.forEach(field => {
        if (p[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          args.push(p[field]);
        }
      });
      
      if (p.images !== undefined) {
        setClauses.push(`images = ?`);
        args.push(JSON.stringify(p.images));
      }
      if (p.inStock !== undefined) {
        setClauses.push(`inStock = ?`);
        args.push(p.inStock ? 1 : 0);
      }
      if (p.deleted !== undefined) {
        setClauses.push(`deleted = ?`);
        args.push(p.deleted ? 1 : 0);
      }
      
      if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });
      
      setClauses.push(`updatedAt = CURRENT_TIMESTAMP`);
      args.push(id);
      
      await client.execute({
        sql: `UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`,
        args
      });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id, permanent } = req.query;
      if (!id) return res.status(400).json({ error: 'Product ID required' });
      
      if (permanent === 'true') {
        await client.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] });
      } else {
        await client.execute({ sql: 'UPDATE products SET deleted = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', args: [id] });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error("Products API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process products request" });
  }
}
