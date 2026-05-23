import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { updateProfile, verifyBeforeUpdateEmail, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Eye, EyeOff, MessageSquare, ThumbsUp, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import Modal from './Modal';

export default function Profile() {
  const user = auth.currentUser;
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);
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
          if (data.isPrivate !== undefined) setIsPrivate(data.isPrivate);
        }
      }
    };
    fetchUserData();

    if (user) {
      const q = query(
        collection(db, 'community_posts'),
        where('userId', '==', user.uid)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const postsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by createdAt descending safely in JS
        postsList.sort((a: any, b: any) => {
          const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
          const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
          return timeB - timeA;
        });
        setMyPosts(postsList);
      });
      return () => unsub();
    }
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
        isPrivate,
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

          {/* Privacy Profile Lock Option */}
          <div className="space-y-4 md:col-span-2 pt-6 border-t border-outline-variant/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} />
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Configuração de Privacidade do Perfil</h4>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface-container/30 p-5 rounded-[24px] border border-outline-variant/10 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                  {isPrivate ? <EyeOff className="text-error" size={16} /> : <Eye className="text-secondary" size={16} />}
                  Bloquear Perfil Público (Tornar Perfil Privado)
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
                  Se ativado, outros usuários não poderão abrir seu perfil ao clicar no seu nome, restringindo acesso às suas estatísticas, contagem de publicações e histórico pessoal na comunidade.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-14 h-8 rounded-full transition-colors relative flex items-center p-1 shrink-0 cursor-pointer outline-none ${isPrivate ? 'bg-primary' : 'bg-[#e5e7eb]/10 border border-outline-variant/20'}`}
              >
                <span className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
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

      {/* Own Community Activity Section */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-[32px] p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
          <div>
            <h3 className="text-lg font-black font-headline uppercase tracking-widest text-[#00f5a0] flex items-center gap-2">
              <MessageSquare size={20} />
              Sua Atividade na Comunidade C Profit
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">Estatísticas e histórico de publicações do seu perfil de trader</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-2xl text-center shrink-0">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Contribuições</p>
            <p className="text-2xl font-black text-on-surface leading-none mt-1">{myPosts.length}</p>
          </div>
        </div>

        {myPosts.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-sm bg-surface-container/20 border border-dashed border-outline-variant/15 rounded-3xl">
            Você ainda não realizou nenhuma publicação na comunidade.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myPosts.map(post => (
              <div key={post.id} className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-5 flex flex-col justify-between hover:border-primary/20 transition-colors group relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <span className={`text-[10.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${post.type === 'forex' ? 'bg-primary/15 text-primary border border-primary/25' : 'bg-secondary/15 text-secondary border border-secondary/25'}`}>
                      {post.type === 'forex' ? 'Forex Market' : 'Opções Binárias'}
                    </span>
                    <button 
                      onClick={async () => {
                        if (confirm('Deseja excluir esta publicação permanentemente?')) {
                          try {
                            await deleteDoc(doc(db, 'community_posts', post.id));
                          } catch (err) {
                            console.error('Erro ao deletar:', err);
                          }
                        }
                      }}
                      className="text-on-surface-variant opacity-60 hover:opacity-100 hover:text-error transition-all p-1.5 hover:bg-error/10 rounded-xl"
                      title="Excluir Publicação"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <p className="text-sm font-semibold text-on-surface leading-relaxed mt-4 line-clamp-3">
                    {post.legend}
                  </p>

                  {post.imageUrl && (
                    <div className="mt-4 rounded-2xl overflow-hidden max-h-[160px] border border-outline-variant/10">
                      <img src={post.imageUrl} alt="Post visualization" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-outline-variant/10 flex justify-between items-center text-xs text-on-surface-variant font-medium">
                  <span className="opacity-65">
                    {post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleDateString() : 'Recente'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={13} className="text-[#00f5a0]" />
                      <strong>{post.likesCount || 0}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={13} className="text-secondary" />
                      <strong>{post.commentsCount || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal {...modalConfig} />
    </div>
  );
}
