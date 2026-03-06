
-- Create user_languages table for tracking which languages each user is learning
CREATE TABLE public.user_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, language_id)
);

ALTER TABLE public.user_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own languages" ON public.user_languages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own languages" ON public.user_languages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own languages" ON public.user_languages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own languages" ON public.user_languages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_languages_user_id ON public.user_languages(user_id);
CREATE INDEX idx_user_languages_active ON public.user_languages(user_id, is_active) WHERE is_active = true;
