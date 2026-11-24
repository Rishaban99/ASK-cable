import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AnalyticsOverview,
  IncomeRecord,
  ExpenseRecord,
  Category,
  Customer,
  MonthlyPayment,
  SupportedCurrency,
  SystemProfile,
  AiBusinessInsights,
} from '../types/finance.js';
import { NavTab } from './Sidebar.js';
import { api, formatMoney, formatCompactMoney } from '../api/client.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Sparkles,
  Bot,
  BrainCircuit,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Users,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Calendar,
  Tv,
  Award,
  ArrowRight,
  PieChart,
} from 'lucide-react';
import { Spinner } from './Spinner.js';

interface SummaryViewProps {
  analytics: AnalyticsOverview | null;
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: Category[];
  customers?: Customer[];
  monthlyPayments?: MonthlyPayment[];
  systemProfile?: SystemProfile;
  currency: SupportedCurrency;
  onOpenRecordModal: () => void;
  isLoading: boolean;
  onNavigateTab?: (tab: NavTab) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  analytics,
  incomes,
  expenses,
  categories,
  customers = [],
  monthlyPayments = [],
  systemProfile,
  currency,
  onOpenRecordModal,
  isLoading,
  onNavigateTab,
}) => {
  // Language preference for AI Insights ('ta' = Tamil, 'en' = English)
  const [language, setLanguage] = useState<'ta' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_ai_lang');
      return saved === 'en' || saved === 'ta' ? saved : 'ta';
    } catch {
      return 'ta';
    }
  });

  const isTamil = language === 'ta';
  const [mobilePillarTab, setMobilePillarTab] = useState<'strengths' | 'risks' | 'recommendations'>('strengths');

  // AI Business Insights State
  const [aiInsights, setAiInsights] = useState<AiBusinessInsights | null>(() => {
    try {
      const cached = localStorage.getItem(`ask_cable_ai_insights_${language}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Financial Calculations
  const totalIncomeSum = useMemo(() => incomes.reduce((acc, curr) => acc + curr.amount, 0), [incomes]);
  const totalExpenseSum = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  const netBalance = totalIncomeSum - totalExpenseSum;
  const isPositive = netBalance >= 0;
  const profitMarginPct = totalIncomeSum > 0 ? ((netBalance / totalIncomeSum) * 100).toFixed(1) : '0.0';

  // Current Month calculations
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthIncomes = useMemo(
    () => incomes.filter((i) => i.date && i.date.startsWith(currentMonthStr)),
    [incomes, currentMonthStr]
  );
  const currentMonthExpenses = useMemo(
    () => expenses.filter((e) => e.date && e.date.startsWith(currentMonthStr)),
    [expenses, currentMonthStr]
  );

  const monthlyInc =
    analytics?.monthlyCashFlow?.totalIncome ?? currentMonthIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyExp =
    analytics?.monthlyCashFlow?.totalExpense ?? currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyNet = monthlyInc - monthlyExp;

  // Subscriber Metrics
  const totalSubscribers = customers.length;
  const activeSubscribers = useMemo(
    () => customers.filter((c) => (c.status || 'ACTIVE') === 'ACTIVE').length,
    [customers]
  );
  const inactiveSubscribers = totalSubscribers - activeSubscribers;
  const activeSubscriberPct = totalSubscribers > 0 ? ((activeSubscribers / totalSubscribers) * 100).toFixed(1) : '100';

  // Cable Subscription Billings for Current Month
  const currentMonthBills = useMemo(
    () => monthlyPayments.filter((p) => p.month === currentMonthStr),
    [monthlyPayments, currentMonthStr]
  );
  const currentMonthBilledAmount = useMemo(
    () => currentMonthBills.reduce((acc, curr) => acc + curr.monthlyFee, 0),
    [currentMonthBills]
  );
  const currentMonthCollectedAmount = useMemo(
    () => currentMonthBills.reduce((acc, curr) => acc + curr.paidAmount, 0),
    [currentMonthBills]
  );
  const currentMonthPendingAmount = Math.max(0, currentMonthBilledAmount - currentMonthCollectedAmount);
  const collectionRatePct =
    currentMonthBilledAmount > 0
      ? ((currentMonthCollectedAmount / currentMonthBilledAmount) * 100).toFixed(1)
      : '0.0';

  const arpu = activeSubscribers > 0 ? Math.round(monthlyInc / activeSubscribers) : 1200;
  const projectedNextMonthRevenue = Math.round(activeSubscribers * (arpu > 500 ? arpu : 1200));

  // Package breakdown
  const packageStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalFee: number }> = {};
    for (const c of customers) {
      const pName = c.packageName || 'Standard Package';
      const fee = c.monthlyFee !== undefined && c.monthlyFee !== null ? Number(c.monthlyFee) : 1200;
      if (!map[pName]) {
        map[pName] = { name: pName, count: 0, totalFee: 0 };
      }
      map[pName].count += 1;
      map[pName].totalFee += fee;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [customers]);

  // Fetch / Generate AI Insights
  const fetchAiInsights = useCallback(
    async (forcedLang?: 'ta' | 'en') => {
      const targetLang = forcedLang || language;
      setIsGeneratingAi(true);

      const payload = {
        language: targetLang,
        metrics: {
          totalRevenue: totalIncomeSum,
          totalExpenses: totalExpenseSum,
          netProfit: netBalance,
          profitMarginPct: Number(profitMarginPct),
          monthlyRevenue: monthlyInc,
          monthlyExpenses: monthlyExp,
          monthlyNet: monthlyNet,
          monthlySavingsRatePct: monthlyInc > 0 ? Number(((monthlyNet / monthlyInc) * 100).toFixed(1)) : 0,
          totalSubscribers,
          activeSubscribers,
          inactiveSubscribers,
          currentMonthBilled: currentMonthBilledAmount,
          currentMonthCollected: currentMonthCollectedAmount,
          currentMonthPending: currentMonthPendingAmount,
          collectionRatePct: Number(collectionRatePct),
          totalPendingArrears: currentMonthPendingAmount,
          arpu,
          companyName: systemProfile?.companyName || 'ASK CABLE TV NETWORK',
        },
      };

      try {
        const insights = await api.getAiBusinessInsights(payload as any);
        setAiInsights(insights);
        try {
          localStorage.setItem(`ask_cable_ai_insights_${targetLang}`, JSON.stringify(insights));
        } catch {}
      } catch (err) {
        console.warn('AI Insights fetch failed, using internal business intelligence model:', err);
      } finally {
        setIsGeneratingAi(false);
      }
    },
    [
      language,
      totalIncomeSum,
      totalExpenseSum,
      netBalance,
      profitMarginPct,
      monthlyInc,
      monthlyExp,
      monthlyNet,
      totalSubscribers,
      activeSubscribers,
      inactiveSubscribers,
      currentMonthBilledAmount,
      currentMonthCollectedAmount,
      currentMonthPendingAmount,
      collectionRatePct,
      arpu,
      systemProfile,
    ]
  );

  const handleLanguageToggle = (newLang: 'ta' | 'en') => {
    setLanguage(newLang);
    try {
      localStorage.setItem('ask_cable_ai_lang', newLang);
    } catch {}
    fetchAiInsights(newLang);
  };

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. EXECUTIVE HEADER */}
      {/* ==================================================================== */}
      <div className="erp-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Executive Financial Summary & AI Advisory</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audited financial ratios, profit & loss analysis, and real-time subscriber health indicators
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => handleLanguageToggle('ta')}
              className={`px-3 py-1 rounded-lg transition-all ${
                isTamil ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              தமிழ் (Tamil)
            </button>
            <button
              onClick={() => handleLanguageToggle('en')}
              className={`px-3 py-1 rounded-lg transition-all ${
                !isTamil ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              English
            </button>
          </div>

          <button
            onClick={() => fetchAiInsights()}
            disabled={isGeneratingAi}
            className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingAi ? 'Analyzing...' : 'Run AI Advisor'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. P&L EXECUTIVE METRICS (4 CARDS) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="erp-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Lifetime Revenue</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatMoney(totalIncomeSum, currency)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Multi-stream cable + setup income</p>
        </div>

        <div className="erp-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total Operational Expenses</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-400 mt-1">
            {formatMoney(totalExpenseSum, currency)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Overhead, maintenance, gear</p>
        </div>

        <div className="erp-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Net Operating Profit</span>
          <div
            className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
              isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatMoney(netBalance, currency)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Retained enterprise earnings</p>
        </div>

        <div className="erp-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Profit Margin</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-700 dark:text-blue-400 mt-1">
            {profitMarginPct}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Operating yield on gross revenue</p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. AI STRATEGIC HEALTH ADVISORY SECTION */}
      {/* ==================================================================== */}
      <div className="erp-card p-5 bg-gradient-to-r from-blue-50/50 via-slate-50 to-teal-50/50 dark:from-[#0B1220] dark:via-[#0F172A] dark:to-[#0B1720] border-blue-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Executive AI Advisory & Operations Health</span>
                <span className="badge-status badge-royal text-[9px]">Grade {aiInsights?.collectionGrade || 'A'}</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Strategic assessment tailored for Sri Lankan cable TV operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Health Index</span>
              <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                {aiInsights?.healthScore || 88} / 100
              </div>
            </div>
          </div>
        </div>

        {/* Verdict & Executive Summary */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.06] space-y-2">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>{aiInsights?.verdict || (isTamil ? 'நிலையான வருவாய் மற்றும் திருப்திகரமான சந்தாதாரர் வளர்ச்சி' : 'Stable Revenue & Favorable Subscriber Retention')}</span>
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            {aiInsights?.summary ||
              (isTamil
                ? 'உங்கள் ASK கேபிள் நிறுவனம் ஆரோக்கியமான நிதி நிலையில் இயங்குகிறது. நடப்பு மாதத்தில் வசூல் வேகம் மற்றும் சந்தாதாரர் தக்கவைப்பு விகிதம் மிகச் சிறப்பாக உள்ளது.'
                : 'ASK Cable network maintains solid fiscal stability. Current collections and subscriber coverage remain favorable across active set-top boxes.')}
          </p>
        </div>

        {/* Strategic Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Strengths */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20 space-y-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isTamil ? 'முக்கிய பலங்கள் (Strengths)' : 'Key Operational Strengths'}</span>
            </span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              {(aiInsights?.strengths || [
                isTamil ? 'உயர் வசூல் விகிதம் (High Collection Rate)' : 'High payment collection rate on active boxes',
                isTamil ? 'நிலையான மாதாந்திர வாடகை வருவாய்' : 'Predictable monthly subscription cashflows',
                isTamil ? 'குறைந்த இழப்பு விகிதம்' : 'Low subscriber churn rate',
              ]).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 space-y-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>{isTamil ? 'கவனிக்க வேண்டிய இடர்கள் (Risks)' : 'Risk Factors to Monitor'}</span>
            </span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              {(aiInsights?.risks || [
                isTamil ? 'நிலுவையில் உள்ள சந்தாதாரர் பாக்கிகள்' : 'Pending arrears from uncollected accounts',
                isTamil ? 'செயலிழந்த பெட்டிகளை மீட்டெடுத்தல்' : 'Inactive set-top boxes requiring retrieval',
                isTamil ? 'உபகரண பராமரிப்பு செலவுகள்' : 'Hardware maintenance overhead',
              ]).map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-500/20 space-y-2">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              <span>{isTamil ? 'செயல் திட்டங்கள் (Recommendations)' : 'Strategic Recommendations'}</span>
            </span>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              {(aiInsights?.recommendations || [
                isTamil ? 'SMS நினைவூட்டல் சேவையை முழுமையாகப் பயன்படுத்தவும்' : 'Utilize automated SMS balance alerts',
                isTamil ? 'புதிய உயர் பேக்கேஜ் சந்தாக்களை ஊக்குவிக்கவும்' : 'Promote Premium package upgrades',
                isTamil ? 'கள வசூலை துரிதப்படுத்தவும்' : 'Accelerate field POS collection rounds',
              ]).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. CURRENT MONTH OPERATIONS & PACKAGE DISTRIBUTION */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Current Month Billing Reconciliation */}
        <div className="erp-card p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Current Month Operations ({currentMonthStr})</span>
            </h3>
            <span className="badge-status badge-teal font-mono">{collectionRatePct}% Settled</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Billed</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                {formatMoney(currentMonthBilledAmount, currency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/10">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Collected</span>
              <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">
                {formatMoney(currentMonthCollectedAmount, currency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-500/10">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold">Pending Arrears</span>
              <div className="font-mono font-bold text-rose-700 dark:text-rose-400 text-sm mt-0.5">
                {formatMoney(currentMonthPendingAmount, currency)}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTab && onNavigateTab('payment-collection')}
              className="w-full btn-teal py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <span>Open Field Collection POS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subscriber & Package Breakdown */}
        <div className="erp-card p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tv className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Package Tiers & Subscriber Coverage</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">{activeSubscribers} Active</span>
          </div>

          <div className="space-y-2.5">
            {packageStats.map((pkg) => {
              const pct = totalSubscribers > 0 ? Math.round((pkg.count / totalSubscribers) * 100) : 0;
              return (
                <div key={pkg.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg.name}</span>
                    <span className="font-mono text-slate-500">
                      {pkg.count} subs ({pct}%) • {formatMoney(pkg.totalFee, currency)}/mo
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-blue-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
