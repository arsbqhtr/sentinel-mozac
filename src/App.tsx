import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, query, collection, where, getDocs, limit } from 'firebase/firestore';

// Screens
import Login from '@/screens/Login';
import Dashboard from '@/screens/Dashboard';
import AIChat from '@/screens/AIChat';
import CounselorChat from '@/screens/CounselorChat';
import Relax from '@/screens/Relax';
import Peers from '@/screens/Peers';
import Profile from '@/screens/Profile';
import Journal from '@/screens/Journal';
import Quiz from '@/screens/Quiz';
import Settings from '@/screens/Settings';

// Components
import BottomNav from '@/components/BottomNav';
import InteractionTracker from '@/components/InteractionTracker';
import { Toaster } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Priority 1: Check in 'counselors' collection
        // Try by UID first (registered through app)
        const counselorByUidRef = doc(db, 'counselors', currentUser.uid);
        const counselorByUidSnap = await getDoc(counselorByUidRef);
        
        let finalProfile = null;

        if (counselorByUidSnap.exists()) {
          finalProfile = { ...counselorByUidSnap.data(), role: 'counselor', isVerified: true };
        } else if (currentUser.email) {
          // Try by Email (for seeded counselors)
          const q = query(collection(db, 'counselors'), where('email', '==', currentUser.email), limit(1));
          const qSnap = await getDocs(q);
          
          if (!qSnap.empty) {
            finalProfile = { ...qSnap.docs[0].data(), role: 'counselor', isVerified: true };
          }
        }

        // Priority 2: Check in 'users' collection if not a counselor
        if (!finalProfile) {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            finalProfile = userSnap.data();
          }
        }

        setUserProfile(finalProfile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  // Fungsi helper untuk check akses
  const requiresVerify = (component: React.ReactElement) => {
    if (!user) return <Navigate to="/login" />;
    
    return component;
  };

  return (
    <Router>
      <InteractionTracker>
        <div className="flex min-h-screen w-full flex-col bg-slate-50 font-sans text-slate-900 selection:bg-cyan-100 selection:text-cyan-900">
          <main className={cn(
            "flex-1 overflow-x-hidden",
            user && "pb-20"
          )}>
            <Routes>
              {/* Laluan Bebas (Hanya perlu login) */}
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
              <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />

              {/* Laluan Berpagar (Mesti Verified) */}
              <Route path="/ai-chat" element={requiresVerify(<AIChat />)} />
              <Route path="/counselor-chat" element={requiresVerify(<CounselorChat />)} />
              <Route path="/relax" element={requiresVerify(<Relax />)} />
              <Route path="/peers" element={requiresVerify(<Peers />)} />
              <Route path="/journal" element={requiresVerify(<Journal />)} />
              <Route path="/quiz" element={requiresVerify(<Quiz />)} />
            </Routes>
          </main>
          {user && <BottomNav />}
          <Toaster position="top-center" richColors />
        </div>
      </InteractionTracker>
    </Router>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}