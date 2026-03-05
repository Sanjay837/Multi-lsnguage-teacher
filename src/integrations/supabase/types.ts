export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_description: string | null
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          language_id: string | null
          messages: Json
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          language_id?: string | null
          messages?: Json
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          language_id?: string | null
          messages?: Json
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          correct_count: number
          created_at: string
          difficulty: string
          id: string
          language_id: string | null
          last_reviewed_at: string | null
          lesson_id: string | null
          next_review_at: string | null
          pronunciation: string | null
          review_count: number
          translation: string
          user_id: string
          word: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          difficulty?: string
          id?: string
          language_id?: string | null
          last_reviewed_at?: string | null
          lesson_id?: string | null
          next_review_at?: string | null
          pronunciation?: string | null
          review_count?: number
          translation: string
          user_id: string
          word: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          difficulty?: string
          id?: string
          language_id?: string | null
          last_reviewed_at?: string | null
          lesson_id?: string | null
          next_review_at?: string | null
          pronunciation?: string | null
          review_count?: number
          translation?: string
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_corrections: {
        Row: {
          corrected_text: string
          created_at: string
          difficulty_level: number | null
          explanation: string | null
          grammar_rule: string | null
          id: string
          language_id: string | null
          original_text: string
          user_id: string
        }
        Insert: {
          corrected_text: string
          created_at?: string
          difficulty_level?: number | null
          explanation?: string | null
          grammar_rule?: string | null
          id?: string
          language_id?: string | null
          original_text: string
          user_id: string
        }
        Update: {
          corrected_text?: string
          created_at?: string
          difficulty_level?: number | null
          explanation?: string | null
          grammar_rule?: string | null
          id?: string
          language_id?: string | null
          original_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grammar_corrections_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string | null
          flag_emoji: string | null
          id: string
          is_active: boolean | null
          is_rtl: boolean
          name: string
          native_name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_rtl?: boolean
          name: string
          native_name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_rtl?: boolean
          name?: string
          native_name?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          category: string
          content: Json
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          id: string
          is_published: boolean | null
          language_from_id: string | null
          language_id: string
          language_to_id: string | null
          lesson_type: string
          order_index: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          content?: Json
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          id?: string
          is_published?: boolean | null
          language_from_id?: string | null
          language_id: string
          language_to_id?: string | null
          lesson_type?: string
          order_index?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          id?: string
          is_published?: boolean | null
          language_from_id?: string | null
          language_id?: string
          language_to_id?: string | null
          lesson_type?: string
          order_index?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_language_from_id_fkey"
            columns: ["language_from_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_language_to_id_fkey"
            columns: ["language_to_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          native_language_id: string | null
          streak_days: number | null
          target_language_id: string | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          native_language_id?: string | null
          streak_days?: number | null
          target_language_id?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          native_language_id?: string | null
          streak_days?: number | null
          target_language_id?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_native_language_id_fkey"
            columns: ["native_language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_target_language_id_fkey"
            columns: ["target_language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      pronunciation_practice: {
        Row: {
          accuracy_score: number
          created_at: string
          expected_sentence: string
          id: string
          language_id: string | null
          mistake_words: Json
          practice_type: string
          spoken_sentence: string
          user_id: string
        }
        Insert: {
          accuracy_score?: number
          created_at?: string
          expected_sentence: string
          id?: string
          language_id?: string | null
          mistake_words?: Json
          practice_type?: string
          spoken_sentence: string
          user_id: string
        }
        Update: {
          accuracy_score?: number
          created_at?: string
          expected_sentence?: string
          id?: string
          language_id?: string | null
          mistake_words?: Json
          practice_type?: string
          spoken_sentence?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pronunciation_practice_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: string
          lesson_id: string
          options: Json
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          lesson_id: string
          options?: Json
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          lesson_id?: string
          options?: Json
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          attempts: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          incorrect_words: Json | null
          lesson_id: string
          max_score: number | null
          score: number | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          incorrect_words?: Json | null
          lesson_id: string
          max_score?: number | null
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          incorrect_words?: Json | null
          lesson_id?: string
          max_score?: number | null
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
