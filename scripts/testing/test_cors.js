const fetch = require('node-fetch');
async function testCORS() {
  const url = 'https://drive.google.com/thumbnail?id=14LsaWlnAUiJjOMpGxkz31BhgUwfXTd4h&sz=w1000';
  const res = await fetch(url, { headers: { Origin: 'https://padmanabhayurved.com' } });
  console.log('CORS Header:', res.headers.get('access-control-allow-origin'));
}
testCORS();
