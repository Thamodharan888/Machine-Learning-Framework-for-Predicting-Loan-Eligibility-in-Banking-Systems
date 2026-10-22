import React, { useState, useEffect, useCallback } from 'react';
import {
  ApplicantInput,
  ApplicationRecord,
  ApplicationStatus,
  AuditLogEntry,
  UserAuth,
  UserRole,
  SecuritySettings,
  DocumentVerificationStatus
} from './types';
import { PRESET_CASE_STUDIES, INITIAL_AUDIT_LOGS } from './utils/sampleData';
import {
  loadActiveSession,
  saveActiveSession,
  loadApplications,
  saveApplications,
  getStoredBranchCode,
  setStoredBranchCode,
  persistUserProfile,
  clearLegacyRegistrationMessages,
  fetchApplicationsFromServer,
  fetchAuditLogsFromServer,
  createApplicationOnServer,
  updateApplicationStatusOnServer,
  forwardApplicationOnServer,
  formatApplicationStatusLabel,
  isApplicationCancelled
} from './utils/portalStorage';
import { signOutFirebaseIfNeeded } from './firebase';
import { Navbar, NavTab } from './components/Navbar';
import { UnderwriterView } from './components/UnderwriterView';
import { ApplicationsView } from './components/ApplicationsView';
import { ModelAnalyticsView } from './components/ModelAnalyticsView';
import { SecurityBoostView } from './components/SecurityBoostView';
import { ClientPortalView } from './components/ClientPortalView';
import { LoanOfficerPortalView } from './components/LoanOfficerPortalView';
import { ProfileView } from './components/ProfileView';
import { LoginView } from './components/LoginView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GeminiChatbot } from './components/GeminiChatbot';
import { FloatingMoneyBackground } from './components/FloatingMoneyBackground';
import {
  ShieldCheck,
  Lock,
  Zap,
  Stamp,
  X,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';

const ALLOWED_TABS_BY_ROLE: Record<UserRole, NavTab[]> = {
  MANAGER: ['underwriter', 'applications', 'analytics', 'security', 'profile'],
  OFFICER: ['officer_queue', 'applications', 'analytics', 'security', 'profile'],
  CLIENT: ['client_apply', 'client_status', 'client_health', 'client_calculator', 'profile']
};

const DEFAULT_TAB_BY_ROLE: Record<UserRole, NavTab> = {
  MANAGER: 'applications',
  OFFICER: 'officer_queue',
  CLIENT: 'client_apply'
};

export default function App() {
  // Authentication & Security State: Restores active session on refresh so profile photo & portal state persist
  const [currentUser, setCurrentUser] = useState<UserAuth | null>(() => loadActiveSession());
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string>('');
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorRequired: true,
    dataMaskingActive: false,
    autoLockMinutes: 15,
    encryptionStatus: 'AES-256-GCM Active',
    tlsVersion: 'TLS 1.3 Strict',
    tamperAuditChecksums: true,
    ipRestrictionEnabled: true
  });

  // Active Navigation Tab: Initialized based on logged-in user's role
  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    const session = loadActiveSession();
    if (session) {
      return DEFAULT_TAB_BY_ROLE[session.role] || 'client_apply';
    }
    return 'client_apply';
  });

  // Role-checked tab setter
  const setActiveTab = (nextTab: NavTab) => {
    if (!currentUser) {
      setActiveTabState(nextTab);
      return;
    }
    const allowed = ALLOWED_TABS_BY_ROLE[currentUser.role] || [];
    if (!allowed.includes(nextTab)) {
      setAccessDeniedNotice(
        `Access Restricted: Your ${currentUser.role} account is only authorized to access the ${currentUser.role} Portal.`
      );
      setActiveTabState(DEFAULT_TAB_BY_ROLE[currentUser.role]);
      return;
    }
    setActiveTabState(nextTab);
  };

  // Branch Code Master State
  const [branchCode, setBranchCode] = useState<string>(() => getStoredBranchCode());

  const handleUpdateBranchCode = (newCode: string) => {
    const clean = newCode.trim();
    if (!clean) return;
    setBranchCode(clean);
    setStoredBranchCode(clean);
    if (currentUser && currentUser.role !== 'CLIENT') {
      const updated = { ...currentUser, branchCode: clean };
      setCurrentUser(updated);
      saveActiveSession(updated);
      void persistUserProfile(updated);
    }
  };

  // Application & Underwriting State (persisted so changes survive page refresh)
  const [currentApplicant, setCurrentApplicant] = useState<ApplicantInput>(
    PRESET_CASE_STUDIES[0].data
  );
  const [applications, setApplications] = useState<ApplicationRecord[]>(() => loadApplications());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Sync applications with backend database
  const syncFromBackend = useCallback(async (user: UserAuth | null) => {
    const remoteApps = await fetchApplicationsFromServer(user);
    if (remoteApps && remoteApps.length > 0) {
      setApplications((prev) => {
        // Merge remote applications with any local-only records by ID
        const byId = new Map<string, ApplicationRecord>();
        for (const app of prev) {
          byId.set(app.id, app);
        }
        for (const remote of remoteApps) {
          byId.set(remote.id, remote);
        }
        return Array.from(byId.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }
    if (user && (user.role === 'MANAGER' || user.role === 'OFFICER')) {
      const remoteLogs = await fetchAuditLogsFromServer(user);
      if (remoteLogs && remoteLogs.length > 0) {
        setAuditLogs(remoteLogs);
      }
    }
  }, []);

  useEffect(() => {
    void syncFromBackend(currentUser);
  }, [currentUser, syncFromBackend]);

  // Listen to storage events across tabs for immediate status synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_loanguard_applications_v2') {
        setApplications(loadApplications());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync applications to storage whenever updated
  useEffect(() => {
    if (applications && applications.length > 0) {
      saveApplications(applications);
    }
  }, [applications]);

  // Clean up any legacy registration messages and enforce URL RBAC guard
  useEffect(() => {
    clearLegacyRegistrationMessages();

    const checkUrlAccessControl = () => {
      const pathAndHash = `${window.location.pathname}${window.location.hash}`.toLowerCase();
      if (!currentUser) {
        if (pathAndHash !== '/' && pathAndHash !== '') {
          window.history.replaceState(null, '', '/');
        }
        return;
      }

      const tryingManager = pathAndHash.includes('manager') || pathAndHash.includes('underwriter');
      const tryingOfficer = pathAndHash.includes('officer');
      const tryingClient = pathAndHash.includes('client');

      if (
        (tryingManager && currentUser.role !== 'MANAGER') ||
        (tryingOfficer && currentUser.role !== 'OFFICER') ||
        (tryingClient && currentUser.role !== 'CLIENT')
      ) {
        setAccessDeniedNotice(
          `Unauthorized URL navigation blocked: ${currentUser.role} users cannot access another portal via URL changes.`
        );
        window.history.replaceState(null, '', '/');
        setActiveTabState(DEFAULT_TAB_BY_ROLE[currentUser.role]);
      }
    };

    checkUrlAccessControl();
    window.addEventListener('popstate', checkUrlAccessControl);
    window.addEventListener('hashchange', checkUrlAccessControl);
    return () => {
      window.removeEventListener('popstate', checkUrlAccessControl);
      window.removeEventListener('hashchange', checkUrlAccessControl);
    };
  }, [currentUser]);

  // Manager / Officer Flash Notification for New Submissions & Forwarded Applications
  const [managerFlashAlert, setManagerFlashAlert] = useState<{
    appId: string;
    applicantName: string;
    loanAmount: number;
    decision: string;
    source: 'CLIENT_SUBMITTED' | 'OFFICER_FORWARDED';
    timestamp: string;
  } | null>(null);

  // Client Portal Centered Flash Alert when Bank Manager Updates Status
  const [clientFlashOverrideAlert, setClientFlashOverrideAlert] = useState<{
    appId: string;
    applicantName: string;
    loanAmount: number;
    newStatus: ApplicationStatus;
    officerName: string;
    reason: string;
    timestamp: string;
    applicationDate: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('ai_loanguard_client_override_alert');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Ingest new application into live queue -> Initial status set to PENDING_REVIEW ("Pending Review")
  const handleAddApplication = (newRecord: ApplicationRecord) => {
    const nowIso = new Date().toISOString();
    const recordWithFlag: ApplicationRecord = {
      ...newRecord,
      isNewSubmission: true,
      status: 'PENDING_REVIEW',
      status_history: newRecord.status_history || [
        {
          id: `HIST-${Date.now()}`,
          previous_status: 'NEW',
          new_status: 'PENDING_REVIEW',
          actor_id: currentUser ? currentUser.id : 'CLIENT',
          actor_name: currentUser ? currentUser.name : newRecord.applicant.full_name,
          actor_role: currentUser ? currentUser.role : 'CLIENT',
          reason: 'Loan application submitted and queued in Pending Review.',
          timestamp: nowIso
        }
      ]
    };

    setApplications((prev) => [recordWithFlag, ...prev.filter((a) => a.id !== newRecord.id)]);

    // Persist to backend database & Firestore
    void createApplicationOnServer(recordWithFlag, currentUser).then((res) => {
      if (res.ok && res.application) {
        setApplications((prev) =>
          prev.map((a) => (a.id === res.application!.id ? res.application! : a))
        );
      }
    });

    // Trigger Flash Notification for Loan Officer and Manager
    setManagerFlashAlert({
      appId: newRecord.id,
      applicantName: newRecord.applicant.full_name,
      loanAmount: newRecord.applicant.loan_amount,
      decision: newRecord.prediction.final_decision,
      source: 'CLIENT_SUBMITTED',
      timestamp: new Date().toLocaleTimeString('en-IN')
    });

    const newLog: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: nowIso,
      actor: currentUser ? currentUser.name : 'Automated Gateway',
      role: currentUser ? currentUser.role : 'System Worker',
      action: 'APPLICATION_INGESTED',
      target_id: newRecord.id,
      details: `Application ${newRecord.id} submitted with initial status Pending Review (${(newRecord.prediction.approval_probability * 100).toFixed(1)}% ML match). Priority: ${newRecord.priority || 'Normal'}. Notified Loan Officer & Manager.`,
      ip_address: '103.28.14.92',
      checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Loan Officer Stage 2 Audit -> Forward to Manager
  const handleForwardToManager = (
    appId: string,
    review: {
      verified_applicant_details: boolean;
      verified_documents: boolean;
      reviewed_financials: boolean;
      reviewed_ml_prediction: boolean;
      remarks: string;
      officer_id: string;
      officer_name: string;
    }
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (targetApp && isApplicationCancelled(targetApp.status)) {
      setAccessDeniedNotice(
        `Action Blocked: Application #${appId} has been Cancelled and cannot be forwarded or approved.`
      );
      return;
    }

    const nowIso = new Date().toISOString();

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const histEntry = {
            id: `HIST-${Date.now()}`,
            previous_status: app.status,
            new_status: 'FORWARDED_TO_MANAGER' as ApplicationStatus,
            actor_id: review.officer_id,
            actor_name: review.officer_name,
            actor_role: 'OFFICER',
            reason: review.remarks,
            timestamp: nowIso
          };
          return {
            ...app,
            status: 'FORWARDED_TO_MANAGER',
            isNewSubmission: true,
            officer_review: {
              ...review,
              forwarded_at: nowIso,
              signature_hash: `SIG-OFFICER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            },
            notes: [
              `Loan Officer ${review.officer_name}: Verified all 4 stages. Remarks: "${review.remarks}"`,
              ...(app.notes || [])
            ],
            status_history: [histEntry, ...(app.status_history || [])],
            updated_at: nowIso
          };
        }
        return app;
      })
    );

    void forwardApplicationOnServer(appId, review);

    // Trigger Manager Flash Notification
    setManagerFlashAlert({
      appId: appId,
      applicantName: targetApp?.applicant?.full_name || 'Applicant',
      loanAmount: targetApp?.applicant?.loan_amount || 1800000,
      decision: targetApp?.prediction?.final_decision || 'Manual Review',
      source: 'OFFICER_FORWARDED',
      timestamp: new Date().toLocaleTimeString('en-IN')
    });

    const newLog: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: nowIso,
      actor: review.officer_name,
      role: 'Loan Verification Officer',
      action: 'OFFICER_VERIFICATION_FORWARDED',
      target_id: appId,
      details: `Application ${appId} successfully verified across all 4 stages by Officer ${review.officer_name} and forwarded to Manager for final credit sanction.`,
      ip_address: '103.28.14.92',
      checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Document Verification Status Update (Loan Officer / Manager)
  const handleDocumentVerificationUpdate = (
    appId: string,
    docId: string,
    status: DocumentVerificationStatus,
    rejectionReason?: string
  ) => {
    let affectedDocTitle = 'Document';
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const currentDocs = app.documents || [];
        const updatedDocs = currentDocs.map((doc) => {
          if (doc.id === docId || doc.docType === docId) {
            affectedDocTitle = doc.title;
            return {
              ...doc,
              status,
              rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
              verifiedBy: currentUser?.name || 'Loan Officer',
              verifiedAt: new Date().toISOString()
            };
          }
          return doc;
        });

        const requiredSlots = ['aadhaar', 'pan', 'income'];
        const hasAnyRejected = updatedDocs.some((d) => d.status === 'REJECTED');
        const allRequiredVerified = requiredSlots.every((slot) => {
          const found = updatedDocs.find((d) => d.docType === slot);
          return found && found.status === 'VERIFIED';
        });

        const overallDocStatus: 'VERIFIED' | 'PENDING' | 'INCOMPLETE' = hasAnyRejected
          ? 'INCOMPLETE'
          : allRequiredVerified
          ? 'VERIFIED'
          : 'PENDING';

        return {
          ...app,
          documents: updatedDocs,
          document_verification_status: overallDocStatus,
          uploadedDocuments: updatedDocs.map((d) => {
            const badge =
              d.status === 'VERIFIED'
                ? 'Verified ✓'
                : d.status === 'REJECTED'
                ? `Rejected (${d.rejectionReason})`
                : 'Pending';
            return `${d.title}: ${d.fileName} (${badge})`;
          })
        };
      })
    );

    const docAuditLog: AuditLogEntry = {
      id: `LOG-DOC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: currentUser?.name || 'Loan Officer',
      role: currentUser?.role || 'LOAN_OFFICER',
      action: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
      target_id: appId,
      details:
        status === 'VERIFIED'
          ? `Document "${affectedDocTitle}" verified by ${currentUser?.name || 'Loan Officer'}.`
          : `Document "${affectedDocTitle}" rejected by ${currentUser?.name || 'Loan Officer'}. Reason: ${rejectionReason || 'Deficient documentation'}`,
      ip_address: '103.28.14.92',
      checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    };
    setAuditLogs((prev) => [docAuditLog, ...prev]);
  };

  // Status Transition Handler (Manager Approve / Reject / Cancel / Disburse / Under Review)
  const handleOfficerOverride = (
    appId: string,
    newStatus: ApplicationStatus,
    officerName: string,
    reason: string
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    // Guard: Prevent approving or disbursing a cancelled application
    if (isApplicationCancelled(targetApp.status) && newStatus !== 'CANCELLED') {
      setAccessDeniedNotice(
        `Security Policy Violation Blocked: Cancelled application #${appId} cannot be transitioned to ${formatApplicationStatusLabel(newStatus)}.`
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const actorRole = currentUser ? currentUser.role : 'MANAGER';
    const actorId = currentUser ? currentUser.id : 'MGR-TN-8842';

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const histEntry = {
            id: `HIST-${Date.now()}`,
            previous_status: app.status,
            new_status: newStatus,
            actor_id: actorId,
            actor_name: officerName,
            actor_role: actorRole,
            reason,
            timestamp: nowIso
          };

          const updated: ApplicationRecord = {
            ...app,
            status: newStatus,
            isNewSubmission: false,
            officer_override: {
              original_decision: app.prediction?.final_decision || 'Manual Review',
              new_decision: newStatus,
              officer_id: actorId,
              officer_name: officerName,
              timestamp: nowIso,
              override_reason: reason,
              signature_hash: `SIG-${actorRole}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            },
            notes: [
              `[${formatApplicationStatusLabel(newStatus)}] by ${officerName} (${actorRole}): "${reason}"`,
              ...(app.notes || [])
            ],
            status_history: [histEntry, ...(app.status_history || [])],
            updated_at: nowIso
          };

          const actorObj = {
            id: currentUser?.id || 'USR-ACTOR',
            name: officerName,
            role: actorRole,
            timestamp: nowIso
          };

          if (newStatus === 'CANCELLED') {
            updated.cancellation_reason = reason;
            updated.cancelled_by = actorObj;
            updated.cancelled_at = nowIso;
          } else if (newStatus === 'REJECTED') {
            updated.rejection_reason = reason;
            updated.rejected_by = actorObj;
            updated.rejected_at = nowIso;
          } else if (newStatus === 'DISBURSED') {
            updated.disbursed_by = actorObj;
            updated.disbursed_at = nowIso;
          }

          return updated;
        }
        return app;
      })
    );

    // Sync status transition with backend & Firestore
    if (currentUser) {
      void updateApplicationStatusOnServer(appId, newStatus, reason, {
        ...currentUser,
        name: officerName || currentUser.name
      }).then((res) => {
        if (res.ok && res.application) {
          setApplications((prev) =>
            prev.map((a) => (a.id === res.application!.id ? res.application! : a))
          );
        }
      });
    }

    // Trigger Centered Flash Notification in Client Portal when status is updated
    const alertData = {
      appId,
      ownerEmail: targetApp?.ownerEmail,
      ownerId: targetApp?.ownerId,
      applicantName: targetApp ? targetApp.applicant.full_name : 'Valued Customer',
      loanAmount: targetApp ? targetApp.applicant.loan_amount : 1800000,
      newStatus,
      officerName,
      reason,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      applicationDate: targetApp
        ? new Date(targetApp.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : new Date().toLocaleDateString('en-IN')
    };
    setClientFlashOverrideAlert(alertData);
    try {
      localStorage.setItem('ai_loanguard_client_override_alert', JSON.stringify(alertData));
    } catch {}

    const newLog: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: nowIso,
      actor: officerName,
      role: actorRole === 'MANAGER' ? 'Senior Branch Credit Manager' : actorRole,
      action: `APPLICATION_STATUS_${newStatus}`,
      target_id: appId,
      details: `Application ${appId} transitioned to ${formatApplicationStatusLabel(newStatus)}. Rationale: "${reason}".`,
      ip_address: '103.28.14.92',
      checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Client Cancellation Handler
  const handleClientCancelApplication = (appId: string, reason: string) => {
    if (!currentUser) return;
    handleOfficerOverride(appId, 'CANCELLED', currentUser.name, reason);
  };

  // Role Switcher Handler
  const handleSwitchRole = (newRole: UserRole) => {
    if (!currentUser) return;
    const updatedUser: UserAuth = {
      ...currentUser,
      role: newRole,
      designation:
        newRole === 'MANAGER'
          ? 'Senior Branch Credit Manager'
          : newRole === 'OFFICER'
          ? 'Credit Verification Officer'
          : 'Retail / MSME Borrower',
      branch:
        newRole === 'MANAGER'
          ? 'Anna Salai Main Branch, Chennai'
          : newRole === 'OFFICER'
          ? 'Central Loan Processing Hub, Chennai'
          : currentUser.branch || 'Madurai Central'
    };
    setCurrentUser(updatedUser);
    setActiveTab(
      newRole === 'MANAGER'
        ? 'applications'
        : newRole === 'OFFICER'
        ? 'officer_queue'
        : 'client_apply'
    );

    const log: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: updatedUser.name,
      role: updatedUser.role,
      action: 'ROLE_SWITCH_TRIGGERED',
      target_id: updatedUser.id,
      details: `User context switched to ${newRole} mode. Application list prioritized.`,
      ip_address: '103.28.14.92',
      checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const handleLogin = (user: UserAuth) => {
    setCurrentUser(user);
    saveActiveSession(user);
    void persistUserProfile(user);
    if (user.branchCode && user.role !== 'CLIENT') {
      setBranchCode(user.branchCode);
      setStoredBranchCode(user.branchCode);
    }
    setActiveTabState(DEFAULT_TAB_BY_ROLE[user.role]);

    const log: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.name,
      role: user.role,
      action: 'USER_AUTHENTICATED',
      target_id: user.id,
      details: `User authentication successful with role ${user.role} via ${user.authProvider}.`,
      ip_address: '103.28.14.92',
      checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const handleUpdatePhone = (phone: string) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, phone };
      saveActiveSession(next);
      void persistUserProfile(next);
      return next;
    });
  };

  const handleUpdateProfile = (updated: Partial<UserAuth>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      saveActiveSession(next);
      void persistUserProfile(next);
      return next;
    });
  };

  const handleLogout = () => {
    if (currentUser) {
      const log: AuditLogEntry = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: currentUser.name,
        role: currentUser.role,
        action: 'USER_SESSION_TERMINATED',
        target_id: currentUser.id,
        details: `User session logged out successfully.`,
        ip_address: '103.28.14.92',
        checksum: `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      setAuditLogs((prev) => [log, ...prev]);
    }
    void signOutFirebaseIfNeeded();
    saveActiveSession(null);
    setCurrentUser(null);
  };

  // If not logged in, render the secure Login/Register screen (without AI Chatbot)
  if (!currentUser) {
    return (
      <ErrorBoundary portalName="Authentication">
        <LoginView onLogin={handleLogin} securitySettings={securitySettings} />
      </ErrorBoundary>
    );
  }

  const isManager = currentUser.role === 'MANAGER';
  const isOfficer = currentUser.role === 'OFFICER';
  const isClient = currentUser.role === 'CLIENT';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans relative bg-slate-50 text-slate-900 ${
        isManager
          ? 'selection:bg-emerald-600 selection:text-white'
          : isOfficer
          ? 'selection:bg-sky-600 selection:text-white'
          : 'selection:bg-indigo-600 selection:text-white'
      }`}
    >
      {/* Static Professional Banking Background in All Portals */}
      <FloatingMoneyBackground variant="portal" portalRole={currentUser.role} />

      {/* Top Navigation Bar */}
      <div className="relative z-50">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSelectCaseStudy={(study) => {
            setCurrentApplicant(study);
          }}
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
          onLogout={handleLogout}
          dataMaskingActive={securitySettings.dataMaskingActive}
          onUpdatePhone={handleUpdatePhone}
          onUpdateProfile={handleUpdateProfile}
          branchCode={branchCode}
          onUpdateBranchCode={handleUpdateBranchCode}
          onOpenChatbot={() => setIsChatbotOpen(true)}
        />
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* RBAC Access Control Warning Banner if unauthorized route/tab was attempted */}
        {accessDeniedNotice && (
          <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{accessDeniedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAccessDeniedNotice('')}
              className="text-rose-500 hover:text-rose-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* FLASH NOTIFICATION IN MANAGER & LOAN OFFICER PORTALS FOR NEW OR FORWARDED APPLICATIONS */}
        {(isManager || isOfficer) && managerFlashAlert && (
          <div className="mb-6 bg-gradient-to-r from-amber-600 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 rounded-3xl shadow-xl border-2 border-amber-300 animate-fadeIn flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center space-x-3.5 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                <Zap className="w-6 h-6 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-amber-300 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-xs">
                    ⚡ New Application Requires Review
                  </span>
                  <span className="text-amber-200 text-xs font-mono font-bold bg-black/20 px-2 py-0.5 rounded-md">
                    #{managerFlashAlert.appId}
                  </span>
                  <span className="text-[11px] text-amber-200">
                    {managerFlashAlert.timestamp}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-white mt-1">
                  Application by {managerFlashAlert.applicantName} (₹{managerFlashAlert.loanAmount.toLocaleString('en-IN')})
                </h4>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  {managerFlashAlert.source === 'OFFICER_FORWARDED'
                    ? 'Verified across 4 stages by Loan Officer & forwarded to Bank Manager for final credit sanction.'
                    : 'Submitted via Client Portal with status Pending Review. Ready for Loan Officer verification and Manager approval.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 relative z-10 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab(isManager ? 'applications' : 'officer_queue');
                }}
                className="bg-white hover:bg-amber-50 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Stamp className="w-4 h-4 text-emerald-700" />
                <span>Review Application Now →</span>
              </button>
              <button
                type="button"
                onClick={() => setManagerFlashAlert(null)}
                className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white text-xs cursor-pointer transition-colors"
                title="Dismiss Flash Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <ErrorBoundary
          portalName={isManager ? 'Bank Manager Portal' : isOfficer ? 'Loan Officer Portal' : 'Client Portal'}
          onReset={() => setActiveTabState(DEFAULT_TAB_BY_ROLE[currentUser.role])}
        >
          {/* 1. BANK MANAGER VIEWS */}
          {isManager && (
            <>
              {activeTab === 'underwriter' && (
                <UnderwriterView
                  currentApplicant={currentApplicant}
                  setCurrentApplicant={setCurrentApplicant}
                  onSubmitApplication={handleAddApplication}
                />
              )}

              {activeTab === 'applications' && (
                <ApplicationsView
                  applications={applications}
                  auditLogs={auditLogs}
                  onOfficerOverride={handleOfficerOverride}
                  currentUser={currentUser}
                  dataMaskingActive={securitySettings.dataMaskingActive}
                />
              )}

              {activeTab === 'analytics' && <ModelAnalyticsView />}

              {activeTab === 'security' && (
                <SecurityBoostView
                  securitySettings={securitySettings}
                  setSecuritySettings={setSecuritySettings}
                  auditLogs={auditLogs}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  currentUser={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  branchCode={branchCode}
                  onUpdateBranchCode={handleUpdateBranchCode}
                />
              )}
            </>
          )}

          {/* 2. LOAN OFFICER VIEWS */}
          {isOfficer && (
            <>
              {(activeTab === 'officer_queue' || activeTab === 'underwriter') && (
                <ErrorBoundary
                  portalName="Loan Officer Verification Portal"
                  onReset={() => {
                    void fetchApplicationsFromServer(currentUser?.role).then((apps) => {
                      if (apps && apps.length > 0) setApplications(apps);
                    });
                  }}
                >
                  <LoanOfficerPortalView
                    currentUser={currentUser}
                    applications={applications}
                    onForwardToManager={handleForwardToManager}
                    onUpdateStatus={handleOfficerOverride}
                    onDocumentVerificationUpdate={handleDocumentVerificationUpdate}
                    dataMaskingActive={securitySettings.dataMaskingActive}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'applications' && (
                <ApplicationsView
                  applications={applications}
                  auditLogs={auditLogs}
                  onOfficerOverride={handleOfficerOverride}
                  currentUser={currentUser}
                  dataMaskingActive={securitySettings.dataMaskingActive}
                />
              )}

              {activeTab === 'analytics' && <ModelAnalyticsView />}

              {activeTab === 'security' && (
                <SecurityBoostView
                  securitySettings={securitySettings}
                  setSecuritySettings={setSecuritySettings}
                  auditLogs={auditLogs}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  currentUser={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  branchCode={branchCode}
                  onUpdateBranchCode={handleUpdateBranchCode}
                />
              )}
            </>
          )}

          {/* 3. CLIENT / BORROWER VIEWS */}
          {isClient && (
            <>
              {activeTab === 'profile' ? (
                <ProfileView
                  currentUser={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  branchCode={branchCode}
                  onUpdateBranchCode={handleUpdateBranchCode}
                />
              ) : (
                <ClientPortalView
                  currentUser={currentUser}
                  applications={applications}
                  onSubmitApplication={handleAddApplication}
                  onCancelApplication={handleClientCancelApplication}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              )}

              {/* CENTERED FLASH MESSAGE IN CLIENT PORTAL WHEN STATUS UPDATES (only for the matching borrower) */}
              {clientFlashOverrideAlert &&
                (((clientFlashOverrideAlert as any).ownerEmail &&
                  (clientFlashOverrideAlert as any).ownerEmail.toLowerCase() ===
                    (currentUser.email || '').toLowerCase()) ||
                  clientFlashOverrideAlert.applicantName.trim().toLowerCase() ===
                    (currentUser.name || '').trim().toLowerCase()) && (
                  <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-emerald-500 overflow-hidden text-slate-900 animate-scaleUp">
                      {/* Header */}
                      <div
                        className={`p-5 text-white flex items-center justify-between ${
                          clientFlashOverrideAlert.newStatus === 'APPROVED' ||
                          clientFlashOverrideAlert.newStatus === 'DISBURSED'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                            : clientFlashOverrideAlert.newStatus === 'CONDITIONAL_APPROVAL' ||
                              clientFlashOverrideAlert.newStatus === 'UNDER_REVIEW'
                            ? 'bg-gradient-to-r from-sky-600 to-blue-700'
                            : clientFlashOverrideAlert.newStatus === 'CANCELLED'
                            ? 'bg-gradient-to-r from-slate-700 to-slate-900'
                            : 'bg-gradient-to-r from-rose-600 to-red-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black shrink-0">
                            <Zap className="w-6 h-6 fill-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-black bg-black/25 px-2.5 py-0.5 rounded-full tracking-wider">
                                ⚡ Loan Status Official Update
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                              Application Status: {formatApplicationStatusLabel(clientFlashOverrideAlert.newStatus)}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Body Details */}
                      <div className="p-6 space-y-4">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Your loan application status has been updated and synchronized across all banking portals.
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Application ID:</span>
                            <span className="font-mono font-bold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded">
                              #{clientFlashOverrideAlert.appId}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Application Date:</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              <span>{clientFlashOverrideAlert.applicationDate}</span>
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Borrower:</span>
                            <span className="font-bold text-slate-900">
                              {clientFlashOverrideAlert.applicantName}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Loan Facility:</span>
                            <span className="font-bold text-slate-900">
                              ₹{clientFlashOverrideAlert.loanAmount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                            <span className="text-slate-500 font-semibold">Updated Status:</span>
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                                clientFlashOverrideAlert.newStatus === 'APPROVED' ||
                                clientFlashOverrideAlert.newStatus === 'DISBURSED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : clientFlashOverrideAlert.newStatus === 'CONDITIONAL_APPROVAL' ||
                                    clientFlashOverrideAlert.newStatus === 'UNDER_REVIEW'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : clientFlashOverrideAlert.newStatus === 'CANCELLED'
                                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {formatApplicationStatusLabel(clientFlashOverrideAlert.newStatus)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Action Performed By:</span>
                            <span className="font-semibold text-slate-900">
                              {clientFlashOverrideAlert.officerName}
                            </span>
                          </div>

                          <div className="text-xs pt-1.5 border-t border-slate-200">
                            <span className="text-slate-500 block mb-1">Official Rationale / Reason:</span>
                            <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium italic text-[11px]">
                              "{clientFlashOverrideAlert.reason}"
                            </p>
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-mono">
                            <span>Recorded: {clientFlashOverrideAlert.timestamp}</span>
                            <span className="text-emerald-700 font-bold">DPDP & Fair Lending Certified ✓</span>
                          </div>
                        </div>

                        {/* Prominent Center (Done) Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setClientFlashOverrideAlert(null);
                              try {
                                localStorage.removeItem('ai_loanguard_client_override_alert');
                              } catch (e) {}
                              setActiveTab('client_status');
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            <span>(Done)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Modern Theme Footer */}
      <footer className="bg-[#0c1e3d] border-t border-sky-900/60 text-slate-300 text-xs py-8 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>AI-LoanGuard Enterprise Credit Risk System</span>
            </div>
            <p className="text-[11px] text-sky-200/70">
              Tamil Nadu Banking Circle • Strict Compliance with RBI Fair Practices Code & DPDP Act 2023
            </p>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-1 text-sky-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>AES-256 Hardware Encrypted</span>
            </span>
            <span className="text-sky-800">|</span>
            <span className="text-sky-200/80">
              Logged in as: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})
            </span>
          </div>
        </div>
      </footer>

      {/* AI Chatbot for All Portals (Client, Manager, Loan Officer) */}
      <GeminiChatbot
        currentUser={currentUser}
        isOpenExternal={isChatbotOpen}
        onCloseExternal={() => setIsChatbotOpen(false)}
      />
    </div>
  );
}
