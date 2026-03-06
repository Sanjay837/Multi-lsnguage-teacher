import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Send, Sparkles, Bot, User, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/types';

export default function AiChat() {
  const { user } = useAuth();
  const { activeLanguage } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      const { data, error } = await supabase
        .from('chat_messages').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setMessages(data.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.message })));
      }
      setIsLoadingHistory(false);
    };
    loadHistory();
  }, [user]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({ user_id: user.id, role, message: content });
  };

  const clearHistory = async () => {
    if (!user) return;
    const { error } = await supabase.from('chat_messages').delete().eq('user_id', user.id);
    if (!error) { setMessages([]); toast.success('Chat history cleared'); }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);
    await saveMessage('user', userMsg.content);
    let assistantSoFar = '';

    try {
      const contextMessages = allMessages.slice(-15);
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: contextMessages,
          targetLanguage: activeLanguage?.id || null,
          languageName: activeLanguage?.name || null,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          const errMsg = 'Rate limit reached. Please wait a moment and try again.';
          setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
          await saveMessage('assistant', errMsg);
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
                if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }

      if (assistantSoFar) await saveMessage('assistant', assistantSoFar);
      if (user) {
        await supabase.from('ai_interactions').insert({
          user_id: user.id, language_id: activeLanguage?.id || null,
          interaction_type: 'conversation',
          messages: [...allMessages, { role: 'assistant', content: assistantSoFar }] as any,
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-hero flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Language Tutor</h1>
            <p className="text-[10px] text-muted-foreground">
              {activeLanguage ? `${activeLanguage.flag_emoji} ${activeLanguage.name} · ` : ''}Practice conversations
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={clearHistory}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {isLoadingHistory ? (
          <div className="text-center mt-12">
            <Loader2 className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center mt-12">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Start a conversation!</p>
            <p className="text-xs text-muted-foreground mt-1">Try: "Teach me basic greetings"</p>
          </div>
        ) : null}
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-md' : 'bg-card shadow-card border border-border rounded-tl-md'}`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              ) : <p>{msg.content}</p>}
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
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." className="flex-1" disabled={isLoading} />
          <Button type="submit" size="icon" className="bg-gradient-primary" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
