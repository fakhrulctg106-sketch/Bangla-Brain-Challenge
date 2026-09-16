import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  QuizCategory,
  QuizQuestion,
  QuizAttempt,
  LeaderboardEntry,
  AppAuditLog,
  AppConfiguration,
  AppAnnouncement,
  ModerationReport,
  UserRole
} from '../types';
import { INITIAL_CATEGORIES, SEED_QUESTIONS } from '../data/seedQuestions';

// Global Developer & Owner identity
export const OWNER_EMAIL = 'fakhrulctg106@gmail.com';
export const DEVELOPER_NAME = 'Fakhrul Islam';

/**
 * Ensures system collections, app configuration, all 10 categories,
 * and base verified questions are present in Firestore.
 */
export async function initializeDatabaseSeed(isOwnerOrAdmin: boolean = false): Promise<void> {
  try {
    const configRef = doc(db, 'appConfiguration', 'global');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists() && isOwnerOrAdmin) {
      const initialConfig: AppConfiguration = {
        adsEnabled: true,
        admobBannerId: 'ca-app-pub-3940256099942544/6300978111',
        admobInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
        admobRewardedId: 'ca-app-pub-3940256099942544/5224354917',
        webAdsEnabled: true,
        audioCallsEnabled: true,
        chatEnabled: true,
        maintenanceMode: false,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(configRef, initialConfig);
    }

    // 1. Ensure all 10 categories are in Firestore if owner or admin
    if (isOwnerOrAdmin) {
      const catBatch = writeBatch(db);
      for (const cat of INITIAL_CATEGORIES) {
        const catRef = doc(db, 'categories', cat.id);
        catBatch.set(catRef, cat, { merge: true });
      }
      await catBatch.commit();

      // 2. Ensure questions collection has verified questions for all categories
      const questionsCol = collection(db, 'questions');
      const qSnaps = await getDocs(query(questionsCol, limit(1)));
      if (qSnaps.empty) {
        const qBatch = writeBatch(db);
        for (const q of SEED_QUESTIONS) {
          const qRef = doc(questionsCol);
          qBatch.set(qRef, {
            ...q,
            randomKey: Math.random(),
            isActive: true,
            isPublished: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        await qBatch.commit();
      }
    }
  } catch (error) {
    console.warn('Database auto-initialization check notice:', error);
  }
}

/**
 * Loads categories from Firestore or fallback to standard categories
 */
export async function fetchCategories(): Promise<QuizCategory[]> {
  try {
    const categoriesCol = collection(db, 'categories');
    const snap = await getDocs(categoriesCol);
    if (!snap.empty) {
      const list: QuizCategory[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as QuizCategory), id: d.id }));
      return list.sort((a, b) => a.order - b.order);
    }
  } catch (e) {
    console.warn('Error fetching categories from Firestore, using initial:', e);
  }
  return INITIAL_CATEGORIES;
}

/**
 * Scalably selects exactly 10 active questions for a quiz session from Firestore.
 * Avoids unnecessary repetition for the same user by checking their recently answered questions.
 */
export async function fetchQuizQuestions(
  categoryId: string,
  count: number = 10,
  userId?: string
): Promise<QuizQuestion[]> {
  try {
    const qCol = collection(db, 'questions');

    // Query active questions for this category
    // Try scalable query with randomKey first
    const randomOffset = Math.random();
    const qQuery = query(
      qCol,
      where('categoryId', '==', categoryId),
      where('isActive', '==', true),
      limit(50)
    );

    let snap = await getDocs(qQuery);

    // If query returned no active questions, check with isPublished (backward compatibility)
    if (snap.empty) {
      const fallbackQuery = query(
        qCol,
        where('categoryId', '==', categoryId),
        where('isPublished', '==', true),
        limit(50)
      );
      snap = await getDocs(fallbackQuery);
    }

    const fetched: QuizQuestion[] = [];
    snap.forEach((d) => {
      const data = d.data() as QuizQuestion;
      fetched.push({
        ...data,
        id: d.id,
        isActive: data.isActive !== undefined ? data.isActive : (data.isPublished ?? true),
        sourceReference: data.sourceReference || '',
      });
    });

    if (fetched.length > 0) {
      // Repetition avoidance logic
      const storageKey = `bbc_seen_q_${categoryId}_${userId || 'anon'}`;
      let seenIds: string[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) seenIds = JSON.parse(stored);
      } catch (_) {}

      // Split into unseen and seen
      const unseen = fetched.filter((q) => q.id && !seenIds.includes(q.id));
      const pool = unseen.length >= count ? unseen : fetched;

      // Shuffle pool
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);

      // Save chosen IDs to avoid immediate repetition
      try {
        const newlySeen = selected.map((q) => q.id || '').filter(Boolean);
        const updatedSeen = Array.from(new Set([...seenIds, ...newlySeen])).slice(-40);
        localStorage.setItem(storageKey, JSON.stringify(updatedSeen));
      } catch (_) {}

      if (selected.length === count) {
        return selected;
      }
    }
  } catch (e) {
    console.warn('Firestore question fetch notice, falling back to verified seed:', e);
  }

  // Fallback to verified local seed bank if network issue or Firestore empty
  const localQuestions = SEED_QUESTIONS.filter((q) => q.categoryId === categoryId);
  const shuffled = [...localQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Fetches all questions for Admin Question Bank with filtering and search
 */
export async function fetchAdminQuestions(options?: {
  categoryId?: string;
  difficulty?: string;
  status?: 'all' | 'active' | 'inactive';
  searchQuery?: string;
}): Promise<QuizQuestion[]> {
  try {
    const qCol = collection(db, 'questions');
    let qRef = query(qCol, limit(150));

    if (options?.categoryId && options.categoryId !== 'all') {
      qRef = query(qCol, where('categoryId', '==', options.categoryId), limit(150));
    }

    const snap = await getDocs(qRef);
    let list: QuizQuestion[] = [];
    snap.forEach((d) => {
      const data = d.data() as QuizQuestion;
      list.push({
        ...data,
        id: d.id,
        isActive: data.isActive !== undefined ? data.isActive : (data.isPublished ?? true),
        sourceReference: data.sourceReference || '',
      });
    });

    // If Firestore has no questions yet, load from SEED_QUESTIONS for admin view
    if (list.length === 0) {
      list = SEED_QUESTIONS.map((q, idx) => ({
        ...q,
        id: `seed_${q.categoryId}_${idx}`,
        isActive: true,
      }));
    }

    // Apply category filter if not already filtered
    if (options?.categoryId && options.categoryId !== 'all') {
      list = list.filter((q) => q.categoryId === options.categoryId);
    }

    // Filter by difficulty
    if (options?.difficulty && options.difficulty !== 'all') {
      list = list.filter((q) => q.difficulty === options.difficulty);
    }

    // Filter by active/inactive status
    if (options?.status && options.status !== 'all') {
      const wantActive = options.status === 'active';
      list = list.filter((q) => q.isActive === wantActive);
    }

    // Filter by search query
    if (options?.searchQuery && options.searchQuery.trim() !== '') {
      const qLower = options.searchQuery.toLowerCase().trim();
      list = list.filter(
        (q) =>
          q.question.toLowerCase().includes(qLower) ||
          q.sourceReference.toLowerCase().includes(qLower) ||
          q.explanation.toLowerCase().includes(qLower) ||
          q.options.some((opt) => opt.toLowerCase().includes(qLower))
      );
    }

    return list;
  } catch (error) {
    console.error('Error fetching questions for admin:', error);
    return [];
  }
}

/**
 * Creates a new Question in Firestore
 */
export async function createQuestion(
  questionData: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  adminUser: UserProfile
): Promise<string> {
  // Enforce Islamic GK reference requirement
  if (questionData.categoryId === 'islamic-gk' && (!questionData.sourceReference || questionData.sourceReference.trim() === '')) {
    throw new Error('ইসলামিক সাধারণ জ্ঞান ক্যাটাগরির জন্য নির্ভরযোগ্য প্রামাণিক রেফারেন্স (উৎস) বাধ্যতামূলক।');
  }

  const questionsCol = collection(db, 'questions');
  const now = new Date().toISOString();
  const docRef = await addDoc(questionsCol, {
    ...questionData,
    randomKey: Math.random(),
    isActive: questionData.isActive ?? true,
    isPublished: questionData.isActive ?? true,
    createdBy: adminUser.uid,
    createdAt: now,
    updatedAt: now,
  });

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'QUESTION_CREATED',
    targetEntity: 'questions',
    targetId: docRef.id,
    details: `Created question in ${questionData.categoryId}: "${questionData.question.substring(0, 30)}..."`,
  });

  return docRef.id;
}

/**
 * Updates an existing question
 */
export async function updateQuestion(
  questionId: string,
  updates: Partial<QuizQuestion>,
  adminUser: UserProfile
): Promise<void> {
  if (updates.categoryId === 'islamic-gk' && updates.sourceReference !== undefined && updates.sourceReference.trim() === '') {
    throw new Error('ইসলামিক সাধারণ জ্ঞান ক্যাটাগরির জন্য নির্ভরযোগ্য প্রামাণিক রেফারেন্স (উৎস) বাধ্যতামূলক।');
  }

  const qDocRef = doc(db, 'questions', questionId);
  const payload: any = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.isActive !== undefined) {
    payload.isPublished = updates.isActive;
  }

  await updateDoc(qDocRef, payload);

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'QUESTION_UPDATED',
    targetEntity: 'questions',
    targetId: questionId,
    details: `Updated question ${questionId}`,
  });
}

/**
 * Toggles question active status (activate / deactivate)
 */
export async function toggleQuestionActive(
  questionId: string,
  currentStatus: boolean,
  adminUser: UserProfile
): Promise<boolean> {
  const newStatus = !currentStatus;
  const qDocRef = doc(db, 'questions', questionId);
  await updateDoc(qDocRef, {
    isActive: newStatus,
    isPublished: newStatus,
    updatedAt: new Date().toISOString(),
  });

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: newStatus ? 'QUESTION_ACTIVATED' : 'QUESTION_DEACTIVATED',
    targetEntity: 'questions',
    targetId: questionId,
    details: `Changed question status to ${newStatus ? 'Active' : 'Inactive'}`,
  });

  return newStatus;
}

/**
 * Deletes a question from Question Bank
 */
export async function deleteQuestion(
  questionId: string,
  adminUser: UserProfile
): Promise<void> {
  const qDocRef = doc(db, 'questions', questionId);
  await deleteDoc(qDocRef);

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'QUESTION_DELETED',
    targetEntity: 'questions',
    targetId: questionId,
    details: `Deleted question ID ${questionId}`,
  });
}

/**
 * Submits and validates a quiz attempt with anti-cheat protection
 */
export async function submitQuizAttempt(
  user: UserProfile,
  attempt: Omit<QuizAttempt, 'id' | 'completedAt'>
): Promise<{ success: boolean; earnedPoints: number; isDuplicate: boolean }> {
  const attemptDocRef = doc(db, 'quizAttempts', attempt.attemptToken);
  const existingSnap = await getDoc(attemptDocRef);
  if (existingSnap.exists()) {
    return { success: false, earnedPoints: 0, isDuplicate: true };
  }

  const earnedPoints = attempt.score;
  const completedAt = new Date().toISOString();

  // Save attempt
  await setDoc(attemptDocRef, {
    ...attempt,
    completedAt,
  });

  // Update user statistics
  const userRef = doc(db, 'users', user.uid);
  const todayKey = new Date().toISOString().split('T')[0];
  const isNewDay = user.lastActiveDate !== todayKey;
  const newStreak = isNewDay ? (user.currentStreak || 0) + 1 : user.currentStreak || 1;

  await updateDoc(userRef, {
    totalScore: increment(earnedPoints),
    quizzesPlayed: increment(1),
    correctAnswers: increment(attempt.correctAnswers),
    wrongAnswers: increment(attempt.totalQuestions - attempt.correctAnswers),
    currentStreak: newStreak,
    bestStreak: Math.max(user.bestStreak || 0, newStreak),
    lastActiveDate: todayKey,
    updatedAt: completedAt,
  });

  // Record leaderboard entry
  const periods: ('daily' | 'weekly' | 'monthly' | 'all_time')[] = ['daily', 'weekly', 'monthly', 'all_time'];
  const now = new Date();
  const weekNumber = Math.ceil((now.getDate() + 6 - now.getDay()) / 7);
  const periodKeys = {
    daily: todayKey,
    weekly: `${now.getFullYear()}-W${weekNumber}`,
    monthly: `${now.getFullYear()}-${now.getMonth() + 1}`,
    all_time: 'all_time',
  };

  for (const period of periods) {
    const key = periodKeys[period];
    const scoreDocId = `${user.uid}_${period}_${key}`;
    const scoreDocRef = doc(db, 'scores', scoreDocId);
    const scoreSnap = await getDoc(scoreDocRef);

    if (scoreSnap.exists()) {
      await updateDoc(scoreDocRef, {
        score: increment(earnedPoints),
        updatedAt: completedAt,
      });
    } else {
      const entry: LeaderboardEntry = {
        userId: user.uid,
        userName: user.displayName || 'শিক্ষার্থী',
        userPhoto: user.photoURL || '',
        studentId: user.studentId || '',
        score: earnedPoints,
        period,
        periodKey: key,
        updatedAt: completedAt,
      };
      await setDoc(scoreDocRef, entry);
    }
  }

  return { success: true, earnedPoints, isDuplicate: false };
}

/**
 * Fetch Leaderboard by period
 */
export async function fetchLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all_time',
  maxCount = 20
): Promise<LeaderboardEntry[]> {
  try {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const weekNumber = Math.ceil((now.getDate() + 6 - now.getDay()) / 7);
    const periodKeys = {
      daily: todayKey,
      weekly: `${now.getFullYear()}-W${weekNumber}`,
      monthly: `${now.getFullYear()}-${now.getMonth() + 1}`,
      all_time: 'all_time',
    };

    const targetKey = periodKeys[period];
    const scoresCol = collection(db, 'scores');
    const q = query(
      scoresCol,
      where('period', '==', period),
      where('periodKey', '==', targetKey),
      orderBy('score', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    snap.forEach((d) => entries.push({ ...(d.data() as LeaderboardEntry), id: d.id }));
    return entries;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

/**
 * Admin Audit Logger
 */
export async function logAdminAction(log: Omit<AppAuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const auditCol = collection(db, 'auditLogs');
    await setDoc(doc(auditCol), {
      ...log,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Failed to record audit log:', e);
  }
}

/**
 * Fetch all audit logs (ordered by timestamp desc)
 */
export async function fetchAuditLogs(maxLimit = 60): Promise<AppAuditLog[]> {
  try {
    const auditCol = collection(db, 'auditLogs');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(maxLimit));
    const snap = await getDocs(q);
    const list: AppAuditLog[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as AppAuditLog), id: d.id }));
    return list;
  } catch (e) {
    console.warn('Error fetching audit logs:', e);
    return [];
  }
}

/**
 * Category Management Functions
 */
export async function createCategory(
  categoryData: QuizCategory,
  adminUser: UserProfile
): Promise<void> {
  const catRef = doc(db, 'categories', categoryData.id);
  await setDoc(catRef, {
    ...categoryData,
    order: Number(categoryData.order) || 1,
    isActive: categoryData.isActive ?? true,
    questionCount: 0,
  });

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'CATEGORY_CREATED',
    targetEntity: 'categories',
    targetId: categoryData.id,
    details: `Created category "${categoryData.nameBn}" (${categoryData.nameEn})`,
  });
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<QuizCategory>,
  adminUser: UserProfile
): Promise<void> {
  const catRef = doc(db, 'categories', categoryId);
  await updateDoc(catRef, updates);

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'CATEGORY_UPDATED',
    targetEntity: 'categories',
    targetId: categoryId,
    details: `Updated category "${categoryId}"`,
  });
}

export async function toggleCategoryActive(
  categoryId: string,
  currentStatus: boolean,
  adminUser: UserProfile
): Promise<boolean> {
  const newStatus = !currentStatus;
  const catRef = doc(db, 'categories', categoryId);
  await updateDoc(catRef, { isActive: newStatus });

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: newStatus ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
    targetEntity: 'categories',
    targetId: categoryId,
    details: `Toggled category ${categoryId} status to ${newStatus ? 'Active' : 'Inactive'}`,
  });

  return newStatus;
}

export async function deleteCategory(
  categoryId: string,
  adminUser: UserProfile
): Promise<void> {
  const catRef = doc(db, 'categories', categoryId);
  await deleteDoc(catRef);

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'CATEGORY_DELETED',
    targetEntity: 'categories',
    targetId: categoryId,
    details: `Deleted category "${categoryId}"`,
  });
}

/**
 * Announcements Management Functions
 */
export async function fetchAnnouncements(): Promise<AppAnnouncement[]> {
  try {
    const annCol = collection(db, 'announcements');
    const snap = await getDocs(query(annCol, orderBy('createdAt', 'desc'), limit(30)));
    const list: AppAnnouncement[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as AppAnnouncement), id: d.id }));
    return list;
  } catch (e) {
    console.warn('Error fetching announcements:', e);
    return [];
  }
}

export async function createAnnouncement(
  announcementData: Omit<AppAnnouncement, 'id' | 'createdAt'>,
  adminUser: UserProfile
): Promise<string> {
  const annCol = collection(db, 'announcements');
  const now = new Date().toISOString();
  const docRef = await addDoc(annCol, {
    ...announcementData,
    publishedBy: adminUser.displayName || adminUser.email,
    createdAt: now,
  });

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'ANNOUNCEMENT_CREATED',
    targetEntity: 'announcements',
    targetId: docRef.id,
    details: `Published announcement "${announcementData.title}" (${announcementData.priority})`,
  });

  return docRef.id;
}

export async function deleteAnnouncement(
  announcementId: string,
  adminUser: UserProfile
): Promise<void> {
  const annRef = doc(db, 'announcements', announcementId);
  await deleteDoc(annRef);

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'ANNOUNCEMENT_DELETED',
    targetEntity: 'announcements',
    targetId: announcementId,
    details: `Deleted announcement ${announcementId}`,
  });
}

/**
 * App Configuration & Ads Settings (Owner Only)
 */
export async function fetchAppConfiguration(): Promise<AppConfiguration | null> {
  try {
    const configRef = doc(db, 'appConfiguration', 'global');
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return snap.data() as AppConfiguration;
    }
  } catch (e) {
    console.warn('Error reading appConfiguration:', e);
  }
  return null;
}

export async function updateAppConfiguration(
  updates: Partial<AppConfiguration>,
  ownerUser: UserProfile
): Promise<void> {
  const isOwner = ownerUser.role === 'owner' || ownerUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  if (!isOwner) {
    throw new Error('শুধুমাত্র সিস্টেম ওনার (Owner) বিজ্ঞাপন ও কনফিগারেশন পরিবর্তন করতে পারেন।');
  }

  const configRef = doc(db, 'appConfiguration', 'global');
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(configRef, payload, { merge: true });

  await logAdminAction({
    adminId: ownerUser.uid,
    adminEmail: ownerUser.email,
    action: 'APP_CONFIGURATION_UPDATED',
    targetEntity: 'appConfiguration',
    targetId: 'global',
    details: `Updated app configuration: ${Object.keys(updates).join(', ')}`,
  });
}

/**
 * Moderation Reports Management
 */
export async function fetchReports(): Promise<ModerationReport[]> {
  try {
    const repCol = collection(db, 'reports');
    const snap = await getDocs(query(repCol, orderBy('createdAt', 'desc'), limit(50)));
    const list: ModerationReport[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as ModerationReport), id: d.id }));
    return list;
  } catch (e) {
    console.warn('Error fetching reports:', e);
    return [];
  }
}

export async function updateReportStatus(
  reportId: string,
  status: 'resolved' | 'dismissed',
  note: string,
  adminUser: UserProfile
): Promise<void> {
  const repRef = doc(db, 'reports', reportId);
  await updateDoc(repRef, {
    status,
    resolutionNote: note,
    resolvedBy: adminUser.displayName || adminUser.email,
  });

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: `REPORT_${status.toUpperCase()}`,
    targetEntity: 'reports',
    targetId: reportId,
    details: `Report ${reportId} marked as ${status}: "${note}"`,
  });
}

/**
 * Message & Chat Moderation
 */
export async function fetchRecentChats(): Promise<any[]> {
  try {
    const chatCol = collection(db, 'chats');
    const snap = await getDocs(query(chatCol, orderBy('updatedAt', 'desc'), limit(30)));
    const list: any[] = [];
    snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
    return list;
  } catch (e) {
    console.warn('Error fetching chats:', e);
    return [];
  }
}

export async function deleteAbusiveMessage(
  messageId: string,
  reason: string,
  adminUser: UserProfile
): Promise<void> {
  const msgRef = doc(db, 'messages', messageId);
  await deleteDoc(msgRef);

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'MESSAGE_DELETED',
    targetEntity: 'messages',
    targetId: messageId,
    details: `Deleted message ${messageId}. Reason: ${reason}`,
  });
}

/**
 * Role-Based Access Control (RBAC) Management - Strictly Owner Only
 */
export async function assignUserRole(
  targetUserId: string,
  targetEmail: string,
  newRole: 'admin' | 'moderator',
  ownerUser: UserProfile
): Promise<void> {
  const isOwner = ownerUser.role === 'owner' || ownerUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  if (!isOwner) {
    throw new Error('শুধুমাত্র সিস্টেম ওনার (Owner) অ্যাডমিন রোল যোগ, পরিবর্তন বা বরাদ্দ করতে পারেন।');
  }

  if (targetEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    throw new Error('ওনার অ্যাকাউন্টের রোল পরিবর্তন করা সম্পূর্ণ নিষিদ্ধ।');
  }

  // 1. Write to secure roles collection (Firestore rules only permit Owner to write here)
  const roleRef = doc(db, 'roles', targetUserId);
  await setDoc(roleRef, {
    role: newRole,
    assignedBy: ownerUser.uid,
    assignedAt: new Date().toISOString(),
    email: targetEmail,
  });

  // 2. Update users collection profile document
  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, { role: newRole });

  await logAdminAction({
    adminId: ownerUser.uid,
    adminEmail: ownerUser.email,
    action: 'ROLE_ASSIGNED',
    targetEntity: 'roles',
    targetId: targetUserId,
    details: `Assigned role "${newRole}" to user ${targetEmail}`,
  });
}

export async function removeUserRole(
  targetUserId: string,
  targetEmail: string,
  ownerUser: UserProfile
): Promise<void> {
  const isOwner = ownerUser.role === 'owner' || ownerUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  if (!isOwner) {
    throw new Error('শুধুমাত্র সিস্টেম ওনার (Owner) অ্যাডমিন বা মডারেটর এক্সেস বাতিল করতে পারেন।');
  }

  if (targetEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    throw new Error('ওনার অ্যাকাউন্ট কখনো অপসারণ বা বাতিল করা যাবে না।');
  }

  // 1. Delete from roles collection
  const roleRef = doc(db, 'roles', targetUserId);
  await deleteDoc(roleRef);

  // 2. Reset user's role to student
  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, { role: 'student' });

  await logAdminAction({
    adminId: ownerUser.uid,
    adminEmail: ownerUser.email,
    action: 'ROLE_REVOKED',
    targetEntity: 'roles',
    targetId: targetUserId,
    details: `Revoked admin privileges for ${targetEmail}, reset to student`,
  });
}

export async function toggleUserBlock(
  targetUserId: string,
  targetEmail: string,
  currentBlocked: boolean,
  adminUser: UserProfile
): Promise<boolean> {
  if (targetEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    throw new Error('ওনার অ্যাকাউন্টকে কোনোভাবেই ব্লক করা যাবে না।');
  }

  const newStatus = !currentBlocked;
  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, { isBlocked: newStatus });

  await logAdminAction({
    adminId: adminUser.uid,
    adminEmail: adminUser.email,
    action: newStatus ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
    targetEntity: 'users',
    targetId: targetUserId,
    details: `${newStatus ? 'Blocked' : 'Unblocked'} user ${targetEmail}`,
  });

  return newStatus;
}
