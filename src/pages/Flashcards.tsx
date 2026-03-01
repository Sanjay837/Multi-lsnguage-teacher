import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Layers, RotateCcw, ThumbsUp, ThumbsDown, Plus, Trash2, Search } from 'lucide-react';

interface Flashcard {
  id: string;
  word: string;
  translation: string;
  pronunciation: string | null;
  difficulty: string;
  review_count: number;
  correct_count: number;
  next_review_at: string | null;
  language_id: string | null;
  lesson_id: string | null;
}

export default function Flashcards() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'list' | 'review' | 'add'>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newPronunciation, setNewPronunciation] = useState('');

  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['flashcards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('flashcards')
        .select('*')
        .order('next_review_at', { ascending: true });
      return (data || []) as Flashcard[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newWord.trim() || !newTranslation.trim()) return;
      const { error } = await supabase.from('flashcards').insert({
        user_id: user.id,
        word: newWord.trim(),
        translation: newTranslation.trim(),
        pronunciation: newPronunciation.trim() || null,
        language_id: profile?.target_language_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      setNewWord('');
      setNewTranslation('');
      setNewPronunciation('');
      setMode('list');
      toast.success('Flashcard added!');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add'),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, correct }: { id: string; correct: boolean }) => {
      const card = flashcards.find(f => f.id === id);
      if (!card) return;
      const interval = correct ? Math.max(1, (card.correct_count + 1) * 2) : 0.5;
      const nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('flashcards').update({
        review_count: card.review_count + 1,
        correct_count: correct ? card.correct_count + 1 : card.correct_count,
        difficulty: correct ? (card.difficulty === 'hard' ? 'medium' : 'easy') : 'hard',
        last_reviewed_at: new Date().toISOString(),
        next_review_at: nextReview,
      }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('flashcards').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      toast.success('Deleted');
    },
  });

  const dueCards = flashcards.filter(f => !f.next_review_at || new Date(f.next_review_at) <= new Date());
  const reviewCards = mode === 'review' ? dueCards : [];
  const currentCard = reviewCards[currentIndex];
  const filtered = flashcards.filter(f =>
    f.word.toLowerCase().includes(search.toLowerCase()) ||
    f.translation.toLowerCase().includes(search.toLowerCase())
  );

  const handleReview = (correct: boolean) => {
    if (!currentCard) return;
    reviewMutation.mutate({ id: currentCard.id, correct });
    setFlipped(false);
    if (currentIndex < reviewCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setMode('list');
      setCurrentIndex(0);
      toast.success('Review session complete!');
    }
  };

  return (
    <div className="px-4 pt-8 space-y-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            {dueCards.length} cards due for review
          </p>
        </div>
        <div className="flex gap-2">
          {mode === 'list' && dueCards.length > 0 && (
            <Button size="sm" className="bg-gradient-primary" onClick={() => { setMode('review'); setCurrentIndex(0); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> Review
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setMode(mode === 'add' ? 'list' : 'add')}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {mode === 'add' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 shadow-card space-y-3">
            <Input placeholder="Word (e.g., ನಮಸ್ಕಾರ)" value={newWord} onChange={e => setNewWord(e.target.value)} />
            <Input placeholder="Translation (e.g., Hello)" value={newTranslation} onChange={e => setNewTranslation(e.target.value)} />
            <Input placeholder="Pronunciation (optional)" value={newPronunciation} onChange={e => setNewPronunciation(e.target.value)} />
            <Button className="w-full bg-gradient-primary" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newWord.trim() || !newTranslation.trim()}>
              {addMutation.isPending ? 'Adding...' : 'Add Flashcard'}
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Review Mode */}
      {mode === 'review' && currentCard && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {currentIndex + 1} / {reviewCards.length}
          </p>
          <div className="perspective-1000" onClick={() => setFlipped(!flipped)}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Card className="p-8 text-center shadow-elevated min-h-[200px] flex flex-col items-center justify-center cursor-pointer">
                {!flipped ? (
                  <>
                    <p className="text-3xl font-bold mb-2">{currentCard.word}</p>
                    {currentCard.pronunciation && (
                      <p className="text-sm text-muted-foreground">{currentCard.pronunciation}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">Tap to reveal</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-primary">{currentCard.translation}</p>
                    <p className="text-sm text-muted-foreground mt-2">{currentCard.word}</p>
                  </>
                )}
              </Card>
            </motion.div>
          </div>
          {flipped && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <Button variant="outline" className="flex-1 border-destructive text-destructive" onClick={() => handleReview(false)}>
                <ThumbsDown className="w-4 h-4 mr-1" /> Hard
              </Button>
              <Button className="flex-1 bg-gradient-primary" onClick={() => handleReview(true)}>
                <ThumbsUp className="w-4 h-4 mr-1" /> Got it
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* List Mode */}
      {mode === 'list' && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search flashcards..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Card key={i} className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-2/3" /></Card>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No flashcards yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add words from lessons or create your own</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((card, i) => (
                <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="p-3 shadow-card flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{card.word}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          card.difficulty === 'easy' ? 'bg-primary/10 text-primary' :
                          card.difficulty === 'hard' ? 'bg-destructive/10 text-destructive' :
                          'bg-secondary text-secondary-foreground'
                        }`}>{card.difficulty}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{card.translation}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Reviewed {card.review_count}x · {card.correct_count} correct
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0" onClick={() => deleteMutation.mutate(card.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
