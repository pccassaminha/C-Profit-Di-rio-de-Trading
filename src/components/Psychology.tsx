import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function Psychology() {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState({ content: '', link: '' });
  const [editingNote, setEditingNote] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const notesQuery = query(
      collection(db, 'psychology_notes'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notesData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setNotes(notesData);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleSave = async () => {
    if (!auth.currentUser || !newNote.content.trim()) return;

    setIsSaving(true);
    try {
      if (editingNote) {
        await updateDoc(doc(db, 'psychology_notes', editingNote.id), {
          content: newNote.content,
          link: newNote.link,
          updatedAt: serverTimestamp()
        });
        setEditingNote(null);
      } else {
        await addDoc(collection(db, 'psychology_notes'), {
          userId: auth.currentUser.uid,
          content: newNote.content,
          link: newNote.link,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setNewNote({ content: '', link: '' });
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta nota?')) return;
    try {
      await deleteDoc(doc(db, 'psychology_notes', id));
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleEdit = (note: any) => {
    setEditingNote(note);
    setNewNote({ content: note.content, link: note.link || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setNewNote({ content: '', link: '' });
  };

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto w-full">
      <div className="mb-10">
        <span className="text-xs font-label uppercase tracking-[0.2em] text-primary-fixed-dim">Diário Mental</span>
        <h2 className="text-4xl font-bold font-headline mt-2 text-on-surface">Psicologia</h2>
        <p className="text-on-surface-variant mt-2">Salve suas frases favoritas, reflexões e links importantes.</p>
      </div>

      {/* Input Area */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 mb-8 shadow-sm">
        <textarea
          value={newNote.content}
          onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
          placeholder="O que está na sua mente hoje?"
          className="w-full bg-transparent text-on-surface text-lg resize-none outline-none min-h-[100px] placeholder:text-on-surface-variant/50"
        />
        
        <div className="border-t border-outline-variant/20 pt-4 mt-2 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full flex items-center gap-2 bg-surface-container px-4 py-2 rounded-xl border border-outline-variant/30 focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">link</span>
            <input
              type="url"
              value={newNote.link}
              onChange={(e) => setNewNote({ ...newNote, link: e.target.value })}
              placeholder="Adicionar um link (opcional)"
              className="w-full bg-transparent text-sm text-on-surface outline-none"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {editingNote && (
              <button 
                onClick={cancelEdit}
                className="px-4 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving || !newNote.content.trim()}
              className="flex-1 md:flex-none px-6 py-2 rounded-xl bg-primary text-on-primary font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">{editingNote ? 'save' : 'send'}</span>
              {editingNote ? 'Atualizar' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {notes.length > 0 ? notes.map(note => (
          <div key={note.id} className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-sm group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">Nota Psicológica</p>
                  <p className="text-xs text-on-surface-variant">
                    {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleString('pt-BR') : 'Agora mesmo'}
                    {note.updatedAt && note.updatedAt.toMillis() !== note.createdAt?.toMillis() && ' (Editado)'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(note)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onClick={() => handleDelete(note.id)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-error transition-colors">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
            
            <p className="text-on-surface whitespace-pre-wrap mb-4 text-base leading-relaxed">
              {note.content}
            </p>

            {note.link && (
              <a 
                href={note.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 bg-surface-container rounded-xl text-primary hover:underline hover:bg-surface-container-highest transition-colors w-full md:w-auto overflow-hidden"
              >
                <span className="material-symbols-outlined text-sm shrink-0">link</span>
                <span className="truncate text-sm font-medium">{note.link}</span>
              </a>
            )}
          </div>
        )) : (
          <div className="text-center py-12 bg-surface-container-low border border-outline-variant/20 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">psychology_alt</span>
            <h3 className="text-lg font-bold text-on-surface mb-2">Seu Diário Mental está Vazio</h3>
            <p className="text-on-surface-variant text-sm">Comece a registrar seus pensamentos e reflexões acima.</p>
          </div>
        )}
      </div>
    </div>
  );
}
