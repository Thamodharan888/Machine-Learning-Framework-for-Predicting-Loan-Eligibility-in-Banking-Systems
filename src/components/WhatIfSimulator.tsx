import React, { useState, useEffect } from 'react';
import { ApplicantInput, PredictionResult } from '../types';
import { calculateEMI, predictLoanEligibility } from '../utils/mlEngine';
import { Sliders, Sparkles, ArrowRight, RotateCcw, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface WhatIfSimulatorProps {
  originalInput: ApplicantInput;
  originalPrediction: PredictionResult;
  onApplyRecourse: (modified: ApplicantInput) => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  originalInput,
  originalPrediction,
  onApplyRecourse
}) => {
  const [simLoanAmount, setSimLoanAmount] = useState<number>(originalInput.loan_amount);
  const [simTenure, setSimTenure] = useState<number>(originalInput.loan_term_months);
  const [simCoappIncome, setSimCoappIncome] = useState<number>(originalInput.coapplicant_income);
  const [simCollateral, setSimCollateral] = useState<number>(originalInput.collateral_value);
  const [simExistingEmi, setSimExistingEmi] = useState<number>(originalInput.existing_emi);

  // Sync with original when changed
  useEffect(() => {
    setSimLoanAmount(originalInput.loan_amount);
    setSimTenure(originalInput.loan_term_months);
    setSimCoappIncome(originalInput.coapplicant_income);
    setSimCollateral(originalInput.collateral_value);
    setSimExistingEmi(originalInput.existing_emi);
  }, [originalInput]);

  const simulatedInput: ApplicantInput = {
    ...originalInput,
    loan_amount: simLoanAmount,
    loan_term_months: simTenure,
    coapplicant_income: simCoappIncome,
    collateral_value: simCollateral,
    existing_emi: simExistingEmi
  };

  const simulatedPrediction = predictLoanEligibility(simulatedInput);

  const probDelta = simulatedPrediction.approval_probability - originalPrediction.approval_probability;
  const isImproved = probDelta > 0.005;

  const resetToOriginal = () => {
    setSimLoanAmount(originalInput.loan_amount);
    setSimTenure(originalInput.loan_term_months);
    setSimCoappIncome(originalInput.coapplicant_income);
    setSimCollateral(originalInput.collateral_value);
    setSimExistingEmi(originalInput.existing_emi);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">What-If Counterfactual Recourse Simulator</h3>
            <p className="text-xs text-slate-400">
              Interactive sensitivity analysis: explore actionable parameter shifts to achieve credit approval.
            </p>
          </div>
        </div>

        <button
          onClick={resetToOriginal}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Original</span>
        </button>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
        {/* Original Baseline */}
        <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Original Status
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-200">
              {(originalPrediction.approval_probability * 100).toFixed(1)}%
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold ${
                originalPrediction.final_decision === 'Eligible'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : originalPrediction.final_decision === 'Manual Review'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {originalPrediction.final_decision}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 space-y-0.5">
            <div>DTI (FOIR): {originalPrediction.engineered_features.dti_ratio}%</div>
            <div>Proposed EMI: ₹{originalPrediction.engineered_features.proposed_emi.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Dynamic Shift Indicator */}
        <div className="bg-slate-800/40 border border-slate-700/40 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Simulated Impact Shift
          </span>
          <div className="flex items-center space-x-2">
            <span
              className={`text-2xl font-black ${
                isImproved ? 'text-emerald-400' : probDelta < -0.005 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {probDelta > 0 ? '+' : ''}
              {(probDelta * 100).toFixed(1)}%
            </span>
            {isImproved && <TrendingUp className="w-5 h-5 text-emerald-400 animate-bounce" />}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {simulatedPrediction.final_decision !== originalPrediction.final_decision
              ? `Decision changed to ${simulatedPrediction.final_decision}`
              : 'Probability shift with current parameters'}
          </span>
        </div>

        {/* Simulated Outcome */}
        <div className="bg-teal-950/40 border border-teal-800/50 p-4 rounded-xl">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-300 block mb-1">
            Simulated Recommendation
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-teal-200">
              {(simulatedPrediction.approval_probability * 100).toFixed(1)}%
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold ${
                simulatedPrediction.final_decision === 'Eligible'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
                  : simulatedPrediction.final_decision === 'Manual Review'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                  : 'bg-rose-500/30 text-rose-200 border border-rose-500/40'
              }`}
            >
              {simulatedPrediction.final_decision}
            </span>
          </div>
          <div className="mt-2 text-xs text-teal-300/80 space-y-0.5">
            <div>New DTI (FOIR): {simulatedPrediction.engineered_features.dti_ratio}%</div>
            <div>New EMI: ₹{simulatedPrediction.engineered_features.proposed_emi.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-800/40 p-5 rounded-xl border border-slate-700/60">
        {/* 1. Loan Tenure Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Extend Loan Tenure</span>
            <span className="font-mono text-teal-300 font-bold">{simTenure} Months</span>
          </div>
          <input
            type="range"
            min={12}
            max={240}
            step={12}
            value={simTenure}
            onChange={(e) => setSimTenure(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Longer tenure spreads principal, lowering monthly EMI and FOIR burden.
          </span>
        </div>

        {/* 2. Co-applicant Income */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Add Co-Applicant Income</span>
            <span className="font-mono text-teal-300 font-bold">₹{simCoappIncome.toLocaleString('en-IN')}/mo</span>
          </div>
          <input
            type="range"
            min={0}
            max={150000}
            step={5000}
            value={simCoappIncome}
            onChange={(e) => setSimCoappIncome(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Including an earning spouse/parent increases verifiable household cashflow.
          </span>
        </div>

        {/* 3. Loan Amount Adjustment */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Requested Loan Amount</span>
            <span className="font-mono text-teal-300 font-bold">₹{simLoanAmount.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min={100000}
            max={Math.max(5000000, originalInput.loan_amount * 1.5)}
            step={50000}
            value={simLoanAmount}
            onChange={(e) => setSimLoanAmount(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Downsizing loan requirement reduces debt burden and default exposure.
          </span>
        </div>

        {/* 4. Collateral Security */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Pledged Collateral / Property Security</span>
            <span className="font-mono text-teal-300 font-bold">₹{simCollateral.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(6000000, simLoanAmount * 1.8)}
            step={100000}
            value={simCollateral}
            onChange={(e) => setSimCollateral(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Tangible security lowers LTV (Loan-to-Value) and limits bank Loss Given Default.
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div className="text-xs text-slate-300 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>
            {simulatedPrediction.final_decision === 'Eligible'
              ? 'These parameter adjustments successfully achieve standard bank eligibility!'
              : 'Keep adjusting parameters to bring the risk profile into the Eligible tier.'}
          </span>
        </div>

        <button
          onClick={() => onApplyRecourse(simulatedInput)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all"
        >
          <span>Apply Parameters to Underwriter</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
