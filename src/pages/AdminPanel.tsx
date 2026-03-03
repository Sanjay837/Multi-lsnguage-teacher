import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Globe, BookOpen, Trash2, Save, Languages } from 'lucide-react';

interface LanguageRow {
  id: string;
  name: string;
  native_name: string;
  code: string;
  flag_emoji: string | null;
  is_active: boolean | null;
  is_rtl: boolean;
}

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  language_id: string;
  category: string;
  lesson_type: string;
  difficulty_level: number | null;
  is_published: boolean | null;
  order_index: number | null;
  content: any;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('languages');

  // Languages
  const { data: languages } = useQuery({
    queryKey: ['admin-languages'],
    queryFn: async () => {
      const { data } = await supabase.from('languages').select('*').order('name');
      return (data || []) as unknown as LanguageRow[];
    },
  });

  // Lessons
  const { data: lessons } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: async () => {
      const { data } = await supabase.from('lessons').select('*').order('order_index');
      return (data || []) as unknown as LessonRow[];
    },
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">📋 Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage languages, lessons & content</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="languages"><Globe className="w-4 h-4 mr-1" /> Languages</TabsTrigger>
          <TabsTrigger value="lessons"><BookOpen className="w-4 h-4 mr-1" /> Lessons</TabsTrigger>
        </TabsList>

        <TabsContent value="languages" className="mt-4 space-y-3">
          <LanguageManager languages={languages || []} />
        </TabsContent>

        <TabsContent value="lessons" className="mt-4 space-y-3">
          <LessonManager lessons={lessons || []} languages={languages || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Language Manager ---
function LanguageManager({ languages }: { languages: LanguageRow[] }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', native_name: '', code: '', flag_emoji: '🌐', is_rtl: false });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('languages').insert({
        name: form.name,
        native_name: form.native_name,
        code: form.code,
        flag_emoji: form.flag_emoji,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-languages'] });
      toast.success('Language added!');
      setShowAdd(false);
      setForm({ name: '', native_name: '', code: '', flag_emoji: '🌐', is_rtl: false });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('languages').update({ is_active: active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-languages'] }),
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{languages.length} languages configured</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Language</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Language</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Language name (e.g. Spanish)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Native name (e.g. Español)" value={form.native_name} onChange={e => setForm(p => ({ ...p, native_name: e.target.value }))} />
              <Input placeholder="Language code (e.g. es)" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
              <Input placeholder="Flag emoji (e.g. 🇪🇸)" value={form.flag_emoji} onChange={e => setForm(p => ({ ...p, flag_emoji: e.target.value }))} />
              <div className="flex items-center gap-2">
                <Switch checked={form.is_rtl} onCheckedChange={v => setForm(p => ({ ...p, is_rtl: v }))} />
                <span className="text-sm">Right-to-Left (RTL)</span>
              </div>
              <Button className="w-full" onClick={() => addMutation.mutate()} disabled={!form.name || !form.code || addMutation.isPending}>
                <Save className="w-4 h-4 mr-1" /> Save Language
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {languages.map((lang, i) => (
        <motion.div key={lang.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag_emoji}</span>
              <div>
                <p className="font-medium text-sm">{lang.name} <span className="text-muted-foreground">({lang.native_name})</span></p>
                <div className="flex gap-1 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">{lang.code}</Badge>
                  {lang.is_rtl && <Badge variant="outline" className="text-[10px]">RTL</Badge>}
                </div>
              </div>
            </div>
            <Switch
              checked={lang.is_active ?? true}
              onCheckedChange={(v) => toggleActive.mutate({ id: lang.id, active: v })}
            />
          </Card>
        </motion.div>
      ))}
    </>
  );
}

// --- Lesson Manager ---
function LessonManager({ lessons, languages }: { lessons: LessonRow[]; languages: LanguageRow[] }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', language_id: '', category: 'vocabulary',
    lesson_type: 'vocabulary', difficulty_level: 1, content: '{"words":[]}',
  });

  const langName = (id: string) => languages.find(l => l.id === id)?.name || id;

  const addMutation = useMutation({
    mutationFn: async () => {
      let parsedContent: any;
      try { parsedContent = JSON.parse(form.content); } catch { throw new Error('Invalid JSON in content'); }
      const { error } = await supabase.from('lessons').insert({
        title: form.title,
        description: form.description,
        language_id: form.language_id,
        category: form.category,
        lesson_type: form.lesson_type,
        difficulty_level: form.difficulty_level,
        content: parsedContent,
        order_index: lessons.length,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast.success('Lesson created!');
      setShowAdd(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from('lessons').update({ is_published: published } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-lessons'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
      toast.success('Lesson deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{lessons.length} lessons</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lesson</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Lesson</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Lesson title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <Input placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.language_id}
                onChange={e => setForm(p => ({ ...p, language_id: e.target.value }))}
              >
                <option value="">Select language</option>
                {languages.filter(l => l.is_active).map(l => (
                  <option key={l.id} value={l.id}>{l.flag_emoji} {l.name}</option>
                ))}
              </select>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              >
                {['vocabulary', 'grammar', 'conversation', 'professional', 'scenarios'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-sm">Difficulty:</span>
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${form.difficulty_level === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                    onClick={() => setForm(p => ({ ...p, difficulty_level: d }))}
                  >{d}</button>
                ))}
              </div>
              <Textarea
                placeholder='{"words": [{"word": "hello", "translation": "hola", "pronunciation": "oh-la"}]}'
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                rows={6}
                className="font-mono text-xs"
              />
              <Button className="w-full" onClick={() => addMutation.mutate()} disabled={!form.title || !form.language_id || addMutation.isPending}>
                <Save className="w-4 h-4 mr-1" /> Create Lesson
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {lessons.map((lesson, i) => (
        <motion.div key={lesson.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{lesson.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{langName(lesson.language_id)}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{lesson.category}</Badge>
                  <Badge variant="outline" className="text-[10px]">Lv.{lesson.difficulty_level}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={lesson.is_published ?? true}
                  onCheckedChange={(v) => togglePublish.mutate({ id: lesson.id, published: v })}
                />
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => {
                  if (confirm('Delete this lesson?')) deleteMutation.mutate(lesson.id);
                }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </>
  );
}
