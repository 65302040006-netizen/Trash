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

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  settings: AppSettings;
  loginWithGoogle: () => Promise<void>;
  loginAsAdminDirect: () => void;
  loginAsStudentDirect: () => void;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_EMAIL = '65302040006@svc.ac.th';

export const DEFAULT_GUEST_PROFILE: UserProfile = {
  uid: 'guest_student_01',
  name: 'เด็กชายสมชาย รักสะอาด',
  email: 'student@svc.ac.th',
  className: 'ม.6/2',
  number: '15',
  studentId: '54321',
  avatar: 'avatar_1',
  role: 'student',
  totalEarned: 35,
  balance: 35,
  totalPieces: 24,
  certificateEarned: false,
  createdAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(DEFAULT_GUEST_PROFILE);
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState<boolean>(false);
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
        // Fall back to active guest profile so app is immediately visible and usable
        setProfile((prev) => prev || DEFAULT_GUEST_PROFILE);
        setRole((prev) => prev || 'student');
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
      throw err;
    }
  };

  const loginAsAdminDirect = () => {
    const adminProf: UserProfile = {
      uid: 'admin_65302040006',
      name: 'ผู้ดูแลระบบโรงเรียน (SVC)',
      email: ADMIN_EMAIL,
      className: 'กลุ่มงานสิ่งแวดล้อม',
      number: '1',
      studentId: 'ADM-001',
      avatar: 'avatar_3',
      role: 'admin',
      totalEarned: 150,
      balance: 150,
      totalPieces: 105,
      certificateEarned: true,
      createdAt: new Date().toISOString(),
    };
    setProfile(adminProf);
    setRole('admin');
  };

  const loginAsStudentDirect = () => {
    setProfile(DEFAULT_GUEST_PROFILE);
    setRole('student');
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, {
          ...data,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const switchRole = async (newRole: UserRole) => {
    setRole(newRole);
    setProfile((prev) => (prev ? { ...prev, role: newRole } : null));
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { role: newRole });
      } catch (err) {
        console.warn('Role switch rule warning:', err);
      }
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    setProfile(DEFAULT_GUEST_PROFILE);
    setRole('student');
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
        loginAsAdminDirect,
        loginAsStudentDirect,
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
