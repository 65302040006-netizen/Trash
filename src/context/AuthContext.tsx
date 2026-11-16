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
import {
  INITIAL_VERIFY_HASHES,
  StaffVerifyHashes,
  computeVerifyHash,
  computeProofSecret,
} from '../utils/security';

export interface StudentFormData {
  name: string;
  className: string;
  number: string;
  studentId?: string;
  avatar: string;
}

export interface StaffVerifyResult {
  ok: boolean;
  proofSecret?: string;
  reason?: string;
}

export interface StaffElevationResult {
  ok: boolean;
  needsGooglePopup?: boolean;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  needsStudentRegistration: boolean;
  settings: AppSettings;
  loginWithGoogle: () => Promise<void>;
  completeStudentRegistration: (data: StudentFormData) => Promise<void>;
  verifyStaffSecret: (
    roleTarget: 'admin' | 'reviewer',
    mode: 'credentials' | 'pin',
    username: string,
    secret: string
  ) => Promise<StaffVerifyResult>;
  elevateWithGoogleAndProof: (
    roleTarget: 'admin' | 'reviewer',
    proofSecret: string
  ) => Promise<StaffElevationResult>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState<boolean>(true);
  const [needsStudentRegistration, setNeedsStudentRegistration] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Listen to global app settings once signed in
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  // Listen to Firebase Auth State
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        unsubProfile = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as UserProfile;
              if (userData.disabled) {
                setProfile(null);
                setRole('student');
                setNeedsStudentRegistration(false);
                setLoading(false);
                return;
              }
              if (userData.profileCompleted === false) {
                setProfile(null);
                setNeedsStudentRegistration(true);
              } else {
                setProfile({ ...userData, uid: docSnap.id });
                setRole(userData.role || 'student');
                setNeedsStudentRegistration(false);
              }
            } else {
              // New user: require registration form before entering app
              setProfile(null);
              setRole('student');
              setNeedsStudentRegistration(true);
            }
            setLoading(false);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setRole('student');
        setNeedsStudentRegistration(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const completeStudentRegistration = async (data: StudentFormData): Promise<void> => {
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser) {
      throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชี Google ก่อนบันทึกข้อมูล');
    }

    const uid = currentAuthUser.uid;
    const userDocRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userDocRef);

    let finalProfile: UserProfile;
    if (existingSnap.exists()) {
      const existing = existingSnap.data() as UserProfile;
      finalProfile = {
        ...existing,
        name: data.name.trim(),
        className: data.className.trim(),
        number: data.number.trim(),
        studentId: data.studentId?.trim() || existing.studentId || '',
        avatar: data.avatar,
        role: existing.role || 'student',
        profileCompleted: true,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(userDocRef, {
        name: finalProfile.name,
        className: finalProfile.className,
        number: finalProfile.number,
        studentId: finalProfile.studentId,
        avatar: finalProfile.avatar,
        profileCompleted: true,
        updatedAt: finalProfile.updatedAt,
      });
    } else {
      finalProfile = {
        uid,
        name: data.name.trim(),
        className: data.className.trim(),
        number: data.number.trim(),
        studentId: data.studentId?.trim() || '',
        avatar: data.avatar,
        role: 'student',
        totalEarned: 0,
        balance: 0,
        totalPieces: 0,
        certificateEarned: false,
        disabled: false,
        profileCompleted: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, finalProfile);
    }

    setProfile(finalProfile);
    setRole(finalProfile.role);
    setNeedsStudentRegistration(false);
  };

  const verifyStaffSecret = async (
    roleTarget: 'admin' | 'reviewer',
    mode: 'credentials' | 'pin',
    username: string,
    secret: string
  ): Promise<StaffVerifyResult> => {
    let activeHashes: StaffVerifyHashes = INITIAL_VERIFY_HASHES;
    try {
      const secSnap = await getDoc(doc(db, 'staff_security', 'hashes'));
      if (secSnap.exists()) {
        const data = secSnap.data() as StaffVerifyHashes;
        if (data.overrideActive) {
          activeHashes = {
            adminCredHash: data.adminCredHash || INITIAL_VERIFY_HASHES.adminCredHash,
            adminPinHash: data.adminPinHash || INITIAL_VERIFY_HASHES.adminPinHash,
            revCredHash: data.revCredHash || INITIAL_VERIFY_HASHES.revCredHash,
            revPinHash: data.revPinHash || INITIAL_VERIFY_HASHES.revPinHash,
            overrideActive: true,
          };
        }
      }
    } catch {
      // Fall back to built-in salted initial hashes
    }

    const inputHash = await computeVerifyHash(roleTarget, mode, username, secret);
    const expectedHash =
      roleTarget === 'admin'
        ? mode === 'credentials'
          ? activeHashes.adminCredHash
          : activeHashes.adminPinHash
        : mode === 'credentials'
        ? activeHashes.revCredHash
        : activeHashes.revPinHash;

    if (inputHash !== expectedHash) {
      return {
        ok: false,
        reason: 'ชื่อผู้ใช้ รหัสผ่าน หรือรหัส PIN ไม่ถูกต้อง',
      };
    }

    const proofSecret = await computeProofSecret(roleTarget, mode, username, secret);
    return {
      ok: true,
      proofSecret,
    };
  };

  const elevateWithGoogleAndProof = async (
    roleTarget: 'admin' | 'reviewer',
    proofSecret: string
  ): Promise<StaffElevationResult> => {
    let currentAuthUser = auth.currentUser;
    if (!currentAuthUser) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(auth, provider);
        currentAuthUser = cred.user;
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code || '';
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/cancelled-popup-request' ||
          code === 'auth/popup-closed-by-user'
        ) {
          return {
            ok: false,
            needsGooglePopup: true,
            error: 'เบราว์เซอร์บล็อกหน้าต่างยืนยัน Google กรุณากดปุ่มด้านล่างเพื่อเชื่อมต่อ Google และเปิดสิทธิ์บันทึกข้อมูล',
          };
        }
        return {
          ok: false,
          needsGooglePopup: true,
          error: 'ไม่สามารถเชื่อมต่อบัญชี Google ได้ กรุณาลองกดยืนยันอีกครั้ง',
        };
      }
    }

    try {
      const uid = currentAuthUser.uid;
      const now = new Date().toISOString();

      // Step 1: Write cryptographic proof to admins/{uid} or reviewers/{uid}
      const roleCollection = roleTarget === 'admin' ? 'admins' : 'reviewers';
      await setDoc(
        doc(db, roleCollection, uid),
        {
          active: true,
          authProof: proofSecret,
          updatedAt: now,
        },
        { merge: true }
      );

      // Step 2: Sync user profile role
      const userDocRef = doc(db, 'users', uid);
      const existingSnap = await getDoc(userDocRef);

      const defaultName =
        roleTarget === 'admin'
          ? currentAuthUser.displayName || 'ผู้ดูแลระบบโรงเรียน'
          : currentAuthUser.displayName || 'ครูผู้ตรวจหลักฐาน';

      if (existingSnap.exists()) {
        const existing = existingSnap.data() as UserProfile;
        await updateDoc(userDocRef, {
          role: roleTarget,
          profileCompleted: true,
          updatedAt: now,
        });
        setProfile({
          ...existing,
          uid,
          role: roleTarget,
          profileCompleted: true,
        });
      } else {
        const staffProf: UserProfile = {
          uid,
          name: defaultName,
          className: roleTarget === 'admin' ? 'ฝ่ายผู้ดูแลระบบ' : 'คณะกรรมการสิ่งแวดล้อม',
          number: '1',
          studentId: roleTarget === 'admin' ? 'ADMIN' : 'STAFF',
          avatar: 'avatar_3',
          role: roleTarget,
          totalEarned: 0,
          balance: 0,
          totalPieces: 0,
          certificateEarned: false,
          disabled: false,
          profileCompleted: true,
          createdAt: now,
        };
        await setDoc(userDocRef, staffProf);
        setProfile(staffProf);
      }

      if (roleTarget === 'admin') {
        await initializeSeedData();
      }

      setRole(roleTarget);
      setUser(currentAuthUser);
      setNeedsStudentRegistration(false);
      return { ok: true };
    } catch (err: unknown) {
      console.error('Staff elevation error:', err);
      return {
        ok: false,
        error: 'การยืนยันสิทธิ์กับฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบสิทธิ์บัญชีหรือติดต่อผู้ดูแลระบบ',
      };
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, {
          name: data.name,
          className: data.className,
          number: data.number,
          studentId: data.studentId,
          avatar: data.avatar,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
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
    setProfile(null);
    setRole('student');
    setNeedsStudentRegistration(false);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setProfile({ ...(snap.data() as UserProfile), uid: snap.id });
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
        needsStudentRegistration,
        settings,
        loginWithGoogle,
        completeStudentRegistration,
        verifyStaffSecret,
        elevateWithGoogleAndProof,
        updateProfileData,
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
