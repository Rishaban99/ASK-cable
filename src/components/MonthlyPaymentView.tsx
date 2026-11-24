import React, { useState, useEffect, useMemo } from 'react';
import { Customer, MonthlyPayment, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import { SuccessModal, SuccessData } from './SuccessModal.js';
import { ConfirmModal } from './ConfirmModal.js';
import { useToast } from './Toast.js';
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
  History,
  Box,
  ShieldCheck,
  Layers,
  Zap,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Tv,
  Sparkles,
  Banknote,
  RotateCcw,
  Lock,
} from 'lucide-react';
import {
  getCustomerPackage,
  getPackageById,
  getAllCustomerPackageAssignments,
} from '../utils/packageManager.js';

interface MonthlyPaymentViewProps {
  monthlyPayments: MonthlyPayment[];
  customers: Customer[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  onViewHistory?: (customerId: string) => void;
}

const getRegistrationMonth = (createdAt?: string | Date | null, customerId?: string): string => {
  if (createdAt) {
    if (typeof createdAt === 'string') {
      const trimmed = createdAt.trim();
      if (trimmed.length >= 7 && /^\d{4}-\d{2}/.test(trimmed)) return trimmed.slice(0, 7);
    }
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
  }
  if (customerId && /^[0-9a-fA-F]{24}$/.test(customerId)) {
    try {
      const timestamp = parseInt(customerId.substring(0, 8), 16) * 1000;
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
    } catch {}
  }
  return '';
};

const getNextBillingMonth = (yearMonth: string): string => {
  if (!yearMonth) return '';
  const [yStr, mStr] = yearMonth.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10);
  if (isNaN(year) || isNaN(month)) return '';
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
};

const formatYearMonthDisplay = (ym: string): string => {
  if (!ym) return '';
  const [yearStr, monthStr] = ym.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return ym;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
};

export const MonthlyPaymentView: React.FC<MonthlyPaymentViewProps> = ({
  monthlyPayments,
  customers,
  currency,
  onRefreshData,
  currentUser,
  onViewHistory,
}) => {
  const toast = useToast();
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().split('T')[0];

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form Collapsible
  const [showSingleBillForm, setShowSingleBillForm] = useState(false);
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);

  // Single Bill Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [month, setMonth] = useState(currentMonthStr);
  const [monthlyFee, setMonthlyFee] = useState('1200');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Bulk Generator States
  const [bulkMonth, setBulkMonth] = useState(currentMonthStr);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkResultCard, setBulkResultCard] = useState<any | null>(null);

  // Edit Modal States
  const [editingPayment, setEditingPayment] = useState<MonthlyPayment | null>(null);
  const [editMonth, setEditMonth] = useState('');
  const [editMonthlyFee, setEditMonthlyFee] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Pay Balance Modal States
  const [payBalancePayment, setPayBalancePayment] = useState<MonthlyPayment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Bill Print & Success Modal States
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState<SuccessData | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

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

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedCustomerRegMonth = selectedCustomer?.createdAt ? getRegistrationMonth(selectedCustomer.createdAt) : '';
  const minEligibleMonth = selectedCustomerRegMonth ? getNextBillingMonth(selectedCustomerRegMonth) : '';
  const isSelectedMonthIneligible = Boolean(selectedCustomerRegMonth && month && month <= selectedCustomerRegMonth);

  // Auto sync monthly fee when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      const custPkg = getCustomerPackage(selectedCustomer.id || selectedCustomer.boxNo);
      setMonthlyFee(custPkg.monthlyFee.toString());
      if (selectedCustomerRegMonth && minEligibleMonth && month <= selectedCustomerRegMonth) {
        setMonth(minEligibleMonth);
      }
    }
  }, [selectedCustomerId, selectedCustomer, selectedCustomerRegMonth, minEligibleMonth]);

  const parsedFee = parseFloat(monthlyFee) || 0;
  const parsedPaid = parseFloat(paidAmount) || 0;
  const calculatedFormBalance = Math.max(0, parsedFee - parsedPaid);

  const editFeeParsed = parseFloat(editMonthlyFee) || 0;
  const editPaidParsed = parseFloat(editPaidAmount) || 0;
  const editBalancePreview = Math.max(0, editFeeParsed - editPaidParsed);
  let editStatusPreview: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
  if (editBalancePreview === 0 && editPaidParsed > 0) editStatusPreview = 'PAID';
  else if (editPaidParsed > 0 && editBalancePreview > 0) editStatusPreview = 'PARTIAL';

  // Duplicate Check
  const existingDuplicatePayment =
    selectedCustomer && month
      ? monthlyPayments.find(
          (p) =>
            p.month === month &&
            (p.customerId === selectedCustomer.id ||
              (selectedCustomer.boxNo &&
                selectedCustomer.boxNo.trim() !== '' &&
                p.boxNo?.trim().toLowerCase() === selectedCustomer.boxNo.trim().toLowerCase()))
        )
      : undefined;

  // Pre-generation live counts for Bulk Generation
  const activeSubscribersList = customers.filter((c) => !c.status || c.status === 'ACTIVE');
  const bulkExcludedNewSubscribers = activeSubscribersList.filter((c) => {
    const regM = getRegistrationMonth(c.createdAt, c.id);
    return Boolean(regM && bulkMonth <= regM);
  });
  const bulkEligibleSubscribers = activeSubscribersList.filter((c) => {
    const regM = getRegistrationMonth(c.createdAt, c.id);
    if (regM && bulkMonth <= regM) return false;
    return !monthlyPayments.some(
      (p) =>
        p.month === bulkMonth &&
        (p.customerId === c.id || (p.boxNo && p.boxNo.toLowerCase() === c.boxNo.toLowerCase()))
    );
  });
  const bulkEstimatedEligibleCount = bulkEligibleSubscribers.length;
  const bulkProjectedRevenue = bulkEligibleSubscribers.reduce((sum, c) => {
    const pkg = getCustomerPackage(c.id || c.boxNo);
    return sum + (pkg.monthlyFee || 1200);
  }, 0);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    const list = monthlyPayments.filter((p) => {
      if (selectedMonthFilter && p.month !== selectedMonthFilter) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.customerName.toLowerCase().includes(q) ||
        p.boxNo.toLowerCase().includes(q) ||
        p.month.toLowerCase().includes(q)
      );
    });

    // Sort: Bills with balance dues on TOP, paid bills at the BOTTOM
    return list.sort((a, b) => {
      const aDue = (a.balanceAmount || 0) > 0 || a.status !== 'PAID' ? 1 : 0;
      const bDue = (b.balanceAmount || 0) > 0 || b.status !== 'PAID' ? 1 : 0;

      if (bDue !== aDue) {
        return bDue - aDue;
      }

      if (aDue === 1 && bDue === 1) {
        const diff = (b.balanceAmount || 0) - (a.balanceAmount || 0);
        if (diff !== 0) return diff;
      }

      return (b.id || '').localeCompare(a.id || '');
    });
  }, [monthlyPayments, selectedMonthFilter, statusFilter, searchQuery]);

  // Overall statistics for active filtered view
  const totalBilled = filteredPayments.reduce((acc, p) => acc + (p.monthlyFee || 0), 0);
  const totalCollected = filteredPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const totalPending = filteredPayments.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // Print Monthly Bill handler
  const handlePrintMonthlyBill = (pmt: MonthlyPayment) => {
    const cust = customers.find((c) => c.id === pmt.customerId);
    const custPkg = getCustomerPackage(pmt.customerId || pmt.boxNo);
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
      packageName: pmt.packageName || custPkg.packageName,
      totalOrFeeAmount: pmt.monthlyFee,
      paidAmount: pmt.paidAmount,
      balanceAmount: pmt.balanceAmount,
      status: pmt.status,
      paymentDate: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
    });
    setIsBillModalOpen(true);
  };

  // Pay Balance submit
  const handleConfirmPayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBalancePayment) return;
    const addPay = parseFloat(payAmount);
    if (isNaN(addPay) || addPay <= 0) {
      toast.error('Please enter a valid positive payment amount.');
      return;
    }

    setIsPaying(true);
    try {
      const newPaidAmount = payBalancePayment.paidAmount + addPay;
      await api.updateMonthlyPayment(payBalancePayment.id, {
        paidAmount: newPaidAmount,
        paymentDate: todayStr,
      });

      const cust = customers.find((c) => c.id === payBalancePayment.customerId);
      if (cust && cust.phoneNo) {
        const remainingBal = Math.max(0, payBalancePayment.monthlyFee - newPaidAmount);
        api
          .sendPaymentSms({
            customerName: payBalancePayment.customerName,
            phoneNo: cust.phoneNo,
            boxNo: payBalancePayment.boxNo,
            paidAmount: addPay,
            balanceAmount: remainingBal,
            month: payBalancePayment.month,
            paymentDate: todayStr,
            billNo: `BILL-${payBalancePayment.boxNo}-${payBalancePayment.month.replace('-', '')}`,
          })
          .catch((err) => console.warn('SMS dispatch failed:', err));
      }

      setPayBalancePayment(null);
      toast.success(
        `Payment of ${formatMoney(addPay, currency)} recorded for Box #${payBalancePayment.boxNo} (${payBalancePayment.month})`
      );
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payment');
    } finally {
      setIsPaying(false);
    }
  };

  // Create Single Monthly Bill
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCustomerId || !month) {
      setErrorMsg('Subscriber and Month are required.');
      return;
    }

    if (existingDuplicatePayment) {
      setErrorMsg(`A bill already exists for Box #${selectedCustomer?.boxNo} for ${month}.`);
      return;
    }

    if (isSelectedMonthIneligible) {
      setErrorMsg(
        `Registration rule: Subscriber registered in ${selectedCustomerRegMonth}. Billing starts in ${minEligibleMonth}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const custPkg = getCustomerPackage(selectedCustomer!.id || selectedCustomer!.boxNo);
      const createdPayment = await api.createMonthlyPayment({
        customerId: selectedCustomerId,
        month,
        monthlyFee: parsedFee,
        paidAmount: parsedPaid,
        paymentDate: paymentDate || todayStr,
        packageId: custPkg.packageId,
        packageName: custPkg.packageName,
      });

      // Reset
      setPaidAmount('');
      setShowSingleBillForm(false);

      setSuccessModalData({
        title: 'Monthly Bill Recorded!',
        message: `Monthly bill for Box #${createdPayment.boxNo} (${month}) has been created.`,
        details: {
          customerName: createdPayment.customerName,
          boxNo: createdPayment.boxNo,
          totalAmount: createdPayment.monthlyFee,
          paidAmount: createdPayment.paidAmount,
          balanceAmount: createdPayment.balanceAmount,
          status: createdPayment.status,
          month: createdPayment.month,
          paymentMethod: 'CASH',
        },
        onPrintBill: () => handlePrintMonthlyBill(createdPayment),
        onViewHistory: onViewHistory ? () => onViewHistory(createdPayment.customerId) : undefined,
      });
      setIsSuccessModalOpen(true);
      toast.success(`Monthly bill for Box #${createdPayment.boxNo} created successfully!`);

      // SMS receipt
      if (selectedCustomer?.phoneNo && parsedPaid > 0) {
        api
          .sendPaymentSms({
            customerName: createdPayment.customerName,
            phoneNo: selectedCustomer.phoneNo,
            boxNo: createdPayment.boxNo,
            paidAmount: parsedPaid,
            balanceAmount: createdPayment.balanceAmount,
            month: createdPayment.month,
            paymentDate: paymentDate || todayStr,
            billNo: `BILL-${createdPayment.boxNo}-${createdPayment.month.replace('-', '')}`,
          })
          .catch((err) => console.warn('SMS dispatch failed:', err));
      }

      onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create monthly bill');
      toast.error(err.message || 'Failed to create monthly bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Create Monthly Payments
  const handleBulkCreateMonthlyPayments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMonth) return;

    setConfirmModalConfig({
      isOpen: true,
      title: `Bulk Generate Bills for ${formatYearMonthDisplay(bulkMonth)}`,
      message: `Issue monthly dues for ${bulkEstimatedEligibleCount} eligible active subscriber(s) for ${bulkMonth} based on assigned TV Package rates?

• Projected Billed: ${formatMoney(bulkProjectedRevenue, currency)}
• Systematic Exclusions: ${bulkExcludedNewSubscribers.length} newly registered account(s)`,
      confirmText: 'Generate Monthly Dues',
      variant: 'indigo',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        setIsBulkSubmitting(true);
        try {
          const res = await api.bulkCreateMonthlyPayments({
            month: bulkMonth,
            packageMap: getAllCustomerPackageAssignments(),
          });
          setBulkResultCard(res);
          toast.success(`Bulk monthly dues generated for ${res.createdCount} active subscribers!`);
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to bulk generate monthly bills');
        } finally {
          setIsBulkSubmitting(false);
        }
      },
    });
  };

  // Open Edit Monthly Payment Modal
  const handleOpenEditPayment = (pmt: MonthlyPayment) => {
    setEditingPayment(pmt);
    setEditMonth(pmt.month);
    setEditMonthlyFee(pmt.monthlyFee.toString());
    setEditPaidAmount(pmt.paidAmount.toString());
    setEditPaymentDate(pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr);
  };

  // Save Edit Monthly Payment
  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const fee = parseFloat(editMonthlyFee);
    const paid = parseFloat(editPaidAmount);

    if (isNaN(fee) || fee < 0) {
      toast.error('Please enter a valid monthly fee amount.');
      return;
    }
    if (isNaN(paid) || paid < 0) {
      toast.error('Please enter a valid paid amount (0 or more).');
      return;
    }

    setIsEditing(true);
    try {
      await api.updateMonthlyPayment(editingPayment.id, {
        monthlyFee: fee,
        paidAmount: paid,
      });

      toast.success(`Monthly bill for Box #${editingPayment.boxNo} (${editingPayment.month}) updated.`);
      setEditingPayment(null);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update monthly bill');
    } finally {
      setIsEditing(false);
    }
  };

  // Delete Payment
  const handleDeletePayment = (pmt: MonthlyPayment) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Monthly Bill Record',
      message: `Are you sure you want to delete the monthly bill for Box #${pmt.boxNo} (${pmt.month})? This action removes the billing ledger entry.`,
      confirmText: 'Delete Bill',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteMonthlyPayment(pmt.id);
          toast.success(`Bill for Box #${pmt.boxNo} deleted.`);
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete bill');
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
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Monthly Billing & Collections Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Issue monthly subscriber invoices, run automated bulk bill generation, and reconcile subscription arrears
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowBulkGenerator((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Bulk Generator</span>
          </button>

          <button
            onClick={() => setShowSingleBillForm((prev) => !prev)}
            className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showSingleBillForm ? 'Close Form' : '+ Issue Single Bill'}</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {formatMoney(totalBilled, currency)}
            </div>
            <span className="text-[10px] text-slate-400">{filteredPayments.length} Bills</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Collected</span>
            <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
              {formatMoney(totalCollected, currency)}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">{collectionRate}% Rate</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Balance Pending</span>
            <div className="text-lg font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
              {formatMoney(totalPending, currency)}
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">Arrears</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Eligible Subscribers</span>
            <div className="text-xl font-black text-teal-700 dark:text-teal-400 mt-0.5">
              {bulkEstimatedEligibleCount}
            </div>
            <span className="text-[10px] text-slate-400">For {bulkMonth}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <Tv className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BULK BILL GENERATION WIZARD (COLLAPSIBLE) */}
      {/* ==================================================================== */}
      {showBulkGenerator && (
        <div className="erp-card p-5 bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/70 dark:from-slate-900 dark:via-[#0F172A] dark:to-slate-900 border-blue-500/30 animate-in fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bulk Monthly Bill Generator for {formatYearMonthDisplay(bulkMonth)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enforces registration-date validation rules automatically and applies assigned TV package rental rates
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBulkGenerator(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleBulkCreateMonthlyPayments} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Billing Month
                </label>
                <input
                  type="month"
                  required
                  value={bulkMonth}
                  onChange={(e) => setBulkMonth(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Eligible Active Subscribers
                </label>
                <div className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] flex items-center justify-between font-mono font-bold text-blue-700 dark:text-blue-300">
                  <span>{bulkEstimatedEligibleCount} Subscribers</span>
                  <span className="badge-status badge-royal text-[9px]">Eligible</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Projected Billed Volume
                </label>
                <div className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] flex items-center font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {formatMoney(bulkProjectedRevenue, currency)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-[11px] text-slate-500">
                Excluded: {bulkExcludedNewSubscribers.length} registered in {bulkMonth} (billed next month)
              </span>
              <button
                type="submit"
                disabled={isBulkSubmitting || bulkEstimatedEligibleCount === 0}
                className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
              >
                {isBulkSubmitting ? 'Generating Invoices...' : `Generate ${bulkEstimatedEligibleCount} Bills for ${bulkMonth}`}
              </button>
            </div>
          </form>

          {/* Bulk execution result card */}
          {bulkResultCard && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-500/30 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                <span>Bulk Billing Succeeded for {bulkResultCard.month}</span>
                <span>+{bulkResultCard.createdCount} Bills Issued</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                Total Billed: {formatMoney(bulkResultCard.totalBilledAmount, currency)} • Skipped:{' '}
                {bulkResultCard.skippedCount} accounts
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. SINGLE BILL ISSUANCE FORM (COLLAPSIBLE) */}
      {/* ==================================================================== */}
      {showSingleBillForm && (
        <div className="erp-card p-5 bg-slate-50/70 dark:bg-slate-900/60 border-blue-500/30 animate-in fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Issue Single Monthly Invoice</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Record individual monthly bill or collect upfront payment
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSingleBillForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreatePayment} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Subscriber *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="erp-input font-medium"
                >
                  <option value="">-- Choose Subscriber --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      Box #{c.boxNo} — {c.name} ({c.phoneNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Month *</label>
                <input
                  type="month"
                  required
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Package Rental Fee</label>
                <input
                  type="number"
                  required
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Paid Amount (LKR)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="erp-input font-mono font-bold text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remaining Balance
                </label>
                <div className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] flex items-center font-mono font-black text-rose-700 dark:text-rose-400">
                  {formatMoney(calculatedFormBalance, currency)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Payment Date</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Locked
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    readOnly
                    disabled
                    tabIndex={-1}
                    value={paymentDate}
                    className="erp-input font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-90 pr-8 pointer-events-none"
                    title="Payment date is fixed to today's system date and locked"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowSingleBillForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Create & Issue Bill'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. SEARCH & FILTERS BAR */}
      {/* ==================================================================== */}
      <div className="erp-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by subscriber name or box number..."
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

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Filter Picker */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ml-1.5" />
            <input
              type="month"
              value={selectedMonthFilter}
              onChange={(e) => {
                setSelectedMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent px-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            />
            {selectedMonthFilter && (
              <button
                onClick={() => setSelectedMonthFilter('')}
                className="text-slate-400 hover:text-slate-600 pr-1 text-[11px]"
                title="Clear Month Filter"
              >
                All
              </button>
            )}
          </div>

          {/* Status Pills */}
          {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. DATA TABLE & MOBILE CARDS WITH PAGINATION */}
      {/* ==================================================================== */}
      <div className="erp-card overflow-hidden">
        {/* Desktop View: Table (hidden on mobile, visible on md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Billing Month</th>
                <th>Box #</th>
                <th>Subscriber Name</th>
                <th>Package Tier</th>
                <th className="text-right">Monthly Fee</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance Due</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold">No monthly bills found for the selected criteria.</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Generate bills using the Bulk Generator or select a different month.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((pmt) => {
                  const custPkg = getCustomerPackage(pmt.customerId || pmt.boxNo);
                  return (
                    <tr key={pmt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Month */}
                      <td>
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {pmt.month}
                        </span>
                      </td>

                      {/* Box # */}
                      <td>
                        <span className="font-mono font-black text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25">
                          #{pmt.boxNo}
                        </span>
                      </td>

                      {/* Name */}
                      <td>
                        <button
                          onClick={() => onViewHistory && onViewHistory(pmt.customerId)}
                          className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                        >
                          {pmt.customerName}
                        </button>
                      </td>

                      {/* Package */}
                      <td>
                        <span className="badge-status badge-teal font-medium">
                          {pmt.packageName || custPkg.packageName}
                        </span>
                      </td>

                      {/* Fee */}
                      <td className="text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(pmt.monthlyFee, currency)}
                      </td>

                      {/* Paid */}
                      <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatMoney(pmt.paidAmount, currency)}
                      </td>

                      {/* Balance */}
                      <td className="text-right font-mono font-bold">
                        <span
                          className={
                            pmt.balanceAmount > 0
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }
                        >
                          {formatMoney(pmt.balanceAmount, currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge-status ${
                            pmt.status === 'PAID'
                              ? 'badge-success'
                              : pmt.status === 'PARTIAL'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {pmt.paidAmount > pmt.monthlyFee
                            ? `PAID (+${formatMoney(pmt.paidAmount - pmt.monthlyFee, currency)} Adv)`
                            : pmt.status}
                        </span>
                      </td>

                      {/* Payment Date */}
                      <td className="font-mono text-[11px] text-slate-500">
                        {pmt.paymentDate ? pmt.paymentDate.split('T')[0] : '—'}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Pay Balance */}
                          {pmt.balanceAmount > 0 && (
                            <button
                              onClick={() => {
                                setPayBalancePayment(pmt);
                                setPayAmount(pmt.balanceAmount.toString());
                              }}
                              className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15"
                              title="Collect Balance Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Bill */}
                          <button
                            onClick={() => handlePrintMonthlyBill(pmt)}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15"
                            title="Print Monthly Bill Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Bill */}
                          <button
                            onClick={() => handleOpenEditPayment(pmt)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 cursor-pointer transition-colors"
                            title="Edit Monthly Bill"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Bill */}
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDeletePayment(pmt)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/15"
                              title="Delete Monthly Bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Monthly Bills Cards List (visible on mobile < md, hidden on md+) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedPayments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold">No monthly bills found for the selected criteria.</p>
              <p className="text-[11px] mt-1 text-slate-400">
                Generate bills using the Bulk Generator or select a different month.
              </p>
            </div>
          ) : (
            paginatedPayments.map((pmt) => {
              const custPkg = getCustomerPackage(pmt.customerId || pmt.boxNo);
              return (
                <div key={pmt.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                  {/* Card Header: Month, Box #, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {pmt.month}
                        </span>
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25 shrink-0">
                          #{pmt.boxNo}
                        </span>
                      </div>
                      <button
                        onClick={() => onViewHistory && onViewHistory(pmt.customerId)}
                        className="font-bold text-slate-900 dark:text-white text-sm truncate text-left hover:text-blue-600 dark:hover:text-blue-400 block mt-1"
                      >
                        {pmt.customerName}
                      </button>
                    </div>
                    <span
                      className={`badge-status shrink-0 text-[10px] ${
                        pmt.status === 'PAID'
                          ? 'badge-success'
                          : pmt.status === 'PARTIAL'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {pmt.paidAmount > pmt.monthlyFee
                        ? `PAID (+${formatMoney(pmt.paidAmount - pmt.monthlyFee, currency)} Adv)`
                        : pmt.status}
                    </span>
                  </div>

                  {/* Package & Payment Date */}
                  <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="badge-status badge-teal font-medium text-[10px]">
                      {pmt.packageName || custPkg.packageName}
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400">
                      {pmt.paymentDate || 'Pending payment'}
                    </span>
                  </div>

                  {/* Financial Strip: Fee, Paid, Balance */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Monthly Fee</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        {formatMoney(pmt.monthlyFee, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Paid</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {formatMoney(pmt.paidAmount, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Balance</span>
                      <span
                        className={`font-black text-xs ${
                          pmt.balanceAmount > 0
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {formatMoney(pmt.balanceAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {pmt.balanceAmount > 0 && (
                        <button
                          onClick={() => {
                            setPayBalancePayment(pmt);
                            setPayAmount(pmt.balanceAmount.toString());
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Due</span>
                        </button>
                      )}
                      <button
                        onClick={() => handlePrintMonthlyBill(pmt)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                        title="Print Monthly Bill Slip"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditPayment(pmt)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="Edit Monthly Bill"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {onViewHistory && (
                        <button
                          onClick={() => onViewHistory(pmt.customerId)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="View Statement History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDeletePayment(pmt)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Monthly Bill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {filteredPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>
            <span>to</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {Math.min(currentPage * pageSize, filteredPayments.length)}
            </span>
            <span>of</span>
            <span className="font-bold text-slate-900 dark:text-white">{filteredPayments.length}</span>
            <span>records</span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="erp-input py-0.5 text-xs w-auto ml-2"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
              Prev
            </button>
            <span className="px-2 font-mono font-bold text-slate-900 dark:text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. MODALS */}
      {/* ==================================================================== */}

      {/* Pay Balance Modal */}
      {payBalancePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Collect Monthly Bill Balance</span>
              </h3>
              <button
                onClick={() => setPayBalancePayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{payBalancePayment.customerName}</span>
                <span className="badge-status badge-royal font-mono">Box #{payBalancePayment.boxNo}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>Month: {payBalancePayment.month}</span>
                <span className="font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                  {formatMoney(payBalancePayment.balanceAmount, currency)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayBalance} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount to Collect (LKR)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="erp-input font-mono font-black text-base text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayBalancePayment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="btn-teal px-5 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {isPaying ? 'Recording...' : 'Confirm & Print Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Monthly Bill Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Edit Monthly Bill Record</span>
              </h3>
              <button
                onClick={() => setEditingPayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subscriber Info Banner */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{editingPayment.customerName}</span>
                <span className="badge-status badge-royal font-mono">Box #{editingPayment.boxNo}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>Billing Period: {formatYearMonthDisplay(editingPayment.month)}</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {editingPayment.packageName || 'Standard TV'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveEditPayment} className="space-y-4 text-xs">
              {/* Monthly Fee Input */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Rate / Fee ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={editMonthlyFee}
                  onChange={(e) => setEditMonthlyFee(e.target.value)}
                  className="erp-input font-mono font-bold"
                  placeholder="e.g. 1200"
                />
              </div>

              {/* Paid Amount Input */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paid Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={editPaidAmount}
                  onChange={(e) => setEditPaidAmount(e.target.value)}
                  className="erp-input font-mono font-bold text-emerald-700 dark:text-emerald-400"
                  placeholder="e.g. 1200 or 0"
                />
              </div>

              {/* Live Balance & Status Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {editPaidParsed > editFeeParsed ? 'Advance / Excess' : 'Balance Due'}
                  </span>
                  <span
                    className={`text-base font-black font-mono ${
                      editPaidParsed > editFeeParsed
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : editBalancePreview > 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {editPaidParsed > editFeeParsed
                      ? `+${formatMoney(editPaidParsed - editFeeParsed, currency)} (Advance)`
                      : formatMoney(editBalancePreview, currency)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span
                    className={`badge-status ${
                      editPaidParsed > editFeeParsed
                        ? 'badge-emerald'
                        : editStatusPreview === 'PAID'
                        ? 'badge-emerald'
                        : editStatusPreview === 'PARTIAL'
                        ? 'badge-amber'
                        : 'badge-rose'
                    }`}
                  >
                    {editPaidParsed > editFeeParsed ? 'PAID (ADVANCE)' : editStatusPreview}
                  </span>
                </div>
              </div>

              {/* Locked Payment Date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Payment Date
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    <Lock className="w-3 h-3 text-slate-500" /> Locked
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editPaymentDate || todayStr}
                  className="erp-input bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono opacity-80"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Printing Modal */}
      <BillPrintModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        billData={activeBillData}
        currency={currency}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        data={successModalData}
        currency={currency}
      />

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
