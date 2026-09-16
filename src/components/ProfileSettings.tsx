import React, { useState } from 'react';
import { UserProfile } from '../types';
import { audio } from '../services/audio';
import {
  User,
  Flame,
  Award,
  BookOpen,
  Volume2,
  VolumeX,
  Shield,
  Phone,
  Mail,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  CheckCircle2
} from 'lucide-react';

interface ProfileSettingsProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user,
  onLogout,
  onOpenAdmin,
  isAdmin,
}) => {
  const [soundOn, setSoundOn] = useState(() => audio.isSoundEnabled());
  const [darkMode, setDarkMode] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audio.setSoundEnabled(next);
    if (next) audio.playClick();
  };

  return (
    <div id="profile-settings-container" className="max-w-xl mx-auto space-y-6">
      {/* Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
        <div className="w-20 h-20 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-2xl border-2 border-teal-200">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold text-slate-800">{user.displayName}</h2>
        <p className="text-xs text-slate-400">{user.email}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
          <span>আইডি: {user.studentId}</span>
          <span className="text-slate-300">•</span>
          {user.role === 'owner' || user.role === 'admin' ? (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded-full text-[11px] font-bold">
              অ্যাডমিনিস্ট্রেটর (Admin)
            </span>
          ) : user.role === 'moderator' ? (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-[11px] font-bold">
              মডারেটর (Moderator)
            </span>
          ) : (
            <span className="text-teal-700 font-medium">ব্যবহারকারী</span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
            <span className="text-xs text-teal-600 font-medium">মোট স্কোর</span>
            <p className="text-xl font-extrabold text-teal-800 mt-0.5">{user.totalScore || 0}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-center justify-center gap-1 text-xs text-amber-600 font-medium">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>দৈনিক স্ট্রিক</span>
            </div>
            <p className="text-xl font-extrabold text-amber-800 mt-0.5">{user.currentStreak || 1} দিন</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-600 font-medium">কুইজ খেলা</span>
            <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{user.quizzesPlayed || 0} বার</p>
          </div>
        </div>
      </div>

      {/* Settings & Preferences */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800">অ্যাপ সেটিংস ও প্রিফারেন্স</h3>

        <div className="divide-y divide-slate-100">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {soundOn ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="text-xs font-semibold text-slate-700">শব্দ ও সাউন্ড এফেক্টস</span>
            </div>
            <button
              onClick={toggleSound}
              className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                soundOn ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {soundOn ? 'চালু (ON)' : 'বন্ধ (OFF)'}
            </button>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {darkMode ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className="text-xs font-semibold text-slate-700">লাইট / ডার্ক মোড</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-700 cursor-pointer"
            >
              {darkMode ? 'ডার্ক মোড' : 'লাইট মোড'}
            </button>
          </div>

          {isAdmin && (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="text-xs font-semibold text-slate-800">অ্যাডমিন কন্ট্রোল প্যানেল</span>
                  <p className="text-[10px] text-slate-400">প্রশ্ন ব্যাংক, রিপোর্ট ও পরিচালনা</p>
                </div>
              </div>
              <button
                onClick={onOpenAdmin}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                প্রবেশ করুন
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Developer & Platform Info */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">ডেভেলপার পরিচিতি ও যোগাযোগ</h3>
        <div>
          <p className="text-sm font-bold text-slate-100">Developer: Fakhrul Islam</p>
          <p className="text-xs text-slate-300 mt-0.5">Software Architect & Platform Lead</p>
          <p className="text-xs text-teal-200 mt-2 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            <span>fakhrulctg106@gmail.com</span>
          </p>
        </div>
        <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2.5">
          Bangla Brain Challenge — প্রোডাকশন-রেডি ক্রস-প্ল্যাটফর্ম শিক্ষামূলক প্ল্যাটফর্ম (Web, Android APK, iOS Ready)।
        </p>
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-rose-200"
      >
        <LogOut className="w-4 h-4" />
        <span>লগআউট করুন</span>
      </button>
    </div>
  );
};
