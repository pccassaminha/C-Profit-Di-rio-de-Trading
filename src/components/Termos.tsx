import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Termos({ onBack }: { onBack: () => void }) {
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

        <h1 className="text-4xl font-black font-headline uppercase tracking-tight mb-8">Termos de Uso</h1>
        
        <div className="space-y-6 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">1. Aceitação dos Termos</h2>
            <p>Ao acessar e operar neste sistema, o usuário (Trader) concorda inteiramente com nossas políticas e condições estabelecidas. A plataforma do Grupo Cassaminha foi desenvolvida para oferecer uma experiência analítica superior, com o propósito de gerenciamento de dados de operações financeiras.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">2. Uso da Plataforma e Ferramentas</h2>
            <p>A plataforma (C Profit Diário de Trades) oferece ferramentas avançadas para diário, sincronizações (via relatórios) e relatórios de performance de operações em corretoras através de contas reais e demonstrativas de Forex, Opções Binárias, B3, entre outros.</p>
            <p className="mt-4">O usuário é o único responsável pelos dados introduzidos (arquivos HTML, CSV ou inserções manuais). A plataforma atua apenas como um meio analítico, não executando e não endossando recomendações de investimentos financeiros. Nenhuma análise mostrada deve ser interpretada como aconselhamento financeiro.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">3. Ausência de Acesso a Credenciais e Dados de Execução</h2>
            <p>Não requisitamos e nem temos meios técnicos para ter o acesso às senhas, credenciais bancárias e os fundos monetários dos usuários de Corretoras (Brokers). Toda sincronização realizada através da plataforma é processada de modo unilateral, usando histórico de relatórios (Read-Only) fornecidos pelo Trader ou arquivos anexados, descartando risco de vazamentos de credenciais financeiras.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">4. Planos, Pagamentos e Renovação</h2>
            <p>A aquisição dos planos de assinatura garante o acesso aos recursos, conforme detalhes em nossa seção "Planos". O acesso só é considerado e validado após a confirmação e aprovação do pagamento em nossos sistemas (comprovantes ou APIs). Os planos possuem períodos de validade estabelecidos (um mês, semestre, ano) e não fazemos a renovação automática dos pagamentos no cartão de crédito do cliente para sua maior segurança e controle.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">5. Propriedade Intelectual</h2>
            <p>Todos os direitos sobre a interface, marca, logos (incluindo C Profit, C Store Angola e C Gestão Empresarial) e as ferramentas do sistema pertencem à desenvolvedora, parte do Grupo Cassaminha. Estão reservados todos os direitos morais e patrimoniais da plataforma.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">6. Limitação de Responsabilidades</h2>
            <p>A C Profit não será responsabilizada pelas decisões ou resultados tomados pelos Traders. Traders operam o mercado sob seu total risco, garantindo o devido controle do seu capital e patrimônio conforme seus preceitos financeiros. A C Profit garante alta disponibilidade e resiliência de relatórios, não cobrindo danos resultantes da flutuação contínua e natural de cotações financeiras.</p>
          </section>

          <p className="text-sm opacity-60 mt-12 pt-8 border-t border-outline">Última atualização: 14 de Maio de 2026. Sujeito a alterações periódicas, que serão anunciadas pelos nossos canais.</p>
        </div>
      </div>
    </div>
  );
}
