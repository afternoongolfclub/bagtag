import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase.ts';

// A club move from one user to another. The recipient accepts or declines;
// the sender's app then removes (accepted) or restores (declined) its copy.
export type TransferStatus = 'pending' | 'accepted' | 'declined';

export interface ClubTransfer {
  id: string;
  fromUid: string;
  fromName: string;
  fromEmail: string;
  toUid: string;
  toEmail: string;
  clubId: string;
  club: Record<string, unknown>; // club fields as stored in Firestore
  status: TransferStatus;
}

const transfersCol = collection(db, 'transfers');

const toTransfer = (id: string, data: any): ClubTransfer => ({ id, ...data });

// Each user registers their email → uid so others can find them by email.
export const registerInDirectory = async (fbUser: FirebaseUser) => {
  if (!fbUser.email) return;
  await setDoc(doc(db, 'userDirectory', fbUser.email.toLowerCase()), {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email.split('@')[0],
  });
};

export const findUserByEmail = async (email: string): Promise<{ uid: string; name: string } | null> => {
  const snap = await getDoc(doc(db, 'userDirectory', email.trim().toLowerCase()));
  return snap.exists() ? (snap.data() as { uid: string; name: string }) : null;
};

export const createTransfer = async (
  from: FirebaseUser,
  to: { uid: string; email: string },
  clubId: string,
  club: Record<string, unknown>,
): Promise<string> => {
  const ref = await addDoc(transfersCol, {
    fromUid: from.uid,
    fromName: from.displayName || from.email?.split('@')[0] || '',
    fromEmail: from.email || '',
    toUid: to.uid,
    toEmail: to.email.trim().toLowerCase(),
    clubId,
    club,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getIncomingTransfers = async (uid: string): Promise<ClubTransfer[]> => {
  const snap = await getDocs(query(transfersCol, where('toUid', '==', uid), where('status', '==', 'pending')));
  return snap.docs.map(d => toTransfer(d.id, d.data()));
};

export const getOutgoingTransfers = async (uid: string): Promise<ClubTransfer[]> => {
  const snap = await getDocs(query(transfersCol, where('fromUid', '==', uid)));
  return snap.docs.map(d => toTransfer(d.id, d.data()));
};

export const acceptTransfer = async (uid: string, transfer: ClubTransfer) => {
  await addDoc(collection(db, 'users', uid, 'clubs'), { ...transfer.club, createdAt: serverTimestamp() });
  await updateDoc(doc(transfersCol, transfer.id), { status: 'accepted' });
};

export const declineTransfer = async (transferId: string) => {
  await updateDoc(doc(transfersCol, transferId), { status: 'declined' });
};

// Sender side: cancel a pending move, or clean up once the recipient has answered.
export const deleteTransfer = async (transferId: string) => {
  await deleteDoc(doc(transfersCol, transferId));
};
