/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { UserProfile, UserRole, AppSettings } from '../types';
import { DEFAULT_SETTINGS, initializeSeedData } from '../firebase/seed';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  settings: AppSettings;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (targetRole: UserRole) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = '65302040006@svc.ac.th';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Initialize seed data on startup
  useEffect(() => {
    initializeSeedData();
  }, []);

  // Listen to global app settings
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'app_config'),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as AppSettings);
        }
      },
      (err) => {
        console.warn('Settings fetch warning:', err);
      }
    );
    return () => unsub();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        // Snapshot listener for current user's profile
        unsubProfile = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              // Check if email is admin email
              const isAdminByEmail = firebaseUser.email === ADMIN_EMAIL;
              const effectiveRole: UserRole = isAdminByEmail
                ? 'admin'
                : data.role || 'student';

              setProfile({
                ...data,
                role: effectiveRole,
              });
              setRole(effectiveRole);
            } else {
              // New user not yet registered profile
              const isAdminByEmail = firebaseUser.email === ADMIN_EMAIL;
              const initialRole: UserRole = isAdminByEmail ? 'admin' : 'student';

              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'นักเรียนใหม่',
                email: firebaseUser.email || '',
                className: 'ม.1/1',
                number: '1',
                avatar: 'avatar_1',
                role: initialRole,
                totalEarned: 0,
                balance: 0,
                totalPieces: 0,
                certificateEarned: false,
                createdAt: new Date().toISOString(),
              };

              try {
                await setDoc(userDocRef, newProfile);
                setProfile(newProfile);
                setRole(initialRole);
              } catch (e) {
                console.error('Error saving initial user profile:', e);
              }
            }
            setLoading(false);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
            setLoading(false);
          }
        );
      } else {
        if (unsubProfile) unsubProfile();
        setProfile(null);
        setRole('student');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      console.error('Google Sign-in failed:', err);
      // If popup was blocked or failed, inform or fall back smoothly
      throw err;
    }
  };

  /**
   * Fast Demo Login for school evaluations
   */
  const loginAsDemo = async (targetRole: UserRole) => {
    setLoading(true);
    try {
      const cred = await signInAnonymously(auth);
      const demoUser = cred.user;
      const userDocRef = doc(db, 'users', demoUser.uid);

      let name = 'สมชาย รักสะอาด';
      let className = 'ม.6/2';
      let number = '15';
      let initialTotalEarned = 105; // Eligible for certificate demo!
      let initialBalance = 45;
      let initialTotalPieces = 48;

      if (targetRole === 'reviewer') {
        name = 'ครูวิมล ธรรมชาติ (ผู้ตรวจสอบ)';
        className = 'ห้องสิ่งแวดล้อม';
        number = '1';
        initialTotalEarned = 0;
        initialBalance = 0;
        initialTotalPieces = 0;
      } else if (targetRole === 'admin') {
        name = 'ผอ. สมเกียรติ สถิตย์ (ผู้ดูแลระบบ)';
        className = 'ฝ่ายบริหาร';
        number = '1';
        initialTotalEarned = 0;
        initialBalance = 0;
        initialTotalPieces = 0;
      }

      const demoProfile: UserProfile = {
        uid: demoUser.uid,
        name,
        email: `${targetRole}_demo@school.local`,
        className,
        number,
        studentId: targetRole === 'student' ? '54821' : undefined,
        avatar: targetRole === 'student' ? 'avatar_1' : 'avatar_3',
        role: targetRole,
        totalEarned: initialTotalEarned,
        balance: initialBalance,
        totalPieces: initialTotalPieces,
        certificateEarned: initialTotalEarned >= 100,
        createdAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, demoProfile, { merge: true });
      setProfile(demoProfile);
      setRole(targetRole);
    } catch (err) {
      console.error('Demo login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      setProfile((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    if (!profile || !user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { role: newRole });
      setRole(newRole);
      setProfile((prev) => (prev ? { ...prev, role: newRole } : null));
    } catch (err) {
      // Local state fallback if rule restricts
      setRole(newRole);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setProfile(null);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    } catch (e) {
      console.error('Refresh profile error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        settings,
        loginWithGoogle,
        loginAsDemo,
        updateProfileData,
        switchRole,
        logout,
        refreshProfile,
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
