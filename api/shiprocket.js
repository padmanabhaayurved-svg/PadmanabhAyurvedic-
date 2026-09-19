const { verifyAdmin } = require('./_lib/firebase-admin.js');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { endpoint, method = 'GET', body, token } = req.body || {};

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint in request' });
  }

  const PUBLIC_ENDPOINTS = [
    '/courier/serviceability',
    '/courier/track',
    '/auth/login'
  ];
  
  const isPublic = PUBLIC_ENDPOINTS.some(p => endpoint.includes(p));

  if (!isPublic) {
    try {
      await verifyAdmin(req);
    } catch (error) {
      return res.status(error.message.includes('Forbidden') ? 403 : 401).json({ error: error.message });
    }
  }

  const targetUrl = `https://apiv2.shiprocket.in/v1/external${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  let finalBody = body;
  
  // Secure Server-Side Injection for Authentication
  if (endpoint === '/auth/login' && method.toUpperCase() === 'POST') {
    finalBody = {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    };
    if (!finalBody.email || !finalBody.password) {
      return res.status(500).json({ error: 'Shiprocket credentials missing on server.' });
    }
  }

  if (finalBody) {
    options.body = typeof finalBody === 'string' ? finalBody : JSON.stringify(finalBody);
  }

  try {
    const srRes = await fetch(targetUrl, options);
    let data;
    try {
      data = await srRes.json();
    } catch(e) {
      data = { message: srRes.statusText };
    }

    return res.status(srRes.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
