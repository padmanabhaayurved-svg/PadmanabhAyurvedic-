export default async function handler(req, res) {
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

  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
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
