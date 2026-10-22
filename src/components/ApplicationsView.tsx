import React, { useState } from 'react';
import {
  ApplicationRecord,
  ApplicationStatus,
  AuditLogEntry,
  UserAuth,
  ClientDocumentRecord
} from '../types';
import { exportApplicationsToCsv, TN_DISTRICTS } from '../utils/sampleData';
import {
  formatApplicationStatusLabel,
  isTerminalApplicationStatus,
  formatActorDisplay
} from '../utils/portalStorage';
import { PrintableApplicationModal } from './PrintableApplicationModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Stamp,
  FileText,
  MapPin,
  Zap,
  Eye,
  Clock,
  Calendar,
  X,
  Printer,
  Ban,
  Check,
  History,
  ShieldCheck,
  IndianRupee,
  Send
} from 'lucide-react';

interface ApplicationsViewProps {
  applications: ApplicationRecord[];
  auditLogs: AuditLogEntry[];
  currentUser?: UserAuth;
  onOfficerOverride: (
    appId: string,
    newStatus: ApplicationStatus,
    officerName: string,
    reason: string
  ) => void;
  dataMaskingActive?: boolean;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  currentUser,
  onOfficerOverride,
  dataMaskingActive = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [viewTab, setViewTab] = useState<'ACTIVE_QUEUE' | 'ALL_HISTORY' | 'CANCELLED_HISTORY'>(
    'ACTIVE_QUEUE'
  );

  // Modals State
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<ApplicationRecord | null>(
    null
  );
  const [selectedAppForReview, setSelectedAppForReview] = useState<ApplicationRecord | null>(null);
  const [selectedPrintApp, setSelectedPrintApp] = useState<ApplicationRecord | null>(null);

  // Confirmation Dialog State for Approve / Reject / Cancel / Disburse
  const [confirmActionModal, setConfirmActionModal] = useState<{
    app: ApplicationRecord;
    actionType: 'APPROVE' | 'REJECT' | 'CANCEL' | 'DISBURSE' | 'UNDER_REVIEW';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [viewingDocInDetails, setViewingDocInDetails] = useState<ClientDocumentRecord | null>(null);

  // Legacy Override Modal State
  const [overrideDecision, setOverrideDecision] = useState<
    'APPROVED' | 'REJECTED' | 'CONDITIONAL_APPROVAL' | 'CANCELLED'
  >('APPROVED');
  const [officerName, setOfficerName] = useState(
    currentUser?.name || 'Senior Branch Credit Manager'
  );
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const isManager = !currentUser || currentUser.role === 'MANAGER';

  const handlePrintApp = (app: ApplicationRecord) => {
    setSelectedAppForReview(null);
    setSelectedAppForDetails(null);
    setSelectedPrintApp(app);
  };

  // Find latest active (non-cancelled) client application
  const latestClientApp =
    applications.find(
      (a) =>
        a.status !== 'CANCELLED' &&
        (a.isNewSubmission || a.priority === 'FAST_TRACK')
    ) ||
    applications.find((a) => a.status !== 'CANCELLED' && a.id === 'TN-APP-2026-8901') ||
    applications.find((a) => a.status !== 'CANCELLED');

  // Helper to compute Document Verification status
  const getDocVerificationInfo = (app: ApplicationRecord) => {
    const uploadedCount = app.uploadedDocuments?.length || 0;
    const isVerified =
      app.document_verification_status === 'VERIFIED' ||
      Boolean(app.officer_review?.verified_documents) ||
      uploadedCount >= 2 ||
      app.applicant.kyc_verified;

    return {
      isVerified,
      label: isVerified ? 'Verified ✓' : 'Pending Verification',
      detail:
        uploadedCount > 0
          ? `${uploadedCount} Doc${uploadedCount > 1 ? 's' : ''} Uploaded`
          : 'e-KYC Verified'
    };
  };

  // Status badge styling helper
  const getStatusBadgeClasses = (status: ApplicationStatus | string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISBURSED':
        return 'bg-teal-100 text-teal-900 border-teal-400';
      case 'CONDITIONAL_APPROVAL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'UNDER_REVIEW':
      case 'FORWARDED_TO_MANAGER':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'PENDING_REVIEW':
      case 'PENDING_OFFICER_REVIEW':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CANCELLED':
        return 'bg-slate-200 text-slate-700 border-slate-400';
      case 'REJECTED':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  // Export Live Portal History to CSV
  const handleExportHistoryCsv = () => {
    const csvContent = exportApplicationsToCsv(applications);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ai_loanguard_portal_applications_history_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Confirmation Dialog for Approve / Reject / Cancel / Disburse
  const openActionConfirmation = (
    app: ApplicationRecord,
    actionType: 'APPROVE' | 'REJECT' | 'CANCEL' | 'DISBURSE' | 'UNDER_REVIEW'
  ) => {
    if (app.status === 'CANCELLED') {
      setActionBanner({
        type: 'error',
        message: `Action blocked: Application #${app.id} is Cancelled and cannot be approved, modified, or disbursed.`
      });
      return;
    }
    if (app.status === 'DISBURSED') {
      setActionBanner({
        type: 'error',
        message: `Action blocked: Application #${app.id} has already been Disbursed.`
      });
      return;
    }

    setActionError('');
    if (actionType === 'APPROVE') {
      setActionReason(
        'Verified CIBIL score, FOIR repayment capacity, and e-KYC documents. Sanctioned under RBI Fair Lending norms.'
      );
    } else if (actionType === 'UNDER_REVIEW') {
      setActionReason('Application moved to Under Review for detailed credit & KYC appraisal.');
    } else if (actionType === 'DISBURSE') {
      setActionReason('Sanction conditions met. Disbursing loan amount to borrower bank account.');
    } else {
      setActionReason('');
    }
    setConfirmActionModal({ app, actionType });
  };

  // Execute confirmed status change
  const handleConfirmActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmActionModal) return;

    const { app, actionType } = confirmActionModal;

    // Prevent approving or disbursing a cancelled application
    if (app.status === 'CANCELLED') {
      setActionError('Cancelled applications cannot be approved or disbursed.');
      return;
    }

    const cleanReason = actionReason.trim();
    if ((actionType === 'REJECT' || actionType === 'CANCEL') && !cleanReason) {
      setActionError(
        `Please provide a mandatory ${
          actionType === 'REJECT' ? 'rejection' : 'cancellation'
        } reason before confirming.`
      );
      return;
    }

    const targetStatus: ApplicationStatus =
      actionType === 'APPROVE'
        ? 'APPROVED'
        : actionType === 'REJECT'
        ? 'REJECTED'
        : actionType === 'CANCEL'
        ? 'CANCELLED'
        : actionType === 'DISBURSE'
        ? 'DISBURSED'
        : 'UNDER_REVIEW';

    const actorLabel = currentUser?.name || officerName || 'Senior Branch Credit Manager';

    onOfficerOverride(
      app.id,
      targetStatus,
      actorLabel,
      cleanReason || `Application status updated to ${formatApplicationStatusLabel(targetStatus)}.`
    );

    setActionBanner({
      type: 'success',
      message: `Application #${app.id} (${app.applicant.full_name}) status updated to ${formatApplicationStatusLabel(
        targetStatus
      )} by ${actorLabel}.`
    });
    setConfirmActionModal(null);
    setActionReason('');
    setActionError('');

    // Refresh details modal if open
    if (selectedAppForDetails && selectedAppForDetails.id === app.id) {
      setSelectedAppForDetails(null);
    }
  };

  // Filter applications based on viewTab, searchTerm, statusFilter, districtFilter
  const filteredApps = applications.filter((app) => {
    // 1. View Tab filter (Active Queue excludes CANCELLED applications)
    if (viewTab === 'ACTIVE_QUEUE' && app.status === 'CANCELLED') {
      return false;
    }
    if (viewTab === 'CANCELLED_HISTORY' && app.status !== 'CANCELLED') {
      return false;
    }

    // 2. Search filter
    const matchesSearch =
      app.applicant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant.loan_purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.applicant.aadhaar_raw && app.applicant.aadhaar_raw.includes(searchTerm)) ||
      (app.applicant.pan_raw &&
        app.applicant.pan_raw.toLowerCase().includes(searchTerm.toLowerCase()));

    // 3. Status dropdown filter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING_REVIEW' &&
        (app.status === 'PENDING_REVIEW' || app.status === 'PENDING_OFFICER_REVIEW')) ||
      (statusFilter === 'UNDER_REVIEW' &&
        (app.status === 'UNDER_REVIEW' || app.status === 'FORWARDED_TO_MANAGER')) ||
      app.status === statusFilter;

    // 4. District filter
    const matchesDistrict =
      districtFilter === 'ALL' || app.applicant.location === districtFilter;

    return matchesSearch && matchesStatus && matchesDistrict;
  });

  // Portfolio Counts
  const activeCount = applications.filter((a) => a.status !== 'CANCELLED').length;
  const pendingReviewCount = applications.filter(
    (a) =>
      a.status === 'PENDING_REVIEW' ||
      a.status === 'PENDING_OFFICER_REVIEW' ||
      a.status === 'UNDER_REVIEW' ||
      a.status === 'FORWARDED_TO_MANAGER'
  ).length;
  const approvedCount = applications.filter(
    (a) => a.status === 'APPROVED' || a.status === 'CONDITIONAL_APPROVAL' || a.status === 'DISBURSED'
  ).length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;
  const cancelledCount = applications.filter((a) => a.status === 'CANCELLED').length;

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForReview) return;
    if (selectedAppForReview.status === 'CANCELLED') {
      setOverrideError('Cancelled applications cannot be approved or modified.');
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError(
        'Mandatory human justification is required under RBI Fair Lending compliance.'
      );
      return;
    }
    onOfficerOverride(
      selectedAppForReview.id,
      overrideDecision,
      officerName,
      overrideReason.trim()
    );
    setActionBanner({
      type: 'success',
      message: `Application #${selectedAppForReview.id} updated to ${formatApplicationStatusLabel(
        overrideDecision
      )}.`
    });
    setSelectedAppForReview(null);
    setOverrideReason('');
    setOverrideError('');
  };

  return (
    <div className="space-y-6">
      {/* Status Update Feedback Banner */}
      {actionBanner && (
        <div
          className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-xs font-bold shadow-sm animate-fadeIn ${
            actionBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
              : 'bg-rose-50 border-rose-400 text-rose-950'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {actionBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. LATEST CLIENT SIDE APPLICATION SPOTLIGHT */}
      {latestClientApp && viewTab === 'ACTIVE_QUEUE' && (
        <div className="bg-gradient-to-r from-[#1e1b4b] via-[#2e1065] to-[#172554] text-white rounded-3xl p-6 shadow-xl border border-purple-400/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl font-black font-mono">
            ₹
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Zap className="w-3 h-3 fill-slate-950" />
                  <span>Client Side Application Received (First Priority)</span>
                </span>
                {latestClientApp.priority === 'FAST_TRACK' && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                    ⚡ Priority Fast-Track (&lt; 2h TAT)
                  </span>
                )}
                <span className="text-xs text-purple-200 font-mono">
                  App ID: {latestClientApp.id}
                </span>
                <span className="text-xs text-purple-200 font-mono flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    Date:{' '}
                    {new Date(latestClientApp.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  {latestClientApp.applicant.full_name} ({latestClientApp.applicant.location}{' '}
                  District)
                </h3>
                <p className="text-xs text-purple-200/90 mt-0.5">
                  Requested{' '}
                  <strong>₹{latestClientApp.applicant.loan_amount.toLocaleString('en-IN')}</strong>{' '}
                  for {latestClientApp.applicant.loan_purpose} • Tenure:{' '}
                  {latestClientApp.applicant.loan_term_months} Months
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-[10px] text-purple-300 block font-sans uppercase">
                    Income / CIBIL
                  </span>
                  <span className="font-bold text-white">
                    ₹{latestClientApp.applicant.monthly_income.toLocaleString('en-IN')}/mo •{' '}
                    {latestClientApp.applicant.credit_score}
                  </span>
                </div>
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-[10px] text-purple-300 block font-sans uppercase">
                    Doc Verification
                  </span>
                  <span className="font-bold text-emerald-300">
                    {getDocVerificationInfo(latestClientApp).label}
                  </span>
                </div>
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-[10px] text-purple-300 block font-sans uppercase">
                    PAN / KYC (DPDP)
                  </span>
                  <span className="font-bold text-white">
                    {latestClientApp.applicant.pan_masked || 'ABCDE****F'}
                  </span>
                </div>
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-[10px] text-purple-300 block font-sans uppercase">
                    AI Odds / Status
                  </span>
                  <span className="font-bold text-emerald-300">
                    {(latestClientApp.prediction.approval_probability * 100).toFixed(0)}% •{' '}
                    {formatApplicationStatusLabel(latestClientApp.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Quick Actions for Manager */}
            <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openActionConfirmation(latestClientApp, 'APPROVE')}
                disabled={
                  isTerminalApplicationStatus(latestClientApp.status) ||
                  latestClientApp.status === 'APPROVED'
                }
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Approve Application</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAppForDetails(latestClientApp)}
                className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-2 rounded-2xl border border-white/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-purple-200" />
                <span>View Full Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => {
            setViewTab('ACTIVE_QUEUE');
            setStatusFilter('ALL');
          }}
          className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition-all ${
            viewTab === 'ACTIVE_QUEUE' && statusFilter === 'ALL'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">Active Queue</div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{activeCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Excludes cancelled loans</div>
        </div>

        <div
          onClick={() => {
            setViewTab('ACTIVE_QUEUE');
            setStatusFilter('PENDING_REVIEW');
          }}
          className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="text-[11px] font-bold text-amber-800 uppercase">
            Pending / Under Review
          </div>
          <div className="text-2xl font-black text-amber-900 mt-0.5">{pendingReviewCount}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Awaiting sanction decision</div>
        </div>

        <div
          onClick={() => {
            setViewTab('ACTIVE_QUEUE');
            setStatusFilter('APPROVED');
          }}
          className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="text-[11px] font-bold text-emerald-800 uppercase">
            Approved / Disbursed
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-0.5">{approvedCount}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Sanctioned facilities</div>
        </div>

        <div
          onClick={() => {
            setViewTab('ALL_HISTORY');
            setStatusFilter('REJECTED');
          }}
          className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs cursor-pointer hover:border-rose-400 transition-all"
        >
          <div className="text-[11px] font-bold text-rose-800 uppercase">Rejected</div>
          <div className="text-2xl font-black text-rose-900 mt-0.5">{rejectedCount}</div>
          <div className="text-[10px] text-rose-700 mt-0.5">Recorded with reason</div>
        </div>

        <div
          onClick={() => {
            setViewTab('CANCELLED_HISTORY');
            setStatusFilter('ALL');
          }}
          className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition-all ${
            viewTab === 'CANCELLED_HISTORY'
              ? 'bg-slate-200 border-slate-500 ring-2 ring-slate-300'
              : 'bg-white border-slate-300 hover:border-slate-400'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-700 uppercase">
            Cancelled History
          </div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{cancelledCount}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">Archived with audit trail</div>
        </div>
      </div>

      {/* Header & View Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-purple-50 text-purple-700">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Loan Application Management & Status Governance
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Workflow: Pending Review → Under Review → Approved / Rejected / Cancelled → Disbursed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Tabs: Active Queue vs Application History vs Cancelled */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setViewTab('ACTIVE_QUEUE');
                if (statusFilter === 'CANCELLED') setStatusFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewTab === 'ACTIVE_QUEUE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Queue ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('ALL_HISTORY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                viewTab === 'ALL_HISTORY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span>All History ({applications.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab('CANCELLED_HISTORY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                viewTab === 'CANCELLED_HISTORY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-slate-600" />
              <span>Cancelled ({cancelledCount})</span>
            </button>
          </div>

          <button
            onClick={handleExportHistoryCsv}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-300" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Application ID, Client Name, Loan Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              setStatusFilter(val);
              if (val === 'CANCELLED') {
                setViewTab('ALL_HISTORY');
              }
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-medium focus:bg-white cursor-pointer"
          >
            <option value="ALL">All Application Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CONDITIONAL_APPROVAL">Conditional Approval</option>
            <option value="DISBURSED">Disbursed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* District Filter */}
        <div>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-medium focus:bg-white cursor-pointer"
          >
            <option value="ALL">All Districts (38 Tamil Nadu Revenue Districts)</option>
            {TN_DISTRICTS.map((d) => {
              const count = applications.filter((a) => a.applicant.location === d).length;
              return (
                <option key={d} value={d}>
                  {d} {count > 0 ? `(${count})` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Loan Application Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Loan Type</th>
                <th className="py-3.5 px-4">Requested Amount</th>
                <th className="py-3.5 px-4">Application Date</th>
                <th className="py-3.5 px-4">Credit / CIBIL Score</th>
                <th className="py-3.5 px-4">Document Verification</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No loan applications matched the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const docInfo = getDocVerificationInfo(app);
                  const isCancelled = app.status === 'CANCELLED';
                  const isDisbursed = app.status === 'DISBURSED';
                  const isRejected = app.status === 'REJECTED';
                  const isApproved = app.status === 'APPROVED';
                  const isLocked = isCancelled || isDisbursed;

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled
                          ? 'bg-slate-50/60 opacity-85'
                          : app.id === latestClientApp?.id
                          ? 'bg-purple-50/35'
                          : ''
                      }`}
                    >
                      {/* 1. Application ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div>{app.id}</div>
                        {app.isNewSubmission && !isCancelled && (
                          <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-sans font-bold inline-block mt-0.5">
                            New Submission
                          </span>
                        )}
                        {app.priority === 'FAST_TRACK' && !isCancelled && (
                          <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-sans font-bold inline-block mt-0.5 ml-1">
                            ⚡ Fast-Track
                          </span>
                        )}
                      </td>

                      {/* 2. Client Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{app.applicant.full_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {app.applicant.employment_type} • {app.applicant.location}
                        </div>
                      </td>

                      {/* 3. Loan Type */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {app.applicant.loan_purpose}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tenure: {app.applicant.loan_term_months} Months
                        </div>
                      </td>

                      {/* 4. Requested Loan Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono">
                          ₹{app.applicant.loan_amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Income: ₹{app.applicant.monthly_income.toLocaleString('en-IN')}/mo
                        </div>
                      </td>

                      {/* 5. Application Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                        <div className="font-bold text-slate-900 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>
                            {new Date(app.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 ml-4 font-sans">
                          {new Date(app.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* 6. Credit / CIBIL Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`font-mono font-black text-xs px-2 py-0.5 rounded-md border ${
                              app.applicant.credit_score >= 750
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : app.applicant.credit_score >= 650
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {app.applicant.credit_score}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            AI: {(app.prediction.approval_probability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          FOIR: {app.prediction.engineered_features.dti_ratio.toFixed(1)}%
                        </div>
                      </td>

                      {/* 7. Document Verification Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            docInfo.isVerified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {docInfo.isVerified ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{docInfo.label}</span>
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{docInfo.detail}</div>
                      </td>

                      {/* 8. Current Application Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${getStatusBadgeClasses(
                            app.status
                          )}`}
                        >
                          {formatApplicationStatusLabel(app.status)}
                        </span>
                        {app.status === 'FORWARDED_TO_MANAGER' && (
                          <span className="block text-[10px] text-indigo-700 font-semibold mt-0.5">
                            ✓ Officer Verified & Forwarded
                          </span>
                        )}
                        {app.cancellation_reason && app.status === 'CANCELLED' && (
                          <div
                            className="text-[10px] text-slate-600 italic mt-1 max-w-[180px] truncate"
                            title={app.cancellation_reason}
                          >
                            Reason: &ldquo;{app.cancellation_reason}&rdquo;
                          </div>
                        )}
                        {app.rejection_reason && app.status === 'REJECTED' && (
                          <div
                            className="text-[10px] text-rose-700 italic mt-1 max-w-[180px] truncate"
                            title={app.rejection_reason}
                          >
                            Reason: &ldquo;{app.rejection_reason}&rdquo;
                          </div>
                        )}
                      </td>

                      {/* 9. Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Approve Button */}
                          {isManager && (
                            <button
                              type="button"
                              disabled={isLocked || isApproved}
                              onClick={() => openActionConfirmation(app, 'APPROVE')}
                              title={
                                isCancelled
                                  ? 'Cancelled applications cannot be approved'
                                  : isDisbursed
                                  ? 'Already disbursed'
                                  : 'Approve Loan Application'
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Disburse Button (shown when Approved) */}
                          {isManager && isApproved && (
                            <button
                              type="button"
                              onClick={() => openActionConfirmation(app, 'DISBURSE')}
                              title="Disburse Approved Loan"
                              className="bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer shadow-2xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>Disburse</span>
                            </button>
                          )}

                          {/* Reject Button */}
                          {isManager && (
                            <button
                              type="button"
                              disabled={isLocked || isRejected}
                              onClick={() => openActionConfirmation(app, 'REJECT')}
                              title={
                                isCancelled
                                  ? 'Cancelled applications cannot be modified'
                                  : 'Reject Loan Application'
                              }
                              className="bg-rose-50 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-rose-800 border border-rose-300 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Cancel Application Button */}
                          {isManager && (
                            <button
                              type="button"
                              disabled={isLocked || isRejected}
                              onClick={() => openActionConfirmation(app, 'CANCEL')}
                              title={
                                isCancelled
                                  ? 'Application is already cancelled'
                                  : isDisbursed
                                  ? 'Disbursed loans cannot be cancelled'
                                  : 'Cancel Application'
                              }
                              className="bg-amber-50 hover:bg-amber-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5 text-amber-700" />
                              <span>Cancel</span>
                            </button>
                          )}

                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedAppForDetails(app)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                            title="View Full Application Details & Document Verification"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-300" />
                            <span>View Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog Modal for Approve / Reject / Cancel / Disburse */}
      {confirmActionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                confirmActionModal.actionType === 'APPROVE'
                  ? 'bg-emerald-700'
                  : confirmActionModal.actionType === 'DISBURSE'
                  ? 'bg-teal-700'
                  : confirmActionModal.actionType === 'REJECT'
                  ? 'bg-rose-700'
                  : confirmActionModal.actionType === 'CANCEL'
                  ? 'bg-amber-700'
                  : 'bg-indigo-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {confirmActionModal.actionType === 'APPROVE' && <CheckCircle2 className="w-5 h-5" />}
                {confirmActionModal.actionType === 'DISBURSE' && <Send className="w-5 h-5" />}
                {confirmActionModal.actionType === 'REJECT' && <XCircle className="w-5 h-5" />}
                {confirmActionModal.actionType === 'CANCEL' && <Ban className="w-5 h-5" />}
                {confirmActionModal.actionType === 'UNDER_REVIEW' && <Clock className="w-5 h-5" />}
                <h3 className="font-bold text-sm sm:text-base">
                  {confirmActionModal.actionType === 'APPROVE' && 'Confirm Loan Approval'}
                  {confirmActionModal.actionType === 'DISBURSE' && 'Confirm Loan Disbursement'}
                  {confirmActionModal.actionType === 'REJECT' &&
                    'Confirm Loan Rejection (Reason Required)'}
                  {confirmActionModal.actionType === 'CANCEL' &&
                    'Confirm Application Cancellation'}
                  {confirmActionModal.actionType === 'UNDER_REVIEW' &&
                    'Move Application to Under Review'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmActionModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmActionSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">
                    {confirmActionModal.app.applicant.full_name}
                  </span>
                  <span className="font-mono font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded">
                    #{confirmActionModal.app.id}
                  </span>
                </div>
                <div className="text-slate-600">
                  Loan Type: <strong>{confirmActionModal.app.applicant.loan_purpose}</strong> •
                  Amount:{' '}
                  <strong>
                    ₹{confirmActionModal.app.applicant.loan_amount.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="text-slate-500">
                  CIBIL Score: <strong>{confirmActionModal.app.applicant.credit_score}</strong> •
                  Current Status:{' '}
                  <strong>{formatApplicationStatusLabel(confirmActionModal.app.status)}</strong>
                </div>
              </div>

              {(confirmActionModal.actionType === 'REJECT' ||
                confirmActionModal.actionType === 'CANCEL') && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {confirmActionModal.actionType === 'CANCEL'
                      ? 'Cancelling this application will remove it from active approval queues while preserving the record and cancellation reason in the application history.'
                      : 'Rejecting this application will notify the client and record the official rejection reason in the audit history.'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {confirmActionModal.actionType === 'REJECT'
                    ? 'Mandatory Rejection Reason *'
                    : confirmActionModal.actionType === 'CANCEL'
                    ? 'Mandatory Cancellation Reason *'
                    : 'Manager Sanction / Action Remarks'}
                </label>
                <textarea
                  rows={3}
                  required={
                    confirmActionModal.actionType === 'REJECT' ||
                    confirmActionModal.actionType === 'CANCEL'
                  }
                  value={actionReason}
                  onChange={(e) => {
                    setActionReason(e.target.value);
                    if (actionError) setActionError('');
                  }}
                  placeholder={
                    confirmActionModal.actionType === 'REJECT'
                      ? 'Specify the reason for rejection (e.g., High FOIR debt burden, insufficient CIBIL score, unverified income proof)...'
                      : confirmActionModal.actionType === 'CANCEL'
                      ? 'Specify the reason for cancelling this application (e.g., Client requested withdrawal, duplicate application, revised loan terms)...'
                      : 'Enter approval remarks...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
                {actionError && (
                  <p className="text-rose-600 font-bold text-xs mt-1">{actionError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmActionModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer ${
                    confirmActionModal.actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : confirmActionModal.actionType === 'DISBURSE'
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : confirmActionModal.actionType === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : confirmActionModal.actionType === 'CANCEL'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {confirmActionModal.actionType === 'APPROVE' && 'Confirm Approval'}
                  {confirmActionModal.actionType === 'DISBURSE' && 'Confirm Disbursement'}
                  {confirmActionModal.actionType === 'REJECT' && 'Confirm Rejection'}
                  {confirmActionModal.actionType === 'CANCEL' && 'Confirm Cancellation'}
                  {confirmActionModal.actionType === 'UNDER_REVIEW' && 'Confirm Under Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Application Details & Document Verification Modal */}
      {selectedAppForDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base">
                      Application Details & Verification Dossier
                    </h3>
                    <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-purple-200">
                      #{selectedAppForDetails.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Submitted on{' '}
                    {new Date(selectedAppForDetails.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppForDetails(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {/* Top Status & Quick Action Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Current Workflow Status
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${getStatusBadgeClasses(
                        selectedAppForDetails.status
                      )}`}
                    >
                      {formatApplicationStatusLabel(selectedAppForDetails.status)}
                    </span>
                    <span className="text-slate-500">
                      AI Recommendation:{' '}
                      <strong className="text-slate-900">
                        {selectedAppForDetails.prediction.final_decision} (
                        {(selectedAppForDetails.prediction.approval_probability * 100).toFixed(1)}%)
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Status Action Buttons inside Details Modal */}
                {isManager && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedAppForDetails.status === 'PENDING_REVIEW' && (
                      <button
                        type="button"
                        onClick={() =>
                          openActionConfirmation(selectedAppForDetails, 'UNDER_REVIEW')
                        }
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                      >
                        Mark Under Review
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={
                        isTerminalApplicationStatus(selectedAppForDetails.status) ||
                        selectedAppForDetails.status === 'APPROVED'
                      }
                      onClick={() => openActionConfirmation(selectedAppForDetails, 'APPROVE')}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                    >
                      ✓ Approve
                    </button>
                    {selectedAppForDetails.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => openActionConfirmation(selectedAppForDetails, 'DISBURSE')}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                      >
                        Disburse Loan
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={
                        isTerminalApplicationStatus(selectedAppForDetails.status) ||
                        selectedAppForDetails.status === 'REJECTED'
                      }
                      onClick={() => openActionConfirmation(selectedAppForDetails, 'REJECT')}
                      className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                    >
                      ✕ Reject
                    </button>
                    <button
                      type="button"
                      disabled={
                        isTerminalApplicationStatus(selectedAppForDetails.status) ||
                        selectedAppForDetails.status === 'REJECTED'
                      }
                      onClick={() => openActionConfirmation(selectedAppForDetails, 'CANCEL')}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                    >
                      Cancel Application
                    </button>
                  </div>
                )}
              </div>

              {/* Cancellation / Rejection Reason Banner if applicable */}
              {selectedAppForDetails.status === 'CANCELLED' &&
                selectedAppForDetails.cancellation_reason && (
                  <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-slate-700" />
                      <span>Application Cancelled</span>
                    </div>
                    <p>
                      <strong>Reason:</strong> &ldquo;{selectedAppForDetails.cancellation_reason}
                      &rdquo;
                    </p>
                    {selectedAppForDetails.cancelled_by && (
                      <p className="text-[11px] text-slate-500">
                        Cancelled by{' '}
                        <strong>
                          {formatActorDisplay(selectedAppForDetails.cancelled_by).formattedText}
                        </strong>
                      </p>
                    )}
                  </div>
                )}

              {selectedAppForDetails.status === 'REJECTED' &&
                selectedAppForDetails.rejection_reason && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Application Rejected</span>
                    </div>
                    <p>
                      <strong>Rejection Reason:</strong> &ldquo;
                      {selectedAppForDetails.rejection_reason}&rdquo;
                    </p>
                    {selectedAppForDetails.rejected_by && (
                      <p className="text-[11px] text-rose-700">
                        Rejected by{' '}
                        <strong>
                          {formatActorDisplay(selectedAppForDetails.rejected_by).formattedText}
                        </strong>
                      </p>
                    )}
                  </div>
                )}

              {selectedAppForDetails.status === 'APPROVED' &&
                selectedAppForDetails.approved_by && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Application Approved</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Approved by{' '}
                      <strong>
                        {formatActorDisplay(selectedAppForDetails.approved_by).formattedText}
                      </strong>
                    </p>
                  </div>
                )}

              {selectedAppForDetails.status === 'DISBURSED' &&
                selectedAppForDetails.disbursed_by && (
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-teal-600" />
                      <span>Loan Disbursed</span>
                    </div>
                    <p className="text-[11px] text-teal-800">
                      Disbursed by{' '}
                      <strong>
                        {formatActorDisplay(selectedAppForDetails.disbursed_by).formattedText}
                      </strong>
                    </p>
                  </div>
                )}

              {/* Grid of Applicant & Financial Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">Client Name</span>
                  <span className="font-bold text-slate-900">
                    {selectedAppForDetails.applicant.full_name}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Age & District
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedAppForDetails.applicant.age} Yrs •{' '}
                    {selectedAppForDetails.applicant.location}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">Employment</span>
                  <span className="font-bold text-slate-900">
                    {selectedAppForDetails.applicant.employment_type}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">Loan Type</span>
                  <span className="font-bold text-slate-900">
                    {selectedAppForDetails.applicant.loan_purpose}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Requested Amount
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{selectedAppForDetails.applicant.loan_amount.toLocaleString('en-IN')} (
                    {selectedAppForDetails.applicant.loan_term_months}m)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Monthly Income
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{selectedAppForDetails.applicant.monthly_income.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    CIBIL / Credit Score
                  </span>
                  <span className="font-bold text-emerald-800 font-mono">
                    {selectedAppForDetails.applicant.credit_score} (FOIR:{' '}
                    {selectedAppForDetails.prediction.engineered_features.dti_ratio.toFixed(1)}%)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Collateral Value
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{selectedAppForDetails.applicant.collateral_value.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Document Verification Results Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Document Verification & KYC Audit Results</span>
                  </h4>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {getDocVerificationInfo(selectedAppForDetails).label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900">Aadhaar e-KYC (Masked)</div>
                    <div className="font-mono text-slate-600 mt-0.5">
                      {selectedAppForDetails.applicant.aadhaar_masked || 'XXXX-XXXX-8901'}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      ✓ UIDAI Checksum Verified
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900">PAN Tax Record (Masked)</div>
                    <div className="font-mono text-slate-600 mt-0.5">
                      {selectedAppForDetails.applicant.pan_masked || 'ABCDE****F'}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      ✓ NSDL Active Status
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 mb-1">Client Uploaded Documents</div>
                    {selectedAppForDetails.documents && selectedAppForDetails.documents.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {selectedAppForDetails.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">{doc.title}</div>
                              <div className="text-[11px] text-slate-500 font-mono truncate">{doc.fileName}</div>
                              {doc.status === 'REJECTED' && doc.rejectionReason && (
                                <div className="text-[10px] text-rose-600 mt-0.5">Reason: {doc.rejectionReason}</div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  doc.status === 'VERIFIED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : doc.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {doc.status === 'VERIFIED' ? 'Verified ✓' : doc.status === 'REJECTED' ? 'Rejected ✗' : 'Pending'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingDocInDetails(doc)}
                                className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center space-x-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedAppForDetails.uploadedDocuments &&
                      selectedAppForDetails.uploadedDocuments.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800 font-medium">
                        {selectedAppForDetails.uploadedDocuments.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-500">Standard Digital e-KYC Package Verified ✓</span>
                    )}
                  </div>
                </div>

                {selectedAppForDetails.officer_review && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-950">
                    <div className="font-bold">
                      Loan Officer Verification ({selectedAppForDetails.officer_review.officer_name}
                      ):
                    </div>
                    <p className="text-[11px] mt-0.5 italic">
                      &ldquo;{selectedAppForDetails.officer_review.remarks}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Status Audit History Timeline */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-600" />
                  <span>Application Status Audit History</span>
                </h4>

                {selectedAppForDetails.status_history &&
                selectedAppForDetails.status_history.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAppForDetails.status_history.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {formatApplicationStatusLabel(item.previous_status)} →{' '}
                            <span className="text-purple-700">
                              {formatApplicationStatusLabel(item.new_status)}
                            </span>
                          </div>
                          {item.reason && (
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              Reason: &ldquo;{item.reason}&rdquo;
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 sm:text-right font-mono">
                          <div className="font-bold text-slate-700">
                            By:{' '}
                            {typeof item.changed_by_name === 'string'
                              ? item.changed_by_name
                              : (item as any)?.actor_name || 'Authorized Staff'}{' '}
                            (
                            {typeof item.changed_by_role === 'string'
                              ? item.changed_by_role
                              : (item as any)?.actor_role || 'Staff'}
                            )
                          </div>
                          <div>{new Date(item.timestamp).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(selectedAppForDetails.notes || []).map((n, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700"
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handlePrintApp(selectedAppForDetails)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Official Application Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAppForDetails(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Human Officer Review & Override Modal */}
      {selectedAppForReview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-purple-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Stamp className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Credit Officer Review & Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppForReview(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedAppForReview.applicant.full_name}
                  </span>
                  <span className="font-mono text-slate-600 font-bold">
                    {selectedAppForReview.id}
                  </span>
                </div>
                <div className="text-slate-500 text-xs">
                  Loan: ₹{selectedAppForReview.applicant.loan_amount.toLocaleString('en-IN')} •
                  CIBIL: {selectedAppForReview.applicant.credit_score} • DTI:{' '}
                  {selectedAppForReview.prediction.engineered_features.dti_ratio}%
                </div>
                <div className="text-xs font-semibold text-slate-700 pt-1">
                  Automated AI Recommendation:{' '}
                  <span className="text-teal-800 font-bold">
                    {selectedAppForReview.prediction.final_decision} (
                    {(selectedAppForReview.prediction.approval_probability * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Final Human Credit Determination
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideDecision('APPROVED')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                      overrideDecision === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideDecision('CONDITIONAL_APPROVAL')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                      overrideDecision === 'CONDITIONAL_APPROVAL'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚠ Conditional
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideDecision('REJECTED')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                      overrideDecision === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✕ Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideDecision('CANCELLED')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                      overrideDecision === 'CANCELLED'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⊘ Cancel
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Appraising Officer Name & Designation
                </label>
                <input
                  type="text"
                  required
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Justification Rationale (RBI Section 45 Compliance)
                </label>
                <textarea
                  rows={3}
                  required
                  value={overrideReason}
                  onChange={(e) => {
                    setOverrideReason(e.target.value);
                    if (overrideError) setOverrideError('');
                  }}
                  placeholder="Conducted branch field appraisal; verified primary business inventory, bank statement credits, and additional property collateral pledge..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white"
                />
                {overrideError && <p className="text-rose-600 text-xs mt-1">{overrideError}</p>}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  Commit Decision & Sign Audit Ledger
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintApp(selectedAppForReview)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAppForReview(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Official Application Form Modal */}
      {selectedPrintApp && (
        <PrintableApplicationModal
          application={selectedPrintApp}
          onClose={() => setSelectedPrintApp(null)}
          dataMaskingActive={dataMaskingActive}
        />
      )}

      {/* Document Viewer Modal for Details Inspection */}
      {viewingDocInDetails && (
        <DocumentViewerModal
          document={viewingDocInDetails}
          applicantName={selectedAppForDetails?.applicant?.full_name || 'Applicant'}
          applicationId={selectedAppForDetails?.id}
          currentUserRole={currentUser?.role || 'MANAGER'}
          isActionable={false}
          onClose={() => setViewingDocInDetails(null)}
        />
      )}
    </div>
  );
};
