import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Privacidade({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background text-on-surface p-8 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-8 cursor-pointer bg-transparent border-none outline-none"
        >
          <ArrowLeft size={20} />
          <span className="font-bold uppercase tracking-widest text-sm">Voltar</span>
        </button>

        <h1 className="text-4xl font-black font-headline uppercase tracking-tight mb-8">Política de Privacidade</h1>
        
        <div className="space-y-6 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">1. Nosso Compromisso com a Privacidade</h2>
            <p>O Grupo Cassaminha e a plataforma C Profit valorizam incondicionalmente a privacidade e a proteção de dados. Com transparência e comprometimento técnico, este documento elucida as ações realizadas na guarda e conservação de dados inseridos localmente ou processados online no sistema.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">2. Coleta e Finalidade de Dados</h2>
            <p>Os únicos dados aos quais nossa infraestrutura tem retenção são focados em permitir o acesso ao painel através dos métodos oficiais previstos (e.g., e-mail usando provedor Google/Firebase e ID da transação financeira para desbloqueio de Planos).</p>
            <p className="mt-4"><strong>Não vendemos e nem providenciamos seus relatórios de traders, comportamentais, performance, volume financeiro e demais dados sensíveis a empresas terceiras sob nenhuma circunstância de forma profissional ou amadora.</strong> Os dados processados por importação (como HTML da MT5) servem único e exclusivamente para o próprio dono da conta analisar seu desempenho dentro da segurança da sua sessão, através da sua interface de painel autenticado.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">3. Não Acesso a Dados do Lado Corretora</h2>
            <p>Confirmamos vigorosamente que nosso sistema <strong>nunca solicitará e não tem acesso às senhas, segredos de APIs vinculados às carteiras da corretora, dados de confirmações ou quaisquer dados ou fundos para negociação</strong>. Seus recursos monetários estão completamente seguros nas respectivas contas das corretoras da sua escolha, uma vez que a C Profit opera como um assistente externo e analítico contendo uma integração One-Way em regime "Read Only" e sob requisição deliberada do proprietário do perfil (do trader).</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">4. Proteção e Segurança</h2>
            <p>Adotamos medidas modernas baseadas nos padrões da indústria de software de Nuvem, implementadas na infraestrutura backend do Firebase e Auth e Cloud Systems de grande fiabilidade. Todo o canal de transmissão na plataforma é assegurado por protocolos de comunicação seguros (HTTPS), conferindo criptografia do dispositivo de acesso do Trader aos servidores da nuvem.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">5. Compartilhamento Restrito</h2>
            <p>A confidencialidade de relatórios privados é mandatória. Qualquer modalidade de partilha efetuada (como capturas da tela ou uso do modo social/Acesso à Comunidade) requerirá ações ativas e inequívocas tomadas pela pessoa titular da conta ao interagir com as funções da Comunidade.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">6. Alteração e Exclusão Contas (GDRP/LGPD rights)</h2>
            <p>O Titular da Conta (Trader) detém os plenos poderes e tem a prerrogativa incontestável de, a qualquer momento, requerer a remoção completa dos seus registros através da interface de Configurações, removendo todas as transações diárias atreladas nos servidores do C Profit.</p>
          </section>

          <p className="text-sm opacity-60 mt-12 pt-8 border-t border-outline">Caso possua preocupações de caráter contundente referente à Política de Privacidade e Tratamento de Dados do C Profit, sinta-se plenamente convidado a interagir connosco contatando a nossa área técnica (suporte). Última revisão: 14 de Maio de 2026.</p>
        </div>
      </div>
    </div>
  );
}
