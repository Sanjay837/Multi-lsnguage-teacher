import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { LogOut, Save, Globe } from 'lucide-react';
import type { Language } from '@/lib/types';

export default function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [targetLang, setTargetLang] = useState(profile?.target_language_id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setTargetLang(profile.target_language_id || '');
    }
  }, [profile]);

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data } = await supabase.from('languages').select('*').eq('is_active', true);
      return (data || []) as unknown as Language[];
    },
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        target_language_id: targetLang || null,
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Profile updated!');
      await refreshProfile();
    }
    setSaving(false);
  };

  return (
    <div className="px-4 pt-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 shadow-card space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              <Globe className="w-4 h-4 inline mr-1" />
              I want to learn
            </label>
            <div className="grid grid-cols-2 gap-2">
              {languages?.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setTargetLang(lang.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    targetLang === lang.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span className="text-lg">{lang.flag_emoji}</span>
                  <p className="text-sm font-medium mt-1">{lang.name}</p>
                  <p className="text-xs text-muted-foreground">{lang.native_name}</p>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full bg-gradient-primary" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Card>
      </motion.div>

      {/* Stats Card */}
      {profile && (
        <Card className="p-4 shadow-card">
          <h3 className="text-sm font-semibold mb-3">Your Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-secondary rounded-xl">
              <p className="text-xl font-bold">🔥 {profile.streak_days}</p>
              <p className="text-[10px] text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-xl">
              <p className="text-xl font-bold">⭐ {profile.total_xp}</p>
              <p className="text-[10px] text-muted-foreground">Total XP</p>
            </div>
          </div>
        </Card>
      )}

      <Button variant="outline" className="w-full text-destructive" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
