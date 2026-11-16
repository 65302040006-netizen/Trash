/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const VERIFY_SALT = 'TP_SEC_V3_9F4K2M8X';
const PROOF_SALT = 'TP_PROOF_SECRET_V3_7H1Q9W3Z';
const PROOF_PREFIX = 'TP_PROOF_V3:';

export interface StaffVerifyHashes {
  adminCredHash: string;
  adminPinHash: string;
  revCredHash: string;
  revPinHash: string;
  overrideActive?: boolean;
  updatedAt?: string;
}

export interface StaffProofRuleHashes {
  adminCredProofHash: string;
  adminPinProofHash: string;
  revCredProofHash: string;
  revPinProofHash: string;
  overrideActive?: boolean;
  updatedAt?: string;
}

// Initial salted SHA-256 verification hashes (no plaintext credentials stored)
export const INITIAL_VERIFY_HASHES: StaffVerifyHashes = {
  adminCredHash: '46710c6c7dbd84234f4dcf03c0bd5fd838bec7108990e23905333f94d8ffa4dc',
  adminPinHash: 'ab8334545c5f725fe8fcfdfbdcbece87f5f306114924684b9a410797092132b0',
  revCredHash: '529de02418fa1a2eaf6b1d170f965d9dcda0b5e144c10963edb6651848ce1973',
  revPinHash: 'aa141a47264614932475b692a0a96098522ad68bbcab2f4e8e2dda01047ed65c',
};

// Initial double-hashed proof digests for Firestore rule rotation continuity
export const INITIAL_PROOF_RULE_HASHES: StaffProofRuleHashes = {
  adminCredProofHash: '37b5e2fb13fd22e68ebb7b4758b818fdcc00eda39d24ebf3adfdba909fd95939',
  adminPinProofHash: '1606a2cb998df5af2c3ca1393931fadd841ffe852f4f75eaae2c1f74643e4923',
  revCredProofHash: 'a4dac78e849c5b67640ee8b011a8c55bbec1e8f130169b9dd4600f5172fe2680',
  revPinProofHash: 'e0b47a82d8ebe6eb4bcb9f28d250542fc4bff3df17716cc3beca5b6a817c6237',
};

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeVerifyHash(
  role: 'admin' | 'reviewer',
  mode: 'credentials' | 'pin',
  username: string,
  secret: string
): Promise<string> {
  if (mode === 'credentials') {
    const normalizedUser = username.trim().toLowerCase();
    return sha256Hex(`${VERIFY_SALT}:${role}:cred:${normalizedUser}:${secret.trim()}`);
  }
  return sha256Hex(`${VERIFY_SALT}:${role}:pin:${secret.trim()}`);
}

export async function computeProofSecret(
  role: 'admin' | 'reviewer',
  mode: 'credentials' | 'pin',
  username: string,
  secret: string
): Promise<string> {
  if (mode === 'credentials') {
    const normalizedUser = username.trim().toLowerCase();
    return sha256Hex(`${PROOF_SALT}:${role}:cred:${normalizedUser}:${secret.trim()}`);
  }
  return sha256Hex(`${PROOF_SALT}:${role}:pin:${secret.trim()}`);
}

export async function computeProofRuleHash(proofSecret: string): Promise<string> {
  return sha256Hex(`${PROOF_PREFIX}${proofSecret}`);
}

const WEAK_SECRETS = new Set([
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
  '87654321',
  '654321',
  '0000',
  '000000',
  '00000000',
  '111111',
  'admin',
  'admin123',
  'admin1234',
  'password',
  'teacher',
  '112233',
]);

export function validateSecretStrength(
  mode: 'credentials' | 'pin',
  secret: string
): string | null {
  const trimmed = secret.trim();
  if (WEAK_SECRETS.has(trimmed.toLowerCase())) {
    return 'รหัสผ่านหรือ PIN นี้ง่ายเกินไปและเสี่ยงต่อการถูกคาดเดา';
  }

  if (mode === 'pin') {
    if (!/^\d{6,12}$/.test(trimmed)) {
      return 'รหัส PIN ต้องเป็นตัวเลข 6–12 หลักเท่านั้น';
    }
    if (/^(\d)\1+$/.test(trimmed)) {
      return 'รหัส PIN ห้ามใช้ตัวเลขซ้ำกันทั้งหมด';
    }
    if ('012345678901'.includes(trimmed) || '987654321098'.includes(trimmed)) {
      return 'รหัส PIN ห้ามใช้เลขเรียงลำดับกัน';
    }
    return null;
  }

  if (trimmed.length < 8) {
    return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
  }
  const hasLetter = /[a-zA-Z]/.test(trimmed);
  const hasDigit = /\d/.test(trimmed);
  if (!hasLetter || !hasDigit) {
    return 'รหัสผ่านต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลขผสมกัน';
  }
  return null;
}
