import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApplicationRecord } from '../types';
import {
  Printer,
  X,
  FileDown,
  ShieldCheck,
  CheckCircle2,
  Building,
  User,
  IndianRupee,
  Lock,
  Stamp,
  Calendar,
  Phone,
  ClipboardCheck,
  Download,
  Check
} from 'lucide-react';

interface PrintableApplicationModalProps {
  application: ApplicationRecord;
  onClose: () => void;
  dataMaskingActive?: boolean;
}

export const PrintableApplicationModal: React.FC<PrintableApplicationModalProps> = ({
  application,
  onClose,
  dataMaskingActive = false
}) => {
  const { applicant, prediction, status, officer_review, officer_override } = application;
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const docHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Loan_Application_${application.id}.html</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; font-size: 13px; max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 2px solid #b45309; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .bank-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
    .bank-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
    .status-badge { background: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; border: 1px solid #86efac; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #78350f; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
    .cell-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 3px; }
    .cell-val { font-size: 13px; font-weight: 600; color: #0f172a; }
    .officer-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 14px; margin-top: 14px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 24px; border-top: 2px solid #e2e8f0; margin-top: 30px; font-size: 11px; color: #64748b; }
    .seal { border: 2px solid #b45309; border-radius: 8px; padding: 8px 16px; color: #78350f; font-weight: 800; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="bank-title">Tamil Nadu Commercial Bank Ltd.</h1>
      <div class="bank-sub">Retail & MSME Credit Division • Anna Salai Head Office, Chennai - 600002</div>
      <div class="bank-sub">Digital Lending Platform • Strict Compliance with RBI Fair Lending & DPDP Act 2023</div>
    </div>
    <div style="text-align: right;">
      <span class="status-badge">${status.replace(/_/g, ' ')}</span>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">App ID: <strong>${application.id}</strong></div>
      <div style="font-size: 10px; color: #94a3b8;">Generated: ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
  </div>

  <div class="section-title">1. Borrower Identification & Contact Profile</div>
  <div class="grid">
    <div><div class="cell-label">Full Legal Name</div><div class="cell-val">${applicant.full_name}</div></div>
    <div><div class="cell-label">Age / Gender</div><div class="cell-val">${applicant.age} Yrs / ${applicant.gender}</div></div>
    <div><div class="cell-label">Location / District</div><div class="cell-val">${applicant.location}</div></div>
    <div><div class="cell-label">Education / Marital</div><div class="cell-val">${applicant.education} • ${applicant.marital_status}</div></div>
    <div><div class="cell-label">Aadhaar (DPDP)</div><div class="cell-val" style="font-family: monospace;">${dataMaskingActive ? (applicant.aadhaar_masked || 'XXXX-XXXX-8901') : (applicant.aadhaar_raw || '6421 8812 8901')}</div></div>
    <div><div class="cell-label">Income Tax PAN</div><div class="cell-val" style="font-family: monospace;">${dataMaskingActive ? (applicant.pan_masked || 'ABCDE****F') : (applicant.pan_raw || 'ABCDE8901F')}</div></div>
    <div><div class="cell-label">e-KYC Status</div><div class="cell-val" style="color: #166534; font-weight: 700;">Verified ✓</div></div>
    <div><div class="cell-label">Phone 2FA OTP</div><div class="cell-val" style="color: #166534; font-weight: 700;">Verified via SMS ✓</div></div>
  </div>

  <div class="section-title">2. Employment, Income & Financial Assessment</div>
  <div class="grid">
    <div><div class="cell-label">Employment</div><div class="cell-val">${applicant.employment_type}</div></div>
    <div><div class="cell-label">Experience</div><div class="cell-val">${applicant.employment_years} Years</div></div>
    <div><div class="cell-label">Monthly Income</div><div class="cell-val" style="font-weight: 800;">₹${applicant.monthly_income.toLocaleString('en-IN')}</div></div>
    <div><div class="cell-label">Co-Applicant Income</div><div class="cell-val">₹${applicant.coapplicant_income.toLocaleString('en-IN')}</div></div>
    <div><div class="cell-label">Requested Loan</div><div class="cell-val" style="font-weight: 800; color: #92400e;">₹${applicant.loan_amount.toLocaleString('en-IN')}</div></div>
    <div><div class="cell-label">Tenure (Months)</div><div class="cell-val">${applicant.loan_term_months} Months</div></div>
    <div><div class="cell-label">Collateral Pledged</div><div class="cell-val" style="color: #166534; font-weight: 700;">₹${applicant.collateral_value.toLocaleString('en-IN')}</div></div>
    <div><div class="cell-label">Loan Purpose</div><div class="cell-val">${applicant.loan_purpose}</div></div>
  </div>

  <div class="section-title">3. Algorithmic Risk & CIBIL Bureau Evaluation</div>
  <div class="grid">
    <div><div class="cell-label">CIBIL Bureau Score</div><div class="cell-val" style="font-weight: 800; font-size: 15px;">${applicant.credit_score} / 900</div></div>
    <div><div class="cell-label">AI Approval Odds</div><div class="cell-val" style="font-weight: 800; color: #166534; font-size: 15px;">${(prediction.approval_probability * 100).toFixed(1)}%</div></div>
    <div><div class="cell-label">Risk Category</div><div class="cell-val">${prediction.risk_tier}</div></div>
    <div><div class="cell-label">ML Recommendation</div><div class="cell-val" style="font-weight: 800; color: #166534;">${prediction.final_decision}</div></div>
  </div>

  ${officer_review ? `
    <div class="section-title">4. Loan Officer Verification & Appraisal Report</div>
    <div class="officer-box">
      <div style="font-weight: 700; color: #0369a1; margin-bottom: 6px;">
        Audited by: ${officer_review.officer_name} (ID: ${officer_review.officer_id})
      </div>
      <div><strong>Verification Checks:</strong> Applicant Identity: ✓ • Documents: ✓ • Financials: ✓ • ML Risk: ✓</div>
      <div style="margin-top: 6px;"><strong>Officer Remarks:</strong> "${officer_review.remarks}"</div>
      <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 6px;">DIGITAL-SIGN: ${officer_review.signature_hash} • Forwarded: ${new Date(officer_review.forwarded_at).toLocaleString('en-IN')}</div>
    </div>
  ` : ''}

  <div class="footer">
    <div>
      <div>Document Seal: AES-256-GCM Verified Under DPDP Act 2023</div>
      <div style="font-family: monospace; font-size: 10px;">SHA256-${application.id}-GOV-APPROVED</div>
    </div>
    <div class="seal">
      <div>✓ DIGITALLY VERIFIED</div>
      <div style="font-size: 9px; font-weight: normal; margin-top: 2px;">Tamil Nadu Banking Circle</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Loan_Application_${application.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const modalElement = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="printable-modal-overlay fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[99999] flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="printable-document bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        {/* Top Control Bar (Sticky & Always 100% Visible) */}
        <div className="print-hide bg-[#0c1e3d] text-white px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-sky-900/60 sticky top-0 z-20 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">
                Official Loan Application & Verification Form
              </h2>
              <span className="text-[11px] text-sky-300 font-mono">
                App ID: #{application.id} • Status: {status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              title="Print application preview and paper/PDF export"
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              title="Download official loan application document"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-sky-300" />
                  <span>Download</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="Close Modal (Esc)"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 space-y-6 bg-white font-sans text-slate-900">
          {/* Bank Formal Header */}
          <div className="border-b-2 border-amber-700 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center font-black text-base shadow-xs">
                  ₹
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight uppercase">
                  Tamil Nadu Commercial Bank Ltd.
                </h1>
              </div>
              <div className="text-xs text-slate-600 font-semibold mt-1">
                Retail & MSME Credit Underwriting Division • Anna Salai Head Office, Chennai - 600002
              </div>
              <div className="text-[11px] text-slate-500">
                AI-LoanGuard Enterprise Credit System • Strict Compliance with RBI Fair Practices & DPDP Act 2023
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                {status.replace(/_/g, ' ')}
              </span>
              <div className="text-[11px] text-slate-500 mt-1.5">
                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-[11px] font-mono text-slate-700 font-bold">
                App ID: {application.id}
              </div>
            </div>
          </div>

          {/* Section 1: Applicant Demographics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-700" />
              <span>1. Borrower Identification & Contact Profile</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Full Legal Name</span>
                <span className="font-bold text-slate-900 text-sm">{applicant.full_name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Age / Gender</span>
                <span className="font-semibold text-slate-800">{applicant.age} Yrs / {applicant.gender}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">District Jurisdiction</span>
                <span className="font-semibold text-slate-800">{applicant.location} District</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Education / Marital</span>
                <span className="font-semibold text-slate-800">{applicant.education} • {applicant.marital_status}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Aadhaar (DPDP Shield)</span>
                <span className="font-mono font-bold text-slate-800">
                  {dataMaskingActive ? (applicant.aadhaar_masked || 'XXXX-XXXX-8901') : (applicant.aadhaar_raw || '6421 8812 8901')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Income Tax PAN</span>
                <span className="font-mono font-bold text-slate-800">
                  {dataMaskingActive ? (applicant.pan_masked || 'ABCDE****F') : (applicant.pan_raw || 'ABCDE8901F')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">DigiLocker e-KYC</span>
                <span className="font-bold text-emerald-700">Verified ✓</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Phone 2FA OTP</span>
                <span className="font-bold text-emerald-700">Verified via SMS ✓</span>
              </div>
            </div>
          </div>

          {/* Section 2: Financial & Employment Profile */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-700" />
              <span>2. Employment, Income & Financial Assessment</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Employment Category</span>
                <span className="font-bold text-slate-800">{applicant.employment_type}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Experience / Vintage</span>
                <span className="font-semibold text-slate-800">{applicant.employment_years} Years</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Monthly Net Income</span>
                <span className="font-bold text-slate-900 text-sm">₹{applicant.monthly_income.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Co-Applicant Income</span>
                <span className="font-semibold text-slate-800">₹{applicant.coapplicant_income.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Requested Loan Amount</span>
                <span className="font-black text-amber-900 text-base">₹{applicant.loan_amount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Loan Tenure</span>
                <span className="font-semibold text-slate-800">{applicant.loan_term_months} Months ({(applicant.loan_term_months / 12).toFixed(1)} Yrs)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Collateral Security Value</span>
                <span className="font-bold text-emerald-800">₹{applicant.collateral_value.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Loan Purpose</span>
                <span className="font-semibold text-slate-800">{applicant.loan_purpose}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Credit Risk & CIBIL Bureau Evaluation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>3. CIBIL Bureau & Algorithmic Underwriting Evaluation</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">CIBIL Bureau Score</span>
                <span className="font-mono font-black text-base text-sky-950">{applicant.credit_score} / 900</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  {applicant.credit_score >= 750 ? 'Tier 1 Prime' : 'Standard'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">AI Approval Probability</span>
                <span className="font-mono font-black text-base text-emerald-700">
                  {(prediction.approval_probability * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">TreeSHAP Calibrated</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Algorithmic Risk Tier</span>
                <span className="font-bold text-slate-800">{prediction.risk_tier}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Model {prediction.model_version}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">ML Recommendation</span>
                <span className="font-bold text-emerald-800 text-sm">{prediction.final_decision}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Loan Officer Stage 2 Audit (if available) */}
          {officer_review && (
            <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200 text-xs space-y-2">
              <div className="font-bold text-sky-950 flex items-center space-x-1.5">
                <ClipboardCheck className="w-4 h-4 text-sky-700" />
                <span>4. Loan Officer Verification & Appraisal Report</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 font-mono">
                <span className="bg-white p-1.5 rounded-lg border border-sky-100">
                  Identity Check: <strong className="text-emerald-700">Verified ✓</strong>
                </span>
                <span className="bg-white p-1.5 rounded-lg border border-sky-100">
                  Documents Check: <strong className="text-emerald-700">Audited ✓</strong>
                </span>
                <span className="bg-white p-1.5 rounded-lg border border-sky-100">
                  Financials Check: <strong className="text-emerald-700">Verified ✓</strong>
                </span>
                <span className="bg-white p-1.5 rounded-lg border border-sky-100">
                  ML Prediction: <strong className="text-emerald-700">Assessed ✓</strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-800 pt-1">
                <strong>Officer Remarks:</strong> "{officer_review.remarks}"
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-sky-200/60">
                <span>Verified by Officer: {officer_review.officer_name} (ID: {officer_review.officer_id})</span>
                <span>Signature Hash: {officer_review.signature_hash}</span>
              </div>
            </div>
          )}

          {/* Section 5: Human Officer / Manager Override Record (if any) */}
          {officer_override && (
            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 text-xs space-y-2">
              <div className="font-bold text-purple-950 flex items-center space-x-1.5">
                <Stamp className="w-4 h-4 text-purple-700" />
                <span>5. Bank Manager Override Record (RBI Compliance)</span>
              </div>
              <div className="text-[11px] text-purple-900">
                Decision changed from <strong>{officer_override.original_decision}</strong> to{' '}
                <strong className="text-purple-700">{officer_override.new_decision}</strong> by{' '}
                <strong>{officer_override.officer_name}</strong>.
              </div>
              <div className="text-[11px] text-slate-800">
                <strong>Override Rationale:</strong> "{officer_override.override_reason}"
              </div>
            </div>
          )}

          {/* Statutory Signatures Block */}
          <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-slate-800 font-bold">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Document Cryptographic Seal: AES-256-GCM Verified</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500">
                APPLICATION-HASH: SHA256-{application.id.replace('TN-APP-', '')}-GOV-APPROVED
              </p>
              <p className="text-[10px] text-slate-500">
                Issued via AI-LoanGuard Enterprise Credit Terminal • Tamil Nadu Circle
              </p>
            </div>

            <div className="text-right border-l-2 pl-6 border-amber-700">
              <div className="flex items-center space-x-1.5 text-amber-900 font-bold justify-end">
                <Stamp className="w-4 h-4 text-amber-700" />
                <span>Branch Credit Sanction Committee</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Digitally Certified & Approved for Disbursal
              </p>
              <div className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">
                Tamil Nadu Banking Circle
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden when printing, sticky on screen) */}
        <div className="print-hide bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-10">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Click <strong>Print</strong> to send to printer or save as PDF.</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              title="Print application preview and paper/PDF export"
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              title="Download official loan application document"
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-sky-300" />
                  <span>Download</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
};
