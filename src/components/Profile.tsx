import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { updateProfile, verifyBeforeUpdateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, deleteDoc, getDocs, collectionGroup
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Eye, EyeOff, MessageSquare, ThumbsUp, Trash2, Camera, MapPin, 
  Briefcase, GraduationCap, Heart, Calendar, Check, Users, Award, 
  Edit3, Mail, User, Home, Smartphone, KeyRound, Image as ImageIcon, Plus, ShieldCheck, HelpCircle, MoreVertical, Globe
} from 'lucide-react';
import Modal from './Modal';
import CountryDropdown from './CountryDropdown';

const compressImageToBase64 = (file: File, maxWidth = 300, maxHeight = 300, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } else {
          resolve(src); // fallback to original base64
        }
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
};

const syncHistoricalProfileData = async (uid: string, newPhotoURL: string, newName: string) => {
  try {
    const updatePromises: Promise<void>[] = [];
    
    // Posts payload
    const postPayload: any = {};
    if (newPhotoURL) postPayload.userPhoto = newPhotoURL.startsWith('data:') 
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(newName || 'U')}&background=random` 
      : newPhotoURL;
    if (newName) postPayload.userName = newName;

    if (Object.keys(postPayload).length > 0) {
      // Update posts
      const postsQuery = query(collection(db, 'community_posts'), where('userId', '==', uid));
      const postsSnap = await getDocs(postsQuery);
      postsSnap.forEach(docSnap => {
        updatePromises.push(updateDoc(docSnap.ref, postPayload));
      });

      // Update comments
      const commentsQuery = query(collectionGroup(db, 'comments'), where('userId', '==', uid));
      const commentsSnap = await getDocs(commentsQuery);
      commentsSnap.forEach(docSnap => {
        updatePromises.push(updateDoc(docSnap.ref, postPayload));
      });
    }

    // Messages payload
    const msgPayload: any = {};
    if (newPhotoURL) msgPayload.senderPhoto = postPayload.userPhoto; // reuse same logic
    if (newName) msgPayload.senderName = newName;
    
    if (Object.keys(msgPayload).length > 0) {
      const messagesQuery = query(collectionGroup(db, 'messages'), where('senderId', '==', uid));
      const messagesSnap = await getDocs(messagesQuery);
      messagesSnap.forEach(docSnap => {
        updatePromises.push(updateDoc(docSnap.ref, msgPayload));
      });
    }

    await Promise.all(updatePromises);
    console.log("Historical data synced successfully:", updatePromises.length, "documents updated");
  } catch (err) {
    console.error("Error syncing historical profile data:", err);
  }
};

const COUNTRIES = [
  { code: 'AO', label: 'AO +244', dialCode: '+244', flag: '🇦🇴' },
  { code: 'PT', label: 'PT +351', dialCode: '+351', flag: '🇵🇹' },
  { code: 'BR', label: 'BR +55', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MZ', label: 'MZ +258', dialCode: '+258', flag: '🇲🇿' },
  { code: 'CV', label: 'CV +238', dialCode: '+238', flag: '🇨🇻' },
  { code: 'GW', label: 'GW +245', dialCode: '+245', flag: '🇬🇼' },
  { code: 'ST', label: 'ST +239', dialCode: '+239', flag: '🇸🇹' },
  { code: 'GQ', label: 'GQ +240', dialCode: '+240', flag: '🇬🇶' }
];

const parsePhoneNumberInput = (phoneVal: string) => {
  const dialCodes = ['+244', '+351', '+55', '+258', '+238', '+245', '+239', '+240'];
  let cleaned = (phoneVal || '').trim();
  
  for (const dial of dialCodes) {
    if (cleaned.startsWith(dial)) {
      return { dialCode: dial, localNumber: cleaned.substring(dial.length).trim() };
    }
    const noPlus = dial.replace('+', '');
    if (cleaned.startsWith(noPlus)) {
      return { dialCode: dial, localNumber: cleaned.substring(noPlus.length).trim() };
    }
  }
  
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    return { dialCode: '+244', localNumber: cleaned };
  }
  
  return { dialCode: '+244', localNumber: cleaned };
};

export default function Profile() {
  const user = auth.currentUser;
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [contactEmail, setContactEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileDialCode, setProfileDialCode] = useState('+244');
  const [profilePhoneLocal, setProfilePhoneLocal] = useState('');

  useEffect(() => {
    if (phoneNumber) {
      const parsed = parsePhoneNumberInput(phoneNumber);
      setProfileDialCode(parsed.dialCode);
      setProfilePhoneLocal(parsed.localNumber);
    }
  }, [phoneNumber]);

  const handleProfilePhoneLocalChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setProfilePhoneLocal(clean);
    setPhoneNumber(profileDialCode + clean);
  };

  const handleProfileDialChange = (val: string) => {
    setProfileDialCode(val);
    setPhoneNumber(val + profilePhoneLocal);
  };
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editLegend, setEditLegend] = useState('');
  const [postDropdownId, setPostDropdownId] = useState<string | null>(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  // Profile metadata fields (Facebook style)
  const [bio, setBio] = useState('');
  const [coverURL, setCoverURL] = useState('');
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string; mask: string }>>([
    { platform: 'Instagram', url: '', mask: '' }
  ]);
  const [liveIn, setLiveIn] = useState('');

  // Individual visibility toggles
  const [isLiveInPrivate, setIsLiveInPrivate] = useState(false);
  const [isPhoneNumberPrivate, setIsPhoneNumberPrivate] = useState(false);
  const [isEmailPrivate, setIsEmailPrivate] = useState(false);

  // Tab systems
  const [activeTab, setActiveTab] = useState<'tudo' | 'sobre' | 'amigos' | 'fotos'>('tudo');
  const [isEditing, setIsEditing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [allCommunityUsers, setAllCommunityUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const displayName = `${firstName} ${lastName}`.trim() || user?.displayName || 'Membro do C Profit';
  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

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
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1. Sincronização em tempo real do perfil do usuário ('usuarios')
    const unsubUserDoc = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
      let data = docSnap.exists() ? docSnap.data() : null;

      const applyData = (profileData: any) => {
        // Se estiver editando, não sobrescrever estados dos inputs locais para não interromper digitação do usuário
        if (!isEditingRef.current) {
          if (profileData.firstName) setFirstName(profileData.firstName);
          if (profileData.lastName) setLastName(profileData.lastName);
          if (profileData.contactEmail) {
            setContactEmail(profileData.contactEmail);
          } else if (profileData.email) {
            setContactEmail(profileData.email);
          } else if (user?.email) {
            setContactEmail(user.email);
          }
          if (profileData.phoneNumber) setPhoneNumber(profileData.phoneNumber);
          if (profileData.isPrivate !== undefined) setIsPrivate(profileData.isPrivate);
          if (profileData.bio) setBio(profileData.bio);
          if (profileData.liveIn) setLiveIn(profileData.liveIn);
          if (profileData.socialLinks) {
            setSocialLinks(profileData.socialLinks);
          } else {
            setSocialLinks([{ platform: 'Instagram', url: '', mask: '' }]);
          }
          if (profileData.isLiveInPrivate !== undefined) setIsLiveInPrivate(profileData.isLiveInPrivate);
          if (profileData.isPhoneNumberPrivate !== undefined) setIsPhoneNumberPrivate(profileData.isPhoneNumberPrivate);
          if (profileData.isEmailPrivate !== undefined) setIsEmailPrivate(profileData.isEmailPrivate);
        }
        
        // Fotos podem atualizar em background a qualquer momento
        if (profileData.photoURL) setPhotoURL(profileData.photoURL);
        if (profileData.coverURL) setCoverURL(profileData.coverURL);
      };

      if (data) {
        applyData(data);
        setIsLoading(false);
      } else {
        // Fallback para caminho antigo 'users'
        getDoc(doc(db, 'users', user.uid)).then((oldSnap) => {
          if (oldSnap.exists()) {
            applyData(oldSnap.data());
          } else {
            // Se não houver documento, inicializar com dados do Auth
            if (!isEditingRef.current) {
              if (user.displayName) {
                const parts = user.displayName.split(' ');
                setFirstName(parts[0] || '');
                setLastName(parts.slice(1).join(' ') || '');
              }
              if (user.email) {
                setEmail(user.email);
                setContactEmail(user.email);
              }
              if (user.photoURL) {
                setPhotoURL(user.photoURL);
              }
            }
          }
          setIsLoading(false);
        }).catch((err) => {
          console.warn("Fallback getDoc error:", err);
          setIsLoading(false);
        });
      }
    }, (err) => {
      console.warn("Real-time profile subscription failed:", err);
      setIsLoading(false);
    });

    // 2. Real-time followers/following counter from list snapshot
    const unsubFollowers = onSnapshot(collection(db, 'usuarios', user.uid, 'followers'), (snap) => {
      setFollowersCount(snap.size);
    }, (err) => {
      console.warn("Followers count error or offline mode active.", err);
    });

    const unsubFollowing = onSnapshot(collection(db, 'usuarios', user.uid, 'following'), (snap) => {
      setFollowingCount(snap.size);
    }, (err) => {
      console.warn("Following count error or offline mode active.", err);
    });

    // 3. Real-time feed list for user posts
    const q = query(
      collection(db, 'community_posts'),
      where('userId', '==', user.uid)
    );
    const unsubPosts = onSnapshot(q, (snapshot) => {
      const postsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by createdAt descending safely
      postsList.sort((a: any, b: any) => {
        const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
        const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
        return timeB - timeA;
      });
      setMyPosts(postsList);
    }, (err) => {
      console.warn("Users posts snapshot offline mode alert.", err);
    });

    // 4. Load other community users for friends list suggestion
    const unsubAllUsers = onSnapshot(collection(db, 'usuarios'), (snap) => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setAllCommunityUsers(list);
    }, (err) => {
      console.warn("All community users offline snapshot alert.", err);
    });

    return () => {
      unsubUserDoc();
      unsubFollowers();
      unsubFollowing();
      unsubPosts();
      unsubAllUsers();
    };
  }, [user]);

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const handleOpenUserProfile = (targetUser: any) => {
    const userPayload = {
      id: targetUser.id,
      name: targetUser.nome || targetUser.displayName || 'Trader',
      photo: targetUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.nome || 'U')}&background=random`
    };
    // Save to localStorage so that if rendering fresh, it picks it up
    localStorage.setItem('selected_community_profile_user', JSON.stringify(userPayload));
    
    // Dispatch instant live event in case Community is already mounted
    window.dispatchEvent(new CustomEvent('openCommunityUserProfile', { detail: userPayload }));
    
    // Switch main app navigation tab to community
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'community' }));
  };

  const getSuggestedTraders = () => {
    if (!user) return [];
    
    // Calculate mutual scores for all community users
    const candidates = allCommunityUsers
      .filter(u => u.id !== user.uid)
      .map(u => {
        let score = 0;
        
        // Match current city (highest weight)
        if (u.liveIn && liveIn && u.liveIn.trim().toLowerCase() === liveIn.trim().toLowerCase()) {
          score += 6;
        }
        
        // Match similarity in social links presence
        if (u.socialLinks && socialLinks && u.socialLinks.length > 0 && socialLinks.length > 0) {
          score += 3;
        }

        // Active Bio similarity or presence
        if (u.bio && bio) {
          score += 1;
        }
        
        // Add a stable but pseudo-random factor using the user's ID to keep recommendations fresh and varied, but stable for a user
        let idHash = 0;
        for (let i = 0; i < u.id.length; i++) {
          idHash = (idHash + u.id.charCodeAt(i)) % 100;
        }
        score += idHash / 25; // adds 0 to 4.0 points for stable variety
        
        return { user: u, score };
      });
      
    // Sort highest score first
    candidates.sort((a, b) => b.score - a.score);
    return candidates.map(c => c.user);
  };
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setIsSaving(true);
      try {
        const url = await compressImageToBase64(file, 300, 300, 0.7);
        
        // Update states and databases
        setPhotoURL(url);
        
        const userDocRef = doc(db, 'usuarios', user.uid);
        await setDoc(userDocRef, { photoURL: url }, { merge: true });
        try {
          await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
        } catch (e) {}

        // Update auth profile with a shorter URL to avoid 'Photo URL too long' error
        try {
          const shortUrl = url.startsWith('data:') 
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
            : url;
          await updateProfile(user, { photoURL: shortUrl });
          await user.reload();
        } catch (authErr) {
          console.warn("Could not save photoURL in Auth:", authErr);
        }

        // Sync historical posts and comments
        syncHistoricalProfileData(user.uid, url, displayName);

        setModalConfig({
          isOpen: true,
          title: "Foto Atualizada",
          message: "Sua foto de perfil foi alterada com sucesso."
        });
      } catch (error: any) {
        console.error("Error processing photo:", error);
        setModalConfig({
          isOpen: true,
          title: "Erro de Upload",
          message: `Falha ao processar foto de perfil: ${error.message}`,
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

  const handleSavePhotoModal = async () => {
    if (!selectedPhotoFile || !user) return;
    setIsSaving(true);
    try {
      const url = await compressImageToBase64(selectedPhotoFile, 300, 300, 0.7);
      
      // Update states and databases
      setPhotoURL(url);
      
      const userDocRef = doc(db, 'usuarios', user.uid);
      await setDoc(userDocRef, { photoURL: url }, { merge: true });
      
      try {
        await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
      } catch (e) {}

      // Update auth profile with a shorter URL to avoid 'Photo URL too long' error
      try {
        const shortUrl = url.startsWith('data:') 
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
          : url;
        await updateProfile(user, { photoURL: shortUrl });
        await user.reload();
      } catch (authErr) {
        console.warn("Could not save photoURL in Auth:", authErr);
      }

      // Sync historical posts and comments
      syncHistoricalProfileData(user.uid, url, displayName);

      setIsPhotoModalOpen(false);
      setSelectedPhotoFile(null);
      setSelectedPhotoPreview(null);

      setModalConfig({
        isOpen: true,
        title: "Foto Atualizada",
        message: "Sua foto de perfil foi alterada com sucesso.",
        onConfirm: closeModal
      });
    } catch (error: any) {
      console.error("Error processing photo from modal:", error);
      setModalConfig({
        isOpen: true,
        title: "Erro de Upload",
        message: `Falha ao processar foto de perfil: ${error.message}`,
        isError: true,
        onConfirm: closeModal
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setIsSaving(true);
      try {
        const url = await compressImageToBase64(file, 900, 300, 0.75);
        
        setCoverURL(url);
        
        const userDocRef = doc(db, 'usuarios', user.uid);
        await setDoc(userDocRef, { coverURL: url }, { merge: true });
        try {
          await setDoc(doc(db, 'users', user.uid), { coverURL: url }, { merge: true });
        } catch (e) {}

        setModalConfig({
          isOpen: true,
          title: "Capa Atualizada",
          message: "Sua foto de capa foi alterada com sucesso."
        });
      } catch (error: any) {
        console.error("Error processing cover:", error);
        setModalConfig({
          isOpen: true,
          title: "Erro de Upload",
          message: `Falha ao processar capa: ${error.message}`,
          isError: true,
        });
      } finally {
        setIsSaving(false);
        if (coverInputRef.current) {
          coverInputRef.current.value = '';
        }
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setModalConfig({
        isOpen: true,
        title: "E-mail Enviado",
        message: "Enviamos um link de recuperação para o seu e-mail da conta. Siga as instruções para criar uma nova palavra-passe.",
        confirmText: "OK",
        onConfirm: closeModal
      });
    } catch (error: any) {
      console.error(error);
      setModalConfig({
        isOpen: true,
        title: "Erro",
        message: "Ocorreu um erro ao enviar o e-mail de recuperação. Tente novamente mais tarde.",
        confirmText: "OK",
        onConfirm: closeModal
      });
    }
  };

  const handleSaveClick = () => {
    if (!user) return;
    
    setModalConfig({
      isOpen: true,
      title: "Salvar Alterações",
      message: "Confirmar gravação das suas informações de trader do C Profit?",
      onConfirm: () => {
        closeModal();
        executeSave();
      },
      onCancel: closeModal
    });
  };

  const executeSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const newDisplayName = `${firstName} ${lastName}`.trim();
      const authUpdate: any = { displayName: newDisplayName };
      
      if (photoURL) {
        authUpdate.photoURL = photoURL.startsWith('data:')
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(newDisplayName)}&background=random`
          : photoURL;
      }

      if (newDisplayName !== user.displayName || authUpdate.photoURL !== user.photoURL) {
        try {
          await updateProfile(user, authUpdate);
          await user.reload();
        } catch (authErr) {
          console.warn("Could not save photoURL in Auth:", authErr);
          if (newDisplayName !== user.displayName) {
            // fallback to only name
            await updateProfile(user, { displayName: newDisplayName });
            await user.reload();
          }
        }
      }

      // Sync historical posts and comments when name or photo changes
      syncHistoricalProfileData(user.uid, photoURL, newDisplayName);

      const profileData: any = {
        nome: newDisplayName,
        firstName: firstName.trim() || '',
        lastName: lastName.trim() || '',
        email: (email || user.email || '').trim(),
        contactEmail: (contactEmail || '').trim(),
        phoneNumber: (phoneNumber || '').trim(),
        photoURL: photoURL || '',
        userId: user.uid,
        isPrivate: isPrivate ?? false,
        bio: bio || '',
        coverURL: coverURL || '',
        socialLinks: (socialLinks || []).map(link => ({
          platform: link.platform || 'Instagram',
          url: link.url || '',
          mask: link.mask || ''
        })),
        liveIn: liveIn || '',
        isLiveInPrivate: isLiveInPrivate ?? false,
        isPhoneNumberPrivate: isPhoneNumberPrivate ?? false,
        isEmailPrivate: isEmailPrivate ?? false,
        updatedAt: new Date().toISOString()
      };

      // Guardar nos dois para compatibilidade de esquema (usuarios e antiga users)
      await setDoc(doc(db, 'usuarios', user.uid), profileData, { merge: true });
      try {
        await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
      } catch (e) {}

      if (email !== user.email) {
        await verifyBeforeUpdateEmail(user, email);
        setModalConfig({
          isOpen: true,
          title: "Verificação de E-mail",
          message: "Foi enviado um e-mail de confirmação para a nova morada. Por favor confirme-o para concluir a alteração.",
          onConfirm: closeModal
        });
      }

      setModalConfig({
        isOpen: true,
        title: "Sucesso",
        message: "O seu perfil de trader foi gravado com sucesso!",
        confirmText: "OK",
        onConfirm: () => {
          closeModal();
          setIsEditing(false);
        }
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.code === 'auth/requires-recent-login') {
        setModalConfig({
          isOpen: true,
          title: "Sessão Expirada",
          message: "Para atualizar dados sensíveis (e-mail, palavra-passe), necessita de se autenticar novamente.",
          isError: true,
          onConfirm: closeModal
        });
      } else {
        setModalConfig({
          isOpen: true,
          title: "Erro",
          message: `Ocorreu um erro ao gravar perfil: ${error.message}`,
          isError: true,
          onConfirm: closeModal
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSocialLink = () => {
    if (socialLinks.length >= 3) {
      alert("Você pode adicionar no máximo 3 contas de redes sociais.");
      return;
    }
    setSocialLinks([...socialLinks, { platform: 'Instagram', url: '', mask: '' }]);
  };

  const handleRemoveSocialLink = (index: number) => {
    const updated = socialLinks.filter((_, idx) => idx !== index);
    setSocialLinks(updated.length === 0 ? [{ platform: 'Instagram', url: '', mask: '' }] : updated);
  };

  const handleSocialLinkChange = (index: number, key: 'platform' | 'url' | 'mask', value: string) => {
    const updated = [...socialLinks];
    if (updated[index]) {
      updated[index] = { ...updated[index], [key]: value };
      setSocialLinks(updated);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm('Deseja excluir esta publicação permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'community_posts', postId));
      } catch (err) {
        console.error('Erro ao deletar:', err);
      }
    }
  };

  const handleStartEditPost = (post: any) => {
    setEditingPost(post);
    setEditLegend(post.legend || '');
    setPostDropdownId(null);
  };

  const handleSaveEditPost = async () => {
    if (!editingPost) return;
    try {
      await updateDoc(doc(db, 'community_posts', editingPost.id), {
        legend: editLegend
      });
      setEditingPost(null);
      setEditLegend('');
      alert('Publicação editada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao guardar a publicação editada.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-0 md:px-4 py-4 md:py-8 space-y-6 select-text text-left">
      
      {/* 1. UPPER COVER & AVATAR BLOCK (Facebook Style Layout) */}
      <div className="bg-surface rounded-none md:rounded-[32px] overflow-hidden border border-outline-variant/10 shadow-lg relative flex flex-col items-center">
        
        {/* Capa banner */}
        <div className="w-full h-44 sm:h-64 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 overflow-hidden">
          {coverURL ? (
            <img 
              src={coverURL} 
              alt="Foto de capa" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
              <div className="absolute inset-0 bg-neutral-900/50 mix-blend-multiply"></div>
              <span className="text-[110px] text-primary/10 select-none font-bold uppercase tracking-tight font-headline -translate-y-5">C PROFIT</span>
            </div>
          )}
        </div>

        {/* User Profile Avatar Overlay Header */}
        <div className="w-full max-w-4xl px-6 relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 pb-5">
          <div className="relative group shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-surface shadow-2xl bg-surface-container overflow-hidden">
            <img 
              src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} 
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
            {/* Avatar upload overlay hover */}
            <button 
              onClick={() => {
                setSelectedPhotoFile(null);
                setSelectedPhotoPreview(null);
                setIsPhotoModalOpen(true);
              }}
              className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white border-none outline-none w-full h-full"
              title="Alterar foto de perfil"
            >
              <Camera size={26} />
            </button>
          </div>

          {/* Profile Name and quick Bio summary */}
          <div className="flex-1 text-center sm:text-left space-y-2 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl sm:text-3xl font-black text-on-surface uppercase tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                {displayName}
                <Award size={22} className="text-primary fill-primary animate-pulse" />
              </h1>
            </div>
            
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md italic opacity-90">
              {bio || "Partilhe a sua bio para inspirar outros investidores..."}
            </p>

            {/* Quick Metrics of Follow system */}
            <div className="flex items-center justify-center sm:justify-start gap-3.5 text-xs text-on-surface-variant font-medium">
              <span className="bg-surface-container-high px-2.5 py-1 rounded-lg">
                <strong className="text-primary font-bold">{followersCount}</strong> seguidores
              </span>
              <span className="opacity-30">•</span>
              <span className="bg-surface-container-high px-2.5 py-1 rounded-lg">
                <strong className="text-primary font-bold">{followingCount}</strong> a seguir
              </span>
            </div>
          </div>

          {/* Top Actions alignment */}
          <div className="flex gap-2 shrink-0 pb-1 w-full sm:w-auto justify-center">
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setActiveTab('sobre');
              }}
              className="py-2.5 px-5 rounded-xl bg-primary text-on-primary hover:opacity-90 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Edit3 size={14} />
              {isEditing ? 'Ver Perfil' : 'Editar Perfil'}
            </button>
            <button
              onClick={() => setActiveTab('tudo')}
              className="py-2.5 px-5 rounded-xl bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <MessageSquare size={14} />
              Timeline ({myPosts.length})
            </button>
          </div>
        </div>

        {/* Facebook Style Tabs bar */}
        <div className="w-full max-w-4xl px-6 flex items-center gap-1 border-t border-outline-variant/10 text-xs font-bold text-on-surface-variant overflow-x-auto">
          {(['tudo', 'sobre', 'amigos', 'fotos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab !== 'sobre') setIsEditing(false);
              }}
              className={`py-4 px-5 border-b-2 capitalize tracking-wide transition-all shrink-0 ${activeTab === tab ? 'border-primary text-primary font-extrabold' : 'border-transparent hover:text-on-surface'}`}
            >
              {tab === 'tudo' ? 'Timeline' : tab === 'sobre' ? 'Sobre / Edições' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. SPLIT LAYOUT BY TABS SELECT */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="w-full">
          
          {/* TAB 1: ALL (TIMELINE / TUDO) */}
          {activeTab === 'tudo' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Sidebar Info columns (2 Grid Cols) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Apresentação / About summary */}
                <div className="bg-surface border border-outline-variant/10 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider border-b border-outline-variant/15 pb-2">Apresentação</h3>
                  
                  <div className="space-y-3.5 text-xs text-on-surface-variant font-medium">
                    {socialLinks && socialLinks.filter((l: any) => l.url || l.mask).map((link: any, idx: number) => {
                      let href = link.url || '#';
                      if (href !== '#' && !/^https?:\/\//i.test(href)) {
                        href = 'https://' + href;
                      }
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <Globe size={16} className="text-[#00f5a0] opacity-85 shrink-0" />
                            <span>
                              {link.platform}:{' '}
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00f5a0] hover:underline font-bold"
                              >
                                {link.mask || 'Ver Perfil'}
                              </a>
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-primary opacity-75" />
                        <span>Vive em: <strong className="text-on-surface">{liveIn || "Localização não disponível"}</strong></span>
                      </div>
                      {isLiveInPrivate && <span className="text-[10px] text-error flex items-center gap-0.5 shrink-0"><EyeOff size={11} /> Privado</span>}
                    </div>

                    {phoneNumber && (
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          <Smartphone size={16} className="text-primary opacity-75" />
                          <span>Contacto: <strong className="text-on-surface">{phoneNumber}</strong></span>
                        </div>
                        {isPhoneNumberPrivate && <span className="text-[10px] text-error flex items-center gap-0.5 shrink-0"><EyeOff size={11} /> Privado</span>}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Mail size={16} className="text-primary opacity-75 shrink-0" />
                        <span className="truncate">E-mail: <strong className="text-on-surface">{contactEmail || email}</strong></span>
                      </div>
                      {isEmailPrivate && <span className="text-[10px] text-error flex items-center gap-0.5 shrink-0"><EyeOff size={11} /> Privado</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setActiveTab('sobre');
                    }}
                    className="w-full text-center py-2 bg-surface-container active:scale-95 transition-all rounded-xl border border-outline-variant/10 hover:bg-surface-container-high text-xs font-bold text-on-surface-variant uppercase tracking-wider"
                  >
                    Editar Detalhes Públicos
                  </button>
                </div>

                {/* Collage gallery for own Photos */}
                <div className="bg-surface border border-outline-variant/10 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                    <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">A sua galeria</h3>
                    <button onClick={() => setActiveTab('fotos')} className="text-xs text-primary font-bold hover:underline">Ver todas</button>
                  </div>

                  {myPosts.filter(p => !!p.imageUrl).length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-on-surface-variant opacity-60 border border-dashed border-outline-variant/10 rounded-xl">
                      Nenhuma imagem publicada nas análises.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                      {myPosts.filter(p => !!p.imageUrl).slice(0, 9).map((post, index) => (
                        <div key={index} className="aspect-square bg-surface-container-high overflow-hidden group relative">
                          <img src={post.imageUrl} alt="Highlight publication" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggestions of traders sidebar */}
                <div className="bg-surface border border-outline-variant/10 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                    <h3 className="font-extrabold text-xs text-on-surface uppercase tracking-wider">Traders que talvez conheces</h3>
                    <button onClick={() => setActiveTab('amigos')} className="text-xs text-primary font-bold hover:underline">Ver todos</button>
                  </div>

                  {getSuggestedTraders().length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-on-surface-variant opacity-60 border border-dashed border-outline-variant/10 rounded-xl">
                      Nenhum outro membro sugerido.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-x-2 gap-y-3 text-center">
                      {getSuggestedTraders().slice(0, 6).map((item, index) => (
                        <div 
                          key={index} 
                          onClick={() => handleOpenUserProfile(item)}
                          className="flex flex-col items-center gap-1 cursor-pointer group hover:scale-105 transition-all duration-200"
                        >
                          <img 
                            src={item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nome || 'U')}&background=random`} 
                            alt={item.nome}
                            className="w-12 h-12 rounded-xl object-cover bg-black/10 group-hover:opacity-80 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[10px] text-on-surface font-semibold max-w-full truncate">
                            {item.nome}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Central post feeds columns (3 Grid Cols) */}
              <div className="lg:col-span-3 space-y-5">
                
                {/* Real count indicators */}
                <div className="bg-surface border border-outline-variant/10 rounded-2xl p-4 flex justify-between items-center text-xs text-on-surface-variant">
                  <span>Sua atividade de Trader</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{myPosts.length}</span> Publicações
                  </div>
                </div>

                {/* Feed output list */}
                <div className="space-y-4">
                  {myPosts.length === 0 ? (
                    <div className="py-16 text-center text-on-surface-variant text-xs bg-surface border border-dashed border-outline-variant/10 rounded-2xl flex flex-col items-center justify-center space-y-2">
                      <ImageIcon className="text-on-surface-variant opacity-40" size={28} />
                      <p>Ainda não realizou nenhuma publicação no quadro de análise.</p>
                    </div>
                  ) : (
                    myPosts.map(post => (
                      <div key={post.id} className="bg-surface border border-outline-variant/10 rounded-2xl p-4 flex flex-col space-y-3.5 shadow-sm text-left">
                        {/* Feed card header */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <img 
                              src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} 
                              alt="avatar" 
                              className="w-9 h-9 rounded-xl object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-on-surface uppercase tracking-tight">{displayName}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg border uppercase ${post.type === 'forex' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary/10 text-secondary border-secondary/20'}`}>
                                  {post.type === 'forex' ? 'Forex' : 'Opções Binárias'}
                                </span>
                              </div>
                              <span className="text-[9.5px] text-on-surface-variant opacity-60">
                                {post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleDateString() : 'Recentemente'}
                              </span>
                            </div>
                          </div>

                          <div className="relative">
                            <button 
                              onClick={() => setPostDropdownId(postDropdownId === post.id ? null : post.id)}
                              className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors"
                              title="Opções"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {postDropdownId === post.id && (
                              <div className="absolute right-0 top-8 w-32 bg-surface border border-outline-variant/15 rounded-xl shadow-lg py-1 z-30 overflow-hidden divide-y divide-outline-variant/10">
                                <button 
                                  onClick={() => handleStartEditPost(post)}
                                  className="w-full text-left px-3 py-2 text-xs text-on-surface font-semibold hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                                >
                                  <Edit3 size={13} />
                                  <span>Editar</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setPostDropdownId(null);
                                    handleDeletePost(post.id);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-error font-semibold hover:bg-error/10 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 size={13} />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Feed Card text */}
                        <p className="text-xs sm:text-sm text-on-surface leading-normal whitespace-pre-wrap">{post.legend}</p>

                        {/* Image asset attachments */}
                        {post.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-outline-variant/10 max-h-80">
                            <img src={post.imageUrl} alt="Asset attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {/* Engagement counters feedback */}
                        <div className="border-t border-outline-variant/10 pt-3 flex justify-between items-center text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1.5">
                            <ThumbsUp size={13} className="text-[#00f5a0]" />
                            <strong>{post.likesCount || 0}</strong> Gosto(s)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-secondary" />
                            <strong>{post.commentsCount || 0}</strong> comentário(s)
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OVER / SOBRE (Configurações do perfil) */}
          {activeTab === 'sobre' && (
            <div className="bg-surface border border-outline-variant/10 rounded-2xl p-5 md:p-8 text-left space-y-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
                <h3 className="font-extrabold text-md text-on-surface tracking-wide uppercase flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  Informações Pessoais do Trader
                </h3>
                <span className="text-xs text-on-surface-variant opacity-60">C Profit Conta Oficial</span>
              </div>

              {/* Bio block editable */}
              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Biografia de Introdução</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ex: Trader Profissional especializado no mercado de Forex e Opções Binárias desde 2018..."
                  rows={2}
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:opacity-50"
                />
              </div>

              {/* Standard grids profile inputs fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Primeiro Nome</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Último Nome</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pb-0.5">
                    <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">E-mail Comercial</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-error">
                      <input 
                        type="checkbox" 
                        checked={isEmailPrivate} 
                        onChange={(e) => setIsEmailPrivate(e.target.checked)}
                        className="rounded border-outline-variant text-[#00f5a0] focus:ring-[#00f5a0] bg-[#1a2035] w-3.5 h-3.5"
                      />
                      <span>Tornar Privado</span>
                    </label>
                  </div>
                  <input 
                    type="email" 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pb-0.5">
                    <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Nº Telemóvel</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-error">
                      <input 
                        type="checkbox" 
                        checked={isPhoneNumberPrivate} 
                        onChange={(e) => setIsPhoneNumberPrivate(e.target.checked)}
                        className="rounded border-outline-variant text-[#00f5a0] focus:ring-[#00f5a0] bg-[#1a2035] w-3.5 h-3.5"
                      />
                      <span>Tornar Privado</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <CountryDropdown 
                      value={profileDialCode}
                      onChange={handleProfileDialChange}
                      buttonClassName="bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-xs font-black text-on-surface outline-none focus:border-primary transition-all hover:bg-surface-container/80 h-full select-none max-h-10"
                    />

                    <input 
                      type="tel" 
                      value={profilePhoneLocal}
                      placeholder="Ex: 923 000 000"
                      onChange={(e) => handleProfilePhoneLocalChange(e.target.value)}
                      className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface font-mono"
                    />
                  </div>
                </div>

                {/* Cidade Atual inside the grid - spanning both columns on desktop */}
                <div className="space-y-1.5 sm:col-span-2 bg-[#0d1425]/40 border border-outline-variant/10 rounded-2xl p-4">
                  <div className="flex justify-between items-center pb-0.5">
                    <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Cidade Atual</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-error select-none">
                      <input 
                        type="checkbox" 
                        checked={isLiveInPrivate} 
                        onChange={(e) => setIsLiveInPrivate(e.target.checked)}
                        className="rounded border-outline-variant text-[#00f5a0] focus:ring-[#00f5a0] bg-[#1a2035] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Tornar Privado</span>
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={liveIn}
                    placeholder="Ex: Luanda"
                    onChange={(e) => setLiveIn(e.target.value)}
                    className="w-full bg-[#11192e] border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#00f5a0] text-on-surface"
                  />
                </div>
              </div>

              {/* REDES SOCIAIS CONFIG BLOCK - placed completely outside the 2-column grid, spanning full width with premium styling and spacious padding */}
              <div className="bg-[#0c1322] border border-outline-variant/20 rounded-[24px] p-6 space-y-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
                  <div>
                    <h4 className="text-sm font-black uppercase text-[#00f5a0] tracking-wider">Redes Sociais</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Configure até 3 links para apresentar aos outros traders no seu perfil</p>
                  </div>
                  {socialLinks.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddSocialLink}
                      className="py-1.5 px-4 bg-[#00f5a0]/10 hover:bg-[#00f5a0]/20 text-[#00f5a0] border border-[#00f5a0]/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>+ Adicionar</span>
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {socialLinks.map((link, idx) => (
                    <div key={idx} className="bg-[#11192e] p-4.5 rounded-xl border border-outline-variant/15 space-y-3.5 relative group text-left transition-all hover:border-[#00f5a0]/30 shadow-sm">
                      <div className="flex items-center justify-between gap-2 border-b border-outline-variant/10 pb-1.5">
                        <span className="text-[10px] font-black text-[#00f5a0]/70 uppercase tracking-widest">Rede Social #{idx + 1}</span>
                        {socialLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSocialLink(idx)}
                            className="text-red-400 hover:text-red-500 text-[10px] font-bold uppercase transition-colors px-1 cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {/* Plataforma */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block pl-1">Plataforma</label>
                          <select
                            value={link.platform}
                            onChange={(e) => handleSocialLinkChange(idx, 'platform', e.target.value)}
                            className="w-full bg-[#0a101f] border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-[#00f5a0] cursor-pointer"
                          >
                            <option className="bg-[#0a101f] text-on-surface" value="Instagram">Instagram</option>
                            <option className="bg-[#0a101f] text-on-surface" value="Facebook">Facebook</option>
                            <option className="bg-[#0a101f] text-on-surface" value="TikTok">TikTok</option>
                            <option className="bg-[#0a101f] text-on-surface" value="Canal YouTube">Canal YouTube</option>
                            <option className="bg-[#0a101f] text-on-surface" value="Outros">Outros</option>
                          </select>
                        </div>

                        {/* Máscara / Nome da Conta */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block pl-1">Nome da Conta / Máscara</label>
                          <input
                            type="text"
                            placeholder="Ex: @meu_instagram"
                            value={link.mask}
                            onChange={(e) => handleSocialLinkChange(idx, 'mask', e.target.value)}
                            className="w-full bg-[#0a101f] border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-[#00f5a0]"
                          />
                        </div>

                        {/* Link URL */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant font-bold uppercase block pl-1">Link de Perfil / URL</label>
                          <input
                            type="text"
                            placeholder="Ex: https://instagram.com/user"
                            value={link.url}
                            onChange={(e) => handleSocialLinkChange(idx, 'url', e.target.value)}
                            className="w-full bg-[#0a101f] border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-[#00f5a0]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sensitive operations (Account Email and Password Updates) */}
              <div className="space-y-6 pt-6 border-t border-outline-variant/15">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-primary" />
                    <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Alterar E-mail da Conta</label>
                  </div>
                  <div className="relative max-w-lg">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-mail da sua conta C Profit"
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-primary" />
                    <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Alterar Palavra-passe</label>
                  </div>

                  <div className="relative max-w-lg">
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="w-full bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-left flex justify-between items-center text-on-surface"
                    >
                      <span>Enviar link de alteração de palavra-passe para o meu e-mail</span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">mail</span>
                    </button>
                  </div>
                </div>
            </div>

            {/* Security locks & privacy block */}
              <div className="space-y-4 pt-6 border-t border-outline-variant/15">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-[#00f5a0]" size={18} />
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Definição de Privacidade do Canal</h4>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface-container/30 p-5 rounded-2xl border border-outline-variant/10 gap-4">
                  <div className="space-y-1 text-left">
                    <p className="text-xs sm:text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                      {isPrivate ? <EyeOff className="text-error" size={16} /> : <Eye className="text-secondary" size={16} />}
                      Bloquear Perfil Trader Público (Tornar Perfil Privado)
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl opacity-75">
                      Se ativado, outros utilizadores da Comunidade C Profit ficarão impossibilitados de inspecionar o seu feed de publicações pessoal, informações profissionais ou número de seguidores.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-14 h-8 rounded-full transition-colors relative flex items-center p-1 shrink-0 cursor-pointer outline-none ${isPrivate ? 'bg-primary' : 'bg-white/10 border border-outline-variant/15'}`}
                  >
                    <span className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-outline-variant/15 flex justify-end gap-3 items-center">
                <button 
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="bg-primary text-on-primary px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Gravar Alterações'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TRADERS / AMIGOS (Outros utilizadores) */}
          {activeTab === 'amigos' && (
            <div className="bg-surface border border-outline-variant/10 rounded-2xl p-6 text-left space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Investidores da Comunidade C Profit</h3>
                <span className="text-xs text-on-surface-variant font-bold">{allCommunityUsers.length} membros no total</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCommunityUsers.map((item, index) => (
                  <div 
                    key={index} 
                    onClick={() => handleOpenUserProfile(item)}
                    className="bg-surface-container/30 border border-outline-variant/10 rounded-2xl p-3.5 flex items-center gap-3.5 hover:border-primary/40 cursor-pointer active:scale-95 transition-all duration-200"
                  >
                    <img 
                      src={item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nome || 'U')}&background=random`} 
                      alt={item.nome}
                      className="w-12 h-12 rounded-xl object-cover hover:opacity-80 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <p className="font-bold text-xs text-on-surface hover:text-primary transition-colors truncate uppercase tracking-wide">{item.nome || "Membro do C Profit"}</p>
                      <p className="text-[10px] text-on-surface-variant opacity-65 truncate italic">{item.bio || "O Silêncio é de Ouro."}</p>
                      <p className="text-[9.5px] text-primary font-semibold">Trader Oficial</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: IMAGES / FOTOS (Galeria de imagens publicadas) */}
          {activeTab === 'fotos' && (
            <div className="bg-surface border border-outline-variant/10 rounded-2xl p-6 text-left space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-wider">Minhas Fotografias de Análises</h3>
                <span className="text-text font-bold text-xs">{myPosts.filter(p => !!p.imageUrl).length} Fotos</span>
              </div>

              {myPosts.filter(p => !!p.imageUrl).length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant text-xs border border-dashed border-outline-variant/10 rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <ImageIcon className="text-on-surface-variant opacity-40" size={26} />
                  <p>Não possui nenhuma fotografia de análise publicada na comunidade.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {myPosts.filter(p => !!p.imageUrl).map((post, index) => (
                    <div key={index} className="aspect-square bg-surface-container-high relative overflow-hidden group rounded-xl border border-outline-variant/10">
                      <img src={post.imageUrl} alt="Analysis visualization" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Edit Post Modal overlay */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
                <Edit3 size={16} className="text-primary" />
                Editar Minha Publicação
              </h3>
              <button 
                onClick={() => setEditingPost(null)}
                className="p-1 px-2.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Legenda da Análise / Mensagem</label>
              <textarea
                value={editLegend}
                onChange={(e) => setEditLegend(e.target.value)}
                placeholder="Qual o seu pensamento sobre esta análise?"
                className="w-full bg-surface-container border border-outline-variant/10 rounded-2xl p-4 text-xs text-on-surface focus:outline-none focus:border-primary min-h-[120px] resize-y custom-scrollbar"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-xs font-bold uppercase tracking-wider rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditPost}
                disabled={!editLegend.trim()}
                className="px-5 py-2 bg-primary text-on-primary hover:bg-primary/95 transition-all text-xs font-black uppercase tracking-wider rounded-xl disabled:opacity-45"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Photo Upload Modal Overlay */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant/10 rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
                <Camera size={16} className="text-primary" />
                Alterar Foto de Perfil
              </h3>
              <button 
                onClick={() => {
                  setIsPhotoModalOpen(false);
                  setSelectedPhotoFile(null);
                  setSelectedPhotoPreview(null);
                }}
                className="p-1 px-2.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-xs text-on-surface-variant">
                Selecione uma imagem do seu dispositivo para a sua nova foto de perfil.
              </p>

              {/* Central Round Preview */}
              <div className="flex justify-center">
                {selectedPhotoPreview ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-primary shadow-xl bg-surface-container">
                      <img 
                        src={selectedPhotoPreview} 
                        alt="Nova foto de perfil" 
                        className="w-full h-full object-cover rounded-full" 
                        referrerPolicy="no-referrer"
                      />
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white rounded-full">
                        <Camera size={20} />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert("A imagem deve ter no máximo 5MB.");
                                return;
                              }
                              setSelectedPhotoFile(file);
                              setSelectedPhotoPreview(URL.createObjectURL(file));
                            }
                          }} 
                        />
                      </label>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedPhotoFile(null);
                        setSelectedPhotoPreview(null);
                      }}
                      className="text-[11px] text-error font-extrabold uppercase tracking-wider hover:underline bg-transparent border-none outline-none"
                    >
                      Remover Seleção
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-outline-variant/30 hover:border-primary/50 rounded-full w-36 h-36 flex flex-col items-center justify-center cursor-pointer transition-all bg-surface-container/40 p-4">
                    <Camera size={28} className="text-on-surface-variant/70 mb-1.5" />
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Escolher Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert("A imagem deve ter no máximo 5MB.");
                            return;
                          }
                          setSelectedPhotoFile(file);
                          setSelectedPhotoPreview(URL.createObjectURL(file));
                        }
                      }} 
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2 w-full">
              <button
                onClick={() => {
                  setIsPhotoModalOpen(false);
                  setSelectedPhotoFile(null);
                  setSelectedPhotoPreview(null);
                }}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePhotoModal}
                disabled={!selectedPhotoFile || isSaving}
                className="flex-1 py-2.5 bg-primary text-on-primary hover:bg-primary/95 transition-all text-xs font-black uppercase tracking-wider rounded-xl disabled:opacity-45 flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    <span>A salvar...</span>
                  </>
                ) : (
                  <span>Concluído</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      <Modal {...modalConfig} />
    </div>
  );
}
