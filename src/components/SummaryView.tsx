import React from 'react';
import {
  AnalyticsOverview,
  IncomeRecord,
  ExpenseRecord,
  Category,
  SupportedCurrency
} from '../types/finance.js';
import { formatMoney } from '../api/client.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  PieChart,
  Plus,
  Tag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Spinner } from './Spinner.tsx';

interface SummaryViewProps {
  analytics: AnalyticsOverview | null;
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: Category[];
  currency: SupportedCurrency;
  onOpenRecordModal: () => void;
  isLoading: boolean;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  analytics,
  incomes,
  expenses,
  categories,
  currency,
  onOpenRecordModal,
  isLoading,
}) => {
  const totalIncomeSum = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenseSum = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncomeSum - totalExpenseSum;
  const isPositive = netBalance >= 0;

  // Monthly cashflow savings rate
  const monthlyInc = analytics?.monthlyCashFlow.totalIncome || 0;
  const monthlyExp = analytics?.monthlyCashFlow.totalExpense || 0;
  const monthlyNet = monthlyInc - monthlyExp;
  const savingsRate = monthlyInc > 0 ? ((monthlyNet / monthlyInc) * 100).toFixed(1) : '0.0';

  // Group expenses by category for summary
  const expCatMap: Record<string, { name: string; color: string; amount: number; count: number }> = {};
  for (const exp of expenses) {
    if (!expCatMap[exp.categoryId]) {
      expCatMap[exp.categoryId] = {
        name: exp.categoryName || 'Uncategorized Expense',
        color: exp.categoryColor || '#F43F5E',
        amount: 0,
        count: 0,
      };
    }
    expCatMap[exp.categoryId].amount += exp.amount;
    expCatMap[exp.categoryId].count += 1;
  }

  // Group incomes by category for summary
  const incCatMap: Record<string, { name: string; color: string; amount: number; count: number }> = {};
  for (const inc of incomes) {
    if (!incCatMap[inc.categoryId]) {
      incCatMap[inc.categoryId] = {
        name: inc.categoryName || 'Uncategorized Income',
        color: inc.categoryColor || '#10B981',
        amount: 0,
        count: 0,
      };
    }
    incCatMap[inc.categoryId].amount += inc.amount;
    incCatMap[inc.categoryId].count += 1;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Total Financial Summary</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Complete overview card of net reserves, revenue inflows, and expense summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-md font-mono">
              <Spinner size="sm" />
              <span>Updating summary...</span>
            </span>
          )}
          <button
            onClick={onOpenRecordModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* Main Net Summary Banner Card */}
      <div className={`p-6 sm:p-8 rounded-xl border shadow-xl relative overflow-hidden transition-all ${
        isPositive
          ? 'bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-950 border-emerald-500/30'
          : 'bg-gradient-to-br from-rose-950/40 via-neutral-900 to-neutral-950 border-rose-500/30'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className={`w-5 h-5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
                Overall Total Net Cash Reserve
              </span>
            </div>
            <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-mono tabular-nums ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatMoney(netBalance, currency)}
            </div>
            <p className="text-xs text-neutral-400">
              Total Recorded Revenue ({formatMoney(totalIncomeSum, currency)}) minus Total Operational Expenses ({formatMoney(totalExpenseSum, currency)})
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 shrink-0">
            <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800 space-y-1">
              <span className="text-[11px] text-neutral-400">Total Incomes</span>
              <div className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{formatMoney(totalIncomeSum, currency)}</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">{incomes.length} records</span>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800 space-y-1">
              <span className="text-[11px] text-neutral-400">Total Expenses</span>
              <div className="text-sm font-bold font-mono text-rose-400 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{formatMoney(totalExpenseSum, currency)}</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">{expenses.length} records</span>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-neutral-400">Savings Rate</span>
              <div className="text-sm font-bold font-mono text-white">
                {savingsRate}%
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">this month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories Summary Card */}
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Income Categories Summary</h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              +{formatMoney(totalIncomeSum, currency)}
            </span>
          </div>

          {Object.keys(incCatMap).length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">No income categories recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.values(incCatMap).map((cat, idx) => {
                const pct = totalIncomeSum > 0 ? ((cat.amount / totalIncomeSum) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="p-3 rounded bg-neutral-950 border border-neutral-850 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span style={{ backgroundColor: cat.color }} className="w-2.5 h-2.5 rounded-full inline-block" />
                        <span className="font-medium text-white">{cat.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">({cat.count} tx)</span>
                      </div>
                      <div className="font-mono text-emerald-400 font-semibold">
                        +{formatMoney(cat.amount, currency)} <span className="text-neutral-500 text-[10px]">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-850 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%`, backgroundColor: cat.color }} className="h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Categories Summary Card */}
        <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-white">Expense Categories Summary</h2>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400">
              -{formatMoney(totalExpenseSum, currency)}
            </span>
          </div>

          {Object.keys(expCatMap).length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">No expense categories recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.values(expCatMap).map((cat, idx) => {
                const pct = totalExpenseSum > 0 ? ((cat.amount / totalExpenseSum) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="p-3 rounded bg-neutral-950 border border-neutral-850 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span style={{ backgroundColor: cat.color }} className="w-2.5 h-2.5 rounded-full inline-block" />
                        <span className="font-medium text-white">{cat.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">({cat.count} tx)</span>
                      </div>
                      <div className="font-mono text-rose-400 font-semibold">
                        -{formatMoney(cat.amount, currency)} <span className="text-neutral-500 text-[10px]">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-850 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%`, backgroundColor: cat.color }} className="h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
