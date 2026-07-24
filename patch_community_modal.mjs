import fs from 'fs';

let content = fs.readFileSync('src/components/Community.tsx', 'utf8');

// 1. Add Modal import
if (!content.includes("import Modal from './Modal';")) {
  content = content.replace(
    "import { useTrades } from '../hooks/useTrades';",
    "import { useTrades } from '../hooks/useTrades';\nimport Modal from './Modal';"
  );
}

// 2. Add Modal state
if (!content.includes("const [modalConfig, setModalConfig] = useState")) {
  const stateInsert = `  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
    confirmText: "OK",
    onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });
  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));\n`;

  // Find the place after `const [isSavingProfileEdits, setIsSavingProfileEdits] = useState(false);`
  content = content.replace(
    "const [isSavingProfileEdits, setIsSavingProfileEdits] = useState(false);",
    "const [isSavingProfileEdits, setIsSavingProfileEdits] = useState(false);\n" + stateInsert
  );
}

// 3. Replace handleSaveProfileEdits alerts
const oldHandleSave = `      setIsEditingProfileDetails(false);
      alert('Perfil editado com sucesso!');
    } catch (err) {
      console.error('Error saving profile edits:', err);
      alert('Erro ao guardar alterações.');
    } finally {`;

const newHandleSave = `      setIsEditingProfileDetails(false);
      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Perfil editado com sucesso!",
        confirmText: "OK",
        onConfirm: closeModal
      });
    } catch (err) {
      console.error('Error saving profile edits:', err);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao guardar alterações.",
        isError: true,
        confirmText: "OK",
        onConfirm: closeModal
      });
    } finally {`;

if (content.includes(oldHandleSave)) {
  content = content.replace(oldHandleSave, newHandleSave);
}

// 4. Add <Modal {...modalConfig} /> at the very end of the component
if (!content.includes("<Modal {...modalConfig} />")) {
  content = content.replace(
    "    </div>\n  );\n}",
    "      <Modal {...modalConfig} />\n    </div>\n  );\n}"
  );
}

fs.writeFileSync('src/components/Community.tsx', content);

