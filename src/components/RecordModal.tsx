import React, { useState } from 'react';
import {
  Category,
  SupportedCurrency
} from '../types/finance.js';
import { api } from '../api/client.js';
import { X, Sparkles, Receipt, ArrowDownRight, ArrowUpRight, Lock } from 'lucide-react';
import { useToast } from './Toast.tsx';
import { Spinner } from './Spinner.tsx';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currency?: SupportedCurrency;
  onSuccess: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSuccess,
}) => {
  const toast = useToast();
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState('CASH');
  const [txTags, setTxTags] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFixingSpelling, setIsFixingSpelling] = useState(false);

  // Filter categories by chosen type
  const availableCategories = categories.filter((c) => c.type === txType);

  React.useEffect(() => {
    if (isOpen) {
      setTxDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some((c) => c.id === txCategoryId)) {
      setTxCategoryId(availableCategories[0].id);
    }
  }, [txType, categories]);

  if (!isOpen) return null;

  const handleFixSpelling = async () => {
    if (!txDescription.trim()) return;
    setIsFixingSpelling(true);
    try {
      const fixed = await api.fixSpelling(txDescription);
      if (fixed) {
        setTxDescription(fixed);
        toast.ai('English spelling corrected with AI ✨');
      }
    } catch (e) {
      toast.error('AI spell-check failed');
    } finally {
      setIsFixingSpelling(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid positive amount in LKR');
      return;
    }
    if (!txCategoryId) {
      setErrorMsg('Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = txTags
        ? txTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      if (txType === 'INCOME') {
        await api.createIncome({
          amount: amt,
          categoryId: txCategoryId,
          date: txDate,
          description: txDescription.trim(),
          paymentMethod: txPaymentMethod,
          tags: parsedTags,
        });
        toast.success('Income record added successfully!');
      } else {
        await api.createExpense({
          amount: amt,
          categoryId: txCategoryId,
          date: txDate,
          description: txDescription.trim(),
          paymentMethod: txPaymentMethod,
          tags: parsedTags,
        });
        toast.success('Expense record added successfully!');
      }

      setTxAmount('');
      setTxDescription('');
      setTxTags('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to record entry';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="erp-card w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              txType === 'INCOME'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-status badge-royal text-[10px]">LEDGER RECORD</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Record Financial Entry</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium animate-fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleTransactionSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Target Ledger</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTxType('INCOME')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  txType === 'INCOME'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Incomes (Credit)</span>
              </button>
              <button
                type="button"
                onClick={() => setTxType('EXPENSE')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  txType === 'EXPENSE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Expenses (Debit)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Amount (Rs. LKR) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="erp-input w-full font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>Date *</span>
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
                  value={txDate}
                  className="erp-input w-full font-mono text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-90 pr-8 pointer-events-none"
                  title="Transaction date is fixed to today's system date and locked"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Category *</label>
            <select
              required
              value={txCategoryId}
              onChange={(e) => setTxCategoryId(e.target.value)}
              className="erp-input w-full text-xs font-medium cursor-pointer"
            >
              {availableCategories.length === 0 ? (
                <option value="">No categories created yet</option>
              ) : (
                availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">Description *</label>
              {txDescription.trim() && (
                <button
                  type="button"
                  onClick={handleFixSpelling}
                  disabled={isFixingSpelling}
                  className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline transition-colors cursor-pointer"
                >
                  {isFixingSpelling ? <Spinner size="sm" /> : <Sparkles className="w-3 h-3" />}
                  <span>{isFixingSpelling ? 'Correcting...' : 'Fix with AI ✨'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Salary Payout, Client Retainer, Keells Supermarket"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              className="erp-input w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Payment Method</label>
              <select
                value={txPaymentMethod}
                onChange={(e) => setTxPaymentMethod(e.target.value)}
                className="erp-input w-full text-xs font-medium cursor-pointer"
              >
                <option value="BANK_TRANSFER">Bank Transfer / CEFT</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="UPI">Direct / QR Pay</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Tags (Optional)</label>
              <input
                type="text"
                placeholder="salary, bills, hardware"
                value={txTags}
                onChange={(e) => setTxTags(e.target.value)}
                className="erp-input w-full text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" className="text-white" />}
              <span>{isSubmitting ? 'Saving Record...' : 'Save Financial Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
