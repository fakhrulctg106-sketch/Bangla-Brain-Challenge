import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  QuizQuestion,
  QuizCategory,
  AppAuditLog,
  ModerationReport,
  AppAnnouncement,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  logAdminAction,
  fetchAdminQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleQuestionActive,
  assignUserRole,
  removeUserRole,
  toggleUserBlock,
  fetchReports,
  updateReportStatus,
  fetchAnnouncements,
  OWNER_EMAIL,
  DEVELOPER_NAME,
} from '../services/db';
import { AdminCategoriesTab } from './AdminCategoriesTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminAnnouncementsTab } from './AdminAnnouncementsTab';
import { AdminMessagesTab } from './AdminMessagesTab';
import {
  Shield,
  Users,
  HelpCircle,
  FolderTree,
  AlertTriangle,
  History,
  Settings,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  UserPlus,
  Lock,
  Megaphone,
  BarChart3,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Crown,
  Key,
  Clock,
  UserX,
  Radio,
} from 'lucide-react';

type AdminTab =
  | 'dashboard'
  | 'questions'
  | 'categories'
  | 'users'
  | 'admins'
  | 'reports'
  | 'messages'
  | 'announcements'
  | 'settings'
  | 'audit';

export const AdminPanel: React.FC = () => {
  const { userProfile, role, isOwner, isAdmin, isModerator } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  // Question Management State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qCategoryId, setQCategoryId] = useState('islamic-gk');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [qSourceReference, setQSourceReference] = useState('');
  const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [qIsActive, setQIsActive] = useState(true);

  // Question Bank Search & Filter States
  const [qSearchTerm, setQSearchTerm] = useState('');
  const [qFilterCategory, setQFilterCategory] = useState('all');
  const [qFilterDifficulty, setQFilterDifficulty] = useState('all');
  const [qFilterStatus, setQFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Permission guards
  const canManageQuestions = isOwner || role === 'admin';
  const canManageCategories = isOwner || role === 'admin';
  const canManageUsers = isOwner || role === 'admin';
  const canManageReports = isOwner || isAdmin || isModerator;
  const canManageMessages = isOwner || isAdmin || isModerator;
  const canManageAnnouncements = isOwner || role === 'admin';
  const canManageSettings = isOwner;

  // User Management State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'owner' | 'admin' | 'moderator' | 'student'>('all');

  // Admin Assignment State (Owner only)
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [assigningRole, setAssigningRole] = useState(false);

  // Moderation Reports State
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [reportNoteMap, setReportNoteMap] = useState<Record<string, string>>({});

  // Announcements State
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AppAuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    loadDashboardStats();
    loadCategories();
    loadQuestions();
    if (isAdmin) {
      loadUsers();
      loadReportsData();
      loadAuditLogs();
      loadAnnouncementsData();
    }
  }, [isAdmin]);

  const loadDashboardStats = async () => {
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      setTotalUsers(uSnap.size);

      const qSnap = await getDocs(collection(db, 'questions'));
      setTotalQuestions(qSnap.size);

      const attSnap = await getDocs(collection(db, 'quizAttempts'));
      setTotalAttempts(attSnap.size);

      const repSnap = await getDocs(collection(db, 'reports'));
      setReportsCount(repSnap.size);
    } catch (e) {
      console.warn('Could not load dashboard stats:', e);
    }
  };

  const loadCategories = async () => {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const list: QuizCategory[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as QuizCategory), id: d.id }));
      setCategories(list);
    } catch (e) {
      console.warn('Could not load categories:', e);
    }
  };

  const loadQuestions = async () => {
    try {
      const list = await fetchAdminQuestions();
      setQuestions(list);
    } catch (e) {
      console.warn('Error loading questions in admin panel:', e);
    }
  };

  const loadUsers = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(100)));
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as UserProfile), uid: d.id }));
      setUsersList(list);
    } catch (e) {
      console.warn('Error loading users:', e);
    }
  };

  const loadReportsData = async () => {
    try {
      const list = await fetchReports();
      setReports(list);
    } catch (e) {
      console.warn('Error loading reports:', e);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const snap = await getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100)));
      const list: AppAuditLog[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as AppAuditLog), id: d.id }));
      setAuditLogs(list);
    } catch (e) {
      console.warn('Error loading audit logs:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadAnnouncementsData = async () => {
    try {
      const list = await fetchAnnouncements();
      setAnnouncements(list);
    } catch (e) {
      console.warn('Error loading announcements:', e);
    }
  };

  // Question handlers
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageQuestions) {
      showToast('error', 'শুধুমাত্র অনুমোদিত অ্যাডমিন ও মালিক প্রশ্ন ব্যাংক পরিচালনা করতে পারেন।');
      return;
    }

    if (!qText.trim() || qOptions.some((o) => !o.trim())) {
      showToast('error', 'অনুগ্রহ করে প্রশ্ন এবং ৪টি অপশন সঠিকভাবে পূরণ করুন।');
      return;
    }

    // Strict validation for Islamic GK category authentic reference
    if (qCategoryId === 'islamic-gk' && !qSourceReference.trim()) {
      showToast('error', 'ইসলামিক সাধারণ জ্ঞান ক্যাটাগরির জন্য প্রামাণিক রেফারেন্স (উৎস) বাধ্যতামূলক। নির্ভরযোগ্য রেফারেন্স ছাড়া প্রশ্ন প্রকাশ করা যাবে না।');
      return;
    }

    try {
      const payload = {
        categoryId: qCategoryId,
        question: qText.trim(),
        options: qOptions,
        correctIndex: qCorrectIndex,
        explanation: qExplanation.trim(),
        sourceReference: qSourceReference.trim(),
        difficulty: qDifficulty,
        isActive: qIsActive,
        isPublished: qIsActive,
      };

      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, payload, userProfile!);
        showToast('success', 'প্রশ্ন সফলভাবে আপডেট করা হয়েছে।');
      } else {
        await createQuestion(payload, userProfile!);
        showToast('success', 'নতুন প্রশ্ন ডাটাবেসে সফলভাবে যোগ করা হয়েছে।');
      }

      setShowQuestionModal(false);
      resetQuestionForm();
      loadQuestions();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'প্রশ্ন সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  const handleToggleQuestionActive = async (q: QuizQuestion) => {
    if (!canManageQuestions) {
      showToast('error', 'শুধুমাত্র অনুমোদিত অ্যাডমিন ও মালিক প্রশ্ন স্ট্যাটাস পরিবর্তন করতে পারেন।');
      return;
    }
    if (!q.id) return;
    try {
      const currentActive = q.isActive ?? true;
      const newStatus = await toggleQuestionActive(q.id, currentActive, userProfile!);
      showToast('info', `প্রশ্নটি ${newStatus ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'} করা হয়েছে।`);
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id ? { ...item, isActive: newStatus, isPublished: newStatus } : item
        )
      );
    } catch (e) {
      console.error(e);
      showToast('error', 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeleteQuestion = async (q: QuizQuestion) => {
    if (!canManageQuestions) {
      showToast('error', 'শুধুমাত্র অনুমোদিত অ্যাডমিন ও মালিক প্রশ্ন মুছতে পারেন।');
      return;
    }
    if (!q.id) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে এই প্রশ্নটি মুছে ফেলতে চান?')) return;
    try {
      await deleteQuestion(q.id, userProfile!);
      showToast('info', 'প্রশ্ন মুছে ফেলা হয়েছে।');
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
    } catch (e) {
      console.error(e);
      showToast('error', 'প্রশ্ন মুছতে সমস্যা হয়েছে।');
    }
  };

  const handleToggleBlock = async (u: UserProfile) => {
    if (!userProfile) return;
    if (u.role === 'owner' || u.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      showToast('error', 'মালিক (Owner) অ্যাকাউন্ট ব্লক করা সম্পূর্ণ নিষিদ্ধ!');
      return;
    }

    try {
      const newStatus = await toggleUserBlock(u.uid, u.email, !!u.isBlocked, userProfile);
      showToast('info', `ব্যবহারকারী "${u.displayName}" ${newStatus ? 'ব্লক' : 'আনব্লক'} করা হয়েছে।`);
      loadUsers();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'ব্যবহারকারীর স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  // Owner assigns admin role
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('error', 'শুধুমাত্র প্ল্যাটফর্মের প্রধান মালিক (Owner: Fakhrul Islam) অ্যাডমিন নিয়োগ করতে পারেন।');
      return;
    }

    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;

    if (email === OWNER_EMAIL.toLowerCase()) {
      showToast('error', 'প্রধান মালিক অ্যাকাউন্ট পূর্বনির্ধারিত।');
      return;
    }

    setAssigningRole(true);
    try {
      const targetUser = usersList.find((u) => u.email.toLowerCase() === email);
      if (!targetUser) {
        showToast('error', 'এই ইমেইলের কোনো নিবন্ধিত অ্যাকাউন্ট পাওয়া যায়নি। ব্যবহারকারীকে প্রথমে সাইনআপ করতে বলুন।');
        setAssigningRole(false);
        return;
      }

      await assignUserRole(targetUser.uid, targetUser.email, newAdminRole, userProfile!);
      showToast('success', `সফলভাবে ${targetUser.displayName}-কে ${newAdminRole.toUpperCase()} হিসেবে অনুমোদন প্রদান করা হয়েছে।`);
      setNewAdminEmail('');
      loadUsers();
      loadAuditLogs();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'অ্যাডমিন রোল বরাদ্দে সমস্যা হয়েছে।');
    } finally {
      setAssigningRole(false);
    }
  };

  // Owner revokes admin role
  const handleRevokeRole = async (u: UserProfile) => {
    if (!isOwner) {
      showToast('error', 'শুধুমাত্র প্রধান মালিক (Owner) অ্যাডমিন রোল বাতিল করতে পারেন।');
      return;
    }

    if (u.role === 'owner' || u.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      showToast('error', 'প্রধান মালিকের রোল বাতিল করা অসম্ভব!');
      return;
    }

    if (!window.confirm(`আপনি কি নিশ্চিত যে ${u.displayName} (${u.email})-এর প্রশাসনিক অনুমোদন প্রত্যাহার করতে চান?`)) {
      return;
    }

    try {
      await removeUserRole(u.uid, u.email, userProfile!);
      showToast('info', `${u.displayName}-এর রোল প্রত্যাহার করে সাধারণ শিক্ষার্থী করা হয়েছে।`);
      loadUsers();
      loadAuditLogs();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'রোল প্রত্যাহার করতে সমস্যা হয়েছে।');
    }
  };

  // Reports handler
  const handleUpdateReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    if (!userProfile) return;
    const note = reportNoteMap[reportId] || (status === 'resolved' ? 'সমাধান করা হয়েছে' : 'খারিজ করা হয়েছে');
    try {
      await updateReportStatus(reportId, status, note, userProfile);
      showToast('success', `রিপোর্টটি "${status === 'resolved' ? 'সমাধান' : 'খারিজ'}" হিসেবে চিহ্নিত করা হয়েছে।`);
      loadReportsData();
      loadAuditLogs();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'রিপোর্ট আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQCategoryId('islamic-gk');
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectIndex(0);
    setQExplanation('');
    setQSourceReference('');
    setQDifficulty('easy');
    setQIsActive(true);
  };

  // Filtered Questions logic
  const filteredQuestions = questions.filter((q) => {
    if (qFilterCategory !== 'all' && q.categoryId !== qFilterCategory) return false;
    if (qFilterDifficulty !== 'all' && q.difficulty !== qFilterDifficulty) return false;
    if (qFilterStatus !== 'all') {
      const wantActive = qFilterStatus === 'active';
      const actualActive = q.isActive !== undefined ? q.isActive : (q.isPublished ?? true);
      if (actualActive !== wantActive) return false;
    }
    if (qSearchTerm.trim() !== '') {
      const term = qSearchTerm.toLowerCase().trim();
      const matchQ = q.question.toLowerCase().includes(term);
      const matchRef = (q.sourceReference || '').toLowerCase().includes(term);
      const matchExp = (q.explanation || '').toLowerCase().includes(term);
      const matchOpt = q.options.some((opt) => opt.toLowerCase().includes(term));
      if (!matchQ && !matchRef && !matchExp && !matchOpt) return false;
    }
    return true;
  });

  const activeQuestionsCount = questions.filter(
    (q) => (q.isActive !== undefined ? q.isActive : (q.isPublished ?? true))
  ).length;
  const inactiveQuestionsCount = questions.length - activeQuestionsCount;

  // Filtered Users logic
  const filteredUsers = usersList.filter((u) => {
    if (userRoleFilter !== 'all') {
      if (userRoleFilter === 'owner' && u.role !== 'owner') return false;
      if (userRoleFilter === 'admin' && u.role !== 'admin') return false;
      if (userRoleFilter === 'moderator' && u.role !== 'moderator') return false;
      if (userRoleFilter === 'student' && u.role && u.role !== 'student') return false;
    }
    if (searchUser.trim()) {
      const term = searchUser.toLowerCase();
      const matchName = (u.displayName || '').toLowerCase().includes(term);
      const matchEmail = (u.email || '').toLowerCase().includes(term);
      const matchId = (u.studentId || '').toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  // Filtered Reports logic
  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  // Admin users list (Owner, Admins, Moderators)
  const privilegedUsers = usersList.filter(
    (u) => u.role === 'owner' || u.role === 'admin' || u.role === 'moderator'
  );

  return (
    <div id="admin-panel-container" className="max-w-6xl mx-auto space-y-6">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              {isOwner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
              <span>{role.toUpperCase()} CONTROL PANEL</span>
            </span>
            <span className="text-xs text-slate-400">• Bangla Brain Challenge</span>
          </div>
          <h1 className="text-2xl font-bold">প্রশাসনিক নিয়ন্ত্রণ কেন্দ্র</h1>
          <p className="text-xs text-slate-300 mt-1">
            লগইনকৃত: <span className="font-semibold text-teal-300">{userProfile?.displayName}</span> ({userProfile?.email})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
            <span>সিস্টেম রোল:</span>
            {isOwner ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> Owner
              </span>
            ) : (
              <span className="text-white font-bold capitalize">{role}</span>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between transition-all shadow-xs ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-teal-50 text-teal-800 border border-teal-200'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer text-sm font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'dashboard' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>ড্যাশবোর্ড</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'questions' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>প্রশ্ন ব্যাংক ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'categories' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>ক্যাটাগরি ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'users' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>ব্যবহারকারী ({usersList.length})</span>
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'admins' ? 'bg-purple-700 text-white shadow-xs' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>অ্যাডমিন ও রোল (Owner)</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>রিপোর্ট ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'messages' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>বার্তা মডারেশন</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'announcements' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>ঘোষণা ({announcements.length})</span>
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>বিজ্ঞাপন ও সেটিংস (Owner)</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>অডিট লগ</span>
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>মোট শিক্ষার্থী</span>
              </span>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totalUsers}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>ডাটাবেসে মোট প্রশ্ন</span>
              </span>
              <p className="text-2xl font-bold text-teal-700 mt-1">{totalQuestions}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>মোট কুইজ সেশন</span>
              </span>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{totalAttempts}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>অপেক্ষমাণ রিপোর্ট</span>
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{reportsCount}</p>
            </div>
          </div>

          {/* Security & Roles Overview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>সিস্টেম নিরাপত্তা ও আরবেক (RBAC) স্ট্যাটাস</span>
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                সার্ভার রুলস সক্রিয়
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 text-[11px]">প্ল্যাটফর্ম প্রধান মালিক</p>
                <p className="font-bold text-slate-800 mt-0.5">{DEVELOPER_NAME}</p>
                <p className="text-teal-700 font-mono text-[11px]">{OWNER_EMAIL}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 text-[11px]">নিরাপত্তা মডেল</p>
                <p className="font-bold text-slate-800 mt-0.5">Firebase Security Rules RBAC</p>
                <p className="text-slate-500 text-[11px]">roles & users সার্ভার ভ্যালিডেশন</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 text-[11px]">অ্যাক্সেস স্তর</p>
                <p className="font-bold text-slate-800 mt-0.5">Owner &gt; Admin &gt; Moderator</p>
                <p className="text-slate-500 text-[11px]">শুধুমাত্র ওনার রোল পরিবর্তন করতে পারেন</p>
              </div>
            </div>
          </div>

          {/* Categories Overview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">ক্যাটাগরি অনুযায়ী কুইজ সংক্ষেপ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map((c) => (
                <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{c.nameBn}</span>
                    {c.isIslamic && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>ইসলামিক</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-teal-700" />
                <span>কুইজ প্রশ্ন ব্যাংক ম্যানেজমেন্ট</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ক্লাউড ফায়ারস্টোর ডাটাবেসে সকল ক্যাটাগরির প্রশ্নসমূহ পর্যবেক্ষণ, সংযোজন ও সম্পাদন করুন।
              </p>
            </div>

            {canManageQuestions && (
              <button
                type="button"
                onClick={() => {
                  resetQuestionForm();
                  setShowQuestionModal(true);
                }}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন প্রশ্ন যোগ করুন</span>
              </button>
            )}
          </div>

          {!canManageQuestions && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">মডারেটর রিড-অনলি এক্সেস:</strong> প্রশ্ন ব্যাংক পরিচালনা ও সম্পাদনা করার এখতিয়ার শুধুমাত্র অনুমোদিত অ্যাডমিন এবং প্রধান মালিকের ({DEVELOPER_NAME}) রয়েছে।
              </div>
            </div>
          )}

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">মোট প্রশ্ন</span>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{questions.length}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>সক্রিয় (Active)</span>
              </span>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{activeQuestionsCount}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>নিষ্ক্রিয় (Inactive)</span>
              </span>
              <p className="text-lg font-bold text-slate-600 mt-0.5">{inactiveQuestionsCount}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-teal-700 font-medium">ফিল্টারকৃত ফলাফল</span>
              <p className="text-lg font-bold text-teal-800 mt-0.5">{filteredQuestions.length}</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="প্রশ্ন, অপশন বা রেফারেন্সের শব্দ দিয়ে খুঁজুন..."
                  value={qSearchTerm}
                  onChange={(e) => setQSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <select
                value={qFilterCategory}
                onChange={(e) => setQFilterCategory(e.target.value)}
                className="text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="all">সকল বিষয় / ক্যাটাগরি</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameBn}
                  </option>
                ))}
              </select>

              <select
                value={qFilterDifficulty}
                onChange={(e) => setQFilterDifficulty(e.target.value)}
                className="text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="all">সকল কঠিন্য মাত্রা</option>
                <option value="easy">সহজ (Easy)</option>
                <option value="medium">মাঝারি (Medium)</option>
                <option value="hard">কঠিন (Hard)</option>
              </select>

              <select
                value={qFilterStatus}
                onChange={(e) => setQFilterStatus(e.target.value as any)}
                className="text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="all">সকল স্ট্যাটাস</option>
                <option value="active">শুধুমাত্র সক্রিয়</option>
                <option value="inactive">শুধুমাত্র নিষ্ক্রিয়</option>
              </select>
            </div>
          </div>

          {/* Question List Cards */}
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                কোনো প্রশ্ন পাওয়া যায়নি। অনুসন্ধান বা ফিল্টার পরিবর্তন করে দেখুন।
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const isActive = q.isActive !== undefined ? q.isActive : (q.isPublished ?? true);
                const cat = categories.find((c) => c.id === q.categoryId);
                const isIslamic = q.categoryId === 'islamic-gk' || !!cat?.isIslamic;

                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 bg-white rounded-2xl border transition-all ${
                      isActive ? 'border-slate-200 shadow-2xs' : 'border-slate-200 bg-slate-50/70 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            #{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-100">
                            {cat?.nameBn || q.categoryId}
                          </span>
                          {isIslamic && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              <span>ইসলামিক জিকে</span>
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium ${
                              q.difficulty === 'hard'
                                ? 'bg-rose-50 text-rose-700'
                                : q.difficulty === 'medium'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {q.difficulty === 'hard' ? 'কঠিন' : q.difficulty === 'medium' ? 'মাঝারি' : 'সহজ'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{q.question}</h4>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                                q.correctIndex === i
                                  ? 'bg-emerald-50 border border-emerald-200 font-bold text-emerald-900'
                                  : 'bg-slate-50 text-slate-700 border border-slate-100'
                              }`}
                            >
                              <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span>{opt}</span>
                              {q.correctIndex === i && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Source/Reference */}
                        {q.sourceReference && (
                          <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>
                              <strong>প্রামাণিক রেফারেন্স (উৎস):</strong> {q.sourceReference}
                            </span>
                          </div>
                        )}

                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 italic">
                            ব্যাখ্যা: {q.explanation}
                          </p>
                        )}
                      </div>

                      {/* Question Actions */}
                      {canManageQuestions && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleQuestionActive(q)}
                            title={isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          >
                            {isActive ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionId(q.id || null);
                              setQCategoryId(q.categoryId);
                              setQText(q.question);
                              setQOptions(q.options);
                              setQCorrectIndex(q.correctIndex);
                              setQExplanation(q.explanation || '');
                              setQSourceReference(q.sourceReference || '');
                              setQDifficulty(q.difficulty || 'easy');
                              setQIsActive(isActive);
                              setShowQuestionModal(true);
                            }}
                            title="সম্পাদনা করুন"
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q)}
                            title="মুছে ফেলুন"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <AdminCategoriesTab
          categories={categories}
          userProfile={userProfile!}
          canManage={canManageCategories}
          onRefresh={loadCategories}
          showToast={showToast}
        />
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-700" />
                <span>ব্যবহারকারী ও শিক্ষার্থী ব্যবস্থাপনা</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                প্ল্যাটফর্মের নিবন্ধিত শিক্ষার্থীদের তালিকা, স্ট্যাটাস ও স্কোর পর্যবেক্ষণ করুন।
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="all">সকল রোল</option>
                <option value="owner">ওনার (Owner)</option>
                <option value="admin">অ্যাডমিন (Admin)</option>
                <option value="moderator">মডারেটর (Moderator)</option>
                <option value="student">শিক্ষার্থী (Student)</option>
              </select>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="নাম, ইমেইল বা আইডি দিয়ে খুঁজুন..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3.5">শিক্ষার্থী</th>
                    <th className="p-3.5">আইডি</th>
                    <th className="p-3.5">রোল</th>
                    <th className="p-3.5">মোট স্কোর</th>
                    <th className="p-3.5">স্ট্যাটাস</th>
                    <th className="p-3.5 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                        কোনো ব্যবহারকারী পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isOwnerUser = u.role === 'owner' || u.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 font-medium">
                            <div>
                              <p className="font-bold text-slate-900">{u.displayName}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-500 font-mono text-[11px]">{u.studentId || '-'}</td>
                          <td className="p-3.5">
                            {isOwnerUser ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit">
                                <Crown className="w-3 h-3 text-amber-600" />
                                <span>OWNER</span>
                              </span>
                            ) : u.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                ADMIN
                              </span>
                            ) : u.role === 'moderator' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                MODERATOR
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                STUDENT
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-teal-700">{u.totalScore || 0}</td>
                          <td className="p-3.5">
                            {u.isBlocked ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                                ব্লকড (Blocked)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                                সক্রিয় (Active)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {isOwnerUser ? (
                              <span className="text-[11px] text-slate-400 font-medium italic">মালিক অপরিবর্তনীয়</span>
                            ) : (
                              canManageUsers && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlock(u)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                    u.isBlocked
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  }`}
                                >
                                  {u.isBlocked ? 'আনব্লক করুন' : 'ব্লক করুন'}
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADMINS & ROLES TAB (Owner Only) */}
      {activeTab === 'admins' && isOwner && (
        <div className="space-y-6">
          {/* Owner Privilege Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                  মালিকের বিশেষাধিকার (Owner Only)
                </span>
              </div>
              <h3 className="text-lg font-bold">অ্যাডমিন ও মডারেটর অনুমোদন ও ব্যবস্থাপনা</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                শুধুমাত্র প্রধান মালিক ({DEVELOPER_NAME} - {OWNER_EMAIL}) নতুন অ্যাডমিন ও মডারেটর নিয়োগ ও রোল বাতিল করতে পারেন।
              </p>
            </div>
          </div>

          {/* Form to Assign Role */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-700" />
              <span>নতুন প্রশাসনিক রোল বরাদ্দ করুন</span>
            </h4>
            <p className="text-xs text-slate-500">
              নিবন্ধিত ব্যবহারকারীর ইমেইল প্রদান করে তাকে অ্যাডমিন বা মডারেটর রোল অনুমোদন দিন। এটি সার্ভার-সাইড ফায়ারস্টোর রুলস দ্বারা সুরক্ষিত।
            </p>

            <form onSubmit={handleAssignRole} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="নিবন্ধিত শিক্ষার্থীর ইমেইল অ্যাড্রেস লিখুন"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value as any)}
                className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              >
                <option value="admin">অ্যাডমিনিস্ট্রেটর (Admin)</option>
                <option value="moderator">মডারেটর (Moderator)</option>
              </select>
              <button
                type="submit"
                disabled={assigningRole}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
              >
                {assigningRole ? 'বরাদ্দ হচ্ছে...' : 'রোল অনুমোদন দিন'}
              </button>
            </form>
          </div>

          {/* Current Privileged Staff List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-700" />
              <span>বর্তমান অ্যাডমিন ও মডারেটর টিম ({privilegedUsers.length})</span>
            </h4>

            <div className="divide-y divide-slate-100">
              {privilegedUsers.map((p) => {
                const isOwnerAccount = p.role === 'owner' || p.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

                return (
                  <div key={p.uid} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{p.displayName}</p>
                        {isOwnerAccount ? (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-600" />
                            <span>প্রধান মালিক (Owner)</span>
                          </span>
                        ) : p.role === 'admin' ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full text-[10px] font-bold">
                            অ্যাডমিন (Admin)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold">
                            মডারেটর (Moderator)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono">{p.email}</p>
                    </div>

                    <div>
                      {isOwnerAccount ? (
                        <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                          স্থায়ী অধিকার
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevokeRole(p)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold cursor-pointer border border-rose-200 transition-colors"
                        >
                          রোল প্রত্যাহার করুন
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>মডারেশন রিপোর্ট ও শিক্ষার্থী অভিযোগ</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                শিক্ষার্থীদের প্রেরিত অভিযোগ, অনুপযুক্ত প্রশ্ন বা আচরণ পর্যবেক্ষণ ও মীমাংসা করুন।
              </p>
            </div>

            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value as any)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              <option value="all">সকল রিপোর্ট ({reports.length})</option>
              <option value="pending">অপেক্ষমাণ (Pending)</option>
              <option value="resolved">মীমাংসিত (Resolved)</option>
              <option value="dismissed">খারিজকৃত (Dismissed)</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                এই ফিল্টারে কোনো রিপোর্ট নেই।
              </div>
            ) : (
              filteredReports.map((r) => (
                <div key={r.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {r.reason}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'dismissed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status === 'resolved' ? 'মীমাংসিত' : r.status === 'dismissed' ? 'খারিজ' : 'অপেক্ষমাণ'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-semibold mt-2">
                        অভিযুক্ত: <span className="font-normal">{r.reportedUserName || r.reportedUserId}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        রিপোর্টার: {r.reporterName || r.reportedBy}
                      </p>
                      {r.details && (
                        <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          "{r.details}"
                        </p>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions for pending reports */}
                  {r.status === 'pending' && canManageReports && (
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="সমাধানের সারসংক্ষেপ বা নোট লিখুন..."
                        value={reportNoteMap[r.id] || ''}
                        onChange={(e) =>
                          setReportNoteMap({ ...reportNoteMap, [r.id]: e.target.value })
                        }
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateReport(r.id, 'resolved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        সমাধান করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateReport(r.id, 'dismissed')}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        খারিজ করুন
                      </button>
                    </div>
                  )}

                  {r.resolutionNote && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                      নোট: {r.resolutionNote}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {activeTab === 'messages' && (
        <AdminMessagesTab
          userProfile={userProfile!}
          canManage={canManageMessages}
          showToast={showToast}
        />
      )}

      {/* ANNOUNCEMENTS TAB */}
      {activeTab === 'announcements' && (
        <AdminAnnouncementsTab
          announcements={announcements}
          userProfile={userProfile!}
          canManage={canManageAnnouncements}
          onRefresh={loadAnnouncementsData}
          showToast={showToast}
        />
      )}

      {/* SETTINGS TAB (Owner Only) */}
      {activeTab === 'settings' && (
        <AdminSettingsTab
          userProfile={userProfile!}
          isOwner={isOwner}
          showToast={showToast}
        />
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-teal-700" />
                <span>প্রশাসনিক কার্যকলাপের অপরিবর্তনীয় অডিট লগ</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                সকল রোল বরাদ্দ, প্রশ্ন পরিবর্তন, ব্লক এবং কনফিগারেশনের সম্পূর্ণ ট্র্যাকিং রেকর্ড।
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="অডিট লগে খুঁজুন..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={loadAuditLogs}
                title="লগ রিফ্রেশ করুন"
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">কোনো অডিট লগ এখনো নেই।</div>
            ) : (
              auditLogs
                .filter((log) => {
                  if (!auditSearch.trim()) return true;
                  const term = auditSearch.toLowerCase();
                  return (
                    log.action.toLowerCase().includes(term) ||
                    log.details.toLowerCase().includes(term) ||
                    log.adminEmail.toLowerCase().includes(term)
                  );
                })
                .map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs px-2 py-0.5 bg-teal-50 text-teal-800 rounded-full border border-teal-100 font-mono">
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({log.targetEntity})</span>
                      </div>
                      <p className="text-xs text-slate-700">{log.details}</p>
                      <p className="text-[11px] text-slate-400">
                        সম্পাদনকারী: <strong className="text-slate-600">{log.adminEmail}</strong>
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-teal-700" />
                <span>{editingQuestionId ? 'প্রশ্ন সম্পাদনা করুন' : 'নতুন প্রশ্ন তৈরি করুন'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-3.5">
              {/* Category & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <select
                    value={qCategoryId}
                    onChange={(e) => setQCategoryId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn} {c.isIslamic ? '★ (ইসলামিক)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কঠিন্য মাত্রা (Difficulty)</label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  >
                    <option value="easy">সহজ (Easy)</option>
                    <option value="medium">মাঝারি (Medium)</option>
                    <option value="hard">কঠিন (Hard)</option>
                  </select>
                </div>
              </div>

              {/* Islamic GK Notice */}
              {qCategoryId === 'islamic-gk' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>ইসলামিক সাধারণ জ্ঞান নীতি:</strong> কুরআন ও সহীহ সুন্নাহর বিশুদ্ধ প্রামাণিক রেফারেন্স (কিতাব, অধ্যায় ও হাদিস/আয়াত নম্বর) উল্লেখ করা বাধ্যতামূলক।
                  </span>
                </div>
              )}

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্রশ্নের বিবরণ</label>
                <textarea
                  required
                  rows={2}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="যেমন: পবিত্র কুরআনের প্রথম অবতীর্ণ সূরা কোনটি?"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              {/* 4 Options & Correct Answer Radio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ৪টি উত্তরের বিকল্প (রেডিও বাটনে ক্লিক করে সঠিক উত্তর চিহ্নিত করুন)
                </label>
                <div className="space-y-2">
                  {qOptions.map((opt, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border transition-colors ${
                        qCorrectIndex === i
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`modal-opt-${i}`}
                        name="correctOpt"
                        checked={qCorrectIndex === i}
                        onChange={() => setQCorrectIndex(i)}
                        className="cursor-pointer accent-emerald-600 ml-1.5"
                        title="সঠিক উত্তর হিসেবে চিহ্নিত করুন"
                      />
                      <label
                        htmlFor={`modal-opt-${i}`}
                        className="text-xs font-bold text-slate-700 w-5 text-center cursor-pointer"
                      >
                        {String.fromCharCode(65 + i)}
                      </label>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const updated = [...qOptions] as [string, string, string, string];
                          updated[i] = e.target.value;
                          setQOptions(updated);
                        }}
                        placeholder={`বিকল্প ${String.fromCharCode(65 + i)}`}
                        className="flex-1 text-xs p-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সংক্ষিপ্ত ব্যাখ্যা (Explanation)</label>
                <input
                  type="text"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="উত্তর প্রদর্শনের পর শিক্ষার্থীর জ্ঞাতার্থে তথ্যমূলক ব্যাখ্যা..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              {/* Source/Reference field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>
                    উৎস বা প্রামাণিক রেফারেন্স{' '}
                    {qCategoryId === 'islamic-gk' ? (
                      <span className="text-rose-600 font-bold">* (বাধ্যতামূলক)</span>
                    ) : (
                      <span className="text-slate-400 font-normal">(ঐচ্ছিক কিন্তু সুপারিশকৃত)</span>
                    )}
                  </span>
                </label>
                <input
                  type="text"
                  required={qCategoryId === 'islamic-gk'}
                  value={qSourceReference}
                  onChange={(e) => setQSourceReference(e.target.value)}
                  placeholder={
                    qCategoryId === 'islamic-gk'
                      ? 'যেমন: সহীহ বুখারী, হাদিস নং ৩ / সূরা আল-ফাতিহা ১:১'
                      : 'যেমন: জাতীয় শিক্ষাক্রম পাঠ্যপুস্তক / গণপ্রজাতন্ত্রী বাংলাদেশ সংবিধান'
                  }
                  className={`w-full text-xs p-2.5 rounded-xl border focus:ring-2 focus:ring-teal-600 focus:outline-none ${
                    qCategoryId === 'islamic-gk'
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-300'
                  }`}
                />
              </div>

              {/* Active Status Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={qIsActive}
                    onChange={(e) => setQIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    এই প্রশ্নটি অবিলম্বে অ্যাপে সক্রিয় (Active) হিসেবে প্রকাশিত থাকবে
                  </span>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  {editingQuestionId ? 'পরিবর্তন সংরক্ষণ করুন' : 'প্রশ্ন যোগ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
