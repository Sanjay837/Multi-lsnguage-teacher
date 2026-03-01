export interface Language {
  id: string;
  name: string;
  code: string;
  native_name: string;
  flag_emoji: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  native_language_id: string | null;
  target_language_id: string | null;
  streak_days: number;
  total_xp: number;
  updated_at?: string | null;
}

export interface Lesson {
  id: string;
  language_id: string;
  title: string;
  description: string | null;
  difficulty_level: number;
  category: string;
  lesson_type: string;
  content: {
    words: Array<{
      word: string;
      translation: string;
      pronunciation: string;
    }>;
  };
  order_index: number;
  is_published: boolean;
}

export interface QuizQuestion {
  id: string;
  lesson_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  points: number;
  order_index: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  max_score: number;
  time_spent_seconds: number;
  incorrect_words: string[];
  completed: boolean;
  attempts: number;
  completed_at: string | null;
}

export interface AiInteraction {
  id: string;
  user_id: string;
  language_id: string | null;
  interaction_type: string;
  messages: ChatMessage[];
  tokens_used: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  pronunciation: string | null;
  language_id: string | null;
  lesson_id: string | null;
  difficulty: string;
  review_count: number;
  correct_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  earned_at: string;
}
