
-- Add is_rtl column to languages
ALTER TABLE public.languages ADD COLUMN IF NOT EXISTS is_rtl boolean NOT NULL DEFAULT false;

-- Add unique constraint on code for upsert
ALTER TABLE public.languages ADD CONSTRAINT languages_code_unique UNIQUE (code);

-- Insert global languages
INSERT INTO public.languages (name, native_name, code, flag_emoji, is_active, is_rtl) VALUES
  ('Spanish', 'Español', 'es', '🇪🇸', true, false),
  ('French', 'Français', 'fr', '🇫🇷', true, false),
  ('Arabic', 'العربية', 'ar', '🇸🇦', true, true),
  ('Bengali', 'বাংলা', 'bn', '🇧🇩', true, false),
  ('Portuguese', 'Português', 'pt', '🇧🇷', true, false),
  ('Russian', 'Русский', 'ru', '🇷🇺', true, false),
  ('Chinese', '中文', 'zh', '🇨🇳', true, false),
  ('Japanese', '日本語', 'ja', '🇯🇵', true, false),
  ('Indonesian', 'Bahasa Indonesia', 'id', '🇮🇩', true, false),
  ('Nigerian Pidgin', 'Naijá', 'pcm', '🇳🇬', true, false),
  ('Italian', 'Italiano', 'it', '🇮🇹', true, false),
  ('Thai', 'ไทย', 'th', '🇹🇭', true, false),
  ('Turkish', 'Türkçe', 'tr', '🇹🇷', true, false),
  ('Filipino', 'Filipino', 'fil', '🇵🇭', true, false),
  ('Korean', '한국어', 'ko', '🇰🇷', true, false),
  ('German', 'Deutsch', 'de', '🇩🇪', true, false),
  ('Swahili', 'Kiswahili', 'sw', '🇰🇪', true, false)
ON CONFLICT (code) DO UPDATE SET is_rtl = EXCLUDED.is_rtl;

-- Add index on languages for active lookup
CREATE INDEX IF NOT EXISTS idx_languages_active ON public.languages (is_active);
