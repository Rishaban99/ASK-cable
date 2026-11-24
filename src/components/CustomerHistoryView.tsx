import React, { useState, useEffect, useMemo } from 'react';
import { Customer, MonthlyPayment, IncomeRecord, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { useToast } from './Toast.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import {
  History,
  Search,
  User as UserIcon,
  Users,
  Box,
  ShieldCheck,
  Phone,
  MapPin,
  Calendar,
  Printer,
  Tv,
  CreditCard,
  Clock,
  CheckCircle2,
  Banknote,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { getCustomerPackage } from '../utils/packageManager.js';

export interface CustomerHistoryViewProps {
  customers: Customer[];
  monthlyPayments: MonthlyPayment[];
  incomes?: IncomeRecord[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  selectedCustomerId?: string | null;
  onSelectCustomer?: (customerId: string) => void;
}

export const CustomerHistoryView: React.FC<CustomerHistoryViewProps> = ({
  customers,
  monthlyPayments,
  incomes = [],
  currency,
  onRefreshData,
  selectedCustomerId,
  onSelectCustomer,
}) => {
  const toast = useToast();
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeCustomerId, setActiveCustomerId] = useState<string>(
    selectedCustomerId || customers[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'REGISTRATION' | 'MONTHLY' | 'UNPAID'>('ALL');

  // Pay Balance Modal States
  const [payTargetItem, setPayTargetItem] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Bill Print Modal States
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  useEffect(() => {
    if (selectedCustomerId) {
      setActiveCustomerId(selectedCustomerId);
    } else if (!activeCustomerId && customers.length > 0) {
      setActiveCustomerId(customers[0].id);
    }
  }, [selectedCustomerId, customers]);

  const handleSelectCust = (id: string) => {
    setActiveCustomerId(id);
    if (onSelectCustomer) onSelectCustomer(id);
  };

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === activeCustomerId) || customers[0],
    [customers, activeCustomerId]
  );

  const filteredCustomerList = useMemo(() => {
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.boxNo.toLowerCase().includes(q) ||
        c.phoneNo.toLowerCase().includes(q) ||
        c.nicNo.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  // Monthly bills for selected customer
  const customerMonthlyBills = useMemo(() => {
    if (!selectedCustomer) return [];
    return monthlyPayments.filter(
      (p) =>
        p.customerId === selectedCustomer.id ||
        (p.boxNo && p.boxNo.toLowerCase() === selectedCustomer.boxNo.toLowerCase()) ||
        (p.customerName && p.customerName.toLowerCase() === selectedCustomer.name.toLowerCase())
    );
  }, [monthlyPayments, selectedCustomer]);

  // Lifetime financial summary calculations
  const regTotal = selectedCustomer?.totalAmount || 0;
  const regPaid = selectedCustomer?.paidAmount || 0;
  const regBalance = selectedCustomer?.balanceAmount || 0;

  const monthlyBilledTotal = customerMonthlyBills.reduce((acc, p) => acc + (p.monthlyFee || 0), 0);
  const monthlyPaidTotal = customerMonthlyBills.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const monthlyBalanceTotal = customerMonthlyBills.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);

  const lifetimeBilled = regTotal + monthlyBilledTotal;
  const lifetimePaid = regPaid + monthlyPaidTotal;
  const lifetimeOutstanding = regBalance + monthlyBalanceTotal;

  // Build unified itemized ledger
  const unifiedLedgerItems = useMemo(() => {
    const items: {
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
      rawObject: any;
    }[] = [];

    if (selectedCustomer) {
      items.push({
        id: `reg-${selectedCustomer.id}`,
        itemType: 'REGISTRATION',
        title: 'Customer Registration & Box Setup Fee',
        periodOrDate: selectedCustomer.createdAt ? selectedCustomer.createdAt.split('T')[0] : 'Initial Registration',
        rawDate: selectedCustomer.createdAt || new Date().toISOString(),
        boxNo: selectedCustomer.boxNo,
        totalOrFee: selectedCustomer.totalAmount,
        paidAmount: selectedCustomer.paidAmount,
        balanceAmount: selectedCustomer.balanceAmount,
        status:
          selectedCustomer.balanceAmount === 0
            ? 'PAID'
            : selectedCustomer.paidAmount > 0
            ? 'PARTIAL'
            : 'UNPAID',
        rawObject: selectedCustomer,
      });
    }

    customerMonthlyBills.forEach((p) => {
      items.push({
        id: `pmt-${p.id}`,
        itemType: 'MONTHLY',
        title: `Monthly Subscription Fee (${p.month})`,
        periodOrDate: p.month,
        rawDate: p.paymentDate || p.createdAt || new Date().toISOString(),
        boxNo: p.boxNo,
        totalOrFee: p.monthlyFee,
        paidAmount: p.paidAmount,
        balanceAmount: p.balanceAmount,
        status: p.status,
        rawObject: p,
      });
    });

    items.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
    return items;
  }, [selectedCustomer, customerMonthlyBills]);

  const filteredLedgerItems = useMemo(() => {
    return unifiedLedgerItems.filter((item) => {
      if (activeFilterTab === 'REGISTRATION') return item.itemType === 'REGISTRATION';
      if (activeFilterTab === 'MONTHLY') return item.itemType === 'MONTHLY';
      if (activeFilterTab === 'UNPAID') return item.balanceAmount > 0;
      return true;
    });
  }, [unifiedLedgerItems, activeFilterTab]);

  // Print item receipt
  const handlePrintItem = (item: (typeof unifiedLedgerItems)[0]) => {
    if (!selectedCustomer) return;
    if (item.itemType === 'REGISTRATION') {
      setActiveBillData({
        type: 'CUSTOMER',
        billNo: `CUST-${selectedCustomer.boxNo}-${todayStr.replace(/-/g, '')}`,
        date: selectedCustomer.createdAt ? selectedCustomer.createdAt.split('T')[0] : todayStr,
        customerName: selectedCustomer.name,
        nicNo: selectedCustomer.nicNo,
        phoneNo: selectedCustomer.phoneNo,
        address: selectedCustomer.address,
        boxNo: selectedCustomer.boxNo,
        totalOrFeeAmount: selectedCustomer.totalAmount,
        paidAmount: selectedCustomer.paidAmount,
        balanceAmount: selectedCustomer.balanceAmount,
        status: selectedCustomer.balanceAmount === 0 ? 'PAID' : 'PARTIAL',
        paymentDate: selectedCustomer.createdAt ? selectedCustomer.createdAt.split('T')[0] : todayStr,
      });
    } else {
      const p = item.rawObject as MonthlyPayment;
      setActiveBillData({
        type: 'MONTHLY',
        billNo: `BILL-${p.boxNo}-${p.month.replace('-', '')}`,
        date: p.paymentDate ? p.paymentDate.split('T')[0] : todayStr,
        customerName: selectedCustomer.name,
        nicNo: selectedCustomer.nicNo,
        phoneNo: selectedCustomer.phoneNo,
        address: selectedCustomer.address,
        boxNo: p.boxNo,
        month: p.month,
        totalOrFeeAmount: p.monthlyFee,
        paidAmount: p.paidAmount,
        balanceAmount: p.balanceAmount,
        status: p.status,
        paymentDate: p.paymentDate ? p.paymentDate.split('T')[0] : todayStr,
      });
    }
    setIsBillModalOpen(true);
  };

  // Print Complete Customer Statement (All lifetime items or dues only)
  const handlePrintFullStatement = (duesOnly = false) => {
    if (!selectedCustomer) return;

    let itemsToInclude = [
      {
        description: 'Box Connection & Setup Fee',
        amount: regTotal,
        paidAmount: regPaid,
        balanceAmount: regBalance,
        dateOrPeriod: selectedCustomer.createdAt ? selectedCustomer.createdAt.split('T')[0] : todayStr,
      },
      ...customerMonthlyBills.map((p) => ({
        description: `Monthly Subscription (${p.month})`,
        amount: p.monthlyFee,
        paidAmount: p.paidAmount,
        balanceAmount: p.balanceAmount,
        dateOrPeriod: p.paymentDate || p.month,
      })),
    ];

    if (duesOnly) {
      itemsToInclude = itemsToInclude.filter((i) => i.balanceAmount > 0);
    }

    const totalAmt = itemsToInclude.reduce((sum, i) => sum + i.amount, 0);
    const paidAmt = itemsToInclude.reduce((sum, i) => sum + i.paidAmount, 0);
    const balAmt = itemsToInclude.reduce((sum, i) => sum + i.balanceAmount, 0);

    setActiveBillData({
      type: 'TOTAL',
      billNo: `STMT-${selectedCustomer.boxNo}-${todayStr.replace(/-/g, '')}`,
      date: todayStr,
      customerName: selectedCustomer.name,
      nicNo: selectedCustomer.nicNo,
      phoneNo: selectedCustomer.phoneNo,
      address: selectedCustomer.address,
      boxNo: selectedCustomer.boxNo,
      totalOrFeeAmount: totalAmt,
      paidAmount: paidAmt,
      balanceAmount: balAmt,
      status: balAmt === 0 ? 'PAID' : 'PARTIAL',
      paymentDate: todayStr,
      items: itemsToInclude,
    });
    setIsBillModalOpen(true);
  };

  // Pay single ledger item balance
  const handleConfirmPayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetItem || !selectedCustomer) return;
    const addPay = parseFloat(payAmount);
    if (isNaN(addPay) || addPay <= 0) {
      toast.error('Please enter a valid positive payment amount.');
      return;
    }

    setIsPaying(true);
    try {
      if (payTargetItem.itemType === 'REGISTRATION') {
        const newPaid = selectedCustomer.paidAmount + addPay;
        await api.updateCustomer(selectedCustomer.id, { paidAmount: newPaid });
      } else {
        const p = payTargetItem.rawObject as MonthlyPayment;
        const newPaid = p.paidAmount + addPay;
        await api.updateMonthlyPayment(p.id, { paidAmount: newPaid, paymentDate: todayStr });
      }

      toast.success(`Payment of ${formatMoney(addPay, currency)} recorded successfully!`);
      setPayTargetItem(null);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Payment processing failed');
    } finally {
      setIsPaying(false);
    }
  };

  const currentPkg = selectedCustomer ? getCustomerPackage(selectedCustomer.id || selectedCustomer.boxNo) : null;

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. HEADER */}
      {/* ==================================================================== */}
      <div className="erp-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Subscriber Statement & Lifetime Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical bill audit, total lifetime collections, pending arrears reconciliation, and statement printing
          </p>
        </div>

        {selectedCustomer && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => handlePrintFullStatement(true)}
              disabled={lifetimeOutstanding === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Pending Dues Slip</span>
            </button>

            <button
              onClick={() => handlePrintFullStatement(false)}
              className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Complete Statement</span>
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. MAIN LAYOUT: LEFT SUBSCRIBER PICKER + RIGHT LEDGER & METRICS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Customer Directory Quick Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="erp-card p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/[0.04] pb-2">
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Select Subscriber ({customers.length})</span>
            </span>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, box #, phone..."
                className="erp-input pl-9 text-xs"
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredCustomerList.map((c) => {
                const isSelected = c.id === selectedCustomer?.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCust(c.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-500/15 border-blue-600 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs truncate">{c.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          #{c.boxNo}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{c.phoneNo}</span>
                    </div>

                    <span
                      className={`badge-status text-[9px] shrink-0 ${
                        c.balanceAmount > 0 ? 'badge-danger' : 'badge-success'
                      }`}
                    >
                      {c.balanceAmount > 0 ? formatMoney(c.balanceAmount, currency) : 'Settled'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detailed Customer Profile & Lifetime Ledger (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedCustomer ? (
            <>
              {/* Profile Card */}
              <div className="erp-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.04] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-base flex items-center justify-center uppercase shadow-sm">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">
                          {selectedCustomer.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md font-mono font-black text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25">
                          Box #{selectedCustomer.boxNo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedCustomer.address || 'No registered address'}</p>
                    </div>
                  </div>

                  <span
                    className={`badge-status self-start sm:self-auto ${
                      selectedCustomer.status === 'ACTIVE' || !selectedCustomer.status
                        ? 'badge-success'
                        : 'badge-warning'
                    }`}
                  >
                    {selectedCustomer.status || 'ACTIVE'}
                  </span>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">NIC Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedCustomer.nicNo || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone Contact</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedCustomer.phoneNo || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">TV Package</span>
                    <span className="font-bold text-teal-700 dark:text-teal-400">
                      {currentPkg?.packageName || 'Standard'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Registration Date</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedCustomer.createdAt ? selectedCustomer.createdAt.slice(0, 10) : '—'}
                    </span>
                  </div>
                </div>

                {/* Lifetime KPI Cards */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Billed Lifetime</span>
                    <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                      {formatMoney(lifetimeBilled, currency)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Total Collected</span>
                    <div className="text-sm sm:text-base font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatMoney(lifetimePaid, currency)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Current Outstanding</span>
                    <div className="text-sm sm:text-base font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
                      {formatMoney(lifetimeOutstanding, currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Ledger Table */}
              <div className="erp-card overflow-hidden space-y-3 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.04] pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Itemized Subscription & Fee History ({filteredLedgerItems.length})</span>
                  </h3>

                  <div className="flex items-center gap-1.5">
                    {(['ALL', 'MONTHLY', 'REGISTRATION', 'UNPAID'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveFilterTab(tab)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeFilterTab === tab
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="erp-table text-xs">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Period / Item</th>
                        <th className="text-right">Billed</th>
                        <th className="text-right">Paid</th>
                        <th className="text-right">Balance</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgerItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                            No ledger records found for this category.
                          </td>
                        </tr>
                      ) : (
                        filteredLedgerItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td>
                              <span
                                className={`badge-status text-[9px] ${
                                  item.itemType === 'REGISTRATION' ? 'badge-royal' : 'badge-teal'
                                }`}
                              >
                                {item.itemType}
                              </span>
                            </td>
                            <td>
                              <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                              <div className="text-[10px] text-slate-400 font-mono">{item.periodOrDate}</div>
                            </td>
                            <td className="text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {formatMoney(item.totalOrFee, currency)}
                            </td>
                            <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {formatMoney(item.paidAmount, currency)}
                            </td>
                            <td className="text-right font-mono font-bold">
                              <span
                                className={
                                  item.balanceAmount > 0
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                }
                              >
                                {formatMoney(item.balanceAmount, currency)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge-status text-[9px] ${
                                  item.status === 'PAID'
                                    ? 'badge-success'
                                    : item.status === 'PARTIAL'
                                    ? 'badge-warning'
                                    : 'badge-danger'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.balanceAmount > 0 && (
                                  <button
                                    onClick={() => {
                                      setPayTargetItem(item);
                                      setPayAmount(item.balanceAmount.toString());
                                    }}
                                    className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                                  >
                                    Pay
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePrintItem(item)}
                                  className="p-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15"
                                  title="Print Slip"
                                >
                                  <Printer className="w-3.5 h-3.5" />
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
            </>
          ) : (
            <div className="erp-card p-12 text-center text-slate-400 text-xs">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No Subscriber Selected</p>
              <p className="mt-1">Choose a subscriber from the directory on the left to inspect their lifetime ledger.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pay Item Balance Modal */}
      {payTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Collect Ledger Payment</span>
            </h3>
            <p className="text-xs text-slate-500">
              {payTargetItem.title} • Outstanding: {formatMoney(payTargetItem.balanceAmount, currency)}
            </p>

            <form onSubmit={handleConfirmPayBalance} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Payment Amount to Collect (LKR)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="erp-input font-mono font-black text-lg text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayTargetItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="btn-teal px-5 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {isPaying ? 'Recording...' : 'Confirm Payment'}
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
    </div>
  );
};
