import React, { useState, useEffect } from 'react';
import { Customer, MonthlyPayment, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import {
  Calendar,
  Search,
  PlusCircle,
  CreditCard,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  DollarSign,
  Printer,
  History
} from 'lucide-react';

interface MonthlyPaymentViewProps {
  monthlyPayments: MonthlyPayment[];
  customers: Customer[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  onViewHistory?: (customerId: string) => void;
}

export const MonthlyPaymentView: React.FC<MonthlyPaymentViewProps> = ({
  monthlyPayments,
  customers,
  currency,
  onRefreshData,
  currentUser,
  onViewHistory,
}) => {
  // Current Month YYYY-MM
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().split('T')[0];

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');

  // Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [month, setMonth] = useState(currentMonthStr);
  const [monthlyFee, setMonthlyFee] = useState('1300');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected customer object derived from state
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculated balance for the form
  const parsedFee = parseFloat(monthlyFee) || 0;
  const parsedPaid = parseFloat(paidAmount) || 0;
  const calculatedFormBalance = Math.max(0, parsedFee - parsedPaid);

  // Edit Modal States
  const [editingPayment, setEditingPayment] = useState<MonthlyPayment | null>(null);
  const [editMonth, setEditMonth] = useState('');
  const [editMonthlyFee, setEditMonthlyFee] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');

  const parsedEditFee = parseFloat(editMonthlyFee) || 0;
  const parsedEditPaid = parseFloat(editPaidAmount) || 0;
  const calculatedEditBalance = Math.max(0, parsedEditFee - parsedEditPaid);

  // Pay Balance Modal States
  const [payBalancePayment, setPayBalancePayment] = useState<MonthlyPayment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Bill Printing Modal States
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const handlePrintMonthlyBill = (pmt: MonthlyPayment) => {
    const cust = customers.find((c) => c.id === pmt.customerId);
    setActiveBillData({
      type: 'MONTHLY',
      billNo: `BILL-${pmt.boxNo}-${pmt.month.replace('-', '')}`,
      date: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
      customerName: pmt.customerName,
      nicNo: cust?.nicNo,
      phoneNo: cust?.phoneNo,
      address: cust?.address,
      boxNo: pmt.boxNo,
      month: pmt.month,
      totalOrFeeAmount: pmt.monthlyFee,
      paidAmount: pmt.paidAmount,
      balanceAmount: pmt.balanceAmount,
      status: pmt.status,
      paymentDate: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
    });
    setIsBillModalOpen(true);
  };

  // Handle Record Monthly Payment Submission
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    if (!month) {
      setErrorMsg('Please select a payment month.');
      return;
    }
    if (parsedFee <= 0) {
      setErrorMsg('Monthly fee must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createMonthlyPayment({
        customerId: selectedCustomerId,
        month,
        monthlyFee: parsedFee,
        paidAmount: parsedPaid,
        paymentDate: paymentDate || todayStr,
      });

      // Reset form fields
      setSelectedCustomerId('');
      setPaidAmount('');
      setErrorMsg('');

      onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record monthly payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (pmt: MonthlyPayment) => {
    setEditingPayment(pmt);
    setEditMonth(pmt.month);
    setEditMonthlyFee(pmt.monthlyFee.toString());
    setEditPaidAmount(pmt.paidAmount.toString());
    setEditPaymentDate(pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      await api.updateMonthlyPayment(editingPayment.id, {
        month: editMonth,
        monthlyFee: parsedEditFee,
        paidAmount: parsedEditPaid,
        paymentDate: editPaymentDate,
      });

      setEditingPayment(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update monthly payment');
    }
  };

  // Open Pay Balance Modal
  const handleOpenPayBalance = (pmt: MonthlyPayment) => {
    setPayBalancePayment(pmt);
    setPayAmount(pmt.balanceAmount.toString());
  };

  // Confirm Pay Balance
  const handleConfirmPayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBalancePayment) return;
    const addPay = parseFloat(payAmount);
    if (isNaN(addPay) || addPay <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setIsPaying(true);
    try {
      const newTotalPaid = payBalancePayment.paidAmount + addPay;
      await api.updateMonthlyPayment(payBalancePayment.id, {
        paidAmount: newTotalPaid,
        paymentDate: todayStr,
      });

      setPayBalancePayment(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to process balance payment');
    } finally {
      setIsPaying(false);
    }
  };

  // Delete Monthly Payment
  const handleDelete = async (id: string, customerName: string, month: string) => {
    if (!confirm(`Are you sure you want to delete monthly payment for ${customerName} (${month})?`)) return;
    try {
      await api.deleteMonthlyPayment(id);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment');
    }
  };

  // Filtered Payments
  const filteredPayments = monthlyPayments.filter((p) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.customerName.toLowerCase().includes(q) ||
        p.boxNo.toLowerCase().includes(q) ||
        p.month.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Month filter
    if (selectedMonthFilter && p.month !== selectedMonthFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && p.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Calculate totals
  const totalExpected = filteredPayments.reduce((sum, p) => sum + p.monthlyFee, 0);
  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalOutstanding = filteredPayments.reduce((sum, p) => sum + p.balanceAmount, 0);

  // Available unique months present in actual database records
  const availableMonths = Array.from(new Set(monthlyPayments.map((p) => p.month))).sort().reverse();

  // Format month code into pill display text (e.g. 2026-10 -> Oct 2026)
  const formatMonthPill = (mStr: string) => {
    if (!mStr) return { monthName: mStr, year: '' };
    const [year, month] = mStr.split('-');
    if (!year || !month) return { monthName: mStr, year: '' };
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const mName = date.toLocaleString('default', { month: 'short' });
    return { monthName: mName, year };
  };

  // Automatically select latest month with data if current selection is invalid
  useEffect(() => {
    if (availableMonths.length > 0 && (!selectedMonthFilter || !availableMonths.includes(selectedMonthFilter))) {
      setSelectedMonthFilter(availableMonths[0]);
    }
  }, [availableMonths, selectedMonthFilter]);

  // Only show months that actually exist in the database records
  const periodMonthOptions = availableMonths;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header with PERIOD Month Quick Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            <span>Monthly Subscription Payments</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5 sm:mt-1">
            Collect subscriber monthly fees, track billing cycles, and auto-sync income to MongoDB Atlas.
          </p>
        </div>

        {/* PERIOD: Month Pills Filter Strip (Only Months with Real Data) */}
        {periodMonthOptions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {/* PERIOD Label Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-full text-xs font-bold text-indigo-400 font-mono shrink-0 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>PERIOD:</span>
            </div>

            {/* Month Pills (Only Months with Data) */}
            {periodMonthOptions.map((mStr) => {
              const isSelected = selectedMonthFilter === mStr;
              const { monthName, year } = formatMonthPill(mStr);
              return (
                <button
                  key={mStr}
                  onClick={() => setSelectedMonthFilter(mStr)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-neutral-900 border border-emerald-500/50 text-white font-bold ring-1 ring-emerald-500/30 shadow-md'
                      : 'bg-neutral-900/60 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span className="font-bold">{monthName}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">{year}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Expected */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400">Total Monthly Dues</p>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {formatMoney(totalExpected, currency)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Filtered Records ({filteredPayments.length})</p>
          </div>
          <div className="p-3 bg-neutral-800 rounded-lg text-neutral-300">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400">Total Dues Collected</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {formatMoney(totalCollected, currency)}
            </p>
            <p className="text-[11px] text-emerald-500/80 mt-0.5">Synced to Income Ledger</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400">Outstanding Dues</p>
            <p className="text-xl font-bold font-mono text-amber-400 mt-1">
              {formatMoney(totalOutstanding, currency)}
            </p>
            <p className="text-[11px] text-amber-500/80 mt-0.5">Pending Subscriber Balance</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Ledger Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Record Monthly Payment Form */}
        <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5 h-fit shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Record Monthly Payment</span>
            </h2>
            <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              Auto Income Sync
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreatePayment} className="space-y-4 text-xs">
            {/* Customer Dropdown */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Select Customer *</label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">-- Choose Registered Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Box: {c.boxNo})
                  </option>
                ))}
              </select>
            </div>

            {/* Box No Display */}
            {selectedCustomer && (
              <div className="p-2.5 rounded-md bg-neutral-950 border border-neutral-850 flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Assigned Box No:</span>
                <span className="font-mono font-bold text-emerald-400">{selectedCustomer.boxNo}</span>
              </div>
            )}

            {/* Payment Month */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Payment Month *</label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Financial Dues */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Monthly Fee (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="1000.00"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Paid Amount (LKR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Balance Badge */}
            <div className="p-3 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400 font-medium">Calculated Balance Due:</span>
              <span className={`font-mono font-bold text-sm ${
                calculatedFormBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {formatMoney(calculatedFormBalance, currency)}
              </span>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Record Monthly Payment'}</span>
            </button>
          </form>
        </div>

        {/* 2. Monthly Payments Ledger Table (Right 2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            {/* Table Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white">Monthly Payment Ledger ({monthlyPayments.length})</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Filter by subscriber, month, or payment status</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-full sm:w-44">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search customer/box..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Month Filter */}
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-white font-mono focus:outline-none"
                >
                  <option value="">All Months</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 bg-neutral-950 p-1 border border-neutral-800 rounded-md">
                  {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-emerald-400 text-neutral-950 font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Cards View (block md:hidden) */}
            <div className="block md:hidden divide-y divide-neutral-800 bg-neutral-950 rounded-lg border border-neutral-800">
              {filteredPayments.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 text-xs">
                  No monthly payment records match the current filters.
                </div>
              ) : (
                filteredPayments.map((pmt) => (
                  <div key={pmt.id} className="p-4 space-y-3 bg-neutral-900/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-white text-sm">{pmt.customerName}</p>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                          <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-semibold text-emerald-400">
                            {pmt.boxNo}
                          </span>
                          <span className="text-neutral-400">Month: {pmt.month}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded shrink-0 ${
                        pmt.status === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : pmt.status === 'PARTIAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {pmt.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-neutral-950 rounded-lg border border-neutral-850 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Monthly Fee</span>
                        <span className="text-neutral-300 font-medium">{formatMoney(pmt.monthlyFee, currency)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Paid</span>
                        <span className="text-emerald-400 font-medium">{formatMoney(pmt.paidAmount, currency)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Balance</span>
                        <span className={`font-bold ${pmt.balanceAmount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {formatMoney(pmt.balanceAmount, currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        {pmt.balanceAmount > 0 && (
                          <button
                            onClick={() => handleOpenPayBalance(pmt)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded text-xs font-semibold cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Balance</span>
                          </button>
                        )}
                        {onViewHistory && pmt.customerId && (
                          <button
                            onClick={() => onViewHistory(pmt.customerId)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 rounded text-xs font-medium cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePrintMonthlyBill(pmt)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 text-neutral-200 rounded text-xs font-medium cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Bill</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(pmt)}
                          className="p-1.5 text-neutral-400 hover:text-emerald-400 bg-neutral-800 rounded"
                          title="Edit Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.role !== 'STAFF' && (
                          <button
                            onClick={() => handleDelete(pmt.id, pmt.customerName, pmt.month)}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-800 rounded"
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
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block rounded-lg border border-neutral-800 overflow-hidden bg-neutral-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Box No</th>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3 text-right">Fee</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
                          No monthly payment records match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-neutral-900/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">
                            {pmt.customerName}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className="inline-block px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[11px] font-semibold text-emerald-400">
                              {pmt.boxNo}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-neutral-300">
                            {pmt.month}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-300">
                            {formatMoney(pmt.monthlyFee, currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                            {formatMoney(pmt.paidAmount, currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              pmt.balanceAmount === 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {formatMoney(pmt.balanceAmount, currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                              pmt.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : pmt.status === 'PARTIAL'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {pmt.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {pmt.balanceAmount > 0 && (
                                <button
                                  onClick={() => handleOpenPayBalance(pmt)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                                  title="Pay Balance"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay Balance</span>
                                </button>
                              )}
                              {onViewHistory && pmt.customerId && (
                                <button
                                  onClick={() => onViewHistory(pmt.customerId)}
                                  className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                                  title="View Customer Payment History"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>History</span>
                                </button>
                              )}
                              <button
                                onClick={() => handlePrintMonthlyBill(pmt)}
                                className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                                title="Print Bill / Receipt"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Bill</span>
                              </button>
                              <button
                                onClick={() => handleOpenEdit(pmt)}
                                className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-900 rounded transition-colors"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {currentUser?.role !== 'STAFF' && (
                                <button
                                  onClick={() => handleDelete(pmt.id, pmt.customerName, pmt.month)}
                                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded transition-colors"
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
            </div>
          </div>

          {/* Footer Ledger Bar */}
          <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-400 gap-2">
            <span>Showing: <strong className="text-white font-mono">{filteredPayments.length}</strong> payments</span>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>Collected: <strong className="text-emerald-400">{formatMoney(totalCollected, currency)}</strong></span>
              <span>Pending: <strong className="text-amber-400">{formatMoney(totalOutstanding, currency)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* EDIT MONTHLY PAYMENT MODAL */}
      {/* ------------------------------------------------------------------- */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Edit Monthly Payment Record</span>
              </h2>
              <button onClick={() => setEditingPayment(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <p className="font-semibold text-white">{editingPayment.customerName}</p>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">Box No: {editingPayment.boxNo}</p>
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Month *</label>
                <input
                  type="month"
                  required
                  value={editMonth}
                  onChange={(e) => setEditMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Monthly Fee (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editMonthlyFee}
                    onChange={(e) => setEditMonthlyFee(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Paid Amount (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Updated Balance Amount:</span>
                <span className={`font-mono font-bold text-sm ${
                  calculatedEditBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {formatMoney(calculatedEditBalance, currency)}
                </span>
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
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
      {/* PAY BALANCE MODAL */}
      {/* ------------------------------------------------------------------- */}
      {payBalancePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Pay Monthly Dues Balance</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {payBalancePayment.customerName} ({payBalancePayment.month})
                </p>
              </div>
              <button onClick={() => setPayBalancePayment(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayBalance} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Monthly Fee:</span>
                  <span className="font-mono text-white">{formatMoney(payBalancePayment.monthlyFee, currency)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Already Paid:</span>
                  <span className="font-mono text-emerald-400">{formatMoney(payBalancePayment.paidAmount, currency)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-neutral-850 pt-1.5 text-amber-400">
                  <span>Remaining Balance Due:</span>
                  <span className="font-mono text-sm">{formatMoney(payBalancePayment.balanceAmount, currency)}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-400 font-medium">Payment Amount (LKR) *</label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(payBalancePayment.balanceAmount.toString())}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payBalancePayment.balanceAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayBalancePayment(null)}
                  className="px-3.5 py-2 rounded bg-neutral-800 text-neutral-300 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-4 py-2 rounded bg-emerald-400 font-semibold text-neutral-950 hover:bg-emerald-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isPaying ? 'Processing...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <BillPrintModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        billData={activeBillData}
        currency={currency}
      />
    </div>
  );
};
