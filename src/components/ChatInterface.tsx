import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'counselor' | 'peer';
  senderName?: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isTyping?: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  placeholder?: string;
  onBack?: () => void;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isTyping,
  placeholder = "Type a message...",
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-8" ref={scrollRef}>
        <div className="space-y-6 max-w-2xl mx-auto">
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex w-full gap-3",
                msg.sender === 'user' ? "flex-row-reverse text-right" : "flex-row text-left"
              )}
            >
              <div className={cn(
                "shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white",
                msg.sender === 'user' ? "bg-slate-300" : (msg.sender === 'bot' ? "bg-cyan-600" : "bg-indigo-600")
              )}>
                {msg.sender === 'bot' ? <SparkleIcon size={16} /> : <UserRound size={16} />}
              </div>
              <div
                className={cn(
                  "max-w-[85%] rounded-[24px] px-5 py-3 text-sm shadow-sm",
                  msg.sender === 'user'
                    ? "bg-cyan-600 text-white rounded-tr-none"
                    : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                )}
              >
                {msg.sender !== 'user' && msg.senderName && (
                  <div className="text-[10px] font-black uppercase tracking-widest text-cyan-600 mb-1 opacity-70">
                    {msg.senderName}
                  </div>
                )}
                {msg.text}
                <div className={cn(
                  "mt-1 text-[9px] font-bold uppercase tracking-wider opacity-60",
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center text-white">
                <SparkleIcon size={16} />
              </div>
              <div className="flex items-center gap-1.5 rounded-[24px] bg-white border border-slate-100 px-5 py-3 shadow-sm">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400"></div>
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.2s]"></div>
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 pb-safe">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="h-14 rounded-[28px] border-none bg-slate-100 px-6 focus-visible:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-14 w-14 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-100 disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-90"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

function SparkleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="m5 3 1 1"/>
      <path d="m19 3-1 1"/>
      <path d="m5 21 1-1"/>
      <path d="m19 21-1-1"/>
    </svg>
  );
}
