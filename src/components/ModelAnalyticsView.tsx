import React, { useState } from 'react';
import { MODEL_BENCHMARK_DATA, FAIRNESS_AUDIT_GROUPS } from '../utils/sampleData';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Sparkles,
  PieChart,
  Scale,
  RefreshCw,
  Bell,
  Check,
  Layers,
  ArrowRight,
  Filter,
  Award,
  Trophy,
  X
} from 'lucide-react';

export const ModelAnalyticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'fairness' | 'drift'>('benchmark');
  const [threshold, setThreshold] = useState<number>(0.60);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);

  // Demographic Fairness State
  const [fairnessCategory, setFairnessCategory] = useState<string>('ALL');
  const [dirThreshold, setDirThreshold] = useState<number>(0.80);
  const [fairnessAuditing, setFairnessAuditing] = useState<boolean>(false);
  const [auditTimestamp, setAuditTimestamp] = useState<string>('Just now');

  // Drift & Telemetry State
  const [driftTimeframe, setDriftTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [simulatedDriftActive, setSimulatedDriftActive] = useState<boolean>(false);
  const [retrainingStatus, setRetrainingStatus] = useState<string>('');
  const [isRetraining, setIsRetraining] = useState<boolean>(false);

  // Simulated metrics based on threshold
  const simFar = Math.max(0.02, parseFloat((0.12 * (1 - threshold)).toFixed(3)));
  const simFrr = Math.max(0.02, parseFloat((0.14 * threshold).toFixed(3)));
  const simAccuracy = parseFloat((0.93 - Math.abs(threshold - 0.60) * 0.15).toFixed(3));

  // Financial Cost Matrix (Assuming ₹5,00,000 avg loan)
  const totalApplicants = 1000;
  const goodApplicants = 650;
  const badApplicants = 350;

  const trueApproved = Math.round(goodApplicants * (1 - simFrr));
  const falseRejected = goodApplicants - trueApproved;
  const falseApproved = Math.round(badApplicants * simFar);
  const trueRejected = badApplicants - falseApproved;

  const avgInterestProfit = 75000; // ₹75K profit per good loan
  const avgDefaultLoss = 350000; // ₹3.5L principal loss per default

  const totalProfitEarned = trueApproved * avgInterestProfit;
  const totalDefaultLossIncurred = falseApproved * avgDefaultLoss;
  const netFinancialOutcome = totalProfitEarned - totalDefaultLossIncurred;

  // Filtered fairness audit groups
  const filteredFairnessGroups = FAIRNESS_AUDIT_GROUPS.filter((g) => {
    if (fairnessCategory === 'ALL') return true;
    return g.category === fairnessCategory;
  }).map((g) => {
    const isCompliant = g.disparate_impact_ratio >= dirThreshold;
    return {
      ...g,
      dynamicStatus: isCompliant ? 'Compliant' : 'Caution / Disparity Detected'
    };
  });

  const handleRunFairnessAudit = () => {
    setFairnessAuditing(true);
    setTimeout(() => {
      setFairnessAuditing(false);
      setAuditTimestamp(new Date().toLocaleTimeString('en-IN'));
    }, 600);
  };

  const handleTriggerRetraining = () => {
    setIsRetraining(true);
    setRetrainingStatus('Initializing distributed hyperparameter tuning on GPU cluster...');
    setTimeout(() => {
      setRetrainingStatus('Cross-validating 10,000 recent loan records... (Fold 4/5 complete)');
      setTimeout(() => {
        setIsRetraining(false);
        setSimulatedDriftActive(false);
        setRetrainingStatus('Model successfully recalibrated! XGBoost v2.5 deployed with PSI = 0.021.');
        setTimeout(() => setRetrainingStatus(''), 4000);
      }, 1200);
    }, 1000);
  };

  // Feature drift telemetry records
  const featureDriftData = [
    {
      feature: 'credit_score (CIBIL)',
      baselineMean: '712',
      currentMean: simulatedDriftActive ? '654 (-58 pts)' : '706 (-6 pts)',
      psi: simulatedDriftActive ? 0.245 : 0.038,
      status: simulatedDriftActive ? 'SIGNIFICANT_DRIFT' : 'STABLE',
      alert: simulatedDriftActive ? 'Post-festival credit score migration observed' : 'Within normal limits'
    },
    {
      feature: 'monthly_income (₹)',
      baselineMean: '₹82,500',
      currentMean: simulatedDriftActive ? '₹73,000 (-11.5%)' : '₹84,200 (+2.1%)',
      psi: simulatedDriftActive ? 0.182 : 0.045,
      status: simulatedDriftActive ? 'MODERATE_DRIFT' : 'STABLE',
      alert: simulatedDriftActive ? 'Inflationary income squeeze across tier 2 MSME' : 'Normal income growth'
    },
    {
      feature: 'dti_ratio (FOIR %)',
      baselineMean: '34.2%',
      currentMean: '35.1%',
      psi: 0.029,
      status: 'STABLE',
      alert: 'Under 50% cap'
    },
    {
      feature: 'collateral_value (₹)',
      baselineMean: '₹22.4L',
      currentMean: '₹22.9L',
      psi: 0.031,
      status: 'STABLE',
      alert: 'Appraised valuations consistent'
    },
    {
      feature: 'loan_amount (₹)',
      baselineMean: '₹18.6L',
      currentMean: '₹19.1L',
      psi: 0.042,
      status: 'STABLE',
      alert: 'Ticket size healthy'
    },
    {
      feature: 'employment_years',
      baselineMean: '5.8 yrs',
      currentMean: '5.6 yrs',
      psi: 0.022,
      status: 'STABLE',
      alert: 'Job tenure stable'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-sky-50 text-sky-700">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Model Performance, Cost Matrix & Algorithmic Fairness
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            5-Fold Stratified Cross-Validation benchmarks, ROC-AUC calibration, cost-sensitive matrices, and bias audits.
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto gap-1">
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'benchmark' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Algorithm Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('fairness')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'fairness' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Demographic Fairness
          </button>
          <button
            onClick={() => setActiveTab('drift')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'drift' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Drift & Monitoring
          </button>
        </div>
      </div>

      {/* TAB 1: ALGORITHM BENCHMARKS */}
      {activeTab === 'benchmark' && (
        <div className="space-y-6">
          {/* Model Fairness Winner Spotlight Card - Interactive */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    2026 Production Winner
                  </span>
                  <h4 className="text-sm font-black text-slate-900">
                    Model Fairness Winner: FairGBM / Cost-Sensitive XGBoost v2.4
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Achieved top Disparate Impact Ratio (0.892 vs 0.80 regulatory benchmark) & 94.6% Equalized Odds Parity across all 38 Tamil Nadu districts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowWinnerModal(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Award className="w-4 h-4 text-emerald-200" />
              <span>View Fairness Winner Certificate & Details →</span>
            </button>
          </div>

          {/* Comparative Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <span>5-Fold Cross-Validation Multi-Algorithm Benchmark</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWinnerModal(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Why did this model win? (Audit Summary)</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Algorithm</th>
                    <th className="py-3 px-3">Accuracy</th>
                    <th className="py-3 px-3">Precision</th>
                    <th className="py-3 px-3">Recall</th>
                    <th className="py-3 px-3">F1-Score</th>
                    <th className="py-3 px-3">ROC-AUC</th>
                    <th className="py-3 px-3">Brier Score</th>
                    <th className="py-3 px-3">FAR (Type I)</th>
                    <th className="py-3 px-3">FRR (Type II)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {MODEL_BENCHMARK_DATA.map((m, idx) => (
                    <tr
                      key={m.model_name}
                      className={idx === 0 ? 'bg-sky-50/60 font-bold text-sky-950' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 px-3 font-sans font-semibold text-slate-900 flex items-center space-x-1.5">
                        {idx === 0 && (
                          <button
                            type="button"
                            onClick={() => setShowWinnerModal(true)}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold cursor-pointer transition-colors shadow-xs flex items-center space-x-1"
                          >
                            <Trophy className="w-3 h-3" />
                            <span>WINNER</span>
                          </button>
                        )}
                        <span>{m.model_name}</span>
                      </td>
                      <td className="py-3 px-3">{(m.accuracy * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3">{(m.precision * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3">{(m.recall * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3">{(m.f1_score * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 text-sky-700 font-bold">{m.roc_auc.toFixed(3)}</td>
                      <td className="py-3 px-3">{m.brier_score.toFixed(3)}</td>
                      <td className="py-3 px-3 text-rose-600">{(m.false_approval_rate * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 text-amber-600">{(m.false_rejection_rate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Threshold Slider & Financial Cost Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Threshold Sensitivity (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <span className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-sky-700" />
                  <span>Decision Threshold Tuner</span>
                </span>
                <span className="font-mono text-xs font-bold text-sky-900">
                  θ = {threshold.toFixed(2)}
                </span>
              </div>

              <div>
                <input
                  type="range"
                  min={0.30}
                  max={0.90}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0.30 (Aggressive)</span>
                  <span>0.60 (Optimal Default)</span>
                  <span>0.90 (Conservative)</span>
                </div>
              </div>

              {/* Dynamic Rates */}
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Accuracy</span>
                  <span className="font-mono font-bold text-slate-900">{(simAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase text-rose-500">False Approval (FAR)</span>
                  <span className="font-mono font-bold text-rose-700">{(simFar * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase text-amber-500">False Reject (FRR)</span>
                  <span className="font-mono font-bold text-amber-700">{(simFrr * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Explanation Note */}
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                <strong>Why Accuracy Fails Alone:</strong> Approving a borrower who defaults (False Approval) costs ~5x to 10x more than turning away a good applicant (False Rejection). The threshold balances capital preservation with loan volume.
              </div>
            </div>

            {/* Financial Cost-Benefit Matrix (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <span className="font-bold text-sm text-slate-900">
                  Portfolio Cost-Benefit Matrix (1,000 Applicants Cohort)
                </span>
                <span className="text-xs text-slate-500 font-medium">₹5L Avg Ticket Size</span>
              </div>

              {/* 2x2 Confusion Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex justify-between items-center text-emerald-900 font-bold">
                    <span>True Approved (TP)</span>
                    <span className="font-mono text-sm">{trueApproved}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Good borrowers correctly funded. Revenue: +₹{(trueApproved * avgInterestProfit / 100000).toFixed(1)} Lakhs.
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="flex justify-between items-center text-rose-900 font-bold">
                    <span>False Approved (FP / Type I)</span>
                    <span className="font-mono text-sm">{falseApproved}</span>
                  </div>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Defaulters wrongly approved. Loss: -₹{(falseApproved * avgDefaultLoss / 100000).toFixed(1)} Lakhs.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-center text-amber-900 font-bold">
                    <span>False Rejected (FN / Type II)</span>
                    <span className="font-mono text-sm">{falseRejected}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Creditworthy applicants lost. Opportunity cost: ₹{(falseRejected * avgInterestProfit / 100000).toFixed(1)} Lakhs.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-slate-900 font-bold">
                    <span>True Rejected (TN)</span>
                    <span className="font-mono text-sm">{trueRejected}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Defaulters correctly declined. Bad debt prevented.
                  </p>
                </div>
              </div>

              {/* Net P&L Outcome */}
              <div className="p-3.5 rounded-xl bg-[#0c1e3d] text-white flex items-center justify-between border border-sky-900/60">
                <div>
                  <span className="text-[10px] text-sky-300 uppercase tracking-wider block">Estimated Net Cohort Yield</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    ₹{(netFinancialOutcome / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <span>Interest Gain: ₹{(totalProfitEarned / 100000).toFixed(1)}L</span>
                  <span className="mx-1">•</span>
                  <span className="text-rose-400">Default Loss: ₹{(totalDefaultLossIncurred / 100000).toFixed(1)}L</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEMOGRAPHIC FAIRNESS */}
      {activeTab === 'fairness' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-sky-700" />
                  <span>Algorithmic Fairness & Disparate Impact Audit (4/5ths Rule)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifying mathematical parity across Employment sectors, Regional geography, Age cohorts, and Gender.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRunFairnessAudit}
                  disabled={fairnessAuditing}
                  className="flex items-center space-x-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fairnessAuditing ? 'animate-spin' : ''}`} />
                  <span>{fairnessAuditing ? 'Auditing Slices...' : 'Re-Run Fairness Audit'}</span>
                </button>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Compliant (DIR ≥ {dirThreshold.toFixed(2)})</span>
                </span>
              </div>
            </div>

            {/* Filter Toolbar & Tolerance Slider */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Category:</span>
                </span>
                {['ALL', 'Employment', 'Geography', 'Age Group'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFairnessCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      fairnessCategory === cat
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Slices' : cat}
                  </button>
                ))}
              </div>

              <div className="md:col-span-5 flex flex-col justify-center space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700">4/5ths Rule Threshold (DIR)</span>
                  <span className="font-mono font-bold text-sky-800">{(dirThreshold * 100).toFixed(0)}% (DIR: {dirThreshold.toFixed(2)})</span>
                </div>
                <input
                  type="range"
                  min={0.70}
                  max={0.90}
                  step={0.02}
                  value={dirThreshold}
                  onChange={(e) => setDirThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>
            </div>

            {/* Visual Parity Comparison Bars */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Approval Rate Parity by Demographic Slice
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFairnessGroups.map((g) => (
                  <div key={g.group_name} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">{g.group_name}</span>
                      <span className="font-mono font-bold text-slate-700">{(g.approval_rate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${g.disparate_impact_ratio >= dirThreshold ? 'bg-sky-600' : 'bg-rose-500'}`}
                        style={{ width: `${g.approval_rate * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{g.category} • {g.total_applicants} Applicants</span>
                      <span className="font-mono font-semibold text-sky-800">DIR: {g.disparate_impact_ratio.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto pt-2">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Demographic / Regional Slice</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Applicants</th>
                    <th className="py-3 px-3">Approval Rate</th>
                    <th className="py-3 px-3">Recall (TPR)</th>
                    <th className="py-3 px-3">Precision</th>
                    <th className="py-3 px-3">Disparate Impact (DIR)</th>
                    <th className="py-3 px-3">Fairness Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredFairnessGroups.map((g) => (
                    <tr key={g.group_name} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{g.group_name}</td>
                      <td className="py-3 px-3 text-slate-500">{g.category}</td>
                      <td className="py-3 px-3 font-mono">{g.total_applicants}</td>
                      <td className="py-3 px-3 font-mono">{(g.approval_rate * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 font-mono">{(g.recall * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 font-mono">{(g.precision * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3 font-mono font-bold text-sky-900">
                        {g.disparate_impact_ratio.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            g.disparate_impact_ratio >= dirThreshold
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {g.dynamicStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DRIFT & MONITORING */}
      {activeTab === 'drift' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-sky-700" />
                  <span>Production Data Drift, PSI & Model Health Telemetry</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time Population Stability Index (PSI) monitoring across all 38 Tamil Nadu banking circle branches.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold">
                  {(['7d', '30d', '90d'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setDriftTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-md transition-colors uppercase ${
                        driftTimeframe === tf ? 'bg-sky-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    simulatedDriftActive
                      ? 'bg-rose-100 text-rose-800 animate-pulse'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {simulatedDriftActive ? 'Alert: Significant Drift (PSI=0.245)' : 'System Health: Stable (PSI=0.042)'}
                </span>
              </div>
            </div>

            {/* Quick Simulation Levers */}
            <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-sky-950">Interactive Telemetry Simulator</div>
                <div className="text-[11px] text-slate-600">
                  Test the banking system's automated drift detection and retraining pipeline.
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSimulatedDriftActive(!simulatedDriftActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    simulatedDriftActive
                      ? 'bg-rose-600 text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                  }`}
                >
                  {simulatedDriftActive ? 'Clear Simulated Drift' : 'Simulate Macroeconomic Drift'}
                </button>

                <button
                  onClick={handleTriggerRetraining}
                  disabled={isRetraining}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
                  <span>{isRetraining ? 'Recalibrating...' : 'Trigger Model Recalibration'}</span>
                </button>
              </div>
            </div>

            {retrainingStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{retrainingStatus}</span>
              </div>
            )}

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block uppercase font-bold">Population Stability Index (PSI)</span>
                <span className={`text-2xl font-black font-mono mt-1 block ${simulatedDriftActive ? 'text-rose-600' : 'text-slate-900'}`}>
                  {simulatedDriftActive ? '0.245' : '0.042'}
                </span>
                <span className={`text-[10px] font-bold block mt-1 ${simulatedDriftActive ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {simulatedDriftActive ? '⚠️ Recalibration Required (> 0.20)' : '✓ Stable (< 0.10)'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block uppercase font-bold">Average API Latency</span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">14.8 ms</span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ SLA &lt; 50ms</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block uppercase font-bold">Concept Drift Degradation</span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                  {simulatedDriftActive ? '1.4%' : '0.0%'}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ ROC-AUC = 0.948</span>
              </div>
            </div>

            {/* Feature-Level Drift Table */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Key Predictor Feature Drift & Distribution Shift
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Feature Name</th>
                      <th className="py-2.5 px-3">Baseline Mean</th>
                      <th className="py-2.5 px-3">Live Cohort Mean</th>
                      <th className="py-2.5 px-3">Feature PSI</th>
                      <th className="py-2.5 px-3">Drift Severity</th>
                      <th className="py-2.5 px-3">Diagnostic Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {featureDriftData.map((f) => (
                      <tr key={f.feature} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{f.feature}</td>
                        <td className="py-2.5 px-3 font-mono">{f.baselineMean}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{f.currentMean}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">{f.psi.toFixed(3)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f.status === 'SIGNIFICANT_DRIFT'
                                ? 'bg-rose-100 text-rose-800'
                                : f.status === 'MODERATE_DRIFT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{f.alert}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Model Fairness Winner Audit Certificate Modal */}
      {showWinnerModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWinnerModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-emerald-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 flex items-center justify-between border-b border-emerald-700/50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/40">
                  <Trophy className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-white">Model Fairness Winner Certificate</h3>
                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                      RBI Compliant
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Production Algorithm Audit • FairGBM / Cost-Sensitive XGBoost v2.4
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              {/* Winner Summary Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-emerald-950">
                    Why FairGBM / Cost-Sensitive XGBoost Won
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    DIR: 0.892 (Passed &gt; 0.80)
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Standard gradient boosting maximizes raw accuracy by exploiting historical proxy disparities (such as unbanked districts or gender credit tenure gaps). <strong>FairGBM / Cost-Sensitive XGBoost</strong> incorporates fairness lagrangian constraints during split optimization, ensuring demographic parity without sacrificing commercial default prediction accuracy.
                </p>
              </div>

              {/* Multi-Algorithm Parity Comparison */}
              <div>
                <h4 className="font-bold text-xs uppercase text-slate-800 mb-2">
                  5-Fold Cross-Validation: Accuracy vs. Algorithmic Parity
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">Algorithm</th>
                        <th className="py-2.5 px-3">ROC-AUC</th>
                        <th className="py-2.5 px-3">Disparate Impact (DIR)</th>
                        <th className="py-2.5 px-3">Equalized Odds</th>
                        <th className="py-2.5 px-3">FPR Disparity</th>
                        <th className="py-2.5 px-3">Audit Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr className="bg-emerald-50/80 font-bold text-emerald-950">
                        <td className="py-2.5 px-3 font-sans flex items-center space-x-1.5">
                          <span className="text-amber-500">★</span>
                          <span>FairGBM / Cost XGBoost</span>
                        </td>
                        <td className="py-2.5 px-3">0.942</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-black">0.892</td>
                        <td className="py-2.5 px-3">94.6%</td>
                        <td className="py-2.5 px-3 text-emerald-700">2.1%</td>
                        <td className="py-2.5 px-3 font-sans text-emerald-700">✓ WINNER</td>
                      </tr>
                      <tr className="text-slate-600">
                        <td className="py-2 px-3 font-sans">Raw XGBoost (Unconstrained)</td>
                        <td className="py-2 px-3">0.948</td>
                        <td className="py-2 px-3 text-rose-600 font-bold">0.742</td>
                        <td className="py-2 px-3">81.2%</td>
                        <td className="py-2 px-3 text-rose-600">14.2%</td>
                        <td className="py-2 px-3 font-sans text-rose-600">✕ Failed DIR</td>
                      </tr>
                      <tr className="text-slate-600">
                        <td className="py-2 px-3 font-sans">LightGBM Default</td>
                        <td className="py-2 px-3">0.935</td>
                        <td className="py-2 px-3 text-amber-600">0.768</td>
                        <td className="py-2 px-3">83.5%</td>
                        <td className="py-2 px-3 text-amber-600">11.5%</td>
                        <td className="py-2 px-3 font-sans text-amber-600">⚠ Marginal</td>
                      </tr>
                      <tr className="text-slate-600">
                        <td className="py-2 px-3 font-sans">Random Forest Classifier</td>
                        <td className="py-2 px-3">0.910</td>
                        <td className="py-2 px-3 text-slate-700">0.812</td>
                        <td className="py-2 px-3">86.0%</td>
                        <td className="py-2 px-3 text-slate-700">8.2%</td>
                        <td className="py-2 px-3 font-sans text-slate-500">Lower AUC</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3 Protected Class Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Gender Equity</div>
                  <div className="text-sm font-black text-slate-900">0.912 DIR</div>
                  <p className="text-[10px] text-slate-500">Equal approval parity between male and female credit applicants.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">38 District Parity</div>
                  <div className="text-sm font-black text-slate-900">0.884 DIR</div>
                  <p className="text-[10px] text-slate-500">Zero adverse geographical penalty for Tier 2/3 rural borrowers.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">MSME & Gig Workers</div>
                  <div className="text-sm font-black text-slate-900">0.895 DIR</div>
                  <p className="text-[10px] text-slate-500">Surplus cash-flow modeling eliminates salaried bias.</p>
                </div>
              </div>

              {/* Official Seal and Sign-off */}
              <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">Model Risk Management (MRM) Sign-Off</div>
                  <div className="text-[11px] text-slate-500">
                    Certified in accordance with RBI Fair Lending Master Directions & DPDP Shield.
                  </div>
                </div>
                <div className="border border-emerald-600 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-xl text-center">
                  <div>✓ OFFICIALLY CERTIFIED</div>
                  <span className="font-normal text-[9px]">Audit Ref: MRM-TN-2026-WIN</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
