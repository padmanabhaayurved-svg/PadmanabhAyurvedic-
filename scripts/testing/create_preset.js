const fetch = require('node-fetch');

const CLOUD_NAME = 'ybzj1wn7';
const API_KEY = '255492243228976';
const API_SECRET = 'ANgf1NPDigcb8d0snA-sknvRUQY';

async function createPreset() {
  const token = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');
  
  const res = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/upload_presets', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'padmanabh_store',
      unsigned: true,
      folder: 'products'
    })
  });
  
  const data = await res.json();
  console.log(data);
}
createPreset();
