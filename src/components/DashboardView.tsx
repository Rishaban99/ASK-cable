import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AnalyticsOverview,
  SupportedCurrency,
  Customer,
  MonthlyPayment,
  IncomeRecord,
  ExpenseRecord,
  Category,
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
  Layers,
  Banknote,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from 'lucide-react';
import { Spinner } from './Spinner.js';
import { useToast } from './Toast.js';

interface DashboardViewProps {
  analytics: AnalyticsOverview | null;
  currency: SupportedCurrency;
  onOpenRecordModal: () => void;
  onNavigateToTab: (
    tab:
      | 'dashboard'
      | 'transactions'
      | 'customers'
      | 'monthly-payment'
      | 'customer-history'
      | 'payment-collection'
      | 'summary'
      | 'settings'
  ) => void;
  isLoading: boolean;
  customers?: Customer[];
  monthlyPayments?: MonthlyPayment[];
  incomes?: IncomeRecord[];
  expenses?: ExpenseRecord[];
  categories?: Category[];
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
  expenses = [],
  categories = [],
}) => {
  const toast = useToast();
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [hoveredFlowIdx, setHoveredFlowIdx] = useState<number | null>(null);

  // Selected Billing Month State (Defaults to current YYYY-MM)
  const [selectedBillingMonth, setSelectedBillingMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [isSkippedModalOpen, setIsSkippedModalOpen] = useState(false);
  const [skippedSearchTerm, setSkippedSearchTerm] = useState('');
  const [skippedFilterTab, setSkippedFilterTab] = useState<
    'ALL' | 'NEW_REGISTRATION' | 'INACTIVE_STATUS' | 'ALREADY_BILLED'
  >('ALL');

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const isCurrentMonthSelected = selectedBillingMonth === currentMonthStr;

  const handlePrevMonth = () => {
    setSelectedBillingMonth(getPrevBillingMonth(selectedBillingMonth));
  };

  const handleNextMonth = () => {
    setSelectedBillingMonth(getNextBillingMonth(selectedBillingMonth));
  };

  /* ==========================================================================
     DATABASE-DRIVEN METRICS & PRECISE BUSINESS RULES
     ========================================================================== */

  // 1. Total Customers
  const totalCustomersCount = customers.length;
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => !c.status || c.status === 'ACTIVE');
  }, [customers]);
  const activeCustomersCount = activeCustomers.length;
  const inactiveCustomersCount = totalCustomersCount - activeCustomersCount;
  const activeRatePct = totalCustomersCount > 0 ? Math.round((activeCustomersCount / totalCustomersCount) * 100) : 0;

  // 2. Eligible for This Month (Business Rule: M > Registration Month R)
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

  // 5. Total Collections (Payments Received)
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

  // 6. Pending Payments (Balance Outstanding)
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

  // 7. Skipped Customers Analysis (with database reasons)
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

      if (regMonth && selectedBillingMonth <= regMonth) {
        const nextMonth = getNextBillingMonth(regMonth);
        items.push({
          customer: c,
          category: 'NEW_REGISTRATION',
          reason: `Registered in ${regMonth} (${c.createdAt ? c.createdAt.slice(0, 10) : 'Current'}). Billing starts in ${nextMonth}. Excluded for ${selectedBillingMonth}.`,
          regMonth,
          nextEligibleMonth: nextMonth,
        });
      } else if (!isActive) {
        items.push({
          customer: c,
          category: 'INACTIVE_STATUS',
          reason: `Account status is ${c.status || 'INACTIVE'}. Only ACTIVE subscribers are billed.`,
          regMonth,
        });
      } else if (billedCustomerIds.has(c.id)) {
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

  const collectionPct =
    totalBilledAmount > 0 ? Math.min(100, Math.round((paymentsReceivedAmount / totalBilledAmount) * 100)) : 0;
  const generationPct =
    eligibleCustomersCount > 0 ? Math.min(100, Math.round((billsGeneratedCount / eligibleCustomersCount) * 100)) : 100;

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

  const selectedMonthExpenses = useMemo(() => {
    return expenses.filter((exp) => exp.date && exp.date.startsWith(selectedBillingMonth));
  }, [expenses, selectedBillingMonth]);

  const activeMonthExpense = useMemo(() => {
    const sum = selectedMonthExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    if (sum === 0 && isCurrentMonthSelected && monthlyCashFlow.totalExpense > 0) {
      return monthlyCashFlow.totalExpense;
    }
    return sum;
  }, [selectedMonthExpenses, isCurrentMonthSelected, monthlyCashFlow.totalExpense]);

  const activeMonthIncome = paymentsReceivedAmount > 0 ? paymentsReceivedAmount : monthlyCashFlow.totalIncome;
  const activeMonthNetSavings = activeMonthIncome - activeMonthExpense;
  const isNetPositive = activeMonthNetSavings >= 0;

  // Max value for cashflow chart
  const maxFlow = Math.max(...monthlyCashflowHistory.map((m) => Math.max(m.income, m.expense)), 1000);

  // SVG Area Chart Calculations for Cash Trajectory
  const trajectoryValues = netWorthHistory.map((n) => n.value);
  const rawMinVal = Math.min(...(trajectoryValues.length ? trajectoryValues : [0]));
  const rawMaxVal = Math.max(...(trajectoryValues.length ? trajectoryValues : [0]));
  const span = Math.max(Math.abs(rawMaxVal - rawMinVal), 50000);
  const minTrajVal = rawMinVal - span * 0.1;
  const maxTrajVal = rawMaxVal + span * 0.15;
  const trajPaddingY = 20;
  const trajSvgWidth = 500;
  const trajSvgHeight = 140;
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

  // Recent Customer Activity (Combine latest registrations and recent payments)
  const recentCustomerActivity = useMemo(() => {
    const activities: {
      id: string;
      customerName: string;
      boxNo: string;
      type: 'PAYMENT' | 'REGISTRATION';
      amount: number;
      date: string;
      status: string;
    }[] = [];

    // Monthly payments
    monthlyPayments.slice(0, 5).forEach((p) => {
      activities.push({
        id: `act-p-${p.id}`,
        customerName: p.customerName || 'Subscriber',
        boxNo: p.boxNo || '-',
        type: 'PAYMENT',
        amount: p.paidAmount || 0,
        date: p.paymentDate || p.createdAt || 'Recent',
        status: p.status,
      });
    });

    // Recent registered customers
    customers.slice(0, 3).forEach((c) => {
      activities.push({
        id: `act-c-${c.id}`,
        customerName: c.name,
        boxNo: c.boxNo,
        type: 'REGISTRATION',
        amount: c.paidAmount,
        date: c.createdAt ? c.createdAt.slice(0, 10) : 'Recent',
        status: c.status || 'ACTIVE',
      });
    });

    return activities.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [monthlyPayments, customers]);

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. DASHBOARD HEADER & BILLING MONTH SWITCHER */}
      {/* ==================================================================== */}
      <div className="erp-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Executive Dashboard
            </h1>
            <span className="badge-status badge-royal font-mono">
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>ERP 2026</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time subscriber billing, LKR collections, and multi-stream operational finance monitoring
          </p>
        </div>

        {/* Month Selector Capsule */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] p-1 rounded-xl shadow-xs">
            <button
              onClick={handlePrevMonth}
              title="Previous Billing Month"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <input
                type="month"
                value={selectedBillingMonth}
                onChange={(e) => e.target.value && setSelectedBillingMonth(e.target.value)}
                className="text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextMonth}
              title="Next Billing Month"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedBillingMonth(currentMonthStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isCurrentMonthSelected
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Current Month
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. THE 6 PRIMARY KPI CARDS (Requirements Item 4) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Customers */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className="erp-card p-4 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Total Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading ? <div className="h-8 w-16 skeleton" /> : totalCustomersCount}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>All registered boxes</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                Directory <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Active Customers */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className="erp-card p-4 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Active Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
              {isLoading ? <div className="h-8 w-16 skeleton" /> : activeCustomersCount}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{activeRatePct}% of total base</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* KPI 3: Inactive Customers */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className="erp-card p-4 hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Inactive Customers
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
              {isLoading ? <div className="h-8 w-16 skeleton" /> : inactiveCustomersCount}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Disconnected / Off</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">Review</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Monthly Bills */}
        <div
          onClick={() => onNavigateToTab('monthly-payment')}
          className="erp-card p-4 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Monthly Bills
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading ? <div className="h-8 w-20 skeleton" /> : formatCompactMoney(totalBilledAmount, currency)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{billsGeneratedCount} bills issued</span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{generationPct}%</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Total Collections */}
        <div
          onClick={() => onNavigateToTab('payment-collection')}
          className="erp-card p-4 hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Total Collections
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-teal-700 dark:text-teal-400 tracking-tight">
              {isLoading ? <div className="h-8 w-20 skeleton" /> : formatCompactMoney(paymentsReceivedAmount, currency)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{paymentsReceivedCount} payments</span>
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{collectionPct}%</span>
            </div>
          </div>
        </div>

        {/* KPI 6: Pending Payments */}
        <div
          onClick={() => onNavigateToTab('monthly-payment')}
          className="erp-card p-4 hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Payments
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
              {isLoading ? <div className="h-8 w-20 skeleton" /> : formatCompactMoney(paymentsPendingAmount, currency)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{paymentsPendingCount} pending dues</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">Collect</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2B. OPERATIONAL HEALTH BANNER & SKIPPED ACCOUNTS INSIGHT */}
      {/* ==================================================================== */}
      <div className="erp-card p-4 bg-gradient-to-r from-blue-50/60 via-slate-50 to-teal-50/60 dark:from-[#0B1220] dark:via-[#0F172A] dark:to-[#0B1720] border-blue-200/80 dark:border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm shadow-blue-600/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Subscriber Eligibility for {formatMonthLabel(selectedBillingMonth)}</span>
              <span className="badge-status badge-royal">{eligibleCustomersCount} Eligible</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Registration rule enforced: New subscribers registered in {selectedBillingMonth} are billed starting next
              month. {totalSkippedCount} accounts systematically accounted for.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSkippedModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors shadow-2xs cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Audit Excluded Accounts ({totalSkippedCount})</span>
          </button>

          <button
            onClick={() => onNavigateToTab('payment-collection')}
            className="btn-teal px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Field POS</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. REVENUE CHARTS & PAYMENT ANALYTICS (Requirements Item 4) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Cashflow History (Income vs Expense) */}
        <div className="erp-card p-5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.04] pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Revenue & Cash Flow Analytics</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">6 Months</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly revenue collections vs business operational overhead
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                <span className="text-slate-600 dark:text-slate-300">Revenue (Incomes)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span className="text-slate-600 dark:text-slate-300">Expenses</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="py-6">
            <div className="h-48 flex items-end justify-between gap-3 sm:gap-6 pt-6">
              {monthlyCashflowHistory.map((flow, idx) => {
                const incomeH = maxFlow > 0 ? (flow.income / maxFlow) * 100 : 0;
                const expenseH = maxFlow > 0 ? (flow.expense / maxFlow) * 100 : 0;
                const isHovered = hoveredFlowIdx === idx;

                return (
                  <div
                    key={flow.month}
                    onMouseEnter={() => setHoveredFlowIdx(idx)}
                    onMouseLeave={() => setHoveredFlowIdx(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-mono shadow-xl border border-slate-700 whitespace-nowrap">
                        <div>Rev: {formatMoney(flow.income, currency)}</div>
                        <div className="text-rose-400">Exp: {formatMoney(flow.expense, currency)}</div>
                      </div>
                    )}

                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        style={{ height: `${Math.max(incomeH, 4)}%` }}
                        className="w-1/2 max-w-[20px] bg-blue-600 hover:bg-blue-500 rounded-t-md transition-all"
                      />
                      <div
                        style={{ height: `${Math.max(expenseH, 4)}%` }}
                        className="w-1/2 max-w-[20px] bg-rose-500/80 hover:bg-rose-500 rounded-t-md transition-all"
                      />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 mt-2">
                      {flow.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Strip */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-white/[0.04] text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Month Net</span>
              <p
                className={`text-xs font-bold font-mono mt-0.5 ${
                  isNetPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {formatMoney(activeMonthNetSavings, currency)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Revenue</span>
              <p className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {formatMoney(activeMonthIncome, currency)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Overhead Expenses</span>
              <p className="text-xs font-bold font-mono text-rose-700 dark:text-rose-400 mt-0.5">
                {formatMoney(activeMonthExpense, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Chart 2: Reserve Trajectory & Expense Breakdown */}
        <div className="erp-card p-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cash Balance Trajectory</h2>
              <span className="badge-status badge-teal font-mono">
                {formatCompactMoney(netWorth, currency)}
              </span>
            </div>

            {/* SVG Area Chart */}
            <div className="relative pt-4">
              <svg viewBox={`0 0 ${trajSvgWidth} ${trajSvgHeight}`} className="w-full h-28 overflow-visible">
                <defs>
                  <linearGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {areaD && <path d={areaD} fill="url(#trajGrad)" />}
                {pathD && <path d={pathD} fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />}
                {trajPoints.map((pt, i) => (
                  <circle
                    key={pt.month}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPointIdx === i ? 5 : 3}
                    className="fill-white stroke-teal-600 stroke-2 cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPointIdx(i)}
                    onMouseLeave={() => setHoveredPointIdx(null)}
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* Top Expense Categories Breakdown */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-900 dark:text-white">Top Expense Allocations</span>
              <span className="text-[10px] text-slate-400 font-mono">Current Spend</span>
            </div>

            <div className="space-y-2">
              {topExpenseCategories.length > 0 ? (
                topExpenseCategories.slice(0, 3).map((cat) => (
                  <div key={cat.categoryName} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 truncate">{cat.categoryName}</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {formatMoney(cat.amount, currency)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color || '#1D4ED8' }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 py-3 text-center">No expenses recorded for this month</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. RECENT TRANSACTIONS & CUSTOMER ACTIVITY (Requirements Item 4) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Transactions Table */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Financial Transactions</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table text-xs">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentIncomes.length === 0 && recentExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No recent transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  [
                    ...recentIncomes.slice(0, 3).map((i) => ({ ...i, txType: 'INCOME' as const })),
                    ...recentExpenses.slice(0, 3).map((e) => ({ ...e, txType: 'EXPENSE' as const })),
                  ]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 5)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td>
                          <span
                            className={`badge-status ${
                              item.txType === 'INCOME' ? 'badge-success' : 'badge-danger'
                            }`}
                          >
                            {item.txType}
                          </span>
                        </td>
                        <td className="font-medium text-slate-900 dark:text-white max-w-[140px] truncate">
                          {item.description}
                        </td>
                        <td className="text-slate-500 font-mono text-[11px]">{item.paymentMethod || 'CASH'}</td>
                        <td className="text-slate-500 font-mono text-[11px]">{item.date}</td>
                        <td
                          className={`text-right font-mono font-bold ${
                            item.txType === 'INCOME'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {item.txType === 'INCOME' ? '+' : '-'} {formatMoney(item.amount, currency)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Subscriber Activity Feed */}
        <div className="erp-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Subscriber Activity</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('customers')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Subscribers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentCustomerActivity.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No recent customer activity found.</div>
            ) : (
              recentCustomerActivity.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onNavigateToTab('customer-history')}
                  className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        act.type === 'PAYMENT'
                          ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {act.type === 'PAYMENT' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {act.customerName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Box #{act.boxNo}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {act.type === 'PAYMENT' ? 'Monthly Bill Payment' : 'New Customer Registered'} • {act.date}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                      {formatMoney(act.amount, currency)}
                    </div>
                    <span
                      className={`badge-status text-[9px] ${
                        act.status === 'PAID' || act.status === 'ACTIVE'
                          ? 'badge-success'
                          : act.status === 'PARTIAL'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {act.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. SKIPPED CUSTOMERS AUDIT MODAL (Preserved 100% of business logic) */}
      {/* ==================================================================== */}
      {isSkippedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Excluded & Skipped Accounts Audit ({totalSkippedCount})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Systematic database reasons for subscriber exclusion in {formatMonthLabel(selectedBillingMonth)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSkippedModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] space-y-3 bg-white dark:bg-[#0F172A]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSkippedFilterTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    skippedFilterTab === 'ALL'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Reasons ({totalSkippedCount})
                </button>
                <button
                  onClick={() => setSkippedFilterTab('NEW_REGISTRATION')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    skippedFilterTab === 'NEW_REGISTRATION'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  New Registrations ({skippedNewRegCount})
                </button>
                <button
                  onClick={() => setSkippedFilterTab('INACTIVE_STATUS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    skippedFilterTab === 'INACTIVE_STATUS'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Inactive Status ({skippedInactiveCount})
                </button>
                <button
                  onClick={() => setSkippedFilterTab('ALREADY_BILLED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    skippedFilterTab === 'ALREADY_BILLED'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Already Billed ({skippedAlreadyBilledCount})
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={skippedSearchTerm}
                  onChange={(e) => setSkippedSearchTerm(e.target.value)}
                  placeholder="Filter by customer name, box #, or telephone..."
                  className="erp-input pl-9 text-xs"
                />
              </div>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSkippedList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No excluded accounts match your query.</div>
              ) : (
                filteredSkippedList.map((item, idx) => (
                  <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.customer.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Box #{item.customer.boxNo}
                        </span>
                        <span className="text-[11px] text-slate-400">{item.customer.phoneNo}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {item.reason}
                      </p>
                    </div>

                    <span
                      className={`badge-status text-[9px] shrink-0 ${
                        item.category === 'NEW_REGISTRATION'
                          ? 'badge-royal'
                          : item.category === 'INACTIVE_STATUS'
                          ? 'badge-warning'
                          : 'badge-teal'
                      }`}
                    >
                      {item.category.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setIsSkippedModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
