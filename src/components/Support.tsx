import React from 'react';
import { useTrades } from '../hooks/useTrades';
import { MessageSquare, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';

export default function Support() {
  const { globalSettings } = useTrades();
  const phone = globalSettings?.whatsappNumber || '244921319200';
  const whatsappUrl = `https://wa.me/${phone}`;

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
          rel="no-referrer"
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

      <div className="bg-surface-container border border-outline-variant/10 rounded-3xl p-10 text-center space-y-6">
        <h3 className="text-2xl font-black text-on-surface uppercase tracking-tighter">Dúvidas Frequentes</h3>
        <div className="max-w-2xl mx-auto space-y-4 text-left">
          <details className="group bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden cursor-pointer transition-all hover:bg-surface-container-high">
            <summary className="p-6 font-bold text-on-surface flex justify-between items-center list-none">
              Como sincronizo minha conta MT5?
              <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div className="p-6 pt-0 text-on-surface-variant border-t border-outline-variant/5 text-sm leading-relaxed">
              Vá em Configurações &gt; Conectar Plataformas. Copie seu Token de Sincronização e insira no nosso expert advisor (EA) no seu terminal MT5. O status mudará para "Sincronizado" automaticamente.
            </div>
          </details>

          <details className="group bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden cursor-pointer transition-all hover:bg-surface-container-high">
            <summary className="p-6 font-bold text-on-surface flex justify-between items-center list-none">
              Quanto tempo leva para ativar o plano?
              <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div className="p-6 pt-0 text-on-surface-variant border-t border-outline-variant/5 text-sm leading-relaxed">
              Após anexar o comprovativo na página de planos, nossa equipe valida em até 2 horas durante o horário comercial. Você receberá um aviso no Dashboard assim que estiver ativo.
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
