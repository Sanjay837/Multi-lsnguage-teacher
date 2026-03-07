import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Language } from '@/lib/types';

interface LanguageContextType {
  activeLanguage: Language | null;
  allLanguages: Language[];
  isLoading: boolean;
  switchLanguage: (languageId: string) => Promise<void>;
  removeActiveLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allLanguages = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-languages'],
    queryFn: async () => {
      const { data } = await supabase.from('languages').select('*').eq('is_active', true).order('name');
      return (data || []) as unknown as Language[];
    },
  });

  const { data: activeRow, isLoading: loadingActive } = useQuery({
    queryKey: ['user-active-language', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_languages')
        .select('language_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return data as { language_id: string } | null;
    },
    enabled: !!user,
  });

  const activeLanguage = activeRow ? allLanguages.find(l => l.id === activeRow.language_id) || null : null;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user-active-language'] });
    queryClient.invalidateQueries({ queryKey: ['lessons'] });
    queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    queryClient.invalidateQueries({ queryKey: ['pronunciation-history'] });
    queryClient.invalidateQueries({ queryKey: ['target-language'] });
  }, [queryClient]);

  const switchLanguage = useCallback(async (languageId: string) => {
    if (!user) return;
    // Remove all existing user_languages rows, then insert the new one
    await supabase.from('user_languages').delete().eq('user_id', user.id);
    await supabase.from('user_languages').insert({
      user_id: user.id,
      language_id: languageId,
      is_active: true,
    } as any);
    await supabase.from('profiles').update({ target_language_id: languageId }).eq('user_id', user.id);
    invalidateAll();
  }, [user, invalidateAll]);

  const removeActiveLanguage = useCallback(async () => {
    if (!user) return;
    await supabase.from('user_languages').delete().eq('user_id', user.id);
    await supabase.from('profiles').update({ target_language_id: null }).eq('user_id', user.id);
    invalidateAll();
  }, [user, invalidateAll]);

  return (
    <LanguageContext.Provider value={{
      activeLanguage,
      allLanguages,
      isLoading: loadingAll || loadingActive,
      switchLanguage,
      removeActiveLanguage,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
