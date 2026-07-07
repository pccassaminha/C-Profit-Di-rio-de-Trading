const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let totalReplaced = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Replace: (snap) => { ... })
  // with: (snap) => { ... }, (err) => console.warn('Snapshot error in ' + file, err))
  
  // This is tricky because we don't know where the closing bracket is. 
  // Let's just find and replace the "onSnapshot(..., (snap) => {" and let's not worry, wait we can't do that simply.

});
