import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Trophy, BookOpen, Flame, Star, MessageCircle, Target, Zap, Award } from 'lucide-react';
import type { UserProgress } from '@/lib/types';

interface Achievement {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  earned_at: string;
}

const badgeDefinitions = [
  { type: 'first_lesson', name: 'First Steps', desc: 'Complete your first lesson', icon: BookOpen, color: 'text-primary', check: (p: UserProgress[]) => p.filter(x => x.completed).length >= 1 },
  { type: 'five_lessons', name: 'Getting Started', desc: 'Complete 5 lessons', icon: Target, color: 'text-info', check: (p: UserProgress[]) => p.filter(x => x.completed).length >= 5 },
  { type: 'ten_lessons', name: 'Dedicated Learner', desc: 'Complete 10 lessons', icon: Award, color: 'text-accent', check: (p: UserProgress[]) => p.filter(x => x.completed).length >= 10 },
  { type: 'perfect_score', name: 'Perfect Score', desc: 'Get 100% on any quiz', icon: Star, color: 'text-accent', check: (p: UserProgress[]) => p.some(x => x.completed && x.score === x.max_score && x.max_score > 0) },
  { type: 'streak_3', name: 'On Fire', desc: '3-day learning streak', icon: Flame, color: 'text-destructive', check: (_: any, streak: number) => streak >= 3 },
  { type: 'streak_7', name: 'Week Warrior', desc: '7-day learning streak', icon: Flame, color: 'text-accent', check: (_: any, streak: number) => streak >= 7 },
  { type: 'streak_30', name: 'Monthly Master', desc: '30-day learning streak', icon: Zap, color: 'text-primary', check: (_: any, streak: number) => streak >= 30 },
  { type: 'xp_100', name: 'XP Hunter', desc: 'Earn 100 XP', icon: Star, color: 'text-primary', check: (_: any, __: any, xp: number) => xp >= 100 },
  { type: 'xp_500', name: 'XP Champion', desc: 'Earn 500 XP', icon: Trophy, color: 'text-accent', check: (_: any, __: any, xp: number) => xp >= 500 },
  { type: 'ai_chat_10', name: 'Conversationalist', desc: 'Have 10 AI conversations', icon: MessageCircle, color: 'text-info', check: () => false },
];

export default function Achievements() {
  const { user, profile } = useAuth();

  const { data: earned = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data } = await supabase.from('achievements').select('*').order('earned_at', { ascending: false });
      return (data || []) as Achievement[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data } = await supabase.from('user_progress').select('*');
      return (data || []) as unknown as UserProgress[];
    },
  });

  const { data: aiCount = 0 } = useQuery({
    queryKey: ['ai-interaction-count'],
    queryFn: async () => {
      const { count } = await supabase.from('ai_interactions').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  // Auto-check and award new badges
  const checkAndAward = async () => {
    if (!user) return;
    const streak = profile?.streak_days || 0;
    const xp = profile?.total_xp || 0;

    for (const badge of badgeDefinitions) {
      const alreadyEarned = earned.some(e => e.badge_type === badge.type);
      if (alreadyEarned) continue;

      let eligible = false;
      if (badge.type === 'ai_chat_10') {
        eligible = aiCount >= 10;
      } else {
        eligible = badge.check(progress, streak, xp);
      }

      if (eligible) {
        await supabase.from('achievements').insert({
          user_id: user.id,
          badge_type: badge.type,
          badge_name: badge.name,
          badge_description: badge.desc,
        });
      }
    }
  };

  // Check on mount
  useQuery({
    queryKey: ['check-achievements', progress.length, profile?.streak_days, profile?.total_xp, aiCount],
    queryFn: async () => {
      await checkAndAward();
      return true;
    },
    enabled: !!user && progress.length > 0,
  });

  const earnedTypes = new Set(earned.map(e => e.badge_type));

  return (
    <div className="px-4 pt-8 space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold">Achievements</h1>
        <p className="text-sm text-muted-foreground">{earned.length} / {badgeDefinitions.length} badges earned</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
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
          <Trophy className="w-5 h-5 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold">{earned.length}</p>
          <p className="text-[10px] text-muted-foreground">Badges</p>
        </Card>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 gap-3">
        {badgeDefinitions.map((badge, i) => {
          const isEarned = earnedTypes.has(badge.type);
          return (
            <motion.div key={badge.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className={`p-4 shadow-card text-center transition-all ${isEarned ? '' : 'opacity-40 grayscale'}`}>
                <badge.icon className={`w-8 h-8 mx-auto mb-2 ${isEarned ? badge.color : 'text-muted-foreground'}`} />
                <p className="font-semibold text-sm">{badge.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{badge.desc}</p>
                {isEarned && (
                  <p className="text-[10px] text-primary mt-1 font-medium">✓ Earned</p>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
