import React, { useState, useEffect } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { fetchRecentChats, deleteAbusiveMessage } from '../services/db';
import {
  MessageSquare,
  Trash2,
  AlertTriangle,
  Search,
  ShieldAlert,
  Clock,
  User,
} from 'lucide-react';

interface AdminMessagesTabProps {
  userProfile: UserProfile;
  canManage: boolean;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const AdminMessagesTab: React.FC<AdminMessagesTabProps> = ({
  userProfile,
  canManage,
  showToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const list = await fetchRecentChats();
      setMessages(list);
    } catch (e) {
      console.warn('Error loading chat messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!canManage) {
      showToast('error', 'শুধুমাত্র মডারেটর, অ্যাডমিন ও মালিক বার্তা মডারেশন করতে পারেন।');
      return;
    }

    const reason = window.prompt('বার্তা মুছে ফেলার কারণ লিখুন (অডিট লগে সংরক্ষিত হবে):', 'অনুপযুক্ত বা আপত্তিকর ভাষা');
    if (!reason || !reason.trim()) return;

    try {
      await deleteAbusiveMessage(msg.id, reason.trim(), userProfile);
      showToast('info', 'আপত্তিকর বার্তা সফলভাবে মুছে ফেলা হয়েছে এবং অডিট লগে রেকর্ড করা হয়েছে।');
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err: any) {
      console.error(err);
      showToast('error', 'বার্তা মুছতে সমস্যা হয়েছে।');
    }
  };

  const filtered = messages.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.text.toLowerCase().includes(term) ||
      m.senderName.toLowerCase().includes(term) ||
      (m.senderId || '').toLowerCase().includes(term)
    );
  });

  return (
    <div id="admin-messages-tab" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-700" />
            <span>বার্তা ও চ্যাট মডারেশন</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            শিক্ষার্থীদের রিয়েলটাইম চ্যাট পর্যালোচনা করুন এবং কোনো আপত্তিকর বার্তা থাকলে মুছে ফেলুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="বার্তা বা প্রেরকের নাম খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
          বার্তা লোড হচ্ছে...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
          {searchTerm ? 'অনুসন্ধানের সাথে কোনো বার্তা মেলেনি।' : 'বর্তমানে পর্যালোচনার জন্য কোনো বার্তা নেই।'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filtered.map((msg) => (
            <div key={msg.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors">
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{msg.senderName}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">({msg.senderId})</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {msg.text}
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(msg)}
                  title="আপত্তিকর বার্তা মুছে ফেলুন"
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>মুছুন</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
