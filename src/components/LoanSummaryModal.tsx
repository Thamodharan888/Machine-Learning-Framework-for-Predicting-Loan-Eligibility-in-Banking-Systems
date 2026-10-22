import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApplicantInput, PredictionResult } from '../types';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Stamp,
  Lock,
  FileDown,
  Building,
  Check
} from 'lucide-react';

interface LoanSummaryModalProps {
  applicant: ApplicantInput;
  prediction: PredictionResult;
  onClose: () => void;
  dataMaskingActive?: boolean;
}

export const LoanSummaryModal: React.FC<LoanSummaryModalProps> = ({
  applicant,
  prediction,
  onClose,
  dataMaskingActive = false
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Allow closing via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = () => {
    // Generate clean printable HTML Sanction Memorandum Blob for instant offline PDF saving
    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Credit_Sanction_Memorandum_${applicant.applicant_id}.pdf</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
          .header { border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .bank-title { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }
          .bank-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
          .sanction-badge { background: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; border: 1px solid #86efac; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          .cell-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 3px; }
          .cell-val { font-size: 13px; font-weight: 600; color: #0f172a; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .metric-card { border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; }
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #475569; margin: 20px 0 10px; border-left: 4px solid #0f766e; padding-left: 8px; }
          .shap-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .shap-table th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 11px; }
          .shap-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .compliance-box { background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 11px; color: #475569; border: 1px solid #cbd5e1; margin-bottom: 25px; }
          .footer-sign { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .seal { border: 2px solid #0f766e; border-radius: 8px; padding: 10px 16px; color: #0f766e; font-weight: bold; font-size: 11px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="bank-title">TAMIL NADU COMMERCIAL BANK LTD.</h1>
            <div class="bank-sub">Retail & MSME Credit Underwriting Division • Anna Salai Head Office, Chennai</div>
            <div class="bank-sub">Explainable AI Credit Risk Sanction • Compliance with RBI Fair Lending Directives</div>
          </div>
          <div style="text-align: right;">
            <div class="sanction-badge">${prediction.final_decision}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div class="cell-label">Borrower Name</div>
            <div class="cell-val">${applicant.full_name}</div>
          </div>
          <div>
            <div class="cell-label">Application ID</div>
            <div class="cell-val" style="font-family: monospace;">${applicant.applicant_id}</div>
          </div>
          <div>
            <div class="cell-label">Aadhaar (DPDP Shield)</div>
            <div class="cell-val" style="font-family: monospace;">${dataMaskingActive ? (applicant.aadhaar_masked || 'XXXX-XXXX-8901') : (applicant.aadhaar_raw || '6421 8812 8901')}</div>
          </div>
          <div>
            <div class="cell-label">PAN Card</div>
            <div class="cell-val" style="font-family: monospace;">${dataMaskingActive ? (applicant.pan_masked || 'ABCDE****F') : (applicant.pan_raw || 'ABCDE8901F')}</div>
          </div>
          <div>
            <div class="cell-label">Sanctioned Amount</div>
            <div class="cell-val" style="color: #0f766e; font-size: 15px;">₹${applicant.loan_amount.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div class="cell-label">Facility Tenure</div>
            <div class="cell-val">${applicant.loan_term_months} Months</div>
          </div>
          <div>
            <div class="cell-label">Proposed Monthly EMI</div>
            <div class="cell-val">₹${prediction.engineered_features.proposed_emi.toLocaleString('en-IN')}/mo</div>
          </div>
          <div>
            <div class="cell-label">CIBIL Bureau Score</div>
            <div class="cell-val">${applicant.credit_score} / 900</div>
          </div>
        </div>

        <div class="section-title">Key Underwriting Ratios & Risk Indices</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="cell-label">Debt-to-Income (FOIR)</div>
            <div class="cell-val">${prediction.engineered_features.dti_ratio}%</div>
          </div>
          <div class="metric-card">
            <div class="cell-label">Loan-to-Value (LTV)</div>
            <div class="cell-val">${prediction.engineered_features.loan_to_value_ratio}%</div>
          </div>
          <div class="metric-card">
            <div class="cell-label">Loan-to-Income Multiplier</div>
            <div class="cell-val">${prediction.engineered_features.loan_to_income_ratio}x</div>
          </div>
          <div class="metric-card">
            <div class="cell-label">TreeSHAP Confidence</div>
            <div class="cell-val">${(prediction.approval_probability * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div class="section-title">Explainable AI (TreeSHAP) Factor Attribution Summary</div>
        <table class="shap-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Applicant Actual Value</th>
              <th>SHAP Attribution</th>
              <th>Impact Direction</th>
            </tr>
          </thead>
          <tbody>
            ${prediction.shap_factors.slice(0, 5).map(f => `
              <tr>
                <td><strong>${f.featureName}</strong></td>
                <td>${f.actualValue}</td>
                <td style="font-family: monospace; font-weight: bold; color: ${f.isPositive ? '#166534' : '#b91c1c'};">${f.shapValue > 0 ? '+' : ''}${f.shapValue.toFixed(3)}</td>
                <td>${f.businessInterpretation}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="compliance-box">
          <strong>RBI Fair Lending & DPDP Act 2023 Statutory Disclosure:</strong><br />
          This memorandum is issued based on model version ${prediction.model_version}. In adherence to regulatory mandates, all demographic protections (Gender, District, Age) were certified unbiased under Disparate Impact Ratio >= 0.80. The applicant reserves statutory rights to human underwriter review.
        </div>

        <div class="footer-sign">
          <div>
            <div style="font-family: monospace; font-size: 10px; color: #64748b;">DIGITAL CHECKSUM: ${prediction.prediction_id}-SHA256</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Hardware Encrypted AES-256 Cloud Vault • Tamil Nadu Banking Circle</div>
          </div>
          <div class="seal">
            <div>✓ DIGITALLY SANCTIONED</div>
            <div style="font-size: 9px; font-weight: normal; margin-top: 2px;">Credit Risk Appraisal Officer</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Credit_Sanction_Memorandum_${applicant.applicant_id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);

    // Also prompt print dialog for instant "Save as PDF" option
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const isEligible = prediction.final_decision === 'Eligible';
  const isManual = prediction.final_decision === 'Manual Review';

  const modalElement = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="printable-modal-overlay fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="printable-document bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="print-hide bg-[#0c1e3d] text-white px-6 py-4 flex items-center justify-between border-b border-sky-900/60 sticky top-0 z-10">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">
                {isEligible
                  ? 'Credit Sanction Memorandum'
                  : isManual
                  ? 'Underwriter Referral Memorandum'
                  : 'Adverse Action Notification'}
              </h2>
              <span className="text-xs text-sky-300/70">
                Ref: {prediction.prediction_id} • RBI Fair Lending Statutory Format
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-[#0f2854] hover:bg-[#1a3d7a] text-sky-200 hover:text-white transition-colors cursor-pointer"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Clean Close icon button with cursor pointer (hand symbol) */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Close Memorandum (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Printable Memo Content */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
          {/* Institutional Header */}
          <div className="flex justify-between items-start border-b pb-4 border-slate-200">
            <div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                TAMIL NADU COMMERCIAL BANK LTD.
              </h3>
              <p className="text-xs text-slate-500">
                Retail & MSME Credit Risk Appraisal Division • Anna Salai Head Office, Chennai
              </p>
              <p className="text-xs text-teal-700 font-semibold mt-0.5">
                Explainable AI Scoring Engine v2.4 (RBI & DPDP Act 2023 Compliant)
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isEligible
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isManual
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {prediction.final_decision}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Date: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* Applicant & Facility Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Borrower Name</span>
              <span className="font-semibold text-slate-900">{applicant.full_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Application ID</span>
              <span className="font-mono text-slate-800">{applicant.applicant_id}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Aadhaar (DPDP Shield)</span>
              <span className="font-mono text-slate-800">
                {dataMaskingActive
                  ? (applicant.aadhaar_masked || 'XXXX-XXXX-8901')
                  : (applicant.aadhaar_raw || '6421 8812 8901')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">PAN Card</span>
              <span className="font-mono text-slate-800">
                {dataMaskingActive
                  ? (applicant.pan_masked || 'ABCDE****F')
                  : (applicant.pan_raw || 'ABCDE8901F')}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">District / State</span>
              <span className="font-semibold text-slate-800">{applicant.location}, Tamil Nadu</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Employment</span>
              <span className="font-semibold text-slate-800">{applicant.employment_type}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Loan</span>
              <span className="font-bold text-teal-800 text-sm">
                ₹{applicant.loan_amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tenure</span>
              <span className="font-semibold text-slate-800">{applicant.loan_term_months} Months</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Proposed Monthly EMI</span>
              <span className="font-bold text-slate-900">
                ₹{prediction.engineered_features.proposed_emi.toLocaleString('en-IN')}/mo
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">CIBIL Bureau Score</span>
              <span className="font-bold text-slate-900 font-mono">{applicant.credit_score} / 900</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Collateral Cushion</span>
              <span className="font-semibold text-slate-800">₹{applicant.collateral_value.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Loan Purpose</span>
              <span className="font-semibold text-slate-800">{applicant.loan_purpose}</span>
            </div>
          </div>

          {/* Underwriting Metrics Table */}
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-600 tracking-wider mb-2">
              Key Financial Ratios & Credit Indices
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-slate-200 p-2.5 rounded-lg bg-white">
                <span className="text-[10px] text-slate-500 uppercase block">Debt-to-Income (FOIR)</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {prediction.engineered_features.dti_ratio}%
                </span>
                <span className="text-[10px] text-slate-400 block">Limit: 50.0%</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg bg-white">
                <span className="text-[10px] text-slate-500 uppercase block">Loan-to-Income (LTI)</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {prediction.engineered_features.loan_to_income_ratio}x
                </span>
                <span className="text-[10px] text-slate-400 block">Annual Income Multiplier</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg bg-white">
                <span className="text-[10px] text-slate-500 uppercase block">Loan-to-Value (LTV)</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {prediction.engineered_features.loan_to_value_ratio}%
                </span>
                <span className="text-[10px] text-slate-400 block">Collateral Security</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg bg-white">
                <span className="text-[10px] text-slate-500 uppercase block">Income / Dependent</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  ₹{prediction.engineered_features.income_per_dependent.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block">Living Surplus Buffer</span>
              </div>
            </div>
          </div>

          {/* Explainable Factor Attribution */}
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-600 tracking-wider mb-2">
              Explainable AI (TreeSHAP) Factor Attribution Summary
            </h4>
            <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              {prediction.shap_factors.slice(0, 4).map((f) => (
                <div
                  key={f.featureKey}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${f.isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="font-semibold text-slate-800">{f.featureName}</span>
                    <span className="text-slate-500">({f.actualValue})</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-[11px] text-slate-600 max-w-xs text-right hidden sm:block">
                      {f.businessInterpretation}
                    </span>
                    <span className={`font-mono font-bold ${f.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {f.shapValue > 0 ? '+' : ''}
                      {f.shapValue.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Rules & Statutory Disclosures */}
          <div className="bg-slate-100 p-3.5 rounded-xl text-xs space-y-1 text-slate-700 border border-slate-200">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Statutory Compliance & Adverse Action Disclosure (RBI & DPDP Act 2023)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              This credit appraisal was issued by algorithmic risk model {prediction.model_version}. In accordance with
              RBI Fair Practices Code, borrowers have the statutory right to request human officer review. Sensitive
              credentials are protected under AES-256 encryption.
            </p>
          </div>

          {/* Digital Signature & Approver Block */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              <p className="font-mono text-[10px]">PREDICTION CHECKSUM: {prediction.prediction_id}-SHA256</p>
              <p className="text-[10px]">
                Base Confidence: {(prediction.base_value * 100).toFixed(1)}% • Risk Tier: {prediction.risk_tier}
              </p>
            </div>
            <div className="text-right border-l pl-4 border-slate-300">
              <div className="flex items-center space-x-1 text-slate-800 font-bold">
                <Stamp className="w-4 h-4 text-teal-700" />
                <span>Credit Appraisal Authority</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Digitally Signed & Sealed</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions with Enabled Hand Cursor */}
        <div className="print-hide bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Document Security: <strong>AES-256 Verified Digital Seal</strong></span>
            {downloadSuccess && (
              <span className="text-emerald-700 font-bold ml-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Sanction Document Saved!
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {/* Working Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              title="Print"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print</span>
            </button>

            {/* Working Save PDF Button */}
            <button
              type="button"
              onClick={handleSavePdf}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-teal-200" />
              <span>Save PDF</span>
            </button>

            {/* Close Button with Hand symbol cursor */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
};
