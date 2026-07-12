const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined:opsz,wght,FILL,GRAD@20\.\.48,100\.\.700,0\.\.1,-50\.\.200&display=swap" rel="stylesheet"\/>display=block" rel="stylesheet"\/>/, '<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet"/>');
html = html.replace(/&display=swap" rel="stylesheet"\/>/, '&display=block" rel="stylesheet"/>'); // just in case
fs.writeFileSync('index.html', html);
