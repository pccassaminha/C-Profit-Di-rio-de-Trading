import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isError?: boolean;
  isLoading?: boolean;
}

export default function Modal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  isError = false,
  isLoading = false
}: ModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset processing state whenever title, message or isOpen changes
  useEffect(() => {
    setIsProcessing(false);
  }, [isOpen, title, message]);

  if (!isOpen) return null;

  const loading = isLoading || isProcessing;

  const handleConfirmClick = async () => {
    if (loading) return;
    try {
      setIsProcessing(true);
      await Promise.resolve(onConfirm());
    } catch (error) {
      console.error("Error executing modal action:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className={`text-xl font-bold mb-2 font-headline ${isError ? 'text-error' : 'text-on-surface'}`}>
          {title}
        </h3>
        <p className="text-on-surface-variant mb-8 whitespace-pre-line leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          {onCancel && !loading && (
            <button 
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors font-medium text-sm disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={handleConfirmClick}
            disabled={loading}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center min-w-[120px] gap-2 ${
              isError 
                ? 'bg-error text-on-error hover:brightness-110 active:scale-95' 
                : 'bg-primary text-on-primary hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20'
            } disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                <span>Processando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
