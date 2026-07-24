import fs from 'fs';

let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const target1 = `      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Conta atualizada com sucesso!",
        confirmText: "OK",
        onConfirm: () => {
          setEditingAccount(null);
          closeModal();
        }
      });`;

const replacement1 = `      setEditingAccount(null);
      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Conta atualizada com sucesso!",
        confirmText: "OK",
        onConfirm: closeModal
      });`;

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    console.log('Fixed Settings.tsx handleUpdateAccount');
} else {
    console.error('Could not find target1 in Settings.tsx');
}

fs.writeFileSync('src/components/Settings.tsx', content);
