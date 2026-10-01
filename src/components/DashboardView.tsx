import React from 'react';
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

interface DashboardViewProps {
  analytics: AnalyticsOverview | null;
  currency: SupportedCurrency;
  onOpenRecordModal: () => void;
  onNavigateToTab: (tab: 'dashboard' | 'transactions') => void;
  isLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  currency,
  onOpenRecordModal,
  onNavigateToTab,
  isLoading,
}) => {
  if (isLoading || !analytics) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-neutral-900/60 border border-neutral-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-lg bg-neutral-900/60 border border-neutral-800 animate-pulse" />
          <div className="h-72 rounded-lg bg-neutral-900/60 border border-neutral-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const {
    netWorth,
    totalLiquidCash,
    monthlyCashFlow,
    recentIncomes = [],
    recentExpenses = [],
    topExpenseCategories,
    monthlyCashflowHistory,
    netWorthHistory = [],
  } = analytics;

  const isNetSavingsPositive = monthlyCashFlow.netSavings >= 0;

  // Max value for cashflow chart
  const maxFlow = Math.max(
    ...monthlyCashflowHistory.map((m) => Math.max(m.income, m.expense)),
    1000
  );

  const maxNetWorth = Math.max(...netWorthHistory.map((n) => n.value), 10000);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      {/* Editorial Page Lead */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ASK Cable Financial Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time income, expense monitoring, and cashflow analysis in Sri Lankan Rupees (LKR)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
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
        <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Overall Net Cash Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            {formatMoney(netWorth, currency)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
            <span className="text-emerald-400 font-mono font-semibold">Total Revenue - Total Expenses</span>
          </div>
        </div>

        {/* Metric 2: Monthly Income Inflow */}
        <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Monthly Income Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-emerald-400 font-mono tabular-nums">
            +{formatMoney(monthlyCashFlow.totalIncome, currency)}
          </div>
          <div className="mt-2 text-xs text-neutral-400 font-mono tabular-nums">
            {monthlyCashFlow.incomeTransactionsCount} revenue transactions
          </div>
        </div>

        {/* Metric 3: Monthly Expenses */}
        <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Monthly Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-rose-400 font-mono tabular-nums">
            -{formatMoney(monthlyCashFlow.totalExpense, currency)}
          </div>
          <div className="mt-2 text-xs text-neutral-400 font-mono tabular-nums">
            {monthlyCashFlow.expenseTransactionsCount} expense deductions
          </div>
        </div>

        {/* Metric 4: Net Savings & Rate */}
        <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Monthly Surplus / Deficit</span>
            <Receipt className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${
              isNetSavingsPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isNetSavingsPositive ? '+' : ''}{formatMoney(monthlyCashFlow.netSavings, currency)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
            <span className="font-mono tabular-nums font-semibold text-white">{monthlyCashFlow.savingsRatePct}%</span>
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
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Bar Chart Representation */}
            <div className="pt-4">
              <div className="h-44 flex items-end justify-between gap-3 border-b border-neutral-800 pb-2">
                {netWorthHistory.map((item, idx) => {
                  const heightPct = Math.max(15, (item.value / maxNetWorth) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="w-full flex items-end justify-center h-36">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[38px] bg-gradient-to-t from-emerald-500/20 to-emerald-400 rounded-t border-t-2 border-emerald-300 relative group-hover:bg-emerald-400 transition-all cursor-pointer"
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow whitespace-nowrap z-20 pointer-events-none">
                            {formatCompactMoney(item.value, currency)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-neutral-400 group-hover:text-white transition-colors">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Overall Net Cash Reserve:</span>
            <span className="font-mono tabular-nums text-emerald-400 font-bold text-sm">
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
