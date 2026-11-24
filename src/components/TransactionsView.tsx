import React, { useState, useMemo } from 'react';
import {
  Category,
  IncomeRecord,
  ExpenseRecord,
  SupportedCurrency,
  User,
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
  Sparkles,
  Receipt,
  Wallet,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock,
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Category creation states
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newCatColor, setNewCatColor] = useState('#1D4ED8');
  const [catError, setCatError] = useState('');

  // Editing state for Category
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('#1D4ED8');

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

  // Totals
  const totalIncomeSum = useMemo(() => incomes.reduce((acc, curr) => acc + (curr.amount || 0), 0), [incomes]);
  const totalExpenseSum = useMemo(() => expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0), [expenses]);
  const netLedgerBalance = totalIncomeSum - totalExpenseSum;
  const isNetPositive = netLedgerBalance >= 0;

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter((r) => {
      const matchesSearch = !searchQuery || r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !selectedCategoryFilter || r.categoryId === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [incomes, searchQuery, selectedCategoryFilter]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((r) => {
      const matchesSearch = !searchQuery || r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !selectedCategoryFilter || r.categoryId === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [expenses, searchQuery, selectedCategoryFilter]);

  // Active records based on subtab
  const activeRecords = activeSubTab === 'incomes' ? filteredIncomes : filteredExpenses;
  const totalPages = Math.max(1, Math.ceil(activeRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeRecords.slice(start, start + pageSize);
  }, [activeRecords, currentPage, pageSize]);

  // Category creation
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
      setCatError(err.message || 'Failed to create category');
      toast.error(err.message || 'Failed to create category');
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
      toast.error(err.message || 'Failed to update category');
    }
  };

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
          toast.error(err.message || 'Failed to delete category');
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
      toast.error(err.message || 'Failed to update income record');
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
          toast.success('Income record deleted.');
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete income record');
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
      toast.error(err.message || 'Failed to update expense record');
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
          toast.success('Expense record deleted.');
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete expense record');
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. HEADER & KPI CARDS STRIP */}
      {/* ==================================================================== */}
      <div className="erp-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Income & Expense Financial Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track multi-stream cash inflows, operational overhead, and customize financial ledger categories
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* CSV Export */}
          <button
            onClick={() =>
              activeSubTab === 'incomes' ? api.downloadIncomesCsv() : api.downloadExpensesCsv()
            }
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenRecordModal}
            className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Income</span>
            <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
              {formatMoney(totalIncomeSum, currency)}
            </div>
            <span className="text-[10px] text-slate-400">{incomes.length} Inflows</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total Expenses</span>
            <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
              {formatMoney(totalExpenseSum, currency)}
            </div>
            <span className="text-[10px] text-slate-400">{expenses.length} Outflows</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Net Ledger Balance</span>
            <div
              className={`text-lg font-black font-mono mt-0.5 ${
                isNetPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {formatMoney(netLedgerBalance, currency)}
            </div>
            <span className="text-[10px] text-slate-400">Cash Difference</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Categories</span>
            <div className="text-xl font-black text-teal-700 dark:text-teal-400 mt-0.5">{categories.length}</div>
            <span className="text-[10px] text-slate-400">Configured</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. SUBTAB CONTROLS */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-1 text-xs">
        <button
          onClick={() => {
            setActiveSubTab('incomes');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'incomes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Incomes ({incomes.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('expenses');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'expenses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 3. INCOMES & EXPENSES TABLES */}
      {/* ==================================================================== */}
      {activeSubTab !== 'categories' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="erp-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={`Search ${activeSubTab} by description...`}
                className="erp-input pl-9 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="erp-input py-1.5 text-xs w-auto font-semibold"
            >
              <option value="">All Categories</option>
              {categories
                .filter((c) => c.type === (activeSubTab === 'incomes' ? 'INCOME' : 'EXPENSE'))
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Table */}
          <div className="erp-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="erp-table text-xs">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No {activeSubTab} records found for this query.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="font-mono text-slate-500 whitespace-nowrap">{item.date}</td>
                        <td className="font-bold text-slate-900 dark:text-white max-w-[280px] truncate">
                          {item.description}
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: `${item.categoryColor || '#1D4ED8'}15`,
                              color: item.categoryColor || '#1D4ED8',
                              borderColor: `${item.categoryColor || '#1D4ED8'}30`,
                            }}
                            className="badge-status text-[10px]"
                          >
                            {item.categoryName || 'Other'}
                          </span>
                        </td>
                        <td className="font-mono text-slate-500 text-[11px]">{item.paymentMethod || 'CASH'}</td>
                        <td
                          className={`text-right font-mono font-black ${
                            activeSubTab === 'incomes'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {activeSubTab === 'incomes' ? '+' : '-'} {formatMoney(item.amount, currency)}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                activeSubTab === 'incomes'
                                  ? handleOpenEditIncome(item as IncomeRecord)
                                  : handleOpenEditExpense(item as ExpenseRecord)
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                activeSubTab === 'incomes'
                                  ? handleDeleteIncome(item.id)
                                  : handleDeleteExpense(item.id)
                              }
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/15"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {activeRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, activeRecords.length)} of {activeRecords.length} records
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="font-mono font-bold px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. CATEGORIES MANAGER SUBTAB */}
      {/* ==================================================================== */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Create Category Form */}
          <div className="lg:col-span-4 erp-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.04] pb-3">
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Create New Category</span>
            </h3>

            {catError && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs">{catError}</div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Office Rent, Signal Amplifiers"
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Category Type</label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="erp-input font-medium"
                >
                  <option value="EXPENSE">EXPENSE</option>
                  <option value="INCOME">INCOME</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Color Badge</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-10 h-9 p-1 rounded-lg border border-slate-200 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="erp-input font-mono uppercase text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full btn-primary py-2 text-xs font-bold">
                  Save Category
                </button>
              </div>
            </form>
          </div>

          {/* Existing Categories List */}
          <div className="lg:col-span-8 erp-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.04] pb-3">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Existing Categories ({categories.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{ backgroundColor: cat.color }}
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{cat.name}</span>
                      <span
                        className={`badge-status text-[8px] ml-2 ${
                          cat.type === 'INCOME' ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {cat.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Category</h3>
            <form onSubmit={handleSaveEditCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Name</label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="w-10 h-9 p-1 rounded-lg border border-slate-200 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-xs font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {editingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Income Record</h3>
            <form onSubmit={handleSaveEditIncome} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Amount (LKR)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editIncAmount}
                  onChange={(e) => setEditIncAmount(e.target.value)}
                  className="erp-input font-mono font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  required
                  value={editIncDescription}
                  onChange={(e) => setEditIncDescription(e.target.value)}
                  className="erp-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Date</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Locked
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      readOnly
                      disabled
                      tabIndex={-1}
                      value={editIncDate}
                      className="erp-input font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-90 pr-8 pointer-events-none"
                      title="Date is locked and cannot be modified"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={editIncCategoryId}
                    onChange={(e) => setEditIncCategoryId(e.target.value)}
                    className="erp-input"
                  >
                    {categories
                      .filter((c) => c.type === 'INCOME')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIncome(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-xs font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Expense Record</h3>
            <form onSubmit={handleSaveEditExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Amount (LKR)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editExpAmount}
                  onChange={(e) => setEditExpAmount(e.target.value)}
                  className="erp-input font-mono font-bold text-rose-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  required
                  value={editExpDescription}
                  onChange={(e) => setEditExpDescription(e.target.value)}
                  className="erp-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Date</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Locked
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      readOnly
                      disabled
                      tabIndex={-1}
                      value={editExpDate}
                      className="erp-input font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-90 pr-8 pointer-events-none"
                      title="Date is locked and cannot be modified"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={editExpCategoryId}
                    onChange={(e) => setEditExpCategoryId(e.target.value)}
                    className="erp-input"
                  >
                    {categories
                      .filter((c) => c.type === 'EXPENSE')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-xs font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
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
