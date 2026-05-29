import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCurrency } from '../contexts/CurrencyContext';
import { Search, Filter, Plus, Image as ImageIcon, X, Send, Calendar, CheckCircle2, AlertCircle, Info, TrendingUp, TrendingDown, Gauge, ShieldCheck, ChevronDown, ChevronUp, Pencil, StickyNote, History } from 'lucide-react';
import { format, startOfWeek, endOfWeek, getWeek, getYear, isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRangePicker } from './DateRangePicker';
import { DateRange } from 'react-day-picker';

interface PlanningEntry {
  id: string;
  userId: string;
  content: string;
  createdAt: any;
  sentiment: 'risk-on' | 'risk-off' | 'neutral';
  confidence: 'high' | 'med' | 'low';
  title: string;
  isDailyNote?: boolean;
}

export default function Planner() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [sentiment, setSentiment] = useState<'risk-on' | 'risk-off' | 'neutral'>('neutral');
  const [confidence, setConfidence] = useState<'high' | 'med' | 'low'>('med');
  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<PlanningEntry | null>(null);
  const [isNoteForm, setIsNoteForm] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'planning'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlanningEntry));
      setEntries(data);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!content || !auth.currentUser) return;

    try {
      if (editingEntry) {
        await updateDoc(doc(db, 'planning', editingEntry.id), {
          title: title || `Planejamento ${format(new Date(), 'dd/MM/yyyy')}`,
          content,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'planning'), {
          userId: auth.currentUser.uid,
          title: title || (isNoteForm ? `Nota Diária ${format(new Date(), 'dd/MM')}` : `Planejamento ${format(new Date(), 'dd/MM/yyyy')}`),
          content,
          sentiment,
          confidence,
          isDailyNote: isNoteForm,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving planning:", error);
    }
  };

  const resetForm = () => {
    setContent('');
    setTitle('');
    setEditingEntry(null);
    setIsFormOpen(false);
    setIsNoteForm(false);
  };

  const handleEdit = (entry: PlanningEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setIsNoteForm(!!entry.isDailyNote);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'planning', id));
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  const extractImages = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif))/gi;
    const tradingViewRegex = /(https?:\/\/www\.tradingview\.com\/x\/[a-zA-Z0-9]+)/gi;
    const urls = text.match(urlRegex) || [];
    const tvUrls = text.match(tradingViewRegex) || [];
    return [...new Set([...urls, ...tvUrls])];
  };

  const formatContent = (text: string) => {
    // Escapar tags HTML para evitar XSS básico
    let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Identificar emojis de números
    formatted = formatted.replace(/([1-9]️⃣)/g, '<span class="inline-flex items-center justify-center w-6 h-6 bg-primary text-on-primary rounded-full font-bold mr-2">$1</span>');

    // Identificar Forte/Fraco
    formatted = formatted.replace(/\bForte\b/gi, '<span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">Forte</span>');
    formatted = formatted.replace(/\bFraco\b/gi, '<span class="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider">Fraco</span>');

    // Identificar Risk-on / Risk-off
    formatted = formatted.replace(/\bRisk-on\b/gi, '<span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-black border border-emerald-500/30">RISK-ON</span>');
    formatted = formatted.replace(/\bRisk-off\b/gi, '<span class="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-xs font-black border border-rose-500/30">RISK-OFF</span>');

    // Identificar cabeçalhos
    formatted = formatted.replace(/^(#+)\s+(.+)$/gm, '<h3 class="text-on-surface font-bold text-lg mt-6 mb-3 font-headline border-b border-outline-variant/20 pb-2">$2</h3>');

    return formatted;
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSentiment = filterSentiment === 'all' || entry.sentiment === filterSentiment;
      const matchesConfidence = filterConfidence === 'all' || entry.confidence === filterConfidence;
      
      let matchesDate = true;
      if (dateRange && dateRange.from && entry.createdAt?.toDate) {
        const entryDate = entry.createdAt.toDate();
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        to.setHours(23, 59, 59, 999);
        matchesDate = isWithinInterval(entryDate, { start: from, end: to });
      }
      
      return matchesSearch && matchesSentiment && matchesConfidence && matchesDate;
    });
  }, [entries, searchQuery, filterSentiment, filterConfidence, dateRange]);

  const groupedEntries = useMemo((): Record<string, PlanningEntry[]> => {
    const groups: Record<string, PlanningEntry[]> = {};
    
    filteredEntries.forEach(entry => {
      if (!entry.createdAt?.toDate) return;
      const date = entry.createdAt.toDate();
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekLabel = `Semana ${getWeek(date)} (${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')})`;
      
      if (!groups[weekLabel]) groups[weekLabel] = [];
      groups[weekLabel].push(entry);
    });
    
    return groups;
  }, [filteredEntries]);

  const toggleWeek = (week: string) => {
    setExpandedWeeks(prev => 
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  useEffect(() => {
    // Expand latest week by default
    const weeks = Object.keys(groupedEntries);
    if (weeks.length > 0 && expandedWeeks.length === 0) {
      setExpandedWeeks([weeks[0]]);
    }
  }, [groupedEntries]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12">
        <div className="max-w-[1200px] mx-auto space-y-12">
          {/* Cabeçalho e Filtros Centralizados */}
          <div className="flex flex-col items-center gap-10">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-black text-on-surface font-headline tracking-tighter">Planejamento Estratégico</h1>
              <p className="text-on-surface-variant text-base mt-3 max-w-lg mx-auto">Visualize suas principais análises e metas de mercado de forma organizada por semana.</p>
            </div>

            {/* Barra de Busca e Filtro de Calendário */}
            <div className="w-full max-w-[1400px] flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 relative w-full group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por ativos, conceitos ou datas em todo o seu histórico..."
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-[2rem] pl-16 pr-6 py-5 text-base text-on-surface outline-none focus:border-primary focus:bg-surface-container transition-all shadow-lg focus:shadow-primary/5 shadow-black/20"
                />
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <div className="min-w-[280px] bg-surface-container-low rounded-[2rem] border border-outline-variant/30 shadow-lg px-2">
                  <DateRangePicker 
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setIsNoteForm(true); setIsFormOpen(true); }}
                    className="w-14 h-14 bg-surface-container-highest text-on-surface rounded-full flex items-center justify-center shadow-lg hover:bg-surface-container hover:text-primary transition-all group/btn"
                    title="Adicionar Nota Diária"
                  >
                    <StickyNote size={24} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={() => { setIsNoteForm(false); setIsFormOpen(true); }}
                    className="bg-primary text-on-primary font-black px-8 h-14 rounded-full flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all text-sm uppercase tracking-widest whitespace-nowrap"
                  >
                    <Plus size={24} />
                    <span>Novo Plano</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Planejamentos Agrupados por Semana */}
          <div className="space-y-10">
            {(Object.entries(groupedEntries) as [string, PlanningEntry[]][]).map(([week, weekEntries]) => {
              const isWeekExpanded = expandedWeeks.includes(week);
              
              return (
                <div key={week} className="space-y-6">
                  <button 
                    onClick={() => toggleWeek(week)}
                    className="flex items-center gap-4 w-full group"
                  >
                    <div className="h-px flex-1 bg-outline-variant/20 group-hover:bg-primary/20 transition-colors" />
                    <div className="px-6 py-2 bg-surface-container-highest border border-outline-variant/30 rounded-full flex items-center gap-3 shadow-sm transition-all group-hover:border-primary/50 group-hover:bg-primary/5">
                      <History size={16} className="text-primary" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface">{week}</span>
                      {isWeekExpanded ? <ChevronUp size={16} className="text-on-surface-variant" /> : <ChevronDown size={16} className="text-on-surface-variant" />}
                    </div>
                    <div className="h-px flex-1 bg-outline-variant/20 group-hover:bg-primary/20 transition-colors" />
                  </button>

                  {isWeekExpanded && (
                    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                      {weekEntries.map(entry => {
                        const images = extractImages(entry.content);
                        const isExpanded = expandedId === entry.id;

                        return (
                          <article 
                            key={entry.id} 
                            className={`bg-surface-container-low border border-outline-variant/20 rounded-[2rem] overflow-hidden shadow-lg transition-all duration-500 group ${isExpanded ? 'ring-2 ring-primary/20 shadow-primary/5 bg-surface-container' : 'hover:border-primary/30'} ${entry.isDailyNote ? 'border-l-4 border-l-secondary' : ''}`}
                          >
                            <div 
                              className={`p-6 md:p-8 cursor-pointer transition-colors ${isExpanded ? 'bg-primary/5' : 'hover:bg-surface-container/50'}`}
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            >
                              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded ${entry.isDailyNote ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                                      {entry.createdAt?.toDate ? format(entry.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: ptBR }) : 'Processando...'}
                                      {entry.isDailyNote && ' • NOTA DIÁRIA'}
                                    </span>
                                  </div>
                                  <h2 className="text-xl md:text-2xl font-black text-on-surface font-body leading-tight flex items-center gap-3">
                                    {entry.title}
                                    {isExpanded ? (
                                      <ChevronUp size={20} className="text-primary animate-bounce-slow" />
                                    ) : (
                                      <ChevronDown size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                                    )}
                                  </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                    className="p-3 rounded-2xl bg-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
                                    title="Editar Planejamento"
                                  >
                                    <Pencil size={20} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                    className="p-3 rounded-2xl bg-surface-container-highest text-on-surface-variant hover:text-error hover:bg-error/10 transition-all"
                                    title="Apagar Planejamento"
                                  >
                                    <X size={20} />
                                  </button>
                                </div>
                              </header>

                              {/* Preview do Conteúdo (quando minimizado) */}
                              {!isExpanded && (
                                <p className="text-on-surface-variant text-sm mt-4 line-clamp-1 opacity-60 italic">
                                  {entry.content.substring(0, 150)}...
                                </p>
                              )}

                              {/* Conteúdo Expansível (Previsualização) */}
                              {isExpanded && (
                                <div className="mt-8 pt-8 border-t border-outline-variant/20 animate-in fade-in slide-in-from-top-4 duration-300">
                                  <div className="space-y-6">
                                    <div 
                                      className="text-on-surface-variant text-sm md:text-base leading-relaxed font-body whitespace-pre-wrap selection:bg-primary/30"
                                      dangerouslySetInnerHTML={{ __html: formatContent(entry.content) }}
                                    />

                                    {/* Seção SMC com Imagens */}
                                    {images.length > 0 && (
                                      <div className="mt-10 pt-10 border-t border-outline-variant/20">
                                        <h4 className="text-on-surface font-black text-sm uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                          <ImageIcon size={16} className="text-primary" />
                                          Análise Técnica SMC
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {images.map((url, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-3xl overflow-hidden bg-surface-container-highest border border-outline-variant/20 group/img">
                                              <img 
                                                src={url} 
                                                alt={`Análise ${idx}`} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                referrerPolicy="no-referrer"
                                              />
                                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-4">
                                                <a 
                                                  href={url} 
                                                  target="_blank" 
                                                  rel="noreferrer"
                                                  className="text-white text-xs font-bold underline"
                                                >
                                                  Ver imagem original
                                                </a>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {Object.keys(groupedEntries).length === 0 && (
              <div className="bg-surface-container-low border border-outline-variant/20 border-dashed rounded-[2.5rem] p-20 text-center">
                <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar size={40} className="text-on-surface-variant/30" />
                </div>
                <h3 className="text-xl font-bold text-on-surface font-headline mb-2">Nenhum planejamento encontrado</h3>
                <p className="text-on-surface-variant text-sm max-w-xs mx-auto">Tente ajustar seus filtros ou comece a planejar o seu próximo trade agora mesmo.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Novo Planejamento */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-[3rem] p-8 md:p-12 w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-8 right-8 text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-all"
            >
              <X size={24} />
            </button>
            
            <div className="mb-8">
              <h2 className="text-3xl font-black text-on-surface font-headline tracking-tight">
                {editingEntry ? 'Editar Planejamento' : (isNoteForm ? 'Nova Nota Diária' : 'Novo Planejamento')}
              </h2>
              <p className="text-on-surface-variant mt-2 text-sm">
                {isNoteForm ? 'Registre seus insights e reflexões do dia para acompanhar sua evolução.' : 'Cole abaixo a análise da sua IA preferida e nós formataremos tudo para você.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase font-black tracking-widest text-on-surface-variant font-mono">Título</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isNoteForm ? "Ex: Insights do dia - Paciência e Foco" : "Ex: Semana de Alta - CPI & FOMC Focus"}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-2xl px-6 py-5 text-on-surface outline-none focus:border-primary transition-all font-bold placeholder:text-on-surface-variant/30 text-lg shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase font-black tracking-widest text-on-surface-variant font-mono">
                    {isNoteForm ? 'Sua Nota' : 'Modelo A (Análise e Metas)'}
                  </label>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isNoteForm ? "Escreva seus pensamentos aqui..." : "Cole aqui o texto formatado... links de imagens serão extraídos automaticamente."}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-[2rem] px-8 py-8 text-on-surface outline-none focus:border-primary transition-all font-body leading-relaxed min-h-[400px] resize-none scrollbar-hide text-lg shadow-inner"
                  />
                </div>

                <button 
                  onClick={handleSave}
                  disabled={!content}
                  className="w-full bg-primary text-on-primary font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all text-lg uppercase tracking-widest disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed mt-4 border border-white/10"
                >
                  <Send size={24} />
                  {editingEntry ? 'Salvar Alterações' : (isNoteForm ? 'Salvar Nota Diária' : 'Adicionar Novo Plano')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
