import React, { useState, useMemo } from 'react';
import {
  AnalyticsOverview,
  SupportedCurrency,
  Customer,
  MonthlyPayment,
  IncomeRecord,
} from '../types/finance.js';
import { formatMoney, formatCompactMoney } from '../api/client.js';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Plus,
  ArrowRight,
  PieChart as PieIcon,
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Calendar,
  Info,
} from 'lucide-react';
import { Spinner } from './Spinner.tsx';

interface DashboardViewProps {
  analytics: AnalyticsOverview | null;
  currency: SupportedCurrency;
  onOpenRecordModal: () => void;
  onNavigateToTab: (tab: 'dashboard' | 'transactions' | 'customers' | 'monthly-payment' | 'customer-history' | 'payment-collection' | 'summary' | 'settings') => void;
  isLoading: boolean;
  customers?: Customer[];
  monthlyPayments?: MonthlyPayment[];
  incomes?: IncomeRecord[];
}

const getRegistrationMonth = (createdAt?: string | Date | null, customerId?: string): string => {
  if (createdAt) {
    if (typeof createdAt === 'string') {
      const trimmed = createdAt.trim();
      if (trimmed.length >= 7 && /^\d{4}-\d{2}/.test(trimmed)) return trimmed.slice(0, 7);
    }
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
  }
  if (customerId && /^[0-9a-fA-F]{24}$/.test(customerId)) {
    try {
      const timestamp = parseInt(customerId.substring(0, 8), 16) * 1000;
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
    } catch {}
  }
  return '';
};

const getNextBillingMonth = (yearMonth: string): string => {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) return '';
  const [yearStr, monthStr] = yearMonth.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
};

const getPrevBillingMonth = (yearMonth: string): string => {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) return '';
  const [yearStr, monthStr] = yearMonth.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
};

const formatMonthLabel = (yearMonth: string): string => {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth;
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

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
  customers = [],
  monthlyPayments = [],
  incomes = [],
}) => {
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [hoveredFlowIdx, setHoveredFlowIdx] = useState<number | null>(null);

  // Selected Billing Month State (Defaults to current YYYY-MM)
  const [selectedBillingMonth, setSelectedBillingMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [isSkippedModalOpen, setIsSkippedModalOpen] = useState(false);
  const [skippedSearchTerm, setSkippedSearchTerm] = useState('');
  const [skippedFilterTab, setSkippedFilterTab] = useState<'ALL' | 'NEW_REGISTRATION' | 'INACTIVE_STATUS' | 'ALREADY_BILLED'>('ALL');

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const isCurrentMonthSelected = selectedBillingMonth === currentMonthStr;

  const handlePrevMonth = () => {
    setSelectedBillingMonth(getPrevBillingMonth(selectedBillingMonth));
  };

  const handleNextMonth = () => {
    setSelectedBillingMonth(getNextBillingMonth(selectedBillingMonth));
  };

  /* ==========================================================================
     DATABASE-DRIVEN STATUS CARDS METRICS
     ========================================================================== */

  // 1. Total Active Customers
  const totalCustomersCount = customers.length;
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => !c.status || c.status === 'ACTIVE');
  }, [customers]);
  const activeCustomersCount = activeCustomers.length;
  const inactiveCustomersCount = totalCustomersCount - activeCustomersCount;

  // 2. Eligible for This Month
  // Business Rule: Customers registered in month R are eligible ONLY for months M > R.
  // Must also be active subscribers.
  const eligibleCustomers = useMemo(() => {
    return activeCustomers.filter((c) => {
      const regMonth = getRegistrationMonth(c.createdAt, c.id);
      if (regMonth && selectedBillingMonth <= regMonth) {
        return false;
      }
      return true;
    });
  }, [activeCustomers, selectedBillingMonth]);
  const eligibleCustomersCount = eligibleCustomers.length;

  // 3. Bills Generated
  const monthBills = useMemo(() => {
    return monthlyPayments.filter((p) => p.month === selectedBillingMonth);
  }, [monthlyPayments, selectedBillingMonth]);
  const billsGeneratedCount = monthBills.length;
  const totalBilledAmount = useMemo(() => {
    return monthBills.reduce((acc, p) => acc + (p.monthlyFee || 0), 0);
  }, [monthBills]);

  // 4. Bills Pending (Eligible customers without generated bill)
  const billedCustomerIds = useMemo(() => {
    return new Set(monthBills.map((p) => p.customerId));
  }, [monthBills]);
  const billsPendingCustomers = useMemo(() => {
    return eligibleCustomers.filter((c) => !billedCustomerIds.has(c.id));
  }, [eligibleCustomers, billedCustomerIds]);
  const billsPendingCount = billsPendingCustomers.length;

  // 5. Payments Received
  const paidBills = useMemo(() => {
    return monthBills.filter((p) => (p.paidAmount || 0) > 0);
  }, [monthBills]);
  const paymentsReceivedCount = paidBills.length;
  const paymentsReceivedAmount = useMemo(() => {
    return monthBills.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  }, [monthBills]);
  const fullyPaidBillsCount = useMemo(() => {
    return monthBills.filter((p) => p.status === 'PAID').length;
  }, [monthBills]);
  const partialPaidBillsCount = useMemo(() => {
    return monthBills.filter((p) => p.status === 'PARTIAL').length;
  }, [monthBills]);

  // 6. Payments Pending
  const balancePendingBills = useMemo(() => {
    return monthBills.filter((p) => (p.balanceAmount || 0) > 0);
  }, [monthBills]);
  const paymentsPendingCount = balancePendingBills.length;
  const paymentsPendingAmount = useMemo(() => {
    return monthBills.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);
  }, [monthBills]);
  const unpaidBillsCount = useMemo(() => {
    return monthBills.filter((p) => (p.paidAmount || 0) === 0).length;
  }, [monthBills]);

  // 7. Skipped Customers (with database reasons)
  interface SkippedCustomerItem {
    customer: Customer;
    category: 'NEW_REGISTRATION' | 'INACTIVE_STATUS' | 'ALREADY_BILLED';
    reason: string;
    regMonth: string;
    nextEligibleMonth?: string;
    existingBill?: MonthlyPayment;
  }

  const skippedCustomerItems: SkippedCustomerItem[] = useMemo(() => {
    const items: SkippedCustomerItem[] = [];
    customers.forEach((c) => {
      const regMonth = getRegistrationMonth(c.createdAt, c.id);
      const isActive = !c.status || c.status === 'ACTIVE';

      // Reason 1: New registration in or after selected billing month
      if (regMonth && selectedBillingMonth <= regMonth) {
        const nextMonth = getNextBillingMonth(regMonth);
        items.push({
          customer: c,
          category: 'NEW_REGISTRATION',
          reason: `Registered in ${regMonth} (${c.createdAt ? c.createdAt.slice(0, 10) : 'Current'}). Billing starts in ${nextMonth}. Excluded for ${selectedBillingMonth}.`,
          regMonth,
          nextEligibleMonth: nextMonth,
        });
      }
      // Reason 2: Inactive or Disconnected account status
      else if (!isActive) {
        items.push({
          customer: c,
          category: 'INACTIVE_STATUS',
          reason: `Account status is ${c.status || 'INACTIVE'}. Only ACTIVE subscribers are billed.`,
          regMonth,
        });
      }
      // Reason 3: Already generated for this month (skipped in bulk creation to avoid duplicates)
      else if (billedCustomerIds.has(c.id)) {
        const existingBill = monthBills.find((b) => b.customerId === c.id);
        items.push({
          customer: c,
          category: 'ALREADY_BILLED',
          reason: `Bill already generated for ${selectedBillingMonth} (Status: ${existingBill?.status || 'RECORDED'}).`,
          regMonth,
          existingBill,
        });
      }
    });
    return items;
  }, [customers, selectedBillingMonth, billedCustomerIds, monthBills]);

  const skippedNewRegCount = useMemo(() => {
    return skippedCustomerItems.filter((i) => i.category === 'NEW_REGISTRATION').length;
  }, [skippedCustomerItems]);

  const skippedInactiveCount = useMemo(() => {
    return skippedCustomerItems.filter((i) => i.category === 'INACTIVE_STATUS').length;
  }, [skippedCustomerItems]);

  const skippedAlreadyBilledCount = useMemo(() => {
    return skippedCustomerItems.filter((i) => i.category === 'ALREADY_BILLED').length;
  }, [skippedCustomerItems]);

  const totalSkippedCount = skippedCustomerItems.length;

  // Filtered skipped list for the details modal
  const filteredSkippedList = useMemo(() => {
    return skippedCustomerItems.filter((item) => {
      if (skippedFilterTab !== 'ALL' && item.category !== skippedFilterTab) {
        return false;
      }
      if (!skippedSearchTerm) return true;
      const term = skippedSearchTerm.toLowerCase();
      const name = (item.customer.name || '').toLowerCase();
      const box = (item.customer.boxNo || '').toLowerCase();
      const phone = (item.customer.phoneNo || '').toLowerCase();
      const reason = item.reason.toLowerCase();
      return name.includes(term) || box.includes(term) || phone.includes(term) || reason.includes(term);
    });
  }, [skippedCustomerItems, skippedFilterTab, skippedSearchTerm]);

  const collectionPct = totalBilledAmount > 0 ? Math.min(100, Math.round((paymentsReceivedAmount / totalBilledAmount) * 100)) : 0;
  const generationPct = eligibleCustomersCount > 0 ? Math.min(100, Math.round((billsGeneratedCount / eligibleCustomersCount) * 100)) : 100;

  /* ==========================================================================
     LEDGER & FINANCIAL DATA
     ========================================================================== */
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

  // 6-Month Cashflow totals & averages
  const totalFlowIncome = monthlyCashflowHistory.reduce((acc, curr) => acc + curr.income, 0);
  const totalFlowExpense = monthlyCashflowHistory.reduce((acc, curr) => acc + curr.expense, 0);
  const avgNetCashflow = (totalFlowIncome - totalFlowExpense) / (monthlyCashflowHistory.length || 1);
  const isAvgNetPositive = avgNetCashflow >= 0;

  // SVG Area Chart Calculations for Cash Balance Trajectory
  const trajectoryValues = netWorthHistory.map((n) => n.value);
  let rawMinVal = Math.min(...(trajectoryValues.length ? trajectoryValues : [0]));
  let rawMaxVal = Math.max(...(trajectoryValues.length ? trajectoryValues : [0]));

  const span = Math.max(Math.abs(rawMaxVal - rawMinVal), 50000);
  const minTrajVal = rawMinVal - span * 0.1;
  const maxTrajVal = rawMaxVal + span * 0.15;

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

  const zeroLineY = minTrajVal <= 0 && maxTrajVal >= 0
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
            Real-time subscriber billing operations, customer eligibility, and multi-stream cashflow monitoring in Sri Lankan Rupees (LKR)
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

      {/* ==========================================================================
          SECTION 1: DASHBOARD STATUS CARDS & BILLING MONTH SELECTOR
          ========================================================================== */}
      <div className="space-y-4">
        {/* Month Selector Bar & Operational Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Billing & Customer Status — {formatMonthLabel(selectedBillingMonth)}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Accurate, database-driven metrics for customer eligibility, billing generation, collections, and exceptions
            </p>
          </div>

          {/* Month Selector Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Billing Month"
              className="p-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="month"
              value={selectedBillingMonth}
              onChange={(e) => e.target.value && setSelectedBillingMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Billing Month"
              className="p-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrentMonthSelected && (
              <button
                type="button"
                onClick={() => setSelectedBillingMonth(currentMonthStr)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                Current Month
              </button>
            )}
          </div>
        </div>

        {/* All 7 Status Cards in a single horizontal row on desktop (lg:grid-cols-7) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-2.5">
          {/* Card 1: Total Active Customers */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/30 via-neutral-900 to-neutral-900 border border-cyan-500/30 shadow-md hover:border-cyan-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1.5 min-h-[32px]">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-cyan-300 leading-tight">
                  Active Customers
                </span>
                <div className="p-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl xl:text-3xl font-black tracking-tight text-white font-mono tabular-nums leading-none">
                {activeCustomersCount}
              </div>
              <p className="mt-1 text-[11px] text-neutral-400 leading-tight">
                Active subscribers
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 font-mono">
                {totalCustomersCount} total
              </span>
              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 transition-colors shrink-0"
              >
                <span>Manage</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Eligible for This Month */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/30 via-neutral-900 to-neutral-900 border border-emerald-500/30 shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1.5 min-h-[32px]">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-emerald-300 leading-tight">
                  Eligible This Month
                </span>
                <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl xl:text-3xl font-black tracking-tight text-emerald-400 font-mono tabular-nums leading-none">
                {eligibleCustomersCount}
              </div>
              <p className="mt-1 text-[11px] text-neutral-400 leading-tight" title={`Eligible for ${formatMonthLabel(selectedBillingMonth)} bills`}>
                Ready for {formatMonthLabel(selectedBillingMonth).split(' ')[0]}
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-emerald-400/90 font-mono">
                {activeCustomersCount > 0 ? Math.round((eligibleCustomersCount / activeCustomersCount) * 100) : 0}% active
              </span>
              <span className="text-neutral-400 font-mono text-[9px] uppercase px-1 py-0.5 rounded bg-neutral-800 shrink-0" title="Customers registered in or after selected month excluded">
                Rule
              </span>
            </div>
          </div>

          {/* Card 3: Bills Generated */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-blue-950/30 via-neutral-900 to-neutral-900 border border-blue-500/30 shadow-md hover:border-blue-500/50 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1.5 min-h-[32px]">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-blue-300 leading-tight">
                  Bills Generated
                </span>
                <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl xl:text-3xl font-black tracking-tight text-white font-mono tabular-nums leading-none">
                {billsGeneratedCount}
              </div>
              <p className="mt-1 text-[11px] text-blue-300 font-mono leading-tight" title={`Total Billed: ${formatMoney(totalBilledAmount, currency)}`}>
                Billed: {formatMoney(totalBilledAmount, currency)}
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 font-mono">
                {generationPct}% done
              </span>
              <button
                onClick={() => onNavigateToTab('monthly-payment')}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5 transition-colors shrink-0"
              >
                <span>Bills</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Card 4: Bills Pending */}
          <div className={`p-3 sm:p-3.5 rounded-xl bg-gradient-to-br ${
            billsPendingCount > 0
              ? 'from-amber-950/30 via-neutral-900 to-neutral-900 border-amber-500/40 hover:border-amber-500/60'
              : 'from-emerald-950/20 via-neutral-900 to-neutral-900 border-emerald-500/30 hover:border-emerald-500/50'
          } border shadow-md transition-all flex flex-col justify-between`}>
            <div>
              <div className="flex items-start justify-between gap-1.5 min-h-[32px]">
                <span className={`text-[10px] xl:text-[11px] font-bold uppercase tracking-wider leading-tight ${
                  billsPendingCount > 0 ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  Bills Pending
                </span>
                <div className={`p-1 rounded-md border shrink-0 ${
                  billsPendingCount > 0
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className={`mt-2 text-2xl xl:text-3xl font-black tracking-tight font-mono tabular-nums leading-none ${
                billsPendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {billsPendingCount}
              </div>
              <p className="mt-1 text-[11px] text-neutral-400 leading-tight">
                {billsPendingCount === 0 ? 'All bills created' : 'Awaiting creation'}
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              {billsPendingCount > 0 ? (
                <>
                  <span className="text-amber-400 font-mono font-medium">
                    Pending
                  </span>
                  <button
                    onClick={() => onNavigateToTab('monthly-payment')}
                    className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-0.5 transition-colors shrink-0"
                  >
                    <span>Generate</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </>
              ) : (
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Complete
                </span>
              )}
            </div>
          </div>

          {/* Card 5: Payments Received */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1.5 min-h-[32px]">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-emerald-300 leading-tight">
                  Payments Received
                </span>
                <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div
                className="mt-2 text-lg xl:text-xl font-black tracking-tight text-emerald-400 font-mono tabular-nums leading-none truncate"
                title={`+${formatMoney(paymentsReceivedAmount, currency)}`}
              >
                +{formatMoney(paymentsReceivedAmount, currency)}
              </div>
              <p className="mt-1 text-[11px] text-neutral-300 font-mono leading-tight">
                {paymentsReceivedCount} paid records
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-neutral-400">Rate:</span>
                <span className="text-emerald-400 font-semibold">{collectionPct}%</span>
              </div>
              <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${collectionPct}%` }}
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Payments Pending */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-rose-950/30 via-neutral-900 to-neutral-900 border border-rose-500/40 shadow-md hover:border-rose-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1.5 min-h-[32px]">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-rose-300 leading-tight">
                  Payments Pending
                </span>
                <div className="p-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div
                className="mt-2 text-lg xl:text-xl font-black tracking-tight text-rose-400 font-mono tabular-nums leading-none truncate"
                title={formatMoney(paymentsPendingAmount, currency)}
              >
                {formatMoney(paymentsPendingAmount, currency)}
              </div>
              <p className="mt-1 text-[11px] text-neutral-300 font-mono leading-tight">
                {paymentsPendingCount} balance bills
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 font-mono">
                {unpaidBillsCount} unpaid
              </span>
              <button
                onClick={() => onNavigateToTab('payment-collection')}
                className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-0.5 transition-colors shrink-0"
              >
                <span>Collect</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Card 7: Skipped Customers */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-purple-950/30 via-neutral-900 to-neutral-900 border border-purple-500/40 shadow-md hover:border-purple-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1.5 min-h-[32px]">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-purple-300 leading-tight">
                  Skipped Customers
                </span>
                <div className="p-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <UserX className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl xl:text-3xl font-black tracking-tight text-purple-300 font-mono tabular-nums leading-none">
                {totalSkippedCount}
              </div>
              <p className="mt-1 text-[11px] text-neutral-400 leading-tight">
                Bypassed in bulk
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-purple-400 font-mono text-[10px] font-semibold">
                {totalSkippedCount} Skipped
              </span>
              <button
                type="button"
                onClick={() => setIsSkippedModalOpen(true)}
                className="text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-0.5 bg-purple-500/20 hover:bg-purple-500/30 px-1.5 py-0.5 rounded border border-purple-500/30 transition-colors shrink-0"
              >
                <span>Reasons</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          MODAL: SKIPPED CUSTOMERS REASONS & BREAKDOWN
          ========================================================================== */}
      {isSkippedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>Skipped Customers — {formatMonthLabel(selectedBillingMonth)}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                      {totalSkippedCount} Total
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Accurate, database-driven reasons why these customer accounts are bypassed during bulk bill generation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSkippedModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-900 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Reason Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSkippedFilterTab('ALL')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      skippedFilterTab === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-750 hover:bg-neutral-750'
                    }`}
                  >
                    All ({totalSkippedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkippedFilterTab('NEW_REGISTRATION')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      skippedFilterTab === 'NEW_REGISTRATION'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-750 hover:bg-neutral-750'
                    }`}
                  >
                    New Registration ({skippedNewRegCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkippedFilterTab('INACTIVE_STATUS')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      skippedFilterTab === 'INACTIVE_STATUS'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-750 hover:bg-neutral-750'
                    }`}
                  >
                    Inactive / Disconnected ({skippedInactiveCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkippedFilterTab('ALREADY_BILLED')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      skippedFilterTab === 'ALREADY_BILLED'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-750 hover:bg-neutral-750'
                    }`}
                  >
                    Already Billed ({skippedAlreadyBilledCount})
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={skippedSearchTerm}
                    onChange={(e) => setSkippedSearchTerm(e.target.value)}
                    placeholder="Search Box No, Name, Phone..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-neutral-700 bg-neutral-800 text-white placeholder-neutral-400 focus:outline-none focus:border-purple-400 font-mono"
                  />
                  {skippedSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setSkippedSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Informational Rule Alert */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-purple-950 dark:text-white">Business Rule:</strong> Customers registering in month <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{selectedBillingMonth}</span> are excluded from billing for their registration month and earlier months. Billing begins in the subsequent month.
                </p>
              </div>
            </div>

            {/* Modal Body / Customer Table */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-800">
              {filteredSkippedList.length === 0 ? (
                <div className="py-16 text-center text-xs text-neutral-400">
                  No skipped customers found matching current filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSkippedList.map((item) => {
                    const { customer, category, reason } = item;
                    return (
                      <div
                        key={customer.id}
                        className="p-3.5 rounded-xl bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        {/* Customer Identification */}
                        <div className="space-y-1 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700">
                              Box #{customer.boxNo}
                            </span>
                            <span className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                              {customer.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 font-mono">
                            <span>Phone: {customer.phoneNo || 'N/A'}</span>
                            {customer.nicNo && <span>· NIC: {customer.nicNo}</span>}
                          </div>
                        </div>

                        {/* Customer Status & Reg Date */}
                        <div className="flex items-center gap-2 min-w-[160px] text-[11px] font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold border ${
                              customer.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {customer.status || 'ACTIVE'}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-400">
                            Reg: {customer.createdAt ? customer.createdAt.slice(0, 10) : (item.regMonth || 'N/A')}
                          </span>
                        </div>

                        {/* Skipped Reason Callout */}
                        <div className="flex-1 min-w-[260px]">
                          <div
                            className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                              category === 'NEW_REGISTRATION'
                                ? 'bg-purple-500/15 text-purple-900 dark:text-purple-200 border-purple-500/30'
                                : category === 'INACTIVE_STATUS'
                                ? 'bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500/30'
                                : 'bg-blue-500/15 text-blue-900 dark:text-blue-200 border-blue-500/30'
                            }`}
                          >
                            <span
                              className={`font-bold uppercase tracking-wider block text-[10px] mb-0.5 ${
                                category === 'NEW_REGISTRATION'
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : category === 'INACTIVE_STATUS'
                                  ? 'text-rose-700 dark:text-rose-300'
                                  : 'text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {category === 'NEW_REGISTRATION' && '⚡ New Registration (Starts Next Month)'}
                              {category === 'INACTIVE_STATUS' && '⛔ Inactive Account Status'}
                              {category === 'ALREADY_BILLED' && '✓ Bill Already Created (No Duplicates)'}
                            </span>
                            {reason}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>Showing {filteredSkippedList.length} of {totalSkippedCount} skipped customers</span>
              <button
                type="button"
                onClick={() => setIsSkippedModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:text-white border border-neutral-300 dark:border-neutral-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          SECTION 2: FINANCIAL METRICS OVERVIEW
          ========================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

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
            <div className="mt-6 pt-2 relative">
              <div className="h-44 flex items-end justify-between gap-4 border-b border-neutral-800 pb-2 relative">
                {monthlyCashflowHistory.map((m, idx) => {
                  const incHeight = m.income > 0 ? Math.max(6, (m.income / maxFlow) * 100) : 0;
                  const expHeight = m.expense > 0 ? Math.max(6, (m.expense / maxFlow) * 100) : 0;
                  const isHovered = hoveredFlowIdx === idx;
                  const net = m.income - m.expense;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setHoveredFlowIdx(idx)}
                      onMouseLeave={() => setHoveredFlowIdx(null)}
                    >
                      {/* Floating Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-16 z-20 bg-neutral-950/95 border border-neutral-700 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-[11px] font-mono pointer-events-none transform -translate-y-2 whitespace-nowrap">
                          <p className="font-bold text-neutral-300 border-b border-neutral-800 pb-0.5 mb-1">{m.month}</p>
                          <div className="flex items-center justify-between gap-3 text-emerald-400">
                            <span>Income:</span>
                            <span className="font-bold">+{formatMoney(m.income, currency)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-rose-400">
                            <span>Expense:</span>
                            <span className="font-bold">-{formatMoney(m.expense, currency)}</span>
                          </div>
                          <div className={`flex items-center justify-between gap-3 pt-0.5 border-t border-neutral-800 font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span>Net:</span>
                            <span>{net >= 0 ? '+' : ''}{formatMoney(net, currency)}</span>
                          </div>
                        </div>
                      )}

                      <div className="w-full flex items-end justify-center gap-1.5 h-36">
                        {/* Income Bar */}
                        {incHeight > 0 ? (
                          <div
                            style={{ height: `${incHeight}%` }}
                            className="w-full max-w-[16px] bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all shadow-xs"
                          />
                        ) : (
                          <div className="w-full max-w-[8px] h-1 bg-neutral-700/40 rounded-full" />
                        )}

                        {/* Expense Bar */}
                        {expHeight > 0 ? (
                          <div
                            style={{ height: `${expHeight}%` }}
                            className="w-full max-w-[16px] bg-rose-500 hover:bg-rose-400 rounded-t transition-all shadow-xs"
                          />
                        ) : (
                          <div className="w-full max-w-[8px] h-1 bg-neutral-700/40 rounded-full" />
                        )}
                      </div>
                      <span className={`text-xs font-mono transition-colors ${isHovered ? 'text-white font-bold' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 mt-4">
            <span>6-Month Net Cashflow (Avg):</span>
            <span className={`font-mono tabular-nums font-semibold ${isAvgNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isAvgNetPositive ? '+' : '-'}{formatMoney(Math.abs(avgNetCashflow), currency)} / mo
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
