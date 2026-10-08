import React, { useState, useEffect, useCallback } from 'react';
import {
  IncomeRecord,
  ExpenseRecord,
  Category,
  Customer,
  MonthlyPayment,
  AnalyticsOverview,
  SupportedCurrency,
  User
} from './types/finance.js';
import { api } from './api/client.js';
import { Navbar } from './components/Navbar.js';
import { DashboardView } from './components/DashboardView.js';
import { TransactionsView } from './components/TransactionsView.js';
import { SummaryView } from './components/SummaryView.js';
import { CustomersView } from './components/CustomersView.js';
import { MonthlyPaymentView } from './components/MonthlyPaymentView.js';
import { CustomerHistoryView } from './components/CustomerHistoryView.js';
import { LoginView } from './components/LoginView.js';
import { RecordModal } from './components/RecordModal.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'transactions' | 'summary' | 'customers' | 'monthly-payment' | 'customer-history'>('dashboard');
  const [selectedHistoryCustomerId, setSelectedHistoryCustomerId] = useState<string | null>(null);
  const currency: SupportedCurrency = 'LKR';

  // Application Data States - Strictly fetched from DB
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Handle Login & Logout
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ask_cable_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user session:', e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ask_cable_user');
    } catch (e) {
      console.error('Failed to clear user session:', e);
    }
  };

  // Staff Permission Guard: Redirect Staff away from Total Summary page
  useEffect(() => {
    if (currentUser?.role === 'STAFF' && currentTab === 'summary') {
      setCurrentTab('dashboard');
    }
  }, [currentUser, currentTab]);

  // Load live DB data from Prisma API
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [analyticsData, incs, exps, cats, custs, pmts] = await Promise.all([
        api.getAnalytics(),
        api.getIncomes(),
        api.getExpenses(),
        api.getCategories(),
        api.getCustomers(),
        api.getMonthlyPayments(),
      ]);

      setAnalytics(analyticsData);
      setIncomes(incs);
      setExpenses(exps);
      setCategories(cats);
      setCustomers(custs);
      setMonthlyPayments(pmts);
    } catch (e) {
      console.error('Failed to load application data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Render Login View if Unauthenticated
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Universal Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currency={currency}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
        analytics={analytics}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView
            analytics={analytics}
            currency={currency}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            onNavigateToTab={(tab) => setCurrentTab(tab as any)}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            incomes={incomes}
            expenses={expenses}
            categories={categories}
            currency={currency}
            onRefreshData={loadData}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'summary' && currentUser.role === 'ADMIN' && (
          <SummaryView
            analytics={analytics}
            incomes={incomes}
            expenses={expenses}
            categories={categories}
            currency={currency}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            currency={currency}
            onRefreshData={loadData}
            currentUser={currentUser}
            onViewHistory={(custId) => {
              setSelectedHistoryCustomerId(custId);
              setCurrentTab('customer-history');
            }}
          />
        )}

        {currentTab === 'monthly-payment' && (
          <MonthlyPaymentView
            monthlyPayments={monthlyPayments}
            customers={customers}
            currency={currency}
            onRefreshData={loadData}
            currentUser={currentUser}
            onViewHistory={(custId) => {
              setSelectedHistoryCustomerId(custId);
              setCurrentTab('customer-history');
            }}
          />
        )}

        {currentTab === 'customer-history' && (
          <CustomerHistoryView
            customers={customers}
            monthlyPayments={monthlyPayments}
            currency={currency}
            onRefreshData={loadData}
            currentUser={currentUser}
            selectedCustomerId={selectedHistoryCustomerId}
            onSelectCustomer={(custId) => setSelectedHistoryCustomerId(custId)}
          />
        )}
      </main>

      {/* Modals */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        categories={categories}
        currency={currency}
        onSuccess={loadData}
      />
    </div>
  );
}
