const fs = require('fs');

const sidebarPath = 'src/components/Sidebar.tsx';
let sidebar = fs.readFileSync(sidebarPath, 'utf8');

sidebar = sidebar.replace(
  "import { useTrades } from '../hooks/useTrades';",
  "import { useTrades } from '../hooks/useTrades';\nimport { LayoutDashboard, FileText, Calendar, CreditCard, Wallet, Globe, Users, Handshake, Crown, Settings, HelpCircle, LogOut } from 'lucide-react';"
);

sidebar = sidebar.replace(
  /const navItems = \[[\s\S]*?\];/,
  `const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Performance' },
    { id: 'journal', icon: FileText, label: 'Diário de Trades' },
    { id: 'planner', icon: Calendar, label: 'Planejamento' },
    { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
    { id: 'withdrawals', icon: Wallet, label: 'Levantamentos' },
    { id: 'panorama', icon: Globe, label: 'Panorama Global' },
    { id: 'community', icon: Users, label: 'Comunidade' },
    { id: 'affiliates_user', icon: Handshake, label: 'Área de Afiliado' },
  ];`
);

sidebar = sidebar.replace(
  /<span className="material-symbols-outlined" style=\{activeTab === item\.id \? \{ fontVariationSettings: "'FILL' 1" \} : \{\}\}>\{item\.icon\}<\/span>/,
  `<item.icon className="w-5 h-5 shrink-0" strokeWidth={activeTab === item.id ? 2.5 : 2} />`
);

sidebar = sidebar.replace(
  /<span className="material-symbols-outlined text-\[20px\]">workspace_premium<\/span>/,
  `<Crown className="w-5 h-5 shrink-0" />`
);

sidebar = sidebar.replace(
  /<span className="material-symbols-outlined text-\[20px\]">settings<\/span>/,
  `<Settings className="w-5 h-5 shrink-0" />`
);

sidebar = sidebar.replace(
  /<span className="material-symbols-outlined text-\[20px\]">help<\/span>/,
  `<HelpCircle className="w-5 h-5 shrink-0" />`
);

sidebar = sidebar.replace(
  /<span className="material-symbols-outlined text-\[20px\]">logout<\/span>/,
  `<LogOut className="w-5 h-5 shrink-0" />`
);

fs.writeFileSync(sidebarPath, sidebar);
console.log('Sidebar updated');

const mobilePath = 'src/components/MobileBottomNav.tsx';
let mobile = fs.readFileSync(mobilePath, 'utf8');

mobile = mobile.replace(
  "import { AnimatePresence, motion } from 'framer-motion';",
  "import { AnimatePresence, motion } from 'framer-motion';\nimport { LayoutDashboard, FileText, Calendar, CreditCard, Wallet, Globe, Users, Handshake, Crown, Settings, HelpCircle, LogOut, Menu, X } from 'lucide-react';"
);

mobile = mobile.replace(
  /const mainItems = \[[\s\S]*?\];/,
  `const mainItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Desempenho' },
    { id: 'journal', icon: FileText, label: 'Diário' },
    { id: 'planner', icon: Calendar, label: 'Planejamento' },
    { id: 'community', icon: Users, label: 'Comunidade' },
  ];`
);

mobile = mobile.replace(
  /const secondaryItems = \[[\s\S]*?\];/,
  `const secondaryItems = [
    { id: 'panorama', icon: Globe, label: 'Panorama Global', desc: 'Análise, calendários e feeds técnicos' },
    { id: 'withdrawals', icon: Wallet, label: 'Levantamentos', desc: 'Gerencie saques e aportes' },
    { id: 'affiliates_user', icon: Handshake, label: 'Painel do Afiliado', desc: 'Gere receita indicando traders' },
    { id: 'payments', icon: CreditCard, label: 'Faturas e Registros', desc: 'Histórico de transações' },
    { id: 'plans', icon: Crown, label: 'Assinaturas', desc: 'Atualize seu plano de trading' },
    { id: 'settings', icon: Settings, label: 'Configurações', desc: 'Ajuste objetivos e corretoras' },
    { id: 'support', icon: HelpCircle, label: 'Suporte', desc: 'Fale com nossa equipe técnica' },
  ];`
);

mobile = mobile.replace(
  /<span[\s]*className="material-symbols-outlined text-\[20px\] transition-all"[\s]*style=\{activeTab === item\.id \? \{ fontVariationSettings: "'FILL' 1" \} : \{\}\}[\s\S]*?>[\s\S]*?\{item\.icon\}[\s\S]*?<\/span>/,
  `<item.icon className="w-5 h-5 shrink-0 transition-all" strokeWidth={activeTab === item.id ? 2.5 : 2} />`
);

mobile = mobile.replace(
  /<span className="material-symbols-outlined text-\[20px\]">[\s\S]*?\{isDrawerOpen \? 'close' : 'menu'\}[\s\S]*?<\/span>/,
  `{isDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}`
);

mobile = mobile.replace(
  /<span className="material-symbols-outlined text-\[18px\]">[\s\S]*?\{item\.icon\}[\s\S]*?<\/span>/g,
  `<item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />`
);

mobile = mobile.replace(
  /<span className="material-symbols-outlined text-\[18px\]">logout<\/span>/,
  `<LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />`
);

fs.writeFileSync(mobilePath, mobile);
console.log('MobileBottomNav updated');

