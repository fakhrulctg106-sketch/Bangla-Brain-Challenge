import React, { useState, useEffect } from 'react';
import { QuizCategory, QuizQuestion, UserProfile } from '../types';
import { fetchQuizQuestions, submitQuizAttempt } from '../services/db';
import { audio } from '../services/audio';
import { ads } from '../services/ads';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  HelpCircle,
  BookOpen,
  Trophy,
  Flame,
  Award
} from 'lucide-react';

interface QuizRunnerProps {
  category: QuizCategory;
  user: UserProfile;
  onFinish: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ category, user, onFinish }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(25); // 25 seconds per question
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptToken] = useState(() => `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const [answersHistory, setAnswersHistory] = useState<any[]>([]);

  // Load 10 questions for the quiz
  useEffect(() => {
    let mounted = true;
    fetchQuizQuestions(category.id, 10, user.uid).then((data) => {
      if (mounted) {
        setQuestions(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, [category.id, user.uid]);

  // Question Timer
  useEffect(() => {
    if (isAnswerSubmitted || isCompleted || questions.length === 0) return;

    if (timeRemaining <= 0) {
      handleOptionSelect(-1); // Timeout marked as wrong
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isAnswerSubmitted, isCompleted, questions.length]);

  const currentQ = questions[currentIndex];

  const handleOptionSelect = (index: number) => {
    if (isAnswerSubmitted || !currentQ) return;

    setSelectedOption(index);
    setIsAnswerSubmitted(true);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      audio.playCorrect();
      setScore((s) => s + 10);
      setCorrectCount((c) => c + 1);
    } else {
      audio.playWrong();
    }

    setAnswersHistory((prev) => [
      ...prev,
      {
        questionId: currentQ.id || `q_${currentIndex}`,
        question: currentQ.question,
        selectedIndex: index,
        correctIndex: currentQ.correctIndex,
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = () => {
    audio.playClick();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setTimeRemaining(25);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setIsCompleted(true);
    setIsSubmitting(true);
    audio.playVictory();

    // Trigger celebratory confetti if score is strong
    if (correctCount >= 7) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Register with ad cadence tracking (Natural breaks only, not after every question)
    ads.registerQuizCompletion();
    if (ads.shouldShowBreakAd()) {
      ads.showInterstitialAd();
    }

    try {
      await submitQuizAttempt(user, {
        userId: user.uid,
        attemptToken,
        categoryId: category.id,
        score: score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        timeSpentSeconds: questions.length * 25 - timeRemaining,
        answers: answersHistory,
      });
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">১০টি বাছাইকৃত প্রশ্ন লোড করা হচ্ছে...</p>
        <p className="text-xs text-slate-400 mt-1">অনুগ্রহ করে কয়েক মুহূর্ত অপেক্ষা করুন</p>
      </div>
    );
  }

  // Quiz Results Summary Screen
  if (isCompleted) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    return (
      <div id="quiz-result-view" className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-xs">
        <div className="inline-flex p-4 bg-teal-50 rounded-2xl text-teal-700 mb-4">
          <Trophy className="w-12 h-12" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800">কুইজ সম্পন্ন হয়েছে!</h2>
        <p className="text-sm text-slate-600 mt-1">বিষয়: {category.nameBn}</p>

        {/* Score Card */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">মোট স্কোর</p>
            <p className="text-xl font-bold text-teal-700 mt-0.5">+{score}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-600">সঠিক উত্তর</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{correctCount}/{questions.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">সঠিকতার হার</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{percentage}%</p>
          </div>
        </div>

        {/* Anti-cheat cloud sync status */}
        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 mb-6 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>
            {isSubmitting
              ? 'স্কোর ও অগ্রগতি সুরক্ষিত ক্লাউড ডাটাবেসে সেভ হচ্ছে...'
              : 'স্কোর সফলভাবে সংরক্ষিত এবং লিডারবোর্ডে যুক্ত হয়েছে।'}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            id="quiz-play-again-btn"
            onClick={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsAnswerSubmitted(false);
              setScore(0);
              setCorrectCount(0);
              setTimeRemaining(25);
              setIsCompleted(false);
              setAnswersHistory([]);
            }}
            className="flex-1 py-3 px-4 border border-slate-300 hover:bg-slate-50 font-medium text-slate-700 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>পুনরায় খেলুন</span>
          </button>
          <button
            id="quiz-back-home-btn"
            onClick={onFinish}
            className="flex-1 py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>মূল পাতায় ফিরে যান</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="quiz-runner-container" className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            {category.nameBn}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            প্রশ্ন {currentIndex + 1} / {questions.length}
          </p>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          timeRemaining <= 5
            ? 'bg-rose-100 text-rose-700 animate-pulse'
            : 'bg-slate-100 text-slate-700'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          <span>{timeRemaining} সেকেন্ড</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-teal-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Text */}
      <div className="min-h-18 mb-6">
        <h3 className="text-lg font-bold text-slate-900 leading-snug">
          {currentQ.question}
        </h3>
      </div>

      {/* 4 Answer Options */}
      <div className="space-y-3 mb-6">
        {currentQ.options.map((option, idx) => {
          let btnClass = 'border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-slate-800';
          let icon = null;

          if (isAnswerSubmitted) {
            if (idx === currentQ.correctIndex) {
              btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
            } else if (idx === selectedOption) {
              btnClass = 'border-rose-500 bg-rose-50 text-rose-900';
              icon = <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
            } else {
              btnClass = 'border-slate-200 opacity-50 text-slate-500';
            }
          }

          return (
            <button
              key={idx}
              id={`quiz-option-${idx}`}
              disabled={isAnswerSubmitted}
              onClick={() => handleOptionSelect(idx)}
              className={`w-full p-3.5 text-left border rounded-xl text-sm transition-all flex items-center justify-between cursor-pointer disabled:cursor-default ${btnClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </div>
              {icon}
            </button>
          );
        })}
      </div>

      {/* Feedback & Short Explanation (Shown immediately after answering) */}
      {isAnswerSubmitted && (
        <div className="space-y-3 animate-fadeIn">
          <div className={`p-4 rounded-xl border ${
            selectedOption === currentQ.correctIndex
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-2">
              <Info className={`w-4 h-4 mt-0.5 shrink-0 ${
                selectedOption === currentQ.correctIndex ? 'text-emerald-700' : 'text-amber-700'
              }`} />
              <div className="text-xs space-y-1">
                <p className={`font-semibold ${
                  selectedOption === currentQ.correctIndex ? 'text-emerald-800' : 'text-amber-900'
                }`}>
                  {selectedOption === currentQ.correctIndex ? 'সঠিক উত্তর! (+১০ পয়েন্ট)' : 'ভুল উত্তর!'}
                </p>
                <p className="text-slate-700 leading-relaxed">{currentQ.explanation}</p>
                {/* Authentic Reference for Islamic GK or educational accuracy */}
                {currentQ.sourceReference && (
                  <p className="text-teal-800 font-medium pt-1 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    <span>প্রমাণ/রেফারেন্স: {currentQ.sourceReference}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            id="quiz-next-question-btn"
            onClick={handleNextQuestion}
            className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>{currentIndex + 1 < questions.length ? 'পরবর্তী প্রশ্ন' : 'ফলাফল দেখুন'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
