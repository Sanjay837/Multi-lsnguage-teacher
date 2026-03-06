import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Flame, Star, ArrowRight, Sparkles, GraduationCap, MessageSquare, Dumbbell, Briefcase, Layers, Mic, Theater, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Lesson, UserProgress } from '@/lib/types';

const categoryIcons: Record<string, typeof BookOpen> = {
  vocabulary: BookOpen,
  conversation: MessageSquare,
  grammar: Dumbbell,
  professional: Briefcase,
};

export default function Home() {
  const { profile } = useAuth();
  const { activeLanguage } = useLanguage();
  const navigate = useNavigate();

  const langId = activeLanguage?.id;

  const { data: lessons } = useQuery({
    queryKey: ['lessons', langId],
    queryFn: async () => {
      if (!langId) return [];
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .or(`language_id.eq.${langId},language_to_id.eq.${langId}`)
        .eq('is_published', true)
        .order('order_index');
      return (data || []) as unknown as Lesson[];
    },
    enabled: !!langId,
  });

  const { data: progress } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data } = await supabase.from('user_progress').select('*');
      return (data || []) as unknown as UserProgress[];
    },
  });

  const completedCount = progress?.filter(p => p.completed).length || 0;
  const totalLessons = lessons?.length || 1;
  const progressPercent = Math.round((completedCount / totalLessons) * 100);
  const nextLesson = lessons?.find(l => !progress?.some(p => p.lesson_id === l.id && p.completed));

  const categories = Array.from(new Set(lessons?.map(l => l.category) || []));

  if (!activeLanguage) {
    return (
      <div className="px-4 pt-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-hero mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Native2Global!</h1>
          <p className="text-muted-foreground mb-6">Add a language from the sidebar to start learning</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 space-y-6 pb-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-sm">Hello, {profile?.display_name || 'Learner'} 👋</p>
        <h1 className="text-xl font-bold mt-1">
          Learning {activeLanguage.native_name} {activeLanguage.flag_emoji}
        </h1>
      </motion.div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center shadow-card">
          <Flame className="w-5 h-5 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold">{profile?.streak_days || 0}</p>
          <p className="text-[10px] text-muted-foreground">Day Streak</p>
        </Card>
        <Card className="p-3 text-center shadow-card">
          <Star className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{profile?.total_xp || 0}</p>
          <p className="text-[10px] text-muted-foreground">Total XP</p>
        </Card>
        <Card className="p-3 text-center shadow-card">
          <BookOpen className="w-5 h-5 mx-auto text-info mb-1" />
          <p className="text-lg font-bold">{completedCount}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </Card>
      </motion.div>

      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="p-4 shadow-card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Course Progress</span>
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </Card>
      </motion.div>

      {/* Continue Learning */}
      {nextLesson && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Continue Learning</h2>
          <Card
            className="p-4 shadow-elevated cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
            onClick={() => navigate(`/lessons/${nextLesson.id}`)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{nextLesson.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{nextLesson.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Level {nextLesson.difficulty_level}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium capitalize">
                    {nextLesson.category}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* AI & Practice Features */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-gradient-hero text-primary-foreground cursor-pointer hover:opacity-95 transition-opacity" onClick={() => navigate('/ai-chat')}>
          <Sparkles className="w-6 h-6 mb-2" />
          <p className="font-semibold text-sm">AI Chat</p>
          <p className="text-[10px] opacity-80">Practice conversations</p>
        </Card>
        <Card className="p-4 bg-gradient-accent text-accent-foreground cursor-pointer hover:opacity-95 transition-opacity" onClick={() => navigate('/ai-teacher')}>
          <GraduationCap className="w-6 h-6 mb-2" />
          <p className="font-semibold text-sm">AI Teacher</p>
          <p className="text-[10px] opacity-80">Grammar correction</p>
        </Card>
        <Card className="p-3 shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => navigate('/scenarios')}>
          <Theater className="w-5 h-5 text-primary mb-1" />
          <p className="font-semibold text-sm">Scenarios</p>
          <p className="text-[10px] text-muted-foreground">Real-life practice</p>
        </Card>
        <Card className="p-3 shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => navigate('/pronunciation')}>
          <Mic className="w-5 h-5 text-primary mb-1" />
          <p className="font-semibold text-sm">Pronunciation</p>
          <p className="text-[10px] text-muted-foreground">Speak & compare</p>
        </Card>
      </motion.div>

      {/* Quick Access */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="grid grid-cols-2 gap-3">
        <Card className="p-3 shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => navigate('/flashcards')}>
          <Layers className="w-5 h-5 text-accent mb-1" />
          <p className="font-semibold text-sm">Flashcards</p>
          <p className="text-[10px] text-muted-foreground">Review vocabulary</p>
        </Card>
        <Card className="p-3 shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => navigate('/achievements')}>
          <Trophy className="w-5 h-5 text-accent mb-1" />
          <p className="font-semibold text-sm">Achievements</p>
          <p className="text-[10px] text-muted-foreground">Earn badges</p>
        </Card>
      </motion.div>

      {/* Lesson Categories */}
      {categories.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Lesson Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => {
              const Icon = categoryIcons[cat] || BookOpen;
              const count = lessons?.filter(l => l.category === cat).length || 0;
              const done = lessons?.filter(l => l.category === cat && progress?.some(p => p.lesson_id === l.id && p.completed)).length || 0;
              return (
                <Card key={cat} className="p-3 shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => navigate(`/lessons?category=${cat}`)}>
                  <Icon className="w-5 h-5 text-primary mb-1" />
                  <p className="text-sm font-semibold capitalize">{cat}</p>
                  <p className="text-[10px] text-muted-foreground">{done}/{count} completed</p>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
