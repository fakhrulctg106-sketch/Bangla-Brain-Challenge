import React, { useState, useEffect } from 'react';
import { UserProfile, AppConfiguration } from '../types';
import { fetchAppConfiguration, updateAppConfiguration, OWNER_EMAIL, DEVELOPER_NAME } from '../services/db';
import { ads } from '../services/ads';
import {
  Settings,
  Shield,
  Radio,
  Tv,
  Phone,
  MessageSquare,
  AlertOctagon,
  Save,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface AdminSettingsTabProps {
  userProfile: UserProfile;
  isOwner: boolean;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  userProfile,
  isOwner,
  showToast,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configuration state
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [webAdsEnabled, setWebAdsEnabled] = useState(true);
  const [admobBannerId, setAdmobBannerId] = useState('ca-app-pub-3940256099942544/6300978111');
  const [admobInterstitialId, setAdmobInterstitialId] = useState('ca-app-pub-3940256099942544/1033173712');
  const [admobRewardedId, setAdmobRewardedId] = useState('ca-app-pub-3940256099942544/5224354917');
  const [audioCallsEnabled, setAudioCallsEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await fetchAppConfiguration();
      if (cfg) {
        setAdsEnabled(cfg.adsEnabled ?? true);
        setWebAdsEnabled(cfg.webAdsEnabled ?? true);
        if (cfg.admobBannerId) setAdmobBannerId(cfg.admobBannerId);
        if (cfg.admobInterstitialId) setAdmobInterstitialId(cfg.admobInterstitialId);
        if (cfg.admobRewardedId) setAdmobRewardedId(cfg.admobRewardedId);
        setAudioCallsEnabled(cfg.audioCallsEnabled ?? true);
        setChatEnabled(cfg.chatEnabled ?? true);
        setMaintenanceMode(cfg.maintenanceMode ?? false);
        setUpdatedAt(cfg.updatedAt || null);
      }
    } catch (e) {
      console.warn('Could not load configuration:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('error', 'শুধুমাত্র সিস্টেম ওনার (Fakhrul Islam) বিজ্ঞাপন ও সিস্টেম সেটিংস সংরক্ষণ করতে পারেন।');
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<AppConfiguration> = {
        adsEnabled,
        webAdsEnabled,
        admobBannerId: admobBannerId.trim(),
        admobInterstitialId: admobInterstitialId.trim(),
        admobRewardedId: admobRewardedId.trim(),
        audioCallsEnabled,
        chatEnabled,
        maintenanceMode,
      };

      await updateAppConfiguration(updates, userProfile);

      // Synchronize live AdService instance
      ads.setAdsEnabled(adsEnabled);

      setUpdatedAt(new Date().toISOString());
      showToast('success', 'প্ল্যাটফর্ম ও বিজ্ঞাপন সেটিংস সফলভাবে ক্লাউড ডাটাবেসে সংরক্ষিত হয়েছে।');
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <Lock className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">সংরক্ষিত ওনার জোন (Owner Only)</h3>
        <p className="text-xs text-slate-500 mt-1">
          বিজ্ঞাপন ও গ্লোবাল সিস্টেম সেটিংস কনফিগারেশনের এক্সেস শুধুমাত্র প্রধান মালিকের ({DEVELOPER_NAME} - {OWNER_EMAIL}) জন্য সংরক্ষিত।
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
        সেটিংস লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div id="admin-settings-tab" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 to-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              OWNER PRIVILEGE
            </span>
            <span className="text-xs text-slate-300">প্রোজেক্ট আর্কিটেকচার</span>
          </div>
          <h3 className="text-lg font-bold">বিজ্ঞাপন ও সিস্টেম কনফিগারেশন</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Google AdMob আইডি, ওয়েব বিজ্ঞাপন, চ্যাট এবং অডিও-কল আর্কিটেকচার কেন্দ্রীয়ভাবে নিয়ন্ত্রণ করুন।
          </p>
        </div>
        <div className="hidden sm:block text-right text-xs text-slate-300">
          <p className="font-semibold text-white">{DEVELOPER_NAME}</p>
          <p className="text-[11px] text-amber-300">{OWNER_EMAIL}</p>
          {updatedAt && (
            <p className="text-[10px] text-slate-400 mt-1">
              সর্বশেষ আপডেট: {new Date(updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Ads Configuration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-amber-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-800">Google AdMob ও বিজ্ঞাপন নেটওয়ার্ক</h4>
                <p className="text-xs text-slate-400">অ্যান্ড্রয়েড নেটিভ ও ওয়েব প্ল্যাটফর্মের বিজ্ঞাপন নীতি</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full">
              {adsEnabled ? 'বিজ্ঞাপন সক্রিয়' : 'বিজ্ঞাপন নিষ্ক্রিয়'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">গ্লোবাল বিজ্ঞাপন সুইচ (Master Toggle)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">সমগ্র অ্যাপ জুড়ে বিজ্ঞাপন প্রদর্শন নিয়ন্ত্রণ</p>
              </div>
              <input
                type="checkbox"
                checked={adsEnabled}
                onChange={(e) => setAdsEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
              />
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">ওয়েব বিজ্ঞাপন সমর্থন (Web Ads)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">ব্রাউজারে ব্যানার ও নন-ইনট্রুসিভ অ্যাড প্রদর্শন</p>
              </div>
              <input
                type="checkbox"
                checked={webAdsEnabled}
                onChange={(e) => setWebAdsEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
              />
            </div>
          </div>

          {/* Ad IDs Inputs */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AdMob Banner Ad Unit ID (Android/iOS)
              </label>
              <input
                type="text"
                value={admobBannerId}
                onChange={(e) => setAdmobBannerId(e.target.value)}
                placeholder="ca-app-pub-3940256099942544/6300978111"
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">কুইজ তালিকার নিচে অ-বিরক্তিকর ব্যানার বিজ্ঞাপন</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AdMob Interstitial Ad Unit ID (Natural Breaks)
              </label>
              <input
                type="text"
                value={admobInterstitialId}
                onChange={(e) => setAdmobInterstitialId(e.target.value)}
                placeholder="ca-app-pub-3940256099942544/1033173712"
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                শুধুমাত্র সম্পূর্ণ কুইজ সমাপ্তির পর স্বাভাবিক বিরতিতে প্রদর্শিত হয়। কোনো একক প্রশ্নের মাঝে প্রদর্শিত হয় না।
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AdMob Rewarded Video Ad Unit ID (Extra Life & Hints)
              </label>
              <input
                type="text"
                value={admobRewardedId}
                onChange={(e) => setAdmobRewardedId(e.target.value)}
                placeholder="ca-app-pub-3940256099942544/5224354917"
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">শিক্ষার্থী স্বেচ্ছায় ইঙ্গিত বা অতিরিক্ত লাইফ পেতে দেখলে সক্রিয় হয়</p>
            </div>
          </div>
        </div>

        {/* Feature Switches Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-700" />
            <div>
              <h4 className="text-sm font-bold text-slate-800">যোগাযোগ ও প্ল্যাটফর্ম ফিচার সুইচ</h4>
              <p className="text-xs text-slate-400">রিয়েলটাইম অডিও ও টেক্সট কমিউনিকেশন সক্ষমতা</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold text-slate-800">অডিও-কল সিস্টেম</span>
                </div>
                <input
                  type="checkbox"
                  checked={audioCallsEnabled}
                  onChange={(e) => setAudioCallsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
              </div>
              <p className="text-[11px] text-slate-500">শিক্ষার্থীদের মাঝে 1-on-1 অডিও ভয়েস কল সুবিধা</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold text-slate-800">ডিরেক্ট চ্যাট বার্তা</span>
                </div>
                <input
                  type="checkbox"
                  checked={chatEnabled}
                  onChange={(e) => setChatEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
              </div>
              <p className="text-[11px] text-slate-500">শিক্ষার্থীদের মধ্যে তাৎক্ষণিক বার্তা ও গ্রুপ আলোচনা</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-slate-800">মেইনটেন্যান্স মোড</span>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                />
              </div>
              <p className="text-[11px] text-slate-500">সার্ভার রক্ষণাবেক্ষণের জন্য সাময়িক স্থগিতাদেশ</p>
            </div>
          </div>
        </div>

        {/* Submit CTA */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500">
            সেটিংস ক্লাউড ফায়ারস্টোর ডাটাবেসে তাৎক্ষণিকভাবে আপডেট হবে।
          </span>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
