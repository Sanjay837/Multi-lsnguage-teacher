import { supabase } from '@/integrations/supabase/client';

/**
 * Award XP to the user and update streak
 */
export async function awardXP(userId: string, xpAmount: number) {
  // Get current profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, streak_days, updated_at')
    .eq('user_id', userId)
    .single();

  if (!profile) return;

  const now = new Date();
  const lastUpdate = profile.updated_at ? new Date(profile.updated_at) : new Date(0);
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak = profile.streak_days || 0;
  if (daysSinceUpdate === 0) {
    // Same day, no streak change
  } else if (daysSinceUpdate === 1) {
    // Consecutive day
    newStreak += 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  await supabase
    .from('profiles')
    .update({
      total_xp: (profile.total_xp || 0) + xpAmount,
      streak_days: newStreak,
    })
    .eq('user_id', userId);
}

/**
 * Check and award achievements after an action
 */
export async function checkAchievements(userId: string) {
  const [{ data: progress }, { data: profile }, { count: aiCount }] = await Promise.all([
    supabase.from('user_progress').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
    supabase.from('ai_interactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  if (!progress || !profile) return;

  const completed = progress.filter(p => p.completed).length;
  const streak = profile.streak_days || 0;
  const xp = profile.total_xp || 0;
  const hasPerfect = progress.some(p => p.completed && p.score === p.max_score && (p.max_score || 0) > 0);

  const badges: { type: string; name: string; desc: string }[] = [];

  if (completed >= 1) badges.push({ type: 'first_lesson', name: 'First Steps', desc: 'Complete your first lesson' });
  if (completed >= 5) badges.push({ type: 'five_lessons', name: 'Getting Started', desc: 'Complete 5 lessons' });
  if (completed >= 10) badges.push({ type: 'ten_lessons', name: 'Dedicated Learner', desc: 'Complete 10 lessons' });
  if (hasPerfect) badges.push({ type: 'perfect_score', name: 'Perfect Score', desc: 'Get 100% on any quiz' });
  if (streak >= 3) badges.push({ type: 'streak_3', name: 'On Fire', desc: '3-day learning streak' });
  if (streak >= 7) badges.push({ type: 'streak_7', name: 'Week Warrior', desc: '7-day learning streak' });
  if (streak >= 30) badges.push({ type: 'streak_30', name: 'Monthly Master', desc: '30-day learning streak' });
  if (xp >= 100) badges.push({ type: 'xp_100', name: 'XP Hunter', desc: 'Earn 100 XP' });
  if (xp >= 500) badges.push({ type: 'xp_500', name: 'XP Champion', desc: 'Earn 500 XP' });
  if ((aiCount || 0) >= 10) badges.push({ type: 'ai_chat_10', name: 'Conversationalist', desc: 'Have 10 AI conversations' });

  // Get existing achievements
  const { data: existing } = await supabase
    .from('achievements')
    .select('badge_type')
    .eq('user_id', userId);
  const existingTypes = new Set(existing?.map(e => e.badge_type) || []);

  // Insert new ones
  const newBadges = badges.filter(b => !existingTypes.has(b.type));
  if (newBadges.length > 0) {
    await supabase.from('achievements').insert(
      newBadges.map(b => ({
        user_id: userId,
        badge_type: b.type,
        badge_name: b.name,
        badge_description: b.desc,
      }))
    );
  }

  return newBadges;
}
