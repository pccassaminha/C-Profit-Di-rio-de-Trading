const fs = require('fs');

const path = 'src/components/Panorama.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the container div for technical symbol selector
content = content.replace(
  /<div className="grid grid-cols-2 sm:flex sm:flex-wrap bg-surface-container-low border border-outline-variant\/10 rounded-xl p-1 gap-1 select-none shrink-0 w-full">/,
  '<div className="flex bg-surface-container-low border border-outline-variant/10 rounded-xl p-1 gap-1 select-none shrink-0 w-full overflow-x-auto custom-scrollbar pb-2">'
);

// We should also remove flex-1 from the button so they don't stretch weirdly when scrolling horizontally
content = content.replace(
  /className=\{`flex-1 min-w-\[70px\] px-2 py-1\.5 rounded-lg font-bold uppercase text-\[9px\] tracking-wider transition-all cursor-pointer text-center \$\{/g,
  'className={`shrink-0 min-w-[70px] px-3 py-1.5 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all cursor-pointer text-center ${'
);

// Do the same for the other symbol selector below for mobile/large sizes
content = content.replace(
  /<div className="flex flex-wrap bg-surface-container-low border border-outline-variant\/10 rounded-xl p-1 gap-1 select-none shrink-0 self-start lg:self-auto">/,
  '<div className="flex bg-surface-container-low border border-outline-variant/10 rounded-xl p-1 gap-1 select-none shrink-0 w-full lg:max-w-[70%] overflow-x-auto custom-scrollbar pb-2 self-start lg:self-auto">'
);

fs.writeFileSync(path, content);
console.log('Panorama CSS updated');
