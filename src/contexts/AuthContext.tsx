import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import { UserProfile, UserRole } from '../types';
import { OWNER_EMAIL, DEVELOPER_NAME, initializeDatabaseSeed } from '../services/db';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canAccessAdmin: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, pass: string, studentId: string) => Promise<void>;
  sendPhoneOtp: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmationResult: ConfirmationResult, verificationCode: string, name?: string, studentId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [assignedRole, setAssignedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubRole: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // Clean up prior listeners
      if (unsubUser) unsubUser();
      if (unsubRole) unsubRole();

      setCurrentUser(fbUser);
      if (fbUser) {
        setLoading(true);
        const userDocRef = doc(db, 'users', fbUser.uid);
        const roleDocRef = doc(db, 'roles', fbUser.uid);

        // Check if email matches configured developer / owner email
        const isOwnerEmail = fbUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

        // Proactively set a baseline user profile so the app immediately renders the logged-in state
        setUserProfile((prev) => {
          if (prev && prev.uid === fbUser.uid) return prev;
          const initialRole: UserRole = isOwnerEmail ? 'owner' : 'user';
          return {
            uid: fbUser.uid,
            email: fbUser.email || (fbUser.phoneNumber ? `${fbUser.phoneNumber}@phone.user` : ''),
            displayName: fbUser.displayName || (isOwnerEmail ? DEVELOPER_NAME : 'ব্যবহারকারী'),
            studentId: isOwnerEmail ? 'OWNER-001' : `STU-${Math.floor(100000 + Math.random() * 900000)}`,
            role: initialRole,
            isBlocked: false,
            totalScore: 0,
            quizzesPlayed: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            currentStreak: 1,
            bestStreak: 1,
            lastActiveDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });

        // If Owner account, proactively bootstrap the Firestore roles document
        if (isOwnerEmail) {
          setAssignedRole('owner');
          try {
            await setDoc(
              roleDocRef,
              {
                role: 'owner',
                assignedAt: new Date().toISOString(),
                email: fbUser.email,
              },
              { merge: true }
            );
            // Run seed check as Owner to verify system categories and collections exist
            initializeDatabaseSeed(true).catch((e) => console.warn('Seed init check:', e));
          } catch (e) {
            console.warn('Owner role bootstrap notice:', e);
          }
        }

        // 1. Subscribe to secure roles collection
        unsubRole = onSnapshot(
          roleDocRef,
          (rSnap) => {
            if (rSnap.exists()) {
              const rData = rSnap.data();
              if (rData.role && ['owner', 'admin', 'moderator', 'user'].includes(rData.role)) {
                setAssignedRole(rData.role as UserRole);
                return;
              }
            }
            if (isOwnerEmail) {
              setAssignedRole('owner');
            } else {
              setAssignedRole(null);
            }
          },
          (err) => {
            console.warn('Roles listener warning:', err);
            if (isOwnerEmail) setAssignedRole('owner');
          }
        );

        // 2. Subscribe to user document changes
        unsubUser = onSnapshot(
          userDocRef,
          async (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;

              if (isOwnerEmail && data.role !== 'owner') {
                data.role = 'owner';
                updateDoc(userDocRef, { role: 'owner' }).catch((e) =>
                  console.warn('Syncing owner role to profile:', e)
                );
              } else if (!isOwnerEmail && data.role === 'owner') {
                // Non-owner cannot have owner role
                data.role = 'user';
                updateDoc(userDocRef, { role: 'user' }).catch((e) =>
                  console.warn('Demoting invalid owner role:', e)
                );
              }

              setUserProfile(data);
            } else {
              // New user registration profile initialization
              const initialRole: UserRole = isOwnerEmail ? 'owner' : 'user';
              const newProfile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || (fbUser.phoneNumber ? `${fbUser.phoneNumber}@phone.user` : ''),
                displayName: fbUser.displayName || (isOwnerEmail ? DEVELOPER_NAME : 'শিক্ষার্থী'),
                studentId: isOwnerEmail ? 'OWNER-001' : `STU-${Math.floor(100000 + Math.random() * 900000)}`,
                role: initialRole,
                isBlocked: false,
                totalScore: 0,
                quizzesPlayed: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                currentStreak: 1,
                bestStreak: 1,
                lastActiveDate: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              await setDoc(userDocRef, newProfile).catch((e) => console.warn('setDoc user profile:', e));
              if (isOwnerEmail) {
                await setDoc(
                  roleDocRef,
                  {
                    role: 'owner',
                    assignedAt: new Date().toISOString(),
                    email: fbUser.email,
                  },
                  { merge: true }
                ).catch((e) => console.warn('setDoc roleDocRef:', e));
              }
              setUserProfile(newProfile);
            }
            setLoading(false);
          },
          (err) => {
            console.warn('User profile listener warning:', err);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setAssignedRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
      if (unsubRole) unsubRole();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim();
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = cred.user;
      const isOwnerEmail = cleanEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
      const initialRole: UserRole = isOwnerEmail ? 'owner' : 'user';
      setUserProfile({
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: fbUser.displayName || (isOwnerEmail ? DEVELOPER_NAME : 'ব্যবহারকারী'),
        studentId: isOwnerEmail ? 'OWNER-001' : `USR-${Math.floor(100000 + Math.random() * 900000)}`,
        role: initialRole,
        isBlocked: false,
        totalScore: 0,
        quizzesPlayed: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        currentStreak: 1,
        bestStreak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (isOwnerEmail) {
        setAssignedRole('owner');
      }
    } catch (err: any) {
      const isOwnerEmail = cleanEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
      // If developer account does not exist in newly linked Firebase instance, auto-register seamlessly
      if (
        isOwnerEmail &&
        (err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/invalid-login-credentials')
      ) {
        try {
          await register(DEVELOPER_NAME, cleanEmail, pass, 'OWNER-001');
          return;
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            throw err;
          }
          throw regErr;
        }
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const register = async (name: string, email: string, pass: string, studentId: string) => {
    const cleanEmail = email.trim();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = cred.user;
    const isOwnerAccount = cleanEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const initialRole: UserRole = isOwnerAccount ? 'owner' : 'user';

    const newProfile: UserProfile = {
      uid: fbUser.uid,
      email: cleanEmail,
      displayName: name || (isOwnerAccount ? DEVELOPER_NAME : 'ব্যবহারকারী'),
      studentId: studentId.trim() || (isOwnerAccount ? 'OWNER-001' : `USR-${Math.floor(100000 + Math.random() * 900000)}`),
      role: initialRole,
      isBlocked: false,
      totalScore: 0,
      quizzesPlayed: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentStreak: 1,
      bestStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', fbUser.uid), newProfile);
    if (isOwnerAccount) {
      await setDoc(
        doc(db, 'roles', fbUser.uid),
        {
          role: 'owner',
          assignedAt: new Date().toISOString(),
          email: cleanEmail,
        },
        { merge: true }
      );
    }
    setUserProfile(newProfile);
  };

  const sendPhoneOtp = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  const verifyPhoneOtp = async (
    confirmationResult: ConfirmationResult,
    verificationCode: string,
    name?: string,
    studentId?: string
  ) => {
    const cred = await confirmationResult.confirm(verificationCode);
    const fbUser = cred.user;
    const isOwnerAccount = fbUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const initialRole: UserRole = isOwnerAccount ? 'owner' : 'user';

    const userDocRef = doc(db, 'users', fbUser.uid);
    const existingDoc = await getDoc(userDocRef);

    if (!existingDoc.exists()) {
      const newProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || (fbUser.phoneNumber ? `${fbUser.phoneNumber}@phone.user` : ''),
        displayName: name || fbUser.displayName || (isOwnerAccount ? DEVELOPER_NAME : 'ব্যবহারকারী'),
        studentId: studentId?.trim() || (isOwnerAccount ? 'OWNER-001' : `USR-${Math.floor(100000 + Math.random() * 900000)}`),
        role: initialRole,
        isBlocked: false,
        totalScore: 0,
        quizzesPlayed: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        currentStreak: 1,
        bestStreak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newProfile);
      setUserProfile(newProfile);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  // Secure RBAC Role Determination from database-verified roles document and profile
  const effectiveRole: UserRole =
    assignedRole ||
    (userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'moderator'
      ? userProfile.role
      : 'user');
  const role: UserRole = effectiveRole;
  const isOwner = effectiveRole === 'owner';
  const isAdmin = isOwner || effectiveRole === 'admin';
  const isModerator = isAdmin || effectiveRole === 'moderator';
  const canAccessAdmin = isOwner || isAdmin || isModerator;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        isOwner,
        isAdmin,
        isModerator,
        canAccessAdmin,
        loading,
        login,
        loginWithGoogle,
        register,
        sendPhoneOtp,
        verifyPhoneOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
