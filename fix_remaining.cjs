const fs = require('fs');

function replaceFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  content = replacer(content);
  fs.writeFileSync(path, content);
}

replaceFile('src/components/Settings.tsx', content => {
  content = content.replace("import { ChevronDown, Plus, Edit2, Trash2, Wallet, FileText, Flag, X } from 'lucide-react';", "import { ChevronDown, Plus, Edit2, Trash2, Wallet, FileText, Flag, X, Save, RefreshCw, Eye, EyeOff, Eraser, Undo } from 'lucide-react';");
  
  content = content.replace(/<span className="material-symbols-outlined[^>]*>\{isSaving \? 'sync' : 'save'\}<\/span>/g, '{isSaving ? <RefreshCw className="w-5 h-5 animate-spin shrink-0 mr-2" /> : <Save className="w-5 h-5 shrink-0 mr-2" />}');
  content = content.replace(/<span className="material-symbols-outlined[^>]*>\{obj\.hidden \? 'visibility_off' : 'visibility'\}<\/span>/g, '{obj.hidden ? <EyeOff className="w-4 h-4 shrink-0 text-on-surface-variant hover:text-on-surface" /> : <Eye className="w-4 h-4 shrink-0 text-on-surface-variant hover:text-on-surface" />}');
  content = content.replace(/<span className="material-symbols-outlined[^>]*>mop<\/span>/g, '<Eraser className="w-[18px] h-[18px] shrink-0" />');
  content = content.replace(/<span className="material-symbols-outlined[^>]*>undo<\/span>/g, '<Undo className="w-[18px] h-[18px] shrink-0" />');
  
  return content;
});

replaceFile('src/components/GlobalChatWidget.tsx', content => {
  content = content.replace("import { ArrowLeft, CheckCheck } from 'lucide-react';", "import { ArrowLeft, CheckCheck, MessageCircle } from 'lucide-react';");
  content = content.replace(/<span className="material-symbols-outlined text-background">chat_bubble<\/span>/g, '<MessageCircle className="w-6 h-6 text-background shrink-0" />');
  return content;
});

replaceFile('src/components/DateRangePicker.tsx', content => {
  content = content.replace("import { Calendar } from 'lucide-react';", "import { Calendar, ChevronUp, ChevronDown } from 'lucide-react';");
  content = content.replace(/<span className="material-symbols-outlined text-\[20px\] ml-2">\{isOpen \? 'expand_less' : 'expand_more'\}<\/span>/g, '{isOpen ? <ChevronUp className="w-5 h-5 shrink-0 ml-2" /> : <ChevronDown className="w-5 h-5 shrink-0 ml-2" />}');
  return content;
});

console.log('Fixed remaining icons');
