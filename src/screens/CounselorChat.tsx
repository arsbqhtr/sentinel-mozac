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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
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

  const activePartner = selectedCounselor || selectedStudent;

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const fetchProfileData = async () => {
      const docSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (docSnap.exists()) {
        const profile = docSnap.data();
        setUserProfile(profile);

        if (profile.schoolId) {
          // Fetch school info for report
          try {
            const schoolSnap = await getDoc(doc(db, 'schools', profile.schoolId));
            if (schoolSnap.exists()) {
              setSelectedSchool(schoolSnap.data());
            }
          } catch (e) {
            console.error("Error fetching school:", e);
          }
  
          // Fetch counselors for both students and counselors (to see team)
          const qC = query(
            collection(db, 'counselors'),
            where('schoolId', '==', profile.schoolId)
          );
          const unsubscribeC = onSnapshot(qC, (snapshot) => {
            setCounselors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'counselors'));
  
          // Fetch active chats for this user (student or counselor)
          const qChats = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', auth.currentUser!.uid)
          );

          const unsubChats = onSnapshot(qChats, async (snapshot) => {
            const chatsData = await Promise.all(snapshot.docs.map(async (chatDoc) => {
              const data = chatDoc.data();
              const otherId = data.participants.find((p: string) => p !== auth.currentUser!.uid);
              if (!otherId) return null;

              // Fetch other participant's profile
              const otherSnap = await getDoc(doc(db, profile.role === 'student' ? 'counselors' : 'users', otherId));
              let otherName = 'Support Personnel';
              
              if (otherSnap.exists()) {
                const otherData = otherSnap.data();
                const otherEmail = otherData.email;
                otherName = otherData.name || otherEmail || 'Counselor';
                
                // Specific MOZAC name mapping
                if (otherEmail === 'm-12397660@moe-dl.edu.my') {
                  otherName = 'PN SITI NORIZAIDAH BT RAZALI';
                } else if (otherEmail === 'm-12660742@moe-dl.edu.my') {
                  otherName = 'PN MUNERA';
                } else if (otherEmail === 'm-12472228@moe-dl.edu.my') {
                  otherName = 'PN SITI HAJAR';
                }
              } else if (otherId === 'fallback-mozac') {
                otherName = 'PN SITI NORIZAIDAH BT RAZALI';
              }

              return {
                id: chatDoc.id,
                otherId,
                name: otherName,
                lastMessage: data.lastMessage,
                updatedAt: data.updatedAt
              };
            }));
            setActiveChats(chatsData.filter(Boolean));
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'chats'));

          return () => { unsubscribeC(); unsubChats(); };
        }
      }
    };
    fetchProfileData();
  }, []);

  const [schoolStudents, setSchoolStudents] = useState<any[]>([]);

  useEffect(() => {
    if (userProfile?.role === 'counselor' && userProfile?.schoolId) {
      const q = query(
        collection(db, 'users'),
        where('schoolId', '==', userProfile.schoolId),
        where('role', '==', 'student')
      );
      const unsub = onSnapshot(q, (snap) => {
        setSchoolStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [userProfile]);

  const handleStartSessionWithStudent = async (student: any) => {
    if (!auth.currentUser) return;
    setIsInviting(true);
    try {
      const chatId = [auth.currentUser.uid, student.id].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), {
        participants: [auth.currentUser.uid, student.id].sort(),
        type: 'counselor',
        updatedAt: serverTimestamp(),
        lastMessage: 'Session started by counselor'
      }, { merge: true });

      toast.success(`Counseling session with ${student.name || 'student'} initialized`);
      setShowInviteDialog(false);
      setSelectedStudent({ id: chatId, otherId: student.id, name: student.name || student.email || 'Student' });
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
      ? [auth.currentUser.uid, activePartner.id || activePartner.otherId].sort().join('_')
      : (activePartner.id || activePartner.otherId);

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
  if (!text.trim() || !activePartner || !auth.currentUser) return;

  const partnerId = activePartner.id || activePartner.otherId;
  // PENTING: Sorting ID supaya Pelajar & Kaunselor kongsi "Bilik" yang sama
  const chatId = [auth.currentUser.uid, partnerId].sort().join('_');

  try {
    // A. Hantar mesej ke sub-collection
    const messageData = {
      text: text.trim(),
      senderId: auth.currentUser.uid,
      senderName: userProfile?.name || 'User',
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    // B. Update Metadata Chat (Supaya Inbox nampak chat ni)
    await setDoc(doc(db, 'chats', chatId), {
      participants: [auth.currentUser.uid, partnerId].sort(),
      lastMessage: text.trim(),
      updatedAt: serverTimestamp(),
      lastSenderId: auth.currentUser.uid,
      // Simpan info tambahan supaya senang nak display kat inbox tanpa query banyak kali
      [`name_${auth.currentUser.uid}`]: userProfile?.name || 'User',
      [`name_${partnerId}`]: activePartner.name || 'Counselor',
      type: 'counselor'
    }, { merge: true });

    console.log("Message sent to:", chatId);
  } catch (error) {
    console.error("Error hantar mesej:", error);
    toast.error("Gagal hantar mesej");
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
  const partnerName = activePartner.name || activePartner.studentName || 'Counselor';
  
  // Safety check: Kalau userProfile belum load, kita bagi default role 'student' 
  // atau tunjuk loading supaya tak crash
  const userRole = userProfile?.role || 'student';

  return (
    <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setSelectedCounselor(null); setSelectedStudent(null); }} 
            className="rounded-2xl bg-slate-50"
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="font-black text-slate-900 uppercase tracking-tight leading-none">
              {partnerName}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-cyan-600">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                {/* Gunakan userRole yang dah dicheck tadi */}
                {userRole === 'student' ? 'School Counselor' : 'Inbound Request'}
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
          subtitle={userRole === 'student' ? 'Verified Support' : 'Student Counseling'}
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-[0.8] uppercase">
              Counselor<br/>Console
            </h1>
            <div className="flex items-center gap-1.5 mt-2 text-cyan-600">
               <Lock size={12} strokeWidth={3} />
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                 Professional Counseling Active
               </span>
            </div>
          </div>
        </div>
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

  // Main Listing Section
      {!userProfile?.schoolId && userProfile?.role === 'student' ? (
        <Card className="rounded-[40px] border-none shadow-sm bg-white p-8 mb-12 text-center">
          <div className="h-20 w-20 rounded-[32px] bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-6">
            <UserPlus size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Institution Required</h3>
          <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed px-4">
            To reach your school's official counselors, please verify your institution in your profile.
          </p>
          <Link to="/profile">
            <Button className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-slate-100 active:scale-95 transition-all">
              Verify My School
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="rounded-[40px] border-none shadow-sm bg-white p-6 mb-12">
          <div className="flex items-center gap-3 mb-6 px-2">
            <Mail size={16} className="text-cyan-600" />
            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest">
              {view === 'inbox' ? 'Active Counseling Inbox' : 'Verified Counselor Team'}
            </h3>
          </div>
          
          <div className="space-y-4">
            {/* Section: Recent Conversations (For both Students & Counselors) */}
            {activeChats.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-3 px-2">Recent Conversations</p>
                <div className="space-y-3">
                  {activeChats.map((chat) => (
                    <button 
                      key={chat.id}
                      onClick={() => setSelectedStudent(chat)}
                      className="w-full flex items-center justify-between p-5 bg-cyan-50/50 border border-cyan-100/50 rounded-[30px] hover:bg-cyan-100 transition-all active:scale-[0.98]"
                    >
                      <div className="text-left overflow-hidden">
                        <p className="font-bold text-slate-900 truncate uppercase tracking-tight">{chat.name}</p>
                        <p className="text-xs text-cyan-600 font-medium truncate mt-0.5 opacity-80">
                          {chat.lastMessage || 'Open session'}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-cyan-600 shadow-sm">
                        <MessageSquare size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(userProfile?.role === 'student' || view === 'team') ? (
              <>
                <div className="flex items-center justify-between mb-3 px-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Available Counselors</p>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Official Directory</span>
                  </div>
                </div>

                {counselors.map((counselor) => (
                  <button 
                    key={counselor.id}
                    onClick={() => userProfile?.role === 'student' ? setSelectedCounselor(counselor) : null}
                    className={cn(
                      "w-full flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[32px] transition-all group",
                      userProfile?.role === 'student' ? "hover:shadow-md active:scale-[0.98] cursor-pointer" : "cursor-default"
                    )}
                  >
                    <div className="text-left overflow-hidden">
                      <p className="font-black text-xl text-slate-900 leading-tight uppercase tracking-tight">
                        {counselor.email === 'm-12397660@moe-dl.edu.my' ? 'PN SITI NORIZAIDAH BT RAZALI' : 
                         counselor.email === 'm-12660742@moe-dl.edu.my' ? 'PN MUNERA' :
                         counselor.email === 'm-12472228@moe-dl.edu.my' ? 'PN SITI HAJAR' :
                         (counselor.name || 'Counselor')}
                      </p>
                      <p className="text-[10px] text-cyan-600 font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                         <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {selectedSchool?.name || 'Institutional Support'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 px-4 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Official
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-[#87A2A9] flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-active:scale-90">
                         <MessageSquare size={20} strokeWidth={3} />
                      </div>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="py-8 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                 <p className="text-slate-400 text-sm font-medium italic">Your active cases are listed above in Recent Conversations.</p>
                 <Button variant="ghost" className="mt-4 text-cyan-600 font-black uppercase text-[10px] tracking-widest" onClick={() => setShowInviteDialog(true)}>
                    <Plus size={14} className="mr-2" /> Start New Session
                 </Button>
              </div>
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
      )}


     <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
  <DialogContent className="rounded-[40px] border-none p-8 max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-2xl font-black uppercase tracking-tight">Start Conversation</DialogTitle>
      <DialogDescription className="font-medium text-slate-400">
        Select another counselor from your team at SM SAINS MUZAFFAR SYAH to start a collaboration session.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 mt-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Verified Counselors (3)</p>
      
      <div className="space-y-3">
        {[
          {
            id: 'c1',
            name: 'PN SITI NORIZAIDAH BT RAZALI',
            email: 'm-12397660@moe-dl.edu.my'
          },
          {
            id: 'c2',
            name: 'PN MUNERA',
            email: 'm-12660742@moe-dl.edu.my'
          },
          {
            id: 'c3',
            name: 'PN SITI HAJAR',
            email: 'm-12472228@moe-dl.edu.my'
          }
        ].map((counselor) => (
          <button 
            key={counselor.id}
            onClick={() => handleStartSessionWithStudent(counselor)}
            className="w-full flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-slate-100 transition-all active:scale-[0.98]"
          >
            <div className="text-left overflow-hidden">
              <p className="font-bold text-slate-900 truncate uppercase">
                {counselor.name}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {counselor.email}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-cyan-600 shadow-sm">
              <Plus size={18} />
            </div>
          </button>
        ))}
      </div>
    </div>

    <DialogFooter className="mt-8">
      <Button 
        onClick={() => setShowInviteDialog(false)}
        className="w-full h-14 rounded-2xl bg-slate-100 text-slate-900 font-black uppercase tracking-widest hover:bg-slate-200 shadow-sm active:scale-95 transition-all"
      >
        Close Team Directory
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}
