import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Send, Bot, User, Briefcase, Plane, Coffee, ShoppingCart, Phone, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/lib/types';

const scenarios = [
  { id: 'interview', label: 'Job Interview', icon: Briefcase, desc: 'Practice interview Q&A' },
  { id: 'travel', label: 'Travel & Directions', icon: Plane, desc: 'Navigate new places' },
  { id: 'daily', label: 'Daily Conversation', icon: Coffee, desc: 'Everyday small talk' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart, desc: 'Market & store dialogues' },
  { id: 'phone', label: 'Phone Call', icon: Phone, desc: 'Telephone etiquette' },
];

function getScenarioPrompt(scenarioId: string, languageName: string) {
  const base = `Simulate a ${scenarioId.replace('_', ' ')} scenario in ${languageName}. Role-play naturally, correct mistakes, and provide both ${languageName} script and English translation.`;
  return base;
}

export default function Scenarios() {
  const { user } = useAuth();
  const { activeLanguage } = useLanguage();
  const [selectedScenario, setSelectedScenario] = useState<typeof scenarios[0] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const langName = activeLanguage?.name || 'the target language';

  const startScenario = (scenario: typeof scenarios[0]) => {
    setSelectedScenario(scenario);
    setMessages([]);
    sendToAI(scenario, [{ role: 'user', content: `Start the ${scenario.label} scenario. Begin the role-play with the first line in ${langName}.` }]);
  };

  const sendToAI = async (scenario: typeof scenarios[0], msgs: ChatMessage[]) => {
    setIsLoading(true);
    let assistantSoFar = '';
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const systemMsg: ChatMessage = {
        role: 'system',
        content: `You are Native2Global Scenario Practice AI. ${getScenarioPrompt(scenario.id, langName)}\n\nRules:\n- Stay in character\n- Correct grammar mistakes\n- Keep it natural and progressive\n- Use markdown`,
      };
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [systemMsg, ...msgs.slice(-12)], languageName: langName }),
      });
      if (!resp.ok || !resp.body) throw new Error('Failed');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }
      if (user && assistantSoFar) {
        await supabase.from('ai_interactions').insert({
          user_id: user.id, language_id: activeLanguage?.id || null,
          interaction_type: `scenario_${scenario.id}`,
          messages: [...msgs, { role: 'assistant', content: assistantSoFar }] as any,
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally { setIsLoading(false); }
  };

  const sendMessage = () => {
    if (!input.trim() || isLoading || !selectedScenario) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    sendToAI(selectedScenario, allMsgs);
  };

  if (!selectedScenario) {
    return (
      <div className="px-4 pt-8 space-y-6 pb-4">
        <div>
          <h1 className="text-xl font-bold">Real-Life Scenarios</h1>
          <p className="text-sm text-muted-foreground">
            {activeLanguage ? `${activeLanguage.flag_emoji} ${activeLanguage.name} · ` : ''}Practice in realistic situations
          </p>
        </div>
        <div className="space-y-3">
          {scenarios.map((scenario, i) => (
            <motion.div key={scenario.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4 shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => startScenario(scenario)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <scenario.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{scenario.label}</p>
                    <p className="text-xs text-muted-foreground">{scenario.desc}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => setSelectedScenario(null)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <selectedScenario.icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">{selectedScenario.label}</h1>
          <p className="text-[10px] text-muted-foreground">{activeLanguage?.flag_emoji} {activeLanguage?.name}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-primary-foreground" /></div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-md' : 'bg-card shadow-card border border-border rounded-tl-md'}`}>
              {msg.role === 'assistant' ? <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:m-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : <p>{msg.content}</p>}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5"><User className="w-3.5 h-3.5 text-secondary-foreground" /></div>
            )}
          </motion.div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0"><Bot className="w-3.5 h-3.5 text-primary-foreground" /></div>
            <div className="bg-card shadow-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur">
        <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your response..." className="flex-1" disabled={isLoading} />
          <Button type="submit" size="icon" className="bg-gradient-primary" disabled={isLoading || !input.trim()}><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}
