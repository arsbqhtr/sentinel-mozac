import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  MessageSquare, 
  Heart, 
  Bell,
  ArrowRight,
  Plus,
  TrendingUp,
  AlertCircle,
  Moon,
  Edit3,
  Brain,
  Users
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import ResilienceRing from '@/components/ResilienceRing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [moodLogs, setMoodLogs] = useState<any[]>([]);
  const [resilienceScore, setResilienceScore] = useState(72); // Default mock for screenshot parity
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch profile for greeting
    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    };
    fetchProfile();

    const q = query(
      collection(db, 'moodLogs'),
      where('userId', '==', auth.currentUser.uid),
      limit(50) // Fetch more to allow in-memory sorting without composite index
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort in memory to avoid "failed-precondition" index error
      const logs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
          const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
          return timeB - timeA;
        })
        .slice(0, 7);

      setMoodLogs(logs);
      
      if (logs.length > 0) {
        const avgMood = logs.reduce((acc, curr) => acc + curr.mood, 0) / logs.length;
        setResilienceScore(Math.round((avgMood / 5) * 100));
      }
    }, (error) => {
      console.error("MoodLogs snapshot error:", error);
    });

    return () => unsubscribe();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const actions = [
    { icon: Moon, label: 'Relax', color: 'text-cyan-600', bg: 'bg-cyan-50', path: '/relax' },
    { icon: Edit3, label: 'Journal', color: 'text-violet-600', bg: 'bg-violet-50', path: '/journal' },
    { icon: Brain, label: 'Quiz', color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/quiz' },
    { icon: Users, label: 'Peers', color: 'text-orange-600', bg: 'bg-orange-50', path: '/peers' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-slate-500 font-medium text-sm tracking-wide mb-1 uppercase opacity-70">
            {getGreeting()}
          </p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">
            {userProfile?.name?.split(' ')[0] || 'SENTINEL'}
          </h1>
        </div>
      </div>

      {/* Resilience Ring */}
      <div className="flex flex-col items-center justify-center py-4 mb-8 overflow-hidden">
        <ResilienceRing score={resilienceScore} />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {actions.map((action) => (
          <Link 
            key={action.label} 
            to={action.path}
            className="flex flex-col items-center gap-3"
          >
            <div className={cn(
              "h-16 w-full rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 transition-all active:scale-90",
              action.bg,
              action.color
            )}>
              <action.icon size={26} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Weekly Mood Section */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">
          Weekly Mood
        </h2>
        <Card className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden p-6 active:scale-[0.98] transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-900">Feeling Fair</p>
              <p className="text-sm text-slate-500">You logged 3 times this week</p>
            </div>
            <div className="h-16 w-16 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-slate-100">
               😐
            </div>
          </div>
        </Card>

        {/* SOS HELP button */}
        <a href="tel:15555" className="block w-full">
          <Button variant="outline" className="w-full h-14 bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-[2rem] font-black uppercase tracking-[0.1em] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <AlertCircle size={18} className="animate-pulse" />
            SOS HELP: HEAL 15555
          </Button>
        </a>
      </div>

      {/* HEAL Emergency System (Conditional) */}
      {resilienceScore < 40 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <Card className="border-2 border-red-100 bg-red-50/50 rounded-[32px] p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-bold text-red-900">HEAL System Alert</h3>
            </div>
            <p className="text-sm text-red-700 mb-4">Your resilience score is lower than usual. We're here to help.</p>
            <Link to="/counselor-chat">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl h-12 font-bold">
                Contact Support Now
              </Button>
            </Link>
          </Card>
        </motion.div>
      )}

      {/* Floating AI Chat Prompt */}
      <Link 
        to="/ai-chat"
        className="fixed bottom-24 right-6 h-14 w-14 bg-cyan-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-200 active:scale-90 transition-all z-40"
      >
        <Sparkles size={24} />
      </Link>
    </div>
  );
}
