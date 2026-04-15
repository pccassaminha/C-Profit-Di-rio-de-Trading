import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isError?: boolean;
}

export default function Modal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  isError = false
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className={`text-xl font-bold mb-2 font-headline ${isError ? 'text-error' : 'text-on-surface'}`}>
          {title}
        </h3>
        <p className="text-on-surface-variant mb-8">
          {message}
        </p>
        <div className="flex justify-end gap-4">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="px-6 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors font-medium"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${isError ? 'bg-error text-on-error hover:brightness-110' : 'bg-primary text-on-primary hover:brightness-110 shadow-lg shadow-primary/20'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
