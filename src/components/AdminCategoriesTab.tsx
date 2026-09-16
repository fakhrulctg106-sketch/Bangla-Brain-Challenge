import React, { useState } from 'react';
import { QuizCategory, UserProfile } from '../types';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
} from '../services/db';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';

interface AdminCategoriesTabProps {
  categories: QuizCategory[];
  userProfile: UserProfile;
  canManage: boolean;
  onRefresh: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  userProfile,
  canManage,
  onRefresh,
  showToast,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Form states
  const [catId, setCatId] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('BookOpen');
  const [order, setOrder] = useState(1);
  const [isIslamic, setIsIslamic] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingCatId(null);
    setCatId('');
    setNameBn('');
    setNameEn('');
    setDescription('');
    setIcon('BookOpen');
    setOrder(categories.length + 1);
    setIsIslamic(false);
    setIsActive(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (cat: QuizCategory) => {
    setEditingCatId(cat.id);
    setCatId(cat.id);
    setNameBn(cat.nameBn);
    setNameEn(cat.nameEn);
    setDescription(cat.description);
    setIcon(cat.icon || 'BookOpen');
    setOrder(cat.order || 1);
    setIsIslamic(!!cat.isIslamic);
    setIsActive(cat.isActive ?? true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      showToast('error', 'শুধুমাত্র অনুমোদিত অ্যাডমিন ও মালিক ক্যাটাগরি ব্যবস্থাপনা করতে পারেন।');
      return;
    }

    if (!catId.trim() || !nameBn.trim() || !nameEn.trim()) {
      showToast('error', 'ক্যাটাগরি আইডি, বাংলা নাম ও ইংরেজি নাম আবশ্যক।');
      return;
    }

    try {
      const payload: QuizCategory = {
        id: catId.trim().toLowerCase().replace(/\s+/g, '-'),
        nameBn: nameBn.trim(),
        nameEn: nameEn.trim(),
        description: description.trim(),
        icon: icon.trim() || 'BookOpen',
        order: Number(order) || 1,
        isIslamic,
        isActive,
      };

      if (editingCatId) {
        await updateCategory(editingCatId, payload, userProfile);
        showToast('success', `ক্যাটাগরি "${nameBn}" সফলভাবে আপডেট করা হয়েছে।`);
      } else {
        await createCategory(payload, userProfile);
        showToast('success', `নতুন ক্যাটাগরি "${nameBn}" সফলভাবে তৈরি করা হয়েছে।`);
      }

      setShowModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'ক্যাটাগরি সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  const handleToggle = async (cat: QuizCategory) => {
    if (!canManage) {
      showToast('error', 'শুধুমাত্র অনুমোদিত অ্যাডমিন ও মালিক ক্যাটাগরি সক্রিয়/নিষ্ক্রিয় করতে পারেন।');
      return;
    }

    try {
      const updated = await toggleCategoryActive(cat.id, cat.isActive ?? true, userProfile);
      showToast('info', `ক্যাটাগরি "${cat.nameBn}" ${updated ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'} করা হয়েছে।`);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'ক্যাটাগরি স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  const handleDelete = async (cat: QuizCategory) => {
    if (!canManage) {
      showToast('error', 'শুধুমাত্র অনুমোদিত অ্যাডমিন ও মালিক ক্যাটাগরি মুছতে পারেন।');
      return;
    }

    if (!window.confirm(`আপনি কি নিশ্চিত যে ক্যাটাগরি "${cat.nameBn}" মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      await deleteCategory(cat.id, userProfile);
      showToast('info', `ক্যাটাগরি "${cat.nameBn}" ডাটাবেস থেকে মুছে ফেলা হয়েছে।`);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'ক্যাটাগরি মুছতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div id="admin-categories-tab" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-teal-700" />
            <span>কুইজ ক্যাটাগরি ব্যবস্থাপনা</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            অ্যাপের সকল বিষয়ভিত্তিক ক্যাটাগরি নিয়ন্ত্রণ, প্রদর্শন ক্রম ও সক্রিয়তা নির্ধারণ করুন।
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ক্যাটাগরি যোগ করুন</span>
          </button>
        )}
      </div>

      {!canManage && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>মডারেটর রিড-অনলি মোড:</strong> ক্যাটাগরি সম্পাদনা বা পরিবর্তনের অনুমতি শুধুমাত্র অ্যাডমিন ও ওনারের রয়েছে।
          </span>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`p-4 rounded-2xl border transition-all ${
              cat.isActive
                ? 'bg-white border-slate-200 shadow-2xs'
                : 'bg-slate-50 border-slate-200 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {cat.order || '•'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">{cat.nameBn}</h4>
                    <span className="text-xs text-slate-400">({cat.nameEn})</span>
                    {cat.isIslamic && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>ইসলামিক জিকে</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span>আইডি: <code className="text-slate-600 font-mono">{cat.id}</code></span>
                    <span>•</span>
                    <span>আইকন: {cat.icon || 'BookOpen'}</span>
                    <span>•</span>
                    <span className={cat.isActive ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                      {cat.isActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(cat)}
                    title={cat.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                      cat.isActive
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat.isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    title="সম্পাদনা করুন"
                    className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-50 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    title="মুছে ফেলুন"
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-teal-700" />
                <span>{editingCatId ? 'ক্যাটাগরি সম্পাদনা করুন' : 'নতুন ক্যাটাগরি তৈরি করুন'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাটাগরি আইডি (Slug ID)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCatId}
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  placeholder="যেমন: bangla-literature"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">বাংলা নাম</label>
                  <input
                    type="text"
                    required
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    placeholder="বাংলা সাহিত্য"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ইংরেজি নাম</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Bangla Literature"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সংক্ষিপ্ত বিবরণ</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="এই ক্যাটাগরির অন্তর্ভুক্ত বিষয়ের পরিচিতি..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রদর্শন ক্রম (Order)</label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">আইকন নাম (Lucide Icon)</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="BookOpen, Globe, Brain..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIslamic}
                    onChange={(e) => setIsIslamic(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    ইসলামিক ক্যাটাগরি (কুরআন ও হাদিসের প্রামাণিক রেফারেন্স বাধ্যতামূলক)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    সক্রিয় রাখুন (শিক্ষার্থীরা এই ক্যাটাগরি কুইজ খেলতে পারবে)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                  {editingCatId ? 'সংরক্ষণ করুন' : 'তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
