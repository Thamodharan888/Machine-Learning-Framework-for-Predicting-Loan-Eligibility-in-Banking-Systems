import React, { useState } from 'react';
import { ShapFactor } from '../types';
import { ArrowUpRight, ArrowDownRight, Info, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface ShapWaterfallProps {
  shapFactors: ShapFactor[];
  baseValue: number;
  finalProbability: number;
}

export const ShapWaterfall: React.FC<ShapWaterfallProps> = ({
  shapFactors,
  baseValue,
  finalProbability
}) => {
  const [viewMode, setViewMode] = useState<'waterfall' | 'table'>('waterfall');
  const [selectedFactor, setSelectedFactor] = useState<ShapFactor | null>(null);

  const positiveFactors = shapFactors.filter((f) => f.isPositive);
  const negativeFactors = shapFactors.filter((f) => !f.isPositive);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-teal-50 text-teal-700">
              <HelpCircle className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Explainable AI: Local SHAP Feature Attribution
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Game-Theoretic Shapley values measuring marginal contribution toward loan approval probability.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setViewMode('waterfall')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'waterfall' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waterfall View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Officer Audit Table
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 my-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Base Value E[f(x)]</span>
          <span className="text-xs sm:text-sm font-bold text-slate-700">{(baseValue * 100).toFixed(1)}%</span>
          <span className="text-[10px] text-slate-400 block">Population Prior</span>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Total Feature Shift</span>
          <span className={`text-xs sm:text-sm font-bold ${finalProbability >= baseValue ? 'text-emerald-600' : 'text-rose-600'}`}>
            {finalProbability >= baseValue ? '+' : ''}{((finalProbability - baseValue) * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 block">Net Attribution Σφ_i</span>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Final Output f(x)</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900">{(finalProbability * 100).toFixed(1)}%</span>
          <span className="text-[10px] text-slate-400 block">Calibrated Probability</span>
        </div>
      </div>

      {viewMode === 'waterfall' ? (
        <div className="space-y-4">
          {/* Visual Waterfall Bars */}
          <div className="space-y-2.5">
            {shapFactors.map((factor) => {
              const barWidth = Math.min(100, Math.max(8, Math.abs(factor.shapValue) * 220));
              return (
                <div
                  key={factor.featureKey}
                  onClick={() => setSelectedFactor(factor)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    selectedFactor?.featureKey === factor.featureKey
                      ? 'border-teal-500 bg-teal-50/40'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center space-x-2 font-semibold text-slate-800">
                      {factor.isPositive ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                      )}
                      <span>{factor.featureName}</span>
                      <span className="text-slate-400 font-normal">({factor.actualValue})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-mono font-bold ${
                          factor.isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {factor.shapValue > 0 ? '+' : ''}
                        {factor.shapValue.toFixed(3)}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          factor.isPositive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {factor.isPositive ? 'Boosts Approval' : 'Increases Risk'}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Graphic */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    {factor.isPositive ? (
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    ) : (
                      <div
                        className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {factor.businessInterpretation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Selected Factor Detail Card */}
          {selectedFactor && (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800 mt-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    Feature Detail: {selectedFactor.featureName}
                  </span>
                </div>
                <span className="text-xs text-slate-400">Value: {selectedFactor.actualValue}</span>
              </div>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                {selectedFactor.businessInterpretation}
              </p>
              {selectedFactor.recommendation && (
                <div className="mt-2 text-xs text-amber-300 bg-amber-950/60 border border-amber-800/60 p-2 rounded-lg flex items-start space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Remediation Tip:</strong> {selectedFactor.recommendation}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Detailed Officer Audit Table */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Financial Factor</th>
                <th className="py-2.5 px-3">Applicant Value</th>
                <th className="py-2.5 px-3">SHAP Value (φ)</th>
                <th className="py-2.5 px-3">Attribution</th>
                <th className="py-2.5 px-3">Underwriter Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {shapFactors.map((factor) => (
                <tr key={factor.featureKey} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{factor.featureName}</td>
                  <td className="py-2.5 px-3 font-mono">{factor.actualValue}</td>
                  <td
                    className={`py-2.5 px-3 font-mono font-bold ${
                      factor.isPositive ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {factor.shapValue > 0 ? '+' : ''}
                    {factor.shapValue.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        factor.isPositive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {factor.isPositive ? 'Positive Driver' : 'Risk Factor'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs">{factor.businessInterpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
