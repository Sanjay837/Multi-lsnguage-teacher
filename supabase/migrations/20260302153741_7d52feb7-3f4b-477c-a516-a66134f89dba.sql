
CREATE TABLE public.pronunciation_practice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  expected_sentence text NOT NULL,
  spoken_sentence text NOT NULL,
  accuracy_score numeric(5,2) NOT NULL DEFAULT 0,
  mistake_words jsonb NOT NULL DEFAULT '[]'::jsonb,
  practice_type text NOT NULL DEFAULT 'sentence',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pronunciation_practice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pronunciation data"
ON public.pronunciation_practice FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pronunciation data"
ON public.pronunciation_practice FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pronunciation_practice_user ON public.pronunciation_practice (user_id, created_at DESC);
