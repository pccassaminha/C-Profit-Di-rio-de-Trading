const fs = require('fs');

const topbarPath = 'src/components/Topbar.tsx';
let topbar = fs.readFileSync(topbarPath, 'utf8');

topbar = topbar.replace(
  "import { useTrades } from '../hooks/useTrades';",
  "import { useTrades } from '../hooks/useTrades';\nimport { Menu, Bell, MessageSquare, UserPlus, MessageCircle, Megaphone, ChevronDown, User, Settings, HelpCircle, Shield, LogOut } from 'lucide-react';"
);

topbar = topbar.replace(/<span className="material-symbols-outlined text-sm">menu<\/span>/g, '<Menu className="w-4 h-4" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-xl">notifications<\/span>/g, '<Bell className="w-5 h-5" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-primary text-\[18px\]">chat<\/span>/g, '<MessageSquare className="w-[18px] h-[18px] text-primary" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-secondary text-\[16px\]">group_add<\/span>/g, '<UserPlus className="w-4 h-4 text-secondary" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-primary text-\[18px\]">forum<\/span>/g, '<MessageCircle className="w-[18px] h-[18px] text-primary" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-primary text-\[18px\]">campaign<\/span>/g, '<Megaphone className="w-[18px] h-[18px] text-primary" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-\[16px\] text-on-surface-variant transition-transform duration-200" style=\{\{ transform: dropdownOpen \? 'rotate\(180deg\)' : 'rotate\(0deg\)' \}\}>expand_more<\/span>/g, '<ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${dropdownOpen ? "rotate-180" : "rotate-0"}`} />');

topbar = topbar.replace(/<span className="material-symbols-outlined text-\[18px\]">person<\/span>/g, '<User className="w-[18px] h-[18px]" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-\[18px\]">settings<\/span>/g, '<Settings className="w-[18px] h-[18px]" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-\[18px\]">help<\/span>/g, '<HelpCircle className="w-[18px] h-[18px]" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-\[18px\]">admin_panel_settings<\/span>/g, '<Shield className="w-[18px] h-[18px]" />');
topbar = topbar.replace(/<span className="material-symbols-outlined text-\[18px\]">logout<\/span>/g, '<LogOut className="w-[18px] h-[18px]" />');

fs.writeFileSync(topbarPath, topbar);
console.log('Topbar updated');
