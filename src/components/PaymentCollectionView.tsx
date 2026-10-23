import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Lock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCcw
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

  // Stepped Form & View Mode States (Mobile-First)
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<'stepped' | 'classic'>('stepped');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

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

  // Current selected due amount (Monthly selected bill or registration)
  const currentDue = paymentTargetType === 'MONTHLY'
    ? (selectedMonthlyPmt ? selectedMonthlyPmt.balanceAmount : 0)
    : regBalance;

  // Reset for next subscriber collection
  const handleResetForNextCustomer = () => {
    setPayAmount('');
    setMobileStep(1);
    setSearchQuery('');
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
          {/* View Mode Switcher: Stepped Form (Mobile-Optimized) vs Classic View */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <div className="inline-flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('stepped')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'stepped'
                    ? 'bg-emerald-500 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Stepped Form Wizard (Mobile Optimized)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stepped Form</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('classic')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'classic'
                    ? 'bg-emerald-500 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Classic 2-Column Layout"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Classic View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Customer Search & Selection Panel (Classic View Only) */}
        {viewMode === 'classic' && (
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
        )}
      </div>

      {viewMode === 'stepped' ? (
        <div className="space-y-4">
          {/* Stepper Progress Bar */}
          <div className="bg-neutral-900 border border-neutral-800 p-3.5 sm:p-4 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  {mobileStep}
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {mobileStep === 1 && 'Step 1: Select Subscriber'}
                    {mobileStep === 2 && 'Step 2: Choose Payment Item & Bill'}
                    {mobileStep === 3 && 'Step 3: Enter Amount & Collect'}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-neutral-400">
                    {mobileStep === 1 && 'Search and pick a customer by Name, Box No, or Phone'}
                    {mobileStep === 2 && 'Choose monthly subscription or box connection dues'}
                    {mobileStep === 3 && 'Enter amount collected, select method & generate receipt'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Step {mobileStep} of 3
              </span>
            </div>

            {/* Stepper Dots & Tabs with Animated Sliding Indicator */}
            <div className="grid grid-cols-3 gap-2 pt-1 relative">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileStep(1)}
                className={`relative py-2 px-2 rounded-xl text-center transition-all cursor-pointer border flex flex-col items-center gap-0.5 ${
                  mobileStep === 1
                    ? 'border-emerald-500 text-emerald-300 font-bold shadow-xs'
                    : selectedCustId
                    ? 'bg-neutral-950 border-emerald-500/30 text-emerald-400/90'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-500'
                }`}
              >
                {mobileStep === 1 && (
                  <motion.div
                    layoutId="stepper-tab-pill"
                    className="absolute inset-0 bg-emerald-500/20 rounded-xl"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-1.5 text-[11px]">
                  {selectedCustId && mobileStep > 1 ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      mobileStep === 1 ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-300'
                    }`}>1</span>
                  )}
                  <span className="truncate">Subscriber</span>
                </div>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: selectedCustId ? 0.95 : 1 }}
                onClick={() => { if (selectedCustId) setMobileStep(2); }}
                disabled={!selectedCustId}
                className={`relative py-2 px-2 rounded-xl text-center transition-all border flex flex-col items-center gap-0.5 ${
                  !selectedCustId
                    ? 'bg-neutral-950/40 border-neutral-850 text-neutral-600 opacity-60 cursor-not-allowed'
                    : mobileStep === 2
                    ? 'border-emerald-500 text-emerald-300 font-bold shadow-xs cursor-pointer'
                    : mobileStep > 2
                    ? 'bg-neutral-950 border-emerald-500/30 text-emerald-400/90 cursor-pointer'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 cursor-pointer'
                }`}
              >
                {mobileStep === 2 && (
                  <motion.div
                    layoutId="stepper-tab-pill"
                    className="absolute inset-0 bg-emerald-500/20 rounded-xl"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-1.5 text-[11px]">
                  {mobileStep > 2 ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      mobileStep === 2 ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-300'
                    }`}>2</span>
                  )}
                  <span className="truncate">Select Due</span>
                </div>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: selectedCustId && (hasMonthlyDue || hasRegDue) ? 0.95 : 1 }}
                onClick={() => { if (selectedCustId && (hasMonthlyDue || hasRegDue)) setMobileStep(3); }}
                disabled={!selectedCustId || (!hasMonthlyDue && !hasRegDue)}
                className={`relative py-2 px-2 rounded-xl text-center transition-all border flex flex-col items-center gap-0.5 ${
                  !selectedCustId || (!hasMonthlyDue && !hasRegDue)
                    ? 'bg-neutral-950/40 border-neutral-850 text-neutral-600 opacity-60 cursor-not-allowed'
                    : mobileStep === 3
                    ? 'border-emerald-500 text-emerald-300 font-bold shadow-xs cursor-pointer'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 cursor-pointer'
                }`}
              >
                {mobileStep === 3 && (
                  <motion.div
                    layoutId="stepper-tab-pill"
                    className="absolute inset-0 bg-emerald-500/20 rounded-xl"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-1.5 text-[11px]">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    mobileStep === 3 ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-300'
                  }`}>3</span>
                  <span className="truncate">Collect & Bill</span>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Stepped Form Wizard Transition Container */}
          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT SUBSCRIBER */}
            {mobileStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="space-y-3.5"
              >
                {/* Fast Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search subscriber by Name, Box No, NIC, or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white text-xs font-bold px-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Matching Status */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <span>
                  {searchQuery ? `Found ${filteredCustomers.length} subscriber(s)` : `All Subscribers (${customers.length})`}
                </span>
                <span className="text-emerald-400 font-semibold">Tap any card to select</span>
              </div>

              {/* Subscriber Cards List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredCustomers.length === 0 ? (
                  <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
                    <UserIcon className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-xs text-neutral-400">No subscribers found matching "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isSelected = cust.id === selectedCustId;
                    const custMonthlyPmts = monthlyPayments.filter(
                      (p) => p.customerId === cust.id || (p.boxNo && p.boxNo.toLowerCase() === cust.boxNo.toLowerCase())
                    );
                    const custMonthlyBal = custMonthlyPmts.reduce((sum, p) => sum + p.balanceAmount, 0);
                    const custTotalDue = (cust.balanceAmount || 0) + custMonthlyBal;

                    return (
                      <div
                        key={cust.id}
                        onClick={() => handleCustChange(cust.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
                            : 'bg-neutral-900/90 hover:bg-neutral-850 border-neutral-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs sm:text-sm truncate">
                              {cust.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-800 border border-neutral-700 text-emerald-400 shrink-0">
                              Box: {cust.boxNo}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              (cust.status || 'ACTIVE') === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {cust.status || 'ACTIVE'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                            {cust.phoneNo && (
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="w-3 h-3 text-neutral-500 shrink-0" />
                                {cust.phoneNo}
                              </span>
                            )}
                            {cust.address && (
                              <span className="flex items-center gap-1 truncate text-neutral-500">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {cust.address}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <span className={`text-xs font-mono font-bold block ${
                              custTotalDue > 0 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {custTotalDue > 0 ? formatMoney(custTotalDue, currency) : 'Rs. 0.00'}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold block">
                              {custTotalDue > 0 ? 'Total Due' : 'Cleared ✓'}
                            </span>
                          </div>

                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'border border-neutral-700 bg-neutral-800'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Customer Card & Continue Action */}
              {currentCustomer && (
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-md">
                  <div className="flex items-start justify-between border-b border-neutral-800 pb-2.5">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">Selected Subscriber:</span>
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <span>{currentCustomer.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                          Box #{currentCustomer.boxNo}
                        </span>
                      </h3>
                    </div>

                    {onNavigateToHistory && (
                      <button
                        type="button"
                        onClick={() => onNavigateToHistory(currentCustomer.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        title="View Payment History"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Grand Outstanding Balance:</span>
                    <span className={`font-mono font-bold text-sm sm:text-base ${
                      grandBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {formatMoney(grandBalance, currency)}
                    </span>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setMobileStep(2)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <span>Continue to Select Due</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: CHOOSE BILL / DUES */}
          {mobileStep === 2 && currentCustomer && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="space-y-3.5"
            >
              {/* Selected Customer Mini Bar */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block">Selected Subscriber:</span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block">
                    {currentCustomer.name} (Box: #{currentCustomer.boxNo})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileStep(1)}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Category Selection Cards */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Select Payment Category *
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {hasMonthlyDue ? (
                    <button
                      type="button"
                      onClick={() => handleTargetTypeChange('MONTHLY')}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        paymentTargetType === 'MONTHLY'
                          ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-100 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          paymentTargetType === 'MONTHLY'
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          <Tv className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-white block">
                            Monthly Subscription
                          </span>
                          <span className="text-[11px] font-mono font-medium text-emerald-400 block truncate">
                            {unpaidMonthlyPayments.length} pending bill(s) • Total Due: {formatMoney(monthlyBalanceSum, currency)}
                          </span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        paymentTargetType === 'MONTHLY' ? 'bg-emerald-500 text-white shadow-xs' : 'border border-neutral-700'
                      }`}>
                        {paymentTargetType === 'MONTHLY' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>All Monthly Subscription bills are fully cleared (Rs. 0.00).</span>
                    </div>
                  )}

                  {hasRegDue ? (
                    <button
                      type="button"
                      onClick={() => handleTargetTypeChange('REGISTRATION')}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        paymentTargetType === 'REGISTRATION'
                          ? 'bg-indigo-500/15 border-indigo-500 ring-2 ring-indigo-500/40 text-indigo-100 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          paymentTargetType === 'REGISTRATION'
                            ? 'bg-indigo-500 text-white shadow-xs'
                            : 'bg-indigo-500/15 text-indigo-400'
                        }`}>
                          <Box className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-white block">
                            Box Setup & Registration Fee
                          </span>
                          <span className="text-[11px] font-mono font-medium text-indigo-400 block truncate">
                            Remaining Balance: {formatMoney(regBalance, currency)}
                          </span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        paymentTargetType === 'REGISTRATION' ? 'bg-indigo-500 text-white shadow-xs' : 'border border-neutral-700'
                      }`}>
                        {paymentTargetType === 'REGISTRATION' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Box Setup & Connection Fee is fully settled (Rs. 0.00).</span>
                    </div>
                  )}
                </div>
              </div>

              {/* If Monthly Selected: Show Months List */}
              {paymentTargetType === 'MONTHLY' && (
                <div className="space-y-2 pt-1">
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                    Select Billing Month to Pay *
                  </label>

                  {customerMonthlyPayments.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs">
                      No monthly billing records exist for this subscriber.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {customerMonthlyPayments.map((pmt) => {
                        const isSelected = pmt.id === (selectedMonthlyPmt?.id || selectedMonthlyPaymentId);
                        const isPaid = pmt.status === 'PAID' && pmt.balanceAmount === 0;

                        return (
                          <div
                            key={pmt.id}
                            onClick={() => handleMonthlyPmtSelect(pmt.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                                : isPaid
                                ? 'bg-neutral-900/50 border-neutral-800 opacity-60'
                                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-white font-mono">
                                  {pmt.month}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  isPaid
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : pmt.balanceAmount < pmt.monthlyFee
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {pmt.status}
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-400 font-mono block">
                                Fee: {formatMoney(pmt.monthlyFee, currency)} • Paid: {formatMoney(pmt.paidAmount, currency)}
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`font-mono font-bold text-xs sm:text-sm block ${
                                pmt.balanceAmount > 0 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {pmt.balanceAmount > 0 ? `Due: ${formatMoney(pmt.balanceAmount, currency)}` : 'Paid ✓'}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-medium">
                                {isSelected ? '✓ Selected' : 'Tap to select'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Buttons: Back & Continue */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setMobileStep(1)}
                  className="py-3 px-4 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setMobileStep(3)}
                  disabled={
                    (paymentTargetType === 'MONTHLY' && (!selectedMonthlyPmt || selectedMonthlyPmt.balanceAmount === 0)) ||
                    (paymentTargetType === 'REGISTRATION' && regBalance === 0)
                  }
                  className="py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <span>Enter Amount</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ENTER PAYMENT AMOUNT, PRESETS & CONFIRM */}
          {mobileStep === 3 && currentCustomer && (
            <motion.form
              key="step-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              onSubmit={handleSubmitPayment}
              className="space-y-3.5"
            >
              {/* Selected Target Summary Card */}
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Subscriber:</span>
                  <span className="font-bold text-white truncate max-w-[200px]">
                    {currentCustomer.name} (Box: #{currentCustomer.boxNo})
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Payment Category:</span>
                  <span className="font-bold text-emerald-400">
                    {paymentTargetType === 'MONTHLY' ? `Monthly Bill (${selectedMonthlyPmt?.month})` : 'Box Setup Fee'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-neutral-800">
                  <span className="text-neutral-300 font-semibold">Total Due on this Bill:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatMoney(currentDue, currency)}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Payment Amount (LKR) *</span>
                  </label>
                  {payAmount && (
                    <button
                      type="button"
                      onClick={() => setPayAmount('')}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      ✕ Clear Amount
                    </button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute left-2 top-2 bottom-2 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
                    LKR
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-16 pr-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Hero One-Tap Full Settle Button */}
              {currentDue > 0 && (
                <button
                  type="button"
                  onClick={() => setPresetAmount(currentDue)}
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs ${
                    parseFloat(payAmount) === currentDue
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span className="text-xs sm:text-sm font-bold text-white">One-Tap Settle Full Due:</span>
                  </div>
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400">
                    {formatMoney(currentDue, currency)}
                  </span>
                </button>
              )}

              {/* Common Quick Cash Presets */}
              {(() => {
                const candidates = [500, 1000, 1500, 2000, 5000];
                const validPresets = candidates.filter((amt) => amt < currentDue);
                if (validPresets.length === 0) return null;

                return (
                  <div className="space-y-1.5 pt-0.5">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                      Common Cash Presets (Tap to Fill):
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {validPresets.map((amt) => {
                        const isSelected = parseFloat(payAmount) === amt;
                        const colorCfg = getPresetColorConfig(amt);
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setPresetAmount(amt)}
                            className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer font-mono font-bold text-xs shadow-xs active:scale-95 ${
                              isSelected ? colorCfg.activeBg : colorCfg.bg
                            }`}
                          >
                            Rs. {amt.toLocaleString()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Live Balance Calculator Card */}
              {(() => {
                const paying = parseFloat(payAmount) || 0;
                const remainingBal = Math.max(0, currentDue - paying);

                return (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Amount to Collect:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        +{formatMoney(paying, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-850">
                      <span className="font-semibold text-neutral-300">Remaining Balance After Payment:</span>
                      <span className={`font-mono font-bold text-sm ${remainingBal === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {formatMoney(remainingBal, currency)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Date & Method */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer h-[38px]"
                  >
                    <option value="Cash">Cash Collection</option>
                    <option value="Bank Transfer">Bank Transfer / EzCash</option>
                    <option value="Card/Online">Card / Online Payment</option>
                    <option value="Check">Check / Draft</option>
                    <option value="Other">Other Method</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <div className="px-2.5 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 text-xs font-mono flex items-center justify-between h-[38px]">
                    <span>{paymentDate}</span>
                    <Lock className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* SMS Notification Banner */}
              {currentCustomer.phoneNo && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">SMS receipt will be sent automatically to {currentCustomer.phoneNo}</span>
                </div>
              )}

              {/* Navigation & Submit Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setMobileStep(2)}
                  className="col-span-1 py-3 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </motion.button>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  disabled={isSubmitting || !payAmount || parseFloat(payAmount) <= 0}
                  className="col-span-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 btn-gradient-submit"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 text-white" />
                      <span>Collect & Print Bill</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Quick Reset for Next Subscriber Button */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleResetForNextCustomer}
                  className="text-[11px] font-semibold text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                >
                  <RotateCcw className="w-3 h-3 text-emerald-400" />
                  <span>Collect payment for another subscriber</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

          {/* Collapsible Recent Collections Log in Stepped View */}
          {liveDbCollectionLogs.length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-lg">
              <div
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Recent Collections Log ({liveDbCollectionLogs.length})
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>{isHistoryExpanded ? 'Collapse' : 'View'}</span>
                  {isHistoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {isHistoryExpanded && (
                <div className="space-y-2.5 pt-2 border-t border-neutral-800 max-h-80 overflow-y-auto pr-1">
                  {liveDbCollectionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs shadow-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="font-bold text-white text-xs">{log.customerName}</span>
                          <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono font-bold text-[10px] text-emerald-400">
                            Box #{log.boxNo}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {log.dateDisplay} {log.timeDisplay}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400 truncate">{log.periodOrTitle}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            log.isPartial ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {log.isPartial ? 'PARTIAL' : 'FULL'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right font-mono">
                          <span className="font-bold text-emerald-400 text-xs block">
                            +{formatMoney(log.installmentAmount, currency)}
                          </span>
                          <span className="text-[10px] text-neutral-400 block">
                            Bal: {formatMoney(log.balanceRemaining, currency)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveBillData(log.rawBillData);
                            setIsBillModalOpen(true);
                          }}
                          className="py-1 px-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Print Receipt Bill"
                        >
                          <Printer className="w-3 h-3 text-emerald-400" />
                          <span>Print</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
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
