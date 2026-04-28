import { useState } from 'react';
import { Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import ChatInterface, { Message } from '@/components/ChatInterface';
import { ai, SYSTEM_INSTRUCTION } from '@/lib/gemini';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm CalmSphere AI. I'm here to support your mental wellness. How are you feeling today?",
      sender: 'bot',
      senderName: 'CalmSphere AI',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [redirectDialog, setRedirectDialog] = useState({ open: false, pendingText: '' });

  const classifyTopic = async (text: string): Promise<'MENTAL_HEALTH' | 'GENERAL'> => {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Classify the following user message as 'MENTAL_HEALTH' (feelings, stress, support, coping, wellness) or 'GENERAL' (random facts, math, science, general questions). Reply ONLY with the classification word.
      
      User message: "${text}"`
      });
      
      const classification = result.text.trim().toUpperCase();
      return classification.includes('MENTAL_HEALTH') ? 'MENTAL_HEALTH' : 'GENERAL';
    } catch (error) {
      console.error('Classification error:', error);
      return 'MENTAL_HEALTH'; // Default to normal if check fails
    }
  };

  const handleSendMessage = async (text: string, forceGeneral = false) => {
    if (!forceGeneral) {
      const userMsg: Message = {
        id: Date.now().toString(),
        text,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      
      setIsTyping(true);
      const topic = await classifyTopic(text);
      if (topic === 'GENERAL') {
        setIsTyping(false);
        setRedirectDialog({ open: true, pendingText: text });
        return;
      }
    }

    setIsTyping(true);
    try {
      const isActuallyGeneral = forceGeneral;
      const instruction = isActuallyGeneral 
        ? "You are Gemini, a helpful AI assistant. Provide helpful answers to any questions." 
        : SYSTEM_INSTRUCTION;

      const chat = ai.chats.create({ 
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: instruction 
        },
        history: messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage({ message: text });
      
      let textResponse = result.text || "I'm sorry, I couldn't process that. How else can I help?";
      if (isActuallyGeneral) {
        textResponse = `(By GEMINI)\n\n${textResponse}`;
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: textResponse,
        sender: 'bot',
        senderName: isActuallyGeneral ? 'Gemini AI' : 'CalmSphere AI',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having a bit of trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const proceedWithGeneral = () => {
    const text = redirectDialog.pendingText;
    setRedirectDialog({ open: false, pendingText: '' });
    handleSendMessage(text, true);
  };

  const cancelRedirect = () => {
    setRedirectDialog({ open: false, pendingText: '' });
    const botMsg: Message = {
      id: Date.now().toString(),
      text: "I understand. I'm here if you want to talk about how you're feeling or anything related to your wellness.",
      sender: 'bot',
      senderName: 'CalmSphere AI',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMsg]);
  };

  return (
    <>
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
        title="CalmSphere AI"
        subtitle="Mental Wellness Support"
        icon={<Sparkles size={24} />}
        placeholder="How are you feeling?"
      />

      <Dialog open={redirectDialog.open} onOpenChange={(o) => !o && cancelRedirect()}>
        <DialogContent className="rounded-[32px] border-none bg-white p-8 max-w-[90%] sm:max-w-[400px]">
          <DialogHeader className="items-center text-center">
            <div className="h-16 w-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Redirect Request</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed mt-2">
              Sentinel CalmSphere AI is created specifically for mental health. To continue to <span className="text-cyan-600 font-bold">"{redirectDialog.pendingText}"</span> question, we will direct it to Gemini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button 
              onClick={proceedWithGeneral}
              className="flex-1 h-14 rounded-2xl bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-700 active:scale-95 transition-all"
            >
              Yes, Continue
            </Button>
            <Button 
              variant="ghost"
              onClick={cancelRedirect}
              className="flex-1 h-14 rounded-2xl border-none text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
