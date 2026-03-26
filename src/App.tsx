/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Mic, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  Eye, 
  EyeOff, 
  Trophy, 
  Home, 
  Settings,
  Star,
  MessageCircle,
  PenTool,
  GraduationCap,
  Layout
} from 'lucide-react';
import { TeacherMode } from './TeacherMode';
import { SAMPLE_LESSON, Lesson, Sentence, Word, fetchLessons, Profile, saveHomeworkResult } from './data';
import { Loader2, LogOut, AlertTriangle } from 'lucide-react';
import { Auth } from './Auth';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { supabase } from './supabase';

// --- Types ---
type AppMode = 'CLASSROOM' | 'SELF_STUDY' | 'HOMEWORK' | 'TEACHER';
type LessonStep = 
  | 'INTRO' 
  | 'FULL_LISTENING' 
  | 'COMPREHENSION' 
  | 'SENTENCE_PRACTICE' 
  | 'FULL_SCRIPT' 
  | 'READING_CLASS' 
  | 'GRAMMAR' 
  | 'VOCAB' 
  | 'LESSON_FINISHED'
  | 'HOMEWORK_INTRO'
  | 'HOMEWORK_DICTATION'
  | 'HOMEWORK_UNSCRAMBLE'
  | 'HOMEWORK_VOCAB_TEST'
  | 'COMPLETED';

// --- Components ---

const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
    <motion.div 
      className="h-full bg-blue-500"
      initial={{ width: 0 }}
      animate={{ width: `${(current / total) * 100}%` }}
    />
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
    secondary: 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 shadow-md',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    success: 'bg-green-500 text-white hover:bg-green-600 shadow-md'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [step, setStep] = useState<LessonStep>('INTRO');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [homeworkScore, setHomeworkScore] = useState(0);
  const [dictationInput, setDictationInput] = useState('');
  const [unscrambleWords, setUnscrambleWords] = useState<string[]>([]);
  const [userUnscramble, setUserUnscramble] = useState<string[]>([]);
  const [vocabTestIndex, setVocabTestIndex] = useState(0);
  const [vocabTestScore, setVocabTestScore] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      // Check if Supabase is configured
      const isPlaceholder = (supabase as any).supabaseUrl?.includes('placeholder') || (supabase as any).supabaseKey === 'placeholder-key';
      if (isPlaceholder) {
        setConfigError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
        setIsAuthLoading(false);
        return;
      }

      // Add a timeout to the auth check to prevent hanging
      const timeoutId = setTimeout(() => {
        if (isAuthLoading) {
          console.warn('Auth check timed out');
          setIsAuthLoading(false);
        }
      }, 5000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Supabase session error:', sessionError);
          setIsAuthLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        if (!session) {
          setIsAuthLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          // If there's an error with the session (like invalid refresh token), 
          // clear the session to allow a clean login
          if (authError.message.includes('refresh_token_not_found') || authError.message.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
          } else if (authError.message !== 'Auth session missing!') {
            console.error('Supabase auth error:', authError);
          }
          setIsAuthLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error('Profile fetch error:', profileError);
          }

          if (profileData) {
            setProfile(profileData as Profile);
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setConfigError(err instanceof Error ? err.message : 'Failed to connect to authentication service.');
      } finally {
        setIsAuthLoading(false);
        clearTimeout(timeoutId);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMode(null);
  };

  const loadLessons = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchLessons();
    setLessons(data);
    if (data.length > 0 && !currentLessonId) {
      setCurrentLessonId(data[0].id);
    }
    setIsLoading(false);
  }, [currentLessonId]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const lesson = useMemo(() => {
    return lessons.find(l => l.id === currentLessonId) || lessons[0] || SAMPLE_LESSON;
  }, [lessons, currentLessonId]);

  const refreshLessons = () => {
    loadLessons();
  };

  // --- Audio Logic ---
  const speak = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => {
      setIsListening(false);
      if (onEnd) onEnd();
    };
    setIsListening(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsListening(false);
  };

  // --- Step Management ---
  const nextStep = async () => {
    const steps: LessonStep[] = [
      'INTRO', 'FULL_LISTENING', 'COMPREHENSION', 'SENTENCE_PRACTICE', 
      'FULL_SCRIPT', 'READING_CLASS', 'GRAMMAR', 'VOCAB', 'LESSON_FINISHED',
      'HOMEWORK_INTRO', 'HOMEWORK_DICTATION', 'HOMEWORK_UNSCRAMBLE', 
      'HOMEWORK_VOCAB_TEST', 'COMPLETED'
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      const next = steps[currentIndex + 1];
      
      // If moving to COMPLETED, save results
      if (next === 'COMPLETED' && profile && !isPreviewMode) {
        const total = (lesson.sentences.length * 2) + lesson.vocab.length;
        await saveHomeworkResult({
          user_id: profile.id,
          lesson_id: lesson.id,
          score: homeworkScore + vocabTestScore,
          total: total,
          completed_at: new Date().toISOString()
        });
      }
      
      setStep(next);
      stopSpeaking();
      // Reset state for specific steps
      if (next === 'HOMEWORK_DICTATION') {
        setCurrentSentenceIndex(0);
        setDictationInput('');
      }
      if (next === 'HOMEWORK_UNSCRAMBLE') {
        setCurrentSentenceIndex(0);
        initUnscramble(0);
      }
      if (next === 'HOMEWORK_VOCAB_TEST') {
        setVocabTestIndex(0);
        setVocabTestScore(0);
      }
    }
  };

  const prevStep = () => {
    const steps: LessonStep[] = [
      'INTRO', 'FULL_LISTENING', 'COMPREHENSION', 'SENTENCE_PRACTICE', 
      'FULL_SCRIPT', 'READING_CLASS', 'GRAMMAR', 'VOCAB', 'LESSON_FINISHED',
      'HOMEWORK_INTRO', 'HOMEWORK_DICTATION', 'HOMEWORK_UNSCRAMBLE', 
      'HOMEWORK_VOCAB_TEST', 'COMPLETED'
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
      stopSpeaking();
    }
  };

  // --- Homework Logic ---
  const initUnscramble = (index: number) => {
    const sentenceObj = lesson.sentences[index];
    if (!sentenceObj) return;
    const sentence = sentenceObj.english;
    const words = sentence.replace(/[.,!]/g, '').split(' ').sort(() => Math.random() - 0.5);
    setUnscrambleWords(words);
    setUserUnscramble([]);
  };

  const handleUnscrambleWordClick = (word: string, fromUser: boolean) => {
    if (fromUser) {
      setUserUnscramble(prev => prev.filter(w => w !== word));
      setUnscrambleWords(prev => [...prev, word]);
    } else {
      setUnscrambleWords(prev => prev.filter(w => w !== word));
      setUserUnscramble(prev => [...prev, word]);
    }
  };

  // --- Renderers ---

  const renderIntro = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8 py-12">
      <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
        <GraduationCap size={64} className="text-blue-600" />
      </div>
      <h1 className="text-4xl font-black text-gray-900 leading-tight">
        {lesson.title}
      </h1>
      <div className="flex justify-center gap-4 text-sm font-bold uppercase tracking-wider text-gray-500">
        <span className="bg-gray-100 px-3 py-1 rounded-full">{lesson.level}</span>
        <span className="bg-gray-100 px-3 py-1 rounded-full">{lesson.topic}</span>
      </div>
      <p className="text-xl text-gray-600 max-w-md mx-auto">
        오늘의 목표: <span className="text-blue-600 font-bold">{lesson.goal}</span>
      </p>
      <div className="pt-8">
        <Button onClick={nextStep} className="w-full max-w-xs mx-auto py-5 text-xl">
          학습 시작하기 <ChevronRight />
        </Button>
      </div>
    </motion.div>
  );

  const renderFullListening = () => (
    <div className="space-y-8 text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800">1단계: 전체 듣기</h2>
      <p className="text-gray-500">눈을 감고 전체 내용을 들어보세요. 어떤 내용일까요?</p>
      
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        <motion.div 
          animate={isListening ? { scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-blue-100 rounded-full"
        />
        <button 
          onClick={() => speak(lesson.sentences.map(s => s.english).join(' '))}
          className="relative z-10 w-32 h-32 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 transition-all"
        >
          {isListening ? <Pause size={48} /> : <Play size={48} className="ml-2" />}
        </button>
      </div>

      <div className="pt-8">
        <Button variant="outline" onClick={nextStep} disabled={isListening}>
          다 들었어요! <CheckCircle2 />
        </Button>
      </div>
    </div>
  );

  const renderComprehension = () => (
    <div className="space-y-8 py-8">
      <h2 className="text-2xl font-bold text-center">2단계: 내용 이해 확인</h2>
      <div className="space-y-6">
        {lesson.comprehensionQuestions.map((q, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-lg font-bold mb-4">{i + 1}. {q.question}</p>
            <div className="grid grid-cols-1 gap-3">
              {q.options.map((opt, optIdx) => (
                <button 
                  key={optIdx}
                  className="text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all font-medium"
                  onClick={() => {
                    if (optIdx === q.answer) {
                      setFeedback({ message: "정답입니다! 🌟", type: 'success' });
                    } else {
                      setFeedback({ message: "다시 한번 생각해보세요! 😊", type: 'error' });
                    }
                    setTimeout(() => setFeedback(null), 2000);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-4">
        <Button onClick={nextStep}>다음 단계로 <ChevronRight /></Button>
      </div>
    </div>
  );

  const renderSentencePractice = () => {
    const current = lesson.sentences[currentSentenceIndex];
    if (!current) return (
      <div className="text-center py-20">
        <p className="text-xl font-bold text-gray-400">이 레슨에는 문장이 없습니다.</p>
        <Button onClick={() => setStep('INTRO')} className="mt-4">돌아가기</Button>
      </div>
    );
    return (
      <div className="space-y-8 py-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">3단계: 문장별 연습</h2>
          <span className="text-blue-600 font-bold">{currentSentenceIndex + 1} / {lesson.sentences.length}</span>
        </div>
        
        <ProgressBar current={currentSentenceIndex + 1} total={lesson.sentences.length} />

        <motion.div 
          key={currentSentenceIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-12 rounded-[40px] shadow-xl border border-blue-50 text-center space-y-8"
        >
          <p className="text-3xl font-bold text-gray-800 leading-relaxed">
            {current.english}
          </p>
          <p className="text-xl text-gray-400 font-medium">
            {current.korean}
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <Button variant="secondary" onClick={() => speak(current.english)} className="w-16 h-16 rounded-full p-0">
              <Volume2 size={32} />
            </Button>
            <Button variant="outline" className="w-16 h-16 rounded-full p-0">
              <Mic size={32} />
            </Button>
          </div>
        </motion.div>

        <div className="flex justify-between pt-8">
          <Button variant="ghost" onClick={() => setCurrentSentenceIndex(Math.max(0, currentSentenceIndex - 1))} disabled={currentSentenceIndex === 0}>
            <ChevronLeft /> 이전
          </Button>
          {currentSentenceIndex < lesson.sentences.length - 1 ? (
            <Button onClick={() => setCurrentSentenceIndex(currentSentenceIndex + 1)}>
              다음 문장 <ChevronRight />
            </Button>
          ) : (
            <Button variant="success" onClick={nextStep}>
              연습 완료! <CheckCircle2 />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderFullScript = () => (
    <div className="space-y-8 py-8">
      <h2 className="text-2xl font-bold text-center">4단계: 전체 읽기</h2>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        {lesson.sentences.map((s, i) => (
          <p key={i} className="text-lg leading-relaxed">
            <span className="text-blue-500 font-bold mr-2">{i + 1}.</span>
            {s.english}
          </p>
        ))}
      </div>
      <div className="flex justify-center gap-4">
        <Button variant="secondary" onClick={() => speak(lesson.sentences.map(s => s.english).join(' '))}>
          <Play /> 전체 듣기
        </Button>
        <Button onClick={nextStep}>다음 단계로 <ChevronRight /></Button>
      </div>
    </div>
  );

  const renderReadingClass = () => (
    <div className="space-y-8 py-8">
      <h2 className="text-2xl font-bold text-center">5단계: 독해 수업</h2>
      <div className="space-y-4">
        {lesson.sentences.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all">
            <p className="text-lg font-bold text-blue-700 mb-1">{s.english}</p>
            <p className="text-gray-600">{s.korean}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-4">
        <Button onClick={nextStep}>문법 배우기 <ChevronRight /></Button>
      </div>
    </div>
  );

  const renderGrammar = () => (
    <div className="space-y-8 py-12 text-center">
      <div className="inline-block p-4 bg-yellow-100 rounded-full mb-4">
        <Star size={48} className="text-yellow-600" />
      </div>
      <h2 className="text-3xl font-black text-gray-900">오늘의 문법 포인트</h2>
      <div className="bg-white p-10 rounded-[40px] shadow-lg border-2 border-yellow-200 max-w-2xl mx-auto space-y-6">
        <h3 className="text-2xl font-bold text-blue-600">{lesson.grammar.point}</h3>
        <p className="text-xl text-gray-700 leading-relaxed">{lesson.grammar.explanation}</p>
        <div className="bg-gray-50 p-6 rounded-2xl">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">예시 문장</p>
          <p className="text-2xl font-mono text-gray-800">{lesson.grammar.example}</p>
        </div>
      </div>
      <div className="pt-8">
        <Button onClick={nextStep} className="px-12">단어 확인하기 <ChevronRight /></Button>
      </div>
    </div>
  );

  const renderVocab = () => (
    <div className="space-y-8 py-8">
      <h2 className="text-2xl font-bold text-center">6단계: 핵심 단어 정리</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lesson.vocab.map((v, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex justify-between items-center group hover:bg-blue-50 transition-all">
            <div>
              <p className="text-xl font-bold text-gray-900">{v.word}</p>
              <p className="text-blue-600 font-medium">{v.meaning}</p>
              <p className="text-xs text-gray-400 mt-2 italic">"{v.example}"</p>
            </div>
            <button onClick={() => speak(v.word)} className="p-3 bg-gray-100 rounded-full text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Volume2 size={20} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-8">
        <Button variant="success" onClick={nextStep} className="px-12 py-5 text-xl">
          수업 마치기 <CheckCircle2 />
        </Button>
      </div>
    </div>
  );

  const renderLessonFinished = () => (
    <div className="text-center space-y-8 py-12">
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="inline-block p-8 bg-blue-100 rounded-full mb-4"
      >
        <GraduationCap size={100} className="text-blue-600" />
      </motion.div>
      <h2 className="text-4xl font-black text-gray-900">수업 완료! 🌟</h2>
      <p className="text-xl text-gray-600 max-w-md mx-auto">
        오늘의 수업 내용을 모두 마쳤습니다.<br/>
        이제 배운 내용을 과제로 복습해볼까요?
      </p>
      
      <div className="pt-8 flex flex-col gap-4 max-w-xs mx-auto">
        <Button onClick={nextStep} className="py-5 text-xl bg-purple-600 hover:bg-purple-700">
          과제 시작하기 <ChevronRight />
        </Button>
        <Button variant="ghost" onClick={() => setStep('INTRO')}>
          처음으로 돌아가기
        </Button>
      </div>
    </div>
  );

  const renderHomeworkIntro = () => (
    <div className="text-center space-y-8 py-12">
      <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
        <PenTool size={64} className="text-purple-600" />
      </div>
      <h2 className="text-4xl font-black text-gray-900">과제 모드</h2>
      <p className="text-xl text-gray-600 max-w-md mx-auto">
        오늘 배운 내용을 복습해볼까요? <br/>
        3가지 과제가 준비되어 있어요.
      </p>
      <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto pt-8">
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">1</div>
          <span className="font-bold">받아쓰기 (Dictation)</span>
        </div>
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">2</div>
          <span className="font-bold">문장 완성하기 (Unscramble)</span>
        </div>
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">3</div>
          <span className="font-bold">단어 테스트 (Vocab Test)</span>
        </div>
      </div>
      <div className="pt-8">
        <Button onClick={nextStep} className="w-full max-w-xs mx-auto py-5 text-xl bg-purple-600 hover:bg-purple-700">
          과제 시작하기 <ChevronRight />
        </Button>
      </div>
    </div>
  );

  const renderHomeworkDictation = () => {
    const current = lesson.sentences[currentSentenceIndex];
    if (!current) return null;
    const isCorrect = dictationInput.toLowerCase().trim().replace(/[.,!]/g, '') === (current.english || '').toLowerCase().trim().replace(/[.,!]/g, '');

    const totalHomeworkSentences = Math.min(5, lesson.sentences.length);

    return (
      <div className="space-y-8 py-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-purple-600">과제 1: 받아쓰기</h2>
          <span className="font-bold">{currentSentenceIndex + 1} / {totalHomeworkSentences}</span>
        </div>
        <ProgressBar current={currentSentenceIndex + 1} total={totalHomeworkSentences} />

        <div className="bg-white p-10 rounded-[40px] shadow-lg border border-purple-100 text-center space-y-8">
          <p className="text-lg text-gray-500">문장을 듣고 빈칸에 입력하세요.</p>
          <Button variant="secondary" onClick={() => speak(current.english)} className="w-20 h-20 rounded-full mx-auto">
            <Volume2 size={40} />
          </Button>
          
          <textarea 
            value={dictationInput}
            onChange={(e) => setDictationInput(e.target.value)}
            placeholder="여기에 입력하세요..."
            className="w-full p-6 text-2xl font-bold text-center border-2 border-gray-100 rounded-3xl focus:border-purple-400 focus:outline-none min-h-[150px]"
          />

          {dictationInput && (
            <div className={`p-4 rounded-2xl font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
              {isCorrect ? "정답입니다! 완벽해요! ✨" : "조금 더 들어볼까요?"}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button 
            disabled={!isCorrect} 
            onClick={() => {
              if (currentSentenceIndex < totalHomeworkSentences - 1) {
                setCurrentSentenceIndex(currentSentenceIndex + 1);
                setDictationInput('');
              } else {
                nextStep();
              }
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {currentSentenceIndex < totalHomeworkSentences - 1 ? "다음 문제" : "다음 과제로"} <ChevronRight />
          </Button>
        </div>
      </div>
    );
  };

  const renderHomeworkUnscramble = () => {
    const current = lesson.sentences[currentSentenceIndex];
    if (!current) return null;
    const target = (current.english || '').replace(/[.,!]/g, '').toLowerCase();
    const currentStr = userUnscramble.join(' ').toLowerCase();
    const isCorrect = currentStr === target;

    const totalHomeworkSentences = Math.min(5, lesson.sentences.length);

    return (
      <div className="space-y-8 py-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-purple-600">과제 2: 문장 완성</h2>
          <span className="font-bold">{currentSentenceIndex + 1} / {totalHomeworkSentences}</span>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-2xl text-center">
          <p className="text-xl font-bold text-purple-800">{current.korean}</p>
        </div>

        <div className="min-h-[120px] bg-white p-6 rounded-3xl border-2 border-dashed border-purple-200 flex flex-wrap gap-2 items-center justify-center">
          {userUnscramble.map((word, i) => (
            <motion.button 
              layoutId={`word-${word}`}
              key={i}
              onClick={() => handleUnscrambleWordClick(word, true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm"
            >
              {word}
            </motion.button>
          ))}
          {userUnscramble.length === 0 && <span className="text-gray-300 font-medium">단어를 아래에서 선택하세요</span>}
        </div>

        <div className="flex flex-wrap gap-2 justify-center p-6">
          {unscrambleWords.map((word, i) => (
            <motion.button 
              layoutId={`word-${word}`}
              key={i}
              onClick={() => handleUnscrambleWordClick(word, false)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold border border-gray-200 hover:bg-gray-200"
            >
              {word}
            </motion.button>
          ))}
        </div>

        {userUnscramble.length > 0 && (
          <div className={`text-center font-bold ${isCorrect ? 'text-green-600' : 'text-gray-400'}`}>
            {isCorrect ? "문장이 완성되었습니다! 🎉" : "순서가 맞는지 확인해보세요."}
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            disabled={!isCorrect} 
            onClick={() => {
              if (currentSentenceIndex < totalHomeworkSentences - 1) {
                const nextIdx = currentSentenceIndex + 1;
                setCurrentSentenceIndex(nextIdx);
                initUnscramble(nextIdx);
              } else {
                nextStep();
              }
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {currentSentenceIndex < totalHomeworkSentences - 1 ? "다음 문제" : "마지막 과제로"} <ChevronRight />
          </Button>
        </div>
      </div>
    );
  };

  const renderHomeworkVocabTest = () => {
    const current = lesson.vocab[vocabTestIndex];
    if (!current) return (
      <div className="text-center py-20">
        <p className="text-xl font-bold text-gray-400">이 레슨에는 단어가 없습니다.</p>
        <Button onClick={nextStep} className="mt-4">다음으로 넘어가기</Button>
      </div>
    );
    const options = useMemo(() => {
      const others = lesson.vocab.filter(v => v.word !== current.word).sort(() => Math.random() - 0.5).slice(0, 3);
      return [current, ...others].sort(() => Math.random() - 0.5);
    }, [vocabTestIndex, current]);

    return (
      <div className="space-y-8 py-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-purple-600">과제 3: 단어 테스트</h2>
          <span className="font-bold">{vocabTestIndex + 1} / {lesson.vocab.length}</span>
        </div>

        <div className="bg-white p-12 rounded-[40px] shadow-lg border border-purple-100 text-center space-y-8">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">다음 단어의 뜻은?</p>
          <h3 className="text-5xl font-black text-gray-900">{current.word}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => {
                  if (opt.word === current.word) {
                    setVocabTestScore(prev => prev + 1);
                    setFeedback({ message: "정답! 🌟", type: 'success' });
                    setTimeout(() => {
                      setFeedback(null);
                      if (vocabTestIndex < lesson.vocab.length - 1) {
                        setVocabTestIndex(vocabTestIndex + 1);
                      } else {
                        nextStep();
                      }
                    }, 1000);
                  } else {
                    setFeedback({ message: "틀렸어요! 다시 생각해보세요.", type: 'error' });
                    setTimeout(() => setFeedback(null), 1500);
                  }
                }}
                className="p-6 rounded-2xl border-2 border-gray-100 hover:border-purple-400 hover:bg-purple-50 transition-all text-xl font-bold text-gray-700"
              >
                {opt.meaning}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCompleted = () => (
    <div className="text-center space-y-8 py-12">
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
        transition={{ 
          scale: { type: 'spring', bounce: 0.5 },
          rotate: { duration: 0.5, times: [0, 0.3, 0.7, 1] }
        }}
        className="inline-block p-8 bg-yellow-100 rounded-full mb-4"
      >
        <Trophy size={100} className="text-yellow-600" />
      </motion.div>
      <h2 className="text-5xl font-black text-gray-900">미션 완료! 🎉</h2>
      <p className="text-xl text-gray-600 max-w-md mx-auto">
        오늘의 모든 학습과 과제를 마쳤습니다. <br/>
        정말 대단해요! 내일 또 만나요!
      </p>
      
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-yellow-100 max-w-sm mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-400 uppercase tracking-widest">수업 이수</span>
          <span className="text-green-500 font-black text-2xl">PASS</span>
        </div>
        <div className="h-px bg-gray-100 w-full" />
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-400 uppercase tracking-widest">단어 테스트</span>
          <span className="text-blue-500 font-black text-2xl">{vocabTestScore} / {lesson.vocab.length}</span>
        </div>
      </div>

      <div className="pt-8 flex flex-col gap-4 max-w-xs mx-auto">
        <Button onClick={() => {
          setStep('INTRO');
          setMode('CLASSROOM');
        }} className="py-5 text-xl">
          메인으로 돌아가기 <Home />
        </Button>
      </div>
    </div>
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-16 h-16 text-[#4A90E2] animate-spin" />
        <p className="text-xl font-black text-[#4A90E2]">Little English Stars Loading...</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-orange-500 mb-4" />
        <h1 className="text-2xl font-bold text-orange-900 mb-2">Configuration Required</h1>
        <p className="text-orange-700 mb-6 max-w-md">
          {configError}
        </p>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 text-left w-full max-w-md">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">How to fix:</p>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-2">
            <li>Go to your Vercel project settings.</li>
            <li>Add <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code></li>
            <li>Add <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code></li>
            <li>Redeploy your application.</li>
          </ol>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all"
        >
          Check Again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <Auth onAuthSuccess={setProfile} />
    );
  }

  if (!mode && !isPreviewMode) {
    if (profile.role === 'teacher') {
      return (
        <TeacherDashboard 
          profile={profile} 
          onLogout={handleLogout}
          onPreviewLesson={(l) => {
            setCurrentLessonId(l.id);
            setMode('CLASSROOM');
            setStep('INTRO');
            setIsPreviewMode(true);
          }}
        />
      );
    } else {
      return (
        <StudentDashboard 
          profile={profile} 
          onLogout={handleLogout}
          onSelectLesson={(l) => {
            setCurrentLessonId(l.id);
            setMode('HOMEWORK');
            setStep('INTRO');
          }}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-blue-100 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setMode(null);
              setIsPreviewMode(false);
            }}
            className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-[#636E72] border border-gray-100"
          >
            <Home size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black text-[#2D3436] tracking-tight">{lesson.title}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#4A90E2] uppercase tracking-widest">{mode}</span>
              {isPreviewMode && (
                <span className="text-[10px] font-black text-[#FF9800] uppercase tracking-widest bg-[#FFF3E0] px-2 py-0.5 rounded">PREVIEW</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Step {step}</span>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600"><Settings size={24} /></button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'INTRO' && renderIntro()}
            {step === 'FULL_LISTENING' && renderFullListening()}
            {step === 'COMPREHENSION' && renderComprehension()}
            {step === 'SENTENCE_PRACTICE' && renderSentencePractice()}
            {step === 'FULL_SCRIPT' && renderFullScript()}
            {step === 'READING_CLASS' && renderReadingClass()}
            {step === 'GRAMMAR' && renderGrammar()}
            {step === 'VOCAB' && renderVocab()}
            {step === 'LESSON_FINISHED' && renderLessonFinished()}
            {step === 'HOMEWORK_INTRO' && renderHomeworkIntro()}
            {step === 'HOMEWORK_DICTATION' && renderHomeworkDictation()}
            {step === 'HOMEWORK_UNSCRAMBLE' && renderHomeworkUnscramble()}
            {step === 'HOMEWORK_VOCAB_TEST' && renderHomeworkVocabTest()}
            {step === 'COMPLETED' && renderCompleted()}
          </motion.div>
        </AnimatePresence>
      </main>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl font-bold shadow-2xl z-[100] text-white ${
            feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {feedback.message}
        </motion.div>
      )}

      {/* Navigation Footer (Optional for some steps) */}
      {['INTRO', 'COMPLETED', 'HOMEWORK_INTRO', 'LESSON_FINISHED'].indexOf(step) === -1 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 md:hidden">
          <div className="flex justify-between max-w-4xl mx-auto">
            <Button variant="ghost" onClick={prevStep}><ChevronLeft /> 이전</Button>
            <Button variant="ghost" onClick={nextStep}>다음 <ChevronRight /></Button>
          </div>
        </footer>
      )}
      </div>
  );
}
