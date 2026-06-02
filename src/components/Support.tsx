import React, { useState } from 'react';
import { useTrades } from '../hooks/useTrades';
import { MessageSquare, Phone, Mail, Clock, ShieldCheck, User, HelpCircle, Send } from 'lucide-react';

const getFormattedPhone = (phone: string | undefined): string => {
  if (!phone) return '244956394712';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 9 && clean.startsWith('9')) {
    return '244' + clean;
  }
  return clean || '244956394712';
};

export default function Support() {
  const { globalSettings } = useTrades();
  const phone = getFormattedPhone(globalSettings?.whatsappNumber);
  const whatsappUrl = `https://wa.me/${phone}`;

  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');

  const handleSendSupportMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !question.trim()) return;

    const messageText = `Olá Suporte CProfit,\n\nNome: ${name.trim()}\nPergunta: ${question.trim()}`;
    const formattedUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
    
    // Redirect / open in new tab
    const anchor = document.createElement('a');
    anchor.href = formattedUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-on-surface font-headline uppercase italic tracking-tighter">Central de <span className="text-primary italic">Ajuda</span></h2>
          <p className="text-on-surface-variant mt-2 max-w-xl">Estamos prontos para ajudar você a dominar os mercados. Nosso time técnico responde em média em até 30 minutos.</p>
        </div>
        
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-[#022c16] px-8 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-[#25D366]/20 flex items-center gap-3 uppercase tracking-widest text-sm"
        >
          <MessageSquare size={20} />
          Suporte via WhatsApp
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low border border-outline-variant/10 p-8 rounded-3xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 text-on-surface flex items-center justify-center">
            <Mail size={24} />
          </div>
          <h4 className="text-lg font-bold text-on-surface">E-mail Técnico</h4>
          <p className="text-sm text-on-surface-variant">Para questões complexas ou parcerias institucionais.</p>
          <a href="mailto:contato@cprofit.com" className="block text-primary font-bold hover:underline">contato@cprofit.com</a>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-8 rounded-3xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/20 text-on-surface flex items-center justify-center">
            <Clock size={24} />
          </div>
          <h4 className="text-lg font-bold text-on-surface">Horário de Pico</h4>
          <p className="text-sm text-on-surface-variant">Atendimento prioritário durante as sessões de Londres e NY.</p>
          <p className="text-on-surface font-medium underline decoration-secondary decoration-2 underline-offset-4">08:00 - 18:00 (GMT+1)</p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-8 rounded-3xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <h4 className="text-lg font-bold text-on-surface">Segurança</h4>
          <p className="text-sm text-on-surface-variant">Nunca pediremos sua senha mestra. Somente o Token de Sincronização.</p>
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit tracking-wider">
            Protocolo SSL Ativo
          </div>
        </div>
      </div>

      {/* Faça uma Pergunta Form */}
      <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-6 md:p-10 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-on-surface uppercase tracking-tighter">Faça uma Pergunta</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">Insira seu nome e sua pergunta abaixo. Você será redirecionado para o WhatsApp oficial de suporte da CProfit.</p>
        </div>

        <form onSubmit={handleSendSupportMessage} className="max-w-2xl mx-auto space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <User size={13} className="text-primary" />
              Seu Nome
            </label>
            <input 
              type="text" 
              required
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ana Silva" 
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <HelpCircle size={13} className="text-primary" />
              Sua Pergunta
            </label>
            <textarea 
              required
              rows={4}
              value={question} 
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Escreva aqui a sua dúvida ou questão..." 
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-5 py-4 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#25D366] text-[#022c16] font-black py-4 rounded-2xl hover:scale-[1.01] transition-all shadow-lg shadow-[#25D366]/10 flex items-center justify-center gap-2 uppercase tracking-wider text-sm mt-6 cursor-pointer"
          >
            <Send size={16} />
            Enviar Mensagem via WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
}
