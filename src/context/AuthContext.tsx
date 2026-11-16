/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signOut as firebaseSignOut } from 'firebase/auth';
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
  StaffAuthSession,
  saveStaffSession,
  loadStaffSession,
  staffSetDoc,
  staffUpdateDoc,
} from '../firebase/staffWrite';
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

export interface StaffLoginResult {
  ok: boolean;
  reason?: string;
}

export interface AuthContextType {
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  staffSession: StaffAuthSession | null;
  settings: AppSettings;
  loginStudentDirectly: (data: StudentFormData) => Promise<void>;
  loginAsStaff: (
    roleTarget: 'admin' | 'reviewer',
    mode: 'credentials' | 'pin',
    username: string,
    secret: string
  ) => Promise<StaffLoginResult>;
  updateStaffSessionProof: (newProofSecret: string) => void;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const STUDENT_UID_STORAGE_KEY = 'tp_student_uid_v3';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getOrCreateStudentUid(studentId?: string): string {
  const cleanedSid = (studentId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (cleanedSid.length >= 2) {
    const deterministicUid = `stu_id_${cleanedSid}`;
    try {
      localStorage.setItem(STUDENT_UID_STORAGE_KEY, deterministicUid);
    } catch {
      // Ignore storage errors
    }
    return deterministicUid;
  }

  try {
    const existing = localStorage.getItem(STUDENT_UID_STORAGE_KEY);
    if (existing && /^stu_[a-zA-Z0-9_-]+$/.test(existing)) {
      return existing;
    }
    const randomPart =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const newUid = `stu_${randomPart}`;
    localStorage.setItem(STUDENT_UID_STORAGE_KEY, newUid);
    return newUid;
  } catch {
    return `stu_${Date.now().toString(36)}`;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState<boolean>(true);
  const [staffSession, setStaffSession] = useState<StaffAuthSession | null>(() => loadStaffSession());
  const [activeLocalUid, setActiveLocalUid] = useState<string | null>(() => {
    const s = loadStaffSession();
    if (s) return s.uid;
    try {
      const stu = localStorage.getItem(STUDENT_UID_STORAGE_KEY);
      return stu && /^stu_[a-zA-Z0-9_-]+$/.test(stu) ? stu : null;
    } catch {
      return null;
    }
  });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Listen to global app settings continuously
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

  // Restore saved Staff or Student session and subscribe to user profile
  useEffect(() => {
    const savedStaff = loadStaffSession();
    const targetUid = savedStaff?.uid || activeLocalUid;

    if (!targetUid) {
      setProfile(null);
      setRole('student');
      setLoading(false);
      return;
    }

    if (savedStaff) {
      setStaffSession(savedStaff);
    }

    const userDocRef = doc(db, 'users', targetUid);
    const unsubProfile = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as UserProfile;
          if (userData.disabled) {
            setProfile(null);
            setRole('student');
            setLoading(false);
            return;
          }
          const resolvedRole: UserRole =
            savedStaff?.role || userData.role || 'student';
          setProfile({ ...userData, uid: docSnap.id, role: resolvedRole });
          setRole(resolvedRole);
        } else if (savedStaff) {
          const fallbackProf: UserProfile = {
            uid: savedStaff.uid,
            name:
              savedStaff.role === 'admin'
                ? 'ผู้ดูแลระบบโรงเรียน'
                : 'ครูผู้ตรวจหลักฐาน',
            className:
              savedStaff.role === 'admin'
                ? 'ฝ่ายผู้ดูแลระบบ'
                : 'คณะกรรมการสิ่งแวดล้อม',
            number: '1',
            studentId: savedStaff.role === 'admin' ? 'ADMIN' : 'STAFF',
            avatar: 'avatar_3',
            role: savedStaff.role,
            totalEarned: 0,
            balance: 0,
            totalPieces: 0,
            certificateEarned: false,
            profileCompleted: true,
            createdAt: new Date().toISOString(),
          };
          setProfile(fallbackProf);
          setRole(savedStaff.role);
        } else {
          setProfile(null);
          setRole('student');
        }
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${targetUid}`);
        setLoading(false);
      }
    );

    return () => {
      unsubProfile();
    };
  }, [activeLocalUid]);

  // Student Sign-in / Profile Registration (No Email / No Google needed)
  const loginStudentDirectly = async (data: StudentFormData): Promise<void> => {
    const uid = getOrCreateStudentUid(data.studentId);
    const userDocRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userDocRef);
    const now = new Date().toISOString();

    let finalProfile: UserProfile;
    if (existingSnap.exists()) {
      const existing = existingSnap.data() as UserProfile;
      if (existing.disabled) {
        throw new Error('บัญชีนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
      }
      finalProfile = {
        ...existing,
        uid,
        name: data.name.trim(),
        className: data.className.trim(),
        number: data.number.trim(),
        studentId: data.studentId?.trim() || existing.studentId || '',
        avatar: data.avatar,
        role: 'student',
        profileCompleted: true,
        updatedAt: now,
      };
      await updateDoc(userDocRef, {
        name: finalProfile.name,
        className: finalProfile.className,
        number: finalProfile.number,
        studentId: finalProfile.studentId,
        avatar: finalProfile.avatar,
        profileCompleted: true,
        updatedAt: now,
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
        createdAt: now,
      };
      await setDoc(userDocRef, finalProfile);
    }

    setStaffSession(null);
    saveStaffSession(null);
    setActiveLocalUid(uid);
    setProfile(finalProfile);
    setRole('student');
  };

  // Direct Email-free Staff Login (Admin & Reviewer) via PIN or Username+Password
  const loginAsStaff = async (
    roleTarget: 'admin' | 'reviewer',
    mode: 'credentials' | 'pin',
    username: string,
    secret: string
  ): Promise<StaffLoginResult> => {
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
      // Fall back to built-in initial salted hashes
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
    const staffUid = roleTarget === 'admin' ? 'staff_admin' : 'staff_reviewer';
    const session: StaffAuthSession = {
      uid: staffUid,
      role: roleTarget,
      proofSecret,
    };

    try {
      const now = new Date().toISOString();
      const userDocRef = doc(db, 'users', staffUid);
      const existingSnap = await getDoc(userDocRef);

      let staffProf: UserProfile;
      if (existingSnap.exists()) {
        const existing = existingSnap.data() as UserProfile;
        staffProf = {
          ...existing,
          uid: staffUid,
          role: roleTarget,
          profileCompleted: true,
          updatedAt: now,
        };
        await staffSetDoc('users', staffUid, staffProf as unknown as Record<string, unknown>, session, {
          merge: true,
        });
      } else {
        staffProf = {
          uid: staffUid,
          name: roleTarget === 'admin' ? 'ผู้ดูแลระบบโรงเรียน' : 'ครูผู้ตรวจหลักฐาน',
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
        await staffSetDoc('users', staffUid, staffProf as unknown as Record<string, unknown>, session);
      }

      saveStaffSession(session);
      setStaffSession(session);
      setActiveLocalUid(staffUid);
      setProfile(staffProf);
      setRole(roleTarget);

      if (roleTarget === 'admin') {
        await initializeSeedData(session);
      }

      return { ok: true };
    } catch (err) {
      console.error('Staff database session error:', err);
      return {
        ok: false,
        reason: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      };
    }
  };

  const updateStaffSessionProof = (newProofSecret: string) => {
    setStaffSession((prev) => {
      if (!prev) return null;
      const updated: StaffAuthSession = { ...prev, proofSecret: newProofSecret };
      saveStaffSession(updated);
      return updated;
    });
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    const targetUid = profile?.uid;
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
    if (targetUid) {
      const updatePayload: Record<string, unknown> = {
        name: data.name,
        className: data.className,
        number: data.number,
        studentId: data.studentId,
        avatar: data.avatar,
        updatedAt: new Date().toISOString(),
      };
      try {
        if (staffSession) {
          await staffUpdateDoc('users', targetUid, updatePayload, staffSession);
        } else {
          await updateDoc(doc(db, 'users', targetUid), updatePayload);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
      }
    }
  };

  const logout = async () => {
    saveStaffSession(null);
    setStaffSession(null);
    setActiveLocalUid(null);
    try {
      localStorage.removeItem(STUDENT_UID_STORAGE_KEY);
    } catch {
      // Ignore
    }
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch {
      // Ignore Firebase sign-out cleanup if none active
    }
    setProfile(null);
    setRole('student');
  };

  const refreshProfile = async () => {
    const targetUid = profile?.uid;
    if (!targetUid) return;
    try {
      const snap = await getDoc(doc(db, 'users', targetUid));
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
        profile,
        role,
        loading,
        staffSession,
        settings,
        loginStudentDirectly,
        loginAsStaff,
        updateStaffSessionProof,
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
