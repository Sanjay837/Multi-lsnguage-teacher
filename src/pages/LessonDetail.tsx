import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Volume2, CheckCircle, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { awardXP, checkAchievements } from '@/lib/gamification';
import type { Lesson, QuizQuestion } from '@/lib/types';

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'learn' | 'quiz' | 'results'>('learn');
  const [wordIndex, setWordIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selected: string; correct: boolean }>>({});
  const [startTime] = useState(Date.now());

  const { data: lesson } = useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const { data } = await supabase.from('lessons').select('*').eq('id', id!).single();
      return data as unknown as Lesson;
    },
    enabled: !!id,
  });

  const { data: questions } = useQuery({
    queryKey: ['quiz-questions', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('lesson_id', id!)
        .order('order_index');
      return (data || []) as unknown as QuizQuestion[];
    },
    enabled: !!id,
  });

  const words = lesson?.content?.words || [];
  const currentWord = words[wordIndex];
  const currentQuestion = questions?.[quizIndex];
  const totalScore = Object.values(answers).filter(a => a.correct).length * 10;
  const maxScore = (questions?.length || 0) * 10;
  const incorrectWords = Object.entries(answers)
    .filter(([, a]) => !a.correct)
    .map(([qId]) => questions?.find(q => q.id === qId)?.correct_answer || '');

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const correct = answer === currentQuestion?.correct_answer;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion!.id]: { selected: answer, correct },
    }));
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    if (quizIndex < (questions?.length || 0) - 1) {
      setQuizIndex(quizIndex + 1);
    } else {
      saveProgress();
      setPhase('results');
    }
  };

  const saveProgress = async () => {
    if (!user || !id) return;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        lesson_id: id,
        score: totalScore,
        max_score: maxScore,
        time_spent_seconds: timeSpent,
        incorrect_words: incorrectWords as any,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });

    if (!error) {
      // Award XP based on score
      const xpEarned = totalScore + (totalScore === maxScore ? 20 : 0);
      await awardXP(user.id, xpEarned);
      
      // Check for new achievements
      const newBadges = await checkAchievements(user.id);
      if (newBadges && newBadges.length > 0) {
        newBadges.forEach(b => toast.success(`🏆 Badge earned: ${b.name}!`));
      }

      // Auto-add incorrect words as flashcards
      if (incorrectWords.length > 0 && lesson) {
        const flashcardInserts = incorrectWords.map(word => {
          const wordData = words.find(w => w.word === word || w.translation === word);
          return {
            user_id: user.id,
            word: wordData?.word || word,
            translation: wordData?.translation || word,
            pronunciation: wordData?.pronunciation || null,
            language_id: lesson.language_id,
            lesson_id: id,
            difficulty: 'hard' as const,
          };
        });
        await supabase.from('flashcards').upsert(flashcardInserts, { onConflict: 'user_id,word,language_id', ignoreDuplicates: true });
      }

      toast.success(`+${xpEarned} XP earned!`);
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });

      // Track analytics
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: 'lesson_completed',
        event_data: { lesson_id: id, score: totalScore, max_score: maxScore, time_spent: timeSpent, xp_earned: xpEarned } as any,
      });
    }
  };

  if (!lesson) return <div className="px-4 pt-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{lesson.title}</h1>
          <p className="text-xs text-muted-foreground capitalize">{phase} Phase</p>
        </div>
      </div>

      {/* Learn Phase */}
      {phase === 'learn' && currentWord && (
        <motion.div key={wordIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Progress value={((wordIndex + 1) / words.length) * 100} className="h-1.5 mb-6" />
          
          <Card className="p-6 text-center shadow-elevated mb-6">
            <p className="text-3xl font-bold mb-3">{currentWord.word}</p>
            <p className="text-sm text-muted-foreground mb-1">{currentWord.pronunciation}</p>
            <p className="text-lg font-medium text-primary">{currentWord.translation}</p>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setWordIndex(Math.max(0, wordIndex - 1))}
              disabled={wordIndex === 0}
            >
              Previous
            </Button>
            {wordIndex < words.length - 1 ? (
              <Button className="flex-1 bg-gradient-primary" onClick={() => setWordIndex(wordIndex + 1)}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="flex-1 bg-gradient-primary" onClick={() => { setPhase('quiz'); }}>
                Start Quiz <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Quiz Phase */}
      {phase === 'quiz' && currentQuestion && (
        <motion.div key={quizIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Progress value={((quizIndex + 1) / (questions?.length || 1)) * 100} className="h-1.5 mb-6" />

          <p className="text-sm text-muted-foreground mb-1">
            Question {quizIndex + 1} of {questions?.length}
          </p>
          <h2 className="text-lg font-semibold mb-6">{currentQuestion.question_text}</h2>

          <div className="space-y-3 mb-6">
            {(currentQuestion.options as string[]).map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correct_answer;
              const showResult = selectedAnswer !== null;
              return (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={!!selectedAnswer}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    showResult && isCorrect
                      ? 'border-success bg-success/10'
                      : showResult && isSelected && !isCorrect
                      ? 'border-destructive bg-destructive/10'
                      : isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{option}</span>
                    {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-success" />}
                    {showResult && isSelected && !isCorrect && <X className="w-4 h-4 text-destructive" />}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedAnswer && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {currentQuestion.explanation && (
                <p className="text-xs text-muted-foreground mb-4 p-3 bg-secondary rounded-lg">
                  💡 {currentQuestion.explanation}
                </p>
              )}
              <Button className="w-full bg-gradient-primary" onClick={nextQuestion}>
                {quizIndex < (questions?.length || 0) - 1 ? 'Next Question' : 'See Results'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Results Phase */}
      {phase === 'results' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4">
            <CheckCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Lesson Complete!</h2>
          <p className="text-muted-foreground mb-6">
            You scored {totalScore}/{maxScore} points
          </p>

          <Card className="p-4 mb-4 shadow-card">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{Object.values(answers).filter(a => a.correct).length}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{Object.values(answers).filter(a => !a.correct).length}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
            </div>
          </Card>

          {incorrectWords.length > 0 && (
            <Card className="p-4 mb-6 shadow-card text-left">
              <p className="text-sm font-semibold mb-2">Words to Review</p>
              <div className="flex flex-wrap gap-2">
                {incorrectWords.map((word, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                    {word}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/lessons')}>
              All Lessons
            </Button>
            <Button className="flex-1 bg-gradient-primary" onClick={() => navigate('/')}>
              Home
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
