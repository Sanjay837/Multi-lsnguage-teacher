import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Language } from '@/lib/types';

interface LanguageContextType {
  activeLanguage: Language | null;
  userLanguages: Language[];
  allLanguages: Language[];
  isLoading: boolean;
  setActiveLanguage: (languageId: string) => Promise<void>;
  addLanguage: (languageId: string) => Promise<void>;
  removeLanguage: (languageId: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all active languages
  const { data: allLanguages = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-languages'],
    queryFn: async () => {
      const { data } = await supabase.from('languages').select('*').eq('is_active', true).order('name');
      return (data || []) as unknown as Language[];
    },
  });

  // Fetch user's added languages with their active status
  const { data: userLangRows = [], isLoading: loadingUser } = useQuery({
    queryKey: ['user-languages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_languages')
        .select('language_id, is_active')
        .eq('user_id', user.id);
      return (data || []) as { language_id: string; is_active: boolean }[];
    },
    enabled: !!user,
  });

  // Derive user's languages and active language
  const userLanguages = allLanguages.filter(l => userLangRows.some(ul => ul.language_id === l.id));
  const activeRow = userLangRows.find(ul => ul.is_active);
  const activeLanguage = activeRow ? allLanguages.find(l => l.id === activeRow.language_id) || null : null;

  const setActiveLanguage = useCallback(async (languageId: string) => {
    if (!user) return;
    // Deactivate all, then activate chosen
    await supabase.from('user_languages').update({ is_active: false } as any).eq('user_id', user.id);
    await supabase.from('user_languages').update({ is_active: true } as any).eq('user_id', user.id).eq('language_id', languageId);
    // Also update profile target_language_id for backwards compatibility
    await supabase.from('profiles').update({ target_language_id: languageId }).eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['user-languages'] });
    queryClient.invalidateQueries({ queryKey: ['lessons'] });
    queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    queryClient.invalidateQueries({ queryKey: ['pronunciation-history'] });
    queryClient.invalidateQueries({ queryKey: ['target-language'] });
  }, [user, queryClient]);

  const addLanguage = useCallback(async (languageId: string) => {
    if (!user) return;
    const isFirst = userLangRows.length === 0;
    await supabase.from('user_languages').insert({
      user_id: user.id,
      language_id: languageId,
      is_active: isFirst,
    } as any);
    if (isFirst) {
      await supabase.from('profiles').update({ target_language_id: languageId }).eq('user_id', user.id);
    }
    queryClient.invalidateQueries({ queryKey: ['user-languages'] });
  }, [user, userLangRows, queryClient]);

  const removeLanguage = useCallback(async (languageId: string) => {
    if (!user) return;
    await supabase.from('user_languages').delete().eq('user_id', user.id).eq('language_id', languageId);
    queryClient.invalidateQueries({ queryKey: ['user-languages'] });
  }, [user, queryClient]);

  return (
    <LanguageContext.Provider value={{
      activeLanguage,
      userLanguages,
      allLanguages,
      isLoading: loadingAll || loadingUser,
      setActiveLanguage,
      addLanguage,
      removeLanguage,
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
