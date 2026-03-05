import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, Target, TrendingUp, AlertTriangle, Lightbulb, ArrowRight, GraduationCap, Mic } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { UserProgress, Lesson } from '@/lib/types';

export default function ProgressPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: progress } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data } = await supabase.from('user_progress').select('*');
      return (data || []) as unknown as UserProgress[];
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ['lessons', profile?.target_language_id],
    queryFn: async () => {
      if (!profile?.target_language_id) return [];
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .or(`language_id.eq.${profile.target_language_id},language_to_id.eq.${profile.target_language_id}`)
        .eq('is_published', true)
        .order('order_index');
      return (data || []) as unknown as Lesson[];
    },
    enabled: !!profile?.target_language_id,
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

  const { data: correctionCount } = useQuery({
    queryKey: ['grammar-correction-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('grammar_corrections' as any)
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: pronunciationHistory } = useQuery({
    queryKey: ['pronunciation-trends'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pronunciation_practice')
        .select('accuracy_score, created_at')
        .order('created_at', { ascending: true })
        .limit(30);
      return (data || []).map((d: any, i: number) => ({
        session: i + 1,
        accuracy: Number(d.accuracy_score),
        date: new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      }));
    },
  });

  const totalCompleted = progress?.filter(p => p.completed).length || 0;
  const totalTime = progress?.reduce((sum, p) => sum + p.time_spent_seconds, 0) || 0;
  const avgScore = totalCompleted > 0
    ? Math.round(progress!.filter(p => p.completed).reduce((sum, p) => sum + (p.max_score > 0 ? (p.score / p.max_score) * 100 : 0), 0) / totalCompleted)
    : 0;

  // Most incorrect words
  const allIncorrect = progress?.flatMap(p => (p.incorrect_words || []) as string[]) || [];
  const wordCounts: Record<string, number> = {};
  allIncorrect.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
  const topIncorrect = Object.entries(wordCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  // Suggested lessons (incomplete ones, prioritize low scores)
  const suggestedLessons = lessons?.filter(l => {
    const p = progress?.find(pr => pr.lesson_id === l.id);
    return !p?.completed;
  }).slice(0, 3) || [];

  // Weak categories
  const categoryScores: Record<string, { total: number; count: number }> = {};
  lessons?.forEach(l => {
    const p = progress?.find(pr => pr.lesson_id === l.id && pr.completed);
    if (p && p.max_score > 0) {
      if (!categoryScores[l.category]) categoryScores[l.category] = { total: 0, count: 0 };
      categoryScores[l.category].total += (p.score / p.max_score) * 100;
      categoryScores[l.category].count += 1;
    }
  });
  const weakCategories = Object.entries(categoryScores)
    .map(([cat, { total, count }]) => ({ category: cat, avg: Math.round(total / count) }))
    .filter(c => c.avg < 80)
    .sort((a, b) => a.avg - b.avg);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div className="px-4 pt-8 space-y-6 pb-4">
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
          { icon: GraduationCap, label: 'Corrections', value: correctionCount || 0, color: 'text-accent' },
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
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => navigate('/ai-teacher')}
            >
              Practice weak words with AI Teacher
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Weak Categories */}
      {weakCategories.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">Areas to Improve</h3>
            </div>
            <div className="space-y-3">
              {weakCategories.map(({ category, avg }) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize">{category}</span>
                    <span className="text-xs text-muted-foreground">{avg}%</span>
                  </div>
                  <Progress value={avg} className="h-1.5" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Suggested Lessons */}
      {suggestedLessons.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-sm font-semibold mb-2">Recommended Next</h3>
          <div className="space-y-2">
            {suggestedLessons.map(lesson => (
              <Card
                key={lesson.id}
                className="p-3 shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => navigate(`/lessons/${lesson.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{lesson.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {lesson.category} · Level {lesson.difficulty_level}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pronunciation Trends */}
      {pronunciationHistory && pronunciationHistory.length > 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <Card className="p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Pronunciation Accuracy Trend</h3>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pronunciationHistory}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="accuracy" stroke="hsl(153, 60%, 40%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity */}
      {progress && progress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
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
