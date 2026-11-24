import React, { useState, useEffect, useMemo } from 'react';
import { Customer, MonthlyPayment, IncomeRecord, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import { useToast } from './Toast.js';
import {
  Banknote,
  Search,
  User as UserIcon,
  CreditCard,
  CheckCircle2,
  Calendar,
  Printer,
  AlertCircle,
  Tag,
  Clock,
  Tv,
  Phone,
  MapPin,
  History,
  ChevronRight,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Box,
  Lock,
  X,
} from 'lucide-react';
import { getCustomerPackage } from '../utils/packageManager.js';

interface PaymentCollectionViewProps {
  customers: Customer[];
  monthlyPayments: MonthlyPayment[];
  incomes?: IncomeRecord[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  onNavigateToHistory?: (customerId: string) => void;
}

interface LiveDbCollectionLog {
  id: string;
  customerName: string;
  boxNo: string;
  periodOrTitle: string;
  installmentAmount: number;
  balanceRemaining: number;
  dateDisplay: string;
  timeDisplay: string;
  paymentMethod: string;
  isPartial: boolean;
  rawDateSort: number;
  rawBillData: BillData;
}

export const PaymentCollectionView: React.FC<PaymentCollectionViewProps> = ({
  customers,
  monthlyPayments,
  incomes = [],
  currency,
  onRefreshData,
  onNavigateToHistory,
}) => {
  const toast = useToast();
  const todayStr = new Date().toISOString().split('T')[0];

  // Selection & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string>('');

  // Payment Form States
  const [paymentTargetType, setPaymentTargetType] = useState<'MONTHLY' | 'REGISTRATION'>('MONTHLY');
  const [selectedMonthlyPaymentId, setSelectedMonthlyPaymentId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Bill Printing Modal States
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState<boolean>(false);

  // Sort customers: Customers with dues on TOP, Settled at BOTTOM
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aDue = (a.balanceAmount || 0) > 0 ? 1 : 0;
      const bDue = (b.balanceAmount || 0) > 0 ? 1 : 0;

      if (bDue !== aDue) {
        return bDue - aDue;
      }

      if (aDue === 1 && bDue === 1) {
        const diff = (b.balanceAmount || 0) - (a.balanceAmount || 0);
        if (diff !== 0) return diff;
      }

      return (b.id || '').localeCompare(a.id || '');
    });
  }, [customers]);

  // Filtered customer list for search box
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return sortedCustomers;
    const q = searchQuery.toLowerCase();
    return sortedCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.boxNo.toLowerCase().includes(q) ||
        c.nicNo.toLowerCase().includes(q) ||
        c.phoneNo.toLowerCase().includes(q)
    );
  }, [sortedCustomers, searchQuery]);

  // Initial selection defaults to first customer in sortedCustomers (customer with dues)
  useEffect(() => {
    if (!selectedCustId && sortedCustomers.length > 0) {
      setSelectedCustId(sortedCustomers[0].id);
    }
  }, [sortedCustomers, selectedCustId]);

  // Sync selectedCustId whenever search query or filtered list updates
  useEffect(() => {
    if (filteredCustomers.length > 0) {
      const isSelectedInFiltered = filteredCustomers.some((c) => c.id === selectedCustId);
      if (!isSelectedInFiltered) {
        setSelectedCustId(filteredCustomers[0].id);
      }
    }
  }, [filteredCustomers, selectedCustId]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.trim()) {
      const lower = q.toLowerCase();
      const match = sortedCustomers.find(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.boxNo.toLowerCase().includes(lower) ||
          c.nicNo.toLowerCase().includes(lower) ||
          c.phoneNo.toLowerCase().includes(lower)
      );
      if (match) {
        setSelectedCustId(match.id);
      }
    } else if (sortedCustomers.length > 0) {
      setSelectedCustId(sortedCustomers[0].id);
    }
  };

  // Selected customer object
  const currentCustomer = useMemo(
    () => sortedCustomers.find((c) => c.id === selectedCustId) || sortedCustomers[0],
    [sortedCustomers, selectedCustId]
  );

  // Get monthly payments for current customer
  const customerMonthlyPayments = useMemo(() => {
    if (!currentCustomer) return [];
    return monthlyPayments.filter(
      (p) =>
        p.customerId === currentCustomer.id ||
        (p.boxNo && p.boxNo.toLowerCase() === currentCustomer.boxNo.toLowerCase()) ||
        (p.customerName && p.customerName.toLowerCase() === currentCustomer.name.toLowerCase())
    );
  }, [monthlyPayments, currentCustomer]);

  // Pending unpaid monthly payments for current customer (strictly bills with balance due and not fully paid)
  const unpaidMonthlyPayments = useMemo(
    () =>
      customerMonthlyPayments.filter(
        (p) => (p.balanceAmount || 0) > 0 && (p.paidAmount || 0) < p.monthlyFee && p.status !== 'PAID'
      ),
    [customerMonthlyPayments]
  );

  // Registration fee calculations
  const regBalance = currentCustomer?.balanceAmount || 0;
  const regTotal = currentCustomer?.totalAmount || 0;
  const regPaid = currentCustomer?.paidAmount || 0;

  // Total monthly balance
  const monthlyBalanceSum = customerMonthlyPayments.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);
  const grandBalance = regBalance + monthlyBalanceSum;

  const hasMonthlyDue = monthlyBalanceSum > 0 && unpaidMonthlyPayments.length > 0;
  const hasRegDue = regBalance > 0;

  // Selected monthly payment item object (strictly from unpaid monthly payments)
  const selectedMonthlyPmt =
    unpaidMonthlyPayments.find((p) => p.id === selectedMonthlyPaymentId) || unpaidMonthlyPayments[0];

  // Auto-sync initial selection when customer changes
  useEffect(() => {
    if (hasMonthlyDue) {
      setPaymentTargetType('MONTHLY');
      if (unpaidMonthlyPayments.length > 0) {
        setSelectedMonthlyPaymentId(unpaidMonthlyPayments[0].id);
        setPayAmount(unpaidMonthlyPayments[0].balanceAmount.toString());
      }
    } else if (hasRegDue) {
      setPaymentTargetType('REGISTRATION');
      setPayAmount(regBalance.toString());
    } else {
      setPaymentTargetType('MONTHLY');
      setSelectedMonthlyPaymentId('');
      setPayAmount('');
    }
  }, [selectedCustId, customerMonthlyPayments.length, regBalance, monthlyBalanceSum]);

  // Keep target in sync if a category becomes totally paid
  useEffect(() => {
    if (!hasRegDue && paymentTargetType === 'REGISTRATION' && hasMonthlyDue) {
      setPaymentTargetType('MONTHLY');
    } else if (!hasMonthlyDue && paymentTargetType === 'MONTHLY' && hasRegDue) {
      setPaymentTargetType('REGISTRATION');
    }
  }, [hasMonthlyDue, hasRegDue, paymentTargetType]);

  const handleTargetTypeChange = (type: 'MONTHLY' | 'REGISTRATION') => {
    setPaymentTargetType(type);
    if (type === 'MONTHLY') {
      const targetPmt =
        unpaidMonthlyPayments.find((p) => p.id === selectedMonthlyPaymentId) || unpaidMonthlyPayments[0];
      setPayAmount(targetPmt ? targetPmt.balanceAmount.toString() : '');
    } else {
      setPayAmount(regBalance.toString());
    }
  };

  const handleMonthlyPmtSelect = (pmtId: string) => {
    setSelectedMonthlyPaymentId(pmtId);
    const targetPmt = unpaidMonthlyPayments.find((p) => p.id === pmtId);
    if (targetPmt) {
      setPayAmount(targetPmt.balanceAmount.toString());
    }
  };

  // Live collection logs from database
  const liveDbCollectionLogs: LiveDbCollectionLog[] = useMemo(() => {
    const logs: LiveDbCollectionLog[] = [];

    if (incomes && incomes.length > 0) {
      incomes.forEach((inc) => {
        const desc = inc.description || '';
        const isCableIncome =
          desc.toLowerCase().includes('cable') ||
          desc.toLowerCase().includes('monthly') ||
          desc.toLowerCase().includes('box') ||
          desc.toLowerCase().includes('subscriber') ||
          desc.toLowerCase().includes('registration') ||
          (inc.tags && inc.tags.some((t) => t.includes('monthly') || t.includes('fee')));

        if (!isCableIncome) return;

        let custName = 'Subscriber';
        let boxNo = '-';
        let title = desc;
        let monthStr = '';

        const matchedCust = customers.find(
          (c) =>
            (c.name && desc.toLowerCase().includes(c.name.toLowerCase())) ||
            (c.boxNo && c.boxNo !== '-' && desc.toLowerCase().includes(c.boxNo.toLowerCase()))
        );

        if (matchedCust) {
          custName = matchedCust.name;
          boxNo = matchedCust.boxNo;
        } else {
          const nameMatch = desc.match(/-\s*([^(\n]+)(?:\(Box:\s*([^)\n]+)\))?/i);
          if (nameMatch) {
            custName = nameMatch[1]?.trim() || 'Subscriber';
            if (nameMatch[2]) boxNo = nameMatch[2].trim();
          }
        }

        const monthMatch = desc.match(/\((\d{4}-\d{2})\)/);
        if (monthMatch) {
          monthStr = monthMatch[1];
          title = `Monthly Bill (${monthStr})`;
        } else if (
          desc.toLowerCase().includes('setup') ||
          desc.toLowerCase().includes('connection') ||
          desc.toLowerCase().includes('registration')
        ) {
          title = 'Box Setup & Connection Fee';
        }

        let balanceRemaining = 0;
        if (matchedCust) {
          if (monthStr) {
            const mPmt = monthlyPayments.find(
              (p) =>
                (p.customerId === matchedCust.id ||
                  (p.boxNo && p.boxNo.toLowerCase() === matchedCust.boxNo.toLowerCase())) &&
                p.month === monthStr
            );
            if (mPmt) balanceRemaining = mPmt.balanceAmount;
          } else {
            balanceRemaining = matchedCust.balanceAmount;
          }
        }

        const createdDate = inc.createdAt ? new Date(inc.createdAt) : new Date(inc.date || todayStr);
        const dateDisplay = inc.date || createdDate.toISOString().split('T')[0];
        const timeDisplay = inc.createdAt
          ? new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        logs.push({
          id: `inc-installment-${inc.id}`,
          customerName: custName,
          boxNo: boxNo,
          periodOrTitle: title,
          installmentAmount: inc.amount,
          balanceRemaining,
          dateDisplay,
          timeDisplay,
          rawDateSort: createdDate.getTime(),
          paymentMethod: inc.paymentMethod || 'CASH',
          isPartial: balanceRemaining > 0,
          rawBillData: {
            type: monthStr ? 'MONTHLY' : 'CUSTOMER',
            billNo: `REC-${boxNo.replace(/[^a-zA-Z0-9]/g, '') || '0'}-${inc.id.slice(-6)}`,
            date: dateDisplay,
            customerName: custName,
            nicNo: matchedCust?.nicNo,
            phoneNo: matchedCust?.phoneNo,
            address: matchedCust?.address,
            boxNo: boxNo,
            month: monthStr || undefined,
            totalOrFeeAmount: inc.amount + balanceRemaining,
            paidAmount: inc.amount,
            balanceAmount: balanceRemaining,
            status: balanceRemaining === 0 ? 'PAID' : 'PARTIAL',
            paymentDate: dateDisplay,
          },
        });
      });
    }

    // Fallback to monthly payments if needed
    if (logs.length === 0) {
      monthlyPayments.forEach((pmt) => {
        if (pmt.paidAmount > 0) {
          const cust = customers.find(
            (c) => c.id === pmt.customerId || (c.boxNo && c.boxNo.toLowerCase() === pmt.boxNo.toLowerCase())
          );
          const createdDate = pmt.createdAt ? new Date(pmt.createdAt) : new Date();
          logs.push({
            id: `pmt-fallback-${pmt.id}`,
            customerName: pmt.customerName || cust?.name || 'Subscriber',
            boxNo: pmt.boxNo || cust?.boxNo || '-',
            periodOrTitle: `Monthly Bill (${pmt.month})`,
            installmentAmount: pmt.paidAmount,
            balanceRemaining: pmt.balanceAmount,
            dateDisplay: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
            timeDisplay: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDateSort: createdDate.getTime(),
            paymentMethod: 'CASH',
            isPartial: pmt.balanceAmount > 0,
            rawBillData: {
              type: 'MONTHLY',
              billNo: `BILL-${pmt.boxNo}-${pmt.month.replace('-', '')}`,
              date: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
              customerName: pmt.customerName || cust?.name || 'Subscriber',
              nicNo: cust?.nicNo,
              phoneNo: cust?.phoneNo,
              address: cust?.address,
              boxNo: pmt.boxNo,
              month: pmt.month,
              packageName: getCustomerPackage(pmt.customerId || pmt.boxNo).packageName,
              totalOrFeeAmount: pmt.monthlyFee,
              paidAmount: pmt.paidAmount,
              balanceAmount: pmt.balanceAmount,
              status: pmt.status,
              paymentDate: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
            },
          });
        }
      });
    }

    return logs.sort((a, b) => b.rawDateSort - a.rawDateSort);
  }, [incomes, monthlyPayments, customers, todayStr]);

  // Current Due Target
  const currentTargetDue =
    paymentTargetType === 'MONTHLY'
      ? selectedMonthlyPmt
        ? selectedMonthlyPmt.balanceAmount
        : 0
      : regBalance;

  const parsedPayAmount = parseFloat(payAmount) || 0;
  const remainingBalanceAfter = Math.max(0, currentTargetDue - parsedPayAmount);

  // Submit Payment Collection
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      toast.error('Please select a subscriber first.');
      return;
    }

    const addPay = parseFloat(payAmount);
    if (isNaN(addPay) || addPay <= 0) {
      toast.error('Please enter a valid payment amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      let createdBillData: BillData;

      if (paymentTargetType === 'MONTHLY') {
        if (!selectedMonthlyPmt) {
          toast.error('No monthly payment record selected.');
          setIsSubmitting(false);
          return;
        }

        const newPaidAmount = selectedMonthlyPmt.paidAmount + addPay;
        await api.updateMonthlyPayment(selectedMonthlyPmt.id, {
          paidAmount: newPaidAmount,
          paymentDate: paymentDate || todayStr,
        });

        const newBalance = Math.max(0, selectedMonthlyPmt.monthlyFee - newPaidAmount);

        createdBillData = {
          type: 'MONTHLY',
          billNo: `BILL-${selectedMonthlyPmt.boxNo}-${selectedMonthlyPmt.month.replace('-', '')}`,
          date: paymentDate || todayStr,
          customerName: currentCustomer.name,
          nicNo: currentCustomer.nicNo,
          phoneNo: currentCustomer.phoneNo,
          address: currentCustomer.address,
          boxNo: selectedMonthlyPmt.boxNo,
          month: selectedMonthlyPmt.month,
          packageName: getCustomerPackage(currentCustomer.id || currentCustomer.boxNo).packageName,
          totalOrFeeAmount: selectedMonthlyPmt.monthlyFee,
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newBalance === 0 ? 'PAID' : 'PARTIAL',
          paymentDate: paymentDate || todayStr,
        };

        toast.success(
          `Payment of ${formatMoney(addPay, currency)} collected for ${currentCustomer.name} (${selectedMonthlyPmt.month})`
        );
      } else {
        const newPaidAmount = currentCustomer.paidAmount + addPay;
        await api.updateCustomer(currentCustomer.id, {
          paidAmount: newPaidAmount,
        });

        const newBalance = Math.max(0, currentCustomer.totalAmount - newPaidAmount);

        createdBillData = {
          type: 'CUSTOMER',
          billNo: `CUST-${currentCustomer.boxNo}-${todayStr.replace(/-/g, '')}`,
          date: paymentDate || todayStr,
          customerName: currentCustomer.name,
          nicNo: currentCustomer.nicNo,
          phoneNo: currentCustomer.phoneNo,
          address: currentCustomer.address,
          boxNo: currentCustomer.boxNo,
          packageName: getCustomerPackage(currentCustomer.id || currentCustomer.boxNo).packageName,
          totalOrFeeAmount: currentCustomer.totalAmount,
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newBalance === 0 ? 'PAID' : 'PARTIAL',
          paymentDate: paymentDate || todayStr,
        };

        toast.success(
          `Registration Fee payment of ${formatMoney(addPay, currency)} collected for ${currentCustomer.name}`
        );
      }

      // Automated SMS receipt dispatch
      if (currentCustomer.phoneNo && currentCustomer.phoneNo.trim() !== '') {
        api
          .sendPaymentSms({
            customerName: currentCustomer.name,
            phoneNo: currentCustomer.phoneNo,
            boxNo: createdBillData.boxNo || currentCustomer.boxNo,
            paidAmount: addPay,
            balanceAmount: createdBillData.balanceAmount,
            month: createdBillData.month,
            paymentDate: createdBillData.paymentDate,
            billNo: createdBillData.billNo,
          })
          .then((smsRes) => {
            if (smsRes.success) {
              toast.success(`SMS receipt dispatched to ${currentCustomer.phoneNo}`);
            }
          })
          .catch((err) => console.warn('SMS dispatch error:', err));
      }

      // Open bill modal for thermal printing
      setActiveBillData(createdBillData);
      setIsBillModalOpen(true);

      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payment collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPkg = currentCustomer ? getCustomerPackage(currentCustomer.id || currentCustomer.boxNo) : null;

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. HEADER */}
      {/* ==================================================================== */}
      <div className="erp-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Rapid POS & Field Payment Collection</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select subscriber, collect monthly bill or registration dues, and trigger instant 58mm/80mm thermal receipts
            </p>
          </div>
        </div>

        <span className="badge-status badge-teal font-mono self-start sm:self-auto">
          POS Active • Live DB
        </span>
      </div>

      {/* ==================================================================== */}
      {/* 2. MAIN POS WORKSPACE: LEFT TERMINAL + RIGHT LIVE RECENT COLLECTIONS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Collection Terminal (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Step 1: Subscriber Search & Selection */}
          <div className="erp-card p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>1. Select Subscriber</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{customers.length} Subscribers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Search Subscriber (Name / Box / Phone)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Type name, box #, or phone..."
                    className="erp-input pl-9 pr-8 text-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>Choose from Matching Results</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {filteredCustomers.length} match{filteredCustomers.length !== 1 ? 'es' : ''}
                  </span>
                </label>
                <select
                  value={currentCustomer?.id || selectedCustId}
                  onChange={(e) => setSelectedCustId(e.target.value)}
                  className="erp-input text-xs font-semibold cursor-pointer"
                >
                  {filteredCustomers.length === 0 ? (
                    <option value="">No subscriber matches "{searchQuery}"</option>
                  ) : (
                    filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        Box #{c.boxNo} — {c.name} ({c.phoneNo})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Selected Subscriber Profile Capsule */}
            {currentCustomer && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{currentCustomer.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25">
                      Box #{currentCustomer.boxNo}
                    </span>
                  </div>
                  <span
                    className={`badge-status text-[9px] ${
                      currentCustomer.status === 'ACTIVE' || !currentCustomer.status
                        ? 'badge-success'
                        : 'badge-warning'
                    }`}
                  >
                    {currentCustomer.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-400">Phone: </span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {currentCustomer.phoneNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Package: </span>
                    <span className="font-semibold text-teal-700 dark:text-teal-300">
                      {currentPkg?.packageName || 'Standard'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Monthly Rate: </span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {formatMoney(currentPkg?.monthlyFee || 1200, currency)}
                    </span>
                  </div>
                </div>

                {/* Dues Summary Badges */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.04] text-xs">
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <span
                    className={`font-mono font-black ${
                      grandBalance > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {formatMoney(grandBalance, currency)}
                  </span>
                  {grandBalance === 0 && <span className="badge-status badge-success text-[9px]">Fully Settled</span>}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Payment Target & Amount */}
          <div className="erp-card p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/[0.04] pb-2.5">
              <CreditCard className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>2. Payment Target & Amount</span>
            </span>

            {/* Target Switcher: Monthly Bill vs Registration Balance */}
            {/* Total Paid cards are hidden; only active dues cards are displayed */}
            <div className={`grid ${hasMonthlyDue && hasRegDue ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {hasMonthlyDue && (
                <button
                  type="button"
                  onClick={() => handleTargetTypeChange('MONTHLY')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentTargetType === 'MONTHLY'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Monthly Bill Dues</span>
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-xs font-mono font-black mt-1 text-slate-900 dark:text-white">
                    {formatMoney(monthlyBalanceSum, currency)}
                  </div>
                  <span className="text-[10px] text-slate-400">{unpaidMonthlyPayments.length} unpaid bill(s)</span>
                </button>
              )}

              {hasRegDue && (
                <button
                  type="button"
                  onClick={() => handleTargetTypeChange('REGISTRATION')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentTargetType === 'REGISTRATION'
                      ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Setup / Reg Balance</span>
                    <Box className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  </div>
                  <div className="text-xs font-mono font-black mt-1 text-slate-900 dark:text-white">
                    {formatMoney(regBalance, currency)}
                  </div>
                  <span className="text-[10px] text-slate-400">Total Setup: {formatMoney(regTotal, currency)}</span>
                </button>
              )}

              {/* Both are totally paid in full (0 balance) */}
              {!hasMonthlyDue && !hasRegDue && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">All Dues Paid in Full (Zero Balance)</div>
                      <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                        This subscriber has no outstanding monthly bills or registration balance.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                    {formatMoney(0, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* If Monthly, Pick Specific Month Bill (Only show if there are unpaid bills) */}
            {paymentTargetType === 'MONTHLY' && unpaidMonthlyPayments.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Select Monthly Bill Period ({unpaidMonthlyPayments.length} Pending)
                </label>
                <select
                  value={selectedMonthlyPaymentId}
                  onChange={(e) => handleMonthlyPmtSelect(e.target.value)}
                  className="erp-input text-xs font-semibold"
                >
                  {unpaidMonthlyPayments.map((p) => (
                    <option key={p.id} value={p.id}>
                      Month: {p.month} — Fee: {formatMoney(p.monthlyFee, currency)} | Paid:{' '}
                      {formatMoney(p.paidAmount, currency)} | Bal: {formatMoney(p.balanceAmount, currency)} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If all dues are paid in full, show settled message; otherwise show collection inputs */}
            {!hasMonthlyDue && !hasRegDue ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No Pending Dues to Collect</p>
                <p className="text-[11px] text-slate-400">
                  All monthly billing periods and registration balances for Box #{currentCustomer?.boxNo || '-'} have been settled in full.
                </p>
              </div>
            ) : (
              <>
                {/* Fast Cash Preset Buttons */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Fast Cash Presets (Quick Tap)
                  </span>
                  <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
                    {[500, 1000, 1200, 1500, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPayAmount(amt.toString())}
                        className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all border text-center cursor-pointer min-h-[40px] flex items-center justify-center active:scale-95 ${
                          payAmount === amt.toString()
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        Rs. {amt}
                      </button>
                    ))}

                    {currentTargetDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(currentTargetDue.toString())}
                        className="col-span-3 sm:col-span-1 py-2 px-3 rounded-xl text-xs font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 text-center cursor-pointer min-h-[40px] flex items-center justify-center active:scale-95"
                      >
                        Full Due ({formatMoney(currentTargetDue, currency)})
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Amount & Live Balance Preview */}
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Amount to Collect (LKR) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className="erp-input font-mono font-black text-lg text-emerald-700 dark:text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {parsedPayAmount > currentTargetDue && currentTargetDue > 0
                          ? 'Advance / Excess Paid'
                          : 'Remaining Balance After'}
                      </label>
                      <div
                        className={`h-10 px-3 rounded-lg flex items-center font-mono font-black text-base border ${
                          parsedPayAmount > currentTargetDue && currentTargetDue > 0
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400 border-slate-200 dark:border-white/[0.08]'
                        }`}
                      >
                        {parsedPayAmount > currentTargetDue && currentTargetDue > 0
                          ? `+${formatMoney(parsedPayAmount - currentTargetDue, currency)} (Advance)`
                          : formatMoney(remainingBalanceAfter, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                      <div className="flex items-center gap-2">
                        {['Cash', 'Bank Transfer', 'Online'].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              paymentMethod === method
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
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
                          className="erp-input font-mono text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-90 pr-8 pointer-events-none"
                          title="Payment date is fixed to today's system date and locked"
                        />
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !payAmount}
                      className="w-full btn-teal py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? 'Recording & Generating Slip...'
                          : `Collect ${formatMoney(parsedPayAmount, currency)} & Print Receipt`}
                      </span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Live DB Collection History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="erp-card p-5 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Recent Collection Logs</span>
                </span>
                <span className="badge-status badge-royal font-mono text-[9px]">Live Audit</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Synchronized collection receipts recorded directly to database with 1-click receipt reprinting
              </p>

              <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-1 scrollbar-thin">
                {liveDbCollectionLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">No payment collections logged yet.</div>
                ) : (
                  liveDbCollectionLogs.slice(0, 15).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {log.customerName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            #{log.boxNo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{log.periodOrTitle}</p>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.dateDisplay} {log.timeDisplay} • {log.paymentMethod}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          +{formatMoney(log.installmentAmount, currency)}
                        </div>
                        <button
                          onClick={() => {
                            setActiveBillData(log.rawBillData);
                            setIsBillModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:border-blue-500 flex items-center gap-1 shadow-2xs"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Reprint</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] text-center">
              <span className="text-[11px] text-slate-400 font-mono">
                {liveDbCollectionLogs.length} receipts archived in session
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Print Modal */}
      <BillPrintModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        billData={activeBillData}
        currency={currency}
      />
    </div>
  );
};
