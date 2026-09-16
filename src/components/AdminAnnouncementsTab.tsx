import React, { useState } from 'react';
import { UserProfile, AppAnnouncement } from '../types';
import { createAnnouncement, deleteAnnouncement } from '../services/db';
import {
  Megaphone,
  Plus,
  Trash2,
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface AdminAnnouncementsTabProps {
  announcements: AppAnnouncement[];
  userProfile: UserProfile;
  canManage: boolean;
  onRefresh: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const AdminAnnouncementsTab: React.FC<AdminAnnouncementsTabProps> = ({
  announcements,
  userProfile,
  canManage,
  onRefresh,
  showToast,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      showToast('error', 'শুধুমাত্র অ্যাডমিন ও মালিক নোটিশ প্রকাশ করতে পারেন।');
      return;
    }

    if (!title.trim() || !content.trim()) {
      showToast('error', 'ঘোষণার শিরোনাম ও মূল বিবরণ লিখুন।');
      return;
    }

    setSubmitting(true);
    try {
      await createAnnouncement(
        {
          title: title.trim(),
          content: content.trim(),
          priority,
          publishedBy: userProfile.displayName || userProfile.email,
        },
        userProfile
      );

      showToast('success', 'নতুন ঘোষণা শিক্ষার্থীদের জন্য প্রকাশিত হয়েছে।');
      setTitle('');
      setContent('');
      setPriority('normal');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'ঘোষণা তৈরি ব্যর্থ হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ann: AppAnnouncement) => {
    if (!canManage) {
      showToast('error', 'শুধুমাত্র অ্যাডমিন ও মালিক ঘোষণা মুছতে পারেন।');
      return;
    }

    if (!window.confirm(`আপনি কি "${ann.title}" ঘোষণাটি মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      await deleteAnnouncement(ann.id, userProfile);
      showToast('info', 'ঘোষণা মুছে ফেলা হয়েছে।');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'ঘোষণা মুছতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div id="admin-announcements-tab" className="space-y-6">
      {/* Create Announcement Form */}
      {canManage && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Megaphone className="w-5 h-5 text-teal-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">নতুন প্রাতিষ্ঠানিক ঘোষণা / নোটিশ প্রকাশ</h3>
              <p className="text-xs text-slate-400">সকল শিক্ষার্থীর হোমস্ক্রিন ও নোটিফিকেশনে দৃশ্যমান হবে</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোটিশের শিরোনাম</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: সাপ্তাহিক ইসলামিক কুইজ প্রতিযোগিতা সংক্রান্ত"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গুরুত্ব স্তর (Priority)</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                >
                  <option value="normal">সাধারণ (Normal)</option>
                  <option value="important">জরুরি (Important)</option>
                  <option value="urgent">অতি জরুরি (Urgent)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ঘোষণার বিস্তারিত তথ্য</label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="শিক্ষার্থীদের উদ্দেশ্যে বিস্তারিত বার্তা লিখুন..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'প্রকাশ হচ্ছে...' : 'ঘোষণা প্রকাশ করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-700" />
            <span>প্রকাশিত ঘোষণাসমূহ ({announcements.length})</span>
          </h3>
        </div>

        {announcements.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
            বর্তমানে কোনো সক্রিয় ঘোষণা নেই।
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`p-5 rounded-2xl border bg-white shadow-2xs space-y-2.5 ${
                  ann.priority === 'urgent'
                    ? 'border-rose-300 bg-rose-50/20'
                    : ann.priority === 'important'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ann.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : ann.priority === 'important'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ann.priority === 'urgent'
                          ? 'অতি জরুরি'
                          : ann.priority === 'important'
                          ? 'গুরুত্বপূর্ণ'
                          : 'সাধারণ'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                      {ann.content}
                    </p>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(ann)}
                      title="ঘোষণা মুছুন"
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>প্রকাশক: <strong className="text-slate-600">{ann.publishedBy}</strong></span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
