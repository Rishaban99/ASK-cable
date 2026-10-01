import React, { useState } from 'react';
import {
  Category,
  SupportedCurrency
} from '../types/finance.js';
import { api } from '../api/client.js';
import { X, Sparkles } from 'lucide-react';

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
      if (fixed) setTxDescription(fixed);
    } catch (e) {
      // ignore
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
      } else {
        await api.createExpense({
          amount: amt,
          categoryId: txCategoryId,
          date: txDate,
          description: txDescription.trim(),
          paymentMethod: txPaymentMethod,
          tags: parsedTags,
        });
      }

      setTxAmount('');
      setTxDescription('');
      setTxTags('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">Record Entry</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Add a new record to Income or Expenses table</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleTransactionSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-neutral-400 mb-1">Target Table</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxType('INCOME')}
                className={`py-1.5 rounded border transition-colors ${
                  txType === 'INCOME'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-medium'
                    : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Incomes Table
              </button>
              <button
                type="button"
                onClick={() => setTxType('EXPENSE')}
                className={`py-1.5 rounded border transition-colors ${
                  txType === 'EXPENSE'
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 font-medium'
                    : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Expenses Table
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 mb-1">Amount (Rs. LKR)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono focus:outline-none focus:border-neutral-600"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Category (Linked)</label>
            <select
              required
              value={txCategoryId}
              onChange={(e) => setTxCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-neutral-400">Description</label>
              {txDescription.trim() && (
                <button
                  type="button"
                  onClick={handleFixSpelling}
                  disabled={isFixingSpelling}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isFixingSpelling ? 'Correcting...' : 'Fix English with AI ✨'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Salary Payout, Client Retainer, Keells Supermarket"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 mb-1">Payment Method</label>
              <select
                value={txPaymentMethod}
                onChange={(e) => setTxPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
              >
                <option value="BANK_TRANSFER">Bank Transfer / CEFT</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="UPI">Direct / QR Pay</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">Tags (Optional)</label>
              <input
                type="text"
                placeholder="salary, consulting, bills"
                value={txTags}
                onChange={(e) => setTxTags(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
