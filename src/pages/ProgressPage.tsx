import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import type { UserProgress } from '@/lib/types';

export default function ProgressPage() {
  const { user } = useAuth();

  const { data: progress } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data } = await supabase.from('user_progress').select('*');
      return (data || []) as unknown as UserProgress[];
    },
  });

  const { data: aiCount } = useQuery({
    queryKey: ['ai-interaction-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ai_interactions')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const totalCompleted = progress?.filter(p => p.completed).length || 0;
  const totalScore = progress?.reduce((sum, p) => sum + p.score, 0) || 0;
  const totalTime = progress?.reduce((sum, p) => sum + p.time_spent_seconds, 0) || 0;
  const avgScore = totalCompleted > 0
    ? Math.round(progress!.filter(p => p.completed).reduce((sum, p) => sum + (p.max_score > 0 ? (p.score / p.max_score) * 100 : 0), 0) / totalCompleted)
    : 0;

  // Most incorrect words
  const allIncorrect = progress?.flatMap(p => (p.incorrect_words || []) as string[]) || [];
  const wordCounts: Record<string, number> = {};
  allIncorrect.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
  const topIncorrect = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div className="px-4 pt-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Your Progress</h1>
        <p className="text-sm text-muted-foreground">Track your learning journey</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Target, label: 'Lessons Done', value: totalCompleted, color: 'text-primary' },
          { icon: TrendingUp, label: 'Avg Score', value: `${avgScore}%`, color: 'text-success' },
          { icon: Clock, label: 'Total Time', value: formatTime(totalTime), color: 'text-info' },
          { icon: BarChart3, label: 'AI Sessions', value: aiCount || 0, color: 'text-accent' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 shadow-card">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Weak Areas */}
      {topIncorrect.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h3 className="text-sm font-semibold">Words to Review</h3>
            </div>
            <div className="space-y-2">
              {topIncorrect.map(([word, count]) => (
                <div key={word} className="flex items-center justify-between">
                  <span className="text-sm">{word}</span>
                  <span className="text-xs text-muted-foreground">missed {count}x</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity */}
      {progress && progress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="text-sm font-semibold mb-2">Recent Lessons</h3>
          <div className="space-y-2">
            {progress.slice(-5).reverse().map(p => (
              <Card key={p.id} className="p-3 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.completed ? '✅' : '📝'} Lesson</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {p.score}/{p.max_score} · {formatTime(p.time_spent_seconds)}
                    </p>
                  </div>
                  <Progress value={p.max_score > 0 ? (p.score / p.max_score) * 100 : 0} className="w-16 h-1.5" />
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
