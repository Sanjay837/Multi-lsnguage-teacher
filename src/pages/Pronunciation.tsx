import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import type { Lesson } from '@/lib/types';

interface ComparisonResult {
  expected: string;
  spoken: string;
  words: { word: string; correct: boolean }[];
  accuracy: number;
}

export default function Pronunciation() {
  const { profile } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedWord, setSelectedWord] = useState<{ word: string; translation: string; pronunciation: string } | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const { data: lessons } = useQuery({
    queryKey: ['lessons', profile?.target_language_id],
    queryFn: async () => {
      if (!profile?.target_language_id) return [];
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('language_id', profile.target_language_id)
        .eq('is_published', true)
        .order('order_index');
      return (data || []) as unknown as Lesson[];
    },
    enabled: !!profile?.target_language_id,
  });

  const allWords = lessons?.flatMap(l => l.content?.words || []) || [];

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'kn-IN';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }, []);

  const compareWords = (expected: string, spoken: string): ComparisonResult => {
    const expectedWords = expected.toLowerCase().split(/\s+/);
    const spokenWords = spoken.toLowerCase().split(/\s+/);
    const words = expectedWords.map((w, i) => ({
      word: w,
      correct: spokenWords.some(sw => sw === w || levenshtein(sw, w) <= 2),
    }));
    const accuracy = Math.round((words.filter(w => w.correct).length / words.length) * 100);
    return { expected, spoken, words, accuracy };
  };

  const levenshtein = (a: string, b: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  };

  const startListening = () => {
    setError('');
    setResult(null);
    setTranscript('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'kn-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript && selectedWord) {
        setResult(compareWords(selectedWord.word, transcript));
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="px-4 pt-8 space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold">Pronunciation Practice</h1>
        <p className="text-sm text-muted-foreground">Listen, speak, and compare</p>
      </div>

      {/* Word Selection */}
      {!selectedWord ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Choose a word to practice:</p>
          <div className="grid grid-cols-2 gap-2">
            {allWords.slice(0, 20).map((word, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className="p-3 shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => { setSelectedWord(word); setResult(null); setTranscript(''); }}
                >
                  <p className="font-semibold text-sm">{word.word}</p>
                  <p className="text-xs text-muted-foreground">{word.translation}</p>
                </Card>
              </motion.div>
            ))}
          </div>
          {allWords.length === 0 && (
            <div className="text-center py-12">
              <Mic className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No words available. Complete some lessons first!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Target Word */}
          <Card className="p-6 text-center shadow-elevated">
            <p className="text-3xl font-bold mb-2">{selectedWord.word}</p>
            <p className="text-sm text-muted-foreground mb-1">{selectedWord.pronunciation}</p>
            <p className="text-lg text-primary font-medium">{selectedWord.translation}</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => speak(selectedWord.word)}>
              <Volume2 className="w-4 h-4 mr-1" /> Listen
            </Button>
          </Card>

          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className={`rounded-full w-20 h-20 ${isListening ? 'bg-destructive hover:bg-destructive/90 animate-pulse' : 'bg-gradient-primary'}`}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </Button>
            <p className="text-sm text-muted-foreground">
              {isListening ? 'Listening... tap to stop' : 'Tap to speak'}
            </p>
          </div>

          {/* Transcript */}
          {transcript && (
            <Card className="p-4 shadow-card">
              <p className="text-xs text-muted-foreground mb-1">You said:</p>
              <p className="text-lg font-medium">{transcript}</p>
            </Card>
          )}

          {/* Result */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  {result.accuracy >= 70 ? (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className="font-semibold">
                    {result.accuracy}% accuracy
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.words.map((w, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        w.correct
                          ? 'bg-primary/10 text-primary'
                          : 'bg-destructive/10 text-destructive line-through'
                      }`}
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setSelectedWord(null); setResult(null); setTranscript(''); }}>
              Change Word
            </Button>
            <Button className="flex-1 bg-gradient-primary" onClick={() => { setResult(null); setTranscript(''); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
