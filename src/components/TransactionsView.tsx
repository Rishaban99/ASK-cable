import React, { useState } from 'react';
import {
  Category,
  IncomeRecord,
  ExpenseRecord,
  SupportedCurrency
} from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import {
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Tag,
  Search,
  Download,
  Sparkles,
  X
} from 'lucide-react';

interface TransactionsViewProps {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: Category[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  onOpenRecordModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  incomes,
  expenses,
  categories,
  currency,
  onRefreshData,
  onOpenRecordModal,
}) => {
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
      setNewCatName('');
      onRefreshData();
    } catch (err: any) {
      setCatError(err.message || 'Failed to create category');
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
      setEditingCategory(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.deleteCategory(id);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
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
      alert('Please enter a valid positive amount');
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
      setEditingIncome(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update income record');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income record?')) return;
    try {
      await api.deleteIncome(id);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete income record');
    }
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
      alert('Please enter a valid positive amount');
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
      setEditingExpense(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update expense record');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.deleteExpense(id);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense record');
    }
  };

  const totalIncomesSum = filteredIncomes.reduce((sum, r) => sum + r.amount, 0);
  const totalExpensesSum = filteredExpenses.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Incomes & Expenses Tables</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Edit, search, and manage your records and categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSubTab === 'incomes' && (
            <button
              onClick={() => api.downloadIncomesCsv()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
          {activeSubTab === 'expenses' && (
            <button
              onClick={() => api.downloadExpensesCsv()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            onClick={onOpenRecordModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setActiveSubTab('incomes')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeSubTab === 'incomes'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Incomes Table ({incomes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeSubTab === 'expenses'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Expenses Table ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeSubTab === 'categories'
              ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 1. INCOMES TABLE VIEW */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'incomes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search income records by description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-white focus:outline-none focus:border-neutral-700"
            >
              <option value="">All Income Categories</option>
              {categories.filter(c => c.type === 'INCOME').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-mono">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3 text-right">Amount (LKR)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filteredIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                        No income records found.
                      </td>
                    </tr>
                  ) : (
                    filteredIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-neutral-850/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-neutral-300">{inc.date}</td>
                        <td className="px-4 py-3 font-medium text-white">{inc.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{
                              backgroundColor: `${inc.categoryColor || '#10B981'}20`,
                              color: inc.categoryColor || '#10B981',
                              border: `1px solid ${inc.categoryColor || '#10B981'}40`,
                            }}
                          >
                            <span>{inc.categoryName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{inc.paymentMethod}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                          +{formatMoney(inc.amount, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditIncome(inc)}
                              className="text-neutral-400 hover:text-emerald-400 transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncome(inc.id)}
                              className="text-neutral-500 hover:text-rose-400 transition-colors"
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

            <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Total Income Inflows:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
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
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search expense records by description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-white focus:outline-none focus:border-neutral-700"
            >
              <option value="">All Expense Categories</option>
              {categories.filter(c => c.type === 'EXPENSE').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-mono">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3 text-right">Amount (LKR)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                        No expense records found.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-neutral-850/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-neutral-300">{exp.date}</td>
                        <td className="px-4 py-3 font-medium text-white">{exp.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{
                              backgroundColor: `${exp.categoryColor || '#F43F5E'}20`,
                              color: exp.categoryColor || '#F43F5E',
                              border: `1px solid ${exp.categoryColor || '#F43F5E'}40`,
                            }}
                          >
                            <span>{exp.categoryName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{exp.paymentMethod}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-rose-400">
                          -{formatMoney(exp.amount, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditExpense(exp)}
                              className="text-neutral-400 hover:text-emerald-400 transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-neutral-500 hover:text-rose-400 transition-colors"
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

            <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Total Operational Expenses:</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
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
          <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-4">
            <h2 className="text-sm font-semibold text-white">Create New Category</h2>

            {catError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded">
                {catError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Category Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('INCOME')}
                    className={`py-1.5 rounded border transition-colors ${
                      newCatType === 'INCOME'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-medium'
                        : 'border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('EXPENSE')}
                    className={`py-1.5 rounded border transition-colors ${
                      newCatType === 'EXPENSE'
                        ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 font-medium'
                        : 'border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-400">Category Name</label>
                  {newCatName.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsAiFixing(true);
                        const fixed = await api.fixSpelling(newCatName);
                        if (fixed) setNewCatName(fixed);
                        setIsAiFixing(false);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isAiFixing ? 'Correcting...' : 'Fix English with AI ✨'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Investment, Equipment Purchase"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Color Tag</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
              >
                Add Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-4">
            <h2 className="text-sm font-semibold text-white">Active Categories ({categories.length})</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      style={{ backgroundColor: c.color }}
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        {c.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditCategory(c)}
                      className="text-neutral-400 hover:text-emerald-400 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!c.isDefault && (
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors"
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

      {/* ------------------------------------------------------------------- */}
      {/* EDIT CATEGORY MODAL */}
      {/* ------------------------------------------------------------------- */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white">Edit Category</h2>
              <button onClick={() => setEditingCategory(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-400">Category Name</label>
                  {editCatName.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        const fixed = await api.fixSpelling(editCatName);
                        if (fixed) setEditCatName(fixed);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Fix English with AI ✨</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Color Tag</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editCatColor}
                    onChange={(e) => setEditCatColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-400 font-semibold text-neutral-950 hover:bg-emerald-300"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white">Edit Income Record</h2>
              <button onClick={() => setEditingIncome(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditIncome} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Amount (Rs. LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editIncAmount}
                    onChange={(e) => setEditIncAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editIncDate}
                    onChange={(e) => setEditIncDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Category</label>
                <select
                  value={editIncCategoryId}
                  onChange={(e) => setEditIncCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                >
                  {categories.filter(c => c.type === 'INCOME').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-400">Description</label>
                  {editIncDescription.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        const fixed = await api.fixSpelling(editIncDescription);
                        if (fixed) setEditIncDescription(fixed);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Fix English with AI ✨</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={editIncDescription}
                  onChange={(e) => setEditIncDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Payment Method</label>
                <select
                  value={editIncPaymentMethod}
                  onChange={(e) => setEditIncPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / CEFT</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="UPI">Direct / QR Pay</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIncome(null)}
                  className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-400 font-semibold text-neutral-950 hover:bg-emerald-300"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white">Edit Expense Record</h2>
              <button onClick={() => setEditingExpense(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Amount (Rs. LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editExpAmount}
                    onChange={(e) => setEditExpAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editExpDate}
                    onChange={(e) => setEditExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Category</label>
                <select
                  value={editExpCategoryId}
                  onChange={(e) => setEditExpCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                >
                  {categories.filter(c => c.type === 'EXPENSE').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-400">Description</label>
                  {editExpDescription.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        const fixed = await api.fixSpelling(editExpDescription);
                        if (fixed) setEditExpDescription(fixed);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Fix English with AI ✨</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={editExpDescription}
                  onChange={(e) => setEditExpDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Payment Method</label>
                <select
                  value={editExpPaymentMethod}
                  onChange={(e) => setEditExpPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / CEFT</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="UPI">Direct / QR Pay</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-400 font-semibold text-neutral-950 hover:bg-emerald-300"
                >
                  Update Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
