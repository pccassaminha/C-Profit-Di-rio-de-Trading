const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// The goal: 
// 1. Recharts has: PieChart, LineChart
// 2. Lucide has: LucidePieChart, LucideLineChart
// 3. JSX for recharts uses <PieChart> and <LineChart>
// 4. JSX for lucide uses <LucidePieChart> and <LucideLineChart>

// First, fix imports
content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]recharts['"];/, (m, existing) => {
    let parts = existing.split(',').map(s => s.trim()).filter(Boolean);
    parts = parts.filter(p => !p.includes('PieChart') && !p.includes('LineChart'));
    parts.push('PieChart', 'LineChart');
    return `import { ${parts.join(', ')} } from 'recharts';`;
});

content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/, (m, existing) => {
    let parts = existing.split(',').map(s => s.trim()).filter(Boolean);
    parts = parts.filter(p => !p.includes('PieChart') && !p.includes('LineChart'));
    parts.push('PieChart as LucidePieChart', 'LineChart as LucideLineChart');
    // Ensure uniqueness
    const unique = Array.from(new Set(parts));
    return `import { ${unique.join(', ')} } from 'lucide-react';`;
});

fs.writeFileSync(file, content);
console.log('Fixed Dashboard recharts/lucide separation');
