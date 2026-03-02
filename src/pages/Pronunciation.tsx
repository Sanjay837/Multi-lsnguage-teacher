import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Volume2, RotateCcw, CheckCircle, XCircle, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import type { Lesson } from '@/lib/types';

// --- Data ---

const ALPHABET_DATA = [
  { letter: 'ಅ', romanized: 'a', kannada: 'ಅಕಾರ - ಮೊದಲ ಸ್ವರ' },
  { letter: 'ಆ', romanized: 'aa', kannada: 'ಆಕಾರ - ದೀರ್ಘ ಸ್ವರ' },
  { letter: 'ಇ', romanized: 'i', kannada: 'ಇಕಾರ' },
  { letter: 'ಈ', romanized: 'ee', kannada: 'ಈಕಾರ - ದೀರ್ಘ' },
  { letter: 'ಉ', romanized: 'u', kannada: 'ಉಕಾರ' },
  { letter: 'ಊ', romanized: 'oo', kannada: 'ಊಕಾರ - ದೀರ್ಘ' },
  { letter: 'ಎ', romanized: 'e', kannada: 'ಎಕಾರ' },
  { letter: 'ಏ', romanized: 'ae', kannada: 'ಏಕಾರ' },
  { letter: 'ಐ', romanized: 'ai', kannada: 'ಐಕಾರ' },
  { letter: 'ಒ', romanized: 'o', kannada: 'ಒಕಾರ' },
  { letter: 'ಓ', romanized: 'oo', kannada: 'ಓಕಾರ' },
  { letter: 'ಔ', romanized: 'au', kannada: 'ಔಕಾರ' },
  { letter: 'ಕ', romanized: 'ka', kannada: 'ಕ ವರ್ಗದ ಮೊದಲ ಅಕ್ಷರ' },
  { letter: 'ಖ', romanized: 'kha', kannada: 'ಮಹಾಪ್ರಾಣ' },
  { letter: 'ಗ', romanized: 'ga', kannada: 'ಗ ಅಕ್ಷರ' },
  { letter: 'ಘ', romanized: 'gha', kannada: 'ಘ ಅಕ್ಷರ' },
  { letter: 'ಚ', romanized: 'cha', kannada: 'ಚ ವರ್ಗ' },
  { letter: 'ಛ', romanized: 'chha', kannada: 'ಛ ಅಕ್ಷರ' },
  { letter: 'ಜ', romanized: 'ja', kannada: 'ಜ ಅಕ್ಷರ' },
  { letter: 'ಟ', romanized: 'ta', kannada: 'ಟ ವರ್ಗ' },
  { letter: 'ಡ', romanized: 'da', kannada: 'ಡ ಅಕ್ಷರ' },
  { letter: 'ತ', romanized: 'tha', kannada: 'ತ ವರ್ಗ' },
  { letter: 'ದ', romanized: 'dha', kannada: 'ದ ಅಕ್ಷರ' },
  { letter: 'ನ', romanized: 'na', kannada: 'ನ ಅಕ್ಷರ' },
  { letter: 'ಪ', romanized: 'pa', kannada: 'ಪ ವರ್ಗ' },
  { letter: 'ಫ', romanized: 'pha', kannada: 'ಫ ಅಕ್ಷರ' },
  { letter: 'ಬ', romanized: 'ba', kannada: 'ಬ ಅಕ್ಷರ' },
  { letter: 'ಮ', romanized: 'ma', kannada: 'ಮ ಅಕ್ಷರ' },
  { letter: 'ಯ', romanized: 'ya', kannada: 'ಯ ಅಕ್ಷರ' },
  { letter: 'ರ', romanized: 'ra', kannada: 'ರ ಅಕ್ಷರ' },
  { letter: 'ಲ', romanized: 'la', kannada: 'ಲ ಅಕ್ಷರ' },
  { letter: 'ವ', romanized: 'va', kannada: 'ವ ಅಕ್ಷರ' },
  { letter: 'ಶ', romanized: 'sha', kannada: 'ಶ ಅಕ್ಷರ' },
  { letter: 'ಸ', romanized: 'sa', kannada: 'ಸ ಅಕ್ಷರ' },
  { letter: 'ಹ', romanized: 'ha', kannada: 'ಹ ಅಕ್ಷರ' },
];

const BASIC_WORDS = [
  { word: 'ನಮಸ್ಕಾರ', romanized: 'namaskara', meaning: 'Hello / Greetings', kannada: 'ಶುಭಾಶಯ ಹೇಳಲು ಬಳಸುವ ಪದ' },
  { word: 'ಧನ್ಯವಾದ', romanized: 'dhanyavaada', meaning: 'Thank you', kannada: 'ಕೃತಜ್ಞತೆ ತೋರಿಸಲು' },
  { word: 'ಹೌದು', romanized: 'haudu', meaning: 'Yes', kannada: 'ಒಪ್ಪಿಗೆ ಸೂಚಿಸಲು' },
  { word: 'ಇಲ್ಲ', romanized: 'illa', meaning: 'No', kannada: 'ನಿರಾಕರಿಸಲು' },
  { word: 'ನೀರು', romanized: 'neeru', meaning: 'Water', kannada: 'ಕುಡಿಯುವ ನೀರು' },
  { word: 'ಊಟ', romanized: 'oota', meaning: 'Meal / Food', kannada: 'ಆಹಾರ' },
  { word: 'ಮನೆ', romanized: 'mane', meaning: 'House', kannada: 'ವಾಸಸ್ಥಳ' },
  { word: 'ಹೆಸರು', romanized: 'hesaru', meaning: 'Name', kannada: 'ನಿಮ್ಮ ಹೆಸರು ಏನು?' },
  { word: 'ಬನ್ನಿ', romanized: 'banni', meaning: 'Come', kannada: 'ಆಹ್ವಾನಿಸಲು' },
  { word: 'ಹೋಗಿ', romanized: 'hogi', meaning: 'Go', kannada: 'ಹೊರಡಲು ಹೇಳಲು' },
  { word: 'ಒಳ್ಳೆಯದು', romanized: 'olleyadu', meaning: 'Good', kannada: 'ಉತ್ತಮ ಎಂದು ಹೇಳಲು' },
  { word: 'ದೊಡ್ಡ', romanized: 'dodda', meaning: 'Big', kannada: 'ಗಾತ್ರ ಹೆಚ್ಚು' },
  { word: 'ಚಿಕ್ಕ', romanized: 'chikka', meaning: 'Small', kannada: 'ಗಾತ್ರ ಕಡಿಮೆ' },
  { word: 'ಶಾಲೆ', romanized: 'shaale', meaning: 'School', kannada: 'ವಿದ್ಯಾಲಯ' },
  { word: 'ಪುಸ್ತಕ', romanized: 'pustaka', meaning: 'Book', kannada: 'ಓದಲು ಬಳಸುವ ಪುಸ್ತಕ' },
];

const SENTENCES = [
  { sentence: 'ನನ್ನ ಹೆಸರು ರಾಜು', romanized: 'nanna hesaru Raaju', meaning: 'My name is Raju', kannada: 'ಸ್ವಪರಿಚಯ ಮಾಡಿಕೊಳ್ಳಲು' },
  { sentence: 'ನೀವು ಹೇಗಿದ್ದೀರಿ?', romanized: 'neevu hegiddiri?', meaning: 'How are you?', kannada: 'ಯೋಗಕ್ಷೇಮ ವಿಚಾರಿಸಲು' },
  { sentence: 'ನನಗೆ ಕನ್ನಡ ಬರುತ್ತದೆ', romanized: 'nanage kannada baruttade', meaning: 'I know Kannada', kannada: 'ಭಾಷಾ ಜ್ಞಾನ ಹೇಳಲು' },
  { sentence: 'ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಮಾತಾಡಿ', romanized: 'dayavittu nidhaanavaagi maataadi', meaning: 'Please speak slowly', kannada: 'ನಿಧಾನವಾಗಿ ಮಾತಾಡಲು ಕೋರಲು' },
  { sentence: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?', romanized: 'idara bele eshtu?', meaning: 'How much does this cost?', kannada: 'ಬೆಲೆ ಕೇಳಲು' },
  { sentence: 'ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ', romanized: 'nanage arthavaagalilla', meaning: "I didn't understand", kannada: 'ಅರ್ಥ ಆಗಲಿಲ್ಲ ಎಂದು ಹೇಳಲು' },
  { sentence: 'ಶುಭ ಮುಂಜಾನೆ', romanized: 'shubha munjaane', meaning: 'Good morning', kannada: 'ಬೆಳಿಗ್ಗೆ ಶುಭಾಶಯ' },
  { sentence: 'ಶುಭ ರಾತ್ರಿ', romanized: 'shubha raatri', meaning: 'Good night', kannada: 'ರಾತ್ರಿ ಶುಭಾಶಯ' },
];

// --- Types ---

interface ComparisonResult {
  expected: string;
  spoken: string;
  words: { word: string; correct: boolean }[];
  accuracy: number;
}

type PracticeItem = {
  text: string;
  romanized: string;
  meaning: string;
  kannada: string;
};

// --- Component ---

export default function Pronunciation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('alphabet');
  const [selectedItem, setSelectedItem] = useState<PracticeItem | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  // Fetch history
  const { data: history } = useQuery({
    queryKey: ['pronunciation-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('pronunciation_practice')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const avgAccuracy = history && history.length > 0
    ? Math.round(history.reduce((s, h) => s + Number(h.accuracy_score), 0) / history.length)
    : 0;

  // Save result mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { expected: string; spoken: string; accuracy: number; mistakes: string[] }) => {
      if (!user) return;
      await supabase.from('pronunciation_practice').insert({
        user_id: user.id,
        expected_sentence: data.expected,
        spoken_sentence: data.spoken,
        accuracy_score: data.accuracy,
        mistake_words: data.mistakes,
        practice_type: activeTab,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pronunciation-history'] }),
  });

  // AI feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async (data: { expected: string; spoken: string; accuracy: number; mistakeWords: string[] }) => {
      setLoadingFeedback(true);
      const { data: res, error } = await supabase.functions.invoke('pronunciation-feedback', {
        body: data,
      });
      if (error) throw error;
      return res.feedback as string;
    },
    onSuccess: (feedback) => {
      setAiFeedback(feedback);
      setLoadingFeedback(false);
    },
    onError: (err) => {
      console.error('Feedback error:', err);
      toast.error('Could not get AI feedback');
      setLoadingFeedback(false);
    },
  });

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'kn-IN';
    utterance.rate = 0.7;
    speechSynthesis.speak(utterance);
  }, []);

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

  const compareText = (expected: string, spoken: string): ComparisonResult => {
    const expectedWords = expected.toLowerCase().split(/\s+/);
    const spokenWords = spoken.toLowerCase().split(/\s+/);
    const words = expectedWords.map((w) => ({
      word: w,
      correct: spokenWords.some(sw => sw === w || levenshtein(sw, w) <= 2),
    }));
    const accuracy = expectedWords.length > 0
      ? Math.round((words.filter(w => w.correct).length / words.length) * 100)
      : 0;
    return { expected, spoken, words, accuracy };
  };

  const startListening = () => {
    setError('');
    setResult(null);
    setTranscript('');
    setAiFeedback('');
    transcriptRef.current = '';

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'kn-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const t = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      transcriptRef.current = t;
      setTranscript(t);
    };

    recognition.onend = () => {
      setIsListening(false);
      const spokenText = transcriptRef.current;
      if (spokenText && selectedItem) {
        const res = compareText(selectedItem.text, spokenText);
        setResult(res);
        const mistakes = res.words.filter(w => !w.correct).map(w => w.word);
        saveMutation.mutate({ expected: selectedItem.text, spoken: spokenText, accuracy: res.accuracy, mistakes });
        // Auto-request AI feedback if accuracy < 100
        if (res.accuracy < 100) {
          feedbackMutation.mutate({ expected: selectedItem.text, spoken: spokenText, accuracy: res.accuracy, mistakeWords: mistakes });
        }
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setError(event.error === 'no-speech' ? 'No speech detected. Try again.' : `Error: ${event.error}`);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const selectItem = (item: PracticeItem) => {
    setSelectedItem(item);
    setResult(null);
    setTranscript('');
    setAiFeedback('');
  };

  const renderItemGrid = (items: PracticeItem[], isAlphabet = false) => (
    <div className={`grid ${isAlphabet ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2'} gap-2`}>
      {items.map((item, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
          <Card
            className={`p-3 cursor-pointer hover:shadow-elevated transition-all border ${selectedItem?.text === item.text ? 'border-primary bg-primary/5' : 'border-border'}`}
            onClick={() => selectItem(item)}
          >
            <p className={`font-bold ${isAlphabet ? 'text-2xl text-center' : 'text-lg'}`}>{item.text}</p>
            {!isAlphabet && (
              <>
                <p className="text-xs text-muted-foreground italic">{item.romanized}</p>
                <p className="text-sm text-primary">{item.meaning}</p>
              </>
            )}
            {isAlphabet && <p className="text-xs text-muted-foreground text-center">{item.romanized}</p>}
          </Card>
        </motion.div>
      ))}
    </div>
  );

  const alphabetItems: PracticeItem[] = ALPHABET_DATA.map(a => ({ text: a.letter, romanized: a.romanized, meaning: a.romanized, kannada: a.kannada }));
  const wordItems: PracticeItem[] = BASIC_WORDS.map(w => ({ text: w.word, romanized: w.romanized, meaning: w.meaning, kannada: w.kannada }));
  const sentenceItems: PracticeItem[] = SENTENCES.map(s => ({ text: s.sentence, romanized: s.romanized, meaning: s.meaning, kannada: s.kannada }));

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">🎤 Pronunciation Practice</h1>
        <p className="text-sm text-muted-foreground">Learn Kannada sounds step by step</p>
      </div>

      {/* Progress Summary */}
      {history && history.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Your Average Accuracy</span>
            <span className="text-sm font-bold text-primary">{avgAccuracy}%</span>
          </div>
          <Progress value={avgAccuracy} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{history.length} practice sessions</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItem(null); setResult(null); setAiFeedback(''); }}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="alphabet">ಅಕ್ಷರ Alphabet</TabsTrigger>
          <TabsTrigger value="words">ಪದ Words</TabsTrigger>
          <TabsTrigger value="sentences">ವಾಕ್ಯ Sentences</TabsTrigger>
        </TabsList>

        <TabsContent value="alphabet" className="mt-4 space-y-4">
          {!selectedItem && renderItemGrid(alphabetItems, true)}
        </TabsContent>

        <TabsContent value="words" className="mt-4 space-y-4">
          {!selectedItem && renderItemGrid(wordItems)}
        </TabsContent>

        <TabsContent value="sentences" className="mt-4 space-y-4">
          {!selectedItem && renderItemGrid(sentenceItems)}
        </TabsContent>
      </Tabs>

      {/* Practice Area */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Target */}
            <Card className="p-6 text-center shadow-elevated">
              <p className="text-3xl font-bold mb-2">{selectedItem.text}</p>
              <p className="text-sm text-muted-foreground italic">{selectedItem.romanized}</p>
              <p className="text-base text-primary font-medium mt-1">{selectedItem.meaning}</p>
              <p className="text-xs text-muted-foreground mt-2">
                <BookOpen className="w-3 h-3 inline mr-1" />
                {selectedItem.kannada}
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => speak(selectedItem.text)}>
                <Volume2 className="w-4 h-4 mr-1" /> Listen
              </Button>
            </Card>

            {/* Mic */}
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
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">You said:</p>
                <p className="text-lg font-medium">{transcript}</p>
              </Card>
            )}

            {/* Result */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {result.accuracy >= 70 ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className="font-semibold">{result.accuracy}% accuracy</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.words.map((w, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          w.correct ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive line-through'
                        }`}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* AI Feedback */}
            {loadingFeedback && (
              <Card className="p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Getting AI pronunciation tips...</span>
              </Card>
            )}

            {aiFeedback && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="p-4 border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">AI Pronunciation Coach</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{aiFeedback}</ReactMarkdown>
                  </div>
                </Card>
              </motion.div>
            )}

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setSelectedItem(null); setResult(null); setTranscript(''); setAiFeedback(''); }}>
                Back to List
              </Button>
              <Button className="flex-1 bg-gradient-primary" onClick={() => { setResult(null); setTranscript(''); setAiFeedback(''); }}>
                <RotateCcw className="w-4 h-4 mr-1" /> Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
