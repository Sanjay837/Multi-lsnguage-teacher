import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, BookOpen } from 'lucide-react';
import type { Lesson, UserProgress } from '@/lib/types';

const difficultyColors: Record<number, string> = {
  1: 'bg-success/10 text-success',
  2: 'bg-info/10 text-info',
  3: 'bg-warning/10 text-warning',
  4: 'bg-accent/10 text-accent',
  5: 'bg-destructive/10 text-destructive',
};

export default function Lessons() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['lessons', profile?.target_language_id],
    queryFn: async () => {
      if (!profile?.target_language_id) return [];
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('language_id', profile.target_language_id)
        .eq('is_published', true)
        .order('order_index');
      return (data || []) as unknown as Lesson[];
    },
    enabled: !!profile?.target_language_id,
  });

  const { data: progress } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data } = await supabase.from('user_progress').select('*');
      return (data || []) as unknown as UserProgress[];
    },
  });

  const isCompleted = (lessonId: string) => progress?.some(p => p.lesson_id === lessonId && p.completed);
  const getScore = (lessonId: string) => progress?.find(p => p.lesson_id === lessonId);

  if (!profile?.target_language_id) {
    return (
      <div className="px-4 pt-12 text-center">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Select a language in your profile first</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Lessons</h1>
        <p className="text-sm text-muted-foreground">Master each lesson step by step</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {lessons?.map((lesson, index) => {
            const completed = isCompleted(lesson.id);
            const scoreData = getScore(lesson.id);
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-4 shadow-card cursor-pointer hover:shadow-elevated transition-all"
                  onClick={() => navigate(`/lessons/${lesson.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      completed ? 'bg-success/10' : 'bg-secondary'
                    }`}>
                      {completed ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${difficultyColors[lesson.difficulty_level] || ''}`}>
                          Level {lesson.difficulty_level}
                        </span>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {lesson.category}
                        </Badge>
                        {scoreData && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {scoreData.score}/{scoreData.max_score} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
