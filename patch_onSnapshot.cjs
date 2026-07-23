const fs = require('fs');
const glob = require('glob'); // Not available by default, we can use child_process or just write a basic recursive function

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // We just want to add a generic catch handler to onSnapshot if it's missing the error callback.
    // That's too complex with regex. Instead, let's just create a global error handler for firestore.
});
