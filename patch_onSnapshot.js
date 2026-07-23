import fs from 'fs';
import glob from 'glob';

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
    let modified = false;

    // A simple hack: replace `(snapshot) => {` with `(snapshot) => {`
    // Wait, let's just globally replace `onSnapshot(query, (snapshot) => {` 
    // It's too varied.
});
