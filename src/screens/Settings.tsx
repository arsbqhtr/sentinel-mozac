import { useState } from 'react';
import { ChevronLeft, Moon, Sun, Globe, Lock, Smartphone, Info, ChevronRight, LogOut, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { auth } from '@/lib/firebase';

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Malay'>('English');

  const settingsItems = [
    { label: 'Notifications', icon: Info, value: 'Enabled' },
    { label: 'Cloud Backup', icon: Smartphone, value: 'Auto' },
    { label: 'Data Security', icon: Lock, value: 'Strict' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/profile" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
          Settings
        </h1>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <section className="space-y-4">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Appearance</h2>
           <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                       {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                       <p className="font-bold text-slate-900">Dark Mode</p>
                       <p className="text-xs text-slate-400">Reduce eye strain</p>
                    </div>
                 </div>
                 <Switch checked={darkMode} onCheckedChange={setDarkMode} className="data-[state=checked]:bg-cyan-600" />
              </div>
           </Card>
        </section>

        {/* Region Section */}
        <section className="space-y-4">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Localization</h2>
           <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
              <div className="flex flex-col gap-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                          <Globe size={20} />
                       </div>
                       <div>
                          <p className="font-bold text-slate-900">Language</p>
                          <p className="text-xs text-slate-400">Current: {language}</p>
                       </div>
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                       <button 
                         onClick={() => setLanguage('English')}
                         className={cn("px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", language === 'English' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400")}
                       >
                         EN
                       </button>
                       <button 
                         onClick={() => setLanguage('Malay')}
                         className={cn("px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", language === 'Malay' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400")}
                       >
                         MY
                       </button>
                    </div>
                 </div>
              </div>
           </Card>
        </section>

        {/* Other Section */}
        <section className="space-y-3">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Configuration</h2>
           {settingsItems.map((item) => (
             <Card key={item.label} className="rounded-3xl border-none shadow-sm bg-white p-5 flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:text-cyan-600 group-hover:bg-cyan-50 transition-colors">
                    <item.icon size={20} />
                  </div>
                  <p className="font-bold text-slate-900">{item.label}</p>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{item.value}</span>
                   <ChevronRight size={16} className="text-slate-200" />
                </div>
             </Card>
           ))}
        </section>

        {/* Footer */}
        <div className="pt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-rose-500 font-black uppercase tracking-[0.2em] text-[10px] mb-8">
               <Heart size={14} fill="currentColor" />
               Built for Students
            </div>
            <Button 
               variant="ghost" 
               onClick={() => auth.signOut()}
               className="w-full h-16 rounded-[2rem] text-slate-400 font-bold border-2 border-slate-100 hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
               <LogOut size={20} className="mr-3" />
               Sign Out Securely
            </Button>
            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-8">Sentinel Version 2.0.4 - Catalyst Update</p>
        </div>
      </div>
    </div>
  );
}
