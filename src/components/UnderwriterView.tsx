import React, { useState } from 'react';
import { ApplicantInput, ApplicationRecord, PredictionResult } from '../types';
import { predictLoanEligibility } from '../utils/mlEngine';
import { PRESET_CASE_STUDIES, TN_DISTRICTS } from '../utils/sampleData';
import { ShapWaterfall } from './ShapWaterfall';
import { WhatIfSimulator } from './WhatIfSimulator';
import { LoanSummaryModal } from './LoanSummaryModal';
import { PrintableApplicationModal } from './PrintableApplicationModal';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  FileText,
  Send,
  User,
  IndianRupee,
  Briefcase,
  Layers,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileCheck,
  Printer
} from 'lucide-react';

interface UnderwriterViewProps {
  currentApplicant: ApplicantInput;
  setCurrentApplicant: (app: ApplicantInput) => void;
  onSubmitApplication: (app: ApplicationRecord) => void;
}

export const UnderwriterView: React.FC<UnderwriterViewProps> = ({
  currentApplicant,
  setCurrentApplicant,
  onSubmitApplication
}) => {
  const [showWhatIf, setShowWhatIf] = useState<boolean>(false);
  const [showMemo, setShowMemo] = useState<boolean>(false);
  const [showPrintForm, setShowPrintForm] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Real-time ML prediction
  const prediction: PredictionResult = predictLoanEligibility(currentApplicant);

  const handleFieldChange = (field: keyof ApplicantInput, value: any) => {
    setCurrentApplicant({
      ...currentApplicant,
      [field]: value
    });
    setSubmitSuccess(false);
  };

  const handleSaveToQueue = () => {
    const newRecord: ApplicationRecord = {
      id: currentApplicant.applicant_id,
      applicant: currentApplicant,
      prediction: prediction,
      status: prediction.final_decision === 'Eligible'
        ? 'APPROVED'
        : prediction.final_decision === 'Not Eligible'
        ? 'REJECTED'
        : 'PENDING_REVIEW',
      notes: [
        `Automated ingestion completed via Portal. Model: ${prediction.model_version}.`,
        prediction.hard_rule_triggered ? `Policy Alert: ${prediction.hard_rule_message}` : 'All basic credit rules passed.'
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    onSubmitApplication(newRecord);
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 4000);
  };

  const isEligible = prediction.final_decision === 'Eligible';
  const isManual = prediction.final_decision === 'Manual Review';
  const isNotEligible = prediction.final_decision === 'Not Eligible';

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Case Studies */}
      <div className="bg-gradient-to-r from-[#0c1e3d] via-[#0f2854] to-[#0c1e3d] text-white rounded-2xl p-5 border border-sky-900/60 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black tracking-tight text-white">
                Interactive Credit Underwriting & SHAP Engine
              </h2>
            </div>
            <p className="text-xs text-sky-200/80 mt-1">
              Test live applicant profiles, inspect Game-Theoretic SHAP factor breakdowns, and simulate counterfactual remedies.
            </p>
          </div>

          {/* Quick Case Study Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-sky-300 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
            </span>
            {PRESET_CASE_STUDIES.map((cs) => (
              <button
                key={cs.id}
                onClick={() => {
                  setCurrentApplicant(cs.data);
                  setSubmitSuccess(false);
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all ${
                  currentApplicant.applicant_id === cs.data.applicant_id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-bold'
                    : 'bg-[#0f2854]/80 text-sky-200 border-sky-800/80 hover:bg-[#1a3d7a] hover:text-white'
                }`}
              >
                {cs.title.split('.')[1] || cs.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Underwriting Grid: Inputs (Left) & Prediction/XAI (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 4-Card Input Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Applicant Demographics & KYC */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <User className="w-4 h-4 text-teal-700" />
              <span>1. Borrower Profile & Identity</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={currentApplicant.full_name}
                  onChange={(e) => handleFieldChange('full_name', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Age (Years)</label>
                <input
                  type="number"
                  value={currentApplicant.age}
                  onChange={(e) => handleFieldChange('age', parseInt(e.target.value) || 21)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  min={18}
                  max={75}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Location District (TN)</label>
                <select
                  value={currentApplicant.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                >
                  {TN_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Employment Type</label>
                <select
                  value={currentApplicant.employment_type}
                  onChange={(e) => handleFieldChange('employment_type', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                >
                  <option value="Salaried Private">Salaried Private</option>
                  <option value="Salaried Government">Salaried Government</option>
                  <option value="Self-Employed Professional">Self-Employed Professional</option>
                  <option value="Self-Employed Business">Self-Employed Business / MSME</option>
                  <option value="Gig / Contract Worker">Gig / Contract Worker</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Work Experience (Yrs)</label>
                <input
                  type="number"
                  value={currentApplicant.employment_years}
                  onChange={(e) => handleFieldChange('employment_years', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  min={0}
                  max={45}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dependents</label>
                <input
                  type="number"
                  value={currentApplicant.dependents}
                  onChange={(e) => handleFieldChange('dependents', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  min={0}
                  max={8}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Financials & Cashflow */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <IndianRupee className="w-4 h-4 text-emerald-700" />
              <span>2. Monthly Financials & Existing Liabilities</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Primary Monthly Net Income (₹)
                </label>
                <input
                  type="number"
                  value={currentApplicant.monthly_income}
                  onChange={(e) => handleFieldChange('monthly_income', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  step={5000}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Co-Applicant Monthly Income (₹)
                </label>
                <input
                  type="number"
                  value={currentApplicant.coapplicant_income}
                  onChange={(e) => handleFieldChange('coapplicant_income', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  step={5000}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Existing Monthly EMIs / Liabilities (₹)
                </label>
                <input
                  type="number"
                  value={currentApplicant.existing_emi}
                  onChange={(e) => handleFieldChange('existing_emi', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  step={1000}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bank Relationship Vintage (Months)
                </label>
                <input
                  type="number"
                  value={currentApplicant.bank_account_age_months}
                  onChange={(e) => handleFieldChange('bank_account_age_months', parseInt(e.target.value) || 12)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  min={1}
                  max={300}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Loan Parameters & Collateral */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Briefcase className="w-4 h-4 text-indigo-700" />
              <span>3. Loan Request & Security Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Requested Loan Amount (₹)
                </label>
                <input
                  type="number"
                  value={currentApplicant.loan_amount}
                  onChange={(e) => handleFieldChange('loan_amount', parseFloat(e.target.value) || 100000)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  step={50000}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Loan Tenure (Months)
                </label>
                <select
                  value={currentApplicant.loan_term_months}
                  onChange={(e) => handleFieldChange('loan_term_months', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                >
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                  <option value={36}>36 Months (3 Years)</option>
                  <option value={48}>48 Months (4 Years)</option>
                  <option value={60}>60 Months (5 Years)</option>
                  <option value={84}>84 Months (7 Years)</option>
                  <option value={120}>120 Months (10 Years)</option>
                  <option value={180}>180 Months (15 Years)</option>
                  <option value={240}>240 Months (20 Years)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Loan Purpose
                </label>
                <select
                  value={currentApplicant.loan_purpose}
                  onChange={(e) => handleFieldChange('loan_purpose', e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                >
                  <option value="Home Purchase / Construction">Home Purchase / Construction</option>
                  <option value="Personal / Medical Emergency">Personal / Medical Emergency</option>
                  <option value="Education">Education Loan</option>
                  <option value="MSME / Small Business Expansion">MSME / Business Expansion</option>
                  <option value="Vehicle Loan">Vehicle Loan</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Collateral / Security Market Value (₹)
                </label>
                <input
                  type="number"
                  value={currentApplicant.collateral_value}
                  onChange={(e) => handleFieldChange('collateral_value', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  placeholder="0 for unsecured facility"
                  step={50000}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Bureau Credit History & DPDP Consent */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Layers className="w-4 h-4 text-purple-700" />
              <span>4. Credit Bureau & Regulatory Consent</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">CIBIL Credit Score (300-900)</label>
                  <span className="font-mono text-xs font-bold text-teal-800">{currentApplicant.credit_score}</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={900}
                  step={5}
                  value={currentApplicant.credit_score}
                  onChange={(e) => handleFieldChange('credit_score', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Previous Loans Repaid</label>
                <input
                  type="number"
                  value={currentApplicant.previous_loan_count}
                  onChange={(e) => handleFieldChange('previous_loan_count', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-teal-500 focus:bg-white"
                  min={0}
                  max={10}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentApplicant.previous_default}
                  onChange={(e) => handleFieldChange('previous_default', e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="font-medium text-slate-700">Prior Loan Default</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentApplicant.kyc_verified}
                  onChange={(e) => handleFieldChange('kyc_verified', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="font-medium text-slate-700">KYC Authenticated</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentApplicant.consent_signed}
                  onChange={(e) => handleFieldChange('consent_signed', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="font-medium text-slate-700">DPDP Consent Signed</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Decision & SHAP XAI Results (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Decision Badge & Probability Radial */}
          <div
            className={`rounded-2xl p-5 border shadow-md transition-all ${
              isEligible
                ? 'bg-gradient-to-br from-[#0c1e3d] via-[#093529] to-[#0c1e3d] text-white border-emerald-500/40'
                : isManual
                ? 'bg-gradient-to-br from-[#0c1e3d] via-[#3a2707] to-[#0c1e3d] text-white border-amber-500/40'
                : 'bg-gradient-to-br from-[#0c1e3d] via-[#3a0d18] to-[#0c1e3d] text-white border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-sky-900/60">
              <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">
                Automated Credit Recommendation
              </span>
              <span className="text-[10px] bg-[#0f2854] text-sky-200 px-2 py-0.5 rounded-full font-mono border border-sky-800">
                {prediction.model_version}
              </span>
            </div>

            <div className="flex items-center justify-between my-4">
              <div>
                <div className="flex items-center space-x-2">
                  {isEligible ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  ) : isManual ? (
                    <AlertTriangle className="w-7 h-7 text-amber-400" />
                  ) : (
                    <XCircle className="w-7 h-7 text-rose-400" />
                  )}
                  <h3 className="text-2xl font-black tracking-tight">{prediction.final_decision}</h3>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      prediction.risk_tier === 'Low Risk'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : prediction.risk_tier === 'Moderate Risk'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {prediction.risk_tier}
                  </span>
                  {prediction.hard_rule_triggered && (
                    <span className="text-[10px] bg-rose-500/30 text-rose-200 border border-rose-500/40 px-1.5 py-0.5 rounded font-semibold">
                      Policy Rule Triggered
                    </span>
                  )}
                </div>
              </div>

              {/* Approval Probability Circular Meter */}
              <div className="text-right">
                <span className="text-3xl font-black font-mono block">
                  {(prediction.approval_probability * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Approval Score</span>
              </div>
            </div>

            {/* Hard Policy Notification if any */}
            {prediction.hard_rule_message && (
              <div className="bg-rose-950/60 border border-rose-800/60 p-2.5 rounded-lg text-xs text-rose-200 mb-3 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{prediction.hard_rule_message}</span>
              </div>
            )}

            {/* Key Calculated Financial Indices */}
            <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Debt-to-Income (FOIR)</span>
                <span className="font-bold text-slate-200 font-mono text-sm">
                  {prediction.engineered_features.dti_ratio}%
                </span>
                <span className="text-[10px] text-slate-400 block">Ceiling: 50.0%</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Proposed Monthly EMI</span>
                <span className="font-bold text-slate-200 font-mono text-sm">
                  ₹{prediction.engineered_features.proposed_emi.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block">10.5% p.a. repo-linked</span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowWhatIf(!showWhatIf)}
                className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showWhatIf ? 'Hide What-If' : 'What-If Recourse'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMemo(true)}
                className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Sanction Memo</span>
              </button>
            </div>

            {/* Print Official Application Button */}
            <button
              type="button"
              onClick={() => setShowPrintForm(true)}
              className="w-full mt-2 flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer"
              title="Print"
            >
              <Printer className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Print</span>
            </button>

            {/* Submit to Queue Button */}
            <button
              onClick={handleSaveToQueue}
              className="w-full mt-2.5 flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to Underwriter Review Queue</span>
            </button>

            {submitSuccess && (
              <div className="mt-2 text-center text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Application successfully stored with SHA-256 audit log!</span>
              </div>
            )}
          </div>

          {/* Hard Business Rules Check Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">Institutional Credit Policy Matrix</span>
              <span className="text-[10px] text-slate-400">Deterministic Governance</span>
            </div>
            <div className="space-y-2 mt-2.5">
              {prediction.business_rules.map((rule) => (
                <div
                  key={rule.ruleId}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center space-x-2">
                    {rule.severity === 'PASS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : rule.severity === 'HARD_REJECT' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-800">{rule.ruleName}</span>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{rule.reason}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      rule.severity === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rule.severity === 'HARD_REJECT'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rule.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic What-If Counterfactual Simulator Drawer/Block */}
      {showWhatIf && (
        <div className="animate-fadeIn">
          <WhatIfSimulator
            originalInput={currentApplicant}
            originalPrediction={prediction}
            onApplyRecourse={(modified) => {
              setCurrentApplicant(modified);
              setShowWhatIf(false);
            }}
          />
        </div>
      )}

      {/* Embedded SHAP Local Feature Waterfall Visualizer */}
      <ShapWaterfall
        shapFactors={prediction.shap_factors}
        baseValue={prediction.base_value}
        finalProbability={prediction.approval_probability}
      />

      {/* Counterfactual Actionable Recourse Recommendations */}
      {prediction.counterfactual_remedies.length > 0 && (
        <div className="bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-800/60 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center space-x-2 text-teal-300 font-bold text-sm mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Actionable Counterfactual Recourse for Applicant</span>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            Specific parameter adjustments required to move the applicant from {prediction.final_decision} to Eligible:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {prediction.counterfactual_remedies.map((remedy, i) => (
              <li key={i} className="flex items-start space-x-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-teal-400 font-bold">•</span>
                <span>{remedy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sanction Memorandum Modal */}
      {showMemo && (
        <LoanSummaryModal
          applicant={currentApplicant}
          prediction={prediction}
          onClose={() => setShowMemo(false)}
        />
      )}

      {/* Official Printable Application Form Modal */}
      {showPrintForm && (
        <PrintableApplicationModal
          application={{
            id: currentApplicant.applicant_id,
            applicant: currentApplicant,
            prediction: prediction,
            status:
              prediction.final_decision === 'Eligible'
                ? 'APPROVED'
                : prediction.final_decision === 'Not Eligible'
                ? 'REJECTED'
                : 'PENDING_REVIEW',
            notes: [
              `Official application form retrieved from Credit Underwriter terminal on ${new Date().toLocaleDateString('en-IN')}.`,
              `Algorithmic Decision: ${prediction.final_decision} (Odds: ${(prediction.approval_probability * 100).toFixed(1)}%). All statutory KYC parameters evaluated.`
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }}
          onClose={() => setShowPrintForm(false)}
        />
      )}
    </div>
  );
};
