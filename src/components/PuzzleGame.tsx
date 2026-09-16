import React, { useState } from 'react';
import { UserProfile } from '../types';
import { audio } from '../services/audio';
import { submitQuizAttempt } from '../services/db';
import confetti from 'canvas-confetti';
import { Brain, Check, HelpCircle, ArrowRight } from 'lucide-react';

interface PuzzleGameProps {
  user: UserProfile;
  onBack: () => void;
}

interface BengaliRiddle {
  id: number;
  question: string;
  hint: string;
  answer: string;
  options: string[];
}

const RIDDLES: BengaliRiddle[] = [
  {
    id: 1,
    question: 'সকালে চার পায়ে হাঁটে, দুপুরে দুই পায়ে, সন্ধ্যায় তিন পায়ে হাঁটে—বল তো আমি কে?',
    hint: 'জীবনের শৈশব, যৌবন ও বার্ধক্যের রূপক',
    answer: 'মানুষ',
    options: ['মানুষ', 'ঘোড়া', 'রোবট', 'গাছ'],
  },
  {
    id: 2,
    question: 'যত বেশি টানবে, সে তত বেশি ছোট হবে—জিনিসটি কী?',
    hint: 'ধোঁয়া উদগীরণকারী বস্তু',
    answer: 'সিগারেট / বিড়ি',
    options: ['দড়ি', 'সিগারেট / বিড়ি', 'রাবার ব্যান্ড', 'সুতা'],
  },
  {
    id: 3,
    question: 'এমন কী জিনিস যা কাটলে বড় হয়, জোড়া দিলে ছোট হয়?',
    hint: 'মাটিতে তৈরি গর্ত',
    answer: 'গর্ত',
    options: ['গাছ', 'পুকুর', 'গর্ত', 'নদী'],
  },
  {
    id: 4,
    question: 'মুখ নেই কিন্তু কথা বলে, ডানা নেই কিন্তু আকাশে ওড়ে—জিনিসটি কী?',
    hint: 'চিঠিপত্র বা আধুনিক বার্তা',
    answer: 'মেঘ / চিঠি',
    options: ['মেঘ / চিঠি', 'ঘুড়ি', 'বায়ু', 'রেডিও'],
  },
  {
    id: 5,
    question: 'জলে জন্ম যার, কিন্তু জলে দিলে মারা যায়—জিনিসটি কী?',
    hint: 'রান্নায় আবশ্যকীয় উপাদান',
    answer: 'লবণ',
    options: ['মাছ', 'বরফ', 'লবণ', 'শ্যাওলা'],
  },
];

export const PuzzleGame: React.FC<PuzzleGameProps> = ({ user, onBack }) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const riddle = RIDDLES[index];

  const handleSelect = (opt: string) => {
    if (isAnswered) return;
    setSelectedOpt(opt);
    setIsAnswered(true);

    if (opt === riddle.answer) {
      audio.playCorrect();
      setScore((s) => s + 10);
    } else {
      audio.playWrong();
    }
  };

  const nextRiddle = () => {
    audio.playClick();
    if (index + 1 < RIDDLES.length) {
      setIndex((i) => i + 1);
      setSelectedOpt(null);
      setShowHint(false);
      setIsAnswered(false);
    } else {
      finishPuzzle();
    }
  };

  const finishPuzzle = async () => {
    setIsFinished(true);
    audio.playVictory();
    confetti({ particleCount: 70, spread: 60 });

    try {
      await submitQuizAttempt(user, {
        userId: user.uid,
        attemptToken: `puzzle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        categoryId: 'logic-puzzle',
        score: score,
        totalQuestions: RIDDLES.length,
        correctAnswers: score / 10,
        timeSpentSeconds: 90,
        answers: [],
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-xs">
        <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">ধাঁধা ও লজিক পাজল সম্পন্ন!</h2>
        <div className="my-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-3xl font-extrabold text-purple-700">+{score} পয়েন্ট</p>
          <p className="text-xs text-purple-600 mt-1">সঠিক উত্তর: {score / 10} / {RIDDLES.length}</p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          মেনুতে ফিরুন
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
          <Brain className="w-5 h-5" />
          <span>বাংলার প্রাচীন ও আধুনিক বুদ্ধির ধাঁধা</span>
        </div>
        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-semibold text-slate-700">
          {index + 1} / {RIDDLES.length}
        </span>
      </div>

      <div className="min-h-24 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4 flex items-center justify-center text-center">
        <p className="text-base font-semibold text-slate-800 leading-relaxed">
          "{riddle.question}"
        </p>
      </div>

      {!showHint ? (
        <button
          type="button"
          onClick={() => setShowHint(true)}
          className="mb-4 text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>ইঙ্গিত বা ক্লু দেখুন</span>
        </button>
      ) : (
        <div className="mb-4 p-2.5 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
          💡 ইঙ্গিত: {riddle.hint}
        </div>
      )}

      <div className="space-y-2.5 mb-6">
        {riddle.options.map((opt, i) => {
          let color = 'border-slate-200 hover:border-purple-400 hover:bg-purple-50/50';
          if (isAnswered) {
            if (opt === riddle.answer) {
              color = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold';
            } else if (opt === selectedOpt) {
              color = 'bg-rose-50 border-rose-500 text-rose-800 font-bold';
            } else {
              color = 'border-slate-200 opacity-40';
            }
          }

          return (
            <button
              key={i}
              disabled={isAnswered}
              onClick={() => handleSelect(opt)}
              className={`w-full p-3 text-left rounded-xl border text-sm font-medium transition-all cursor-pointer ${color}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <button
          onClick={nextRiddle}
          className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{index + 1 < RIDDLES.length ? 'পরবর্তী ধাঁধা' : 'ফলাফল'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
