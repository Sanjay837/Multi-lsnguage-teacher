
-- Languages table
CREATE TABLE public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  native_name TEXT NOT NULL,
  flag_emoji TEXT DEFAULT '🌐',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  native_language_id UUID REFERENCES public.languages(id),
  target_language_id UUID REFERENCES public.languages(id),
  streak_days INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID REFERENCES public.languages(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  category TEXT NOT NULL DEFAULT 'general',
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  incorrect_words JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- AI interactions table
CREATE TABLE public.ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  language_id UUID REFERENCES public.languages(id),
  interaction_type TEXT NOT NULL DEFAULT 'conversation',
  messages JSONB NOT NULL DEFAULT '[]',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lessons_language ON public.lessons(language_id);
CREATE INDEX idx_lessons_category ON public.lessons(category);
CREATE INDEX idx_quiz_questions_lesson ON public.quiz_questions(lesson_id);
CREATE INDEX idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_lesson ON public.user_progress(lesson_id);
CREATE INDEX idx_ai_interactions_user ON public.ai_interactions(user_id);
CREATE INDEX idx_analytics_user ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_type ON public.analytics_events(event_type);

-- Enable RLS
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Languages: public read
CREATE POLICY "Languages are publicly readable" ON public.languages FOR SELECT USING (true);

-- Profiles: users manage own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Lessons: public read (published)
CREATE POLICY "Published lessons are readable" ON public.lessons FOR SELECT USING (is_published = true);

-- Quiz questions: readable if lesson is published
CREATE POLICY "Quiz questions are readable" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = quiz_questions.lesson_id AND lessons.is_published = true)
);

-- User progress: users manage own
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- AI interactions: users manage own
CREATE POLICY "Users can view own AI interactions" ON public.ai_interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI interactions" ON public.ai_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Analytics: users manage own
CREATE POLICY "Users can view own analytics" ON public.analytics_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed languages
INSERT INTO public.languages (name, code, native_name, flag_emoji) VALUES
  ('Kannada', 'kn', 'ಕನ್ನಡ', '🇮🇳'),
  ('Hindi', 'hi', 'हिन्दी', '🇮🇳'),
  ('English', 'en', 'English', '🇬🇧'),
  ('Tamil', 'ta', 'தமிழ்', '🇮🇳'),
  ('Telugu', 'te', 'తెలుగు', '🇮🇳');

-- Seed some starter lessons for Kannada
INSERT INTO public.lessons (language_id, title, description, difficulty_level, category, content, order_index) VALUES
  ((SELECT id FROM public.languages WHERE code = 'kn'), 'Greetings & Basics', 'Learn basic Kannada greetings and introductions', 1, 'basics', '{"words": [{"word": "ನಮಸ್ಕಾರ", "translation": "Hello/Namaskara", "pronunciation": "Namaskāra"}, {"word": "ಹೇಗಿದ್ದೀರಿ", "translation": "How are you?", "pronunciation": "Hēgiddīri"}, {"word": "ಧನ್ಯವಾದ", "translation": "Thank you", "pronunciation": "Dhanyavāda"}, {"word": "ಹೌದು", "translation": "Yes", "pronunciation": "Haudu"}, {"word": "ಇಲ್ಲ", "translation": "No", "pronunciation": "Illa"}]}', 1),
  ((SELECT id FROM public.languages WHERE code = 'kn'), 'Numbers 1-20', 'Learn to count in Kannada', 1, 'basics', '{"words": [{"word": "ಒಂದು", "translation": "One", "pronunciation": "Ondu"}, {"word": "ಎರಡು", "translation": "Two", "pronunciation": "Eraḍu"}, {"word": "ಮೂರು", "translation": "Three", "pronunciation": "Mūru"}, {"word": "ನಾಲ್ಕು", "translation": "Four", "pronunciation": "Nālku"}, {"word": "ಐದು", "translation": "Five", "pronunciation": "Aidu"}]}', 2),
  ((SELECT id FROM public.languages WHERE code = 'kn'), 'Common Phrases', 'Essential everyday phrases', 2, 'conversation', '{"words": [{"word": "ನನ್ನ ಹೆಸರು", "translation": "My name is", "pronunciation": "Nanna hesaru"}, {"word": "ದಯವಿಟ್ಟು", "translation": "Please", "pronunciation": "Dayaviṭṭu"}, {"word": "ಕ್ಷಮಿಸಿ", "translation": "Excuse me", "pronunciation": "Kṣamisi"}, {"word": "ಶುಭ ರಾತ್ರಿ", "translation": "Good night", "pronunciation": "Śubha rātri"}]}', 3),
  ((SELECT id FROM public.languages WHERE code = 'kn'), 'Food & Drinks', 'Learn food-related vocabulary', 2, 'vocabulary', '{"words": [{"word": "ನೀರು", "translation": "Water", "pronunciation": "Nīru"}, {"word": "ಅನ್ನ", "translation": "Rice", "pronunciation": "Anna"}, {"word": "ಚಹಾ", "translation": "Tea", "pronunciation": "Cahā"}, {"word": "ಹಣ್ಣು", "translation": "Fruit", "pronunciation": "Haṇṇu"}]}', 4),
  ((SELECT id FROM public.languages WHERE code = 'kn'), 'Family Members', 'Learn family vocabulary', 3, 'vocabulary', '{"words": [{"word": "ಅಮ್ಮ", "translation": "Mother", "pronunciation": "Amma"}, {"word": "ಅಪ್ಪ", "translation": "Father", "pronunciation": "Appa"}, {"word": "ಅಕ್ಕ", "translation": "Elder sister", "pronunciation": "Akka"}, {"word": "ಅಣ್ಣ", "translation": "Elder brother", "pronunciation": "Aṇṇa"}]}', 5);

-- Seed quiz questions for first lesson
INSERT INTO public.quiz_questions (lesson_id, question_text, question_type, options, correct_answer, explanation, points, order_index) VALUES
  ((SELECT id FROM public.lessons WHERE title = 'Greetings & Basics'), 'What does "ನಮಸ್ಕಾರ" mean?', 'multiple_choice', '["Hello", "Goodbye", "Thank you", "Please"]', 'Hello', 'ನಮಸ್ಕಾರ (Namaskāra) is the most common greeting in Kannada', 10, 1),
  ((SELECT id FROM public.lessons WHERE title = 'Greetings & Basics'), 'How do you say "Thank you" in Kannada?', 'multiple_choice', '["ನಮಸ್ಕಾರ", "ಧನ್ಯವಾದ", "ಹೌದು", "ಇಲ್ಲ"]', 'ಧನ್ಯವಾದ', 'ಧನ್ಯವಾದ (Dhanyavāda) means "Thank you"', 10, 2),
  ((SELECT id FROM public.lessons WHERE title = 'Greetings & Basics'), 'What does "ಹೌದು" mean?', 'multiple_choice', '["No", "Maybe", "Yes", "Hello"]', 'Yes', 'ಹೌದು (Haudu) means "Yes" in Kannada', 10, 3),
  ((SELECT id FROM public.lessons WHERE title = 'Greetings & Basics'), 'How do you say "No" in Kannada?', 'multiple_choice', '["ಹೌದು", "ನಮಸ್ಕಾರ", "ಇಲ್ಲ", "ಧನ್ಯವಾದ"]', 'ಇಲ್ಲ', 'ಇಲ್ಲ (Illa) means "No" in Kannada', 10, 4),
  ((SELECT id FROM public.lessons WHERE title = 'Numbers 1-20'), 'What is "ಒಂದು" in English?', 'multiple_choice', '["Two", "One", "Three", "Five"]', 'One', 'ಒಂದು (Ondu) means "One"', 10, 1),
  ((SELECT id FROM public.lessons WHERE title = 'Numbers 1-20'), 'How do you say "Three" in Kannada?', 'multiple_choice', '["ಎರಡು", "ನಾಲ್ಕು", "ಮೂರು", "ಐದು"]', 'ಮೂರು', 'ಮೂರು (Mūru) means "Three"', 10, 2);
