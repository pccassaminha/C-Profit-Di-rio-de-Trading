import React from 'react';
import { ArrowLeft, Mail, MessageSquare, BookOpen, AlertCircle } from 'lucide-react';
import { useTrades } from '../hooks/useTrades';
import AdBanner from './AdBanner';

export default function Ajuda({ onBack }: { onBack: () => void }) {
  const { isPro, globalSettings } = useTrades();
  return (
    <div className="min-h-screen bg-background text-on-surface p-8 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <AdBanner isPro={isPro} globalSettings={globalSettings} className="mb-6" />
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-8 cursor-pointer bg-transparent border-none outline-none"
        >
          <ArrowLeft size={20} />
          <span className="font-bold uppercase tracking-widest text-sm">Voltar</span>
        </button>

        <h1 className="text-4xl font-black font-headline uppercase tracking-tight mb-8">Central de Ajuda</h1>
        
        <p className="text-on-surface-variant text-lg leading-relaxed mb-12">Como podemos te ajudar hoje? Encontre tutoriais básicos, soluções de problemas técnicos ou entre em contato com nosso time de atendimento (Grupo Cassaminha).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Perguntas Frequentes</h3>
            <p className="text-sm text-on-surface-variant mb-4">Veja as respostas para as dúvidas mais comuns dos nossos investidores a respeito de análise, importação MT5 e painel.</p>
            <ul className="space-y-3 text-sm text-on-surface font-medium">
              <li className="cursor-pointer hover:text-primary transition-colors">Como importo relatórios em HTML?</li>
              <li className="cursor-pointer hover:text-primary transition-colors">A plataforma opera capital ou toma posições reais na conta?</li>
              <li className="cursor-pointer hover:text-primary transition-colors">O que acontece se meu plano expirar?</li>
            </ul>
          </div>

          <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#00f5a0]/10 flex items-center justify-center text-[#00f5a0] mb-6">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Primeiros Passos / Integrações</h3>
            <p className="text-sm text-on-surface-variant mb-4">Aprenda a fazer do C Profit o diário blindado e o analista principal da sua carteira, passo a passo, registando atividades contabilisticamente.</p>
            <ul className="space-y-3 text-sm text-on-surface font-medium">
              <li className="cursor-pointer hover:text-[#00f5a0] transition-colors">Gerenciando seu Diário Manual</li>
              <li className="cursor-pointer hover:text-[#00f5a0] transition-colors">Configurações Base do Perfil</li>
              <li className="cursor-pointer hover:text-[#00f5a0] transition-colors">Usufruindo do Modulo Analítico</li>
            </ul>
          </div>
        </div>

        <section className="bg-surface-container-high rounded-3xl p-8 md:p-12 text-center border border-outline">
          <h2 className="text-2xl font-black font-headline uppercase tracking-tight mb-4">Ainda Com Dúvidas?</h2>
          <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">Nossas equipes do Suporte Técnico estão à sua inteira disposição se os artigos da comunidade ou os módulos técnicos não resolverem suas necessidades com o C Profit.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:financeiro@cprofit.com" className="flex items-center gap-3 px-6 py-4 bg-surface-container-low border border-outline-variant rounded-full text-on-surface hover:border-primary/50 transition-colors w-full sm:w-auto justify-center no-underline">
              <Mail size={18} className="text-primary" />
              <span className="font-bold text-sm tracking-wider">financeiro@cprofit.com</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-6 py-4 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] rounded-full hover:bg-[#25D366]/20 transition-colors w-full sm:w-auto justify-center no-underline">
              <MessageSquare size={18} />
              <span className="font-bold text-sm tracking-wider">WhatsApp Oficial do Suporte</span>
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
