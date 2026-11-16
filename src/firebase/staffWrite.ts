/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Transaction,
  WriteBatch,
  SetOptions,
} from 'firebase/firestore';
import { db } from './config';

export interface StaffAuthSession {
  uid: string;
  role: 'admin' | 'reviewer';
  proofSecret: string;
}

const STAFF_SESSION_KEY = 'tp_staff_session_v3';

export function saveStaffSession(session: StaffAuthSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(STAFF_SESSION_KEY);
    } else {
      localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadStaffSession(): StaffAuthSession | null {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StaffAuthSession>;
    if (
      parsed &&
      typeof parsed.uid === 'string' &&
      (parsed.role === 'admin' || parsed.role === 'reviewer') &&
      typeof parsed.proofSecret === 'string' &&
      parsed.proofSecret.length >= 32
    ) {
      return parsed as StaffAuthSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function getStaffOpRef(collectionName: string, docId: string) {
  return doc(db, 'staff_ops', `${collectionName}__${docId}`);
}

export function attachStaffOpToBatch(
  batch: WriteBatch,
  collectionName: string,
  docId: string,
  session: StaffAuthSession
) {
  batch.set(getStaffOpRef(collectionName, docId), {
    role: session.role,
    authProof: session.proofSecret,
    opTime: serverTimestamp(),
  });
}

export function attachStaffOpToTx(
  transaction: Transaction,
  collectionName: string,
  docId: string,
  session: StaffAuthSession
) {
  transaction.set(getStaffOpRef(collectionName, docId), {
    role: session.role,
    authProof: session.proofSecret,
    opTime: serverTimestamp(),
  });
}

export async function staffSetDoc(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  session: StaffAuthSession | null,
  options?: SetOptions
): Promise<void> {
  const targetRef = doc(db, collectionName, docId);
  if (!session) {
    if (options) {
      await setDoc(targetRef, data, options);
    } else {
      await setDoc(targetRef, data);
    }
    return;
  }

  const batch = writeBatch(db);
  if (options) {
    batch.set(targetRef, data, options);
  } else {
    batch.set(targetRef, data);
  }
  attachStaffOpToBatch(batch, collectionName, docId, session);
  await batch.commit();
}

export async function staffUpdateDoc(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  session: StaffAuthSession | null
): Promise<void> {
  const targetRef = doc(db, collectionName, docId);
  if (!session) {
    await updateDoc(targetRef, data);
    return;
  }

  const batch = writeBatch(db);
  batch.update(targetRef, data);
  attachStaffOpToBatch(batch, collectionName, docId, session);
  await batch.commit();
}

export async function staffDeleteDoc(
  collectionName: string,
  docId: string,
  session: StaffAuthSession | null
): Promise<void> {
  const targetRef = doc(db, collectionName, docId);
  if (!session) {
    await deleteDoc(targetRef);
    return;
  }

  const batch = writeBatch(db);
  batch.delete(targetRef);
  attachStaffOpToBatch(batch, collectionName, docId, session);
  await batch.commit();
}
