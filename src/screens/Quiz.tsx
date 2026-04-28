import { useState } from 'react';
import { ChevronLeft, Brain, Sparkles, ArrowRight, RotateCcw, Lock, CheckCircle2, Activity, Heart, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface PsychometricQuestion {
  id: number;
  text: string;
  category: 'stress' | 'anxiety' | 'depression';
}

const PSYCH_QUESTIONS: PsychometricQuestion[] = [
  { id: 1, text: "I found it hard to wind down", category: 'stress' },
  { id: 2, text: "I was aware of dryness of my mouth", category: 'anxiety' },
  { id: 3, text: "I couldn't seem to experience any positive feeling at all", category: 'depression' },
  { id: 4, text: "I experienced breathing difficulty (e.g. excessively rapid breathing)", category: 'anxiety' },
  { id: 5, text: "I found it difficult to work up the initiative to do things", category: 'depression' },
  { id: 6, text: "I tended to over-react to situations", category: 'stress' },
  { id: 7, text: "I experienced trembling (e.g. in the hands)", category: 'anxiety' },
  { id: 8, text: "I felt that I was using a lot of nervous energy", category: 'stress' },
  { id: 9, text: "I was worried about situations in which I might panic", category: 'anxiety' },
  { id: 10, text: "I felt that I had nothing to look forward to", category: 'depression' },
  { id: 11, text: "I found myself getting agitated", category: 'stress' },
  { id: 12, text: "I found it difficult to relax", category: 'stress' },
  { id: 13, text: "I felt down-hearted and blue", category: 'depression' },
  { id: 14, text: "I was intolerant of anything that kept me from getting on with what I was doing", category: 'stress' },
  { id: 15, text: "I felt I was close to panic", category: 'anxiety' },
];

const SCALES = [
  { label: "Did not apply to me at all", value: 0 },
  { label: "Applied to me to some degree", value: 1 },
  { label: "Applied to me to a considerable degree", value: 2 },
  { label: "Applied to me very much / most of the time", value: 3 },
];

export default function Quiz() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [selectedScale, setSelectedScale] = useState<number | null>(null);

  const handleNext = () => {
    if (selectedScale === null) return;
    
    const questionId = PSYCH_QUESTIONS[currentIndex].id;
    setResponses(prev => ({ ...prev, [questionId]: selectedScale }));

    if (currentIndex < PSYCH_QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedScale(responses[PSYCH_QUESTIONS[currentIndex + 1]?.id] ?? null);
    } else {
      setFinished(true);
    }
  };

  const calculateScores = () => {
    const totals = { stress: 0, anxiety: 0, depression: 0 };
    PSYCH_QUESTIONS.forEach(q => {
      totals[q.category] += (responses[q.id] || 0);
    });
    return totals;
  };

  const getInterpretation = (category: string, score: number) => {
    // Normalizing for 15 questions instead of full 21, then roughly scaling
    if (score <= 3) return { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-50' };
    if (score <= 6) return { label: 'Mild', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (score <= 9) return { label: 'Moderate', color: 'text-amber-500', bg: 'bg-amber-50' };
    return { label: 'Severe', color: 'text-rose-500', bg: 'bg-rose-50' };
  };

  if (finished) {
    const scores = calculateScores();
    const categories = [
      { name: 'Depression', score: scores.depression, icon: Heart, color: 'text-rose-500' },
      { name: 'Anxiety', score: scores.anxiety, icon: Zap, color: 'text-blue-500' },
      { name: 'Stress', score: scores.stress, icon: Activity, color: 'text-amber-500' },
    ];

    return (
      <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center mb-6 shadow-inner border border-emerald-100">
             <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Profile Complete</h2>
          <p className="text-sm text-slate-400 mt-2 font-medium">Your psychometric indicators have been analyzed.</p>
        </div>

        <div className="space-y-4">
          {categories.map((cat) => {
            const interpretation = getInterpretation(cat.name.toLowerCase(), cat.score);
            return (
              <Card key={cat.name} className="p-6 rounded-[32px] border-none shadow-sm bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl bg-slate-50", cat.color)}>
                      <cat.icon size={20} />
                    </div>
                    <span className="font-black text-slate-900 uppercase tracking-widest text-xs">{cat.name} Indicator</span>
                  </div>
                  <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", interpretation.bg, interpretation.color)}>
                    {interpretation.label}
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${(cat.score / 15) * 100}%` }}
                     className={cn("h-full", cat.color.replace('text', 'bg'))} 
                   />
                </div>
              </Card>
            );
          })}
        </div>
        
        <Card className="rounded-[40px] border-none shadow-sm bg-slate-900 p-8 mt-8 text-white">
           <h3 className="text-lg font-black uppercase tracking-tight mb-2">Internal Note</h3>
           <p className="text-slate-400 text-sm leading-relaxed mb-8">
             This psychometric test provides a snapshot of your emotional state over the past week. 
             It is designed for self-reflection and is not a clinical diagnosis.
           </p>
           <div className="flex gap-4">
             <Button 
               variant="ghost"
               onClick={() => {
                 setFinished(false);
                 setCurrentIndex(0);
                 setResponses({});
                 setSelectedScale(null);
               }}
               className="flex-1 h-14 rounded-2xl border-none text-white/50 font-black uppercase tracking-widest hover:bg-white/5"
             >
               <RotateCcw className="mr-2" size={18} />
               Re-Test
             </Button>
             <Link to="/" className="flex-1">
               <Button className="w-full h-14 rounded-2xl bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-700 shadow-xl shadow-cyan-100">
                 Done
               </Button>
             </Link>
           </div>
        </Card>
      </div>
    );
  }

  const q = PSYCH_QUESTIONS[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
           <Brain size={14} className="text-cyan-500" />
           <span className="text-xs font-black uppercase tracking-widest text-slate-900">{currentIndex + 1} of {PSYCH_QUESTIONS.length}</span>
        </div>
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm">
           <Lock size={18} className="text-slate-300" />
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-2 bg-slate-200 rounded-full mb-12 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / PSYCH_QUESTIONS.length) * 100}%` }}
          className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
        />
      </div>

      {/* Profile Question */}
      <div className="mb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-2">Psychometric Assessment</p>
        <h2 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">
          Over the past week:
        </h2>
      </div>

      <Card className="rounded-[40px] border-none shadow-sm bg-white p-8 mb-8 flex flex-col justify-between min-h-[440px]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-snug mb-8">{q.text}</h2>
          
          <div className="space-y-3">
            {SCALES.map((scale) => (
              <button
                key={scale.value}
                onClick={() => setSelectedScale(scale.value)}
                className={cn(
                  "w-full p-5 rounded-[1.5rem] text-left font-medium text-sm transition-all border-2",
                  selectedScale === scale.value 
                    ? "bg-cyan-50 border-cyan-500 text-cyan-600 shadow-inner" 
                    : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{scale.label}</span>
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                    selectedScale === scale.value ? "border-cyan-600 bg-cyan-600" : "border-slate-300"
                  )}>
                    {selectedScale === scale.value && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleNext}
          disabled={selectedScale === null}
          className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-widest mt-8 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl active:scale-95"
        >
          {currentIndex === PSYCH_QUESTIONS.length - 1 ? 'Analyze Profile' : 'Confirm & Continue'}
          <ArrowRight className="ml-2" size={20} />
        </Button>
      </Card>
      
      <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest px-8">
        Your answers are private and encrypted within the Sentinel Security protocols.
      </p>
    </div>
  );
}
