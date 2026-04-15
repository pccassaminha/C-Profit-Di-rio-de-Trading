import React, { useState } from 'react';
import Modal from './Modal';

export default function Support() {
  // In a real app, these would be fetched from a database
  const [supportEmail, setSupportEmail] = useState('suporte@cjornal.com');
  const [supportPhone, setSupportPhone] = useState('+55 11 99999-9999');
  const [isEditing, setIsEditing] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isError?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // Mock super admin check (replace with real role check)
  const isSuperAdmin = true; 

  const handleSave = () => {
    // Save to database
    setIsEditing(false);
    setModalConfig({
      isOpen: true,
      title: "Sucesso",
      message: "Dados de suporte atualizados com sucesso!",
      confirmText: "OK",
      onConfirm: closeModal
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">
      <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-headline">Suporte</h2>
      
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 md:p-8 space-y-6">
        <p className="text-on-surface-variant">
          Precisa de ajuda? Entre em contato com nossa equipe de suporte através dos canais abaixo.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-surface-container rounded-xl border border-outline-variant/10">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">mail</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">E-mail de Suporte</p>
              {isEditing ? (
                <input 
                  type="email" 
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full bg-background border border-outline-variant/20 rounded-lg px-3 py-2 text-on-surface outline-none focus:border-primary" 
                />
              ) : (
                <p className="text-on-surface font-medium text-lg">{supportEmail}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-surface-container rounded-xl border border-outline-variant/10">
            <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">phone</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Telefone / WhatsApp</p>
              {isEditing ? (
                <input 
                  type="text" 
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full bg-background border border-outline-variant/20 rounded-lg px-3 py-2 text-on-surface outline-none focus:border-primary" 
                />
              ) : (
                <p className="text-on-surface font-medium text-lg">{supportPhone}</p>
              )}
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="pt-6 border-t border-outline-variant/20 flex justify-end">
            {isEditing ? (
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-primary font-bold hover:underline"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar Contatos (Admin)
              </button>
            )}
          </div>
        )}
      </div>

      <Modal {...modalConfig} />
    </div>
  );
}
