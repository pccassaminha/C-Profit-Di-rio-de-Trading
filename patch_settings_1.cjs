const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const stateCode = `  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  const handleUpdateAccount = async () => {
    if (!editingAccount || !auth.currentUser) return;
    setIsUpdatingAccount(true);
    try {
      try {
        await updateDoc(doc(db, 'accounts', editingAccount.id), editingAccount);
      } catch (e) {
        console.warn("Could not update root accounts collection");
      }
      try {
        await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'accounts', editingAccount.id), editingAccount);
      } catch (e) {
        console.warn("Could not update subcollection accounts");
      }
      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Conta atualizada com sucesso!",
        confirmText: "OK",
        onConfirm: () => {
          setEditingAccount(null);
          closeModal();
        }
      });
    } catch (error) {
      console.error(error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao atualizar conta.",
        isError: true,
        confirmText: "OK",
        onConfirm: closeModal
      });
    } finally {
      setIsUpdatingAccount(false);
    }
  };
`;

content = content.replace("const [accounts, setAccounts] = useState<any[]>([]);", "const [accounts, setAccounts] = useState<any[]>([]);\n" + stateCode);

fs.writeFileSync('src/components/Settings.tsx', content);
