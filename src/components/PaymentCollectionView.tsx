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
  DollarSign
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

  // Selected monthly payment item object
  const selectedMonthlyPmt = customerMonthlyPayments.find((p) => p.id === selectedMonthlyPaymentId) || unpaidMonthlyPayments[0];

  // Auto-sync initial selection when customer changes
  useEffect(() => {
    if (unpaidMonthlyPayments.length > 0) {
      setSelectedMonthlyPaymentId(unpaidMonthlyPayments[0].id);
      if (paymentTargetType === 'MONTHLY') {
        setPayAmount(unpaidMonthlyPayments[0].balanceAmount.toString());
      }
    } else if (regBalance > 0) {
      setPaymentTargetType('REGISTRATION');
      setPayAmount(regBalance.toString());
    } else {
      setPayAmount('');
    }
  }, [selectedCustId]);

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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 sm:p-6 rounded-xl shadow-xl space-y-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Customer Profile & Dues Overview (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Customer Summary Card */}
            <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5 shadow-xl">
              <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{currentCustomer.name}</h2>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        (currentCustomer.status || 'ACTIVE') === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {currentCustomer.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono font-bold text-emerald-400">
                      <Box className="w-3.5 h-3.5" />
                      <span>Box: {currentCustomer.boxNo}</span>
                    </span>
                  </div>
                </div>

                {onNavigateToHistory && (
                  <button
                    onClick={() => onNavigateToHistory(currentCustomer.id)}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>View History</span>
                  </button>
                )}
              </div>

              {/* Contact Details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">NIC No:</span>
                  <span className="font-mono text-white font-medium">{currentCustomer.nicNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Phone No:</span>
                  <span className="font-mono text-white font-medium">{currentCustomer.phoneNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-400">Address:</span>
                  <span className="text-right text-neutral-200 max-w-[180px] truncate">{currentCustomer.address || 'N/A'}</span>
                </div>
              </div>

              {/* Combined Grand Dues Card */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Grand Outstanding Dues:</span>
                  <span
                    className={`font-mono text-lg font-bold ${
                      grandBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {formatMoney(grandBalance, currency)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-neutral-850">
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-850">
                    <span className="text-neutral-400 block text-[10px]">Box Connection:</span>
                    <span className={regBalance > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {formatMoney(regBalance, currency)}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-neutral-900 border border-neutral-850">
                    <span className="text-neutral-400 block text-[10px]">Monthly Dues:</span>
                    <span className={monthlyBalanceSum > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {formatMoney(monthlyBalanceSum, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Pending Monthly Bills for Selected Customer */}
            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Pending Monthly Bills ({unpaidMonthlyPayments.length})</span>
                {unpaidMonthlyPayments.length === 0 && (
                  <span className="text-[10px] text-emerald-400 lowercase font-normal">All months paid</span>
                )}
              </h3>

              {customerMonthlyPayments.length === 0 ? (
                <p className="text-xs text-neutral-500 italic p-3 text-center bg-neutral-950 rounded-lg">
                  No monthly billing records created for this subscriber yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {customerMonthlyPayments.map((pmt) => {
                    const isSelected = selectedMonthlyPaymentId === pmt.id && paymentTargetType === 'MONTHLY';
                    return (
                      <div
                        key={pmt.id}
                        onClick={() => {
                          setPaymentTargetType('MONTHLY');
                          handleMonthlyPmtSelect(pmt.id);
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 shadow-sm'
                            : 'bg-neutral-950 border-neutral-850 hover:bg-neutral-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="font-bold text-white block">{pmt.month} Subscription</span>
                            <span className="text-[11px] font-mono text-neutral-400">
                              Fee: {formatMoney(pmt.monthlyFee, currency)} | Paid: {formatMoney(pmt.paidAmount, currency)}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded inline-block mb-1 ${
                                pmt.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : pmt.status === 'PARTIAL'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {pmt.status}
                            </span>
                            <span className={`block font-bold text-xs ${pmt.balanceAmount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              Due: {formatMoney(pmt.balanceAmount, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Payment Collection Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmitPayment} className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Collect Payment Entry</span>
                </h2>
                <span className="text-xs text-neutral-400">Subscriber: <strong className="text-white">{currentCustomer.name}</strong></span>
              </div>

              {/* Target Payment Selection Radio */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Select Payment Item / Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('MONTHLY')}
                    className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                      paymentTargetType === 'MONTHLY'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-sm">Monthly Subscription</span>
                      <span className="text-[11px] text-neutral-400">Monthly billing dues ({customerMonthlyPayments.length} cycles)</span>
                    </div>
                    {paymentTargetType === 'MONTHLY' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('REGISTRATION')}
                    className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                      paymentTargetType === 'REGISTRATION'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-sm">Box Setup & Registration</span>
                      <span className="text-[11px] text-neutral-400">
                        Remaining: {formatMoney(regBalance, currency)}
                      </span>
                    </div>
                    {paymentTargetType === 'REGISTRATION' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* If MONTHLY target selected: Choose Month Dropdown */}
              {paymentTargetType === 'MONTHLY' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Select Billing Month *
                  </label>
                  {customerMonthlyPayments.length === 0 ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No monthly payment entries exist for this customer yet. You can create monthly bills in the Monthly Payment tab.</span>
                    </div>
                  ) : (
                    <select
                      value={selectedMonthlyPaymentId}
                      onChange={(e) => handleMonthlyPmtSelect(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                      {customerMonthlyPayments.map((pmt) => (
                        <option key={pmt.id} value={pmt.id}>
                          {pmt.month} - Fee: {formatMoney(pmt.monthlyFee, currency)} (Paid: {formatMoney(pmt.paidAmount, currency)} | Due: {formatMoney(pmt.balanceAmount, currency)}) [{pmt.status}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Amount Entry & Quick Preset Buttons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Payment Amount (LKR) *
                  </label>
                  {paymentTargetType === 'MONTHLY' && selectedMonthlyPmt && (
                    <span className="text-xs text-neutral-400">
                      Target Balance Due: <strong className="text-amber-400 font-mono">{formatMoney(selectedMonthlyPmt.balanceAmount, currency)}</strong>
                    </span>
                  )}
                  {paymentTargetType === 'REGISTRATION' && (
                    <span className="text-xs text-neutral-400">
                      Reg Balance Due: <strong className="text-amber-400 font-mono">{formatMoney(regBalance, currency)}</strong>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-mono font-bold text-emerald-400">LKR</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount collected..."
                    className="w-full pl-14 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-500/50 shadow-inner"
                  />
                </div>

                {/* Quick Presets Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-neutral-400 font-medium">Quick Fill:</span>
                  {paymentTargetType === 'MONTHLY' && selectedMonthlyPmt && selectedMonthlyPmt.balanceAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPresetAmount(selectedMonthlyPmt.balanceAmount)}
                      className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer"
                    >
                      Full Month Balance ({selectedMonthlyPmt.balanceAmount})
                    </button>
                  )}
                  {paymentTargetType === 'REGISTRATION' && regBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPresetAmount(regBalance)}
                      className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer"
                    >
                      Full Reg Balance ({regBalance})
                    </button>
                  )}

                  {/* Filter preset amounts to ONLY show values LESS THAN OR EQUAL TO the current target balance due */}
                  {(() => {
                    const currentDue = paymentTargetType === 'MONTHLY'
                      ? (selectedMonthlyPmt ? selectedMonthlyPmt.balanceAmount : 0)
                      : regBalance;
                    const candidates = [100, 200, 300, 500, 1000, 1500, 2000, 5000];
                    const validPresets = candidates.filter((amt) => amt < currentDue);

                    return validPresets.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPresetAmount(amt)}
                        className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                      >
                        + Rs.{amt.toLocaleString()}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Payment Date & Payment Method Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500/50 cursor-pointer"
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
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Banknote className="w-5 h-5 text-neutral-950" />
                  <span>{isSubmitting ? 'Processing Payment...' : 'Collect Payment & Print Receipt'}</span>
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
