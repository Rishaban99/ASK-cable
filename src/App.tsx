import React, { useState, useEffect, useCallback } from 'react';
import {
  IncomeRecord,
  ExpenseRecord,
  Category,
  Customer,
  AnalyticsOverview,
  SupportedCurrency
} from './types/finance.js';
import { api } from './api/client.js';
import { Navbar } from './components/Navbar.js';
import { DashboardView } from './components/DashboardView.js';
import { TransactionsView } from './components/TransactionsView.js';
import { SummaryView } from './components/SummaryView.js';
import { CustomersView } from './components/CustomersView.js';
import { RecordModal } from './components/RecordModal.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'transactions' | 'summary' | 'customers'>('dashboard');
  const currency: SupportedCurrency = 'LKR';

  // Application Data States - Strictly fetched from DB
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Clear legacy mock data cache if any existed
  useEffect(() => {
    try {
      localStorage.removeItem('ask_cable_analytics_cache');
      localStorage.removeItem('ask_cable_incomes_cache');
      localStorage.removeItem('ask_cable_expenses_cache');
      localStorage.removeItem('ask_cable_categories_cache');
    } catch {
      // ignore
    }
  }, []);

  // Load live DB data from Prisma API
  const loadData = useCallback(async () => {
    try {
      const [analyticsData, incs, exps, cats, custs] = await Promise.all([
        api.getAnalytics(),
        api.getIncomes(),
        api.getExpenses(),
        api.getCategories(),
        api.getCustomers(),
      ]);

      setAnalytics(analyticsData);
      setIncomes(incs);
      setExpenses(exps);
      setCategories(cats);
      setCustomers(custs);
    } catch (e) {
      console.error('Failed to load application data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Universal Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currency={currency}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
        analytics={analytics}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView
            analytics={analytics}
            currency={currency}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
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
          />
        )}

        {currentTab === 'summary' && (
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
