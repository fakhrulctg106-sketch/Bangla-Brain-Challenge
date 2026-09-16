import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { fetchLeaderboard } from '../services/db';
import { Trophy, Medal, Crown, Calendar, Sparkles, User } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLeaderboard(period, 25).then((data) => {
      if (active) {
        setEntries(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [period]);

  const periods = [
    { key: 'daily', label: 'দৈনিক (Daily)' },
    { key: 'weekly', label: 'সাপ্তাহিক (Weekly)' },
    { key: 'monthly', label: 'মাসিক (Monthly)' },
    { key: 'all_time', label: 'সর্বকালের সেরা (All Time)' },
  ];

  return (
    <div id="leaderboard-container" className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <span>শীর্ষ মেধাতালিকা (Leaderboard)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            প্রতিটি কুইজ, গণিত ও পাজল চ্যালেঞ্জের অর্জিত স্কোরের ভিত্তিতে জাতীয় তালিকা
          </p>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        {periods.map((p) => (
          <button
            key={p.key}
            id={`leaderboard-tab-${p.key}`}
            onClick={() => setPeriod(p.key as any)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              period === p.key
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Ranking List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">মেধাতালিকা আপডেট হচ্ছে...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">এই সময়কালের জন্য এখনো কোনো স্কোর নেই</p>
            <p className="text-xs text-slate-400 mt-1">প্রথম স্থান অধিকার করতে একটি কুইজ শুরু করুন!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              let rankBadge = null;

              if (rank === 1) {
                rankBadge = (
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    <Crown className="w-4 h-4" />
                  </div>
                );
              } else if (rank === 2) {
                rankBadge = (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    <Medal className="w-4 h-4" />
                  </div>
                );
              } else if (rank === 3) {
                rankBadge = (
                  <div className="w-7 h-7 rounded-full bg-amber-700/10 text-amber-800 flex items-center justify-center font-bold text-xs">
                    <Medal className="w-4 h-4" />
                  </div>
                );
              } else {
                rankBadge = (
                  <div className="w-7 h-7 text-slate-400 flex items-center justify-center font-bold text-xs">
                    #{rank}
                  </div>
                );
              }

              return (
                <div
                  key={entry.id || idx}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {rankBadge}
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs overflow-hidden">
                      {entry.userPhoto ? (
                        <img src={entry.userPhoto} alt={entry.userName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.userName}</p>
                      {entry.studentId && (
                        <p className="text-xs text-slate-400">{entry.studentId}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-teal-700">{entry.score}</span>
                    <span className="text-xs text-slate-500 ml-1">পয়েন্ট</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
