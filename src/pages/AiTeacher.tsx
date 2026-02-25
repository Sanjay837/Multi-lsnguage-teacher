import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, GraduationCap, PenTool, BookOpen, Dumbbell, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/types';

type TeacherMode = 'correct' | 'practice' | 'explain';

const modes: { id: TeacherMode; label: string; icon: typeof PenTool; desc: string }[] = [
  { id: 'correct', label: 'Correct', icon: PenTool, desc: 'Fix my grammar' },
  { id: 'practice', label: 'Practice', icon: Dumbbell, desc: 'Generate exercises' },
  { id: 'explain', label: 'Explain', icon: BookOpen, desc: 'Teach grammar rules' },
];

export default function AiTeacher() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<TeacherMode>('correct');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    if (text.length > 2000) {
      toast.error('Text too long (max 2000 characters)');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const TEACHER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher`;
      const resp = await fetch(TEACHER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text,
          mode,
          targetLanguage: profile?.target_language_id || null,
          history: messages.slice(-10),
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error('Rate limit reached. Please wait a moment.');
          setMessages(prev => [...prev, { role: 'assistant', content: 'Rate limit reached. Please wait and try again.' }]);
          setIsLoading(false);
          return;
        }
        if (resp.status === 402) {
          toast.error('Usage limit reached.');
          setMessages(prev => [...prev, { role: 'assistant', content: 'Usage limit reached. Please add credits.' }]);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to get response');
      }

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
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save interaction and grammar correction
      if (user && assistantSoFar) {
        await supabase.from('ai_interactions').insert({
          user_id: user.id,
          language_id: profile?.target_language_id || null,
          interaction_type: `teacher_${mode}`,
          messages: [...allMessages, { role: 'assistant', content: assistantSoFar }] as any,
        });

        if (mode === 'correct') {
          await supabase.from('grammar_corrections').insert({
            user_id: user.id,
            language_id: profile?.target_language_id || null,
            original_text: text,
            corrected_text: assistantSoFar.substring(0, 500),
            grammar_rule: mode,
          } as any);
        }

        await supabase.from('analytics_events').insert({
          user_id: user.id,
          event_type: 'ai_teacher',
          event_data: { mode, message_length: text.length } as any,
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const placeholders: Record<TeacherMode, string> = {
    correct: 'Write a sentence to get it corrected...',
    practice: 'Tell me what topic to practice...',
    explain: 'Ask about a grammar concept...',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-accent flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Teacher</h1>
            <p className="text-[10px] text-muted-foreground">Grammar correction & practice exercises</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2">
          {modes.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setMessages([]); }}
              className={`flex-1 p-2 rounded-xl border-2 text-center transition-all ${
                mode === id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <Icon className={`w-4 h-4 mx-auto mb-0.5 ${mode === id ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-[10px] font-medium">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {mode === 'correct' && 'Write a sentence and I\'ll correct your grammar'}
              {mode === 'practice' && 'Tell me a topic and I\'ll generate exercises'}
              {mode === 'explain' && 'Ask me about any grammar concept'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Explanations in both English & Kannada</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-md'
                : 'bg-card shadow-card border border-border rounded-tl-md'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-secondary-foreground" />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-accent-foreground" />
            </div>
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholders[mode]}
            className="flex-1 min-h-[40px] max-h-[100px] resize-none"
            disabled={isLoading}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button type="submit" size="icon" className="bg-gradient-accent self-end" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
