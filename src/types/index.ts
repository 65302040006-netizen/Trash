/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'reviewer' | 'admin';

export type TrashType = 'general' | 'recycle' | 'paper' | 'other';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type RedemptionStatus = 'pending' | 'delivered';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  className: string; // e.g. "ม.6/2"
  number: string; // e.g. "12"
  studentId?: string; // e.g. "54321"
  avatar: string; // avatar identifier or url
  role: UserRole;
  totalEarned: number; // Cumulative earned points (never decreases, used for certificate & leaderboard)
  balance: number; // Current spendable points
  totalPieces: number; // Total pieces of trash collected
  certificateEarned: boolean;
  disabled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TrashLocation {
  id: string;
  name: string;
  qrCode: string;
  description?: string;
  active: boolean;
  createdAt?: string;
}

export interface Submission {
  id: string;
  userId: string;
  userName: string;
  className: string;
  type: TrashType;
  isRecycle: boolean;
  pieces: number;
  approvedPieces?: number;
  locationId: string;
  locationName: string;
  beforePhoto: string; // compressed base64 JPEG
  afterPhoto: string; // compressed base64 JPEG
  imageHash?: string;
  properlyDisposed: boolean;
  status: SubmissionStatus;
  points: number;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  rejectReason?: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  name: string;
  category: string;
  icon: string;
  cost: number;
  stock: number;
  month?: string;
  active: boolean;
}

export interface Redemption {
  id: string;
  userId: string;
  userName: string;
  className: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  code: string; // Short code e.g. "TP-8472"
  status: RedemptionStatus;
  createdAt: string;
  deliveredBy?: string;
  deliveredAt?: string;
}

export interface Mission {
  id: string;
  title: string;
  description?: string;
  targetType: 'general' | 'recycle' | 'any' | 'share';
  targetCount: number;
  bonusPoints: number;
  active: boolean;
}

export interface DailyMissionProgress {
  userId: string;
  date: string; // "YYYY-MM-DD"
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
}

export interface AppNotification {
  id: string;
  userId: string; // specific user ID or "all"
  type: 'points' | 'rejected' | 'certificate' | 'reward' | 'announcement';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AppSettings {
  id?: string;
  generalMin: number; // default: 5
  generalPerPiece: number; // default: 1
  recycleMin: number; // default: 15
  recyclePerPiece: number; // default: 2
  certificateTarget: number; // default: 100
  dailySubmitLimit: number; // default: 3
  maxPiecesPerSubmit: number; // default: 50
  announcement?: string;
}
