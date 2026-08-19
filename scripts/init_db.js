const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDB() {
  console.log('Initializing database schema...');

  const schema = `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameHi TEXT,
      nameMr TEXT,
      price REAL NOT NULL,
      mrp REAL,
      category TEXT,
      images TEXT, -- JSON string array
      description TEXT,
      usage TEXT,
      ingredients TEXT,
      inStock INTEGER DEFAULT 1,
      sortOrder INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      name TEXT,
      uid TEXT,
      passwordHash TEXT,
      orderIds TEXT, -- JSON string array
      lastLoginAt DATETIME,
      registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      phone TEXT,
      customerName TEXT,
      customerPhone TEXT,
      customerEmail TEXT,
      items TEXT, -- JSON string array of cart items
      address TEXT, -- JSON string object
      subtotal REAL,
      shipping REAL,
      tax REAL,
      total REAL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'pending',
      trackingId TEXT,
      shipmentId TEXT,
      courierCompany TEXT,
      courierCharge REAL,
      srOrderId TEXT,
      awb TEXT,
      srStatus TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teammates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      path TEXT,
      device TEXT,
      productId TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS heroConfig (
      id TEXT PRIMARY KEY,
      desktopBanner TEXT,
      mobileBanner TEXT,
      collections TEXT -- JSON string array
    );
  `;

  // Execute each statement (libsql doesn't support exec'ing multiple statements in one call easily)
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      console.log('Executed:', stmt.split('\n')[0].trim());
    } catch (e) {
      console.error('Error executing statement:', e);
    }
  }

  console.log('Database initialization complete.');
  process.exit(0);
}

initDB();
