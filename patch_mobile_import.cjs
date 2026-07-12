const fs = require('fs');

const path = 'src/components/MobileBottomNav.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { doc, onSnapshot } from 'firebase/firestore';",
  "import { doc, onSnapshot } from 'firebase/firestore';\nimport { LayoutDashboard, FileText, Calendar, CreditCard, Wallet, Globe, Users, Handshake, Crown, Settings, HelpCircle, LogOut, Menu, X } from 'lucide-react';"
);

fs.writeFileSync(path, content);
console.log('MobileBottomNav imports patched');
