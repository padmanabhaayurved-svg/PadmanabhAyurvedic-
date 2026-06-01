require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// Polyfill minimal Express-like res methods for the Vercel-style API handler
function enhanceResponse(res) {
  res.status = function(statusCode) {
    this.statusCode = statusCode;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
  };
  return res;
}

http.createServer(async (req, res) => {
  // Strip query parameters from req.url
  const cleanUrl = req.url.split('?')[0];

  // Mock API routing for local testing
  if (cleanUrl.startsWith('/api/')) {
    if (cleanUrl === '/api/razorpay' || cleanUrl === '/api/razorpay-webhook') {
      try {
        const handlerName = cleanUrl === '/api/razorpay' ? './api/razorpay.js' : './api/razorpay-webhook.js';
        const handler = require(handlerName);
        // Parse JSON body manually (since we don't have express.json())
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            req.rawBody = body; // Crucial for webhook signature verification
            req.body = body ? JSON.parse(body) : {};
            await handler(req, enhanceResponse(res));
          });
          return;
        } else {
          await handler(req, enhanceResponse(res));
          return;
        }
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
        return;
      }
    }
  }

  let filePath = path.join(root, cleanUrl === '/' ? 'index.html' : cleanUrl);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + filePath);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
}).listen(8080, () => console.log('Server at http://localhost:8080'));
