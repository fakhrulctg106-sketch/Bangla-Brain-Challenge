import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { QuizRunner } from './components/QuizRunner';
import { MathChallenge } from './components/MathChallenge';
import { PuzzleGame } from './components/PuzzleGame';
import { LeaderboardView } from './components/LeaderboardView';
import { CommunicationView } from './components/CommunicationView';
import { AdminPanel } from './components/AdminPanel';
import { ProfileSettings } from './components/ProfileSettings';
import { PWAInstallButton } from './components/PWAInstallButton';
import { fetchCategories } from './services/db';
import { QuizCategory } from './types';
import { audio } from './services/audio';
import {
  Brain,
  Home,
  Trophy,
  MessageSquare,
  User,
  Shield,
  Flame,
  Moon,
  Globe,
  Flag,
  Atom,
  Calculator,
  BookOpen,
  Languages,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

type NavigationTab = 'home' | 'leaderboard' | 'chat' | 'profile' | 'admin';

const categoryIconMap: Record<string, React.ReactNode> = {
  Moon: <Moon className="w-5 h-5 text-emerald-600" />,
  Globe: <Globe className="w-5 h-5 text-blue-600" />,
  Flag: <Flag className="w-5 h-5 text-rose-600" />,
  Atom: <Atom className="w-5 h-5 text-indigo-600" />,
  Calculator: <Calculator className="w-5 h-5 text-amber-600" />,
  BookOpen: <BookOpen className="w-5 h-5 text-purple-600" />,
  Languages: <Languages className="w-5 h-5 text-teal-600" />,
  Brain: <Brain className="w-5 h-5 text-pink-600" />,
};

export default function App() {
  const { currentUser, userProfile, loading, logout, isOwner, isAdmin, isModerator, canAccessAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [activeQuizCategory, setActiveQuizCategory] = useState<QuizCategory | null>(null);
  const [inMathChallenge, setInMathChallenge] = useState(false);
  const [inPuzzleGame, setInPuzzleGame] = useState(false);

  useEffect(() => {
    fetchCategories().then((cats) => setCategories(cats));

    // Support browser hash routing for /admin direct access
    const checkHash = () => {
      const h = window.location.hash.toLowerCase();
      const p = window.location.pathname.toLowerCase();
      if (h === '#/admin' || h === '#admin' || p === '/admin') {
        setActiveTab('admin');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-semibold">Bangla Brain Challenge</h2>
        <p className="text-xs text-slate-400 mt-1">লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
      </div>
    );
  }

  // Registration/Login is strictly required before playing
  if (!currentUser || !userProfile) {
    return <AuthScreen />;
  }

  // Handle blocked user view
  if (userProfile.isBlocked) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl max-w-md w-full text-center border border-slate-200">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">অ্যাকাউন্ট সাময়িকভাবে স্থগিত</h2>
          <p className="text-xs text-slate-600 mt-2">
            নিয়ম লঙ্ঘনের কারণে আপনার অ্যাকাউন্ট ব্লক করা হয়েছে। পর্যালোচনার জন্য ডেভেলপার ফখরুল ইসলাম-এর সাথে যোগাযোগ করুন।
          </p>
          <button
            onClick={logout}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  const navigateTo = (tab: NavigationTab) => {
    audio.playClick();
    setActiveTab(tab);
    setActiveQuizCategory(null);
    setInMathChallenge(false);
    setInPuzzleGame(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-20 md:pb-6 font-sans antialiased">
      {/* Top Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="p-2 bg-teal-700 text-white rounded-xl shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                Bangla Brain Challenge
              </span>
              <span className="text-[10px] text-teal-700 font-semibold block">
                বাংলা ব্রেন চ্যালেঞ্জ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct PWA / APK Install Button */}
            <PWAInstallButton />

            {/* User Streak Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{userProfile.currentStreak || 1} দিন স্ট্রিক</span>
            </div>

            {/* Total Points Badge */}
            <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>{userProfile.totalScore || 0} পয়েন্ট</span>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="hidden md:flex items-center gap-1 ml-2 border-l border-slate-200 pl-3">
              <button
                onClick={() => navigateTo('home')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'home' ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                হোম
              </button>
              <button
                onClick={() => navigateTo('leaderboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'leaderboard' ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                মেধাতালিকা
              </button>
              <button
                onClick={() => navigateTo('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'chat' ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বার্তা ও কল
              </button>
              {canAccessAdmin && (
                <button
                  onClick={() => navigateTo('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'admin' ? 'bg-purple-700 text-white shadow-xs' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>অ্যাডমিন প্যানেল</span>
                </button>
              )}
              <button
                onClick={() => navigateTo('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'profile' ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                প্রোফাইল
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {/* Active Quiz Runner */}
        {activeQuizCategory && (
          <QuizRunner
            category={activeQuizCategory}
            user={userProfile}
            onFinish={() => setActiveQuizCategory(null)}
          />
        )}

        {/* Math Challenge Engine */}
        {inMathChallenge && (
          <MathChallenge user={userProfile} onBack={() => setInMathChallenge(false)} />
        )}

        {/* Puzzle Engine */}
        {inPuzzleGame && (
          <PuzzleGame user={userProfile} onBack={() => setInPuzzleGame(false)} />
        )}

        {/* Normal Tab Views */}
        {!activeQuizCategory && !inMathChallenge && !inPuzzleGame && (
          <>
            {activeTab === 'home' && (
              <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white p-6 rounded-2xl shadow-xs relative overflow-hidden">
                  <div className="relative z-10 max-w-xl">
                    <span className="text-xs uppercase font-bold tracking-wider text-teal-300">
                      দৈনিক জ্ঞান ও বুদ্ধিবৃত্তিক প্রতিযোগিতা
                    </span>
                    <h1 className="text-2xl md:text-3xl font-extrabold mt-1">
                      স্বাগতম, {userProfile.displayName}!
                    </h1>
                    <p className="text-teal-100 text-xs md:text-sm mt-2 leading-relaxed">
                      ১০টি করে প্রশ্নের সঠিক উত্তর দিন, তাৎক্ষণিক নির্ভরযোগ্য ব্যাখ্যা দেখুন এবং জাতীয় মেধাতালিকায় শীর্ষ স্থান অর্জন করুন।
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const islamicCat = categories.find((c) => c.id === 'islamic-gk');
                          if (islamicCat) setActiveQuizCategory(islamicCat);
                        }}
                        className="px-4 py-2 bg-white text-teal-900 rounded-xl text-xs font-bold hover:bg-teal-50 transition-colors cursor-pointer shadow-xs"
                      >
                        ইসলামিক কুইজ শুরু করুন
                      </button>
                      <button
                        onClick={() => setInMathChallenge(true)}
                        className="px-4 py-2 bg-teal-700/70 border border-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
                      >
                        গণিত স্পিড চ্যালেঞ্জ
                      </button>
                      {canAccessAdmin && (
                        <button
                          onClick={() => navigateTo('admin')}
                          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <ShieldCheck className="w-4 h-4 text-slate-950" />
                          <span>প্রশ্ন ব্যাংক ও অ্যাডমিন প্যানেল</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Challenge Modes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setInMathChallenge(true)}
                    className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                        <Calculator className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">গণিত স্পিড চ্যালেঞ্জ</h3>
                        <p className="text-xs text-slate-500">দ্রুত হিসাব ও মানসিক দক্ষতা বৃদ্ধি</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div
                    onClick={() => setInPuzzleGame(true)}
                    className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                        <Brain className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">ধাঁধা ও লজিক পাজল</h3>
                        <p className="text-xs text-slate-500">ঐতিহ্যবাহী বাংলা ধাঁধা ও যুক্তিতর্ক</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* 8 Primary Categories Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">কুইজ ক্যাটাগরি ও বিষয়সমূহ</h2>
                      <p className="text-xs text-slate-500">যেকোনো একটি বিষয় বেছে নিয়ে ১০টি প্রশ্নের কুইজ শুরু করুন</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        id={`category-card-${cat.id}`}
                        onClick={() => {
                          audio.playClick();
                          setActiveQuizCategory(cat);
                        }}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          cat.isIslamic
                            ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 hover:shadow-xs'
                            : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                              {categoryIconMap[cat.icon] || <Brain className="w-5 h-5 text-teal-600" />}
                            </div>
                            {cat.isIslamic && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                নির্ভরযোগ্য উৎস
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mb-1">{cat.nameBn}</h3>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-teal-700 font-semibold">
                          <span>১০টি প্রশ্ন খেলুন</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Developer Line Highlight */}
                <div className="p-4 bg-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>
                      প্ল্যাটফর্ম প্রতিষ্ঠাতা ও প্রধান সফটওয়্যার স্থপতি: <strong>ফখরুল ইসলাম (Fakhrul Islam)</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => navigateTo('chat')}
                    className="text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    সরাসরি বার্তা পাঠান &rarr;
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && <LeaderboardView />}

            {activeTab === 'chat' && <CommunicationView currentUser={userProfile} />}

            {activeTab === 'admin' && (
              canAccessAdmin ? (
                <AdminPanel />
              ) : (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto my-8">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">অনুমতি নেই (Access Denied)</h3>
                  <p className="text-xs text-slate-500 mt-2">
                    এই প্যানেলে প্রবেশের জন্য সিস্টেম ওনার (Fakhrul Islam) বা অনুমোদিত অ্যাডমিন এক্সেস প্রয়োজন।
                  </p>
                  <button
                    onClick={() => navigateTo('home')}
                    className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    হোম পেজে ফিরে যান
                  </button>
                </div>
              )
            )}

            {activeTab === 'profile' && (
              <ProfileSettings
                user={userProfile}
                onLogout={logout}
                onOpenAdmin={() => navigateTo('admin')}
                isAdmin={canAccessAdmin}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 flex justify-around items-center">
        <button
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer text-[10px] font-medium ${
            activeTab === 'home' ? 'text-teal-700 font-bold' : 'text-slate-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>হোম</span>
        </button>
        <button
          onClick={() => navigateTo('leaderboard')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer text-[10px] font-medium ${
            activeTab === 'leaderboard' ? 'text-teal-700 font-bold' : 'text-slate-500'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>র‌্যাংক</span>
        </button>
        <button
          onClick={() => navigateTo('chat')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer text-[10px] font-medium ${
            activeTab === 'chat' ? 'text-teal-700 font-bold' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>বার্তা</span>
        </button>
        {canAccessAdmin && (
          <button
            onClick={() => navigateTo('admin')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer text-[10px] font-medium ${
              activeTab === 'admin' ? 'text-purple-700 font-bold' : 'text-purple-600'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>অ্যাডমিন</span>
          </button>
        )}
        <button
          onClick={() => navigateTo('profile')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer text-[10px] font-medium ${
            activeTab === 'profile' ? 'text-teal-700 font-bold' : 'text-slate-500'
          }`}
        >
          <User className="w-5 h-5" />
          <span>প্রোফাইল</span>
        </button>
      </nav>
    </div>
  );
}
