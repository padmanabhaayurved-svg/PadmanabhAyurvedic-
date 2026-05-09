const fs = require('fs');
const path = 'c:/Users/HP/Desktop/padmanabh website/js/app.js';
let content = fs.readFileSync(path, 'utf8');

// Fix escaped backticks and dollar signs
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(path, content);
console.log('Fixed escaped characters in app.js');
