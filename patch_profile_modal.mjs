import fs from 'fs';

let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const targetProfileAlert = `      setEditingPost(null);
      setEditLegend('');
      alert('Publicação editada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao guardar a publicação editada.');
    }`;

const replacementProfileModal = `      setEditingPost(null);
      setEditLegend('');
      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Publicação editada com sucesso!",
        confirmText: "OK",
        onConfirm: closeModal
      });
    } catch (err) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Erro ao guardar a publicação editada.",
        isError: true,
        confirmText: "OK",
        onConfirm: closeModal
      });
    }`;

if (content.includes(targetProfileAlert)) {
    content = content.replace(targetProfileAlert, replacementProfileModal);
    fs.writeFileSync('src/components/Profile.tsx', content);
    console.log("Patched Profile.tsx handleSaveEditPost");
} else {
    console.error("Could not find targetProfileAlert in Profile.tsx");
}
