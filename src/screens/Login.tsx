import { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Lock, ChevronRight, GraduationCap, Building2, KeyRound, Mail, ArrowLeft, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'auth' | 'onboarding' | 'email'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [emailData, setEmailData] = useState({
    email: '',
    password: ''
  });
  const [onboardingData, setOnboardingData] = useState({
    name: '',
    schoolId: '',
    accessCode: '',
    role: 'student' as 'student' | 'counselor'
  });

  const schools = [
    { id: 'school-mozac', name: 'SM SAINS MUZAFFAR SYAH', accessCode: 'MOZAC2026', officialCode: 'MEE2141' },
    { id: 'school-jaim', name: 'SM AGAMA JAIM AL-AHMADI', accessCode: 'JAIM2026', officialCode: 'MFT2001' },
    { id: 'school-ssag', name: 'SM SAINS ALOR GAJAH', accessCode: 'SSAG2026', officialCode: 'MEA0103' },
    { id: 'school-kvmt', name: 'KOLEJ VOKASIONAL MELAKA TENGAH', accessCode: 'KVMT2026', officialCode: 'MHA2002' },
    { id: 'school-smkgb', name: 'SMK GHAFFAR BABA', accessCode: 'SMKGB2026', officialCode: 'MEA0071' },
    { id: 'school-smkdhtk', name: 'SMK DATO\' HAJI TALIB KARIM', accessCode: 'SMKDHTK2026', officialCode: 'MEA0072' },
    { id: 'school-smkasr', name: 'SMKA SHARIFAH RODZIAH', accessCode: 'SMKA2026', officialCode: 'MRA2127' },
  ];

  useEffect(() => {
    const seedSchools = async () => {
      // Only the developer/admin should seed these
      if (auth.currentUser?.email !== 'm-12397660@moe-dl.edu.my') return;

      try {
        for (const school of schools) {
          // Public school data
          await setDoc(doc(db, 'schools', school.id), {
            id: school.id,
            name: school.name,
            accessCode: school.accessCode
          });

          // Private verification secrets
          await setDoc(doc(db, 'school_verification', school.id), {
            officialCode: school.officialCode
          });
          
          // Ensure MOZAC counselors are seeded if it's MOZAC
          if (school.id === 'school-mozac') {
            const mozacCounselors = [
              { id: 'mozac-1', name: 'PN SITI NORIZAIDAH BT RAZALI', email: 'm-12397660@moe-dl.edu.my' },
              { id: 'mozac-2', name: 'PN MUNERA', email: 'm-12660742@moe-dl.edu.my' },
              { id: 'mozac-3', name: 'PN SITI HAJAR', email: 'm-12472228@moe-dl.edu.my' },
            ];
            for (const c of mozacCounselors) {
              await setDoc(doc(db, 'counselors', c.id), {
                id: c.id,
                name: c.name,
                email: c.email,
                schoolId: school.id,
              });
            }
          }
        }
      } catch (error) {
        console.error("Seeding error (this is normal for non-admins):", error);
      }
    };
    
    // Run after a short delay to ensure auth state is settled
    const timer = setTimeout(() => {
      seedSchools();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      // Also check if they are a counselor (by UID or Email)
      const counselorByUidRef = doc(db, 'counselors', user.uid);
      const counselorByUidSnap = await getDoc(counselorByUidRef);
      
      let isCounselor = counselorByUidSnap.exists();
      if (!isCounselor && user.email) {
        const q = query(collection(db, 'counselors'), where('email', '==', user.email), limit(1));
        const qSnap = await getDocs(q);
        isCounselor = !qSnap.empty;
      }

      if (userSnap.exists() || isCounselor) {
        window.location.reload();
      } else {
        // Create a base user document immediately on Google Login 
        // to prevent "No document to update" errors in other screens
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Member',
          email: user.email,
          role: 'student', // Default role
          isVerified: false,
          createdAt: new Date()
        }, { merge: true });

        setStep('onboarding');
        setOnboardingData(prev => ({ ...prev, name: user.displayName || user.email?.split('@')[0] || '' }));
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Unauthorized domain. Please add this URL to Firebase Auth authorized domains.', { duration: 10000 });
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!emailData.email || !emailData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, emailData.email, emailData.password);
        
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          isVerified: false,
          createdAt: new Date()
        });

        setStep('onboarding');
        setOnboardingData(prev => ({ ...prev, name: result.user.email?.split('@')[0] || '' }));
      } else {
        const result = await signInWithEmailAndPassword(auth, emailData.email, emailData.password);
        const loggedUser = result.user;
        const userRef = doc(db, 'users', loggedUser.uid);
        const userSnap = await getDoc(userRef);

        const counselorByUidRef = doc(db, 'counselors', loggedUser.uid);
        const counselorByUidSnap = await getDoc(counselorByUidRef);

        let isCounselor = counselorByUidSnap.exists();
        if (!isCounselor && loggedUser.email) {
          const q = query(collection(db, 'counselors'), where('email', '==', loggedUser.email), limit(1));
          const qSnap = await getDocs(q);
          isCounselor = !qSnap.empty;
        }

        if (userSnap.exists() || isCounselor) {
          window.location.reload();
        } else {
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: result.user.email,
            isVerified: false,
            createdAt: new Date()
          });
          setStep('onboarding');
        }
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Unauthorized domain. Please add this URL to Firebase Auth authorized domains.', { duration: 10000 });
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Invalid email or password. If you used Google originally, please use the Google button.', { duration: 6000 });
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Try signing in instead.');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailData.email) {
      toast.error('Please enter your email address first');
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, emailData.email);
      toast.success('Password reset link sent to your email!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    }
  };

  const handleOnboarding = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const selectedSchool = schools.find(s => s.id === onboardingData.schoolId);
      
      // Check access code kalau dia Student
      if (onboardingData.role === 'student' && selectedSchool?.accessCode !== onboardingData.accessCode) {
        toast.error('Invalid access code for this school');
        setLoading(false);
        return;
      }
      
      const userId = auth.currentUser.uid;
      const userDoc = {
        uid: userId,
        name: onboardingData.name,
        email: auth.currentUser.email,
        schoolId: onboardingData.schoolId,
        role: onboardingData.role,
        isVerified: true, // Pastikan ini true supaya pintu 'Private Channel' terbuka
        createdAt: new Date()
      };

      // 1. Simpan dalam koleksi utama 'users'
      await setDoc(doc(db, 'users', userId), userDoc);

      // 2. LOGIK KHAS: Kalau dia Counselor, simpan dalam koleksi 'counselors' juga
      if (onboardingData.role === 'counselor') {
        await setDoc(doc(db, 'counselors', userId), {
          id: userId,
          name: onboardingData.name,
          email: auth.currentUser.email,
          schoolId: onboardingData.schoolId, // Ini 'kunci' supaya student sekolah sama boleh nampak dia
          role: 'counselor',
          available: true // Tambah status available secara default
        });
        toast.success('Counselor account activated!');
      } else {
        toast.success('Student account verified!');
      }

      window.location.reload();
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Admin Setup Helper */}
        <div className="mb-4 p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-100 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Domain Authorization Guide</p>
          <p className="text-[10px] text-amber-700 leading-tight">
            If login fails with "unauthorized-domain", add these to <b>Firebase Console {"->"} Auth {"->"} Settings {"->"} Authorized Domains</b>:
            <code className="block mt-1 p-1 bg-white/50 rounded text-[9px] break-all select-all font-mono">
              ais-dev-un526eizrsvdo6dhyehf3a-697019201802.asia-southeast1.run.app
            </code>
            <code className="block mt-1 p-1 bg-white/50 rounded text-[9px] break-all select-all font-mono">
              ais-pre-un526eizrsvdo6dhyehf3a-697019201802.asia-southeast1.run.app
            </code>
          </p>
        </div>
        
        <div className="flex flex-col items-center text-center">
           <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-[32px] bg-cyan-600 text-white shadow-xl shadow-cyan-100 mb-6"
           >
            <Lock size={36} />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Sentinel</h1>
          <p className="mt-2 text-slate-400 font-medium text-sm">Your secure mental wellness companion</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'auth' ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card className="rounded-[40px] border-none shadow-sm bg-white p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Access Sentinel</h2>
                  <p className="text-sm text-slate-400 mt-1">Choose your preferred entry method.</p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleGoogleLogin} 
                    className="w-full h-14 rounded-2xl bg-white border border-slate-100 text-slate-900 font-bold hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
                    disabled={loading}
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5 bg-white rounded-full p-0.5" />
                    Continue with Google
                  </Button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-300">
                      <span className="bg-white px-3">secure gateway</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setStep('email')} 
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                    disabled={loading}
                  >
                    <Mail size={18} />
                    Continue with Email
                  </Button>
                </div>
              </Card>
              <p className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
                Protected by end-to-end encryption<br/>and secure institutional access.
              </p>
            </motion.div>
          ) : step === 'email' ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card className="rounded-[40px] border-none shadow-sm bg-white p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Enter your details below.</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setStep('auth')} 
                    className="rounded-xl h-10 w-10 text-slate-400"
                  >
                    <ArrowLeft size={18} />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Email Address</Label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        type="email"
                        value={emailData.email} 
                        onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="name@institution.edu"
                        className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11 focus-visible:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Security Key</Label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        type="password"
                        value={emailData.password} 
                        onChange={(e) => setEmailData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11 focus-visible:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleEmailAuth}
                    className="w-full h-14 rounded-2xl bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-700 shadow-lg shadow-cyan-100 transition-all active:scale-95"
                    disabled={loading}
                  >
                    {loading ? 'Authenticating...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
                  </Button>

                  {authMode === 'login' && (
                    <div className="text-center">
                      <button 
                        onClick={handleForgotPassword}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <div className="text-center">
                    <button 
                      onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 transition-colors"
                    >
                      {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="rounded-[40px] border-none shadow-sm bg-white p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Onboarding</h2>
                  <p className="text-sm text-slate-400 mt-1">Select your school to connect with support.</p>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-rose-500 ml-1">Nama Penuh (Wajib)</Label>
                    <div className="relative">
                      <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        value={onboardingData.name} 
                        onChange={(e) => setOnboardingData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Masukkan nama penuh anda"
                        className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11 focus-visible:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Identity</Label>
                    <Select 
                      value={onboardingData.role} 
                      onValueChange={(v: any) => setOnboardingData(prev => ({ ...prev, role: v }))}
                    >
                      <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-cyan-500">
                        <div className="flex items-center gap-2">
                          <GraduationCap size={18} className="text-slate-400" />
                          <SelectValue placeholder="I am a..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100">
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="counselor">Counselor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Institution</Label>
                    <Select 
                      value={onboardingData.schoolId} 
                      onValueChange={(v) => setOnboardingData(prev => ({ ...prev, schoolId: v }))}
                    >
                      <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-cyan-500">
                        <div className="flex items-center gap-2">
                          <Building2 size={18} className="text-slate-400" />
                          <SelectValue placeholder="Select School" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100">
                        {schools.map(school => (
                          <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {onboardingData.role === 'student' && (
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Access Token</Label>
                      <div className="relative">
                        <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input 
                          value={onboardingData.accessCode} 
                          onChange={(e) => setOnboardingData(prev => ({ ...prev, accessCode: e.target.value }))}
                          placeholder="School Access Code"
                          className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11 focus-visible:ring-cyan-500"
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleOnboarding} 
                    className="w-full h-14 rounded-2xl bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-700 shadow-lg shadow-cyan-100 transition-all active:scale-95"
                    disabled={loading || !onboardingData.name || !onboardingData.schoolId || (onboardingData.role === 'student' && !onboardingData.accessCode)}
                  >
                    {loading ? 'Processing...' : 'Complete Registration'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
