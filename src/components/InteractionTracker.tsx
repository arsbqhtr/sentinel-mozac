import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';

import { toast } from 'sonner';

export default function InteractionTracker({ children }: { children: React.ReactNode }) {
  const [showPopup, setShowPopup] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [goals, setGoals] = useState('');
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // 10 minutes = 10 * 60 * 1000 = 600,000 ms
      if (auth.currentUser && (now - lastCheckTime >= 600000)) {
        setShowPopup(true);
        setLastCheckTime(now);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [lastCheckTime]);

  const handleSubmit = async () => {
    if (!mood || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'moodLogs'), {
        userId: auth.currentUser.uid,
        mood,
        goals,
        createdAt: serverTimestamp()
      });
      toast.success('Sync updated! Focus on your goals.');
      setShowPopup(false);
      setMood(null);
      setGoals('');
    } catch (e) {
      toast.error('Failed to sync pulse check');
      handleFirestoreError(e, OperationType.CREATE, 'moodLogs');
    }
  };

  const emojis = [
    { icon: '😢', value: 1, label: 'Sad' },
    { icon: '😟', value: 2, label: 'Unset' },
    { icon: '😐', value: 3, label: 'Fair' },
    { icon: '🙂', value: 4, label: 'Happy' },
    { icon: '🤩', value: 5, label: 'Great' },
  ];

  return (
    <>
      {children}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="rounded-[40px] border-none p-8 max-w-[90%] sm:max-w-[400px]">
          <DialogHeader className="items-center text-center">
            <div className="h-16 w-16 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Active Pulse Check</DialogTitle>
            <DialogDescription className="font-medium text-slate-400">
              You've been active for 10 minutes. How are you feeling right now?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 mt-6">
            <div className="flex justify-between px-2">
              {emojis.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setMood(e.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all",
                    mood === e.value ? "scale-125 saturate-100" : "grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
                  )}
                >
                  <span className="text-4xl">{e.icon}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{e.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">
                <Target size={12} className="text-cyan-500" />
                Your goals today
              </Label>
              <Input 
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Stay focused, drink water..."
                className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-cyan-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-8">
            <Button 
              onClick={handleSubmit}
              disabled={!mood}
              className="w-full h-16 rounded-[2rem] bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-700 shadow-xl shadow-cyan-100 active:scale-95 transition-all"
            >
              Update Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
