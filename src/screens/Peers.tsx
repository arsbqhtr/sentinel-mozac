import { useState, useEffect } from 'react';
import { Users, Lock, Globe, ChevronLeft, Plus, Hash, KeyRound, MessageSquare, ArrowRight } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  getDoc,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, ShieldAlert, Trash2, UserMinus, Settings, LogOut, CheckCircle } from 'lucide-react';
import ChatInterface, { Message } from '@/components/ChatInterface';
import { toast } from 'sonner';

export default function Peers() {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinPrivateDialog, setShowJoinPrivateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingEmoji, setEditingEmoji] = useState('');

  const [newChannel, setNewChannel] = useState({ name: '', type: 'public', password: '', description: '', emoji: '💬' });
  const [joinPrivate, setJoinPrivate] = useState({ name: '', password: '' });

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;
    
    // 1. Listen for user profile to get schoolId
    const profileUnsubscribe = onSnapshot(doc(db, 'users', currentUserId), (snapshot) => {
      const profile = snapshot.data();
      setUserProfile(profile);

      if (profile?.schoolId) {
        // 2. Once we have schoolId, listen for channels
        const q = query(
          collection(db, 'channels'), 
          where('schoolId', '==', profile.schoolId)
        );
        
        const channelsUnsubscribe = onSnapshot(q, (snapshot) => {
          const allChannels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Filter: Public OR Private (if I am a member/owner)
          const visibleChannels = allChannels.filter((c: any) => 
            c.type === 'public' || 
            c.ownerId === currentUserId || 
            (c.members && c.members.includes(currentUserId))
          );
          setChannels(visibleChannels);
          
          // Update selected channel data if it exists in the new list
          if (selectedChannel) {
            const updated = visibleChannels.find(c => c.id === selectedChannel.id);
            if (updated) setSelectedChannel(updated);
            else setSelectedChannel(null); // Kicked or deleted
          }
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'channels'));

        return () => channelsUnsubscribe();
      }
    });

    return () => profileUnsubscribe();
  }, [selectedChannel?.id]);

  useEffect(() => {
    if (!selectedChannel) {
      setMessages([]);
      setChannelMembers([]);
      return;
    }

    const qMsg = query(
      collection(db, 'channels', selectedChannel.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMsg = onSnapshot(qMsg, (snapshot) => {
      setMessages(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          sender: data.senderId === currentUserId ? 'user' : 'peer',
          senderName: data.senderName || 'Anonymous Peer',
          timestamp: data.createdAt?.toDate() || new Date()
        } as Message;
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `channels/${selectedChannel.id}/messages`));

    // Fetch member details if in settings
    if (showSettingsDialog && selectedChannel) {
      setEditingName(selectedChannel.name || '');
      setEditingDescription(selectedChannel.description || '');
      setEditingEmoji(selectedChannel.emoji || '💬');

      if (selectedChannel.members) {
        const fetchMembers = async () => {
          const memberData = [];
          for (const uid of selectedChannel.members) {
            try {
              const uSnap = await getDoc(doc(db, 'users', uid));
              if (uSnap.exists()) {
                memberData.push({ id: uid, ...uSnap.data() });
              }
            } catch (e) {
              console.error('Error fetching member:', uid, e);
            }
          }
          setChannelMembers(memberData);
        };
        fetchMembers();
      }
    }

    return () => unsubscribeMsg();
  }, [selectedChannel?.id, showSettingsDialog]);

  const handleCreateChannel = async () => {
    if (!newChannel.name || !currentUserId) return;
    
    let currentSchoolId = userProfile?.schoolId;
    if (!currentSchoolId) {
      const snap = await getDoc(doc(db, 'users', currentUserId));
      currentSchoolId = snap.data()?.schoolId;
    }

    if (!currentSchoolId) {
      toast.error('Could not identify your institution.');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'channels'), {
        ...newChannel,
        schoolId: currentSchoolId,
        ownerId: currentUserId,
        admins: [],
        members: [currentUserId],
        createdAt: serverTimestamp()
      });
      toast.success(`Channel #${newChannel.name} initialized!`);
      setShowCreateDialog(false);
      setNewChannel({ name: '', type: 'public', password: '', description: '', emoji: '💬' });
      setSelectedChannel({ id: docRef.id, ...newChannel, ownerId: currentUserId, members: [currentUserId], admins: [] });
    } catch (e) {
      toast.error('Protocol failed to establish channel');
      handleFirestoreError(e, OperationType.CREATE, 'channels');
    }
  };

  const handleJoinPrivate = async () => {
    if (!currentUserId) return;
    try {
      const q = query(
        collection(db, 'channels'), 
        where('name', '==', joinPrivate.name),
        where('type', '==', 'private'),
        where('password', '==', joinPrivate.password)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const chanDoc = snap.docs[0];
        const chanId = chanDoc.id;
        
        await updateDoc(doc(db, 'channels', chanId), {
          members: arrayUnion(currentUserId)
        });

        const data = chanDoc.data();
        setSelectedChannel({ id: chanId, ...data, members: [...(data.members || []), currentUserId] });
        setShowJoinPrivateDialog(false);
        setJoinPrivate({ name: '', password: '' });
        toast.success('Joined private hub!');
      } else {
        toast.error('Invalid channel name or password');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'channels');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedChannel || !currentUserId) return;
    try {
      await addDoc(collection(db, 'channels', selectedChannel.id, 'messages'), {
        text,
        senderId: currentUserId,
        senderName: userProfile?.name || auth.currentUser?.email || 'Anonymous Peer',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      toast.error('Failed to send message');
      handleFirestoreError(e, OperationType.CREATE, `channels/${selectedChannel.id}/messages`);
    }
  };

  const leaveChannel = async () => {
    if (!selectedChannel || !currentUserId) return;
    try {
      if (selectedChannel.ownerId === currentUserId) {
        toast.error('Owner cannot leave.');
        return;
      }
      await updateDoc(doc(db, 'channels', selectedChannel.id), {
        members: arrayRemove(currentUserId),
        admins: arrayRemove(currentUserId)
      });
      setSelectedChannel(null);
      setShowSettingsDialog(false);
      toast.success('Left the channel');
    } catch (e) {
      toast.error('Failed to leave');
    }
  };

  const deleteChannel = async () => {
    if (!selectedChannel || selectedChannel.ownerId !== currentUserId) return;
    if (!confirm('Are you sure you want to PERMANENTLY delete this channel?')) return;
    try {
      await deleteDoc(doc(db, 'channels', selectedChannel.id));
      setSelectedChannel(null);
      setShowSettingsDialog(false);
      toast.success('Channel deleted');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const kickMember = async (uid: string) => {
    if (!selectedChannel || uid === selectedChannel.ownerId) return;
    const isOwner = selectedChannel.ownerId === currentUserId;
    const isAdmin = (selectedChannel.admins || []).includes(currentUserId);
    if (!isOwner && !isAdmin) return;

    try {
      await updateDoc(doc(db, 'channels', selectedChannel.id), {
        members: arrayRemove(uid),
        admins: arrayRemove(uid)
      });
      setChannelMembers(prev => prev.filter(m => m.id !== uid));
      toast.success('Member removed');
    } catch (e) {
      toast.error('Failed to kick');
    }
  };

  const promoteToAdmin = async (uid: string) => {
    if (!selectedChannel || selectedChannel.ownerId !== currentUserId) return;
    try {
      await updateDoc(doc(db, 'channels', selectedChannel.id), {
        admins: arrayUnion(uid)
      });
      toast.success('Promoted to Admin');
    } catch (e) {
      toast.error('Promotion failed');
    }
  };

  const updateSettings = async () => {
    if (!selectedChannel || !isOwner || !editingName) return;
    try {
      await updateDoc(doc(db, 'channels', selectedChannel.id), {
        name: editingName,
        description: editingDescription,
        emoji: editingEmoji || '💬'
      });
      toast.success('Hub details updated');
    } catch (e) {
      toast.error('Failed to update details');
    }
  };

  const isOwner = selectedChannel?.ownerId === currentUserId;
  const isAdmin = (selectedChannel?.admins || []).includes(currentUserId);
  const canManage = isOwner || isAdmin;

  if (selectedChannel) {
    return (
      <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
        <header className="flex shrink-0 items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 z-10">
          <div 
            className="flex items-center gap-4 cursor-pointer group active:opacity-70 transition-all"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); setSelectedChannel(null); }} 
              className="rounded-2xl bg-slate-50"
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
              {selectedChannel.emoji || '💬'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-slate-900 uppercase tracking-tight leading-none">#{selectedChannel.name}</h1>
                {isOwner && <Shield size={12} className="text-cyan-600" />}
                {isAdmin && <ShieldAlert size={12} className="text-amber-600" />}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-cyan-600">
                <Lock size={10} />
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Hub Details • Info</span>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSettingsDialog(true)}
            className="rounded-xl h-10 w-10 text-slate-400 hover:text-slate-600"
          >
            <Settings size={20} />
          </Button>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatInterface 
            messages={messages}
            onSendMessage={handleSendMessage}
            title={selectedChannel.name}
            subtitle={isOwner ? "Hub Owner" : isAdmin ? "Hub Admin" : "Community Member"}
            icon={<Hash size={20} />}
          />
        </div>

        {/* Info & Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="rounded-[40px] border-none p-0 overflow-hidden max-w-sm">
            <div className="bg-slate-900 p-8 text-white relative">
               <div className="absolute top-4 right-4 text-[40px] opacity-20 select-none">
                 {selectedChannel.emoji || '💬'}
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Hub Information</p>
               <h2 className="text-3xl font-black uppercase tracking-tight">#{selectedChannel.name}</h2>
               <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
                 <div className="bg-white/10 px-3 py-1 rounded-full border border-white/5 uppercase">
                   {selectedChannel.type} HUB
                 </div>
                 <div className="opacity-40 uppercase tracking-widest">
                   Est. {selectedChannel.createdAt?.toDate ? selectedChannel.createdAt.toDate().toLocaleDateString() : 'Recently'}
                 </div>
               </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Identity Section */}
              <div className="space-y-4">
                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Hub Description & Identity</Label>
                {isOwner ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                       <Input 
                         value={editingEmoji}
                         onChange={(e) => setEditingEmoji(e.target.value)}
                         placeholder="Icon"
                         className="h-12 w-16 text-center text-lg rounded-xl border-slate-100 bg-slate-50"
                       />
                       <Input 
                         value={editingName}
                         onChange={(e) => setEditingName(e.target.value)}
                         className="h-12 flex-1 rounded-xl border-slate-100 bg-slate-50 font-bold"
                       />
                    </div>
                    <textarea 
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      placeholder="Hub purpose description..."
                      className="w-full min-h-[80px] rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                    />
                    <Button 
                      onClick={updateSettings}
                      disabled={editingName === selectedChannel.name && editingDescription === selectedChannel.description && editingEmoji === selectedChannel.emoji}
                      className="w-full h-12 rounded-xl bg-cyan-600 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-cyan-100"
                    >
                      Update Hub Identity
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 italic text-slate-500 text-xs leading-relaxed">
                    {selectedChannel.description || 'This hub has no written description yet.'}
                  </div>
                )}
              </div>

              {/* Members Section */}
              <div className="space-y-3">
                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Community ({selectedChannel.members?.length || 0})</Label>
                <ScrollArea className="h-40 rounded-2xl border border-slate-100 p-2">
                  <div className="space-y-1">
                    {channelMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{member.name || member.email || 'Anonymous Peer'}</span>
                          <span className="text-[10px] text-slate-400">
                            {member.id === selectedChannel.ownerId ? 'Founder' : 
                             (selectedChannel.admins || []).includes(member.id) ? 'Admin' : 'Member'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {isOwner && member.id !== currentUserId && !(selectedChannel.admins || []).includes(member.id) && (
                            <Button size="icon" variant="ghost" onClick={() => promoteToAdmin(member.id)} className="h-8 w-8 text-cyan-600">
                              <Shield size={14} />
                            </Button>
                          )}
                          {canManage && member.id !== selectedChannel.ownerId && member.id !== currentUserId && (
                            <Button size="icon" variant="ghost" onClick={() => kickMember(member.id)} className="h-8 w-8 text-rose-500">
                              <UserMinus size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                {!isOwner && (
                  <Button 
                    variant="outline" 
                    onClick={leaveChannel}
                    className="w-full h-12 rounded-2xl border-slate-100 text-rose-500 font-bold flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-100"
                  >
                    <LogOut size={16} />
                    Leave Hub
                  </Button>
                )}
                {isOwner && (
                  <Button 
                    variant="outline" 
                    onClick={deleteChannel}
                    className="w-full h-12 rounded-2xl border-slate-100 text-rose-600 font-bold flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-100"
                  >
                    <Trash2 size={16} />
                    Decommission Hub
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
              Peer Hub
            </h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">
              Connect with your community
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreateDialog(true)}
          className="h-12 w-12 flex items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-100 active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Hub Types Selector */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-5 rounded-[2rem] border-none shadow-sm bg-white flex flex-col gap-3 hover:bg-slate-50 transition-all cursor-pointer border-2 border-transparent hover:border-cyan-100">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Globe size={20} />
          </div>
          <div>
            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Public</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Global Channels</p>
          </div>
        </Card>
        <Card 
          onClick={() => setShowJoinPrivateDialog(true)}
          className="p-5 rounded-[2rem] border-none shadow-sm bg-white flex flex-col gap-3 hover:bg-slate-50 transition-all cursor-pointer border-2 border-transparent hover:border-orange-100"
        >
          <div className="h-10 w-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Join Private</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Password Required</p>
          </div>
        </Card>
      </div>

      {/* Channel List */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1 mb-2">Available Channels</h2>
        {channels.map((channel) => (
          <Card 
            key={channel.id} 
            onClick={() => setSelectedChannel(channel)}
            className="rounded-[2.5rem] border-none shadow-sm bg-white p-6 flex items-center justify-between group hover:bg-slate-50 transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-[1.25rem] bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-cyan-50 group-hover:text-cyan-600 text-2xl transition-colors">
                {channel.emoji || '💬'}
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900 uppercase tracking-tight">{channel.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{channel.members?.length || 0} Members</p>
                </div>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
               <ArrowRight size={18} />
            </div>
          </Card>
        ))}

        {channels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
             <MessageSquare size={48} className="mb-4" />
             <p className="font-bold uppercase tracking-widest text-xs">No public channels found</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-[40px] border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Create Channel</DialogTitle>
            <DialogDescription className="font-medium text-slate-400">Start a new community space.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Name & Identity</Label>
              <div className="flex gap-2">
                 <Input 
                   value={newChannel.emoji} 
                   onChange={(e) => setNewChannel({...newChannel, emoji: e.target.value})}
                   placeholder="💬"
                   className="h-14 w-16 text-center text-lg rounded-2xl border-slate-100 bg-slate-50"
                 />
                 <Input 
                   value={newChannel.name} 
                   onChange={(e) => setNewChannel({...newChannel, name: e.target.value})}
                   placeholder="Hub Name"
                   className="h-14 flex-1 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-cyan-500"
                 />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">About</Label>
              <textarea 
                value={newChannel.description}
                onChange={(e) => setNewChannel({...newChannel, description: e.target.value})}
                placeholder="What is this hub for?"
                className="w-full min-h-[100px] rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Privacy Type</Label>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setNewChannel({...newChannel, type: 'public'})}
                  className={cn("flex-1 h-14 rounded-2xl border-2", newChannel.type === 'public' ? "border-cyan-600 bg-cyan-50 text-cyan-600 font-bold" : "border-slate-50 text-slate-400")}
                >
                  Public
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setNewChannel({...newChannel, type: 'private'})}
                  className={cn("flex-1 h-14 rounded-2xl border-2", newChannel.type === 'private' ? "border-orange-600 bg-orange-50 text-orange-600 font-bold" : "border-slate-50 text-slate-400")}
                >
                  Private
                </Button>
              </div>
            </div>
            {newChannel.type === 'private' && (
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Access Password</Label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input 
                    type="password"
                    value={newChannel.password} 
                    onChange={(e) => setNewChannel({...newChannel, password: e.target.value})}
                    placeholder="Domain Password"
                    className="h-14 rounded-2xl border-slate-100 bg-slate-50 pl-11 focus-visible:ring-orange-500"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-8">
            <Button 
              onClick={handleCreateChannel}
              className="w-full h-16 rounded-[2rem] bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-700 shadow-xl shadow-cyan-100"
              disabled={!newChannel.name || (newChannel.type === 'private' && !newChannel.password)}
            >
              Initialize Hub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Private Dialog */}
      <Dialog open={showJoinPrivateDialog} onOpenChange={setShowJoinPrivateDialog}>
        <DialogContent className="rounded-[40px] border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Enter Private Hub</DialogTitle>
            <DialogDescription className="font-medium text-slate-400">Restricted access required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Channel Name</Label>
              <Input 
                value={joinPrivate.name} 
                onChange={(e) => setJoinPrivate({...joinPrivate, name: e.target.value})}
                placeholder="Domain Name"
                className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-cyan-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Access Password</Label>
              <Input 
                type="password"
                value={joinPrivate.password} 
                onChange={(e) => setJoinPrivate({...joinPrivate, password: e.target.value})}
                placeholder="Password"
                className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-orange-500"
              />
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button 
              onClick={handleJoinPrivate}
              className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-widest active:scale-95 transition-all"
              disabled={!joinPrivate.name || !joinPrivate.password}
            >
              Verify & Enter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fixed import of doc
