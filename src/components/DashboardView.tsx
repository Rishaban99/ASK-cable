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
  LayoutGrid,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Spinner } from './Spinner.tsx';
import { useToast } from './Toast.js';

interface DashboardViewProps {
  analytics: AnalyticsOverview | null;
  currency: SupportedCurrency;
  onOpenRecordModal: () => void;
  onNavigateToTab: (tab: 'dashboard' | 'transactions' | 'customers' | 'monthly-payment' | 'customer-history' | 'payment-collection' | 'summary' | 'settings') => void;
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
  const [skippedFilterTab, setSkippedFilterTab] = useState<'ALL' | 'NEW_REGISTRATION' | 'INACTIVE_STATUS' | 'ALREADY_BILLED'>('ALL');

  // Mobile Screening vs Super Cards View Mode
  const [mobileViewMode, setMobileViewMode] = useState<'SCREENING' | 'GRID'>('SCREENING');
  const [activeScreenSlide, setActiveScreenSlide] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swiped left -> Next slide
        setActiveScreenSlide((prev) => (prev < 3 ? prev + 1 : 0));
      } else {
        // Swiped right -> Previous slide
        setActiveScreenSlide((prev) => (prev > 0 ? prev - 1 : 3));
      }
    }
    setTouchStartX(null);
  };

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

  /* ==========================================================================
     MONTHLY CASH FLOW & EXPENSES DYNAMICALLY LINKED TO SELECTED BILLING MONTH
     ========================================================================== */
  // 1. Incomes for selected billing month
  const selectedMonthLedgerIncomes = useMemo(() => {
    return incomes.filter((inc) => {
      if (inc.date && inc.date.startsWith(selectedBillingMonth)) return true;
      if (inc.tags && inc.tags.includes(selectedBillingMonth)) return true;
      return false;
    });
  }, [incomes, selectedBillingMonth]);

  // Check if monthly cable receipts are already recorded in ledger incomes
  const hasCableIncomesInLedger = useMemo(() => {
    return selectedMonthLedgerIncomes.some(
      (inc) => inc.tags && (inc.tags.includes('monthly-fee') || inc.tags.includes(selectedBillingMonth))
    );
  }, [selectedMonthLedgerIncomes, selectedBillingMonth]);

  // Cable fee receipts from monthlyPayments for this selected month (if not already recorded in income ledger)
  const directCablePaymentsIncome = !hasCableIncomesInLedger ? paymentsReceivedAmount : 0;
  const directCablePaymentsCount = !hasCableIncomesInLedger ? paymentsReceivedCount : 0;

  const activeMonthIncome = useMemo(() => {
    const ledgerSum = selectedMonthLedgerIncomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const total = ledgerSum + directCablePaymentsIncome;
    if (total === 0 && isCurrentMonthSelected && monthlyCashFlow.totalIncome > 0) {
      return monthlyCashFlow.totalIncome;
    }
    return total;
  }, [selectedMonthLedgerIncomes, directCablePaymentsIncome, isCurrentMonthSelected, monthlyCashFlow.totalIncome]);

  const activeMonthIncomeCount = useMemo(() => {
    const count = selectedMonthLedgerIncomes.length + directCablePaymentsCount;
    if (count === 0 && isCurrentMonthSelected && monthlyCashFlow.incomeTransactionsCount > 0) {
      return monthlyCashFlow.incomeTransactionsCount;
    }
    return count;
  }, [selectedMonthLedgerIncomes, directCablePaymentsCount, isCurrentMonthSelected, monthlyCashFlow.incomeTransactionsCount]);

  // 2. Expenses for selected billing month
  const selectedMonthExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      return exp.date && exp.date.startsWith(selectedBillingMonth);
    });
  }, [expenses, selectedBillingMonth]);

  const activeMonthExpense = useMemo(() => {
    const sum = selectedMonthExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    if (sum === 0 && isCurrentMonthSelected && monthlyCashFlow.totalExpense > 0) {
      return monthlyCashFlow.totalExpense;
    }
    return sum;
  }, [selectedMonthExpenses, isCurrentMonthSelected, monthlyCashFlow.totalExpense]);

  const activeMonthExpenseCount = useMemo(() => {
    const count = selectedMonthExpenses.length;
    if (count === 0 && isCurrentMonthSelected && monthlyCashFlow.expenseTransactionsCount > 0) {
      return monthlyCashFlow.expenseTransactionsCount;
    }
    return count;
  }, [selectedMonthExpenses, isCurrentMonthSelected, monthlyCashFlow.expenseTransactionsCount]);

  // 3. Net Savings & Rate for selected billing month
  const activeMonthNetSavings = activeMonthIncome - activeMonthExpense;
  const activeMonthSavingsRatePct = activeMonthIncome > 0
    ? Number(((activeMonthNetSavings / activeMonthIncome) * 100).toFixed(1))
    : 0;
  const isActiveNetSavingsPositive = activeMonthNetSavings >= 0;

  // 4. Top Expense Categories for selected billing month
  const activeMonthTopExpenseCategories = useMemo(() => {
    if (selectedMonthExpenses.length === 0) {
      return isCurrentMonthSelected ? topExpenseCategories : [];
    }

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const catSpend: Record<string, number> = {};

    selectedMonthExpenses.forEach((exp) => {
      catSpend[exp.categoryId] = (catSpend[exp.categoryId] || 0) + exp.amount;
    });

    return Object.entries(catSpend)
      .map(([catId, amount]) => {
        const cat = catMap.get(catId);
        return {
          categoryName: cat ? cat.name : 'Other',
          color: cat ? cat.color : '#64748B',
          amount,
          percentage: activeMonthExpense > 0
            ? Number(((amount / activeMonthExpense) * 100).toFixed(1))
            : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [categories, selectedMonthExpenses, activeMonthExpense, isCurrentMonthSelected, topExpenseCategories]);

  const isNetSavingsPositive = isActiveNetSavingsPositive;

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
    <div className="mx-auto max-w-7xl px-2.5 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-5">
      {/* Editorial Page Lead */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">ASK Cable Financial Dashboard</h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
              <Sparkles className="w-2.5 h-2.5" />
              <span>v18 Pro</span>
            </span>
          </div>
          <p className="hidden sm:block text-xs text-neutral-400 mt-0.5">
            Real-time subscriber billing operations, customer eligibility, and multi-stream cashflow monitoring in Sri Lankan Rupees (LKR)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-medium backdrop-blur-md">
              <Spinner size="sm" />
              <span>Syncing live...</span>
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenRecordModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 rounded-xl hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction</span>
          </motion.button>
        </div>
      </div>

      {/* ==========================================================================
          SECTION 1: DASHBOARD STATUS CARDS & BILLING MONTH SELECTOR
          ========================================================================== */}
      <div className="space-y-2 sm:space-y-3">
        {/* Month Selector Bar & Operational Status Header */}
        <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800/80 p-3 sm:p-3.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                  <span>Billing & Customer Status</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-emerald-400 font-mono font-bold">{formatMonthLabel(selectedBillingMonth)}</span>
                </h2>
                <p className="hidden sm:block text-[11px] text-neutral-400 mt-0.5">
                  Accurate database-driven metrics for customer eligibility, billing generation, and collections
                </p>
              </div>
            </div>
          </div>

          {/* Floating Capsule Month Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center bg-neutral-950/70 border border-neutral-800 p-1 rounded-xl shadow-inner">
              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={handlePrevMonth}
                title="Previous Billing Month"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>

              <input
                type="month"
                value={selectedBillingMonth}
                onChange={(e) => e.target.value && setSelectedBillingMonth(e.target.value)}
                className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-transparent text-white focus:outline-none focus:bg-neutral-800/90 transition-colors cursor-pointer"
              />

              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={handleNextMonth}
                title="Next Billing Month"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            {!isCurrentMonthSelected && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => setSelectedBillingMonth(currentMonthStr)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all shadow-xs"
              >
                Current
              </motion.button>
            )}
          </div>
        </div>

        {/* Mobile View Mode Switcher (Screening vs Super Cards) */}
        <div className="sm:hidden flex items-center justify-between backdrop-blur-xl bg-neutral-900/80 border border-neutral-800/80 p-2 rounded-2xl shadow-md">
          <div className="flex items-center gap-1.5 px-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-wide">Mobile View</span>
          </div>
          <div className="relative flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setMobileViewMode('SCREENING')}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mobileViewMode === 'SCREENING' ? 'text-neutral-950' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {mobileViewMode === 'SCREENING' && (
                <motion.div
                  layoutId="mobileViewModePill"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="absolute inset-0 bg-emerald-400 rounded-lg -z-10 shadow-sm"
                />
              )}
              <Layers className="w-3.5 h-3.5" />
              <span>Screening</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileViewMode('GRID')}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mobileViewMode === 'GRID' ? 'text-neutral-950' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {mobileViewMode === 'GRID' && (
                <motion.div
                  layoutId="mobileViewModePill"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="absolute inset-0 bg-emerald-400 rounded-lg -z-10 shadow-sm"
                />
              )}
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            MOBILE SCREENING CAROUSEL (Active when mobileViewMode === 'SCREENING')
            ========================================================================= */}
        {mobileViewMode === 'SCREENING' && (
          <div
            className="sm:hidden space-y-2.5 select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              {/* Screen 1 of 4: Monthly Finances */}
              {activeScreenSlide === 0 && (
                <motion.div
                  key="slide-0"
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="p-4 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-emerald-950/30 via-neutral-900/90 to-neutral-900/90 border border-emerald-500/30 shadow-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Monthly Finances
                        </h4>
                        <span className="text-[11px] font-mono text-emerald-400 font-medium">
                          {formatMonthLabel(selectedBillingMonth)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-neutral-300">
                      Screen 1 / 4
                    </span>
                  </div>

                  {/* Hero Net Metric */}
                  <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800/90">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Net Surplus / Deficit
                    </span>
                    <div className={`mt-1 text-2xl font-black font-mono tabular-nums leading-tight ${
                      isActiveNetSavingsPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isActiveNetSavingsPositive ? '+' : ''}{formatMoney(activeMonthNetSavings, currency)}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Savings Rate:</span>
                      <span className="font-mono font-bold text-white bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-lg text-[11px]">
                        {activeMonthSavingsRatePct}%
                      </span>
                    </div>
                  </div>

                  {/* Inflow vs Expense Sub-cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 uppercase">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Income Inflow</span>
                      </div>
                      <div className="mt-1.5 text-sm font-black text-emerald-400 font-mono tabular-nums truncate">
                        +{formatMoney(activeMonthIncome, currency)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-400 font-mono">
                        {activeMonthIncomeCount} rev. trans.
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-300 uppercase">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        <span>Expenses</span>
                      </div>
                      <div className="mt-1.5 text-sm font-black text-rose-400 font-mono tabular-nums truncate">
                        -{formatMoney(activeMonthExpense, currency)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-400 font-mono">
                        {activeMonthExpenseCount} deductions
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={onOpenRecordModal}
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Transaction</span>
                  </motion.button>
                </motion.div>
              )}

              {/* Screen 2 of 4: Subscribers Overview */}
              {activeScreenSlide === 1 && (
                <motion.div
                  key="slide-1"
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="p-4 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-cyan-950/30 via-neutral-900/90 to-neutral-900/90 border border-cyan-500/30 shadow-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Subscribers Overview
                        </h4>
                        <span className="text-[11px] font-mono text-cyan-400 font-medium">
                          {totalCustomersCount} Total Registered
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-neutral-300">
                      Screen 2 / 4
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/25">
                      <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                        Active Subscribers
                      </span>
                      <div className="mt-1.5 text-2xl font-black text-white font-mono leading-none">
                        {activeCustomersCount}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        Active connections
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                        Eligible This Month
                      </span>
                      <div className="mt-1.5 text-2xl font-black text-emerald-400 font-mono leading-none">
                        {eligibleCustomersCount}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block truncate">
                        Ready for {formatMonthLabel(selectedBillingMonth).split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Skipped Banner */}
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <UserX className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-purple-300 block">
                          Skipped Customers: {totalSkippedCount}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Bypassed in bulk bill generation
                        </span>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={() => setIsSkippedModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold border border-purple-500/30 flex items-center gap-1 shrink-0"
                    >
                      <span>Reasons</span>
                      <ArrowRight className="w-3 h-3" />
                    </motion.button>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => onNavigateToTab('customers')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-500/20"
                  >
                    <Users className="w-4 h-4" />
                    <span>Manage All Customers</span>
                  </motion.button>
                </motion.div>
              )}

              {/* Screen 3 of 4: Monthly Billing Pipeline */}
              {activeScreenSlide === 2 && (
                <motion.div
                  key="slide-2"
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="p-4 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-blue-950/30 via-neutral-900/90 to-neutral-900/90 border border-blue-500/30 shadow-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Billing Pipeline
                        </h4>
                        <span className="text-[11px] font-mono text-blue-400 font-medium">
                          {formatMonthLabel(selectedBillingMonth)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-neutral-300">
                      Screen 3 / 4
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25">
                      <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                        Bills Generated
                      </span>
                      <div className="mt-1.5 text-2xl font-black text-white font-mono leading-none">
                        {billsGeneratedCount}
                      </div>
                      <span className="text-[10px] text-blue-300 font-mono mt-1 block truncate">
                        Billed: {formatMoney(totalBilledAmount, currency)}
                      </span>
                    </div>

                    <div className={`p-3 rounded-2xl ${
                      billsPendingCount > 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    } border`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        Bills Pending
                      </span>
                      <div className="mt-1.5 text-2xl font-black font-mono leading-none">
                        {billsPendingCount}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        {billsPendingCount === 0 ? '✓ Complete' : '⚠️ Awaiting'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-neutral-400">Generation Progress</span>
                      <span className="text-blue-400 font-bold">{generationPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div style={{ width: `${generationPct}%` }} className="h-full bg-blue-500 rounded-full transition-all duration-500" />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => onNavigateToTab('monthly-payment')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-blue-400 hover:bg-blue-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Open Monthly Bills</span>
                  </motion.button>
                </motion.div>
              )}

              {/* Screen 4 of 4: Payment Collections */}
              {activeScreenSlide === 3 && (
                <motion.div
                  key="slide-3"
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="p-4 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-emerald-950/30 via-neutral-900/90 to-neutral-900/90 border border-emerald-500/30 shadow-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Payment Collections
                        </h4>
                        <span className="text-[11px] font-mono text-emerald-400 font-medium">
                          {formatMonthLabel(selectedBillingMonth)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-neutral-300">
                      Screen 4 / 4
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                        Payments Received
                      </span>
                      <div className="mt-1.5 text-sm font-black text-emerald-400 font-mono tabular-nums leading-none truncate">
                        +{formatMoney(paymentsReceivedAmount, currency)}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        {paymentsReceivedCount} paid records
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25">
                      <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                        Balance Due
                      </span>
                      <div className="mt-1.5 text-sm font-black text-rose-400 font-mono tabular-nums leading-none truncate">
                        {formatMoney(paymentsPendingAmount, currency)}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        {unpaidBillsCount} unpaid bills
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-neutral-400">Recovery Rate</span>
                      <span className="text-emerald-400 font-bold">{collectionPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div style={{ width: `${collectionPct}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500" />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => onNavigateToTab('payment-collection')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Collect Payments Now</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Carousel Screening Navigation Strip with Gliding Spring Pill */}
            <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800/80 p-2 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center justify-between gap-1">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  type="button"
                  onClick={() => setActiveScreenSlide((prev) => (prev > 0 ? prev - 1 : 3))}
                  className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 transition-colors"
                  title="Previous Screen"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>

                <div className="relative flex items-center gap-1 bg-neutral-950/80 p-1 rounded-xl border border-neutral-800">
                  {[
                    { label: 'Finances' },
                    { label: 'Subscribers' },
                    { label: 'Billing' },
                    { label: 'Collections' },
                  ].map((tab, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveScreenSlide(idx)}
                      className={`relative z-10 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        activeScreenSlide === idx
                          ? 'text-neutral-950'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {activeScreenSlide === idx && (
                        <motion.div
                          layoutId="carouselTabIndicator"
                          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                          className="absolute inset-0 bg-emerald-400 rounded-lg -z-10 shadow-sm"
                        />
                      )}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.88 }}
                  type="button"
                  onClick={() => setActiveScreenSlide((prev) => (prev < 3 ? prev + 1 : 0))}
                  className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 transition-colors"
                  title="Next Screen"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* iOS 18 Pagination Dots */}
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveScreenSlide(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeScreenSlide === idx
                        ? 'w-6 bg-emerald-400'
                        : 'w-1.5 bg-neutral-700 hover:bg-neutral-600'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SUPER CARDS GRID: Active when mobileViewMode === 'GRID' on mobile,
            AND ALWAYS VISIBLE on Desktop (hidden sm:grid)
            ========================================================================= */}
        <div className={`${mobileViewMode === 'GRID' ? 'grid' : 'hidden sm:grid'} grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5`}>
          {/* Card 1: Total Active Customers */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-cyan-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-cyan-500/50 shadow-sm hover:shadow-cyan-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 truncate">
                  Active Customers
                </span>
                <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums leading-none">
                  {activeCustomersCount}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-1 truncate">
                  {totalCustomersCount} total registered
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 font-mono text-[9px]">Active</span>
              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5 transition-colors shrink-0"
              >
                <span>Manage</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </motion.div>

          {/* Card 2: Eligible for This Month */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-emerald-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-emerald-500/50 shadow-sm hover:shadow-emerald-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 truncate">
                  Eligible This Month
                </span>
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tabular-nums leading-none">
                  {eligibleCustomersCount}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-1 truncate">
                  Ready for {formatMonthLabel(selectedBillingMonth).split(' ')[0]}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-emerald-400/90 font-mono text-[9px] font-semibold">
                {activeCustomersCount > 0 ? Math.round((eligibleCustomersCount / activeCustomersCount) * 100) : 0}% active
              </span>
              <button
                type="button"
                onClick={() => toast.info(`Eligible Rule: Customers registered in or after ${formatMonthLabel(selectedBillingMonth).split(' ')[0]} are excluded.`)}
                className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 dark:bg-neutral-800/90 dark:hover:bg-neutral-750 dark:text-neutral-200 dark:border-neutral-700/80 transition-colors shrink-0 cursor-pointer shadow-xs active:scale-95"
                title="Customers registered in or after selected month excluded"
              >
                <Info className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Rule</span>
              </button>
            </div>
          </motion.div>

          {/* Card 3: Bills Generated */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-blue-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-blue-500/50 shadow-sm hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 truncate">
                  Bills Generated
                </span>
                <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums leading-none">
                  {billsGeneratedCount}
                </div>
                <div className="text-[10px] text-blue-300 font-mono mt-1 truncate" title={`Total Billed: ${formatMoney(totalBilledAmount, currency)}`}>
                  Billed: {formatMoney(totalBilledAmount, currency)}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 font-mono text-[9px] font-semibold">{generationPct}% done</span>
              <button
                onClick={() => onNavigateToTab('monthly-payment')}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 transition-colors shrink-0"
              >
                <span>Bills</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </motion.div>

          {/* Card 4: Bills Pending */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className={`p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br ${
              billsPendingCount > 0
                ? 'from-amber-950/20 via-neutral-900/90 to-neutral-900/90 border-neutral-800/80 hover:border-amber-500/50'
                : 'from-emerald-950/20 via-neutral-900/90 to-neutral-900/90 border-neutral-800/80 hover:border-emerald-500/50'
            } border shadow-sm transition-all flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                  billsPendingCount > 0 ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  Bills Pending
                </span>
                <div className={`p-1 rounded-lg ${billsPendingCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-2">
                <div className={`text-xl sm:text-2xl font-black font-mono tabular-nums leading-none ${
                  billsPendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {billsPendingCount}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-1 truncate">
                  {billsPendingCount === 0 ? 'All bills created' : 'Awaiting creation'}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              {billsPendingCount > 0 ? (
                <>
                  <span className="text-amber-400 font-mono font-semibold text-[9px]">Pending</span>
                  <button
                    onClick={() => onNavigateToTab('monthly-payment')}
                    className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-0.5 transition-colors shrink-0"
                  >
                    <span>Generate</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </>
              ) : (
                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-0.5 text-[9px]">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Complete
                </span>
              )}
            </div>
          </motion.div>

          {/* Card 5: Payments Received */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-emerald-950/25 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-emerald-500/50 shadow-sm hover:shadow-emerald-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 truncate">
                  Payments Received
                </span>
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-2">
                <div
                  className="text-sm sm:text-lg font-black text-emerald-400 font-mono tabular-nums leading-none truncate"
                  title={`+${formatMoney(paymentsReceivedAmount, currency)}`}
                >
                  +{formatMoney(paymentsReceivedAmount, currency)}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-1 truncate">
                  {paymentsReceivedCount} paid records
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800/80 space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono font-semibold">
                <span className="text-neutral-400">Rate:</span>
                <span className="text-emerald-400">{collectionPct}%</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div style={{ width: `${collectionPct}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500" />
              </div>
            </div>
          </motion.div>

          {/* Card 6: Payments Pending */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-rose-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-rose-500/50 shadow-sm hover:shadow-rose-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 truncate">
                  Payments Pending
                </span>
                <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-2">
                <div
                  className="text-sm sm:text-lg font-black text-rose-400 font-mono tabular-nums leading-none truncate"
                  title={formatMoney(paymentsPendingAmount, currency)}
                >
                  {formatMoney(paymentsPendingAmount, currency)}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-1 truncate">
                  {paymentsPendingCount} balance bills
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 font-mono text-[9px] font-semibold">{unpaidBillsCount} unpaid</span>
              <button
                onClick={() => onNavigateToTab('payment-collection')}
                className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-0.5 transition-colors shrink-0"
              >
                <span>Collect</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </motion.div>

          {/* Card 7: Skipped Customers (spans 2-col on mobile for balanced grid) */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="col-span-2 md:col-span-1 lg:col-span-1 p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-purple-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-purple-500/50 shadow-sm hover:shadow-purple-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 truncate">
                  Skipped Customers
                </span>
                <div className="p-1 rounded-lg bg-purple-500/10 text-purple-400">
                  <UserX className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono tabular-nums leading-none">
                  {totalSkippedCount}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-1 truncate">
                  Bypassed in bulk bill generation
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
              <span className="text-purple-400 font-mono text-[9px] font-bold">{totalSkippedCount} Skipped</span>
              <button
                type="button"
                onClick={() => setIsSkippedModalOpen(true)}
                className="text-purple-300 hover:text-purple-200 font-bold flex items-center gap-0.5 bg-purple-500/20 hover:bg-purple-500/30 px-2 py-0.5 rounded-lg border border-purple-500/30 transition-colors shrink-0"
              >
                <span>Reasons</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ==========================================================================
          MODAL: SKIPPED CUSTOMERS REASONS & BREAKDOWN
          ========================================================================== */}
      <AnimatePresence>
        {isSkippedModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className="backdrop-blur-2xl bg-neutral-900/95 border border-neutral-800/90 rounded-t-3xl sm:rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/90">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>Skipped Customers — {formatMonthLabel(selectedBillingMonth)}</span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {totalSkippedCount} Total
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Accurate, database-driven reasons why these customer accounts are bypassed during bulk bill generation.
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setIsSkippedModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Reason Category Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSkippedFilterTab('ALL')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        skippedFilterTab === 'ALL'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                          : 'bg-neutral-800/80 text-neutral-300 border-neutral-700/80 hover:bg-neutral-750'
                      }`}
                    >
                      All ({totalSkippedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkippedFilterTab('NEW_REGISTRATION')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        skippedFilterTab === 'NEW_REGISTRATION'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                          : 'bg-neutral-800/80 text-neutral-300 border-neutral-700/80 hover:bg-neutral-750'
                      }`}
                    >
                      New Registration ({skippedNewRegCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkippedFilterTab('INACTIVE_STATUS')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        skippedFilterTab === 'INACTIVE_STATUS'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                          : 'bg-neutral-800/80 text-neutral-300 border-neutral-700/80 hover:bg-neutral-750'
                      }`}
                    >
                      Inactive / Disconnected ({skippedInactiveCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkippedFilterTab('ALREADY_BILLED')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        skippedFilterTab === 'ALREADY_BILLED'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                          : 'bg-neutral-800/80 text-neutral-300 border-neutral-700/80 hover:bg-neutral-750'
                      }`}
                    >
                      Already Billed ({skippedAlreadyBilledCount})
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={skippedSearchTerm}
                      onChange={(e) => setSkippedSearchTerm(e.target.value)}
                      placeholder="Search Box No, Name, Phone..."
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-neutral-700/80 bg-neutral-950/70 text-white placeholder-neutral-400 focus:outline-none focus:border-purple-400 font-mono"
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
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                  <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-white">Business Rule:</strong> Customers registering in month <span className="font-mono font-bold text-purple-300">{selectedBillingMonth}</span> are excluded from billing for their registration month and earlier months. Billing begins in the subsequent month.
                  </p>
                </div>
              </div>

              {/* Modal Body / Customer Table */}
              <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-800/80">
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
                          className="p-3.5 rounded-2xl bg-neutral-950/50 border border-neutral-800/80 hover:border-neutral-700/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          {/* Customer Identification */}
                          <div className="space-y-1 min-w-[220px]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white bg-neutral-800 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                                Box #{customer.boxNo}
                              </span>
                              <span className="font-bold text-white text-sm truncate">
                                {customer.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
                              <span>Phone: {customer.phoneNo || 'N/A'}</span>
                              {customer.nicNo && <span>· NIC: {customer.nicNo}</span>}
                            </div>
                          </div>

                          {/* Customer Status & Reg Date */}
                          <div className="flex items-center gap-2 min-w-[160px] text-[11px] font-mono">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg font-semibold border ${
                                customer.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {customer.status || 'ACTIVE'}
                            </span>
                            <span className="text-neutral-400">
                              Reg: {customer.createdAt ? customer.createdAt.slice(0, 10) : (item.regMonth || 'N/A')}
                            </span>
                          </div>

                          {/* Skipped Reason Callout */}
                          <div className="flex-1 min-w-[260px]">
                            <div
                              className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                                category === 'NEW_REGISTRATION'
                                  ? 'bg-purple-500/10 text-purple-200 border-purple-500/25'
                                  : category === 'INACTIVE_STATUS'
                                  ? 'bg-rose-500/10 text-rose-200 border-rose-500/25'
                                  : 'bg-blue-500/10 text-blue-200 border-blue-500/25'
                              }`}
                            >
                              <span
                                className={`font-bold uppercase tracking-wider block text-[10px] mb-0.5 ${
                                  category === 'NEW_REGISTRATION'
                                    ? 'text-purple-300'
                                    : category === 'INACTIVE_STATUS'
                                    ? 'text-rose-300'
                                    : 'text-blue-300'
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
              <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/90 flex items-center justify-between text-xs text-neutral-400">
                <span>Showing {filteredSkippedList.length} of {totalSkippedCount} skipped customers</span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setIsSkippedModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white border border-neutral-700/80 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================================================
          SECTION 2: FINANCIAL METRICS OVERVIEW (LINKED TO MONTH SELECTOR)
          - Hidden on mobile during SCREENING mode (since Screen 1 is Monthly Finances)
          - Unified Master Financial Card on mobile in GRID mode
          - 3-Column spacious layout on desktop (sm+)
          ========================================================================== */}
      <div className={`${mobileViewMode === 'SCREENING' ? 'hidden sm:block' : 'block'} space-y-2.5 sm:space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Financial Overview
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              {formatMonthLabel(selectedBillingMonth)}
            </span>
          </div>
          {!isCurrentMonthSelected && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
              Filtered
            </span>
          )}
        </div>

        {/* Mobile Unified Financial Card (Visible only in GRID mode on mobile) */}
        <motion.div
          whileHover={{ y: -2 }}
          className="sm:hidden p-4 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-emerald-950/25 via-neutral-900/90 to-neutral-900/90 border border-emerald-500/30 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              <Receipt className="w-3.5 h-3.5 text-indigo-400" />
              <span>Net Surplus / Deficit</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Rate: {activeMonthSavingsRatePct}%
            </span>
          </div>
          <div>
            <div className={`text-2xl font-black font-mono tabular-nums leading-tight ${
              isActiveNetSavingsPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isActiveNetSavingsPositive ? '+' : ''}{formatMoney(activeMonthNetSavings, currency)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-800/80">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 uppercase">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Income Inflow</span>
              </div>
              <div className="text-xs font-black text-emerald-400 font-mono tabular-nums mt-1 truncate">
                +{formatMoney(activeMonthIncome, currency)}
              </div>
              <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">{activeMonthIncomeCount} rev. trans.</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-300 uppercase">
                <TrendingDown className="w-3 h-3 text-rose-400" />
                <span>Expenses</span>
              </div>
              <div className="text-xs font-black text-rose-400 font-mono tabular-nums mt-1 truncate">
                -{formatMoney(activeMonthExpense, currency)}
              </div>
              <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">{activeMonthExpenseCount} deductions</span>
            </div>
          </div>
        </motion.div>

        {/* Desktop 3-Card Grid (sm+) */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-3">
          {/* Metric 2: Monthly Income Inflow */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-emerald-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-emerald-500/50 shadow-md hover:shadow-emerald-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 truncate">
                  Monthly Income Inflow
                </span>
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-emerald-400 font-mono tabular-nums leading-none">
                +{formatMoney(activeMonthIncome, currency)}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 font-mono tabular-nums flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
              <span>{activeMonthIncomeCount} revenue transactions</span>
            </div>
          </motion.div>

          {/* Metric 3: Monthly Expenses */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-rose-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-rose-500/50 shadow-md hover:shadow-rose-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 truncate">
                  Monthly Expenses
                </span>
                <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-rose-400 font-mono tabular-nums leading-none">
                -{formatMoney(activeMonthExpense, currency)}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 font-mono tabular-nums flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block shadow-sm" />
              <span>{activeMonthExpenseCount} expense deductions</span>
            </div>
          </motion.div>

          {/* Metric 4: Net Savings & Rate */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-indigo-950/20 via-neutral-900/90 to-neutral-900/90 border border-neutral-800/80 hover:border-indigo-500/50 shadow-md hover:shadow-indigo-500/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 truncate">
                  Surplus / Deficit
                </span>
                <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tracking-tight font-mono tabular-nums leading-none ${
                  isActiveNetSavingsPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isActiveNetSavingsPositive ? '+' : ''}{formatMoney(activeMonthNetSavings, currency)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center gap-2 text-[11px] text-neutral-300">
              <span className="font-mono tabular-nums font-bold text-white bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-lg text-[10px]">
                {activeMonthSavingsRatePct}%
              </span>
              <span className="text-neutral-400 truncate">savings rate ({formatMonthLabel(selectedBillingMonth)})</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Section: Expense Categories Breakdown & Cash Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. Category Expense Allocation */}
        <div className="p-5 sm:p-6 rounded-3xl backdrop-blur-xl bg-neutral-900/80 border border-neutral-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3.5">
              <div>
                <h2 className="text-base font-bold text-white">Top Expense Categories</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Distribution of {formatMonthLabel(selectedBillingMonth)} operational expenditure</p>
              </div>
              <div className="p-2 rounded-xl bg-neutral-800/80 text-neutral-400">
                <PieIcon className="w-4 h-4" />
              </div>
            </div>

            {activeMonthTopExpenseCategories.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No expense transactions recorded for {formatMonthLabel(selectedBillingMonth)}.
              </div>
            ) : (
              <div className="pt-4 space-y-3.5">
                {activeMonthTopExpenseCategories.map((c, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: c.color }}
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                        />
                        <span className="font-semibold text-white">{c.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-white font-bold">{formatMoney(c.amount, currency)}</span>
                        <span className="text-neutral-400 text-[11px] w-12 text-right">{c.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-neutral-800/80 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                        className="h-full rounded-full transition-all duration-500 shadow-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span>Total Operational Spend ({formatMonthLabel(selectedBillingMonth)}):</span>
            <span className="font-mono tabular-nums text-white font-bold text-sm">
              {formatMoney(activeMonthExpense, currency)}
            </span>
          </div>
        </div>

        {/* 2. Cash Trajectory */}
        <div className="p-5 sm:p-6 rounded-3xl backdrop-blur-xl bg-neutral-900/80 border border-neutral-800/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3.5">
              <div>
                <h2 className="text-base font-bold text-white">Cash Balance Trajectory</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Multi-month cumulative cash balance accumulation in LKR</p>
              </div>
              <div className="p-2 rounded-xl bg-neutral-800/80">
                {isTrajectoryPositive ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </div>
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
                    className="absolute z-20 backdrop-blur-xl bg-neutral-950/90 border border-neutral-700 text-white px-3 py-1.5 rounded-xl shadow-2xl text-xs font-mono pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 transition-all"
                    style={{
                      left: `${(trajPoints[hoveredPointIdx].x / trajSvgWidth) * 100}%`,
                      top: `${Math.max(10, Math.min(80, (trajPoints[hoveredPointIdx].y / trajSvgHeight) * 100))}%`,
                    }}
                  >
                    <div className="text-[10px] text-neutral-400 font-sans">{trajPoints[hoveredPointIdx].month} Balance</div>
                    <div className={`font-bold ${trajPoints[hoveredPointIdx].value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatMoney(trajPoints[hoveredPointIdx].value, currency)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Monthly Cash Flow Trend (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl backdrop-blur-xl bg-neutral-900/80 border border-neutral-800/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-800/80 pb-3.5">
              <div>
                <h2 className="text-base font-bold text-white">Monthly Cash Flow Trend</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Historical comparison of incoming revenue vs operational expenses</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" /> Income
                </span>
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm" /> Expense
                </span>
              </div>
            </div>

            {/* Custom Bar Comparison Chart */}
            <div className="mt-6 pt-2 relative">
              <div className="h-44 flex items-end justify-between gap-4 border-b border-neutral-800/80 pb-2 relative">
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
                        <div className="absolute -top-16 z-20 backdrop-blur-xl bg-neutral-950/95 border border-neutral-700 text-white px-3 py-2 rounded-xl shadow-2xl text-[11px] font-mono pointer-events-none transform -translate-y-2 whitespace-nowrap">
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
                            className="w-full max-w-[16px] bg-emerald-500 hover:bg-emerald-400 rounded-t-lg transition-all shadow-xs"
                          />
                        ) : (
                          <div className="w-full max-w-[8px] h-1 bg-neutral-700/40 rounded-full" />
                        )}

                        {/* Expense Bar */}
                        {expHeight > 0 ? (
                          <div
                            style={{ height: `${expHeight}%` }}
                            className="w-full max-w-[16px] bg-rose-500 hover:bg-rose-400 rounded-t-lg transition-all shadow-xs"
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

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 mt-4">
            <span>6-Month Net Cashflow (Avg):</span>
            <span className={`font-mono tabular-nums font-bold ${isAvgNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isAvgNetPositive ? '+' : '-'}{formatMoney(Math.abs(avgNetCashflow), currency)} / mo
            </span>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed (1 col) */}
        <div className="p-5 sm:p-6 rounded-3xl backdrop-blur-xl bg-neutral-900/80 border border-neutral-800/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3.5">
              <h2 className="text-base font-bold text-white">Recent Ledger Activity</h2>
              <button
                onClick={() => onNavigateToTab('transactions')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentIncomes.length === 0 && recentExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No recent activity. Click "Record Transaction" to add one.
              </div>
            ) : (
              <div className="pt-3 divide-y divide-neutral-800/70">
                {recentIncomes.map((inc) => (
                  <div key={inc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: inc.categoryColor || '#10B981' }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {inc.description}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {inc.categoryName} · {inc.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums font-bold text-emerald-400">
                      +{formatMoney(inc.amount, currency)}
                    </div>
                  </div>
                ))}

                {recentExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3 text-xs group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: exp.categoryColor || '#F43F5E' }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                          {exp.description}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {exp.categoryName} · {exp.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums font-bold text-rose-400">
                      -{formatMoney(exp.amount, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800/80">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onOpenRecordModal}
              className="w-full py-2.5 px-3.5 text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add New Entry</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
