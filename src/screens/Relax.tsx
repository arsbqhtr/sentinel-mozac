import { useState, useEffect } from 'react';
import { Wind, ChevronLeft, Music, Video, Play, Pause, CloudRain, Waves, Droplet, Sun } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Relax() {
  const [activeTab, setActiveTab] = useState('breathe');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Breathing State
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Ready'>('Ready');
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState<'478' | 'box'>('478');

  useEffect(() => {
    let interval: any;
    if (isActive && activeTab === 'breathe') {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else {
      setPhase('Ready');
      setTimer(0);
      setIsActive(false)
    }
    return () => clearInterval(interval);
  }, [isActive, activeTab]);

  useEffect(() => {
    if (!isActive) return;

    if (mode === '478') {
      if (timer === 0) setPhase('Inhale');
      else if (timer === 4) setPhase('Hold');
      else if (timer === 11) setPhase('Exhale');
      else if (timer === 19) setTimer(0);
    } else {
      const t = timer % 16;
      if (t < 4) setPhase('Inhale');
      else if (t < 8) setPhase('Hold');
      else if (t < 12) setPhase('Exhale');
      else setPhase('Hold');
    }
  }, [timer, isActive, mode]);

  const audioTracks = [
    { name: 'Pure Rain', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Experience (Piano)', icon: Music, color: 'text-indigo-500', bg: 'bg-indigo-50', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: 'Ocean Waves', icon: Waves, color: 'text-cyan-500', bg: 'bg-cyan-50', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  ];

  const videos = [
    { title: 'Experience - Einaudi', author: 'Ludovico Einaudi', id: 'hN_q-_nGv4U', thumbnail: 'https://picsum.photos/seed/piano/800/450' },
    { title: 'Nature Meditation', author: 'Sentinel Zen', id: '6v2L2UGZJAM', thumbnail: 'https://picsum.photos/seed/nature/800/450' },
  ];

  const toggleAudio = (url: string) => {
    if (playingAudio === url) setPlayingAudio(null);
    else setPlayingAudio(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
            Relaxation Hub
          </h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">
            Unwind your mind & body
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
        <TabsList className="bg-white/50 p-1 rounded-2xl border border-slate-100 w-full mb-8">
          <TabsTrigger value="breathe" className="flex-1 rounded-xl py-3 data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            Breathe
          </TabsTrigger>
          <TabsTrigger value="listen" className="flex-1 rounded-xl py-3 data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            Listen
          </TabsTrigger>
          <TabsTrigger value="watch" className="flex-1 rounded-xl py-3 data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            Watch
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breathe" className="mt-0">
          {/* Breathing Mode Selector */}
          <div className="flex bg-white/50 p-1 rounded-2xl border border-slate-100 mb-12">
            <button 
              onClick={() => { setMode('478'); setIsActive(false); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                mode === '478' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
              )}
            >
              4-7-8
            </button>
            <button 
              onClick={() => { setMode('box'); setIsActive(false); }}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                mode === 'box' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
              )}
            >
              Box
            </button>
          </div>

          <div className="text-center mb-12 h-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1"
              >
                <p className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                  {isActive ? phase : 'Ready?'}
                </p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                  {isActive ? 'Continue Session' : 'Start to focus'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative flex items-center justify-center mb-20 pointer-events-none">
            <motion.div 
              animate={isActive ? {
                scale: phase === 'Inhale' ? 1.25 : phase === 'Exhale' ? 1 : 1.15,
                backgroundColor: phase === 'Inhale' ? '#ecfeff' : '#ffffff',
              } : { scale: 1, backgroundColor: '#ffffff' }}
              transition={{ duration: phase === 'Inhale' ? 4 : phase === 'Hold' ? 7 : 8, ease: "easeInOut" }}
              className={cn(
                "h-64 w-64 rounded-full border-2 border-slate-100 bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center transition-all duration-300",
                isActive && "border-cyan-200"
              )}
            >
               <div className="text-center">
                 {isActive && (
                   <p className="text-6xl font-black text-cyan-600">
                     {mode === '478' 
                        ? (phase === 'Inhale' ? 4-timer : phase === 'Hold' ? 11-timer : 19-timer) 
                        : (4 - (timer % 4))}
                   </p>
                 )}
                 {!isActive && <Wind size={48} className="text-slate-200" />}
               </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-center gap-6">
            <Button 
              size="lg"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "h-16 px-16 rounded-[2rem] text-lg font-black uppercase tracking-[0.2em] transition-all",
                isActive ? "bg-slate-900 text-white" : "bg-cyan-600 text-white shadow-lg shadow-cyan-100 active:scale-95"
              )}
            >
              {isActive ? 'Stop' : 'Begin'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="listen" className="mt-0 space-y-4">
          {playingAudio && (
            <Card className="p-6 rounded-[2rem] bg-slate-900 text-white mb-6 animate-in slide-in-from-top duration-300">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="animate-pulse h-2 w-2 rounded-full bg-cyan-400" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Now Streaming</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPlayingAudio(null)} className="h-8 w-8 rounded-full text-white/50 hover:text-white">
                    <Pause size={16} />
                  </Button>
               </div>
               <audio autoPlay loop src={playingAudio} className="w-full h-8 opacity-50" controls />
            </Card>
          )}
          <div className="grid grid-cols-1 gap-4">
            {audioTracks.map((track) => (
              <Card 
                key={track.name} 
                onClick={() => toggleAudio(track.url)}
                className={cn(
                  "p-5 rounded-[2rem] border-none shadow-sm flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group",
                  playingAudio === track.url ? "bg-cyan-50 border border-cyan-100" : "bg-white"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", track.bg, track.color)}>
                    <track.icon size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{track.name}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">High Quality Audio</p>
                  </div>
                </div>
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                  playingAudio === track.url ? "bg-cyan-600 text-white" : "bg-slate-900 text-white opacity-0 group-hover:opacity-100"
                )}>
                  {playingAudio === track.url ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="watch" className="mt-0 space-y-6">
          <AnimatePresence>
            {selectedVideo && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="rounded-[40px] overflow-hidden border-none shadow-xl mb-8">
                  <div className="aspect-video">
                    <iframe 
                       width="100%" 
                       height="100%" 
                       src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                       title="YouTube video player" 
                       frameBorder="0" 
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                       allowFullScreen
                       referrerPolicy="no-referrer"
                    ></iframe>
                  </div>
                  <div className="p-4 bg-slate-900 flex items-center justify-between">
                     <p className="text-white text-[10px] font-black uppercase tracking-widest ml-2">Secure Stream Passive</p>
                     <Button variant="ghost" size="sm" onClick={() => setSelectedVideo(null)} className="text-white/50 hover:text-white">Close Player</Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {videos.map((vid) => (
            <Card 
              key={vid.title} 
              onClick={() => setSelectedVideo(vid.id)}
              className="rounded-[40px] overflow-hidden border-none shadow-sm bg-white group cursor-pointer"
            >
              <div className="aspect-video relative bg-slate-200 overflow-hidden">
                <img 
                  src={vid.thumbnail} 
                  alt={vid.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Play size={32} fill="currentColor" />
                  </div>
                </div>
                {selectedVideo === vid.id && (
                  <div className="absolute top-6 right-6 bg-cyan-600 text-white py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Active
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Yoga & Mindfulness</p>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{vid.title}</h3>
                <p className="text-sm text-slate-400 font-medium mt-1">{vid.author}</p>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
