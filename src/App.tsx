import React, { useState, useEffect, useCallback } from 'react';
import {
  IncomeRecord,
  ExpenseRecord,
  Category,
  Customer,
  MonthlyPayment,
  AnalyticsOverview,
  SupportedCurrency,
  User,
  StaffPrivileges,
  DEFAULT_STAFF_PRIVILEGES
} from './types/finance.js';
import { api } from './api/client.js';
import { Navbar, NavTab } from './components/Navbar.js';
import { DashboardView } from './components/DashboardView.js';
import { TransactionsView } from './components/TransactionsView.js';
import { SummaryView } from './components/SummaryView.js';
import { CustomersView } from './components/CustomersView.js';
import { MonthlyPaymentView } from './components/MonthlyPaymentView.js';
import { CustomerHistoryView } from './components/CustomerHistoryView.js';
import { SettingsView } from './components/SettingsView.js';
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

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedHistoryCustomerId, setSelectedHistoryCustomerId] = useState<string | null>(null);
  const currency: SupportedCurrency = 'LKR';

  // Staff Privileges State
  const [staffPrivileges, setStaffPrivileges] = useState<StaffPrivileges>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_staff_privileges');
      return saved ? { ...DEFAULT_STAFF_PRIVILEGES, ...JSON.parse(saved) } : DEFAULT_STAFF_PRIVILEGES;
    } catch {
      return DEFAULT_STAFF_PRIVILEGES;
    }
  });

  const reloadPrivileges = useCallback(() => {
    try {
      const saved = localStorage.getItem('ask_cable_staff_privileges');
      if (saved) {
        setStaffPrivileges({ ...DEFAULT_STAFF_PRIVILEGES, ...JSON.parse(saved) });
      }
    } catch {
      // ignore
    }
  }, []);

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

  // Staff Permission Guard: Redirect Staff away from restricted pages
  useEffect(() => {
    if (currentUser?.role === 'STAFF') {
      if (currentTab === 'settings') {
        setCurrentTab('dashboard');
        return;
      }
      const isAllowed = staffPrivileges[currentTab as keyof StaffPrivileges];
      if (isAllowed === false) {
        setCurrentTab('dashboard');
      }
    }
  }, [currentUser, currentTab, staffPrivileges]);

  // Load live DB data from Prisma API
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [analyticsData, incs, exps, cats, custs, pmts, dbPrivs] = await Promise.all([
        api.getAnalytics(),
        api.getIncomes(),
        api.getExpenses(),
        api.getCategories(),
        api.getCustomers(),
        api.getMonthlyPayments(),
        api.getStaffPrivileges().catch(() => null),
      ]);

      setAnalytics(analyticsData);
      setIncomes(incs);
      setExpenses(exps);
      setCategories(cats);
      setCustomers(custs);
      setMonthlyPayments(pmts);
      if (dbPrivs) {
        setStaffPrivileges(dbPrivs);
      }
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
        staffPrivileges={staffPrivileges}
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

        {currentTab === 'settings' && currentUser.role === 'ADMIN' && (
          <SettingsView
            currentUser={currentUser}
            onPrivilegesUpdated={reloadPrivileges}
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
