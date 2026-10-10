import React, { useState } from 'react';
import {
  AnalyticsOverview,
  SupportedCurrency
} from '../types/finance.js';
import { formatMoney, formatCompactMoney } from '../api/client.js';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Plus,
  ArrowRight,
  PieChart as PieIcon
} from 'lucide-react';
import { Spinner } from './Spinner.tsx';

interface DashboardViewProps {
  analytics: AnalyticsOverview | null;
  currency: SupportedCurrency;
  onOpenRecordModal: () => void;
  onNavigateToTab: (tab: 'dashboard' | 'transactions') => void;
  isLoading: boolean;
}

const defaultAnalytics: AnalyticsOverview = {
  netWorth: 0,
  totalLiquidCash: 0,
  monthlyCashFlow: {
    periodMonth: new Date().toISOString().slice(0, 7),
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRatePct: 0,
    incomeTransactionsCount: 0,
    expenseTransactionsCount: 0,
  },
  recentIncomes: [],
  recentExpenses: [],
  topExpenseCategories: [],
  monthlyCashflowHistory: [
    { month: 'Jan', income: 0, expense: 0, net: 0 },
    { month: 'Feb', income: 0, expense: 0, net: 0 },
    { month: 'Mar', income: 0, expense: 0, net: 0 },
    { month: 'Apr', income: 0, expense: 0, net: 0 },
    { month: 'May', income: 0, expense: 0, net: 0 },
    { month: 'Jun', income: 0, expense: 0, net: 0 },
  ],
  netWorthHistory: [
    { month: 'Jan', value: 0 },
    { month: 'Feb', value: 0 },
    { month: 'Mar', value: 0 },
    { month: 'Apr', value: 0 },
    { month: 'May', value: 0 },
    { month: 'Jun', value: 0 },
  ],
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  currency,
  onOpenRecordModal,
  onNavigateToTab,
  isLoading,
}) => {
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const data = analytics || defaultAnalytics;

  const {
    netWorth,
    totalLiquidCash,
    monthlyCashFlow,
    recentIncomes = [],
    recentExpenses = [],
    topExpenseCategories = [],
    monthlyCashflowHistory = [],
    netWorthHistory = [],
  } = data;

  const isNetSavingsPositive = monthlyCashFlow.netSavings >= 0;

  // Max value for cashflow chart
  const maxFlow = Math.max(
    ...monthlyCashflowHistory.map((m) => Math.max(m.income, m.expense)),
    1000
  );

  // SVG Area Chart Calculations for Cash Balance Trajectory
  const trajectoryValues = netWorthHistory.map((n) => n.value);
  let minTrajVal = Math.min(...(trajectoryValues.length ? trajectoryValues : [0]));
  let maxTrajVal = Math.max(...(trajectoryValues.length ? trajectoryValues : [0]));

  if (minTrajVal === maxTrajVal) {
    minTrajVal -= 50000;
    maxTrajVal += 50000;
  }

  const trajPaddingY = 24;
  const trajSvgWidth = 500;
  const trajSvgHeight = 150;
  const trajRange = maxTrajVal - minTrajVal || 1;

  const trajPoints = netWorthHistory.map((item, idx) => {
    const totalCount = netWorthHistory.length || 1;
    const x = totalCount === 1 ? trajSvgWidth / 2 : 25 + (idx / (totalCount - 1)) * (trajSvgWidth - 50);
    const y = trajSvgHeight - trajPaddingY - ((item.value - minTrajVal) / trajRange) * (trajSvgHeight - 2 * trajPaddingY);
    return { x, y, month: item.month, value: item.value };
  });

  const pathD = trajPoints.reduce((acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`), '');
  const areaD = trajPoints.length
    ? `${pathD} L ${trajPoints[trajPoints.length - 1].x},${trajSvgHeight - 5} L ${trajPoints[0].x},${trajSvgHeight - 5} Z`
    : '';

  const zeroLineY = minTrajVal < 0 && maxTrajVal > 0
    ? trajSvgHeight - trajPaddingY - ((0 - minTrajVal) / trajRange) * (trajSvgHeight - 2 * trajPaddingY)
    : null;

  const currentNetWorth = netWorthHistory[netWorthHistory.length - 1]?.value ?? netWorth;
  const isTrajectoryPositive = currentNetWorth >= 0;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Editorial Page Lead */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">ASK Cable Financial Dashboard</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5 sm:mt-1">
            Real-time income, expense monitoring, and cashflow analysis in Sri Lankan Rupees (LKR)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-md font-medium">
              <Spinner size="sm" />
              <span>Syncing live data...</span>
            </span>
          )}
          <button
            onClick={onOpenRecordModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Net Balance */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30 shadow-lg transition-all hover:border-emerald-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Overall Net Cash Balance</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums">
            {formatMoney(netWorth, currency)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] font-semibold">
              Total Revenue - Expenses
            </span>
          </div>
        </div>

        {/* Metric 2: Monthly Income Inflow */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/30 via-neutral-900 to-neutral-900 border border-emerald-500/30 shadow-lg transition-all hover:border-emerald-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Monthly Income Inflow</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-400 font-mono tabular-nums">
            +{formatMoney(monthlyCashFlow.totalIncome, currency)}
          </div>
          <div className="mt-2.5 text-xs text-neutral-300 font-mono tabular-nums flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{monthlyCashFlow.incomeTransactionsCount} revenue transactions</span>
          </div>
        </div>

        {/* Metric 3: Monthly Expenses */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-rose-950/30 via-neutral-900 to-neutral-900 border border-rose-500/30 shadow-lg transition-all hover:border-rose-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">Monthly Expenses</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-rose-400 font-mono tabular-nums">
            -{formatMoney(monthlyCashFlow.totalExpense, currency)}
          </div>
          <div className="mt-2.5 text-xs text-neutral-300 font-mono tabular-nums flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span>{monthlyCashFlow.expenseTransactionsCount} expense deductions</span>
          </div>
        </div>

        {/* Metric 4: Net Savings & Rate */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/30 via-neutral-900 to-neutral-900 border border-indigo-500/30 shadow-lg transition-all hover:border-indigo-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Monthly Surplus / Deficit</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight font-mono tabular-nums ${
              isNetSavingsPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isNetSavingsPositive ? '+' : ''}{formatMoney(monthlyCashFlow.netSavings, currency)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-300">
            <span className="font-mono tabular-nums font-bold text-white bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px]">
              {monthlyCashFlow.savingsRatePct}%
            </span>
            <span>savings rate this month</span>
          </div>
        </div>
      </div>

      {/* Main Section: Expense Categories Breakdown & Cash Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Category Expense Allocation */}
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white">Top Expense Categories</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Distribution of current month operational expenditure</p>
              </div>
              <PieIcon className="w-4 h-4 text-neutral-400" />
            </div>

            {topExpenseCategories.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No expense transactions recorded for current month.
              </div>
            ) : (
              <div className="pt-4 space-y-3.5">
                {topExpenseCategories.map((c, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: c.color }}
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                        />
                        <span className="font-medium text-white">{c.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-white font-medium">{formatMoney(c.amount, currency)}</span>
                        <span className="text-neutral-400 text-[11px] w-12 text-right">{c.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Total Operational Spend:</span>
            <span className="font-mono tabular-nums text-white font-semibold">
              {formatMoney(monthlyCashFlow.totalExpense, currency)}
            </span>
          </div>
        </div>

        {/* 2. Cash Trajectory */}
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white">Cash Balance Trajectory</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Multi-month cumulative cash balance accumulation in LKR</p>
              </div>
              {isTrajectoryPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )}
            </div>

            {/* Dynamic SVG Area Line Chart */}
            <div className="pt-4 relative">
              <div className="w-full h-44 relative flex flex-col justify-between">
                <svg
                  viewBox={`0 0 ${trajSvgWidth} ${trajSvgHeight}`}
                  preserveAspectRatio="none"
                  className="w-full h-36 overflow-visible"
                >
                  <defs>
                    <linearGradient id="trajGradientPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="trajGradientNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1={trajPaddingY} x2={trajSvgWidth} y2={trajPaddingY} stroke="#262626" strokeDasharray="3 3" />
                  <line x1="0" y1={trajSvgHeight / 2} x2={trajSvgWidth} y2={trajSvgHeight / 2} stroke="#262626" strokeDasharray="3 3" />
                  <line x1="0" y1={trajSvgHeight - trajPaddingY} x2={trajSvgWidth} y2={trajSvgHeight - trajPaddingY} stroke="#262626" strokeDasharray="3 3" />

                  {/* Zero reference line */}
                  {zeroLineY !== null && (
                    <line x1="0" y1={zeroLineY} x2={trajSvgWidth} y2={zeroLineY} stroke="#EF4444" strokeDasharray="4 2" strokeWidth="1" opacity="0.6" />
                  )}

                  {/* Gradient Area Fill */}
                  {areaD && (
                    <path
                      d={areaD}
                      fill={isTrajectoryPositive ? 'url(#trajGradientPos)' : 'url(#trajGradientNeg)'}
                    />
                  )}

                  {/* Smooth Trajectory Line */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isTrajectoryPositive ? '#10B981' : '#F43F5E'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Points */}
                  {trajPoints.map((p, idx) => (
                    <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPointIdx(idx)} onMouseLeave={() => setHoveredPointIdx(null)}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPointIdx === idx ? '6' : '4'}
                        fill={isTrajectoryPositive ? '#10B981' : '#F43F5E'}
                        stroke="#0A0A0A"
                        strokeWidth="2"
                        className="transition-all duration-200"
                      />
                    </g>
                  ))}
                </svg>

                {/* X-Axis Month Labels */}
                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono px-2 pt-1 border-t border-neutral-800">
                  {trajPoints.map((p, idx) => (
                    <span
                      key={idx}
                      onMouseEnter={() => setHoveredPointIdx(idx)}
                      onMouseLeave={() => setHoveredPointIdx(null)}
                      className={`cursor-pointer transition-colors ${
                        hoveredPointIdx === idx ? 'text-white font-bold' : 'hover:text-neutral-200'
                      }`}
                    >
                      {p.month}
                    </span>
                  ))}
                </div>

                {/* Interactive Floating Tooltip */}
                {hoveredPointIdx !== null && trajPoints[hoveredPointIdx] && (
                  <div
                    className="absolute z-20 bg-neutral-900 border border-neutral-700 text-white px-3 py-1.5 rounded shadow-xl text-xs font-mono pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 transition-all"
                    style={{
                      left: `${(trajPoints[hoveredPointIdx].x / trajSvgWidth) * 100}%`,
                      top: `${Math.max(10, Math.min(80, (trajPoints[hoveredPointIdx].y / trajSvgHeight) * 100))}%`,
                    }}
                  >
                    <div className="text-[10px] text-neutral-400 font-sans">{trajPoints[hoveredPointIdx].month} Balance</div>
                    <div className={`font-semibold ${trajPoints[hoveredPointIdx].value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatMoney(trajPoints[hoveredPointIdx].value, currency)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Overall Net Cash Reserve:</span>
            <span className={`font-mono tabular-nums font-bold text-sm ${
              netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatMoney(netWorth, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Lower Section: Monthly Cash Flow Trend + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Monthly Cash Flow Trend (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-white">Monthly Cash Flow Trend</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Historical comparison of incoming revenue vs operational expenses</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Income
                </span>
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Expense
                </span>
              </div>
            </div>

            {/* Custom Bar Comparison Chart */}
            <div className="mt-6 pt-2">
              <div className="h-44 flex items-end justify-between gap-4 border-b border-neutral-800 pb-2">
                {monthlyCashflowHistory.map((m, idx) => {
                  const incHeight = Math.max(4, (m.income / maxFlow) * 100);
                  const expHeight = Math.max(4, (m.expense / maxFlow) * 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        {/* Income Bar */}
                        <div
                          style={{ height: `${incHeight}%` }}
                          className="w-full max-w-[16px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all relative group/bar"
                          title={`Income: ${formatMoney(m.income, currency)}`}
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${expHeight}%` }}
                          className="w-full max-w-[16px] bg-rose-500/80 hover:bg-rose-400 rounded-t transition-all relative group/bar"
                          title={`Expense: ${formatMoney(m.expense, currency)}`}
                        />
                      </div>
                      <span className="text-xs font-mono text-neutral-400 group-hover:text-white transition-colors">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 mt-4">
            <span>6-Month Average Cashflow:</span>
            <span className="font-mono tabular-nums text-white font-medium">
              +{formatMoney(
                monthlyCashflowHistory.reduce((acc, curr) => acc + curr.income, 0) /
                  (monthlyCashflowHistory.length || 1),
                currency
              )} / mo
            </span>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed (1 col) */}
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white">Recent Ledger Activity</h2>
              <button
                onClick={() => onNavigateToTab('transactions')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentIncomes.length === 0 && recentExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No recent activity. Click "Record Transaction" to add one.
              </div>
            ) : (
              <div className="pt-3 divide-y divide-neutral-850">
                {recentIncomes.map((inc) => (
                  <div key={inc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: inc.categoryColor || '#10B981' }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
                          {inc.description}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          {inc.categoryName} · {inc.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums font-semibold text-emerald-400">
                      +{formatMoney(inc.amount, currency)}
                    </div>
                  </div>
                ))}

                {recentExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3 text-xs group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: exp.categoryColor || '#F43F5E' }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate group-hover:text-rose-300 transition-colors">
                          {exp.description}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          {exp.categoryName} · {exp.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums font-semibold text-rose-400">
                      -{formatMoney(exp.amount, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-800">
            <button
              onClick={onOpenRecordModal}
              className="w-full py-2 px-3 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 rounded-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add New Entry</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
