const fetch = require('node-fetch');
async function run() {
  const res = await fetch('https://registry.npmjs.org/-/v1/search?text=shiprocket');
  const data = await res.json();
  data.objects.slice(0, 5).forEach(pkg => console.log(pkg.package.name, pkg.package.links.repository));
}
run();
