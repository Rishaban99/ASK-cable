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
  AiBusinessInsights
} from '../types/finance.js';
import { NavTab } from './Sidebar.js';
import { api, formatMoney, formatCompactMoney } from '../api/client.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
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
  Zap,
  Award,
  ChevronRight,
  Percent
} from 'lucide-react';
import { Spinner } from './Spinner.tsx';

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
      return (saved === 'en' || saved === 'ta') ? saved : 'ta';
    } catch {
      return 'ta';
    }
  });

  const isTamil = language === 'ta';

  // Mobile active tab for Strategic Pillars ('strengths' | 'risks' | 'recommendations')
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
  const currentMonthIncomes = useMemo(() => incomes.filter((i) => i.date.startsWith(currentMonthStr)), [incomes, currentMonthStr]);
  const currentMonthExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(currentMonthStr)), [expenses, currentMonthStr]);
  
  const monthlyInc = analytics?.monthlyCashFlow?.totalIncome ?? currentMonthIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyExp = analytics?.monthlyCashFlow?.totalExpense ?? currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyNet = monthlyInc - monthlyExp;
  const savingsRate = monthlyInc > 0 ? ((monthlyNet / monthlyInc) * 100).toFixed(1) : '0.0';

  // Subscriber Metrics
  const totalSubscribers = customers.length;
  const activeSubscribers = useMemo(() => customers.filter((c) => (c.status || 'ACTIVE') === 'ACTIVE').length, [customers]);
  const inactiveSubscribers = totalSubscribers - activeSubscribers;
  const activeSubscriberPct = totalSubscribers > 0 ? ((activeSubscribers / totalSubscribers) * 100).toFixed(1) : '100';

  // Cable Subscription Billings for Current Month
  const currentMonthBills = useMemo(() => monthlyPayments.filter((p) => p.month === currentMonthStr), [monthlyPayments, currentMonthStr]);
  const currentMonthBilledAmount = useMemo(() => currentMonthBills.reduce((acc, curr) => acc + curr.monthlyFee, 0), [currentMonthBills]);
  const currentMonthCollectedAmount = useMemo(() => currentMonthBills.reduce((acc, curr) => acc + curr.paidAmount, 0), [currentMonthBills]);
  const currentMonthPendingAmount = Math.max(0, currentMonthBilledAmount - currentMonthCollectedAmount);
  const collectionRatePct = currentMonthBilledAmount > 0 
    ? ((currentMonthCollectedAmount / currentMonthBilledAmount) * 100).toFixed(1)
    : '0.0';

  // Total Uncollected Arrears
  const totalCustomerArrears = useMemo(() => customers.reduce((acc, curr) => acc + (curr.balanceAmount > 0 ? curr.balanceAmount : 0), 0), [customers]);
  const totalMonthlyPaymentArrears = useMemo(() => monthlyPayments.reduce((acc, curr) => acc + (curr.balanceAmount > 0 ? curr.balanceAmount : 0), 0), [monthlyPayments]);
  const totalPendingArrears = Math.max(totalCustomerArrears, totalMonthlyPaymentArrears, currentMonthPendingAmount);

  // ARPU & Projected Inflow
  const arpu = activeSubscribers > 0 ? Math.round(monthlyInc / activeSubscribers) : 1200;
  const projectedNextMonthRevenue = Math.round(activeSubscribers * (arpu > 500 ? arpu : 1200));

  // Package Distribution Breakdown
  const packageStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalFee: number; monthlyFee: number }> = {};
    for (const c of customers) {
      const pName = c.packageName || 'Standard Package';
      const fee = c.monthlyFee !== undefined && c.monthlyFee !== null ? Number(c.monthlyFee) : 1200;
      if (!map[pName]) {
        map[pName] = { name: pName, count: 0, totalFee: 0, monthlyFee: fee };
      }
      map[pName].count += 1;
      map[pName].totalFee += fee;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [customers]);

  // Group expenses by category
  const expCatMap = useMemo(() => {
    const map: Record<string, { name: string; color: string; amount: number; count: number }> = {};
    for (const exp of expenses) {
      if (!map[exp.categoryId]) {
        map[exp.categoryId] = {
          name: exp.categoryName || 'Uncategorized Expense',
          color: exp.categoryColor || '#F43F5E',
          amount: 0,
          count: 0,
        };
      }
      map[exp.categoryId].amount += exp.amount;
      map[exp.categoryId].count += 1;
    }
    return map;
  }, [expenses]);

  // Group incomes by category
  const incCatMap = useMemo(() => {
    const map: Record<string, { name: string; color: string; amount: number; count: number }> = {};
    for (const inc of incomes) {
      if (!map[inc.categoryId]) {
        map[inc.categoryId] = {
          name: inc.categoryName || 'Uncategorized Income',
          color: inc.categoryColor || '#10B981',
          amount: 0,
          count: 0,
        };
      }
      map[inc.categoryId].amount += inc.amount;
      map[inc.categoryId].count += 1;
    }
    return map;
  }, [incomes]);

  const topExpense = useMemo(() => {
    const list = Object.values(expCatMap);
    if (list.length === 0) return { name: 'Operations', amount: 0 };
    return list.sort((a, b) => b.amount - a.amount)[0];
  }, [expCatMap]);

  // Fetch / Generate AI Insights
  const fetchAiInsights = useCallback(async (forcedLang?: 'ta' | 'en') => {
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
        monthlySavingsRatePct: Number(savingsRate),
        totalSubscribers,
        activeSubscribers,
        inactiveSubscribers,
        currentMonthBilled: currentMonthBilledAmount,
        currentMonthCollected: currentMonthCollectedAmount,
        currentMonthPending: currentMonthPendingAmount,
        collectionRatePct: Number(collectionRatePct),
        totalPendingArrears,
        arpu,
        topExpenseCategoryName: topExpense.name,
        topExpenseCategoryAmount: topExpense.amount,
        companyName: systemProfile?.companyName || 'ASK CABLE TV NETWORK',
      },
    };

    try {
      const res = await api.getAiBusinessInsights(payload);
      setAiInsights(res);
      try {
        localStorage.setItem(`ask_cable_ai_insights_${targetLang}`, JSON.stringify(res));
      } catch {}
    } catch (err: any) {
      console.warn('AI Insights generation error, using rule-based local calculation:', err?.message);
    } finally {
      setIsGeneratingAi(false);
    }
  }, [
    language,
    totalIncomeSum,
    totalExpenseSum,
    netBalance,
    profitMarginPct,
    monthlyInc,
    monthlyExp,
    monthlyNet,
    savingsRate,
    totalSubscribers,
    activeSubscribers,
    inactiveSubscribers,
    currentMonthBilledAmount,
    currentMonthCollectedAmount,
    currentMonthPendingAmount,
    collectionRatePct,
    totalPendingArrears,
    arpu,
    topExpense,
    systemProfile
  ]);

  const handleLanguageToggle = (newLang: 'ta' | 'en') => {
    setLanguage(newLang);
    try {
      localStorage.setItem('ask_cable_ai_lang', newLang);
      const cached = localStorage.getItem(`ask_cable_ai_insights_${newLang}`);
      if (cached) {
        setAiInsights(JSON.parse(cached));
      } else {
        fetchAiInsights(newLang);
      }
    } catch {
      fetchAiInsights(newLang);
    }
  };

  useEffect(() => {
    if (!aiInsights) {
      fetchAiInsights();
    }
  }, []);

  const getHealthBadge = (score: number) => {
    if (score >= 85) {
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-500 dark:text-emerald-400',
        dot: 'bg-emerald-400',
        label: isTamil ? 'வளர்ச்சி (Excellent)' : 'Excellent',
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-sky-500/10 dark:bg-sky-500/15',
        border: 'border-sky-500/30',
        text: 'text-sky-500 dark:text-sky-400',
        dot: 'bg-sky-400',
        label: isTamil ? 'ஆரோக்கியம் (Good)' : 'Good Health',
      };
    }
    if (score >= 55) {
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-500 dark:text-amber-400',
        dot: 'bg-amber-400',
        label: isTamil ? 'மிதமானது (Moderate)' : 'Moderate',
      };
    }
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      border: 'border-rose-500/30',
      text: 'text-rose-500 dark:text-rose-400',
      dot: 'bg-rose-400',
      label: isTamil ? 'கவனம் தேவை (Critical)' : 'Critical',
    };
  };

  const currentScore = aiInsights?.healthScore ?? (netBalance >= 0 ? 82 : 45);
  const healthBadge = getHealthBadge(currentScore);

  return (
    <div className="mx-auto max-w-7xl px-2.5 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-5 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. COMPACT PAGE HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-neutral-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{isTamil ? 'நிதி அறிக்கை & AI பகுப்பாய்வு' : 'Total Financial Summary & AI Insights'}</span>
            </h1>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-2.5 h-2.5" />
              <span>AI</span>
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
            {isTamil 
              ? 'நிறுவன நிதி இருப்பு, சந்தா வசூல் வேகம் மற்றும் AI செயல்திறன் மதிப்பாய்வு'
              : 'Real-time company cash reserves, subscriber billing velocity, and AI executive performance briefing'
            }
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px]">
            <button
              onClick={() => handleLanguageToggle('ta')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                isTamil ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              தமிழ்
            </button>
            <button
              onClick={() => handleLanguageToggle('en')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                !isTamil ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Ask AI Button */}
          <button
            onClick={() => fetchAiInsights()}
            disabled={isGeneratingAi}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-700/50 rounded-lg hover:bg-indigo-900/80 transition-all active:scale-95 disabled:opacity-50"
            title={isTamil ? 'AI மூலம் புதிய நிதி அறிக்கையை ஆய்வு செய்' : 'Re-analyze financial performance with AI'}
          >
            <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isGeneratingAi ? (isTamil ? 'ஆய்வு...' : 'Auditing...') : (isTamil ? 'AI ஆய்வு' : 'Ask AI')}</span>
          </button>

          {/* Record Entry */}
          <button
            onClick={onOpenRecordModal}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-neutral-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isTamil ? 'பதிவு செய்' : 'Record'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT AI BUSINESS INTELLIGENCE ADVISOR (SPACE-EFFICIENT HERO) */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-indigo-500/25 bg-neutral-900/90 shadow-lg p-3.5 sm:p-5 space-y-3 sm:space-y-4 relative overflow-hidden backdrop-blur-sm">
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                {isTamil ? 'ASK AI தொழில் ஆலோசகர்' : 'ASK AI Strategic Advisor'}
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 font-semibold">
                {aiInsights?.isAiGenerated ? 'Gemini AI' : 'BI Engine'}
              </span>
            </div>
          </div>

          {/* Health Badge & Micro Stats */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${healthBadge.bg} ${healthBadge.border} ${healthBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${healthBadge.dot} animate-pulse`} />
              <span>{currentScore}/100 • {healthBadge.label}</span>
            </div>
          </div>
        </div>

        {/* Verdict Statement */}
        <div className="p-3 sm:p-3.5 rounded-lg bg-neutral-950/80 border border-neutral-800 relative z-10 space-y-1.5">
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-neutral-100 leading-relaxed">
                "{aiInsights?.verdict || (
                  isTamil 
                    ? `${systemProfile?.companyName || 'ASK Cable'} நிறுவனம் ஆரோக்கியமான நிதி ஸ்திரத்தன்மையுடன் இயங்கி வருகிறது. நிலுவைக் கட்டணங்களை விரைந்து வசூலித்தால் லாபம் மேலும் அதிகரிக்கும்.`
                    : `${systemProfile?.companyName || 'ASK Cable'} maintains healthy operational stability. Tighter collection cycles will further unlock free cashflow.`
                )}"
              </p>
              {aiInsights?.summary && (
                <p className="text-[11px] text-neutral-400 leading-normal pt-1 border-t border-neutral-800/80">
                  {aiInsights.summary}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3 Strategic Pillars (Mobile Tabs / Desktop Grid) */}
        <div className="space-y-2 relative z-10">
          {/* Mobile Tab Switcher */}
          <div className="flex sm:hidden p-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px]">
            <button
              onClick={() => setMobilePillarTab('strengths')}
              className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                mobilePillarTab === 'strengths' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-neutral-400'
              }`}
            >
              🌟 {isTamil ? 'பலங்கள்' : 'Strengths'}
            </button>
            <button
              onClick={() => setMobilePillarTab('risks')}
              className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                mobilePillarTab === 'risks' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-neutral-400'
              }`}
            >
              ⚠️ {isTamil ? 'அபாயங்கள்' : 'Risks'}
            </button>
            <button
              onClick={() => setMobilePillarTab('recommendations')}
              className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                mobilePillarTab === 'recommendations' ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'text-neutral-400'
              }`}
            >
              💡 {isTamil ? 'ஆலோசனைகள்' : 'Plan'}
            </button>
          </div>

          {/* Pillars Layout: 3 Columns on Desktop, Single Tab on Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Strengths */}
            <div className={`p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-2 ${
              mobilePillarTab !== 'strengths' ? 'hidden sm:block' : 'block'
            }`}>
              <div className="flex items-center gap-1.5 border-b border-emerald-500/20 pb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {isTamil ? 'முக்கிய பலங்கள் (Strengths)' : 'Key Strengths'}
                </h2>
              </div>
              <ul className="space-y-1.5 text-[11px] text-neutral-200">
                {(aiInsights?.strengths || [
                  isTamil ? `வலுவான லாப வரம்பு: மொத்த வருவாயில் ${profitMarginPct}% நிகர கையிருப்பு.` : `Strong margin: ${profitMarginPct}% retained as reserves.`,
                  isTamil ? `${activeSubscribers} தீவிர வாடிக்கையாளர்களுடன் (${activeSubscriberPct}%) தொடர் வருவாய்.` : `${activeSubscribers} active subscribers drive consistent monthly revenue.`,
                  isTamil ? `நடப்பு மாதத்தில் ${formatCompactMoney(monthlyInc, currency)} வசூலிக்கப்பட்டுள்ளது.` : `Healthy monthly inflows of ${formatCompactMoney(monthlyInc, currency)}.`,
                ]).map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Risks & Watchlist */}
            <div className={`p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 space-y-2 ${
              mobilePillarTab !== 'risks' ? 'hidden sm:block' : 'block'
            }`}>
              <div className="flex items-center gap-1.5 border-b border-rose-500/20 pb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  {isTamil ? 'கவனம் தேவை (Watchlist)' : 'Financial Watchlist'}
                </h2>
              </div>
              <ul className="space-y-1.5 text-[11px] text-neutral-200">
                {(aiInsights?.risks || [
                  isTamil ? `வசூலாகாத நிலுவை பாக்கி: ${formatCompactMoney(totalPendingArrears, currency)}.` : `Uncollected arrears: ${formatCompactMoney(totalPendingArrears, currency)}.`,
                  inactiveSubscribers > 0 
                    ? (isTamil ? `செயலிழந்த ${inactiveSubscribers} வாடிக்கையாளர்களால் மாத வருவாய் இழப்பு.` : `${inactiveSubscribers} inactive subscribers representing lost recurring fees.`)
                    : (isTamil ? `புதிய வாடிக்கையாளர் இணைப்புகளைத் தீவிரப்படுத்த வேண்டும்.` : `Focus on acquiring new household connections.`),
                  isTamil ? `அதிக செலவு: "${topExpense.name}" (${formatCompactMoney(topExpense.amount, currency)}).` : `Top expense: "${topExpense.name}" (${formatCompactMoney(topExpense.amount, currency)}).`,
                ]).map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Actionable Recommendations */}
            <div className={`p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-2 ${
              mobilePillarTab !== 'recommendations' ? 'hidden sm:block' : 'block'
            }`}>
              <div className="flex items-center gap-1.5 border-b border-indigo-500/20 pb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  {isTamil ? 'ஆலோசனைகள் (Action Plan)' : 'Growth Action Plan'}
                </h2>
              </div>
              <ul className="space-y-1.5 text-[11px] text-neutral-200">
                {(aiInsights?.recommendations || [
                  isTamil ? `நிலுவை வைத்துள்ள வாடிக்கையாளர்களுக்கு Reminder SMS அனுப்பி பாக்கியை வசூலியுங்கள்.` : `Dispatch payment reminder SMS to accounts with arrears.`,
                  isTamil ? `Standard பேக்கேஜ் வாடிக்கையாளர்களை Premium HD பேக்கேஜிற்கு Upgrade செய்யுங்கள்.` : `Upsell Standard subscribers to Premium HD packages.`,
                  isTamil ? `செயலிழந்த வாடிக்கையாளர்களுக்கு மறு இணைப்பு சலுகை அறிவித்து மீண்டும் இணையுங்கள்.` : `Launch a zero-fee winback offer for disconnected customers.`,
                ]).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CORE FINANCIAL KPI MATRIX (COMPACT 2x2 ON MOBILE, 4 ON TABLET/DESKTOP) */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isTamil ? 'முக்கிய நிதி குறிகாட்டிகள்' : 'Core Financial Metrics'}</span>
          </h2>
          <span className="text-[10px] text-neutral-500 font-mono">
            {currency} • {isTamil ? 'நேரலை' : 'Live'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* Tile 1: Net Cash Reserve */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="truncate">{isTamil ? 'நிகர இருப்பு' : 'Net Reserve'}</span>
              <Wallet className={`w-3.5 h-3.5 shrink-0 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div className={`text-base sm:text-lg font-bold font-mono tracking-tight truncate ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCompactMoney(netBalance, currency)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800 font-mono">
              <span>{isTamil ? 'லாபம்' : 'Margin'}:</span>
              <strong className="text-emerald-400">+{profitMarginPct}%</strong>
            </div>
          </div>

          {/* Tile 2: Current Month Net */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="truncate">{isTamil ? 'நடப்பு மாத சேமிப்பு' : 'Monthly Net'}</span>
              <Activity className="w-3.5 h-3.5 shrink-0 text-sky-400" />
            </div>
            <div className={`text-base sm:text-lg font-bold font-mono tracking-tight truncate ${monthlyNet >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
              {monthlyNet >= 0 ? '+' : ''}{formatCompactMoney(monthlyNet, currency)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800 font-mono">
              <span>{isTamil ? 'விகிதம்' : 'Rate'}:</span>
              <strong className="text-sky-400">{savingsRate}%</strong>
            </div>
          </div>

          {/* Tile 3: Cable Collections */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="truncate">{isTamil ? 'கட்டண வசூல்' : 'Collection'}</span>
              <Receipt className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            </div>
            <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-white flex items-baseline gap-1 truncate">
              <span>{collectionRatePct}%</span>
              <span className="text-[10px] text-neutral-400 font-normal">({aiInsights?.collectionGrade || 'A'})</span>
            </div>
            <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden mt-1">
              <div style={{ width: `${Math.min(100, Number(collectionRatePct))}%` }} className="bg-blue-500 h-full rounded-full transition-all duration-500" />
            </div>
          </div>

          {/* Tile 4: Pending Arrears */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="truncate">{isTamil ? 'நிலுவை பாக்கி' : 'Arrears'}</span>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            </div>
            <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-rose-400 truncate">
              {formatCompactMoney(totalPendingArrears, currency)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800 font-mono">
              <span>{isTamil ? 'பாக்கி' : 'Pending'}:</span>
              <span className="text-rose-400 font-bold">{formatCompactMoney(currentMonthPendingAmount, currency)}</span>
            </div>
          </div>

          {/* Tile 5: Subscribers & ARPU */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="truncate">{isTamil ? 'சந்தாதாரர்கள்' : 'Subscribers'}</span>
              <Users className="w-3.5 h-3.5 shrink-0 text-purple-400" />
            </div>
            <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-white truncate">
              {activeSubscribers} <span className="text-[10px] text-neutral-400 font-normal">/ {totalSubscribers}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800 font-mono">
              <span>ARPU:</span>
              <strong className="text-purple-400 font-mono">Rs. {arpu}</strong>
            </div>
          </div>

          {/* Tile 6: Forecast */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 hover:border-neutral-700 transition-all">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="truncate">{isTamil ? 'அடுத்த மாத வரவு' : 'Next Inflow'}</span>
              <Zap className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            </div>
            <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-amber-400 truncate">
              {formatCompactMoney(projectedNextMonthRevenue, currency)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800 font-mono">
              <span>{isTamil ? 'வீடுகள்' : 'Homes'}:</span>
              <span className="text-amber-400 font-bold">{activeSubscribers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PACKAGE DISTRIBUTION & MONTHLY CASHFLOW HISTORY (COMPACT GRID) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Cable Package Distribution Card */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-indigo-400" />
              <h2 className="text-xs font-bold text-white">
                {isTamil ? 'கேபிள் பேக்கேஜ் சந்தாதாரர் பகிர்வு' : 'TV Package Distribution'}
              </h2>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">{packageStats.length} {isTamil ? 'பேக்கேஜ்கள்' : 'tiers'}</span>
          </div>

          {packageStats.length === 0 ? (
            <p className="text-[11px] text-neutral-500 text-center py-4">
              {isTamil ? 'பேக்கேஜ் விபரங்கள் இல்லை.' : 'No package assignments.'}
            </p>
          ) : (
            <div className="space-y-2">
              {packageStats.map((pkg, idx) => {
                const pct = totalSubscribers > 0 ? ((pkg.count / totalSubscribers) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="p-2 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shrink-0" />
                        <span className="font-semibold text-white truncate">{pkg.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono shrink-0">({pkg.count})</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-emerald-400 font-semibold">{formatCompactMoney(pkg.totalFee, currency)}</span>
                        <span className="text-neutral-500 text-[10px] ml-1 font-mono">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-neutral-850 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Cashflow History Comparison */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <h2 className="text-xs font-bold text-white">
                {isTamil ? 'மாதாந்திர பணப்புழக்க வரலாறு (6 மாதங்கள்)' : 'Monthly Cashflow History'}
              </h2>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">{isTamil ? 'வரவு vs செலவு' : 'In vs Out'}</span>
          </div>

          {!analytics?.monthlyCashflowHistory || analytics.monthlyCashflowHistory.length === 0 ? (
            <p className="text-[11px] text-neutral-500 text-center py-4">
              {isTamil ? 'வரலாற்றுப் பதிவுகள் இல்லை.' : 'Insufficient data.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {analytics.monthlyCashflowHistory.slice(-5).map((item, idx) => {
                const maxVal = Math.max(...analytics.monthlyCashflowHistory.map((m) => Math.max(m.income, m.expense, 1)));
                const incPct = (item.income / maxVal) * 100;
                const expPct = (item.expense / maxVal) * 100;
                return (
                  <div key={idx} className="p-1.5 sm:p-2 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-white">{item.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">+{formatCompactMoney(item.income, currency)}</span>
                        <span className="text-rose-400">-{formatCompactMoney(item.expense, currency)}</span>
                        <span className={`font-bold ${item.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.net >= 0 ? '+' : ''}{formatCompactMoney(item.net, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="h-0.5 w-full bg-neutral-850 rounded-full overflow-hidden">
                        <div style={{ width: `${incPct}%` }} className="h-full bg-emerald-500 rounded-full" />
                      </div>
                      <div className="h-0.5 w-full bg-neutral-850 rounded-full overflow-hidden">
                        <div style={{ width: `${expPct}%` }} className="h-full bg-rose-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. INCOME & EXPENSE CATEGORY BREAKDOWN (COMPACT GRID) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Income Categories */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <h2 className="text-xs font-bold text-white">
                {isTamil ? 'வருமானப் பிரிவுகள்' : 'Income Categories'}
              </h2>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400">
              +{formatCompactMoney(totalIncomeSum, currency)}
            </span>
          </div>

          {Object.keys(incCatMap).length === 0 ? (
            <p className="text-[11px] text-neutral-500 text-center py-4">
              {isTamil ? 'வருமானப் பிரிவுகள் இல்லை.' : 'No income categories.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {Object.values(incCatMap).map((cat, idx) => {
                const pct = totalIncomeSum > 0 ? ((cat.amount / totalIncomeSum) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="p-2 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span style={{ backgroundColor: cat.color }} className="w-2 h-2 rounded-full inline-block shrink-0" />
                        <span className="font-medium text-white truncate">{cat.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono shrink-0">({cat.count})</span>
                      </div>
                      <div className="font-mono text-emerald-400 font-semibold shrink-0">
                        +{formatCompactMoney(cat.amount, currency)} <span className="text-neutral-500 text-[10px]">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-neutral-850 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%`, backgroundColor: cat.color }} className="h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Categories */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <h2 className="text-xs font-bold text-white">
                {isTamil ? 'செலவுப் பிரிவுகள்' : 'Expense Categories'}
              </h2>
            </div>
            <span className="text-[11px] font-mono font-bold text-rose-400">
              -{formatCompactMoney(totalExpenseSum, currency)}
            </span>
          </div>

          {Object.keys(expCatMap).length === 0 ? (
            <p className="text-[11px] text-neutral-500 text-center py-4">
              {isTamil ? 'செலவுப் பிரிவுகள் இல்லை.' : 'No expense categories.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {Object.values(expCatMap).map((cat, idx) => {
                const pct = totalExpenseSum > 0 ? ((cat.amount / totalExpenseSum) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="p-2 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span style={{ backgroundColor: cat.color }} className="w-2 h-2 rounded-full inline-block shrink-0" />
                        <span className="font-medium text-white truncate">{cat.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono shrink-0">({cat.count})</span>
                      </div>
                      <div className="font-mono text-rose-400 font-semibold shrink-0">
                        -{formatCompactMoney(cat.amount, currency)} <span className="text-neutral-500 text-[10px]">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-neutral-850 rounded-full overflow-hidden">
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
