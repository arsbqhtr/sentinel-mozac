import { useState, useEffect } from 'react';
import { MessageSquare, ChevronLeft, Lock, Plus, Mail, UserPlus, Search, Users } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  addDoc, 
  setDoc,
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ChatInterface, { Message } from '@/components/ChatInterface';

export default function CounselorChat() {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteId, setInviteId] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [view, setView] = useState<'inbox' | 'team'>('inbox');
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const fetchProfileData = async () => {
      const docSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (docSnap.exists()) {
        const profile = docSnap.data();
        setUserProfile(profile);

        // Fetch school info for report
        const schoolSnap = await getDoc(doc(db, 'schools', profile.schoolId));
        if (schoolSnap.exists()) {
          setSelectedSchool(schoolSnap.data());
        }

        // Fetch counselors for both students and counselors (to see team)
        const qC = query(
          collection(db, 'counselors'),
          where('schoolId', '==', profile.schoolId)
        );
        const unsubscribeC = onSnapshot(qC, (snapshot) => {
          setCounselors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        if (profile.role === 'counselor') {
          // I am a counselor, fetch students who have chatted with me
          const qChats = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', auth.currentUser!.uid)
          );
          const unsubChats = onSnapshot(qChats, async (snapshot) => {
            const chatsData = await Promise.all(snapshot.docs.map(async (chatDoc) => {
              const data = chatDoc.data();
              const studentId = data.participants.find((p: string) => p !== auth.currentUser!.uid);
              if (!studentId) return null;
              const studentSnap = await getDoc(doc(db, 'users', studentId));
              return {
                id: chatDoc.id,
                studentId,
                studentName: studentSnap.exists() ? (studentSnap.data().name || studentSnap.data().email || 'Anonymous Student') : 'Anonymous Student',
                lastMessage: data.lastMessage
              };
            }));
            setActiveChats(chatsData.filter(Boolean));
          });
          return () => { unsubscribeC(); unsubChats(); };
        }
        return unsubscribeC;
      }
    };
    fetchProfileData();
  }, []);

  const activePartner = selectedCounselor || selectedStudent;

  const handleInviteStudent = async () => {
    if (!inviteId.trim() || !auth.currentUser) return;
    setIsInviting(true);
    try {
      const studentSnap = await getDoc(doc(db, 'users', inviteId));
      if (!studentSnap.exists() || studentSnap.data().role !== 'student') {
        toast.error('Student ID not found or invalid');
        return;
      }
      
      const chatId = [auth.currentUser.uid, inviteId].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), {
        participants: [auth.currentUser.uid, inviteId].sort(),
        type: 'counselor',
        updatedAt: serverTimestamp(),
        lastMessage: 'Session started by counselor'
      }, { merge: true });

      toast.success('Counseling session initialized');
      setShowInviteDialog(false);
      setInviteId('');
    } catch (e) {
      toast.error('Failed to initialize session');
    } finally {
      setIsInviting(false);
    }
  };

  useEffect(() => {
    if (!activePartner || !auth.currentUser) {
      setMessages([]);
      return;
    }

    const chatId = userProfile.role === 'student' 
      ? [auth.currentUser.uid, activePartner.id].sort().join('_')
      : activePartner.id; // Corrected: activePartner.id is the chatId for counselors

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          sender: data.senderId === auth.currentUser?.uid ? 'user' : (userProfile.role === 'student' ? 'counselor' : 'peer'),
          senderName: data.senderName || (userProfile.role === 'student' ? 'Counselor' : 'Student'),
          timestamp: data.createdAt?.toDate() || new Date()
        } as Message;
      });
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => unsubscribe();
  }, [activePartner, userProfile]);

  const handleSendMessage = async (text: string) => {
    if (!activePartner || !auth.currentUser) return;

    const chatId = userProfile.role === 'student' 
      ? [auth.currentUser.uid, activePartner.id].sort().join('_')
      : activePartner.id;

    try {
      // 1. Send the message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        senderId: auth.currentUser.uid,
        senderName: userProfile?.name || auth.currentUser.email || 'User',
        createdAt: serverTimestamp()
      });

      // 2. Update chat metadata (participants info if student)
      if (userProfile.role === 'student') {
        const participants = [auth.currentUser.uid, activePartner.id].sort();
        await setDoc(doc(db, 'chats', chatId), {
          participants,
          type: 'counselor',
          lastMessage: text,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'chats', chatId), {
          lastMessage: text,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  const handleReportProblem = () => {
    const counselorEmails = counselors.map(c => c.email).filter(Boolean).join(',');
    if (counselorEmails) {
      const subject = encodeURIComponent(`Sentinel Support Report - ${userProfile?.name || 'User'}`);
      const body = encodeURIComponent(`
Sentinel ID: ${auth.currentUser?.uid}
Institution: ${selectedSchool?.name || 'Unknown'}

Please describe the problem or feedback below:
[ ... ]
      `);
      window.location.href = `mailto:${counselorEmails}?subject=${subject}&body=${body}`;
    } else {
      toast.error('No support emails found for your institution.');
    }
  };

  if (activePartner) {
    const partnerName = userProfile.role === 'student' ? (activePartner.name || activePartner.email || 'Counselor') : activePartner.studentName;
    return (
      <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
        <header className="flex shrink-0 items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedCounselor(null); setSelectedStudent(null); }} className="rounded-2xl bg-slate-50">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="font-black text-slate-900 uppercase tracking-tight leading-none">{partnerName}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-cyan-600">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  {userProfile.role === 'student' ? 'School Counselor' : 'Inbound Request'}
                </span>
              </div>
            </div>
          </div>
          <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 active:scale-90 transition-all">
            <Lock size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatInterface 
            messages={messages}
            onSendMessage={handleSendMessage}
            title={partnerName}
            subtitle={userProfile.role === 'student' ? 'Verified Support' : 'Student Counseling'}
            icon={<MessageSquare size={20} />}
          />
        </div>
      </div>
    );
  }

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
              {userProfile?.role === 'student' ? 'Sentinel Support' : 'Counselor Console'}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-cyan-600">
               <Lock size={12} />
               <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                 {userProfile?.role === 'student' ? 'Official School Counselors' : 'Professional Counseling Active'}
               </span>
            </div>
          </div>
        </div>
        
        {userProfile?.role === 'counselor' && (
          <button 
            onClick={() => setShowInviteDialog(true)}
            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-100 active:scale-90 transition-all"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {userProfile?.role === 'counselor' && (
        <Card className="rounded-[40px] border-none shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Lock size={120} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">My Account Status</p>
          <h2 className="text-2xl font-bold uppercase tracking-tight">{userProfile.name}</h2>
          <div className="flex items-center gap-2 mt-4">
             <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">Active & Verified</div>
             <div className="text-[10px] font-medium opacity-50 uppercase tracking-widest ml-2">ID: {auth.currentUser?.uid.slice(0, 8)}...</div>
          </div>
          
          <div className="flex gap-2 mt-8 relative z-10">
            <button 
              onClick={() => setView('inbox')}
              className={cn(
                "flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest transition-all",
                view === 'inbox' ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              <Mail size={14} /> Inbox
            </button>
            <button 
              onClick={() => setView('team')}
              className={cn(
                "flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest transition-all",
                view === 'team' ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              <Users size={14} /> Team
            </button>
          </div>
        </Card>
      )}

      {/* Main Listing Section */}
      <Card className="rounded-[40px] border-none shadow-sm bg-white p-6 mb-12">
        <div className="flex items-center gap-3 mb-6 px-2">
           {view === 'inbox' ? <Mail size={18} className="text-cyan-600" /> : <Users size={18} className="text-cyan-600" />}
           <h3 className="font-bold text-slate-900">
             {userProfile?.role === 'student' ? 'Reach a School Counselor' : (view === 'inbox' ? 'Active Counseling Inbox' : 'Verified Counselor Team')}
           </h3>
        </div>
        
        <div className="space-y-4">
          {userProfile?.role === 'student' || view === 'team' ? (
            counselors.map((counselor) => (
              <button 
                key={counselor.id}
                onClick={() => userProfile?.role === 'student' ? setSelectedCounselor(counselor) : null}
                className={cn(
                  "w-full flex items-center justify-between p-4 bg-slate-50 rounded-3xl transition-all",
                  userProfile?.role === 'student' ? "hover:bg-slate-100 active:scale-[0.98] cursor-pointer" : "cursor-default"
                )}
              >
                <div className="text-left overflow-hidden">
                  <p className="font-bold text-slate-900 truncate uppercase">{counselor.name || counselor.email || 'Counselor'}</p>
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                    {counselor.id === auth.currentUser?.uid ? 'This is You' : (counselor.email || 'Direct Institution Support')}
                  </p>
                </div>
                <Mail size={16} className="text-cyan-600 shrink-0 ml-4" />
              </button>
            ))
          ) : (
            activeChats.map((chat) => (
              <button 
                key={chat.id}
                onClick={() => setSelectedStudent(chat)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-all active:scale-[0.98]"
              >
                <div className="text-left overflow-hidden">
                  <p className="font-bold text-slate-900 truncate uppercase">{chat.studentName}</p>
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                    {chat.lastMessage || 'Sent a message'}
                  </p>
                </div>
                <MessageSquare size={16} className="text-orange-600 shrink-0 ml-4" />
              </button>
            ))
          )}

          {((userProfile?.role === 'student' && counselors.length === 0) || (userProfile?.role === 'counselor' && view === 'inbox' && activeChats.length === 0)) && (
             <p className="text-center py-4 text-slate-400 text-sm italic">
               {userProfile?.role === 'student' ? 'No counselors found for your school.' : 'Your counseling inbox is empty.'}
             </p>
          )}

          {userProfile?.role === 'student' && (
            <div className="pt-6 border-t border-slate-50">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-3 px-2">Support & Reporting</p>
              <button 
                onClick={handleReportProblem}
                className="w-full flex items-center justify-between p-4 bg-rose-50 border border-rose-100/50 rounded-3xl hover:bg-rose-100 transition-all active:scale-[0.98]"
              >
                <div className="text-left overflow-hidden">
                   <p className="font-bold text-rose-900 truncate uppercase">Report Issue to Sentinel Team</p>
                   <p className="text-xs text-rose-500/70 font-medium truncate mt-0.5">Contact official counselors via email</p>
                </div>
                <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-rose-600 shadow-sm">
                   <Mail size={16} />
                </div>
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Counselor Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="rounded-[40px] border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Initiate Support</DialogTitle>
            <DialogDescription className="font-medium text-slate-400">Search student by their Sentinel ID.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Student Sentinel ID</Label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  value={inviteId} 
                  onChange={(e) => setInviteId(e.target.value)}
                  placeholder="Paste student UID"
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11 focus-visible:ring-cyan-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button 
              onClick={handleInviteStudent}
              disabled={!inviteId.trim() || isInviting}
              className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-100 active:scale-95 transition-all"
            >
              {isInviting ? 'Verifying...' : 'Initialize Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
