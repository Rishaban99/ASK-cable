import React, { useState } from 'react';
import {
  Category,
  IncomeRecord,
  ExpenseRecord,
  SupportedCurrency,
  User
} from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { useToast } from './Toast.js';
import { ConfirmModal } from './ConfirmModal.js';
import {
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Tag,
  Search,
  Download,
  X,
  Sparkles
} from 'lucide-react';
import { Spinner } from './Spinner.js';

interface TransactionsViewProps {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: Category[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  onOpenRecordModal: () => void;
  currentUser?: User | null;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  incomes,
  expenses,
  categories,
  currency,
  onRefreshData,
  onOpenRecordModal,
  currentUser,
}) => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'incomes' | 'expenses' | 'categories'>('incomes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Category creation states
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newCatColor, setNewCatColor] = useState('#10B981');
  const [catError, setCatError] = useState('');

  // Editing state for Category
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('#10B981');

  // Editing state for Income
  const [editingIncome, setEditingIncome] = useState<IncomeRecord | null>(null);
  const [editIncAmount, setEditIncAmount] = useState('');
  const [editIncDescription, setEditIncDescription] = useState('');
  const [editIncDate, setEditIncDate] = useState('');
  const [editIncCategoryId, setEditIncCategoryId] = useState('');
  const [editIncPaymentMethod, setEditIncPaymentMethod] = useState('');

  // Editing state for Expense
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editExpAmount, setEditExpAmount] = useState('');
  const [editExpDescription, setEditExpDescription] = useState('');
  const [editExpDate, setEditExpDate] = useState('');
  const [editExpCategoryId, setEditExpCategoryId] = useState('');
  const [editExpPaymentMethod, setEditExpPaymentMethod] = useState('');

  const [isAiFixing, setIsAiFixing] = useState(false);

  // Filtered incomes
  const filteredIncomes = incomes.filter((r) => {
    const matchesSearch = !searchQuery || r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !selectedCategoryFilter || r.categoryId === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Filtered expenses
  const filteredExpenses = expenses.filter((r) => {
    const matchesSearch = !searchQuery || r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !selectedCategoryFilter || r.categoryId === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Category creation & edit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    if (!newCatName.trim()) {
      setCatError('Category name is required');
      return;
    }
    try {
      await api.createCategory({
        name: newCatName.trim(),
        type: newCatType,
        icon: 'Tag',
        color: newCatColor,
      });
      toast.success(`Category "${newCatName.trim()}" created successfully!`);
      setNewCatName('');
      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to create category';
      setCatError(msg);
      toast.error(msg);
    }
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;
    try {
      await api.updateCategory(editingCategory.id, {
        name: editCatName.trim(),
        color: editCatColor,
      });
      toast.success(`Category "${editCatName.trim()}" updated successfully!`);
      setEditingCategory(null);
      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to update category';
      toast.error(msg);
    }
  };

  // Confirm Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'emerald' | 'indigo';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleDeleteCategory = (id: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? Associated records will remain.',
      confirmText: 'Delete Category',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteCategory(id);
          toast.success('Category deleted successfully!');
          onRefreshData();
        } catch (err: any) {
          const msg = err.message || 'Failed to delete category';
          toast.error(msg);
        }
      },
    });
  };

  // Income edit & delete
  const handleOpenEditIncome = (inc: IncomeRecord) => {
    setEditingIncome(inc);
    setEditIncAmount(inc.amount.toString());
    setEditIncDescription(inc.description);
    setEditIncDate(inc.date);
    setEditIncCategoryId(inc.categoryId);
    setEditIncPaymentMethod(inc.paymentMethod);
  };

  const handleSaveEditIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome) return;
    const amt = parseFloat(editIncAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }
    try {
      await api.updateIncome(editingIncome.id, {
        amount: amt,
        description: editIncDescription.trim(),
        date: editIncDate,
        categoryId: editIncCategoryId,
        paymentMethod: editIncPaymentMethod,
      });
      toast.success('Income record updated successfully!');
      setEditingIncome(null);
      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to update income record';
      toast.error(msg);
    }
  };

  const handleDeleteIncome = (id: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Income Record',
      message: 'Are you sure you want to delete this income record? This action cannot be undone.',
      confirmText: 'Delete Income',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteIncome(id);
          toast.success('Income record deleted successfully!');
          onRefreshData();
        } catch (err: any) {
          const msg = err.message || 'Failed to delete income record';
          toast.error(msg);
        }
      },
    });
  };

  // Expense edit & delete
  const handleOpenEditExpense = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setEditExpAmount(exp.amount.toString());
    setEditExpDescription(exp.description);
    setEditExpDate(exp.date);
    setEditExpCategoryId(exp.categoryId);
    setEditExpPaymentMethod(exp.paymentMethod);
  };

  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const amt = parseFloat(editExpAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }
    try {
      await api.updateExpense(editingExpense.id, {
        amount: amt,
        description: editExpDescription.trim(),
        date: editExpDate,
        categoryId: editExpCategoryId,
        paymentMethod: editExpPaymentMethod,
      });
      toast.success('Expense record updated successfully!');
      setEditingExpense(null);
      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to update expense record';
      toast.error(msg);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Expense Record',
      message: 'Are you sure you want to delete this expense record? This action cannot be undone.',
      confirmText: 'Delete Expense',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteExpense(id);
          toast.success('Expense record deleted successfully!');
          onRefreshData();
        } catch (err: any) {
          const msg = err.message || 'Failed to delete expense record';
          toast.error(msg);
        }
      },
    });
  };

  const totalIncomesSum = filteredIncomes.reduce((sum, r) => sum + r.amount, 0);
  const totalExpensesSum = filteredExpenses.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Incomes &amp; Expenses Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audit, search, and manage financial records and custom ledger categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSubTab === 'incomes' && (
            <button
              onClick={() => api.downloadIncomesCsv()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}
          {activeSubTab === 'expenses' && (
            <button
              onClick={() => api.downloadExpensesCsv()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={onOpenRecordModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-xs hover:shadow-sm hover:shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="flex overflow-x-auto items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('incomes')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'incomes'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400/50 text-emerald-700 dark:text-emerald-400 shadow-xs'
              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Incomes Table</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            {incomes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'expenses'
              ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-400/50 text-rose-700 dark:text-rose-400 shadow-xs'
              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Expenses Table</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-700 dark:text-rose-400">
            {expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeSubTab === 'categories'
              ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-400/50 text-indigo-700 dark:text-indigo-400 shadow-xs'
              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categories</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
            {categories.length}
          </span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 1. INCOMES TABLE VIEW */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'incomes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search income records by description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-all"
              />
            </div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-all cursor-pointer"
            >
              <option value="">All Income Categories</option>
              {categories.filter(c => c.type === 'INCOME').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Cards View for Incomes (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {filteredIncomes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                No income records found matching your filters.
              </div>
            ) : (
              filteredIncomes.map((inc) => (
                <div key={inc.id} className="p-4 space-y-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs transition-all">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{inc.description}</h3>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Date: {inc.date} • Method: <span className="text-slate-700 dark:text-slate-200 font-medium">{inc.paymentMethod}</span></p>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg shrink-0">
                      +{formatMoney(inc.amount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: `${inc.categoryColor || '#10B981'}15`,
                        color: inc.categoryColor || '#10B981',
                        border: `1px solid ${inc.categoryColor || '#10B981'}30`,
                      }}
                    >
                      {inc.categoryName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditIncome(inc)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {currentUser?.role !== 'STAFF' && (
                        <button
                          onClick={() => handleDeleteIncome(inc.id)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono shadow-xs">
              <span className="font-sans font-medium text-slate-600 dark:text-slate-300">Total Income Inflows:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                +{formatMoney(totalIncomesSum, currency)}
              </span>
            </div>
          </div>

          {/* Desktop Table View for Incomes (hidden md:block) */}
          <div className="hidden md:block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Payment Method</th>
                    <th className="px-5 py-3.5 text-right">Amount ({currency})</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                        No income records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">{inc.date}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{inc.description}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${inc.categoryColor || '#10B981'}15`,
                              color: inc.categoryColor || '#10B981',
                              border: `1px solid ${inc.categoryColor || '#10B981'}30`,
                            }}
                          >
                            <span>{inc.categoryName}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">{inc.paymentMethod}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(inc.amount, currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditIncome(inc)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {currentUser?.role !== 'STAFF' && (
                              <button
                                onClick={() => handleDeleteIncome(inc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Delete Record (Admin Only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">Total Income Inflows:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                +{formatMoney(totalIncomesSum, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. EXPENSES TABLE VIEW */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search expense records by description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-all"
              />
            </div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-all cursor-pointer"
            >
              <option value="">All Expense Categories</option>
              {categories.filter(c => c.type === 'EXPENSE').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Cards View for Expenses (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                No expense records found matching your filters.
              </div>
            ) : (
              filteredExpenses.map((exp) => (
                <div key={exp.id} className="p-4 space-y-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs transition-all">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{exp.description}</h3>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Date: {exp.date} • Method: <span className="text-slate-700 dark:text-slate-200 font-medium">{exp.paymentMethod}</span></p>
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg shrink-0">
                      -{formatMoney(exp.amount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: `${exp.categoryColor || '#F43F5E'}15`,
                        color: exp.categoryColor || '#F43F5E',
                        border: `1px solid ${exp.categoryColor || '#F43F5E'}30`,
                      }}
                    >
                      {exp.categoryName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditExpense(exp)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {currentUser?.role !== 'STAFF' && (
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono shadow-xs">
              <span className="font-sans font-medium text-slate-600 dark:text-slate-300">Total Operational Expenses:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                -{formatMoney(totalExpensesSum, currency)}
              </span>
            </div>
          </div>

          {/* Desktop Table View for Expenses (hidden md:block) */}
          <div className="hidden md:block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Payment Method</th>
                    <th className="px-5 py-3.5 text-right">Amount ({currency})</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                        No expense records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">{exp.date}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{exp.description}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${exp.categoryColor || '#F43F5E'}15`,
                              color: exp.categoryColor || '#F43F5E',
                              border: `1px solid ${exp.categoryColor || '#F43F5E'}30`,
                            }}
                          >
                            <span>{exp.categoryName}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">{exp.paymentMethod}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          -{formatMoney(exp.amount, currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditExpense(exp)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {currentUser?.role !== 'STAFF' && (
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Delete Record (Admin Only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">Total Operational Expenses:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                -{formatMoney(totalExpensesSum, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. CATEGORIES MANAGEMENT VIEW */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Create New Category</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add custom tags for financial reporting</p>
            </div>

            {catError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                {catError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Category Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('INCOME')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      newCatType === 'INCOME'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('EXPENSE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      newCatType === 'EXPENSE'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium">Category Name</label>
                  {newCatName.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsAiFixing(true);
                        const fixed = await api.fixSpelling(newCatName);
                        if (fixed) setNewCatName(fixed);
                        setIsAiFixing(false);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isAiFixing ? 'Correcting...' : 'Fix English ✨'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fiber Line Expansion, Equipment"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Color Tag</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono uppercase text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Add Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Categories ({categories.length})</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Categories used across incomes and expenses</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      style={{ backgroundColor: c.color }}
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white dark:ring-slate-900"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {c.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditCategory(c)}
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* EDIT CATEGORY MODAL */}
      {/* ------------------------------------------------------------------- */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Category</h2>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium">Category Name</label>
                  {editCatName.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        const fixed = await api.fixSpelling(editCatName);
                        if (fixed) setEditCatName(fixed);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Fix English ✨</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Color Tag</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono uppercase text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold text-white shadow-xs transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* EDIT INCOME MODAL */}
      {/* ------------------------------------------------------------------- */}
      {editingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Income Record</h2>
              <button onClick={() => setEditingIncome(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditIncome} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editIncAmount}
                    onChange={(e) => setEditIncAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={editIncDate}
                    onChange={(e) => setEditIncDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Category</label>
                <select
                  value={editIncCategoryId}
                  onChange={(e) => setEditIncCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  {categories.filter(c => c.type === 'INCOME').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium">Description</label>
                  {editIncDescription.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        const fixed = await api.fixSpelling(editIncDescription);
                        if (fixed) setEditIncDescription(fixed);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Fix English ✨</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={editIncDescription}
                  onChange={(e) => setEditIncDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Payment Method</label>
                <select
                  value={editIncPaymentMethod}
                  onChange={(e) => setEditIncPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / CEFT</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="UPI">Direct / QR Pay</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIncome(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold text-white shadow-xs transition-all cursor-pointer"
                >
                  Update Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* EDIT EXPENSE MODAL */}
      {/* ------------------------------------------------------------------- */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Expense Record</h2>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editExpAmount}
                    onChange={(e) => setEditExpAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={editExpDate}
                    onChange={(e) => setEditExpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Category</label>
                <select
                  value={editExpCategoryId}
                  onChange={(e) => setEditExpCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  {categories.filter(c => c.type === 'EXPENSE').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium">Description</label>
                  {editExpDescription.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        const fixed = await api.fixSpelling(editExpDescription);
                        if (fixed) setEditExpDescription(fixed);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Fix English ✨</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={editExpDescription}
                  onChange={(e) => setEditExpDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Payment Method</label>
                <select
                  value={editExpPaymentMethod}
                  onChange={(e) => setEditExpPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / CEFT</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="UPI">Direct / QR Pay</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold text-white shadow-xs transition-all cursor-pointer"
                >
                  Update Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Dialog Modal Card */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        variant={confirmModalConfig.variant}
      />
    </div>
  );
};
