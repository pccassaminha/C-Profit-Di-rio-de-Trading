import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useTrades } from '../hooks/useTrades';
import { CreditCard, History, Download, FileText, CheckCircle2, XCircle, Clock, Printer, Landmark, Smartphone, Zap, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const getFormattedPhone = (phone: string | undefined): string => {
  if (!phone) return '244956394712';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 9 && clean.startsWith('9')) {
    return '244' + clean;
  }
  return clean || '244956394712';
};

export default function Payments() {
  const { userPlan, globalSettings } = useTrades();
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      // Create a clone of the printable content and append it to body but hide it,
      // to resolve any rendering issues with fixed positioning or scrolling elements.
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.top = '-9999px';
      printContainer.style.left = '-9999px';
      printContainer.style.width = '800px';
      printContainer.style.backgroundColor = '#ffffff';
      
      const contentClone = printRef.current.cloneNode(true) as HTMLElement;
      // Ajuste para não ter rolagem interna no clone
      contentClone.style.height = 'auto';
      contentClone.style.overflow = 'visible';
      printContainer.appendChild(contentClone);
      document.body.appendChild(printContainer);

      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      document.body.removeChild(printContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CProfit_Fatura_${selectedInvoice?.transactionCode || selectedInvoice?.id?.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente imprimir normalmente pela página.');
    } finally {
      setIsExporting(false);
    }
  };

  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    rejected: 'bg-error/10 text-error border-error/50'
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Negado'
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-on-surface font-headline uppercase italic tracking-tighter">
            Gestão <span className="text-primary italic">Financeira</span>
          </h2>
          <p className="text-on-surface-variant mt-2">Visualize seu histórico de faturas e pagamentos realizados.</p>
        </div>
        
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none mb-1">Plano Atual</p>
            <p className="text-sm font-black text-on-surface uppercase tracking-tight">{userPlan?.plan_type?.replace('_', ' ') || 'Nenhum'}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant/20 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="p-6">ID Pagamento</th>
                <th className="p-6">Data</th>
                <th className="p-6">Plano / Destino</th>
                <th className="p-6">Valor</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-surface-container/30 transition-colors group">
                  <td className="p-6">
                    <span className="font-mono text-xs text-on-surface-variant group-hover:text-primary transition-colors">
                      #{p.transactionCode || p.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="p-6">
                    <p className="font-bold text-sm">{new Date(p.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px] text-on-surface-variant opacity-60 italic">{new Date(p.createdAt).toLocaleTimeString()}</p>
                  </td>
                  <td className="p-6">
                    <p className="font-black text-xs uppercase italic tracking-tighter text-on-surface">
                      {p.planId?.replace('_', ' ')}
                    </p>
                  </td>
                  <td className="p-6">
                    <p className="font-black text-sm text-primary">{p.amount?.toLocaleString() || '0'} Kz</p>
                  </td>
                  <td className="p-6">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit ${statusColors[p.status as keyof typeof statusColors] || ''}`}>
                      {statusLabels[p.status as keyof typeof statusLabels] || p.status}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={() => setSelectedInvoice(p)}
                      title="Ver Fatura"
                      className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all border border-outline-variant/10"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <History size={48} />
                      <p className="font-bold">Nenhum registro de pagamento encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Fatura Detalhada */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface-container border border-outline-variant/20 rounded-[40px] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-3xl">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high">
              <h3 className="text-xl font-bold text-on-surface uppercase italic tracking-widest">Detalhe da Transação</h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-2 rounded-full hover:bg-surface-container transition-colors"
              >
                <XCircle size={24} className="text-on-surface-variant" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10" ref={printRef}>
              {/* Estilo para Impressão */}
              <div className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-inner border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between mb-12 gap-8 border-b border-slate-100 pb-12">
                  <div>
                    <div className="flex items-center gap-[12px] mb-4">
                      <img src="https://i.postimg.cc/v8qJ6KTk/C-profit.png" alt="C Logo" className="h-[32px] object-contain drop-shadow-md rounded-[8px]" />
                      <span className="font-headline text-[20px] font-extrabold text-slate-800 tracking-tight uppercase">Profit</span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Terminal de Alta Performance</p>
                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                      Luanda, Angola<br/>
                      Suporte: +244 ${globalSettings?.whatsappNumber || '921 319 200'}<br/>
                      Email: financeiro@cprofit.com
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">FATURA</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2">Nº TRANSAÇÃO: <span className="text-slate-900 font-mono tracking-tighter italic">#${selectedInvoice.transactionCode || selectedInvoice.id.slice(0, 8).toUpperCase()}</span></p>
                    <p className="text-sm font-bold text-slate-500 mt-1">DATA: <span className="text-slate-900">${new Date(selectedInvoice.createdAt).toLocaleDateString()}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                  <div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">Destinatário da Fatura:</h4>
                    <p className="font-black text-2xl text-slate-900 uppercase tracking-tighter">${selectedInvoice.userName || auth.currentUser?.displayName || 'Usuário C Profit'}</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">${selectedInvoice.userEmail || auth.currentUser?.email}</p>
                    {selectedInvoice.userPhone && (
                      <p className="text-sm font-bold text-slate-600 mt-1">TEL: ${selectedInvoice.userPhone}</p>
                    )}
                    <div className="flex items-center gap-2 mt-4 bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Registro: <span className="text-slate-900">MC-${(auth.currentUser?.uid?.split('').reduce((a, b) => a + b.charCodeAt(0), 0) || '0001')}</span></p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Instruções de Pagamento:</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Landmark size={20} className="text-blue-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Multicaixa / Transferência</p>
                          <p className="text-xs text-slate-500">Status: <span className={`${selectedInvoice.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'} font-bold uppercase`}>{selectedInvoice.status}</span></p>
                        </div>
                      </div>
                      
                      {selectedInvoice.status === 'pending' && (
                        <div className="pt-4 border-t border-slate-200 mt-4 space-y-4">
                          {globalSettings?.showIban && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">IBAN para Transferência</p>
                              <p className="text-sm font-black text-slate-900 font-mono italic">{globalSettings?.iban}</p>
                              {globalSettings?.ibanBank && (
                                <p className="text-[10px] text-slate-500 font-medium mt-1">
                                  Banco: <span className="font-bold text-slate-800">{globalSettings?.ibanBank}</span>
                                </p>
                              )}
                              {globalSettings?.ibanName && (
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Titular: <span className="font-bold text-slate-800">{globalSettings?.ibanName}</span>
                                </p>
                              )}
                            </div>
                          )}
                          {globalSettings?.showMulticaixa && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Entidade</p>
                                <p className="text-lg font-black text-slate-900 font-mono">{globalSettings?.multicaixaEntity}</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Referência</p>
                                <p className="text-lg font-black text-slate-900 font-mono">{globalSettings?.multicaixaReference}</p>
                              </div>
                            </div>
                          )}
                          {globalSettings?.showKwik && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Chave KWIK</p>
                              <p className="text-sm font-black text-slate-900 font-mono italic">{globalSettings?.kwikKey}</p>
                              {globalSettings?.kwikName && (
                                <p className="text-[10px] text-slate-500 font-medium mt-1">
                                  Titular: <span className="font-bold text-slate-800">{globalSettings?.kwikName}</span>
                                </p>
                              )}
                            </div>
                          )}
                          <p className="text-[9px] text-slate-400 italic text-center leading-tight">
                            Efetue o pagamento e envie o comprovativo para que possamos validar a sua assinatura.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-12">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-2 border-slate-900">
                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-900">Serviço/Plano</th>
                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-900 text-right">Preço Unitário</th>
                        <th className="py-4 text-xs font-black uppercase tracking-widest text-slate-900 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="text-sm">
                        <td className="py-6">
                          <p className="font-bold text-slate-900 uppercase">${selectedInvoice.planId.replace('_', ' ')}</p>
                          <p className="text-xs text-slate-400 mt-1">Assinatura de acesso ao terminal trading</p>
                        </td>
                        <td className="py-6 text-right font-medium">${selectedInvoice.amount.toLocaleString()} Kz</td>
                        <td className="py-6 text-right font-bold text-slate-900">${selectedInvoice.amount.toLocaleString()} Kz</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-end gap-3 pt-8 border-t border-slate-100">
                  <div className="flex justify-between w-full max-w-[240px]">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Subtotal:</span>
                    <span className="text-sm font-bold text-slate-900">${selectedInvoice.amount.toLocaleString()} Kz</span>
                  </div>
                  <div className="flex justify-between w-full max-w-[240px] pt-4 border-t border-slate-900">
                    <span className="text-lg font-black text-slate-900 uppercase tracking-widest">Total:</span>
                    <span className="text-2xl font-black text-blue-600">${selectedInvoice.amount.toLocaleString()} Kz</span>
                  </div>
                </div>

                <div className="mt-20 pt-12 border-t border-slate-100 flex justify-between items-center gap-8">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={40} className="text-emerald-500 opacity-20" />
                    <p className="text-[9px] text-slate-400 italic max-w-sm">Esta fatura foi processada eletronicamente através do sistema C Profit. Documento para fins informativos de controle financeiro.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">C PROFIT FINANCE</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-surface-container-high border-t border-outline-variant/10 flex flex-col md:flex-row justify-end gap-4">
              {selectedInvoice.status === 'pending' && (
                <button 
                  onClick={() => {
                    const phone = getFormattedPhone(globalSettings?.whatsappNumber);
                    window.open(`https://wa.me/${phone}?text=Olá, envio em anexo o comprovativo do pagamento #${selectedInvoice.id.slice(0, 8)}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-3 bg-[#25D366] text-[#022c16] px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all uppercase tracking-widest text-sm"
                >
                  <Smartphone size={20} />
                  Enviar Comprovante (WhatsApp)
                </button>
              )}
              <button 
                onClick={handlePrint}
                disabled={isExporting}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest text-sm transition-all ${isExporting ? 'bg-primary/50 text-white cursor-wait shadow-none' : 'bg-primary text-on-primary shadow-primary/20 hover:scale-105'}`}
              >
                <Printer size={20} />
                {isExporting ? 'GERANDO PDF...' : 'Imprimir / PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
