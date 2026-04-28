import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Calendar, Edit3, Save, History, Trash2, Lock } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

import { ai } from '@/lib/gemini';

export default function Journal() {
  const [entries, setEntries] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [view, setView] = useState<'write' | 'history'>('write');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'journals'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'journals'));
    return () => unsubscribe();
  }, []);

  const analyzeSentiment = async (text: string) => {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the sentiment of this journal entry. Rate the emotional state from 1 (Very Distressed/Sad) to 5 (Very Happy/Positive). Return ONLY a JSON object: { "score": number, "mood": "string" }
        
        Journal: "${text}"`
      });

      const responseText = result.text.replace(/```json|```/g, '').trim();
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return { score: 3, mood: 'Neutral' };
    }
  };

  const saveEntry = async () => {
    if (!content.trim() || !auth.currentUser) return;
    setIsAnalyzing(true);
    try {
      // 1. Analyze sentiment via AI
      const analysis = await analyzeSentiment(content);

      // 2. Save journal entry
      const entryRef = await addDoc(collection(db, 'journals'), {
        userId: auth.currentUser.uid,
        content,
        sentiment: analysis,
        createdAt: serverTimestamp()
      });

      // 3. Update system mood log (AI powered)
      await addDoc(collection(db, 'moodLogs'), {
        userId: auth.currentUser.uid,
        mood: analysis.score,
        focus: `AI Analysis: ${analysis.mood}`,
        journalId: entryRef.id,
        createdAt: serverTimestamp()
      });

      toast.success('Journal archived. CalmSphere has updated your resilience pulse.');
      setContent('');
      setView('history');
    } catch (e) {
      toast.error('Failed to save journal entry');
      handleFirestoreError(e, OperationType.CREATE, 'journals');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'journals', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `journals/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-90 transition-all">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
              Soul Journal
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-cyan-600">
               <Lock size={10} />
               <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Encrypted Private Log</span>
            </div>
          </div>
        </div>
        <div className="flex bg-white/50 p-1 rounded-2xl border border-slate-100">
           <button 
             onClick={() => setView('write')}
             className={cn("p-2 rounded-xl transition-all", view === 'write' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400")}
           >
             <Edit3 size={20} />
           </button>
           <button 
             onClick={() => setView('history')}
             className={cn("p-2 rounded-xl transition-all", view === 'history' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400")}
           >
             <History size={20} />
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'write' ? (
          <motion.div
            key="write"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="rounded-[40px] border-none shadow-sm bg-white p-8">
               <div className="mb-6">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Thoughts Today</p>
                 <h2 className="text-xl font-bold text-slate-900">How's your mind flowing?</h2>
               </div>
               <Textarea 
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 placeholder="Write your heart out here..."
                 className="min-h-[300px] rounded-3xl border-slate-100 bg-slate-50 p-6 focus-visible:ring-cyan-500 text-lg leading-relaxed placeholder:text-slate-300"
               />
               <Button 
                 onClick={saveEntry}
                 disabled={!content.trim() || isAnalyzing}
                 className={cn(
                   "w-full h-16 rounded-[2rem] bg-cyan-600 text-white font-black uppercase tracking-widest mt-8 hover:bg-cyan-700 shadow-lg shadow-cyan-100 active:scale-95 transition-all",
                   isAnalyzing && "opacity-50 cursor-wait"
                 )}
               >
                 {isAnalyzing ? (
                   <>
                     <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-3" />
                     CalmSphere Analyzing...
                   </>
                 ) : (
                   <>
                     <Save className="mr-2" size={20} />
                     Archive Memory
                   </>
                 )}
               </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1 mb-2">Previous Logs</h2>
            {entries.map((entry) => (
              <Card key={entry.id} className="rounded-[2.5rem] border-none shadow-sm bg-white p-6 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-cyan-600">
                    <Calendar size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                       {entry.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteEntry(entry.id)}
                    className="p-2 rounded-xl text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-slate-600 leading-relaxed italic">
                  "{entry.content}"
                </p>
              </Card>
            ))}
            {entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                 <History size={48} className="mb-4" />
                 <p className="font-bold uppercase tracking-widest text-xs">No entries archived yet</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
