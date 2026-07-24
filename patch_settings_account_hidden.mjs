import fs from 'fs';

let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const functionToAdd = `
  const toggleAccountHidden = async (accountId: string, isHidden: boolean) => {
    try {
      try {
        await updateDoc(doc(db, 'accounts', accountId), {
          isHidden: !isHidden
        });
      } catch (e) {
        console.warn("Could not update root accounts collection");
      }
      try {
        await updateDoc(doc(db, 'usuarios', auth.currentUser!.uid, 'accounts', accountId), {
          isHidden: !isHidden
        });
      } catch (e) {
        console.warn("Could not update subcollection accounts");
      }
    } catch (error) {
      console.error("Error updating account hidden status: ", error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao ocultar/reativar a conta.",
        isError: true,
        onConfirm: closeModal
      });
    }
  };
`;

if (!content.includes('toggleAccountHidden')) {
  content = content.replace(
    "const toggleAccountStatus = async (accountId: string, currentStatus: string) => {",
    functionToAdd + "\n  const toggleAccountStatus = async (accountId: string, currentStatus: string) => {"
  );
}

fs.writeFileSync('src/components/Settings.tsx', content);
