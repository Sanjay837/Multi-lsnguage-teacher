
-- Add lesson_type column to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'vocabulary';

-- Create grammar_corrections table for AI Teacher tracking
CREATE TABLE public.grammar_corrections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  language_id uuid REFERENCES public.languages(id),
  original_text text NOT NULL,
  corrected_text text NOT NULL,
  explanation text,
  grammar_rule text,
  difficulty_level integer DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on grammar_corrections
ALTER TABLE public.grammar_corrections ENABLE ROW LEVEL SECURITY;

-- RLS policies for grammar_corrections
CREATE POLICY "Users can insert own corrections"
  ON public.grammar_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own corrections"
  ON public.grammar_corrections FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_grammar_corrections_user_id ON public.grammar_corrections(user_id);
CREATE INDEX idx_grammar_corrections_created_at ON public.grammar_corrections(created_at DESC);
CREATE INDEX idx_lessons_lesson_type ON public.lessons(lesson_type);

-- Add more lesson seed data with different types
INSERT INTO public.lessons (language_id, title, description, difficulty_level, category, lesson_type, order_index, content) 
SELECT 
  id, 'Daily Conversations', 'Learn everyday phrases for daily life', 1, 'conversation', 'conversation', 3,
  '{"words": [{"word": "ಶುಭೋದಯ", "translation": "Good morning", "pronunciation": "Shubhodaya"}, {"word": "ಹೇಗಿದ್ದೀರಾ?", "translation": "How are you?", "pronunciation": "Hegiddira?"}, {"word": "ಧನ್ಯವಾದಗಳು", "translation": "Thank you", "pronunciation": "Dhanyavadagalu"}, {"word": "ದಯವಿಟ್ಟು", "translation": "Please", "pronunciation": "Dayavittu"}]}'::jsonb
FROM public.languages WHERE code = 'kn';

INSERT INTO public.lessons (language_id, title, description, difficulty_level, category, lesson_type, order_index, content)
SELECT 
  id, 'Grammar Basics', 'Learn fundamental Kannada grammar structures', 2, 'grammar', 'grammar', 4,
  '{"words": [{"word": "ನಾನು", "translation": "I (subject)", "pronunciation": "Naanu"}, {"word": "ನೀನು", "translation": "You (informal)", "pronunciation": "Neenu"}, {"word": "ಅವನು", "translation": "He", "pronunciation": "Avanu"}, {"word": "ಅವಳು", "translation": "She", "pronunciation": "Avalu"}]}'::jsonb
FROM public.languages WHERE code = 'kn';

INSERT INTO public.lessons (language_id, title, description, difficulty_level, category, lesson_type, order_index, content)
SELECT 
  id, 'Interview Preparation', 'Essential phrases for job interviews', 3, 'professional', 'interview', 5,
  '{"words": [{"word": "ನನ್ನ ಹೆಸರು", "translation": "My name is", "pronunciation": "Nanna hesaru"}, {"word": "ನಾನು ಕೆಲಸ ಮಾಡುತ್ತೇನೆ", "translation": "I work at", "pronunciation": "Naanu kelasa maaduttene"}, {"word": "ಅನುಭವ", "translation": "Experience", "pronunciation": "Anubhava"}, {"word": "ಕೌಶಲ್ಯ", "translation": "Skill", "pronunciation": "Kaushalya"}]}'::jsonb
FROM public.languages WHERE code = 'kn';

-- Add quiz questions for new lessons
INSERT INTO public.quiz_questions (lesson_id, question_text, options, correct_answer, explanation, order_index)
SELECT l.id, 'What does "ಶುಭೋದಯ" mean?', '["Good morning", "Good night", "Goodbye", "Hello"]'::jsonb, 'Good morning', 'ಶುಭೋದಯ (Shubhodaya) is the Kannada greeting for "Good morning"', 1
FROM public.lessons l WHERE l.title = 'Daily Conversations';

INSERT INTO public.quiz_questions (lesson_id, question_text, options, correct_answer, explanation, order_index)
SELECT l.id, 'How do you say "Thank you" in Kannada?', '["ಧನ್ಯವಾದಗಳು", "ಶುಭೋದಯ", "ನಮಸ್ಕಾರ", "ಹೋಗಿ ಬರುತ್ತೇನೆ"]'::jsonb, 'ಧನ್ಯವಾದಗಳು', 'ಧನ್ಯವಾದಗಳು (Dhanyavadagalu) means "Thank you"', 2
FROM public.lessons l WHERE l.title = 'Daily Conversations';

INSERT INTO public.quiz_questions (lesson_id, question_text, options, correct_answer, explanation, order_index)
SELECT l.id, 'What does "ನಾನು" mean?', '["I", "You", "He", "She"]'::jsonb, 'I', 'ನಾನು (Naanu) is the first-person singular pronoun meaning "I"', 1
FROM public.lessons l WHERE l.title = 'Grammar Basics';

INSERT INTO public.quiz_questions (lesson_id, question_text, options, correct_answer, explanation, order_index)
SELECT l.id, 'What is the Kannada word for "Experience"?', '["ಅನುಭವ", "ಕೌಶಲ್ಯ", "ಕೆಲಸ", "ಹೆಸರು"]'::jsonb, 'ಅನುಭವ', 'ಅನುಭವ (Anubhava) means "Experience" in Kannada', 1
FROM public.lessons l WHERE l.title = 'Interview Preparation';
