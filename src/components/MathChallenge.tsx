import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { audio } from '../services/audio';
import { submitQuizAttempt } from '../services/db';
import confetti from 'canvas-confetti';
import { Calculator, Sparkles, Check, X, RotateCcw, Award } from 'lucide-react';

interface MathChallengeProps {
  user: UserProfile;
  onBack: () => void;
}

interface MathProblem {
  num1: number;
  num2: number;
  operator: '+' | '-' | '×';
  answer: number;
  options: number[];
}

export const MathChallenge: React.FC<MathChallengeProps> = ({ user, onBack }) => {
  const [problemIndex, setProblemIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const totalQuestions = 10;

  const generateProblem = (): MathProblem => {
    const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1 = 0;
    let n2 = 0;
    let ans = 0;

    if (op === '+') {
      n1 = Math.floor(Math.random() * 80) + 10;
      n2 = Math.floor(Math.random() * 80) + 10;
      ans = n1 + n2;
    } else if (op === '-') {
      n1 = Math.floor(Math.random() * 90) + 20;
      n2 = Math.floor(Math.random() * (n1 - 5)) + 5;
      ans = n1 - n2;
    } else {
      n1 = Math.floor(Math.random() * 12) + 2;
      n2 = Math.floor(Math.random() * 12) + 2;
      ans = n1 * n2;
    }

    const wrongOpts = new Set<number>();
    while (wrongOpts.size < 3) {
      const offset = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const wrong = ans + offset;
      if (wrong !== ans && wrong > 0) wrongOpts.add(wrong);
    }
    const options = [ans, ...Array.from(wrongOpts)].sort(() => 0.5 - Math.random());

    return { num1: n1, num2: n2, operator: op, answer: ans, options };
  };

  useEffect(() => {
    setCurrentProblem(generateProblem());
  }, []);

  useEffect(() => {
    if (gameOver || isAnswered || !currentProblem) return;

    if (timeLeft <= 0) {
      handleAnswerSelect(-999);
      return;
    }

    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isAnswered, gameOver, currentProblem]);

  const handleAnswerSelect = (chosen: number) => {
    if (isAnswered || !currentProblem) return;
    setSelectedAnswer(chosen);
    setIsAnswered(true);

    const isCorrect = chosen === currentProblem.answer;
    if (isCorrect) {
      audio.playCorrect();
      setScore((s) => s + 10);
    } else {
      audio.playWrong();
    }
  };

  const nextProblem = () => {
    audio.playClick();
    if (problemIndex + 1 < totalQuestions) {
      setProblemIndex((p) => p + 1);
      setCurrentProblem(generateProblem());
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(15);
    } else {
      finishChallenge();
    }
  };

  const finishChallenge = async () => {
    setGameOver(true);
    audio.playVictory();
    confetti({ particleCount: 70, spread: 60 });

    try {
      await submitQuizAttempt(user, {
        userId: user.uid,
        attemptToken: `math_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        categoryId: 'mathematics',
        score: score,
        totalQuestions: totalQuestions,
        correctAnswers: score / 10,
        timeSpentSeconds: 150,
        answers: [],
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!currentProblem) return null;

  if (gameOver) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-xs">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Calculator className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">গণিত চ্যালেঞ্জ সম্পন্ন!</h2>
        <p className="text-sm text-slate-500 mt-1">দ্রুত সমাধান করে আপনি পেয়েছেন</p>
        <div className="my-6 p-4 bg-indigo-50/70 rounded-xl border border-indigo-100">
          <p className="text-3xl font-extrabold text-indigo-700">+{score} পয়েন্ট</p>
          <p className="text-xs text-indigo-600 mt-1">সঠিক উত্তর: {score / 10} / {totalQuestions}</p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors cursor-pointer"
        >
          মেনুতে ফিরুন
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
          <Calculator className="w-5 h-5" />
          <span>গণিত স্পিড চ্যালেঞ্জ</span>
        </div>
        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-semibold text-slate-700">
          {problemIndex + 1} / {totalQuestions}
        </span>
      </div>

      <div className="text-center py-6">
        <div className="text-4xl font-extrabold tracking-wide text-slate-800">
          {currentProblem.num1} {currentProblem.operator} {currentProblem.num2} = ?
        </div>
        <p className="text-xs text-slate-400 mt-3">সময় বাকি: {timeLeft} সেকেন্ড</p>
      </div>

      <div className="grid grid-cols-2 gap-3 my-6">
        {currentProblem.options.map((opt, i) => {
          let btnColor = 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50';
          if (isAnswered) {
            if (opt === currentProblem.answer) {
              btnColor = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold';
            } else if (opt === selectedAnswer) {
              btnColor = 'bg-rose-50 border-rose-500 text-rose-800 font-bold';
            } else {
              btnColor = 'border-slate-200 opacity-40';
            }
          }

          return (
            <button
              key={i}
              disabled={isAnswered}
              onClick={() => handleAnswerSelect(opt)}
              className={`p-4 text-center rounded-xl border text-lg font-semibold transition-all cursor-pointer ${btnColor}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <button
          onClick={nextProblem}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          {problemIndex + 1 < totalQuestions ? 'পরবর্তী অঙ্ক' : 'ফলাফল দেখুন'}
        </button>
      )}
    </div>
  );
};
