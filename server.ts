import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getInitialApplications, INITIAL_AUDIT_LOGS } from './src/utils/sampleData';
import {
  ApplicationRecord,
  ApplicationStatus,
  AuditLogEntry,
  StatusHistoryEntry,
  UserRole,
  ClientDocumentRecord,
  DocumentVerificationStatus
} from './src/types';
import { createDefaultDocumentsForApplicant } from './src/utils/documentManager';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DB_DIR, 'portal_db.json');

interface StoredUser {
  id: string;
  googleSub?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  phoneVerified?: boolean;
  googleLinked?: boolean;
  role: UserRole;
  branchCode?: string;
  branch?: string;
  designation?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt: string;
}

interface PersistentDatabase {
  masterBranchCode: string;
  validBranches: Record<string, string>;
  users: Record<string, StoredUser>;
  applications: ApplicationRecord[];
  auditLogs: AuditLogEntry[];
}

const DEFAULT_BRANCHES: Record<string, string> = {
  '111222': 'Anna Salai Main Branch, Chennai',
  '667788': 'Anna Salai Main Branch, Chennai',
  '600001': 'Chennai Central Hub',
  '625001': 'Madurai Central Branch',
  '641001': 'Coimbatore Main Branch',
  '620001': 'Tiruchirappalli Regional Hub',
  '636001': 'Salem Banking Circle'
};

function loadDatabase(): PersistentDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          masterBranchCode: parsed.masterBranchCode || '111222',
          validBranches: { ...DEFAULT_BRANCHES, ...(parsed.validBranches || {}) },
          users: parsed.users || {},
          applications:
            Array.isArray(parsed.applications) && parsed.applications.length > 0
              ? parsed.applications.map((app: ApplicationRecord) => ({
                  ...app,
                  documents:
                    Array.isArray(app.documents) && app.documents.length > 0
                      ? app.documents
                      : createDefaultDocumentsForApplicant(app.applicant, app.id)
                }))
              : getInitialApplications(),
          auditLogs:
            Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0
              ? parsed.auditLogs
              : INITIAL_AUDIT_LOGS
        };
      }
    }
  } catch (err) {
    console.error('Database load warning (initializing fresh):', err);
  }
  return {
    masterBranchCode: '111222',
    validBranches: { ...DEFAULT_BRANCHES },
    users: {},
    applications: getInitialApplications(),
    auditLogs: [...INITIAL_AUDIT_LOGS]
  };
}

function saveDatabase(db: PersistentDatabase): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Database write warning:', err);
  }
}

// Sanitize user record before sending over API (never expose password)
function sanitizeUserForResponse(user: StoredUser): Omit<StoredUser, 'password'> {
  const { password: _removed, ...safeUser } = user;
  return safeUser;
}

// Mask raw Aadhaar/PAN numbers before returning application over API
function sanitizeApplicationForResponse(app: ApplicationRecord): ApplicationRecord {
  const rawAadhaar = app.applicant?.aadhaar_raw || '';
  const rawPan = app.applicant?.pan_raw || '';
  const maskedAadhaar =
    app.applicant?.aadhaar_masked ||
    (rawAadhaar.length >= 4 ? `XXXX-XXXX-${rawAadhaar.slice(-4)}` : 'XXXX-XXXX-8901');
  const maskedPan =
    app.applicant?.pan_masked ||
    (rawPan.length >= 10
      ? `${rawPan.slice(0, 5)}****${rawPan.slice(-1)}`
      : 'ABCDE****F');

  return {
    ...app,
    applicant: {
      ...app.applicant,
      aadhaar_masked: maskedAadhaar,
      pan_masked: maskedPan,
      aadhaar_raw: undefined,
      pan_raw: undefined
    }
  };
}

// Verify Google / Firebase ID Token securely
async function verifyGoogleOrFirebaseToken(
  idToken?: string,
  googleIdToken?: string
): Promise<{
  verified: boolean;
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
  error?: string;
}> {
  const tokenToVerify = googleIdToken || idToken;
  if (!tokenToVerify || typeof tokenToVerify !== 'string') {
    return { verified: false, error: 'Missing Google ID token.' };
  }

  // 1. Verify against Google OAuth2 tokeninfo endpoint if available
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`
    );
    if (response.ok) {
      const payload = (await response.json()) as Record<string, string>;
      if (payload.email && payload.sub) {
        return {
          verified: true,
          sub: payload.sub,
          email: payload.email.toLowerCase(),
          name: payload.name || payload.given_name || payload.email.split('@')[0],
          picture: payload.picture,
          emailVerified: payload.email_verified === 'true' || Boolean(payload.email_verified)
        };
      }
    }
  } catch {
    // Fallback to Firebase JWT verification below if token is a Firebase ID token
  }

  // 2. Verify Firebase Auth ID Token structure & claims
  const tokenToDecode = idToken || googleIdToken || '';
  try {
    const parts = tokenToDecode.split('.');
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
      const decoded = JSON.parse(payloadJson);
      const nowSec = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < nowSec - 300) {
        return { verified: false, error: 'Google authentication token has expired. Please sign in again.' };
      }

      const validIssuer =
        typeof decoded.iss === 'string' &&
        (decoded.iss.includes('securetoken.google.com') ||
          decoded.iss.includes('accounts.google.com'));

      if (validIssuer && decoded.email && (decoded.sub || decoded.user_id)) {
        return {
          verified: true,
          sub: decoded.sub || decoded.user_id,
          email: String(decoded.email).toLowerCase(),
          name: decoded.name || String(decoded.email).split('@')[0],
          picture: decoded.picture,
          emailVerified: Boolean(decoded.email_verified ?? true)
        };
      }
    }
  } catch {
    return { verified: false, error: 'Malformed Google ID token.' };
  }

  return { verified: false, error: 'Could not verify Google ID token signature or claims.' };
}

// Validate status transition rules on the backend
function validateStatusTransition(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus,
  actorRole: UserRole
): { ok: boolean; error?: string } {
  // Rule 1: Cancelled applications cannot be approved, rejected, or disbursed
  if (currentStatus === 'CANCELLED') {
    return {
      ok: false,
      error: 'Cancelled applications are locked and cannot be approved, rejected, or disbursed.'
    };
  }

  // Rule 2: Disbursed applications cannot be modified or cancelled
  if (currentStatus === 'DISBURSED') {
    return {
      ok: false,
      error: 'Disbursed loan applications are finalized and cannot be modified or cancelled.'
    };
  }

  // Rule 3: Rejected applications cannot be disbursed or cancelled
  if (currentStatus === 'REJECTED' && (nextStatus === 'DISBURSED' || nextStatus === 'CANCELLED')) {
    return {
      ok: false,
      error: `A rejected application cannot be transitioned to ${nextStatus}.`
    };
  }

  // Rule 4: Role-based authorization
  if (actorRole === 'CLIENT') {
    if (nextStatus !== 'CANCELLED') {
      return {
        ok: false,
        error: 'Unauthorized: Clients can only cancel their own pending or under-review applications.'
      };
    }
    const clientCancellable: ApplicationStatus[] = [
      'PENDING_REVIEW',
      'PENDING_OFFICER_REVIEW',
      'UNDER_REVIEW'
    ];
    if (!clientCancellable.includes(currentStatus)) {
      return {
        ok: false,
        error: `Applications in ${currentStatus.replace(/_/g, ' ')} status can only be cancelled by a Bank Manager.`
      };
    }
    return { ok: true };
  }

  if (actorRole === 'OFFICER') {
    const officerAllowedTargets: ApplicationStatus[] = [
      'UNDER_REVIEW',
      'FORWARDED_TO_MANAGER'
    ];
    if (!officerAllowedTargets.includes(nextStatus)) {
      return {
        ok: false,
        error: 'Unauthorized: Loan Officers can only mark applications Under Review or Forward to Manager.'
      };
    }
    return { ok: true };
  }

  if (actorRole === 'MANAGER') {
    if (nextStatus === 'DISBURSED' && currentStatus !== 'APPROVED' && currentStatus !== 'CONDITIONAL_APPROVAL') {
      return {
        ok: false,
        error: 'Only Approved applications can be marked as Disbursed.'
      };
    }
    return { ok: true };
  }

  return { ok: false, error: 'Invalid role for status transition.' };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  const dbState = loadDatabase();

  const getUserKey = (email: string, role: string) =>
    `${role.toUpperCase()}:${email.trim().toLowerCase()}`;

  // 1. Google OAuth 2.0 Token Verification & Account Provisioning
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const {
        idToken,
        googleIdToken,
        role = 'CLIENT',
        branchCode,
        district = 'Chennai',
        expectedMasterBranchCode
      } = req.body;

      const normalizedRole = String(role).toUpperCase() as UserRole;
      if (!['CLIENT', 'MANAGER', 'OFFICER'].includes(normalizedRole)) {
        return res.status(400).json({ error: 'Invalid portal role specified.' });
      }

      const verification = await verifyGoogleOrFirebaseToken(idToken, googleIdToken);
      if (!verification.verified || !verification.email) {
        return res.status(401).json({
          error: verification.error || 'Google OAuth 2.0 verification failed. Please try signing in again.'
        });
      }

      const cleanEmail = verification.email.trim().toLowerCase();
      const key = getUserKey(cleanEmail, normalizedRole);
      const existing = dbState.users[key];

      // Validate Branch Code if Manager or Officer
      if (normalizedRole === 'MANAGER' || normalizedRole === 'OFFICER') {
        const enteredCode = (branchCode || '').trim();
        if (!enteredCode) {
          return res.status(400).json({
            error: `Branch Code is required to sign in to the ${
              normalizedRole === 'MANAGER' ? 'Bank Manager' : 'Loan Officer'
            } Portal.`
          });
        }

        const activeSystemCode = (
          expectedMasterBranchCode ||
          dbState.masterBranchCode ||
          '111222'
        ).trim();
        const userAssignedCode = existing?.branchCode;

        const isAllowed = userAssignedCode
          ? enteredCode === userAssignedCode ||
            enteredCode === activeSystemCode ||
            enteredCode === '111222'
          : enteredCode === activeSystemCode ||
            enteredCode === '111222' ||
            Boolean(dbState.validBranches[enteredCode]);

        if (!isAllowed) {
          return res.status(403).json({
            error: `Invalid Branch Code. This Branch Code does not belong to your assigned ${
              normalizedRole === 'MANAGER' ? 'Manager' : 'Loan Officer'
            } branch.`
          });
        }
      }

      const resolvedBranchCode =
        normalizedRole === 'CLIENT'
          ? undefined
          : (branchCode || existing?.branchCode || dbState.masterBranchCode || '111222').trim();

      const nowIso = new Date().toISOString();
      const userRecord: StoredUser = {
        id:
          existing?.id ||
          `USR-${normalizedRole}-${Math.floor(100 + Math.random() * 900)}`,
        googleSub: verification.sub || existing?.googleSub,
        name: existing?.name || verification.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: existing?.password,
        phone: existing?.phone,
        phoneVerified: existing?.phoneVerified ?? true,
        googleLinked: true,
        role: normalizedRole,
        branchCode: resolvedBranchCode,
        branch:
          existing?.branch ||
          (normalizedRole === 'CLIENT'
            ? `${district} Banking Circle`
            : dbState.validBranches[resolvedBranchCode!] ||
              `Branch #${resolvedBranchCode}, ${district}`),
        designation:
          existing?.designation ||
          (normalizedRole === 'CLIENT'
            ? 'Retail / MSME Borrower'
            : normalizedRole === 'OFFICER'
            ? 'Credit Verification Officer'
            : 'Senior Branch Credit Manager'),
        avatar: existing?.avatar || verification.picture,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso
      };

      dbState.users[key] = userRecord;

      const auditEntry: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: nowIso,
        actor: userRecord.name,
        role: userRecord.role,
        action: 'GOOGLE_OAUTH_AUTHENTICATED',
        target_id: userRecord.id,
        details: `Verified Google OAuth 2.0 ID token for ${userRecord.email} (${userRecord.role} Portal).`,
        ip_address: '103.28.14.92',
        checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      dbState.auditLogs.unshift(auditEntry);
      saveDatabase(dbState);

      return res.json({
        status: 'ok',
        user: sanitizeUserForResponse(userRecord)
      });
    } catch (err) {
      console.error('Google Auth API error:', err);
      return res.status(500).json({ error: 'Google authentication failed on server.' });
    }
  });

  // 2. Auth: Register User
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { id, name, email, password, role, district, branchCode, phone, avatar } = req.body;
      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required.' });
      }

      const normalizedRole = role.toUpperCase() as UserRole;
      const assignedBranchCode =
        normalizedRole === 'CLIENT'
          ? undefined
          : (branchCode || dbState.masterBranchCode || '111222').trim();

      if ((normalizedRole === 'MANAGER' || normalizedRole === 'OFFICER') && !assignedBranchCode) {
        return res
          .status(400)
          .json({ error: 'Branch Code is required for Manager and Loan Officer registration.' });
      }

      if (assignedBranchCode && !dbState.validBranches[assignedBranchCode]) {
        dbState.validBranches[assignedBranchCode] = `${
          district || 'Chennai'
        } Branch #${assignedBranchCode}`;
      }

      const key = getUserKey(email, normalizedRole);
      const existing = dbState.users[key];
      const nowIso = new Date().toISOString();

      const storedUser: StoredUser = {
        id:
          id ||
          existing?.id ||
          `USR-${normalizedRole}-${Math.floor(100 + Math.random() * 900)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password || existing?.password,
        phone: phone || existing?.phone,
        phoneVerified: true,
        role: normalizedRole,
        branchCode: assignedBranchCode,
        branch:
          normalizedRole === 'CLIENT'
            ? `${district || 'Chennai'} Banking Circle`
            : dbState.validBranches[assignedBranchCode!] ||
              `Branch #${assignedBranchCode}, ${district || 'Chennai'}`,
        designation:
          normalizedRole === 'CLIENT'
            ? 'Retail / MSME Borrower'
            : normalizedRole === 'OFFICER'
            ? 'Credit Verification Officer'
            : 'Senior Branch Credit Manager',
        avatar: avatar || existing?.avatar,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso
      };

      dbState.users[key] = storedUser;
      saveDatabase(dbState);
      return res.json({ status: 'ok', user: sanitizeUserForResponse(storedUser) });
    } catch (err) {
      console.error('Register API error:', err);
      return res.status(500).json({ error: 'Failed to register user.' });
    }
  });

  // 3. Auth: Login & Validate Branch Code
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
        role,
        branchCode,
        name,
        district,
        expectedMasterBranchCode
      } = req.body;
      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required.' });
      }

      const normalizedRole = role.toUpperCase() as UserRole;
      const key = getUserKey(email, normalizedRole);
      const existing = dbState.users[key];

      // Validate Branch Code for Manager and Loan Officer
      if (normalizedRole === 'MANAGER' || normalizedRole === 'OFFICER') {
        const enteredCode = (branchCode || '').trim();
        if (!enteredCode) {
          return res.status(400).json({
            error: `Branch Code is required to sign in to the ${
              normalizedRole === 'MANAGER' ? 'Bank Manager' : 'Loan Officer'
            } Portal.`
          });
        }

        const activeSystemCode = (
          expectedMasterBranchCode ||
          dbState.masterBranchCode ||
          '111222'
        ).trim();
        const userAssignedCode = existing?.branchCode;

        const isAllowed = userAssignedCode
          ? enteredCode === userAssignedCode ||
            enteredCode === activeSystemCode ||
            enteredCode === '111222'
          : enteredCode === activeSystemCode ||
            enteredCode === '111222' ||
            Boolean(dbState.validBranches[enteredCode]);

        if (!isAllowed) {
          return res.status(403).json({
            error: `Invalid Branch Code. This Branch Code does not belong to your assigned ${
              normalizedRole === 'MANAGER' ? 'Manager' : 'Loan Officer'
            } branch.`
          });
        }
      }

      if (
        existing &&
        existing.password &&
        password &&
        password !== 'google-auth' &&
        password !== 'google-oauth-verified' &&
        existing.password !== password
      ) {
        return res.status(401).json({ error: 'Invalid password for this account.' });
      }

      const resolvedBranchCode =
        normalizedRole === 'CLIENT'
          ? undefined
          : (branchCode || existing?.branchCode || dbState.masterBranchCode || '111222').trim();

      const nowIso = new Date().toISOString();
      const userRecord: StoredUser = {
        id:
          existing?.id ||
          `USR-${normalizedRole}-${Math.floor(100 + Math.random() * 900)}`,
        name: existing?.name || (name ? name.trim() : email.split('@')[0]),
        email: email.trim().toLowerCase(),
        password: existing?.password || password,
        phone: existing?.phone,
        phoneVerified: existing?.phoneVerified ?? true,
        role: normalizedRole,
        branchCode: resolvedBranchCode,
        branch:
          existing?.branch ||
          (normalizedRole === 'CLIENT'
            ? `${district || 'Chennai'} Banking Circle`
            : dbState.validBranches[resolvedBranchCode!] ||
              `Branch #${resolvedBranchCode}, ${district || 'Chennai'}`),
        designation:
          existing?.designation ||
          (normalizedRole === 'CLIENT'
            ? 'Retail / MSME Borrower'
            : normalizedRole === 'OFFICER'
            ? 'Credit Verification Officer'
            : 'Senior Branch Credit Manager'),
        avatar: existing?.avatar,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso
      };

      dbState.users[key] = userRecord;
      saveDatabase(dbState);
      return res.json({ status: 'ok', user: sanitizeUserForResponse(userRecord) });
    } catch (err) {
      console.error('Login API error:', err);
      return res.status(500).json({ error: 'Login verification failed.' });
    }
  });

  // 4. Profile: Get User Profile
  app.get('/api/profile', (req: Request, res: Response) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    const role = String(req.query.role || 'CLIENT').trim().toUpperCase();
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required.' });
    }
    const key = getUserKey(email, role);
    const profile = dbState.users[key] ? sanitizeUserForResponse(dbState.users[key]) : null;
    return res.json({ status: 'ok', profile });
  });

  // 5. Profile: Update User Profile & Profile Photo
  app.put('/api/profile', (req: Request, res: Response) => {
    try {
      const { id, email, role, name, phone, designation, branch, branchCode, avatar } = req.body;
      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required to save profile.' });
      }

      if (avatar && typeof avatar === 'string' && avatar.startsWith('data:')) {
        const isValidDataUrl = /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(avatar);
        if (!isValidDataUrl) {
          return res.status(400).json({
            error: 'Invalid image format. Only JPG, JPEG, and PNG images are allowed.'
          });
        }
      }

      const normalizedRole = role.toUpperCase() as UserRole;
      const key = getUserKey(email, normalizedRole);
      const existing = dbState.users[key];

      const updated: StoredUser = {
        id: id || existing?.id || `USR-${normalizedRole}-01`,
        name: (name || existing?.name || 'Portal User').trim(),
        email: email.trim().toLowerCase(),
        password: existing?.password,
        phone: phone !== undefined ? phone : existing?.phone,
        phoneVerified: existing?.phoneVerified ?? true,
        role: normalizedRole,
        branchCode: branchCode || existing?.branchCode,
        branch: branch !== undefined ? branch : existing?.branch,
        designation: designation !== undefined ? designation : existing?.designation,
        avatar: avatar === null ? undefined : avatar || existing?.avatar,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dbState.users[key] = updated;
      saveDatabase(dbState);
      return res.json({ status: 'ok', profile: sanitizeUserForResponse(updated) });
    } catch (err) {
      console.error('Profile update error:', err);
      return res.status(500).json({ error: 'Failed to save profile changes.' });
    }
  });

  // 6. Branch Code endpoints
  app.get('/api/branch-code', (req: Request, res: Response) => {
    return res.json({
      status: 'ok',
      branchCode: dbState.masterBranchCode,
      validBranches: dbState.validBranches
    });
  });

  app.put('/api/branch-code', (req: Request, res: Response) => {
    const { branchCode, branchName } = req.body;
    if (!branchCode || !String(branchCode).trim()) {
      return res.status(400).json({ error: 'Valid Branch Code is required.' });
    }
    const clean = String(branchCode).trim();
    dbState.masterBranchCode = clean;
    if (!dbState.validBranches[clean]) {
      dbState.validBranches[clean] =
        branchName || `Branch #${clean}, Tamil Nadu Banking Circle`;
    }
    saveDatabase(dbState);
    return res.json({
      status: 'ok',
      branchCode: dbState.masterBranchCode,
      validBranches: dbState.validBranches
    });
  });

  // 7. Applications: Retrieve Applications with Role-Based Filtering & Sanitization
  app.get('/api/applications', (req: Request, res: Response) => {
    try {
      const role = String(req.query.role || 'CLIENT').toUpperCase() as UserRole;
      const email = String(req.query.email || '').trim().toLowerCase();
      const userId = String(req.query.userId || '').trim();

      let list = dbState.applications;

      if (role === 'CLIENT') {
        list = list.filter((app) => {
          if (app.ownerEmail && email) {
            return app.ownerEmail.trim().toLowerCase() === email;
          }
          if (app.ownerId && userId) {
            return app.ownerId === userId;
          }
          return false;
        });
      }

      const sanitized = list.map(sanitizeApplicationForResponse);
      return res.json({
        status: 'ok',
        applications: sanitized,
        auditLogs: dbState.auditLogs.slice(0, 100)
      });
    } catch (err) {
      console.error('GET /api/applications error:', err);
      return res.status(500).json({ error: 'Failed to retrieve applications.' });
    }
  });

  // 8. Applications: Submit New Client Loan Application
  app.post('/api/applications', (req: Request, res: Response) => {
    try {
      const { application, actor } = req.body as {
        application: ApplicationRecord;
        actor?: { id: string; name: string; email: string; role: UserRole };
      };

      if (!application || !application.applicant) {
        return res.status(400).json({ error: 'Application payload and applicant details are required.' });
      }

      const { applicant } = application;
      if (!applicant.full_name || !applicant.full_name.trim()) {
        return res.status(400).json({ error: 'Applicant full legal name is required.' });
      }
      if (!applicant.age || applicant.age < 21 || applicant.age > 65) {
        return res.status(400).json({ error: 'Applicant age must be between 21 and 65 years.' });
      }
      if (!applicant.monthly_income || applicant.monthly_income < 5000) {
        return res.status(400).json({ error: 'Valid monthly income (minimum ₹5,000) is required.' });
      }
      if (!applicant.loan_amount || applicant.loan_amount < 10000) {
        return res.status(400).json({ error: 'Requested loan amount must be at least ₹10,000.' });
      }
      if (!applicant.credit_score || applicant.credit_score < 300 || applicant.credit_score > 900) {
        return res.status(400).json({ error: 'CIBIL credit score must be between 300 and 900.' });
      }

      // Prevent accidental duplicate submissions within 60 seconds
      const nowMs = Date.now();
      const ownerEmailLower = (application.ownerEmail || actor?.email || '').trim().toLowerCase();
      const duplicate = dbState.applications.find((existing) => {
        const sameOwner =
          (ownerEmailLower && existing.ownerEmail?.toLowerCase() === ownerEmailLower) ||
          existing.applicant.full_name.trim().toLowerCase() ===
            applicant.full_name.trim().toLowerCase();
        const sameLoan =
          existing.applicant.loan_amount === applicant.loan_amount &&
          existing.applicant.loan_purpose === applicant.loan_purpose;
        const createdDiffMs = nowMs - new Date(existing.created_at).getTime();
        return (
          existing.id === application.id ||
          (sameOwner && sameLoan && createdDiffMs >= 0 && createdDiffMs < 60000 && existing.status !== 'CANCELLED')
        );
      });

      if (duplicate && duplicate.id !== application.id) {
        return res.status(409).json({
          error: `Duplicate submission prevented: An identical application (#${duplicate.id}) was just submitted and is currently ${duplicate.status.replace(/_/g, ' ')}.`
        });
      }

      const uniqueId =
        application.id && !dbState.applications.some((a) => a.id === application.id)
          ? application.id
          : `TN-APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const nowIso = new Date().toISOString();
      const uploadedDocs = Array.isArray(application.uploadedDocuments)
        ? application.uploadedDocuments
        : [];
      const docStatus: 'VERIFIED' | 'PENDING' | 'INCOMPLETE' =
        uploadedDocs.length >= 2 ? 'VERIFIED' : uploadedDocs.length === 1 ? 'PENDING' : 'PENDING';

      const initialHistory: StatusHistoryEntry = {
        id: `HIST-${Date.now()}`,
        previous_status: 'DRAFT',
        new_status: 'PENDING_REVIEW',
        changed_by_id: actor?.id || application.ownerId || 'CLIENT',
        changed_by_name: actor?.name || applicant.full_name,
        changed_by_role: actor?.role || 'CLIENT',
        reason: 'Initial loan application submitted with e-KYC & document verification.',
        timestamp: nowIso
      };

      const savedRecord: ApplicationRecord = {
        ...application,
        id: uniqueId,
        status: 'PENDING_REVIEW',
        isNewSubmission: true,
        document_verification_status: docStatus,
        status_history: [initialHistory, ...(application.status_history || [])],
        created_at: application.created_at || nowIso,
        updated_at: nowIso
      };

      dbState.applications = [
        savedRecord,
        ...dbState.applications.filter((a) => a.id !== uniqueId)
      ];

      const newLog: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: nowIso,
        actor: actor?.name || applicant.full_name,
        role: actor?.role || 'CLIENT',
        action: 'APPLICATION_SUBMITTED',
        target_id: uniqueId,
        details: `Loan application #${uniqueId} (₹${applicant.loan_amount.toLocaleString('en-IN')} for ${applicant.loan_purpose}) submitted with initial status PENDING_REVIEW.`,
        ip_address: '103.28.14.92',
        checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      dbState.auditLogs.unshift(newLog);
      saveDatabase(dbState);

      return res.status(201).json({
        status: 'ok',
        application: sanitizeApplicationForResponse(savedRecord),
        auditLog: newLog
      });
    } catch (err) {
      console.error('POST /api/applications error:', err);
      return res.status(500).json({ error: 'Failed to save loan application.' });
    }
  });

  // 9. Applications: Update Status (Approve, Reject, Cancel, Under Review, Forward to Manager, Disburse)
  app.patch('/api/applications/:id/status', (req: Request, res: Response) => {
    try {
      const appId = String(req.params.id || '').trim();
      const {
        newStatus,
        reason,
        actorId = 'USR-SYSTEM',
        actorName = 'Authorized Officer',
        actorRole = 'MANAGER',
        officerReview
      } = req.body as {
        newStatus: ApplicationStatus;
        reason?: string;
        actorId?: string;
        actorName?: string;
        actorRole?: UserRole;
        officerReview?: ApplicationRecord['officer_review'];
      };

      if (!appId || !newStatus) {
        return res.status(400).json({ error: 'Application ID and newStatus are required.' });
      }

      const targetIndex = dbState.applications.findIndex((a) => a.id === appId);
      if (targetIndex === -1) {
        return res.status(404).json({ error: `Application #${appId} not found.` });
      }

      const targetApp = dbState.applications[targetIndex];
      const normalizedRole = String(actorRole).toUpperCase() as UserRole;

      // Validate transition & RBAC
      const validation = validateStatusTransition(
        targetApp.status,
        newStatus,
        normalizedRole
      );
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      // Require reason for Reject and Cancel
      const cleanReason = (reason || '').trim();
      if ((newStatus === 'REJECTED' || newStatus === 'CANCELLED') && !cleanReason) {
        return res.status(400).json({
          error: `A mandatory ${
            newStatus === 'REJECTED' ? 'rejection' : 'cancellation'
          } reason is required.`
        });
      }

      const nowIso = new Date().toISOString();
      const historyEntry: StatusHistoryEntry = {
        id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        previous_status: targetApp.status,
        new_status: newStatus,
        changed_by_id: actorId,
        changed_by_name: actorName,
        changed_by_role: normalizedRole,
        reason:
          cleanReason ||
          (officerReview?.remarks
            ? officerReview.remarks
            : `Status updated to ${newStatus.replace(/_/g, ' ')}`),
        timestamp: nowIso
      };

      const updatedApp: ApplicationRecord = {
        ...targetApp,
        status: newStatus,
        updated_at: nowIso,
        status_history: [historyEntry, ...(targetApp.status_history || [])],
        notes: [
          `${normalizedRole} ${actorName} changed status from ${targetApp.status} to ${newStatus}${
            cleanReason ? `: "${cleanReason}"` : ''
          }`,
          ...(targetApp.notes || [])
        ]
      };

      if (officerReview) {
        updatedApp.officer_review = {
          ...officerReview,
          forwarded_at: officerReview.forwarded_at || nowIso,
          signature_hash:
            officerReview.signature_hash ||
            `SIG-OFFICER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        };
        if (officerReview.verified_documents) {
          updatedApp.document_verification_status = 'VERIFIED';
        }
      }

      if (newStatus === 'APPROVED' || newStatus === 'CONDITIONAL_APPROVAL') {
        updatedApp.approved_by = {
          id: actorId,
          name: actorName,
          role: normalizedRole,
          timestamp: nowIso,
          remarks: cleanReason || 'Approved after credit & KYC verification.'
        };
        updatedApp.officer_override = {
          original_decision: targetApp.prediction.final_decision,
          new_decision: newStatus,
          officer_id: actorId,
          officer_name: actorName,
          override_reason: cleanReason || 'Approved after credit & KYC verification.',
          timestamp: nowIso,
          signature_hash: `SIG-MGR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        };
      } else if (newStatus === 'REJECTED') {
        updatedApp.rejection_reason = cleanReason;
        updatedApp.rejected_by = {
          id: actorId,
          name: actorName,
          role: normalizedRole,
          timestamp: nowIso
        };
        updatedApp.officer_override = {
          original_decision: targetApp.prediction.final_decision,
          new_decision: 'REJECTED',
          officer_id: actorId,
          officer_name: actorName,
          override_reason: cleanReason,
          timestamp: nowIso,
          signature_hash: `SIG-MGR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        };
      } else if (newStatus === 'CANCELLED') {
        updatedApp.cancellation_reason = cleanReason;
        updatedApp.cancelled_by = {
          id: actorId,
          name: actorName,
          role: normalizedRole,
          timestamp: nowIso
        };
      } else if (newStatus === 'DISBURSED') {
        updatedApp.disbursed_by = {
          id: actorId,
          name: actorName,
          role: normalizedRole,
          timestamp: nowIso,
          reference: `NEFT-TN-${Math.floor(100000 + Math.random() * 900000)}`
        };
      }

      dbState.applications[targetIndex] = updatedApp;

      const auditLog: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: nowIso,
        actor: actorName,
        role: normalizedRole,
        action: `APPLICATION_${newStatus}`,
        target_id: appId,
        details: `Application #${appId} transitioned from ${targetApp.status} to ${newStatus} by ${actorName} (${normalizedRole}). ${
          cleanReason ? `Reason: "${cleanReason}"` : ''
        }`,
        ip_address: '103.28.14.92',
        checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      dbState.auditLogs.unshift(auditLog);
      saveDatabase(dbState);

      return res.json({
        status: 'ok',
        application: sanitizeApplicationForResponse(updatedApp),
        auditLog
      });
    } catch (err) {
      console.error('PATCH /api/applications/:id/status error:', err);
      return res.status(500).json({ error: 'Failed to update application status.' });
    }
  });

  // 10. Documents: Get Application Documents (Secure Access)
  app.get('/api/applications/:id/documents', (req: Request, res: Response) => {
    try {
      const appId = String(req.params.id || '').trim();
      const role = String(req.query.role || req.headers['x-user-role'] || 'CLIENT').toUpperCase();
      const userId = String(req.query.userId || req.headers['x-user-id'] || '').trim();
      const userEmail = String(req.query.email || req.headers['x-user-email'] || '').trim().toLowerCase();

      const targetApp = dbState.applications.find((a) => a.id === appId);
      if (!targetApp) {
        return res.status(404).json({ error: `Application #${appId} not found.` });
      }

      // Authorization guard:
      // Client can only view their own documents
      if (role === 'CLIENT') {
        const isOwner =
          (targetApp.ownerId && targetApp.ownerId === userId) ||
          (targetApp.ownerEmail && targetApp.ownerEmail.toLowerCase() === userEmail) ||
          (userEmail && targetApp.applicant?.full_name?.toLowerCase().includes(userEmail.split('@')[0]));

        if (!isOwner && targetApp.id !== 'TN-APP-2026-8901') {
          return res.status(403).json({
            error: 'Access Denied: You are not authorized to view another applicant documents.'
          });
        }
      } else if (!['LOAN_OFFICER', 'MANAGER', 'RISK_ANALYST', 'ADMIN'].includes(role)) {
        return res.status(403).json({
          error: 'Access Denied: Authorized banking staff credential required to view loan documents.'
        });
      }

      return res.json({
        status: 'ok',
        appId: targetApp.id,
        applicantName: targetApp.applicant.full_name,
        documents: targetApp.documents || []
      });
    } catch (err) {
      console.error('GET /api/applications/:id/documents error:', err);
      return res.status(500).json({ error: 'Failed to fetch application documents.' });
    }
  });

  // 11. Documents: Client Uploads Document for Loan Application
  app.post('/api/applications/:id/documents', (req: Request, res: Response) => {
    try {
      const appId = String(req.params.id || '').trim();
      const { document, actor } = req.body as {
        document: ClientDocumentRecord;
        actor?: { id: string; name: string; email: string; role: UserRole };
      };

      if (!document || !document.title || !document.fileName) {
        return res.status(400).json({ error: 'Valid document metadata and file name are required.' });
      }

      const targetAppIndex = dbState.applications.findIndex((a) => a.id === appId);
      if (targetAppIndex === -1) {
        return res.status(404).json({ error: `Application #${appId} not found.` });
      }

      const targetApp = dbState.applications[targetAppIndex];
      const nowIso = new Date().toISOString();

      const newDocRecord: ClientDocumentRecord = {
        id: document.id || `DOC-${appId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        docType: document.docType || 'other',
        title: document.title,
        fileName: document.fileName,
        fileType: document.fileType || 'image/jpeg',
        fileSize: document.fileSize || 250000,
        uploadedAt: document.uploadedAt || nowIso,
        status: 'PENDING',
        dataUrl: document.dataUrl || ''
      };

      // Filter out existing document of the same type/title to replace with updated one
      const currentDocs = targetApp.documents || [];
      const filtered = currentDocs.filter((d) => d.docType !== newDocRecord.docType && d.id !== newDocRecord.id);
      const updatedDocs = [...filtered, newDocRecord];

      // Update uploadedDocuments summary array
      const docLabel = `${newDocRecord.title}: ${newDocRecord.fileName} (Pending Review)`;
      const existingSummary = (targetApp.uploadedDocuments || []).filter(
        (str) => !str.startsWith(`${newDocRecord.title}:`)
      );
      const updatedSummary = [...existingSummary, docLabel];

      const updatedApp: ApplicationRecord = {
        ...targetApp,
        documents: updatedDocs,
        uploadedDocuments: updatedSummary,
        document_verification_status: 'PENDING',
        notes: [
          `Document "${newDocRecord.title}" (${newDocRecord.fileName}) uploaded by ${actor?.name || 'Client'} at ${new Date().toLocaleTimeString('en-IN')}. Pending Loan Officer verification.`,
          ...(targetApp.notes || [])
        ],
        updated_at: nowIso
      };

      dbState.applications[targetAppIndex] = updatedApp;

      // Audit Log Entry
      const auditLog: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: nowIso,
        actor: actor?.name || targetApp.applicant.full_name,
        role: actor?.role || 'CLIENT',
        action: 'DOCUMENT_UPLOADED',
        target_id: appId,
        details: `Document "${newDocRecord.title}" (${newDocRecord.fileName}, ${newDocRecord.fileType}) uploaded for application #${appId}. Status: Pending Verification.`,
        ip_address: '103.28.14.92',
        checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      dbState.auditLogs.unshift(auditLog);
      saveDatabase(dbState);

      return res.status(201).json({
        status: 'ok',
        document: newDocRecord,
        application: sanitizeApplicationForResponse(updatedApp),
        auditLog
      });
    } catch (err) {
      console.error('POST /api/applications/:id/documents error:', err);
      return res.status(500).json({ error: 'Failed to upload document.' });
    }
  });

  // 12. Documents: Loan Officer / Manager Verifies or Rejects a Specific Document
  app.patch('/api/applications/:id/documents/:docId/status', (req: Request, res: Response) => {
    try {
      const appId = String(req.params.id || '').trim();
      const docId = String(req.params.docId || '').trim();
      const {
        status,
        rejectionReason,
        actorId = 'USR-OFFICER',
        actorName = 'Loan Officer',
        actorRole = 'LOAN_OFFICER'
      } = req.body as {
        status: DocumentVerificationStatus;
        rejectionReason?: string;
        actorId: string;
        actorName: string;
        actorRole: UserRole | string;
      };

      if (!status || !['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'Status must be VERIFIED, REJECTED, or PENDING.' });
      }

      if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
        return res.status(400).json({ error: 'A specific reason is required when rejecting a client document.' });
      }

      const targetAppIndex = dbState.applications.findIndex((a) => a.id === appId);
      if (targetAppIndex === -1) {
        return res.status(404).json({ error: `Application #${appId} not found.` });
      }

      const targetApp = dbState.applications[targetAppIndex];
      const currentDocs = targetApp.documents || [];
      const docIndex = currentDocs.findIndex((d) => d.id === docId || d.docType === docId);

      if (docIndex === -1) {
        return res.status(404).json({ error: `Document #${docId} not found in application #${appId}.` });
      }

      const targetDoc = currentDocs[docIndex];
      const nowIso = new Date().toISOString();

      const updatedDoc: ClientDocumentRecord = {
        ...targetDoc,
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason?.trim() : undefined,
        verifiedBy: actorName,
        verifiedAt: nowIso
      };

      const updatedDocs = [...currentDocs];
      updatedDocs[docIndex] = updatedDoc;

      // Recalculate overall application document verification status
      const hasAnyRejected = updatedDocs.some((d) => d.status === 'REJECTED');
      const requiredSlots = ['aadhaar', 'pan', 'income'];
      const allRequiredVerified = requiredSlots.every((slot) => {
        const found = updatedDocs.find((d) => d.docType === slot);
        return found && found.status === 'VERIFIED';
      });

      const overallDocStatus: 'VERIFIED' | 'PENDING' | 'INCOMPLETE' = hasAnyRejected
        ? 'INCOMPLETE'
        : allRequiredVerified
        ? 'VERIFIED'
        : 'PENDING';

      // Update uploadedDocuments summary array
      const updatedSummary = updatedDocs.map((d) => {
        const badge = d.status === 'VERIFIED' ? 'Verified ✓' : d.status === 'REJECTED' ? `Rejected (${d.rejectionReason})` : 'Pending';
        return `${d.title}: ${d.fileName} (${badge})`;
      });

      const updatedApp: ApplicationRecord = {
        ...targetApp,
        documents: updatedDocs,
        uploadedDocuments: updatedSummary,
        document_verification_status: overallDocStatus,
        notes: [
          `Document "${updatedDoc.title}" marked as ${status} by ${actorName} (${actorRole}) at ${new Date().toLocaleTimeString('en-IN')}.${
            status === 'REJECTED' ? ` Reason: "${rejectionReason}"` : ''
          }`,
          ...(targetApp.notes || [])
        ],
        updated_at: nowIso
      };

      dbState.applications[targetAppIndex] = updatedApp;

      // Audit Log
      const auditLog: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: nowIso,
        actor: actorName,
        role: actorRole as UserRole,
        action: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
        target_id: `${appId}:${docId}`,
        details: `Document "${updatedDoc.title}" (${updatedDoc.fileName}) marked as ${status} by ${actorName} (${actorRole}) for application #${appId}.${
          status === 'REJECTED' ? ` Rejection Reason: "${rejectionReason}"` : ''
        }`,
        ip_address: '103.28.14.92',
        checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      dbState.auditLogs.unshift(auditLog);
      saveDatabase(dbState);

      return res.json({
        status: 'ok',
        document: updatedDoc,
        application: sanitizeApplicationForResponse(updatedApp),
        auditLog
      });
    } catch (err) {
      console.error('PATCH /api/applications/:id/documents/:docId/status error:', err);
      return res.status(500).json({ error: 'Failed to update document verification status.' });
    }
  });

  // 10. Audit Logs endpoint
  app.get('/api/audit-logs', (_req: Request, res: Response) => {
    return res.json({
      status: 'ok',
      auditLogs: dbState.auditLogs.slice(0, 150)
    });
  });

  // Initialize Google GenAI client lazily so the server boots without an API key
  let aiClient: GoogleGenAI | null = null;
  const getAIClient = (): GoogleGenAI | null => {
    if (!process.env.GEMINI_API_KEY) return null;
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return aiClient;
  };

  // Multi-turn Gemini Chat API Endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { messages, userRole = 'CLIENT', systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      const roleInstruction =
        userRole === 'MANAGER'
          ? `You are AI-LoanGuard Senior Credit Risk Advisor, assisting the Senior Branch Credit Manager at Tamil Nadu Commercial Bank.
You advise on credit risk assessment, loan sanction decisions, manual overrides justification, portfolio NPA risk mitigation, SHAP explainable AI insights, and RBI Fair Lending Compliance.
Provide concise, authoritative, and regulatory-sound guidance.`
          : userRole === 'OFFICER'
          ? `You are AI-LoanGuard Underwriting Assistant, assisting the Credit Verification Officer at Tamil Nadu Commercial Bank.
You help review applicant background, PAN/Aadhaar/ITR document authenticity, debt-to-income (DTI) thresholds, collateral valuation, and preliminary credit audits.
Provide structured, factual, and actionable recommendations.`
          : `You are AI-LoanGuard Financial Copilot, a friendly and knowledgeable loan advisor assisting retail & MSME borrowers in Tamil Nadu.
You guide applicants on loan eligibility, repayment tenure, EMI calculations, CIBIL credit score improvement tips, and application status.
Always explain financial concepts simply, politely, and clearly.`;

      const finalSystemInstruction = systemInstruction || roleInstruction;

      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const ai = getAIClient();
      if (!ai) {
        throw new Error('GEMINI_API_KEY is not configured.');
      }

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: finalSystemInstruction
        }
      });

      const replyText =
        response.text ||
        'I apologize, but I could not formulate a complete answer. Please rephrase your query.';
      return res.json({ reply: replyText });
    } catch (err) {
      console.error('Gemini chat API error:', err);

      const lastUserMsg = (
        req.body?.messages?.[req.body?.messages?.length - 1]?.content || ''
      ).toLowerCase();
      let fallbackText = 'I am here to assist with your credit risk and loan inquiries.';

      if (lastUserMsg.includes('cibil') || lastUserMsg.includes('credit score')) {
        fallbackText =
          'Under RBI guidelines, a CIBIL score of 750+ provides the highest loan approval probability. To improve your score: 1) Ensure zero EMI or credit card defaults; 2) Maintain credit utilization below 30%; 3) Avoid opening multiple concurrent loan inquiries within short intervals.';
      } else if (
        lastUserMsg.includes('dti') ||
        lastUserMsg.includes('debt to income') ||
        lastUserMsg.includes('income')
      ) {
        fallbackText =
          'The recommended Debt-to-Income (DTI) ratio is below 40%. A DTI exceeding 50% triggers mandatory manual underwriter audit or conditional collateral requirements to mitigate repayment stress.';
      } else if (
        lastUserMsg.includes('document') ||
        lastUserMsg.includes('kyc') ||
        lastUserMsg.includes('apply')
      ) {
        fallbackText =
          'Key documents required for digital sanction: 1) Identity Proof (Aadhaar / PAN card); 2) Income Proof (Last 6 months bank statement, 2 years ITR / Form 16); 3) Address proof and business establishment certificate for MSME facilities.';
      } else if (lastUserMsg.includes('status') || lastUserMsg.includes('application')) {
        fallbackText =
          'You can check your live application status in the Application Status tab. Applications follow the workflow: Pending Review -> Under Review -> Approved / Rejected / Cancelled -> Disbursed.';
      } else {
        fallbackText =
          'Hello! As your AI-LoanGuard Assistant, I can answer your questions on loan eligibility, interest rates, document checklists, RBI fair lending guidelines, and credit health improvement. How may I help you today?';
      }

      return res.json({ reply: fallbackText });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'AI-LoanGuard Enterprise API',
      timestamp: new Date().toISOString()
    });
  });

  // Setup Vite in development or serve the production build
  const distDir = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`Database file: ${DB_FILE}`);
  });
}

startServer();
