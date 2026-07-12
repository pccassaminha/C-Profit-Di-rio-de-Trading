const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard PieChart and LineChart imports from lucide with aliases
content = content.replace(/PieChart([^:]*) from 'lucide-react'/, 'PieChart as LucidePieChart$1 from "lucide-react"'); // This is complex, better to just rewrite the lucide-react import

// Simpler: find the lucide-react import line and replace PieChart with PieChart as LucidePieChart
content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/g, (match, imports) => {
    let newImports = imports.replace(/\bPieChart\b/g, 'PieChart as LucidePieChart').replace(/\bLineChart\b/g, 'LineChart as LucideLineChart');
    return `import { ${newImports} } from 'lucide-react';`;
});

// Now replace the JSX usages that I just injected (not the recharts ones)
// In Dashboard, the only place I added PieChart from Lucide was for the buttons
content = content.replace(/<PieChart className="text-\[16px\]"/g, '<LucidePieChart className="w-4 h-4"');
content = content.replace(/<LineChart/g, (match, offset, full) => {
    // If it's part of <LineChart data={...}> it's recharts. The lucide ones probably have className or are self-closing
    // Wait, the injected ones have className or nothing.
    return match; // Better to use regex for the specific one:
});
content = content.replace(/<LineChart([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('data=')) return match; // recharts
    return `<LucideLineChart${attrs}>`;
});

fs.writeFileSync(file, content);
console.log('Fixed Dashboard imports');
