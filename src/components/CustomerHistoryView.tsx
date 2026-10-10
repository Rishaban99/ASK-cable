import React, { useState, useEffect } from 'react';
import { Customer, MonthlyPayment, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import { useToast } from './Toast.js';
import {
  History,
  Search,
  UserCheck,
  CreditCard,
  Phone,
  MapPin,
  Box,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Tag,
  Edit2
} from 'lucide-react';

interface CustomerHistoryViewProps {
  customers: Customer[];
  monthlyPayments: MonthlyPayment[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  selectedCustomerId?: string | null;
  onSelectCustomer?: (customerId: string) => void;
}

export const CustomerHistoryView: React.FC<CustomerHistoryViewProps> = ({
  customers,
  monthlyPayments,
  currency,
  onRefreshData,
  currentUser,
  selectedCustomerId: initialSelectedId,
  onSelectCustomer,
}) => {
  const toast = useToast();
  const [selectedCustId, setSelectedCustId] = useState<string>(initialSelectedId || (customers[0]?.id || ''));
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'REGISTRATION' | 'MONTHLY' | 'UNPAID'>('ALL');

  // Pay Balance Modal States
  const [payBalanceTarget, setPayBalanceTarget] = useState<{
    type: 'CUSTOMER' | 'MONTHLY';
    id: string;
    name: string;
    boxNo: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    title: string;
  } | null>(null);

  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Bill Printing Modal States
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const formatMonthLabel = (mStr?: string) => {
    if (!mStr) return '';
    const [year, month] = mStr.split('-');
    if (!year || !month) return mStr;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // Synchronize when initialSelectedId changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedCustId(initialSelectedId);
    } else if (!selectedCustId && customers.length > 0) {
      setSelectedCustId(customers[0].id);
    }
  }, [initialSelectedId, customers]);

  const handleCustChange = (id: string) => {
    setSelectedCustId(id);
    if (onSelectCustomer) {
      onSelectCustomer(id);
    }
  };

  // Currently selected customer object
  const currentCustomer = customers.find((c) => c.id === selectedCustId);

  // Filtered customer options for search box
  const filteredCustomerOptions = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.boxNo.toLowerCase().includes(q) ||
      c.nicNo.toLowerCase().includes(q) ||
      c.phoneNo.toLowerCase().includes(q)
    );
  });

  // Get all monthly payments for current customer
  const customerMonthlyPayments = monthlyPayments.filter((p) => {
    if (!currentCustomer) return false;
    return (
      p.customerId === currentCustomer.id ||
      (p.boxNo && p.boxNo.toLowerCase() === currentCustomer.boxNo.toLowerCase()) ||
      (p.customerName && p.customerName.toLowerCase() === currentCustomer.name.toLowerCase())
    );
  });

  // Calculate totals for current customer
  const regTotal = currentCustomer?.totalAmount || 0;
  const regPaid = currentCustomer?.paidAmount || 0;
  const regBalance = currentCustomer?.balanceAmount || 0;

  const monthlyBilledSum = customerMonthlyPayments.reduce((sum, p) => sum + p.monthlyFee, 0);
  const monthlyPaidSum = customerMonthlyPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const monthlyBalanceSum = customerMonthlyPayments.reduce((sum, p) => sum + p.balanceAmount, 0);

  const grandTotalBilled = regTotal + monthlyBilledSum;
  const grandTotalPaid = regPaid + monthlyPaidSum;
  const grandTotalBalance = regBalance + monthlyBalanceSum;

  // Construct combined ledger items for history timeline table
  interface CombinedHistoryItem {
    id: string;
    itemType: 'REGISTRATION' | 'MONTHLY';
    title: string;
    periodOrDate: string;
    rawDate: string;
    boxNo: string;
    totalOrFee: number;
    paidAmount: number;
    balanceAmount: number;
    status: 'PAID' | 'PARTIAL' | 'UNPAID';
    rawObject: Customer | MonthlyPayment;
  }

  const historyItems: CombinedHistoryItem[] = [];

  // Add Registration Fee entry
  if (currentCustomer) {
    historyItems.push({
      id: `reg-${currentCustomer.id}`,
      itemType: 'REGISTRATION',
      title: 'Customer Registration & Box Setup Fee',
      periodOrDate: currentCustomer.createdAt ? currentCustomer.createdAt.split('T')[0] : 'Initial Registration',
      rawDate: currentCustomer.createdAt || new Date().toISOString(),
      boxNo: currentCustomer.boxNo,
      totalOrFee: currentCustomer.totalAmount,
      paidAmount: currentCustomer.paidAmount,
      balanceAmount: currentCustomer.balanceAmount,
      status: currentCustomer.balanceAmount === 0 ? 'PAID' : currentCustomer.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
      rawObject: currentCustomer,
    });
  }

  // Add Monthly Payment entries
  customerMonthlyPayments.forEach((pmt) => {
    historyItems.push({
      id: `pmt-${pmt.id}`,
      itemType: 'MONTHLY',
      title: `Monthly Subscription Fee (${pmt.month})`,
      periodOrDate: pmt.month,
      rawDate: pmt.paymentDate || pmt.createdAt || new Date().toISOString(),
      boxNo: pmt.boxNo,
      totalOrFee: pmt.monthlyFee,
      paidAmount: pmt.paidAmount,
      balanceAmount: pmt.balanceAmount,
      status: pmt.status,
      rawObject: pmt,
    });
  });

  // Sort history newest first
  historyItems.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

  // Filter history items by selected filter tab
  const filteredHistoryItems = historyItems.filter((item) => {
    if (historyFilter === 'REGISTRATION') return item.itemType === 'REGISTRATION';
    if (historyFilter === 'MONTHLY') return item.itemType === 'MONTHLY';
    if (historyFilter === 'UNPAID') return item.balanceAmount > 0;
    return true;
  });

  // Bill Printing Handlers
  const handlePrintHistoryItemBill = (item: CombinedHistoryItem) => {
    if (!currentCustomer) return;
    if (item.itemType === 'REGISTRATION') {
      setActiveBillData({
        type: 'CUSTOMER',
        billNo: `CUST-${currentCustomer.boxNo}-${todayStr.replace(/-/g, '')}`,
        date: currentCustomer.createdAt ? currentCustomer.createdAt.split('T')[0] : todayStr,
        customerName: currentCustomer.name,
        nicNo: currentCustomer.nicNo,
        phoneNo: currentCustomer.phoneNo,
        address: currentCustomer.address,
        boxNo: currentCustomer.boxNo,
        totalOrFeeAmount: currentCustomer.totalAmount,
        paidAmount: currentCustomer.paidAmount,
        balanceAmount: currentCustomer.balanceAmount,
        status: currentCustomer.balanceAmount === 0 ? 'PAID' : 'PARTIAL',
        paymentDate: currentCustomer.createdAt ? currentCustomer.createdAt.split('T')[0] : todayStr,
      });
    } else {
      const pmt = item.rawObject as MonthlyPayment;
      setActiveBillData({
        type: 'MONTHLY',
        billNo: `BILL-${pmt.boxNo}-${pmt.month.replace('-', '')}`,
        date: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
        customerName: currentCustomer.name,
        nicNo: currentCustomer.nicNo,
        phoneNo: currentCustomer.phoneNo,
        address: currentCustomer.address,
        boxNo: pmt.boxNo,
        month: pmt.month,
        totalOrFeeAmount: pmt.monthlyFee,
        paidAmount: pmt.paidAmount,
        balanceAmount: pmt.balanceAmount,
        status: pmt.status,
        paymentDate: pmt.paymentDate ? pmt.paymentDate.split('T')[0] : todayStr,
      });
    }
    setIsBillModalOpen(true);
  };

  // Print Comprehensive Grand Total Bill Statement
  const handlePrintTotalBill = () => {
    if (!currentCustomer) return;

    let items = [
      {
        description: 'Box Connection & Setup Fee',
        amount: regTotal,
        paidAmount: regPaid,
        balanceAmount: regBalance,
        dateOrPeriod: currentCustomer.createdAt ? currentCustomer.createdAt.split('T')[0] : todayStr,
      },
      ...customerMonthlyPayments.map((pmt) => ({
        description: `Monthly Subscription (${pmt.month})`,
        amount: pmt.monthlyFee,
        paidAmount: pmt.paidAmount,
        balanceAmount: pmt.balanceAmount,
        dateOrPeriod: pmt.paymentDate || pmt.month,
      })),
    ];

    // Exclude fully paid items (balanceAmount = 0 / status = PAID) whenever pending dues exist
    const hasPendingDues = items.some((item) => item.balanceAmount > 0);
    if (hasPendingDues) {
      items = items.filter((item) => item.balanceAmount > 0);
    }

    const filteredTotalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const filteredPaidAmount = items.reduce((sum, item) => sum + item.paidAmount, 0);
    const filteredBalanceAmount = items.reduce((sum, item) => sum + item.balanceAmount, 0);

    setActiveBillData({
      type: 'TOTAL',
      billNo: `TOT-${currentCustomer.boxNo}-${todayStr.replace(/-/g, '')}`,
      date: todayStr,
      customerName: currentCustomer.name,
      nicNo: currentCustomer.nicNo,
      phoneNo: currentCustomer.phoneNo,
      address: currentCustomer.address,
      boxNo: currentCustomer.boxNo,
      totalOrFeeAmount: filteredTotalAmount,
      paidAmount: filteredPaidAmount,
      balanceAmount: filteredBalanceAmount,
      status: filteredBalanceAmount === 0 ? 'PAID' : 'PARTIAL',
      paymentDate: todayStr,
      items,
    });
    setIsBillModalOpen(true);
  };

  // Print Monthly Bills Summary Statement
  const handlePrintMonthlyBillSummary = () => {
    if (!currentCustomer) return;

    if (customerMonthlyPayments.length === 0) {
      toast.error('No monthly bills recorded yet for this customer.');
      return;
    }

    let items = customerMonthlyPayments.map((pmt) => ({
      description: `Monthly Subscription (${pmt.month})`,
      amount: pmt.monthlyFee,
      paidAmount: pmt.paidAmount,
      balanceAmount: pmt.balanceAmount,
      dateOrPeriod: pmt.paymentDate || pmt.month,
    }));

    // Exclude fully paid items (balanceAmount = 0 / status = PAID) whenever pending dues exist
    const hasPendingDues = items.some((item) => item.balanceAmount > 0);
    if (hasPendingDues) {
      items = items.filter((item) => item.balanceAmount > 0);
    }

    const filteredTotalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const filteredPaidAmount = items.reduce((sum, item) => sum + item.paidAmount, 0);
    const filteredBalanceAmount = items.reduce((sum, item) => sum + item.balanceAmount, 0);

    setActiveBillData({
      type: 'MONTHLY',
      billNo: `MTH-${currentCustomer.boxNo}-${todayStr.replace(/-/g, '')}`,
      date: todayStr,
      customerName: currentCustomer.name,
      nicNo: currentCustomer.nicNo,
      phoneNo: currentCustomer.phoneNo,
      address: currentCustomer.address,
      boxNo: currentCustomer.boxNo,
      totalOrFeeAmount: filteredTotalAmount,
      paidAmount: filteredPaidAmount,
      balanceAmount: filteredBalanceAmount,
      status: filteredBalanceAmount === 0 ? 'PAID' : 'PARTIAL',
      paymentDate: todayStr,
      items,
    });
    setIsBillModalOpen(true);
  };

  // Open Pay Balance Modal
  const handleOpenPayBalance = (item: CombinedHistoryItem) => {
    setPayBalanceTarget({
      type: item.itemType === 'REGISTRATION' ? 'CUSTOMER' : 'MONTHLY',
      id: item.itemType === 'REGISTRATION' ? (item.rawObject as Customer).id : (item.rawObject as MonthlyPayment).id,
      name: currentCustomer?.name || '',
      boxNo: item.boxNo,
      totalAmount: item.totalOrFee,
      paidAmount: item.paidAmount,
      balanceAmount: item.balanceAmount,
      title: item.title,
    });
    setPayAmount(item.balanceAmount.toString());
  };

  // Confirm Pay Balance Submit
  const handleConfirmPayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBalanceTarget) return;
    const addPay = parseFloat(payAmount);
    if (isNaN(addPay) || addPay <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setIsPaying(true);
    try {
      const newPaidAmount = payBalanceTarget.paidAmount + addPay;
      if (payBalanceTarget.type === 'CUSTOMER') {
        await api.updateCustomer(payBalanceTarget.id, { paidAmount: newPaidAmount });
      } else {
        await api.updateMonthlyPayment(payBalanceTarget.id, {
          paidAmount: newPaidAmount,
          paymentDate: todayStr,
        });
      }

      toast.success(`Payment of ${formatMoney(addPay, currency)} added for ${payBalanceTarget.name}`);
      setPayBalanceTarget(null);
      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to process balance payment';
      toast.error(msg);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* FIRST SECTION: Top Search & Customer Selection Hero Banner */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 sm:p-6 rounded-xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
              <span>Customer Payment History & Ledger</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Search by subscriber name, box number, NIC, or phone number to view details and payment records.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono font-bold text-emerald-400 self-start md:self-auto">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Subscribers: {customers.length}</span>
          </div>
        </div>

        {/* Dual Search Input & Dropdown Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-neutral-800/80">
          {/* Quick Search Input */}
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Name, Box No, NIC, or Phone..."
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

          {/* Customer Dropdown Select */}
          <div className="relative md:col-span-6">
            <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <select
              value={selectedCustId}
              onChange={(e) => handleCustChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer shadow-inner"
            >
              {customers.length === 0 ? (
                <option value="">No customers available</option>
              ) : filteredCustomerOptions.length === 0 ? (
                <option value="">No customer matching "{searchQuery}"</option>
              ) : (
                filteredCustomerOptions.map((c) => (
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
            Please register customer records first or select an existing customer from the dropdown above to view their card and complete payment history.
          </p>
        </div>
      ) : (
        <>
          {/* Top Section: Detailed Customer Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Customer Details Profile Card */}
            <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5 shadow-xl">
              <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{currentCustomer.name}</h2>
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        (currentCustomer.status || 'ACTIVE') === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : (currentCustomer.status || 'ACTIVE') === 'INACTIVE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {currentCustomer.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono font-bold text-emerald-400">
                      <Box className="w-3 h-3" />
                      <span>{currentCustomer.boxNo}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Details List */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    <span>NIC No:</span>
                  </span>
                  <span className="font-mono text-white font-medium">{currentCustomer.nicNo}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Phone No:</span>
                  </span>
                  <span className="font-mono text-white font-medium">{currentCustomer.phoneNo}</span>
                </div>

                <div className="flex items-start justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400 flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Address:</span>
                  </span>
                  <span className="text-right text-neutral-200 max-w-[200px] truncate">
                    {currentCustomer.address || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Registered Date:</span>
                  </span>
                  <span className="font-mono text-neutral-300">
                    {currentCustomer.createdAt ? currentCustomer.createdAt.split('T')[0] : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Total Bill & Monthly Bill */}
              <div className="pt-3 border-t border-neutral-800 grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrintTotalBill}
                  className="py-2 px-2.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Print Grand Total Bill Statement"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Total Bill</span>
                </button>
                <button
                  onClick={handlePrintMonthlyBillSummary}
                  className="py-2 px-2.5 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 text-indigo-300 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Print Monthly Bills Summary"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Monthly Bill</span>
                </button>
              </div>
            </div>

            {/* 2. Financial Overview Stat Cards (Right 2 Cols) */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Registration Connection Fee */}
              <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">Box Connection Fee</span>
                    <Tag className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xl font-bold font-mono text-white mt-2">
                    {formatMoney(regTotal, currency)}
                  </p>
                </div>
                <div className="pt-3 border-t border-neutral-850 text-[11px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Paid:</span>
                    <span className="text-emerald-400 font-semibold">{formatMoney(regPaid, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Balance:</span>
                    <span className={regBalance > 0 ? 'text-amber-400 font-bold' : 'text-neutral-400'}>
                      {formatMoney(regBalance, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Total Monthly Payments */}
              <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">Monthly Bills Total</span>
                    <Calendar className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    {formatMoney(monthlyBilledSum, currency)}
                  </p>

                  {/* Month-by-Month Dues List */}
                  {customerMonthlyPayments.length > 0 ? (
                    <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Monthly List Breakdown ({customerMonthlyPayments.length})
                      </p>
                      {customerMonthlyPayments.map((pmt) => (
                        <div
                          key={pmt.id}
                          className="p-1.5 rounded bg-neutral-950 border border-neutral-850 flex items-center justify-between text-[11px] font-mono"
                        >
                          <div>
                            <span className="font-semibold text-white">{formatMonthLabel(pmt.month)}</span>
                            <span className="text-[10px] text-neutral-400 ml-1">({pmt.month})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-200">{formatMoney(pmt.monthlyFee, currency)}</span>
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                pmt.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : pmt.status === 'PARTIAL'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {pmt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-500 mt-2 italic">No monthly bills recorded yet.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-850 text-[11px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Paid Months ({customerMonthlyPayments.filter(p => p.status === 'PAID').length}):</span>
                    <span className="text-emerald-400 font-semibold">{formatMoney(monthlyPaidSum, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Monthly Dues:</span>
                    <span className={monthlyBalanceSum > 0 ? 'text-amber-400 font-bold' : 'text-neutral-400'}>
                      {formatMoney(monthlyBalanceSum, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Grand Total Outstanding Balance */}
              <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-medium">Grand Balance Due</span>
                    <CreditCard className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className={`text-xl font-bold font-mono mt-2 ${
                    grandTotalBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {formatMoney(grandTotalBalance, currency)}
                  </p>
                </div>
                <div className="pt-3 border-t border-neutral-850 text-[11px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Billed:</span>
                    <span className="text-white">{formatMoney(grandTotalBilled, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Paid:</span>
                    <span className="text-emerald-400 font-semibold">{formatMoney(grandTotalPaid, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Payment History Ledger Table */}
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Payment History Ledger ({historyItems.length} Records)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Complete sequence of box setup connection payments and monthly billing cycles
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 border border-neutral-800 rounded-md">
                {(['ALL', 'REGISTRATION', 'MONTHLY', 'UNPAID'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setHistoryFilter(filterKey)}
                    className={`px-3 py-1 text-[11px] rounded font-medium transition-colors ${
                      historyFilter === filterKey
                        ? 'bg-emerald-400 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {filterKey === 'ALL'
                      ? 'All Payments'
                      : filterKey === 'REGISTRATION'
                      ? 'Registration'
                      : filterKey === 'MONTHLY'
                      ? 'Monthly Bills'
                      : 'Unpaid Dues'}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Cards View (block md:hidden) - Perfectly Aligned */}
            <div className="block md:hidden space-y-3">
              {filteredHistoryItems.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 text-xs bg-neutral-950 rounded-xl border border-neutral-800">
                  No payment history records found matching filter "{historyFilter}".
                </div>
              ) : (
                filteredHistoryItems.map((item) => (
                  <div key={item.id} className="p-4 space-y-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-md transition-all">
                    {/* Header: Title + Type & Status Badges */}
                    <div className="flex items-start justify-between gap-2 border-b border-neutral-800/80 pb-3">
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-base leading-tight">{item.title}</h3>
                        <div className="flex items-center flex-wrap gap-2 pt-0.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                            item.itemType === 'REGISTRATION'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {item.itemType}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                            item.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.status === 'PARTIAL'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400">Date/Period: {item.periodOrDate}</p>
                      </div>

                      <div className="shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono font-bold text-emerald-400 shadow-xs">
                          <Box className="w-3 h-3 text-neutral-500" />
                          <span>{item.boxNo || '-'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Financial Metrics 3-Column Card */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center font-mono text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-sans block uppercase font-medium tracking-wide">Fee / Total</span>
                        <span className="text-neutral-200 font-semibold block">{formatMoney(item.totalOrFee, currency)}</span>
                      </div>
                      <div className="space-y-0.5 border-x border-neutral-850 px-1">
                        <span className="text-[10px] text-neutral-400 font-sans block uppercase font-medium tracking-wide">Paid</span>
                        <span className="text-emerald-400 font-semibold block">{formatMoney(item.paidAmount, currency)}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-sans block uppercase font-medium tracking-wide">Balance</span>
                        <span className={`font-bold block ${item.balanceAmount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {formatMoney(item.balanceAmount, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Perfectly Aligned Action Buttons Grid */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
                      {item.balanceAmount > 0 ? (
                        <button
                          onClick={() => handleOpenPayBalance(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pay Balance</span>
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Fully Paid</span>
                        </div>
                      )}

                      <button
                        onClick={() => handlePrintHistoryItemBill(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-950 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Print Bill</span>
                      </button>
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
                      <th className="px-4 py-3">Description / Period</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Fee / Total</th>
                      <th className="px-4 py-3 text-right">Paid Amount</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {filteredHistoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
                          No payment history records found matching filter "{historyFilter}".
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-900/60 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-white">{item.title}</p>
                            <p className="text-[11px] font-mono text-neutral-400">Box: {item.boxNo}</p>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                                item.itemType === 'REGISTRATION'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {item.itemType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-neutral-300">
                            {item.periodOrDate}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-300">
                            {formatMoney(item.totalOrFee, currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                            {formatMoney(item.paidAmount, currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                item.balanceAmount === 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {formatMoney(item.balanceAmount, currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                                item.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : item.status === 'PARTIAL'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.balanceAmount > 0 && (
                                <button
                                  onClick={() => handleOpenPayBalance(item)}
                                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                                  title="Pay Balance"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay Balance</span>
                                </button>
                              )}
                              <button
                                onClick={() => handlePrintHistoryItemBill(item)}
                                className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                                title="Print Receipt"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Bill</span>
                              </button>
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
        </>
      )}

      {/* PAY BALANCE MODAL */}
      {payBalanceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Pay Balance Amount</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {payBalanceTarget.title} (Box: <span className="font-mono text-emerald-400">{payBalanceTarget.boxNo}</span>)
                </p>
              </div>
              <button onClick={() => setPayBalanceTarget(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayBalance} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5 font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>Total Amount:</span>
                  <span className="text-white">{formatMoney(payBalanceTarget.totalAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Already Paid:</span>
                  <span className="text-emerald-400">{formatMoney(payBalanceTarget.paidAmount, currency)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-neutral-850 pt-1.5 text-amber-400">
                  <span>Current Balance Due:</span>
                  <span className="text-sm">{formatMoney(payBalanceTarget.balanceAmount, currency)}</span>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payBalanceTarget.balanceAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayBalanceTarget(null)}
                  className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-4 py-1.5 rounded bg-emerald-400 font-semibold text-neutral-950 hover:bg-emerald-300"
                >
                  {isPaying ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILL PRINT MODAL */}
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
