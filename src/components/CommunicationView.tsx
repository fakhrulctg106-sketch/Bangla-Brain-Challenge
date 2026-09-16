import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, ChatThread } from '../types';
import {
  sendChatMessage,
  getOrCreateDirectChat,
  submitReport,
  blockUser,
  DEVELOPER_ID,
  DEVELOPER_NAME,
} from '../services/communication';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import {
  Send,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  ShieldAlert,
  UserX,
  MessageSquare,
  Sparkles,
  Info,
  CheckCheck
} from 'lucide-react';

interface CommunicationViewProps {
  currentUser: UserProfile;
}

export const CommunicationView: React.FC<CommunicationViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'developer' | 'students'>('developer');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccessNotice, setReportSuccessNotice] = useState(false);
  const [isInAudioCall, setIsInAudioCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Thread with Developer Fakhrul Islam or Student Room
  useEffect(() => {
    let mounted = true;

    async function initChat() {
      if (activeTab === 'developer') {
        const id = await getOrCreateDirectChat(
          currentUser.uid,
          currentUser.displayName,
          DEVELOPER_ID,
          DEVELOPER_NAME,
          true
        );
        if (mounted) setChatId(id);
      } else {
        const id = 'student_community_hub';
        if (mounted) setChatId(id);
      }
    }

    initChat();
    return () => {
      mounted = false;
    };
  }, [activeTab, currentUser]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!chatId) return;

    const msgCol = collection(db, 'messages');
    const q = query(msgCol, where('chatId', '==', chatId), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          list.push({ ...(doc.data() as ChatMessage), id: doc.id });
        });
        setMessages(list);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (err) => {
        console.warn('Chat listener notice:', err);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  // Audio Call duration counter
  useEffect(() => {
    let interval: any;
    if (isInAudioCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isInAudioCall]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatId) return;

    const text = inputText;
    setInputText('');
    try {
      await sendChatMessage(chatId, currentUser.uid, currentUser.displayName, text);
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleStartAudioCall = () => {
    setIsInAudioCall(true);
  };

  const handleEndAudioCall = () => {
    setIsInAudioCall(false);
    setIsMuted(false);
  };

  const handleReportSubmit = async () => {
    if (!reportReason) return;
    try {
      await submitReport(
        currentUser.uid,
        currentUser.displayName,
        activeTab === 'developer' ? DEVELOPER_ID : 'community_user',
        activeTab === 'developer' ? DEVELOPER_NAME : 'শিক্ষার্থী',
        reportReason
      );
      setShowReportModal(false);
      setReportReason('');
      setReportSuccessNotice(true);
      setTimeout(() => setReportSuccessNotice(false), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="communication-container" className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[75vh]">
      {/* Top Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
            {activeTab === 'developer' ? 'FI' : 'SC'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'developer'
                ? `ডেভেলপার সাপোর্ট: ${DEVELOPER_NAME}`
                : 'শিক্ষার্থী আলোচনা রুম (Student Hub)'}
            </h3>
            <p className="text-xs text-slate-500">
              {activeTab === 'developer'
                ? 'সরাসরি পরামর্শ, অভিযোগ বা কারিগরি সহায়তা'
                : 'লাইভ প্রশ্ন উত্তর ও যৌথ প্রস্তুতি'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="অডিও কল"
            onClick={handleStartAudioCall}
            className="p-2 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="ব্যবহারকারী রিপোর্ট করুন"
            onClick={() => setShowReportModal(true)}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('developer')}
          className={`flex-1 py-2.5 text-center cursor-pointer transition-colors ${
            activeTab === 'developer'
              ? 'border-b-2 border-teal-600 text-teal-800 bg-white'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ডেভেলপার সরাসরি বার্তা (Fakhrul Islam)
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2.5 text-center cursor-pointer transition-colors ${
            activeTab === 'students'
              ? 'border-b-2 border-teal-600 text-teal-800 bg-white'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          সহপাঠীদের সাথে আলোচনা
        </button>
      </div>

      {/* Report submitted notice */}
      {reportSuccessNotice && (
        <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-4 py-2.5 text-xs flex items-center justify-between">
          <span>রিপোর্ট সফলভাবে জমা হয়েছে। অ্যাডমিন টিম এটি পর্যালোচনা করবে।</span>
          <button
            type="button"
            onClick={() => setReportSuccessNotice(false)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Audio Call Active Banner (WebRTC Module) */}
      {isInAudioCall && (
        <div className="bg-teal-900 text-white p-3 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="font-semibold">ভয়েস কল সক্রিয়</span>
            <span className="text-teal-300">
              ({Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md cursor-pointer text-xs flex items-center gap-1"
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'আনমিউট' : 'মিউট'}</span>
            </button>
            <button
              onClick={handleEndAudioCall}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-medium cursor-pointer flex items-center gap-1"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>কল শেষ করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">এখনো কোনো বার্তা নেই। প্রথম বার্তাটি পাঠান!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUser.uid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                {!isMine && (
                  <span className="text-[10px] text-slate-500 font-medium ml-1 mb-0.5">
                    {msg.senderName}
                  </span>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                    isMine
                      ? 'bg-teal-700 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input
          id="chat-input-text"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            activeTab === 'developer'
              ? 'ফখরুল ইসলাম-কে সরাসরি বার্তা লিখুন...'
              : 'শিক্ষার্থীদের জন্য বার্তা লিখুন...'
          }
          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-slate-900"
        />
        <button
          id="chat-send-btn"
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
        >
          <span>পাঠান</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Moderation Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-lg">
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>রিপোর্ট করুন (Report User/Content)</span>
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              অশালীন আচরণ, বিভ্রান্তিকর তথ্য বা নিয়ম লঙ্ঘনের ঘটনা বিস্তারিত লিখুন:
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              placeholder="রিপোর্টের সুনির্দিষ্ট কারণ লিখুন..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleReportSubmit}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg cursor-pointer"
              >
                রিপোর্ট জমা দিন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
