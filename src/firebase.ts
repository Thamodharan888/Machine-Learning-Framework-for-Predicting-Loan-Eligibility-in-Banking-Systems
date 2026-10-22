import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ApplicationRecord, UserAuth } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Configure Google OAuth 2.0 Provider with account chooser prompt
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

/**
 * Syncs authenticated Firebase user profile to Firestore `/users/{uid}`
 * Adheres strictly to `firebase-blueprint.json` UserPublicProfile schema.
 */
export async function syncFirebaseUserProfile(user: UserAuth): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const cleanUid = fbUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!cleanUid) return;

  const userDocRef = doc(db, 'users', cleanUid);
  const path = `users/${cleanUid}`;

  const safeName = (user.name || fbUser.displayName || 'Portal User').trim().slice(0, 120);
  const safeBranch = (user.branch || 'Chennai Banking Circle').trim().slice(0, 160);
  const safeDesignation = (user.designation || 'Retail / MSME Borrower').trim().slice(0, 120);
  const safeRole =
    fbUser.email === 'thamod94@gmail.com'
      ? user.role
      : 'CLIENT';

  try {
    const existingSnap = await getDoc(userDocRef);
    if (!existingSnap.exists()) {
      await setDoc(userDocRef, {
        uid: cleanUid,
        name: safeName,
        role: safeRole,
        branch: safeBranch,
        designation: safeDesignation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(userDocRef, {
        name: safeName,
        branch: safeBranch,
        designation: safeDesignation,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

/**
 * Syncs a loan application record to Firestore `/applications/{appId}` when authenticated via Firebase Auth.
 */
export async function syncApplicationToFirestore(
  appRecord: ApplicationRecord,
  actorName: string
): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const cleanId = appRecord.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const cleanOwnerUid = fbUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!cleanId || !cleanOwnerUid) return;

  const docRef = doc(db, 'applications', cleanId);
  const path = `applications/${cleanId}`;

  const docVerification: 'VERIFIED' | 'PENDING' | 'INCOMPLETE' =
    appRecord.document_verification_status ||
    (appRecord.officer_review?.verified_documents || (appRecord.uploadedDocuments && appRecord.uploadedDocuments.length >= 2)
      ? 'VERIFIED'
      : 'PENDING');

  const reasonText = (
    appRecord.cancellation_reason ||
    appRecord.rejection_reason ||
    appRecord.officer_override?.override_reason ||
    appRecord.officer_review?.remarks ||
    'Submitted for review'
  )
    .trim()
    .slice(0, 500);

  const safeActor = (actorName || fbUser.displayName || 'Portal User').trim().slice(0, 160);

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      if (appRecord.status !== 'PENDING_REVIEW') return;
      await setDoc(docRef, {
        id: cleanId,
        ownerUid: cleanOwnerUid,
        applicantName: (appRecord.applicant.full_name || 'Applicant').trim().slice(0, 120),
        loanPurpose: (appRecord.applicant.loan_purpose || 'Personal Loan').trim().slice(0, 120),
        loanAmount: Math.min(100000000, Math.max(10000, Number(appRecord.applicant.loan_amount) || 100000)),
        creditScore: Math.min(900, Math.max(300, Number(appRecord.applicant.credit_score) || 750)),
        status: 'PENDING_REVIEW',
        documentVerificationStatus: docVerification,
        statusReason: reasonText,
        lastActionBy: safeActor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(docRef, {
        status: appRecord.status,
        statusReason: reasonText,
        lastActionBy: safeActor,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function signOutFirebaseIfNeeded(): Promise<void> {
  try {
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
  } catch (err) {
    console.warn('Firebase signout error:', err);
  }
}

export { signInWithPopup, firebaseSignOut };
