import fs from 'fs';

let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

content = content.replace(
  '<div className="bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden mt-4">',
  '<div className="bg-surface-container-low border border-outline-variant/20 rounded-xl mt-4">'
);

const zIndexReplace = 'className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface-container border border-outline-variant/10 rounded-lg group relative"';
const zIndexNew = "className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface-container border border-outline-variant/10 rounded-lg group relative ${openDropdownId === account.id ? 'z-50' : 'z-10'}`}";

content = content.replace(zIndexReplace, zIndexNew);

const dropdownReplace = 'className="absolute right-0 bottom-full mb-2 w-48 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"';
const dropdownNew = 'className="absolute right-0 top-full mt-2 w-48 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"';

content = content.replace(dropdownReplace, dropdownNew);

fs.writeFileSync('src/components/Settings.tsx', content);
console.log("Patched overflow and zIndex in Settings");

