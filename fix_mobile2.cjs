const fs = require('fs');
const path = 'src/components/MobileBottomNav.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { LayoutDashboard, FileText, Calendar, CreditCard, Wallet, Globe, Users, Handshake, Crown, Settings, HelpCircle, LogOut, Menu, X } from 'lucide-react';",
  "import { LayoutDashboard, FileText, Calendar, CreditCard, Wallet, Globe, Users, Handshake, Crown, Settings, HelpCircle, LogOut, Menu, X, Grid } from 'lucide-react';"
);

content = content.replace(
  /<span[\s]*className="material-symbols-outlined text-\[20px\]"[\s]*style=\{isMoreOpen \? \{ fontVariationSettings: "'FILL' 1" \} : \{\}\}[\s]*>[\s]*grid_view[\s]*<\/span>/,
  '<Grid className="w-5 h-5 shrink-0 transition-all" strokeWidth={isMoreOpen ? 2.5 : 2} />'
);

fs.writeFileSync(path, content);
console.log('Fixed MobileBottomNav grid_view');
