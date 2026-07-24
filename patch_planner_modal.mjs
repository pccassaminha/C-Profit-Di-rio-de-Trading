import fs from 'fs';

let content = fs.readFileSync('src/components/Planner.tsx', 'utf8');

// Add import
if (!content.includes("import Modal from './Modal';")) {
  content = content.replace(
    "import { useTrades } from '../hooks/useTrades';",
    "import { useTrades } from '../hooks/useTrades';\nimport Modal from './Modal';"
  );
}

// Add state
if (!content.includes("const [modalConfig, setModalConfig]")) {
  const stateInsert = `  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
    confirmText: "OK",
    onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
  });
  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));\n`;

  content = content.replace(
    "const [readerTheme, setReaderTheme] = useState<'dark' | 'light'>('light');",
    "const [readerTheme, setReaderTheme] = useState<'dark' | 'light'>('light');\n" + stateInsert
  );
}

// Replace handleSave
const oldSave = `      }
      resetForm();
    } catch (error) {
      console.error("Error saving planning:", error);
    }`;

const newSave = `      }
      resetForm();
      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: editingEntry ? "Planejamento atualizado com sucesso!" : "Planejamento salvo com sucesso!",
        confirmText: "OK",
        onConfirm: closeModal
      });
    } catch (error) {
      console.error("Error saving planning:", error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao salvar planejamento.",
        isError: true,
        confirmText: "OK",
        onConfirm: closeModal
      });
    }`;

if (content.includes(oldSave)) {
  content = content.replace(oldSave, newSave);
}

// Replace alert
if (content.includes("alert('Planejamento salvo com sucesso!');")) {
  content = content.replace(
    /alert\('Planejamento salvo com sucesso!'\);/g,
    `setModalConfig({ isOpen: true, title: "Sucesso", message: "Planejamento salvo com sucesso!", onConfirm: closeModal });`
  );
}
if (content.includes("alert('Erro ao salvar planejamento.');")) {
  content = content.replace(
    /alert\('Erro ao salvar planejamento.'\);/g,
    `setModalConfig({ isOpen: true, title: "Erro", message: "Erro ao salvar planejamento.", isError: true, onConfirm: closeModal });`
  );
}

// Add <Modal />
if (!content.includes("<Modal {...modalConfig} />")) {
  content = content.replace(
    "    </div>\n  );\n}",
    "      <Modal {...modalConfig} />\n    </div>\n  );\n}"
  );
}

fs.writeFileSync('src/components/Planner.tsx', content);

