import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Volume2, RotateCcw, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { getPronunciationData, getSpeechLang, getTTSLang, type PronunciationItem } from '@/lib/pronunciation-data';

interface ComparisonResult {
  expected: string;
  spoken: string;
  words: { word: string; correct: boolean }[];
  accuracy: number;
}

export default function Pronunciation() {
  const { user } = useAuth();
  const { activeLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('alphabet');
  const [selectedItem, setSelectedItem] = useState<PronunciationItem | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  const langCode = activeLanguage?.code || '';
  const langId = activeLanguage?.id || '';
  const pronunciationData = getPronunciationData(langCode);

  const { data: history } = useQuery({
    queryKey: ['pronunciation-history', user?.id, langId],
    queryFn: async () => {
      if (!user || !langId) return [];
      const { data } = await supabase
        .from('pronunciation_practice')
        .select('*')
        .eq('user_id', user.id)
        .eq('language_id', langId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user && !!langId,
  });

  const avgAccuracy = history && history.length > 0
    ? Math.round(history.reduce((s, h) => s + Number(h.accuracy_score), 0) / history.length)
    : 0;

  const saveMutation = useMutation({
    mutationFn: async (data: { expected: string; spoken: string; accuracy: number; mistakes: string[] }) => {
      if (!user) return;
      await supabase.from('pronunciation_practice').insert({
        user_id: user.id,
        expected_sentence: data.expected,
        spoken_sentence: data.spoken,
        accuracy_score: data.accuracy,
        mistake_words: data.mistakes as any,
        practice_type: activeTab,
        language_id: langId || null,
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pronunciation-history'] }),
  });

  const feedbackMutation = useMutation({
    mutationFn: async (data: { expected: string; spoken: string; accuracy: number; mistakeWords: string[]; languageName: string; languageCode: string }) => {
      setLoadingFeedback(true);
      const { data: res, error } = await supabase.functions.invoke('pronunciation-feedback', { body: data });
      if (error) throw error;
      return res.feedback as string;
    },
    onSuccess: (feedback) => { setAiFeedback(feedback); setLoadingFeedback(false); },
    onError: () => { toast.error('Could not get AI feedback'); setLoadingFeedback(false); },
  });

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getTTSLang(langCode);
    utterance.rate = 0.7;
    speechSynthesis.speak(utterance);
  }, [langCode]);

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
    setError(''); setResult(null); setTranscript(''); setAiFeedback('');
    transcriptRef.current = '';
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Speech recognition not supported. Please use Chrome or Edge.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLang(langCode);
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
        if (res.accuracy < 100) {
          feedbackMutation.mutate({
            expected: selectedItem.text, spoken: spokenText, accuracy: res.accuracy,
            mistakeWords: mistakes, languageName: activeLanguage?.name || '', languageCode: langCode,
          });
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

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };
  const selectItem = (item: PronunciationItem) => { setSelectedItem(item); setResult(null); setTranscript(''); setAiFeedback(''); };

  const renderItemGrid = (items: PronunciationItem[], isAlphabet = false) => (
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
                <p className="text-xs text-muted-foreground italic">{item.phonetic}</p>
                <p className="text-sm text-primary">{item.translation}</p>
              </>
            )}
            {isAlphabet && <p className="text-xs text-muted-foreground text-center">{item.phonetic}</p>}
          </Card>
        </motion.div>
      ))}
    </div>
  );

  if (!activeLanguage) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-5 max-w-3xl mx-auto text-center">
        <h1 className="text-xl font-bold">🎤 Pronunciation Practice</h1>
        <p className="text-muted-foreground">Add a language from the sidebar to start practicing</p>
      </div>
    );
  }

  if (!pronunciationData) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-5 max-w-3xl mx-auto text-center">
        <h1 className="text-xl font-bold">🎤 Pronunciation Practice</h1>
        <p className="text-muted-foreground">
          Pronunciation data for {activeLanguage.name} {activeLanguage.flag_emoji} is coming soon!
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">🎤 Pronunciation Practice</h1>
        <p className="text-sm text-muted-foreground">{activeLanguage.flag_emoji} {activeLanguage.name}</p>
      </div>

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

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItem(null); setResult(null); setAiFeedback(''); }}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="alphabet">Alphabet</TabsTrigger>
          <TabsTrigger value="words">Words</TabsTrigger>
          <TabsTrigger value="sentences">Sentences</TabsTrigger>
        </TabsList>
        <TabsContent value="alphabet" className="mt-4 space-y-4">{!selectedItem && renderItemGrid(pronunciationData.alphabet, true)}</TabsContent>
        <TabsContent value="words" className="mt-4 space-y-4">{!selectedItem && renderItemGrid(pronunciationData.words)}</TabsContent>
        <TabsContent value="sentences" className="mt-4 space-y-4">{!selectedItem && renderItemGrid(pronunciationData.sentences)}</TabsContent>
      </Tabs>

      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <Card className="p-6 text-center shadow-elevated">
              <p className="text-3xl font-bold mb-2">{selectedItem.text}</p>
              <p className="text-sm text-muted-foreground italic">{selectedItem.phonetic}</p>
              <p className="text-base text-primary font-medium mt-1">{selectedItem.translation}</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => speak(selectedItem.text)}>
                <Volume2 className="w-4 h-4 mr-1" /> Listen
              </Button>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                className={`rounded-full w-20 h-20 ${isListening ? 'bg-destructive hover:bg-destructive/90 animate-pulse' : 'bg-gradient-primary'}`}
                onClick={isListening ? stopListening : startListening}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </Button>
              <p className="text-sm text-muted-foreground">{isListening ? 'Listening... tap to stop' : 'Tap to speak'}</p>
            </div>

            {transcript && (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">You said:</p>
                <p className="text-lg font-medium">{transcript}</p>
              </Card>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {result.accuracy >= 70 ? <CheckCircle className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                    <span className="font-semibold">{result.accuracy}% accuracy</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.words.map((w, i) => (
                      <span key={i} className={`px-2 py-1 rounded text-sm font-medium ${w.correct ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive line-through'}`}>
                        {w.word}
                      </span>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

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

      {history && history.length > 0 && !selectedItem && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-sm font-semibold mb-2">Recent Practice</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((h: any) => (
              <Card key={h.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{h.expected_sentence}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{h.practice_type}</p>
                  </div>
                  <span className={`text-sm font-bold ${Number(h.accuracy_score) >= 70 ? 'text-primary' : 'text-destructive'}`}>
                    {Number(h.accuracy_score)}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
