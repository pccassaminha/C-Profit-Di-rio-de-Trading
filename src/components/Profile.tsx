import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { updateProfile, verifyBeforeUpdateEmail, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Modal from './Modal';

export default function Profile() {
  const user = auth.currentUser;
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    isError?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        // Tentar primeiro no novo caminho 'usuarios' (SaaS)
        let userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        
        // Se não encontrar, tenta no antigo 'users'
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'users', user.uid));
        }

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
          if (data.photoURL) setPhotoURL(data.photoURL);
        }
      }
    };
    fetchUserData();
  }, [user]);

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setModalConfig({
          isOpen: true,
          title: "Erro",
          message: "A imagem deve ter no máximo 5MB.",
          isError: true,
          onConfirm: closeModal
        });
        return;
      }
      
      setIsSaving(true);
      try {
        const fileRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        // Update both state, Auth profile, and Firestore
        setPhotoURL(url);
        await updateProfile(user, { photoURL: url });
        
        const userDocRef = doc(db, 'usuarios', user.uid);
        await setDoc(userDocRef, { photoURL: url }, { merge: true });

        setModalConfig({
          isOpen: true,
          title: "Foto Atualizada",
          message: "Sua foto de perfil foi alterada com sucesso."
        });
      } catch (error: any) {
        console.error("Error uploading photo:", error);
        setModalConfig({
          isOpen: true,
          title: "Erro de Upload",
          message: `Falha ao enviar foto: ${error.message}. Entre em contato com o suporte ou tente novamente mais tarde.`,
          isError: true,
        });
      } finally {
        setIsSaving(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleSaveClick = () => {
    if (!user) return;
    
    if (password) {
      setModalConfig({
        isOpen: true,
        title: "Alterar Senha",
        message: "Você inseriu uma nova senha. Tem certeza que deseja alterar sua senha?",
        onConfirm: () => {
          closeModal();
          executeSave();
        },
        onCancel: closeModal
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: "Salvar Alterações",
        message: "Tem certeza que deseja salvar as alterações no seu perfil?",
        onConfirm: () => {
          closeModal();
          executeSave();
        },
        onCancel: closeModal
      });
    }
  };

  const executeSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const newDisplayName = `${firstName} ${lastName}`.trim();
      const authUpdate: any = { displayName: newDisplayName };
      
      // photoURL might be a base64 string which is too long for Firebase Auth profile
      // We only update Auth profile if it's a "normal" URL or small enough
      if (photoURL) {
        authUpdate.photoURL = photoURL;
      }

      if (newDisplayName !== user.displayName || authUpdate.photoURL) {
        await updateProfile(user, authUpdate);
      }

      const profileData = {
        nome: newDisplayName, // "nome" used in Auth.tsx SaaS sync
        phoneNumber,
        photoURL,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      };

      // Savar em ambos para compatibilidade, preferindo 'usuarios'
      await setDoc(doc(db, 'usuarios', user.uid), profileData, { merge: true });
      try {
        await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
      } catch (e) {}

      if (email !== user.email) {
        await verifyBeforeUpdateEmail(user, email);
        setModalConfig({
          isOpen: true,
          title: "Verificação de E-mail",
          message: "Um link de verificação foi enviado para o novo e-mail. Por favor, verifique para concluir a alteração.",
          onConfirm: closeModal
        });
      }

      if (password) {
        await updatePassword(user, password);
        setPassword('');
      }

      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "Perfil atualizado com sucesso!",
        confirmText: "OK",
        onConfirm: () => {
          closeModal();
          window.location.reload();
        }
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.code === 'auth/requires-recent-login') {
        setModalConfig({
          isOpen: true,
          title: "Atenção",
          message: "Para alterar a senha ou e-mail, você precisa ter feito login recentemente. Por favor, saia e entre novamente.",
          isError: true,
          onConfirm: closeModal
        });
      } else {
        setModalConfig({
          isOpen: true,
          title: "Erro",
          message: `Erro ao atualizar perfil: ${error.message}`,
          isError: true,
          onConfirm: closeModal
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">
      <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-headline">Meu Perfil</h2>
      
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8 space-y-8">
        
        {/* Profile Picture Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-outline-variant/20">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-surface-container-highest border-2 border-primary/20 overflow-hidden flex items-center justify-center">
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-on-surface">Foto de Perfil</h3>
            <p className="text-sm text-on-surface-variant">Formatos suportados: JPG, PNG. Tamanho máximo: 1MB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Primeiro Nome</label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Último Nome</label>
            <input 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Número de Telefone</label>
            <input 
              type="tel" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+244 900 000 000"
              className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary transition-colors" 
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nova Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para não alterar"
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 pr-12 text-on-surface outline-none focus:border-primary transition-colors" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/20 flex justify-between items-center">
          <button className="text-primary font-bold hover:underline">Atualizar Plano</button>
          <button 
            onClick={handleSaveClick}
            disabled={isSaving}
            className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <Modal {...modalConfig} />
    </div>
  );
}
