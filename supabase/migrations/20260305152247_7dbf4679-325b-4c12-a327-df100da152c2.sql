
-- Add language_from_id and language_to_id to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS language_from_id uuid REFERENCES public.languages(id);
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS language_to_id uuid REFERENCES public.languages(id);

-- Populate language_to_id from existing language_id
UPDATE public.lessons SET language_to_id = language_id WHERE language_to_id IS NULL;

-- Add language_id to pronunciation_practice
ALTER TABLE public.pronunciation_practice ADD COLUMN IF NOT EXISTS language_id uuid REFERENCES public.languages(id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_pronunciation_practice_language ON public.pronunciation_practice(language_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_practice_user ON public.pronunciation_practice(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_language_to ON public.lessons(language_to_id);
CREATE INDEX IF NOT EXISTS idx_lessons_language_from ON public.lessons(language_from_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON public.lessons(is_published) WHERE is_published = true;
