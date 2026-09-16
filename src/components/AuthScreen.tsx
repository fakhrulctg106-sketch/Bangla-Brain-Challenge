import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain, ShieldCheck, UserPlus, LogIn, AlertCircle, Phone, Smartphone, CheckCircle2 } from 'lucide-react';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '../services/firebase';

type AuthMode = 'login' | 'register' | 'phone';

export const AuthScreen: React.FC = () => {
  const { login, loginWithGoogle, register, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      setIsLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('সাইন-ইন উইন্ডো বন্ধ করা হয়েছে। আবার চেষ্টা করুন।');
      } else {
        setErrorMsg('Google সাইন-ইনে সমস্যা হয়েছে: ' + (err.message || 'পুনরায় চেষ্টা করুন।'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setErrorMsg('reCAPTCHA মেয়াদ শেষ হয়েছে। আবার চেষ্টা করুন।');
        },
      });
    }
    return recaptchaVerifierRef.current;
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone) {
      setErrorMsg('সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    if (formattedPhone.startsWith('01')) {
      formattedPhone = '+88' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+880' + formattedPhone;
    }

    try {
      setIsLoading(true);
      const appVerifier = setupRecaptcha();
      const confirmation = await sendPhoneOtp(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setSuccessMsg(`একটি ৬ সংখ্যার ওটিপি (OTP) কোড পাঠানো হয়েছে: ${formattedPhone}`);
    } catch (err: any) {
      console.error('Phone OTP error:', err);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch {
          // ignore
        }
      }
      let message = 'মোবাইলে ওটিপি পাঠাতে সমস্যা হয়েছে।';
      if (err.code === 'auth/invalid-phone-number') {
        message = 'মোবাইল নম্বরটি সঠিক নয়। উদাহরণ: 017XXXXXXXX';
      } else if (err.code === 'auth/quota-exceeded') {
        message = 'এসএমএস কোটা শেষ হয়েছে। অনুগ্রহ করে Google বা Email দিয়ে প্রবেশ করুন।';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Firebase Console-এ Phone Authentication এখনো সক্রিয় করা নেই। অনুগ্রহ করে Google বোতামটি ব্যবহার করে প্রবেশ করুন।';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!confirmationResult || !otpCode.trim()) {
      setErrorMsg('অনুগ্রহ করে এসএমএসে প্রাপ্ত ৬ সংখ্যার ওটিপি কোড লিখুন।');
      return;
    }

    try {
      setIsLoading(true);
      await verifyPhoneOtp(confirmationResult, otpCode.trim(), name, studentId);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      let message = 'ওটিপি কোড সঠিক নয় বা মেয়াদ শেষ হয়েছে।';
      if (err.code === 'auth/invalid-verification-code') {
        message = 'ভুল ওটিপি কোড। পুনরায় যাচাই করে লিখুন।';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (authMode === 'register') {
      if (!name.trim()) {
        setErrorMsg('অনুগ্রহ করে আপনার নাম লিখুন।');
        return;
      }
      if (!termsAccepted) {
        setErrorMsg('সেবা ও গোপনীয়তার শর্তাবলীতে সম্মতি প্রদান বাধ্যতামূলক।');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        return;
      }
    }

    try {
      setIsLoading(true);
      if (authMode === 'register') {
        await register(name, email, password, studentId);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'লগইনে সমস্যা হয়েছে। তথ্য যাচাই করে পুনরায় চেষ্টা করুন।';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials'
      ) {
        message = 'ইমেইল বা পাসওয়ার্ড সঠিক নয় অথবা অ্যাকাউন্টটি এখনো নিবন্ধিত হয়নি। আপনি "নতুন নিবন্ধন" ট্যাবে অ্যাকাউন্ট তৈরি করতে পারেন অথবা সরাসরি Google অ্যাকাউন্টের মাধ্যমে প্রবেশ করতে পারেন।';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'এই ইমেইলটি ইতিমধ্যে নিবন্ধিত হয়েছে। প্রবেশ করতে "ইমেইল লগইন" ট্যাবে যান।';
      } else if (err.code === 'auth/weak-password') {
        message = 'পাসওয়ার্ডটি অত্যন্ত দুর্বল। কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।';
      } else if (err.code === 'auth/invalid-email') {
        message = 'একটি কার্যকর ও সঠিক ইমেইল ঠিকানা প্রদান করুন।';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Firebase Console-এ Email/Password পদ্ধতি সক্রিয় নেই। উপরের "Google অ্যাকাউন্টের মাধ্যমে প্রবেশ করুন" বোতামে চাপ দিন।';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'ইন্টারনেট সংযোগে ত্রুটি। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8">
      <div id="recaptcha-container"></div>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-teal-700 px-6 py-8 text-center text-white">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-xs">
            <Brain className="w-10 h-10 text-teal-200" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bangla Brain Challenge</h1>
          <p className="text-teal-100 text-sm mt-1">জাতীয় শিক্ষামূলক কুইজ ও বুদ্ধিমত্তা প্রতিযোগিতা প্ল্যাটফর্ম</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-teal-800/60 rounded-full text-xs text-teal-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Developer: Fakhrul Islam</span>
          </div>
        </div>

        {/* Instant Google Login (Fastest & Active) */}
        <div className="p-6 pb-2">
          <button
            id="google-signin-btn-top"
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold rounded-xl text-sm border-2 border-teal-600/30 hover:border-teal-600 transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google অ্যাকাউন্টের মাধ্যমে প্রবেশ করুন</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-medium">অথবা অন্যান্য মাধ্যম</span>
            </div>
          </div>
        </div>

        {/* 3-Tab Toggle: Login / Register / Phone */}
        <div className="flex border-y border-slate-200 bg-slate-50 text-xs">
          <button
            id="tab-login-btn"
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 font-semibold text-center transition-colors ${
              authMode === 'login'
                ? 'text-teal-700 border-b-2 border-teal-600 bg-white font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ইমেইল লগইন
          </button>
          <button
            id="tab-register-btn"
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 font-semibold text-center transition-colors ${
              authMode === 'register'
                ? 'text-teal-700 border-b-2 border-teal-600 bg-white font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            নতুন নিবন্ধন
          </button>
          <button
            id="tab-phone-btn"
            type="button"
            onClick={() => { setAuthMode('phone'); setErrorMsg(''); setSuccessMsg(''); setOtpSent(false); }}
            className={`flex-1 py-3 font-semibold text-center transition-colors flex items-center justify-center gap-1 ${
              authMode === 'phone'
                ? 'text-teal-700 border-b-2 border-teal-600 bg-white font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Phone className="w-3 h-3" />
            <span>ফোন নম্বর</span>
          </button>
        </div>

        {/* Messages */}
        <div className="px-6 pt-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Phone Auth Mode */}
        {authMode === 'phone' ? (
          <div className="p-6 pt-2 space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="phone-number-input"
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="যেমন: 01712345678"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">আপনার নম্বরে ৬ সংখ্যার ভেরিফিকেশন এসএমএস যাবে।</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    আপনার নাম (ঐচ্ছিক)
                  </label>
                  <input
                    id="phone-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="আপনার পুরো নাম"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  />
                </div>

                <button
                  id="send-otp-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-medium rounded-lg text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? <span>কোড পাঠানো হচ্ছে...</span> : <span>ওটিপি কোড পাঠান</span>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ৬ সংখ্যার ওটিপি কোড (OTP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="otp-code-input"
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 tracking-widest text-center font-mono font-bold text-lg rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  />
                </div>

                <button
                  id="verify-otp-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-medium rounded-lg text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? <span>যাচাই করা হচ্ছে...</span> : <span>যাচাই করুন ও প্রবেশ করুন</span>}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className="text-xs text-teal-700 hover:underline font-semibold"
                  >
                    নম্বর পরিবর্তন করুন
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Email/Password Form Body */
          <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    পুরো নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="reg-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: মো: আরিফুল ইসলাম"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ইউজারনেম বা শিক্ষার্থী আইডি (ঐচ্ছিক)
                  </label>
                  <input
                    id="reg-studentid-input"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="যেমন: STU-10294"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ইমেইল ঠিকানা <span className="text-rose-500">*</span>
              </label>
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@student.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পাসওয়ার্ড <span className="text-rose-500">*</span>
              </label>
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষর"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>

            {authMode === 'register' && (
              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    id="reg-terms-checkbox"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    আমি প্ল্যাটফর্মের সমস্ত নীতিমালা, শিষ্টাচার এবং গোপনীয়তার শর্তাবলীতে সম্মতি জ্ঞাপন করছি।
                  </span>
                </label>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-medium rounded-lg text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>প্রক্রিয়াধীন...</span>
              ) : authMode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>অ্যাকাউন্ট তৈরি করুন</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ইমেইল দিয়ে লগইন করুন</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Developer: <strong className="text-slate-700 font-semibold">Fakhrul Islam</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail('fakhrulctg106@gmail.com');
              setAuthMode('login');
            }}
            className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold cursor-pointer underline"
          >
            অ্যাডমিন ইমেইল পূরণ করুন (fakhrulctg106@gmail.com)
          </button>
        </div>
      </div>
    </div>
  );
};

