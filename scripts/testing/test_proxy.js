const fetch = require('node-fetch');
async function test() {
  const target = 'https://drive.google.com/thumbnail?id=1P_UazvecQ4J3pPnsM3GHxMvYg1h3lIwc&sz=w1000';
  const proxy = 'https://corsproxy.io/?' + encodeURIComponent(target);
  const res = await fetch(proxy);
  console.log(res.status, res.headers.get('content-type'));
}
test();
