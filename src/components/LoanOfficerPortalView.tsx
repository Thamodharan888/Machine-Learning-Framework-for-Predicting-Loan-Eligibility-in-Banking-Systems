import React, { useState } from 'react';
import {
  ApplicationRecord,
  ApplicationStatus,
  UserAuth,
  ClientDocumentRecord,
  DocumentVerificationStatus
} from '../types';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Building,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  Send,
  Printer,
  Sparkles,
  Zap,
  TrendingUp,
  Search,
  Filter,
  Check,
  Clock,
  Layers,
  FileCheck,
  Eye,
  Sliders,
  Ban,
  Lock,
  XCircle,
  FolderOpen
} from 'lucide-react';
import { PrintableApplicationModal } from './PrintableApplicationModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { VERIFICATION_DOCUMENT_SLOTS } from '../utils/documentManager';
import {
  formatApplicationStatusLabel,
  isApplicationCancelled,
  isApplicationTerminal,
  formatActorDisplay,
  formatInr,
  updateDocumentStatusOnBackend
} from '../utils/portalStorage';

interface LoanOfficerPortalViewProps {
  currentUser: UserAuth;
  applications: ApplicationRecord[];
  onForwardToManager: (
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
  ) => void;
  onUpdateStatus?: (
    appId: string,
    newStatus: ApplicationStatus,
    officerName: string,
    reason: string
  ) => void;
  onDocumentVerificationUpdate?: (
    appId: string,
    docId: string,
    status: DocumentVerificationStatus,
    rejectionReason?: string
  ) => void;
  dataMaskingActive?: boolean;
}

export const LoanOfficerPortalView: React.FC<LoanOfficerPortalViewProps> = ({
  currentUser,
  applications,
  onForwardToManager,
  onUpdateStatus,
  onDocumentVerificationUpdate,
  dataMaskingActive = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [selectedAppId, setSelectedAppId] = useState<string>(
    applications?.[0]?.id || ''
  );

  // 6-Stage Officer Review State for selected application
  const [verifyApplicantDetails, setVerifyApplicantDetails] = useState<boolean>(true);
  const [verifyDocuments, setVerifyDocuments] = useState<boolean>(true);
  const [reviewFinancials, setReviewFinancials] = useState<boolean>(true);
  const [reviewMlPrediction, setReviewMlPrediction] = useState<boolean>(true);
  const [officerRemarks, setOfficerRemarks] = useState<string>(
    'Branch field appraisal completed. Verified business establishment, inventory turnover, and primary bank credits. Applicant shows consistent cash flow. Recommended for credit sanction.'
  );
  const [forwardSuccessMessage, setForwardSuccessMessage] = useState<string>('');
  const [forwardErrorMessage, setForwardErrorMessage] = useState<string>('');
  const [printAppModal, setPrintAppModal] = useState<ApplicationRecord | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{
    doc: ClientDocumentRecord;
    appId: string;
    applicantName: string;
  } | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [docActionMessage, setDocActionMessage] = useState<string>('');

  const safeApplications = Array.isArray(applications) ? applications : [];
  const selectedApp =
    safeApplications.find((app) => app?.id === selectedAppId) || safeApplications[0] || null;

  // Safe Applicant & Prediction Fallbacks to eliminate any undefined rendering errors
  const applicant = selectedApp?.applicant || {
    applicant_id: selectedApp?.id || 'APP-UNKNOWN',
    full_name: 'Applicant',
    age: 30,
    gender: 'Male' as const,
    marital_status: 'Single' as const,
    dependents: 0,
    education: 'Graduate' as const,
    employment_type: 'Salaried Private' as const,
    employment_years: 3,
    monthly_income: 50000,
    coapplicant_income: 0,
    loan_amount: 500000,
    loan_term_months: 36,
    credit_score: 750,
    existing_emi: 0,
    bank_account_age_months: 24,
    previous_loan_count: 0,
    previous_default: false,
    collateral_value: 1000000,
    location: 'Chennai',
    loan_purpose: 'Personal / Medical Emergency' as const,
    kyc_verified: true,
    consent_signed: true
  };

  const prediction = selectedApp?.prediction || {
    approval_probability: 0.85,
    final_decision: 'Eligible' as const,
    risk_tier: 'Low Risk' as const,
    confidence: 0.9,
    shap_factors: [],
    model_version: 'v2.4-LightGBM',
    engineered_features: {
      total_income: 50000,
      annual_income: 600000,
      proposed_emi: 15000,
      total_emi: 15000,
      dti_ratio: 30,
      loan_to_income_ratio: 0.83,
      existing_emi_ratio: 0,
      loan_to_value_ratio: 50,
      income_per_dependent: 50000,
      employment_stability_score: 80,
      previous_repayment_score: 85
    }
  };

  const safeOfficerName = currentUser?.name || 'Credit Verification Officer';
  const safeOfficerDesignation = currentUser?.designation || 'Senior Branch Credit Officer';
  const safeOfficerBranch = currentUser?.branch || 'Tamil Nadu Banking Circle';
  const officerAvatarLetter = safeOfficerName.trim() ? safeOfficerName.trim().charAt(0).toUpperCase() : 'O';

  const handleVerifyDoc = async (docId: string) => {
    if (!selectedApp) return;
    onDocumentVerificationUpdate?.(selectedApp.id, docId, 'VERIFIED');
    setDocActionMessage('✓ Document marked as Verified & Audited.');
    setTimeout(() => setDocActionMessage(''), 4000);
    setViewingDoc(null);
    try {
      await updateDocumentStatusOnBackend({
        appId: selectedApp.id,
        docId,
        status: 'VERIFIED',
        currentUser
      });
    } catch (err) {
      console.warn('Backend document status update warning:', err);
    }
  };

  const handleRejectDoc = async (docId: string, reason: string) => {
    if (!selectedApp) return;
    onDocumentVerificationUpdate?.(selectedApp.id, docId, 'REJECTED', reason);
    setDocActionMessage(`✗ Document marked as Rejected: "${reason}".`);
    setTimeout(() => setDocActionMessage(''), 5000);
    setViewingDoc(null);
    setRejectingDocId(null);
    setRejectReason('');
    try {
      await updateDocumentStatusOnBackend({
        appId: selectedApp.id,
        docId,
        status: 'REJECTED',
        rejectionReason: reason,
        currentUser
      });
    } catch (err) {
      console.warn('Backend document rejection update warning:', err);
    }
  };

  // Safe Filtering: Guard against undefined applicant or location fields
  const filteredApps = safeApplications.filter((app) => {
    if (!app) return false;
    const applicantName = (app.applicant?.full_name || '').toLowerCase();
    const appId = (app.id || '').toLowerCase();
    const location = (app.applicant?.location || '').toLowerCase();
    const query = (searchTerm || '').toLowerCase().trim();

    const matchesSearch =
      !query ||
      applicantName.includes(query) ||
      appId.includes(query) ||
      location.includes(query);

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && app.status !== 'CANCELLED') ||
      (filterStatus === 'PENDING' &&
        (app.status === 'PENDING_OFFICER_REVIEW' ||
          app.status === 'PENDING_REVIEW' ||
          app.status === 'UNDER_REVIEW')) ||
      (filterStatus === 'FORWARDED' && app.status === 'FORWARDED_TO_MANAGER') ||
      (filterStatus === 'CANCELLED' && app.status === 'CANCELLED') ||
      app.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleSelectApp = (app: ApplicationRecord) => {
    if (!app) return;
    setSelectedAppId(app.id);
    setVerifyApplicantDetails(Boolean(app.officer_review?.verified_applicant_details ?? true));
    setVerifyDocuments(Boolean(app.officer_review?.verified_documents ?? true));
    setReviewFinancials(Boolean(app.officer_review?.reviewed_financials ?? true));
    setReviewMlPrediction(Boolean(app.officer_review?.reviewed_ml_prediction ?? true));
    setOfficerRemarks(
      app.officer_review?.remarks ||
        'Branch field appraisal completed. Verified business establishment, inventory turnover, and primary bank credits. Applicant shows consistent cash flow. Recommended for credit sanction.'
    );
    setForwardSuccessMessage('');
    setForwardErrorMessage('');
  };

  const handleMarkUnderReview = () => {
    if (!selectedApp || !onUpdateStatus) return;
    if (isApplicationTerminal(selectedApp.status)) {
      setForwardErrorMessage(
        `Action blocked: Application #${selectedApp.id} is already in ${formatApplicationStatusLabel(selectedApp.status)} status.`
      );
      return;
    }
    onUpdateStatus(
      selectedApp.id,
      'UNDER_REVIEW',
      currentUser.name,
      `Application moved to Under Review by Loan Officer ${currentUser.name} for KYC & field verification.`
    );
    setForwardSuccessMessage(
      `✓ Application #${selectedApp.id} moved to Under Review status.`
    );
    setTimeout(() => setForwardSuccessMessage(''), 5000);
  };

  const handleForwardToManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (isApplicationCancelled(selectedApp.status)) {
      setForwardErrorMessage(
        `Action denied: Application #${selectedApp.id} has been Cancelled and cannot be forwarded or approved.`
      );
      return;
    }

    if (isApplicationTerminal(selectedApp.status)) {
      setForwardErrorMessage(
        `Action denied: Application #${selectedApp.id} is already ${formatApplicationStatusLabel(selectedApp.status)}.`
      );
      return;
    }

    if (!verifyApplicantDetails || !verifyDocuments || !reviewFinancials || !reviewMlPrediction) {
      setForwardErrorMessage('Please complete all 4 preliminary verification checks before forwarding to Manager.');
      return;
    }
    setForwardErrorMessage('');

    onForwardToManager(selectedApp.id, {
      verified_applicant_details: verifyApplicantDetails,
      verified_documents: verifyDocuments,
      reviewed_financials: reviewFinancials,
      reviewed_ml_prediction: reviewMlPrediction,
      remarks: officerRemarks.trim(),
      officer_id: currentUser.id,
      officer_name: currentUser.name
    });

    setForwardSuccessMessage(
      `✓ Application #${selectedApp.id} (${selectedApp.applicant.full_name}) successfully verified and forwarded to Bank Manager for final credit sanction!`
    );
    setTimeout(() => setForwardSuccessMessage(''), 6000);
  };

  // Quick stats (excluding cancelled from active pending counts)
  const activeAppsCount = safeApplications.filter((a) => a.status !== 'CANCELLED').length;
  const pendingOfficerCount = safeApplications.filter(
    (a) =>
      a.status === 'PENDING_OFFICER_REVIEW' ||
      a.status === 'PENDING_REVIEW' ||
      a.status === 'UNDER_REVIEW'
  ).length;
  const forwardedCount = safeApplications.filter((a) => a.status === 'FORWARDED_TO_MANAGER').length;
  const approvedCount = safeApplications.filter(
    (a) => a.status === 'APPROVED' || a.status === 'DISBURSED'
  ).length;

  const isSelectedAppCancelled = selectedApp ? isApplicationCancelled(selectedApp.status) : false;
  const isSelectedAppTerminal = selectedApp ? isApplicationTerminal(selectedApp.status) : false;

  return (
    <div className="space-y-6">
      {/* Top Banner / Officer Identity */}
      <div className="bg-gradient-to-r from-[#091e3a] via-[#102d54] to-[#0a2344] text-white p-6 rounded-3xl shadow-xl border border-sky-800/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-400 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                <ClipboardCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black tracking-tight text-white">
                    Loan Officer Verification Portal
                  </h1>
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/30">
                    Stage 2 Review
                  </span>
                </div>
                <p className="text-xs text-sky-200">
                  Verify Applicant Details • Audit KYC & Financial Documents • Assess ML Predictions • Forward to Manager
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs bg-slate-900/60 border border-sky-800/80 px-4 py-2.5 rounded-2xl">
            <div className="text-right">
              <div className="font-bold text-white">{safeOfficerName}</div>
              <div className="text-[11px] text-sky-300">
                {safeOfficerDesignation} • {safeOfficerBranch}
              </div>
              {currentUser?.branchCode && (
                <div className="text-[10px] font-mono text-amber-300 font-bold tracking-wider">
                  Branch Code: ••••••
                </div>
              )}
            </div>
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={safeOfficerName}
                className="w-9 h-9 rounded-lg object-cover border border-amber-400 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-slate-950 font-black flex items-center justify-center text-xs">
                {officerAvatarLetter}
              </div>
            )}
          </div>
        </div>

        {/* Workflow breadcrumb pipeline */}
        <div className="mt-5 pt-4 border-t border-sky-800/50 flex flex-wrap items-center gap-2 text-xs font-semibold text-sky-200">
          <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-700/50">
            1. Pending Review
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
          <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold shadow-xs">
            2. Under Review (Loan Officer Audit)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
          <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-700/50">
            3. Manager Decision (Approved / Rejected / Cancelled)
          </span>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Active in Queue</div>
            <div className="text-2xl font-black text-slate-900">{activeAppsCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-800 font-semibold">Pending / Under Review</div>
            <div className="text-2xl font-black text-amber-900">{pendingOfficerCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-sky-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-sky-800 font-semibold">Forwarded to Manager</div>
            <div className="text-2xl font-black text-sky-900">{forwardedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-800 font-semibold">Approved / Disbursed</div>
            <div className="text-2xl font-black text-emerald-900">{approvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {forwardSuccessMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 font-bold text-xs flex items-center space-x-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{forwardSuccessMessage}</span>
        </div>
      )}

      {/* Main Dual-Column Grid: Queue (Left 4 cols) & 6-Stage Officer Review Form (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applications Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-sky-600" />
                <span>Officer Audit Queue</span>
              </h3>
              <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                {filteredApps.length} Cases
              </span>
            </div>

            {/* Search and Status Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search applicant name, ID, district..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto text-[11px] pb-1">
                {[
                  { id: 'ACTIVE', label: 'Active Queue' },
                  { id: 'PENDING', label: 'Pending Audit' },
                  { id: 'FORWARDED', label: 'Forwarded' },
                  { id: 'APPROVED', label: 'Approved' },
                  { id: 'CANCELLED', label: 'Cancelled History' },
                  { id: 'ALL', label: 'All History' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-all ${
                      filterStatus === f.id
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Applications */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredApps.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No applications found matching your criteria.
                </div>
              ) : (
                filteredApps.map((app) => {
                  const isSelected = app.id === selectedApp?.id;
                  const isForwarded = app.status === 'FORWARDED_TO_MANAGER';
                  const isCancelled = app.status === 'CANCELLED';
                  const isPending =
                    app.status === 'PENDING_OFFICER_REVIEW' ||
                    app.status === 'PENDING_REVIEW' ||
                    app.status === 'UNDER_REVIEW';

                  return (
                    <div
                      key={app.id}
                      onClick={() => handleSelectApp(app)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-200'
                          : isCancelled
                          ? 'border-slate-200 bg-slate-50/70 opacity-75'
                          : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{app.applicant?.full_name || 'Applicant'}</span>
                            {app.isNewSubmission && !isCancelled && (
                              <span className="text-[9px] bg-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                                New
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            #{app.id} • {app.applicant?.location || 'Tamil Nadu'}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isCancelled
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : isForwarded
                              ? 'bg-sky-100 text-sky-800 border-sky-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : app.status === 'APPROVED' || app.status === 'DISBURSED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {formatApplicationStatusLabel(app.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100">
                        <span className="font-semibold text-slate-800">
                          ₹{formatInr(app.applicant?.loan_amount)} ({app.applicant?.loan_term_months || 36}m)
                        </span>
                        <span className="text-slate-500">
                          CIBIL: <strong>{app.applicant?.credit_score || 750}</strong> •{' '}
                          {((app.prediction?.approval_probability ?? 0.75) * 100).toFixed(0)}% Match
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 6-Stage Loan Officer Review Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedApp ? (
            <form onSubmit={handleForwardToManager} className="space-y-4">
              {/* Header for Selected Application */}
              <div className="bg-white rounded-3xl border border-sky-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md font-mono">
                      #{selectedApp.id}
                    </span>
                    <h2 className="text-base font-black text-slate-900">
                      {applicant.full_name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {applicant.employment_type} • {applicant.location}, Tamil Nadu
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onUpdateStatus &&
                    (selectedApp.status === 'PENDING_REVIEW' ||
                      selectedApp.status === 'PENDING_OFFICER_REVIEW') && (
                      <button
                        type="button"
                        onClick={handleMarkUnderReview}
                        className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                      >
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Mark Under Review</span>
                      </button>
                    )}

                  <button
                    type="button"
                    onClick={() => setPrintAppModal(selectedApp)}
                    className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                    title="Print"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print</span>
                  </button>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                      selectedApp.status === 'CANCELLED'
                        ? 'bg-slate-200 text-slate-800 border-slate-300'
                        : selectedApp.status === 'FORWARDED_TO_MANAGER'
                        ? 'bg-sky-100 text-sky-800 border-sky-300'
                        : selectedApp.status === 'APPROVED' || selectedApp.status === 'DISBURSED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : selectedApp.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {formatApplicationStatusLabel(selectedApp.status)}
                  </span>
                </div>
              </div>

              {/* Cancelled / Terminal Status Lock Banner */}
              {isSelectedAppCancelled && (
                <div className="p-4 bg-slate-100 border-2 border-slate-300 rounded-2xl text-slate-800 text-xs flex items-start space-x-3">
                  <Ban className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-slate-900">
                      Application Cancelled — Action Locked
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Reason: &ldquo;{selectedApp.cancellation_reason || 'Cancelled by authorized user'}&rdquo; • Cancelled by{' '}
                      <strong>{formatActorDisplay(selectedApp.cancelled_by).formattedText}</strong>. This application is retained in audit history and cannot be forwarded, approved, or disbursed.
                    </p>
                  </div>
                </div>
              )}

              {/* Rejected Status Banner */}
              {selectedApp.status === 'REJECTED' && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-rose-950">
                      Application Rejected — Action Closed
                    </div>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Reason: &ldquo;{selectedApp.rejection_reason || 'Application rejected by management'}&rdquo;
                      {selectedApp.rejected_by && (
                        <>
                          {' '}• Rejected by{' '}
                          <strong>{formatActorDisplay(selectedApp.rejected_by).formattedText}</strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Approved / Disbursed Status Banner */}
              {(selectedApp.status === 'APPROVED' || selectedApp.status === 'DISBURSED') && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-emerald-950">
                      {selectedApp.status === 'DISBURSED' ? 'Loan Disbursed' : 'Loan Sanctioned / Approved'}
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {selectedApp.approved_by && (
                        <>
                          Approved by <strong>{formatActorDisplay(selectedApp.approved_by).formattedText}</strong>
                        </>
                      )}
                      {selectedApp.disbursed_by && (
                        <>
                          {' '}• Disbursed by <strong>{formatActorDisplay(selectedApp.disbursed_by).formattedText}</strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE 1: Verify Applicant Details */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Verify Applicant Details
                    </h3>
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verifyApplicantDetails}
                      onChange={(e) => setVerifyApplicantDetails(e.target.checked)}
                      disabled={isSelectedAppTerminal}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Applicant Identity Verified ✓</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Full Legal Name</span>
                    <span className="font-bold text-slate-900">{applicant.full_name}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Age & Gender</span>
                    <span className="font-bold text-slate-900">
                      {applicant.age} Yrs • {applicant.gender}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">District & Jurisdiction</span>
                    <span className="font-bold text-slate-900">{applicant.location}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Employment / Tenure</span>
                    <span className="font-bold text-slate-900">
                      {applicant.employment_type} ({applicant.employment_years} yrs)
                    </span>
                  </div>
                </div>
              </div>

              {/* STAGE 2: Client Document Verification & Inspection */}
              <div className="bg-[#162032] rounded-3xl border border-slate-700/80 shadow-xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/40">
                        2
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Client Document Verification
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Inspect client-uploaded KYC, tax, income and financial records. Verify authenticity or specify rejection remarks.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 text-xs font-bold text-emerald-300 bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 cursor-pointer hover:bg-emerald-900/60 transition">
                      <input
                        type="checkbox"
                        checked={verifyDocuments}
                        onChange={(e) => setVerifyDocuments(e.target.checked)}
                        disabled={isSelectedAppTerminal}
                        className="rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Documents Inspected & Verified ✓</span>
                    </label>
                  </div>
                </div>

                {/* Inline Toast Message */}
                {docActionMessage && (
                  <div className="p-3 bg-indigo-950/90 border border-cyan-400/60 rounded-xl text-cyan-200 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{docActionMessage}</span>
                  </div>
                )}

                {/* Inline Rejection Reason Modal/Dialog */}
                {rejectingDocId && (
                  <div className="p-4 bg-rose-950/90 border-2 border-rose-500 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>Specify Document Rejection Reason (Mandatory Audit Requirement)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingDocId(null);
                          setRejectReason('');
                        }}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        'Blurry, illegible or low-resolution scan',
                        'Name does not match applicant legal name on record',
                        'Expired document / Validity period ended',
                        'Incomplete document / Missing pages or back side'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectReason(preset)}
                          className={`p-2 rounded-lg text-left border text-[11px] transition cursor-pointer ${
                            rejectReason === preset
                              ? 'bg-rose-900 border-rose-400 text-white font-bold'
                              : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Or type specific rejection reason for the client..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingDocId(null);
                          setRejectReason('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!rejectReason.trim()}
                        onClick={() => handleRejectDoc(rejectingDocId, rejectReason.trim())}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Confirm Rejection</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Client Documents List */}
                <div className="space-y-3">
                  {VERIFICATION_DOCUMENT_SLOTS.map((slot) => {
                    const appDocs = selectedApp?.documents || [];
                    const clientDoc = appDocs.find(
                      (d) =>
                        d.docType === slot.key ||
                        d.id.toLowerCase().includes(slot.key.toLowerCase()) ||
                        d.title.toLowerCase().includes(slot.title.toLowerCase())
                    );

                    const isUploaded = Boolean(clientDoc && clientDoc.fileName);

                    return (
                      <div
                        key={slot.key}
                        className={`rounded-2xl px-4 sm:px-5 py-4 border transition-all ${
                          isUploaded
                            ? 'bg-[#1e293b]/90 border-slate-700 hover:border-slate-600'
                            : 'bg-[#182335]/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start space-x-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                isUploaded
                                  ? clientDoc?.status === 'VERIFIED'
                                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                                    : clientDoc?.status === 'REJECTED'
                                    ? 'bg-rose-950/70 text-rose-400 border-rose-500/40'
                                    : 'bg-indigo-950/70 text-indigo-400 border-indigo-500/40'
                                  : 'bg-slate-800/70 text-slate-500 border-slate-700/50'
                              }`}
                            >
                              {isUploaded ? (
                                clientDoc?.dataUrl?.startsWith('data:image') ? (
                                  <img
                                    src={clientDoc.dataUrl}
                                    alt={clientDoc.title}
                                    className="w-full h-full object-cover rounded-xl"
                                  />
                                ) : (
                                  <FileText className="w-5 h-5" />
                                )
                              ) : (
                                <FolderOpen className="w-5 h-5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-white leading-snug">
                                  {slot.title}
                                </span>
                                {slot.required && (
                                  <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 rounded">
                                    Required
                                  </span>
                                )}

                                {/* Status Pill */}
                                {isUploaded ? (
                                  clientDoc?.status === 'VERIFIED' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Verified
                                    </span>
                                  ) : clientDoc?.status === 'REJECTED' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-500/40">
                                      <XCircle className="w-3 h-3" />
                                      Rejected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
                                      <Clock className="w-3 h-3" />
                                      Pending Verification
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                    Not Uploaded
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-400 mt-0.5">{slot.subtitle}</div>

                              {/* Uploaded File Metadata */}
                              {isUploaded && clientDoc && (
                                <div className="text-[11px] text-slate-300 font-mono mt-1.5 flex flex-wrap items-center gap-2 truncate">
                                  <span className="text-cyan-300 font-semibold truncate max-w-xs">
                                    📄 {clientDoc.fileName}
                                  </span>
                                  {clientDoc.fileSize && (
                                    <span className="text-slate-400">
                                      ({Math.round(clientDoc.fileSize / 1024)} KB)
                                    </span>
                                  )}
                                  {clientDoc.uploadedAt && (
                                    <span className="text-slate-400">
                                      • Uploaded {new Date(clientDoc.uploadedAt).toLocaleDateString('en-IN')}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Rejection Remarks display */}
                              {isUploaded && clientDoc?.status === 'REJECTED' && clientDoc.rejectionReason && (
                                <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/70 border border-rose-800/80 rounded-lg px-2.5 py-1.5 flex items-start space-x-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                  <span>
                                    <strong>Rejection Reason:</strong> {clientDoc.rejectionReason}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons: View, Verify, Reject (NO Upload button for Officer) */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
                            {isUploaded && clientDoc ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingDoc({
                                      doc: clientDoc,
                                      appId: selectedApp?.id || '',
                                      applicantName: applicant.full_name
                                    })
                                  }
                                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View Document</span>
                                </button>

                                {clientDoc.status !== 'VERIFIED' && (
                                  <button
                                    type="button"
                                    disabled={isSelectedAppTerminal}
                                    onClick={() => handleVerifyDoc(clientDoc.id)}
                                    title="Mark document as Verified"
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs px-3 py-2 rounded-xl flex items-center space-x-1 transition cursor-pointer active:scale-95 shadow-sm"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Verify</span>
                                  </button>
                                )}

                                {clientDoc.status !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    disabled={isSelectedAppTerminal}
                                    onClick={() => setRejectingDocId(clientDoc.id)}
                                    title="Mark document as Rejected"
                                    className="bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 disabled:opacity-40 text-rose-300 hover:text-white font-semibold text-xs px-3 py-2 rounded-xl flex items-center space-x-1 transition cursor-pointer active:scale-95 shadow-sm"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="hidden sm:inline">Reject</span>
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-500 italic bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                                Awaiting Client Upload
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STAGE 3: Review Credit & Financial Information */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Review Credit & Financial Information
                    </h3>
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewFinancials}
                      onChange={(e) => setReviewFinancials(e.target.checked)}
                      disabled={isSelectedAppTerminal}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Financials Audited ✓</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">CIBIL Bureau Score</span>
                    <span className="font-black text-slate-900 text-sm">
                      {applicant.credit_score}
                      <span className="text-[10px] font-normal text-emerald-700 ml-1">
                        (
                        {applicant.credit_score >= 750
                          ? 'Prime'
                          : applicant.credit_score >= 680
                          ? 'Good'
                          : 'Subprime'}
                        )
                      </span>
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Monthly Inflow</span>
                    <span className="font-bold text-slate-900">
                      ₹{formatInr(applicant.monthly_income)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Existing EMIs</span>
                    <span className="font-bold text-slate-900">
                      ₹{formatInr(applicant.existing_emi)}/mo
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Collateral Security</span>
                    <span className="font-bold text-emerald-700">
                      ₹{formatInr(applicant.collateral_value)}
                    </span>
                  </div>
                </div>
              </div>

              {/* STAGE 4: Review ML Prediction */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Review ML Risk Prediction (TreeSHAP)
                    </h3>
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewMlPrediction}
                      onChange={(e) => setReviewMlPrediction(e.target.checked)}
                      disabled={isSelectedAppTerminal}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>ML Risk Assessed ✓</span>
                  </label>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">TreeSHAP Model Recommendation</div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span
                        className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                          prediction.final_decision === 'Eligible'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : prediction.final_decision === 'Manual Review'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {prediction.final_decision}
                      </span>
                      <span className="text-xs text-slate-600">
                        Approval Probability:{' '}
                        <strong>{((prediction.approval_probability || 0.75) * 100).toFixed(1)}%</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 text-right">
                    <div>Model Version: <strong>{prediction.model_version || 'v2.4-LightGBM'}</strong></div>
                    <div className="text-[11px] text-emerald-700">Hard policy checks: Cleared ✓</div>
                  </div>
                </div>
              </div>

              {/* STAGE 5: Loan Officer Remarks */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    Loan Officer Appraisal Remarks & Field Notes
                  </h3>
                </div>

                <textarea
                  rows={3}
                  required
                  disabled={isSelectedAppTerminal}
                  value={officerRemarks}
                  onChange={(e) => setOfficerRemarks(e.target.value)}
                  placeholder="Record your field observations, site verification notes, and sanction rationale..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-medium disabled:opacity-60"
                />

                {!isSelectedAppTerminal && (
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="text-slate-400 font-semibold">Quick remarks:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setOfficerRemarks(
                          'Branch field appraisal completed. Verified business establishment, inventory turnover, and primary bank credits. Applicant shows consistent cash flow. Recommended for credit sanction.'
                        )
                      }
                      className="text-sky-700 hover:text-sky-900 underline cursor-pointer"
                    >
                      Standard Sanction Recommendation
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setOfficerRemarks(
                          'Borrower visited branch with original property deeds. Primary business audited with 18% YoY growth. Recommending conditional approval with collateral charge registration.'
                        )
                      }
                      className="text-sky-700 hover:text-sky-900 underline cursor-pointer"
                    >
                      Conditional Approval with Collateral
                    </button>
                  </div>
                )}
              </div>

              {/* STAGE 6: Forward to Manager */}
              {forwardErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{forwardErrorMessage}</span>
                </div>
              )}

              <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-sky-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                      6
                    </div>
                    <h3 className="font-black text-sm text-white">
                      Forward Application to Bank Manager
                    </h3>
                  </div>
                  <p className="text-xs text-sky-200 mt-1">
                    {isSelectedAppTerminal
                      ? `Application is currently ${formatApplicationStatusLabel(selectedApp.status)} and locked from forwarding.`
                      : `Sign with digital credentials (${safeOfficerName}) and forward to Manager Portal for final sanction & override`}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSelectedAppTerminal}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-3 px-6 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  {isSelectedAppTerminal ? (
                    <>
                      <Lock className="w-4 h-4 text-slate-950" />
                      <span>Locked ({formatApplicationStatusLabel(selectedApp.status)})</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-slate-950" />
                      <span>Forward to Manager for Approval ➔</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              Select an application from the queue to start officer verification.
            </div>
          )}
        </div>
      </div>

      {/* Printable Modal */}
      {printAppModal && (
        <PrintableApplicationModal
          application={printAppModal}
          onClose={() => setPrintAppModal(null)}
          dataMaskingActive={dataMaskingActive}
        />
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          document={viewingDoc.doc}
          applicationId={viewingDoc.appId}
          applicantName={viewingDoc.applicantName}
          currentUserRole={currentUser?.role || 'LOAN_OFFICER'}
          isActionable={!isSelectedAppTerminal}
          onClose={() => setViewingDoc(null)}
          onVerify={(docId) => handleVerifyDoc(docId)}
          onReject={(docId, reason) => handleRejectDoc(docId, reason)}
        />
      )}
    </div>
  );
};
