import React from 'react';

interface StaticWatermarkItem {
  id: number;
  symbol: string;
  label: string;
  left: string;
  top: string;
}

const STATIC_WATERMARKS: StaticWatermarkItem[] = [
  { id: 1, symbol: '₹', label: 'INR', left: '6%', top: '14%' },
  { id: 2, symbol: '$', label: 'USD', left: '88%', top: '16%' },
  { id: 3, symbol: '₹', label: 'INR', left: '14%', top: '52%' },
  { id: 4, symbol: '€', label: 'EUR', left: '84%', top: '48%' },
  { id: 5, symbol: '₹', label: 'INR', left: '8%', top: '82%' },
  { id: 6, symbol: '£', label: 'GBP', left: '89%', top: '80%' },
  { id: 7, symbol: '₹', label: 'INR', left: '32%', top: '10%' },
  { id: 8, symbol: '¥', label: 'JPY', left: '68%', top: '12%' }
];

interface FloatingMoneyBackgroundProps {
  variant?: 'login' | 'portal';
  portalRole?: 'CLIENT' | 'MANAGER' | 'OFFICER';
}

/**
 * Clean, non-movable, professional enterprise banking background with static watermarks.
 */
export const FloatingMoneyBackground: React.FC<FloatingMoneyBackgroundProps> = ({
  variant = 'portal',
  portalRole = 'CLIENT'
}) => {
  const isLogin = variant === 'login';

  const badgeStyle = isLogin
    ? 'text-slate-400/20 border-slate-700/30 bg-slate-800/20'
    : portalRole === 'MANAGER'
    ? 'text-emerald-800/15 border-emerald-300/30 bg-emerald-100/20'
    : portalRole === 'OFFICER'
    ? 'text-sky-800/15 border-sky-300/30 bg-sky-100/20'
    : 'text-indigo-800/15 border-indigo-300/30 bg-indigo-100/20';

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none print-hide">
      {/* Subtle static architectural grid */}
      <div
        className={`absolute inset-0 ${
          isLogin ? 'opacity-[0.04]' : 'opacity-[0.025]'
        } bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)] bg-[size:48px_48px]`}
      />

      {/* Static subtle currency watermarks (non-movable, non-interactive) */}
      {STATIC_WATERMARKS.map((item) => (
        <div
          key={item.id}
          style={{ left: item.left, top: item.top }}
          className={`absolute w-12 h-12 rounded-2xl border flex flex-col items-center justify-center font-bold pointer-events-none ${badgeStyle}`}
        >
          <span className="text-lg leading-none">{item.symbol}</span>
          <span className="text-[8px] font-mono uppercase tracking-widest mt-0.5">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};
