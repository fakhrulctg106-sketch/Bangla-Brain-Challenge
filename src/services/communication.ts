import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage, ChatThread, ModerationReport, WebRTCSignalingCall } from '../types';

export const DEVELOPER_ID = 'dev_fakhrul_islam';
export const DEVELOPER_NAME = 'Fakhrul Islam';

/**
 * Sends a message in a chat thread
 */
export async function sendChatMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> {
  const msgCol = collection(db, 'messages');
  const now = new Date().toISOString();

  await addDoc(msgCol, {
    chatId,
    senderId,
    senderName,
    text: text.trim(),
    createdAt: now,
    isRead: false,
  });

  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage: text.trim(),
    lastSenderId: senderId,
    updatedAt: now,
  });
}

/**
 * Creates or gets an existing direct chat with Developer Fakhrul Islam or another student
 */
export async function getOrCreateDirectChat(
  currentUserId: string,
  currentUserName: string,
  targetUserId: string,
  targetUserName: string,
  isDeveloperChat = false
): Promise<string> {
  const chatId = [currentUserId, targetUserId].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);

  await setDoc(
    chatRef,
    {
      id: chatId,
      type: isDeveloperChat ? 'developer' : 'direct',
      participants: [currentUserId, targetUserId],
      participantNames: {
        [currentUserId]: currentUserName,
        [targetUserId]: targetUserName,
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return chatId;
}

/**
 * Submits a moderation report
 */
export async function submitReport(
  reporterId: string,
  reporterName: string,
  reportedUserId: string,
  reportedUserName: string,
  reason: string,
  details?: string
): Promise<void> {
  const reportsCol = collection(db, 'reports');
  await addDoc(reportsCol, {
    reportedBy: reporterId,
    reporterName,
    reportedUserId,
    reportedUserName,
    reason,
    details: details || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

/**
 * Block a user
 */
export async function blockUser(userId: string, targetUserId: string): Promise<void> {
  const blockCol = collection(db, 'blockedUsers');
  const blockId = `${userId}_${targetUserId}`;
  await setDoc(doc(blockCol, blockId), {
    userId,
    blockedUserId: targetUserId,
    createdAt: new Date().toISOString(),
  });
}
