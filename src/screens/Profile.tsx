import { useState, useEffect } from 'react';
import { User, School, Mail, Calendar, Moon, Sun, Bell, Lock, ChevronLeft, ChevronRight, LogOut, Activity, Brain, Layout, CheckCircle, Search, KeyRound, Building2, GraduationCap } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [verificationData, setVerificationData] = useState({
    institution: '',
    code: ''
  });
  const [isVerifying, setIsVerifying] = useState(false);

  // Institution Secrets (Pre-defined officially for the build)
  const INSTITUTION_SECRETS: Record<string, string> = {
    'school-mozac': 'MEE2141',
    'school-jaim': 'MFT2001',
    'school-ssag': 'MEA0103',
    'school-kvmt': 'MHA2002',
    'school-smkgb': 'MEA0071',
    'school-smkdhtk': 'MEA0072',
    'school-smkasr': 'MRA2127',
  };

  const institutions = [
    { id: 'school-mozac', name: 'SM SAINS MUZAFFAR SYAH', accessCode: 'MOZAC2026', officialCode: 'MEE2141' },
    { id: 'school-jaim', name: 'SM AGAMA JAIM AL-AHMADI', accessCode: 'JAIM2026', officialCode: 'MFT2001' },
    { id: 'school-ssag', name: 'SM SAINS ALOR GAJAH', accessCode: 'SSAG2026', officialCode: 'MEA0103' },
    { id: 'school-kvmt', name: 'KOLEJ VOKASIONAL MELAKA TENGAH', accessCode: 'KVMT2026', officialCode: 'MHA2002' },
    { id: 'school-smkgb', name: 'SMK GHAFFAR BABA', accessCode: 'SMKGB2026', officialCode: 'MEA0071' },
    { id: 'school-smkdhtk', name: 'SMK DATO\' HAJI TALIB KARIM', accessCode: 'SMKDHTK2026', officialCode: 'MEA0072' },
    { id: 'school-smkasr', name: 'SMKA SHARIFAH RODZIAH', accessCode: 'SMKA2026', officialCode: 'MRA2127' },
  ];

  const fetchProfile = async () => {
    if (!auth.currentUser) return;
    const docRef = doc(db, 'users', auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProfile(docSnap.data());
    }
    setLoading(false);
    
    // Fetch schools from Firestore
    try {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      setSchools(schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleVerify = async () => {
    if (!verificationData.institution || !verificationData.code) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      if (!auth.currentUser) throw new Error("No authenticated user found");

      // 1. Cari sekolah dari senarai yang kita fetch tadi
      const selectedSchool = schools.find(s => s.id === verificationData.institution);
      
      // 2. Ambil "Passkey" yang Aris dah hardcode kat atas tu
      const secretCode = INSTITUTION_SECRETS[verificationData.institution];

      // 3. Logik semakan: Mesti ada sekolah DAN kod mesti betul
      if (selectedSchool && secretCode === verificationData.code) {
        
        const userRef = doc(db, 'users', auth.currentUser.uid);
        
        // Guna updateDoc kalau user dah wujud, lebih selamat untuk permission
        await updateDoc(userRef, {
          schoolId: selectedSchool.id,
          institutionVerified: true,
          institutionVerifiedAt: serverTimestamp(),
          institutionName: selectedSchool.name,
          // Tambah metadata sikit biar nampak gempak
          accessLevel: 'official_member' 
        });
        
        toast.success(`Access Granted: Welcome to ${selectedSchool.name} Network!`);
        setShowVerifyDialog(false);
        fetchProfile();
      } else {
        toast.error('Access Denied: Invalid Institution Passkey');
      }
    } catch (error: any) {
      console.error('Verification Error:', error);
      // Ralat "No Permission" biasanya sebab Rules kat Firebase tak benarkan update
      toast.error(`Security Block: ${error.code === 'permission-denied' ? 'Update Firestore Rules' : error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) return null;

  const stats = [
    { label: 'Entries', value: '0', icon: Calendar, color: 'text-blue-500' },
    { label: 'Quizzes', value: '0', icon: Brain, color: 'text-cyan-500' },
    { label: 'Avg Score', value: '0%', icon: Activity, color: 'text-emerald-500' },
  ];

  const menuItems = [
    { label: 'Mood History', icon: Calendar, path: '#' },
    { label: 'Take Assessment', icon: Brain, path: '/quiz' },
    { label: 'Relaxation Hub', icon: Activity, path: '/relax' },
    { label: 'Register as Counselor', icon: GraduationCap, path: 'https://docs.google.com/forms/d/e/1FAIpQLScwEfgSiJ3TLBbMPydTKPHkREohOIxU5D0hEYXMdnUSXAX8Uw/viewform?usp=sharing&ouid=117726485163225718712', external: true },
    { label: 'AppSettings', icon: Layout, path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
          Profile
        </h1>
      </div>

      {/* User Info Card */}
      <Card className="rounded-[40px] border-none shadow-sm bg-white p-8 mb-8">
        <div className="flex flex-col items-center gap-6">
          <Avatar className="h-28 w-28 rounded-[40px] border-4 border-slate-50 shadow-inner">
            <AvatarImage src={auth.currentUser?.photoURL || ''} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-4xl font-black rounded-[40px]">
              {profile?.name?.charAt(0) || auth.currentUser?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center space-y-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Authenticated Name</p>
              <h2 className="text-2xl font-black text-slate-900 leading-tight uppercase">
                {profile?.name || auth.currentUser?.displayName || 'SENTINEL USER'}
              </h2>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Email Address</p>
              <p className="text-sm text-slate-500 font-bold">
                {auth.currentUser?.email}
              </p>
            </div>
            
            {profile?.institutionVerified ? (
              <div className="flex items-center justify-center gap-1.5 mt-4 text-emerald-600 bg-emerald-50 py-2.5 px-6 rounded-full w-fit mx-auto border border-emerald-100 animate-in fade-in zoom-in duration-500">
                <CheckCircle size={14} className="fill-emerald-600 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Official {profile.institutionName || 'Member'}</span>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 bg-slate-50 py-2 px-4 rounded-full w-fit mx-auto">
                  <Building2 size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Guest Identity</span>
                </div>
                <Button 
                  onClick={() => setShowVerifyDialog(true)}
                  className="h-10 px-6 rounded-2xl bg-cyan-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-cyan-700 shadow-md shadow-cyan-100 active:scale-95 transition-all"
                >
                  Verify Institution
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="rounded-[40px] border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Campus Verification</DialogTitle>
            <DialogDescription className="font-medium text-slate-400">Securely verify your institution affiliation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Choose Institution</Label>
              <Select 
                modal={false}
                onValueChange={(v) => setVerificationData({...verificationData, institution: v})}
              >
                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-cyan-500">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  {schools.map(inst => (
                    <SelectItem key={inst.id} value={inst.id} className="rounded-xl focus:bg-cyan-50">
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Official School Code</Label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  value={verificationData.code} 
                  onChange={(e) => setVerificationData({...verificationData, code: e.target.value.toUpperCase()})}
                  placeholder="Enter Code"
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11 focus-visible:ring-cyan-500 font-bold uppercase tracking-widest"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium px-1">This code is provided by your administration for security.</p>
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button 
              onClick={handleVerify}
              disabled={!verificationData.institution || !verificationData.code || isVerifying}
              className="w-full h-16 rounded-[2rem] bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-700 shadow-xl shadow-cyan-100 active:scale-95 transition-all"
            >
              {isVerifying ? 'Verifying Protocols...' : 'Activate Official Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 rounded-[32px] border-none shadow-sm bg-white flex flex-col items-center gap-1">
            <stat.icon className={stat.color} size={20} />
            <span className="text-xl font-black text-slate-900">{stat.value}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
          </Card>
        ))}
      </div>

      {/* Action Menu */}
      <div className="space-y-4 mb-12">
        {menuItems.map((item) => (
          item.external ? (
            <a key={item.label} href={item.path} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="rounded-3xl border-none shadow-sm bg-white p-5 flex items-center justify-between hover:bg-slate-50 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                    <item.icon size={20} />
                  </div>
                  <span className="font-bold text-slate-900">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </Card>
            </a>
          ) : (
            <Link key={item.label} to={item.path}>
              <Card className="rounded-3xl border-none shadow-sm bg-white p-5 flex items-center justify-between hover:bg-slate-50 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                    <item.icon size={20} />
                  </div>
                  <span className="font-bold text-slate-900">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </Card>
            </Link>
          )
        ))}
      </div>

      {/* Privacy Card */}
      <Card className="rounded-[32px] border-none shadow-sm bg-slate-900 text-white p-8 mb-8">
         <div className="flex items-center gap-3 mb-4">
            <Lock size={18} className="text-cyan-400" />
            <h3 className="font-black uppercase tracking-widest text-sm">Privacy First</h3>
         </div>
         <p className="text-slate-400 text-sm leading-relaxed">
           Your data is encrypted at rest (AES-256) and in transit (TLS 1.3). 
           Chat sessions are anonymous with zero IP logging. 
           Your mental health data is never shared with third parties.
         </p>
      </Card>

      {/* Logout */}
      <Button 
        variant="ghost" 
        onClick={() => auth.signOut()}
        className="w-full h-16 rounded-[2rem] text-rose-500 font-black uppercase tracking-[0.2em] border-2 border-slate-100 hover:bg-rose-50 transition-all active:scale-95 mb-12"
      >
        <LogOut className="mr-3" size={20} />
        Sign Out
      </Button>

      {/* Footer Credits */}
      <div className="flex flex-col items-center justify-center text-center pb-12 opacity-60">
        <div className="h-16 w-16 mb-4 bg-white rounded-2xl flex items-center justify-center shadow-sm p-2 overflow-hidden border border-slate-100">
          <img 
            src="https://upload.wikimedia.org/wikipedia/ms/0/0a/Sekolah-Menengah-Sains-Muzaffar-Syah-Melaka_2.png" 
            alt="School Logo" 
            className="h-full w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Build by: <span className="text-slate-900">SENTINEL TEAM</span></p>
          <p className="text-[9px] font-bold text-slate-400 max-w-[200px] leading-relaxed">
            A product of Muzaffar Syah Science Secondary School's student.
          </p>
          <div className="pt-2">
            <p className="text-[8px] font-medium text-slate-300">
              (c) Copyright Sentinel 2026. All rights reserved.
            </p>
            <p className="text-[8px] font-medium text-slate-300">Version: 1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
