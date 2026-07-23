const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

content = content.replace("const [tokenCopiedId, setTokenCopiedId] = useState<string | null>(null);", "const [tokenCopiedId, setTokenCopiedId] = useState<string | null>(null);\n  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);");

fs.writeFileSync('src/components/Settings.tsx', content);
