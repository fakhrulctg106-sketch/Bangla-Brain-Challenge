export type UserRole = 'owner' | 'admin' | 'moderator' | 'user' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  studentId: string;
  photoURL?: string;
  role: UserRole;
  isBlocked: boolean;
  totalScore: number;
  quizzesPlayed: number;
  correctAnswers: number;
  wrongAnswers: number;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizCategory {
  id: string;
  nameBn: string;
  nameEn: string;
  description: string;
  icon: string;
  order: number;
  isActive: boolean;
  isIslamic?: boolean;
  questionCount?: number;
}

export interface QuizQuestion {
  id?: string;
  categoryId: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0 to 3
  explanation: string;
  sourceReference: string; // mandatory for Islamic questions, reliable reference
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean; // active/inactive status
  isPublished?: boolean; // backwards compatibility alias
  randomKey?: number; // 0..1 random key for scalable O(1) Firestore sampling
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id?: string;
  userId: string;
  attemptToken: string;
  categoryId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  answers: {
    questionId?: string;
    question: string;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
  }[];
  completedAt: string;
}

export interface LeaderboardEntry {
  id?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  studentId?: string;
  score: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  periodKey: string;
  updatedAt: string;
}

export interface UserAchievement {
  id: string;
  titleBn: string;
  descriptionBn: string;
  icon: string;
  category: 'quiz' | 'streak' | 'math' | 'puzzle' | 'social';
  target: number;
  unlocked: boolean;
  progress: number;
}

export interface ChatMessage {
  id?: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
}

export interface ChatThread {
  id: string;
  type: 'direct' | 'developer' | 'group';
  participants: string[];
  participantNames?: Record<string, string>;
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
}

export interface WebRTCSignalingCall {
  id: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName?: string;
  status: 'ringing' | 'active' | 'ended' | 'declined';
  offer?: any;
  answer?: any;
  createdAt: string;
}

export interface ModerationReport {
  id?: string;
  reportedBy: string;
  reporterName?: string;
  reportedUserId: string;
  reportedUserName?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface AppAnnouncement {
  id?: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  publishedBy: string;
  createdAt: string;
}

export interface AppAuditLog {
  id?: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details: string;
  timestamp: string;
}

export interface AdminInvitation {
  id?: string;
  email: string;
  role: 'admin' | 'moderator';
  invitedBy: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
}

export interface AppConfiguration {
  adsEnabled: boolean;
  admobBannerId: string;
  admobInterstitialId: string;
  admobRewardedId: string;
  webAdsEnabled: boolean;
  audioCallsEnabled: boolean;
  chatEnabled: boolean;
  maintenanceMode: boolean;
  updatedAt?: string;
}

export interface UserNotification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  type: 'achievement' | 'quiz' | 'system' | 'chat';
  isRead: boolean;
  createdAt: string;
}
