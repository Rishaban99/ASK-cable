import React, { useState, useEffect } from 'react';
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
  FileText,
  Printer,
  AlertCircle,
  Tag,
  Clock,
  Check,
  Box,
  DollarSign,
  Zap,
  Tv,
  ShieldCheck,
  Phone,
  MapPin,
  History,
  Lock
} from 'lucide-react';

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

const getPresetColorConfig = (amt: number) => {
  switch (amt) {
    case 500:
      return {
        bg: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-700 dark:text-amber-300',
        activeBg: 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/50 shadow-md font-extrabold btn-color-selected',
      };
    case 1000:
      return {
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
        activeBg: 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/50 shadow-md font-extrabold btn-color-selected',
      };
    case 1500:
      return {
        bg: 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-500/40 text-teal-700 dark:text-teal-300',
        activeBg: 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-500/50 shadow-md font-extrabold btn-color-selected',
      };
    case 2000:
      return {
        bg: 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/40 text-purple-700 dark:text-purple-300',
        activeBg: 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-500/50 shadow-md font-extrabold btn-color-selected',
      };
    case 5000:
      return {
        bg: 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-700 dark:text-rose-300',
        activeBg: 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-500/50 shadow-md font-extrabold btn-color-selected',
      };
    default:
      return {
        bg: 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/40 text-blue-700 dark:text-blue-300',
        activeBg: 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/50 shadow-md font-extrabold btn-color-selected',
      };
  }
};

export const PaymentCollectionView: React.FC<PaymentCollectionViewProps> = ({
  customers,
  monthlyPayments,
  incomes = [],
  currency,
  onRefreshData,
  currentUser,
  onNavigateToHistory,
}) => {
  const toast = useToast();
  const todayStr = new Date().toISOString().split('T')[0];

  // Selection & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string>(customers[0]?.id || '');
  
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

  // Filtered customer list for search box
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.boxNo.toLowerCase().includes(q) ||
      c.nicNo.toLowerCase().includes(q) ||
      c.phoneNo.toLowerCase().includes(q)
    );
  });

  // Selected customer object
  const currentCustomer = customers.find((c) => c.id === selectedCustId);

  // Get monthly payments for current customer
  const customerMonthlyPayments = monthlyPayments.filter((p) => {
    if (!currentCustomer) return false;
    return (
      p.customerId === currentCustomer.id ||
      (p.boxNo && p.boxNo.toLowerCase() === currentCustomer.boxNo.toLowerCase()) ||
      (p.customerName && p.customerName.toLowerCase() === currentCustomer.name.toLowerCase())
    );
  });

  // Pending unpaid monthly payments for current customer
  const unpaidMonthlyPayments = customerMonthlyPayments.filter((p) => p.balanceAmount > 0 || p.status !== 'PAID');

  // Registration fee calculations
  const regBalance = currentCustomer?.balanceAmount || 0;
  const regTotal = currentCustomer?.totalAmount || 0;
  const regPaid = currentCustomer?.paidAmount || 0;

  // Total monthly balance
  const monthlyBalanceSum = customerMonthlyPayments.reduce((sum, p) => sum + p.balanceAmount, 0);
  const grandBalance = regBalance + monthlyBalanceSum;

  // Dues availability flags
  const hasMonthlyDue = monthlyBalanceSum > 0 && unpaidMonthlyPayments.length > 0;
  const hasRegDue = regBalance > 0;

  // Selected monthly payment item object
  const selectedMonthlyPmt = customerMonthlyPayments.find((p) => p.id === selectedMonthlyPaymentId) || unpaidMonthlyPayments[0];

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
      setPayAmount('');
    }
  }, [selectedCustId, customerMonthlyPayments.length, regBalance, monthlyBalanceSum]);

  // Update default pay amount when payment target type or selected monthly payment changes
  const handleTargetTypeChange = (type: 'MONTHLY' | 'REGISTRATION') => {
    setPaymentTargetType(type);
    if (type === 'MONTHLY') {
      const targetPmt = customerMonthlyPayments.find((p) => p.id === selectedMonthlyPaymentId) || unpaidMonthlyPayments[0];
      if (targetPmt) {
        setPayAmount(targetPmt.balanceAmount.toString());
      } else {
        setPayAmount('');
      }
    } else {
      setPayAmount(regBalance.toString());
    }
  };

  const handleMonthlyPmtSelect = (pmtId: string) => {
    setSelectedMonthlyPaymentId(pmtId);
    const targetPmt = customerMonthlyPayments.find((p) => p.id === pmtId);
    if (targetPmt) {
      setPayAmount(targetPmt.balanceAmount.toString());
    }
  };

  const handleCustChange = (id: string) => {
    setSelectedCustId(id);
  };

  // Preset Amount Setter
  const setPresetAmount = (amt: number) => {
    setPayAmount(amt.toString());
  };

  // Construct Live DB-Connected Collection Logs (Creating Individual Cards for Each Partial Payment Installment)
  const liveDbCollectionLogs: LiveDbCollectionLog[] = [];

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
            (p) => (p.customerId === matchedCust.id || (p.boxNo && p.boxNo.toLowerCase() === matchedCust.boxNo.toLowerCase())) && p.month === monthStr
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

      liveDbCollectionLogs.push({
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

  // Fallback if incomes array is empty or no matched income records
  if (liveDbCollectionLogs.length === 0) {
    monthlyPayments.forEach((pmt) => {
      if (pmt.paidAmount > 0) {
        const cust = customers.find(
          (c) => c.id === pmt.customerId || (c.boxNo && c.boxNo.toLowerCase() === pmt.boxNo.toLowerCase())
        );
        const createdDate = pmt.createdAt ? new Date(pmt.createdAt) : new Date();
        liveDbCollectionLogs.push({
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

  // Sort newest payment dates & timestamps first
  liveDbCollectionLogs.sort((a, b) => b.rawDateSort - a.rawDateSort);

  // Submit Payment Collection
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCustomer) {
      toast.error('Please select a customer first.');
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
          totalOrFeeAmount: selectedMonthlyPmt.monthlyFee,
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newBalance === 0 ? 'PAID' : 'PARTIAL',
          paymentDate: paymentDate || todayStr,
        };

        toast.success(`Payment of ${formatMoney(addPay, currency)} collected for ${currentCustomer.name} (${selectedMonthlyPmt.month})`);
      } else {
        // Registration Payment
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
          totalOrFeeAmount: currentCustomer.totalAmount,
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newBalance === 0 ? 'PAID' : 'PARTIAL',
          paymentDate: paymentDate || todayStr,
        };

        toast.success(`Registration Fee payment of ${formatMoney(addPay, currency)} collected for ${currentCustomer.name}`);
      }

      // Automatically dispatch SMS receipt to customer's mobile number via Notify.lk
      if (currentCustomer.phoneNo && currentCustomer.phoneNo.trim() !== '') {
        api.sendPaymentSms({
          customerName: currentCustomer.name,
          phoneNo: currentCustomer.phoneNo,
          boxNo: createdBillData.boxNo || currentCustomer.boxNo,
          paidAmount: addPay,
          balanceAmount: createdBillData.balanceAmount,
          month: createdBillData.month,
          paymentDate: createdBillData.paymentDate,
          billNo: createdBillData.billNo,
        }).then((smsRes) => {
          if (smsRes.success) {
            toast.success(`SMS receipt sent to ${currentCustomer.phoneNo}`);
          }
        }).catch((err) => {
          console.warn('Automated SMS receipt dispatch failed:', err);
        });
      }

      // Automatically open print modal for receipt
      setActiveBillData(createdBillData);
      setIsBillModalOpen(true);

      // Refresh master DB state
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payment collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-5 rounded-xl shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Banknote className="w-6 h-6 text-emerald-400 shrink-0" />
              <span>Payment Collection Form</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Select a subscriber, choose pending monthly or registration dues, record payment, and generate receipts instantly.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono font-bold text-emerald-400 self-start md:self-auto">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Fast Counter Collection</span>
          </div>
        </div>

        {/* Step 1: Customer Search & Selection Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-neutral-800">
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search subscriber by Name, Box No, NIC, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-white text-xs font-bold px-1 rounded"
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative md:col-span-6">
            <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <select
              value={selectedCustId}
              onChange={(e) => handleCustChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer shadow-inner"
            >
              {customers.length === 0 ? (
                <option value="">No customers available</option>
              ) : filteredCustomers.length === 0 ? (
                <option value="">No subscriber matching "{searchQuery}"</option>
              ) : (
                filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Box: {c.boxNo}) - {c.phoneNo || c.nicNo} [{c.status}]
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {!currentCustomer ? (
        <div className="p-12 text-center bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-3">
          <UserIcon className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Customer Selected</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Please register subscribers first or select a customer using the search bar above to collect payments.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Customer Profile & Dues Overview (Joined seamlessly) */}
          <div className="lg:col-span-5 p-4 sm:p-5 lg:p-6 bg-neutral-950/40 border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-start justify-between border-b border-neutral-800 pb-3.5">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                      {currentCustomer.name}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-extrabold rounded-full ${
                        (currentCustomer.status || 'ACTIVE') === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          (currentCustomer.status || 'ACTIVE') === 'ACTIVE'
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-rose-500'
                        }`}
                      />
                      {currentCustomer.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/35 rounded-xl text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-300 shadow-xs">
                      <Box className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Box: {currentCustomer.boxNo}</span>
                    </span>
                  </div>
                </div>

                {onNavigateToHistory && (
                  <button
                    type="button"
                    onClick={() => onNavigateToHistory(currentCustomer.id)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-all flex items-center gap-1.5 shrink-0 ml-2 shadow-xs cursor-pointer active:scale-95"
                    title="View Subscriber Payment History"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>View History</span>
                  </button>
                )}
              </div>

              {/* Colorful Contact Details Badges */}
              <div className="grid grid-cols-1 gap-2 text-xs">
                {/* NIC No Badge (Sky Blue) */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <span className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>NIC No:</span>
                  </span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-white">
                    {currentCustomer.nicNo || 'N/A'}
                  </span>
                </div>

                {/* Phone No Badge (Emerald) */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Phone No:</span>
                  </span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-white">
                    {currentCustomer.phoneNo || 'N/A'}
                  </span>
                </div>

                {/* Address Badge (Purple) */}
                <div className="flex items-start justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Address:</span>
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white text-right break-words max-w-[200px] sm:max-w-none">
                    {currentCustomer.address || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Combined Grand Dues Card */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">Grand Outstanding Dues:</span>
                <span
                  className={`font-mono text-base sm:text-lg font-bold ${
                    grandBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {formatMoney(grandBalance, currency)}
                </span>
              </div>

              <div className={`grid ${regBalance > 0 && monthlyBalanceSum > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-[11px] font-mono pt-2 border-t border-neutral-850`}>
                {regBalance > 0 && (
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                    <span className="text-indigo-600 dark:text-indigo-400 block text-[10px] font-bold">Box Connection:</span>
                    <span className="text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      {formatMoney(regBalance, currency)}
                    </span>
                  </div>
                )}

                {monthlyBalanceSum > 0 && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                    <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] font-bold">Monthly Dues:</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      {formatMoney(monthlyBalanceSum, currency)}
                    </span>
                  </div>
                )}

                {regBalance === 0 && monthlyBalanceSum === 0 && (
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-bold text-xs">
                    ✓ All Balance Cleared (Rs. 0.00)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Payment Collection Form (Joined seamlessly) */}
          <div className="lg:col-span-7 p-4 sm:p-5 lg:p-6">
            <form onSubmit={handleSubmitPayment} className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                  <span>Collect Payment Entry</span>
                </h2>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
                  Subscriber: <strong className="text-neutral-900 dark:text-white">{currentCustomer.name}</strong>
                </span>
              </div>

              {/* Target Payment Selection Radio */}
              {hasMonthlyDue || hasRegDue ? (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Payment Item / Category *
                  </label>
                  <div className={`grid ${hasMonthlyDue && hasRegDue ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                    {hasMonthlyDue && (
                      <button
                        type="button"
                        onClick={() => handleTargetTypeChange('MONTHLY')}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                          paymentTargetType === 'MONTHLY'
                            ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-sm'
                            : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/25 text-neutral-700 dark:text-neutral-300 hover:text-emerald-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            paymentTargetType === 'MONTHLY'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            <Tv className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold block text-xs sm:text-sm text-neutral-900 dark:text-white">Monthly Subscription</span>
                            <span className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 truncate block">
                              {unpaidMonthlyPayments.length} pending bill(s) • Due: {formatMoney(monthlyBalanceSum, currency)}
                            </span>
                          </div>
                        </div>
                        {paymentTargetType === 'MONTHLY' ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-emerald-500/40 shrink-0" />
                        )}
                      </button>
                    )}

                    {hasRegDue && (
                      <button
                        type="button"
                        onClick={() => handleTargetTypeChange('REGISTRATION')}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                          paymentTargetType === 'REGISTRATION'
                            ? 'bg-indigo-500/15 border-indigo-500 ring-2 ring-indigo-500/30 text-indigo-950 dark:text-indigo-100 shadow-sm'
                            : 'bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/25 text-neutral-700 dark:text-neutral-300 hover:text-indigo-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            paymentTargetType === 'REGISTRATION'
                              ? 'bg-indigo-500 text-white shadow-xs'
                              : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            <Box className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold block text-xs sm:text-sm text-neutral-900 dark:text-white">Box Setup & Registration</span>
                            <span className="text-[11px] font-mono font-medium text-indigo-700 dark:text-indigo-400 truncate block">
                              Remaining: {formatMoney(regBalance, currency)}
                            </span>
                          </div>
                        </div>
                        {paymentTargetType === 'REGISTRATION' ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-indigo-500/40 shrink-0" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>All payment categories are fully settled! Remaining balance is Rs. 0.00.</span>
                </div>
              )}

              {/* Side-by-Side: Billing Month (or item) & Payment Amount Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentTargetType === 'MONTHLY' ? (
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Select Billing Month *</span>
                    </label>
                    {customerMonthlyPayments.length === 0 ? (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 rounded-xl text-[11px] font-medium">
                        No monthly payment entries exist.
                      </div>
                    ) : (
                      <select
                        value={selectedMonthlyPaymentId}
                        onChange={(e) => handleMonthlyPmtSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer h-[42px]"
                      >
                        {customerMonthlyPayments.map((pmt) => (
                          <option key={pmt.id} value={pmt.id}>
                            {pmt.month} - Fee: {formatMoney(pmt.monthlyFee, currency)} (Due: {formatMoney(pmt.balanceAmount, currency)}) [{pmt.status}]
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      <Box className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Registration Fee Target</span>
                    </label>
                    <div className="px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between h-[42px]">
                      <span>Box Setup & Reg</span>
                      <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold">{formatMoney(regBalance, currency)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Payment Amount (LKR) *</span>
                    </label>
                    {paymentTargetType === 'MONTHLY' && selectedMonthlyPmt && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                        Due: {formatMoney(selectedMonthlyPmt.balanceAmount, currency)}
                      </span>
                    )}
                    {paymentTargetType === 'REGISTRATION' && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                        Due: {formatMoney(regBalance, currency)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      LKR
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Enter amount collected..."
                      className="w-full pl-14 pr-3 py-2 bg-neutral-950 border border-neutral-700 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white font-mono text-sm sm:text-base font-bold focus:outline-none focus:border-emerald-500 shadow-inner h-[42px]"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Access Presets Panel (Mobile-First Color UI) */}
              {(() => {
                const currentDue = paymentTargetType === 'MONTHLY'
                  ? (selectedMonthlyPmt ? selectedMonthlyPmt.balanceAmount : 0)
                  : regBalance;
                const candidates = [500, 1000, 1500, 2000, 5000];
                const validPresets = candidates.filter((amt) => amt < currentDue);
                const isFullDueSelected = currentDue > 0 && parseFloat(payAmount) === currentDue;

                if (currentDue <= 0) return null;

                return (
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950/80 border border-amber-500/25 space-y-2.5 shadow-sm">
                    {/* Header with Title and Clear Action */}
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-xs tracking-wider uppercase">
                        <Zap className="w-3.5 h-3.5 fill-amber-500" />
                        <span>Quick Access Presets</span>
                      </div>
                      {payAmount && (
                        <button
                          type="button"
                          onClick={() => setPayAmount('')}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                          title="Clear entered amount"
                        >
                          <span>✕ Clear Amount</span>
                        </button>
                      )}
                    </div>

                    {/* Primary Hero Shortcut: Settle Full Balance (No Truncation) */}
                    {currentDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setPresetAmount(currentDue)}
                        className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs ${
                          isFullDueSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40 shadow-sm'
                            : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isFullDueSelected
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold block leading-tight text-neutral-900 dark:text-white">
                              {paymentTargetType === 'MONTHLY' ? 'Full Month Due' : 'Full Reg Balance'}
                            </span>
                            {paymentTargetType === 'MONTHLY' && selectedMonthlyPmt?.month && (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                                Month: {selectedMonthlyPmt.month}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono">
                          <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(currentDue, currency)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFullDueSelected
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {isFullDueSelected ? '✓ Selected' : '⚡ One-Tap'}
                          </span>
                        </div>
                      </button>
                    )}

                    {/* Common Cash Presets (Color Coded Denominations) */}
                    {validPresets.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold tracking-wider">
                          <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Common Cash Presets (Tap to Fill)</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {validPresets.map((amt) => {
                            const isSelected = parseFloat(payAmount) === amt;
                            const colorCfg = getPresetColorConfig(amt);
                            return (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setPresetAmount(amt)}
                                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer font-mono font-bold text-xs shadow-xs flex items-center justify-center gap-1 active:scale-95 ${
                                  isSelected ? colorCfg.activeBg : colorCfg.bg
                                }`}
                              >
                                <span className="text-[10px] font-sans opacity-70">Rs.</span>
                                <span className="text-xs sm:text-sm">{amt.toLocaleString()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment Date & Payment Method Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Payment Date</span>
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded shadow-xs">
                      <Lock className="w-2.5 h-2.5 text-emerald-500" />
                      <span>Locked (Today)</span>
                    </span>
                  </div>
                  <input
                    type="date"
                    readOnly
                    disabled
                    value={paymentDate}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 font-mono text-xs cursor-not-allowed select-none opacity-85 h-[40px]"
                    title="Payment date cannot be edited (automatically recorded with current date)"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Payment Method *</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer h-[40px]"
                  >
                    <option value="Cash">Cash Collection</option>
                    <option value="Bank Transfer">Bank Transfer / EzCash</option>
                    <option value="Card/Online">Card / Online Payment</option>
                    <option value="Check">Check / Draft</option>
                    <option value="Other">Other Method</option>
                  </select>
                </div>
              </div>

              {/* Submit Payment Action */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || grandBalance === 0 || !payAmount || parseFloat(payAmount) <= 0}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 btn-gradient-submit"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Recording Payment & Receipt...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 text-white" />
                      <span>Collect Payment & Print Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live DB-Connected Payment Collections History Log (Partial & Full Payment Cards) */}
      {liveDbCollectionLogs.length > 0 && (
        <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Payment Collections History Log ({liveDbCollectionLogs.length} Installments)</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Itemized log of every partial and full payment collected with exact date and time.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {liveDbCollectionLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-xs hover:border-neutral-750 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold text-white text-sm">{log.customerName}</span>
                    <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono font-bold text-[10px] text-emerald-400">
                      Box: {log.boxNo}
                    </span>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] font-mono text-neutral-300">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      <span>{log.dateDisplay}</span>
                      {log.timeDisplay && <span className="text-emerald-400 font-bold ml-1">{log.timeDisplay}</span>}
                    </div>
                    <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[9px] font-mono text-neutral-400 uppercase">
                      {log.paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <p className="text-neutral-400 font-medium">{log.periodOrTitle}</p>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded ${
                        log.isPartial
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {log.isPartial ? 'PARTIAL PAYMENT' : 'FULL PAYMENT'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-400 text-sm block">
                      +{formatMoney(log.installmentAmount, currency)}
                    </span>
                    <span className={`text-[10px] block ${log.balanceRemaining > 0 ? 'text-amber-400 font-semibold' : 'text-neutral-400'}`}>
                      Bal: {formatMoney(log.balanceRemaining, currency)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveBillData(log.rawBillData);
                      setIsBillModalOpen(true);
                    }}
                    className="py-1.5 px-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Print Receipt Bill for this Installment"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Print Bill</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bill Printing Modal */}
      {isBillModalOpen && activeBillData && (
        <BillPrintModal
          isOpen={isBillModalOpen}
          onClose={() => setIsBillModalOpen(false)}
          billData={activeBillData}
          currency={currency}
        />
      )}
    </div>
  );
};
