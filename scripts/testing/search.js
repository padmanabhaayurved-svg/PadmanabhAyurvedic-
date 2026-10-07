const fetch = require('node-fetch');
async function search() {
  const res = await fetch('https://registry.npmjs.org/shiprocket-api');
  const data = await res.json();
  const repo = data.repository ? data.repository.url : null;
  console.log('Repo:', repo);
}
search();
