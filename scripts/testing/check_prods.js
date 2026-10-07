const fs = require('fs');
const text = fs.readFileSync('f:/deskstop/padmanabh website/js/admin.js', 'utf8');
const match = text.match(/_adminProducts = \[([\s\S]*?)\];/);
if (match) {
  console.log(match[1].slice(0, 1000));
}
