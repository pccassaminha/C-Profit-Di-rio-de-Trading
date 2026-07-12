const fs = require('fs');

const path = 'src/components/MobileBottomNav.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /<span[\s]*className="material-symbols-outlined text-\[20px\] transition-all"[\s]*style=\{isActive \? \{ fontVariationSettings: "'FILL' 1" \} : \{\}\}[\s\S]*?>[\s\S]*?\{item\.icon\}[\s\S]*?<\/span>/,
  '<item.icon className="w-5 h-5 shrink-0 transition-all" strokeWidth={isActive ? 2.5 : 2} />'
);

fs.writeFileSync(path, content);
console.log('Fixed MobileBottomNav');
