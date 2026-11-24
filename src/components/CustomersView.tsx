import React, { useState, useMemo } from 'react';
import { Customer, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import { SuccessModal, SuccessData } from './SuccessModal.js';
import { ConfirmModal } from './ConfirmModal.js';
import { useToast } from './Toast.js';
import {
  getCablePackages,
  setCustomerPackage,
  getCustomerPackage,
  getPackageById,
} from '../utils/packageManager.js';
import {
  UserPlus,
  Users,
  Search,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Printer,
  History,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tv,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Banknote,
  Clock,
  UserCheck,
  UserX,
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  onViewHistory?: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  currency,
  onRefreshData,
  currentUser,
  onViewHistory,
}) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'>('ALL');
  const [packageFilter, setPackageFilter] = useState<string>('ALL');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAiFixing, setIsAiFixing] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Registration Form States
  const [name, setName] = useState('');
  const [nicNo, setNicNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [address, setAddress] = useState('');
  const [boxNo, setBoxNo] = useState('');
  const [totalAmount, setTotalAmount] = useState('9500');
  const [paidAmount, setPaidAmount] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'>('ACTIVE');

  // Cable TV Package States
  const cablePackages = useMemo(() => getCablePackages(), []);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('STANDARD');
  const [monthlyRental, setMonthlyRental] = useState<string>('1200');

  // Edit Modal States
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editNicNo, setEditNicNo] = useState('');
  const [editPhoneNo, setEditPhoneNo] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBoxNo, setEditBoxNo] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'>('ACTIVE');
  const [editPackageId, setEditPackageId] = useState<string>('STANDARD');

  // Pay Balance Modal States
  const [payBalanceCustomer, setPayBalanceCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Success & Print Modal States
  const [successModalData, setSuccessModalData] = useState<SuccessData | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

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

  const todayStr = new Date().toISOString().split('T')[0];

  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedPaid = parseFloat(paidAmount) || 0;
  const calculatedBalance = Math.max(0, parsedTotal - parsedPaid);

  const parsedEditTotal = parseFloat(editTotalAmount) || 0;
  const parsedEditPaid = parseFloat(editPaidAmount) || 0;
  const calculatedEditBalance = Math.max(0, parsedEditTotal - parsedEditPaid);

  // Quick Stats
  const totalSubscribers = customers.length;
  const activeCount = customers.filter((c) => !c.status || c.status === 'ACTIVE').length;
  const inactiveCount = totalSubscribers - activeCount;
  const totalRegBalanceDues = customers.reduce((sum, c) => sum + (c.balanceAmount || 0), 0);
  const totalRegPaidAmount = customers.reduce((sum, c) => sum + (c.paidAmount || 0), 0);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const list = customers.filter((c) => {
      if (statusFilter !== 'ALL' && (c.status || 'ACTIVE') !== statusFilter) return false;
      const custPkg = getCustomerPackage(c.id || c.boxNo);
      if (packageFilter !== 'ALL' && custPkg.packageId !== packageFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.boxNo.toLowerCase().includes(q) ||
        c.phoneNo.toLowerCase().includes(q) ||
        c.nicNo.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        custPkg.packageName.toLowerCase().includes(q)
      );
    });

    // Sort: Customers with balance dues (due > 0) on TOP, paid customers (balance === 0) at the BOTTOM
    return list.sort((a, b) => {
      const aDue = (a.balanceAmount || 0) > 0 ? 1 : 0;
      const bDue = (b.balanceAmount || 0) > 0 ? 1 : 0;

      // Unpaid / with dues first
      if (bDue !== aDue) {
        return bDue - aDue;
      }

      // If both have dues, higher due balance first
      if (aDue === 1 && bDue === 1) {
        const diff = (b.balanceAmount || 0) - (a.balanceAmount || 0);
        if (diff !== 0) return diff;
      }

      // Fallback: newest / stable sort
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [customers, statusFilter, packageFilter, searchQuery]);

  // Paginated customers
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Print Bill handler
  const handlePrintCustomerBill = (cust: Customer) => {
    const custPkg = getCustomerPackage(cust.id || cust.boxNo);
    setActiveBillData({
      type: 'CUSTOMER',
      billNo: `CUST-${cust.boxNo}-${todayStr.replace(/-/g, '')}`,
      date: cust.createdAt ? cust.createdAt.split('T')[0] : todayStr,
      customerName: cust.name,
      nicNo: cust.nicNo,
      phoneNo: cust.phoneNo,
      address: cust.address,
      boxNo: cust.boxNo,
      packageName: custPkg.packageName,
      totalOrFeeAmount: cust.totalAmount,
      paidAmount: cust.paidAmount,
      balanceAmount: cust.balanceAmount,
      status: cust.balanceAmount === 0 ? 'PAID' : 'PARTIAL',
      paymentDate: cust.createdAt ? cust.createdAt.split('T')[0] : todayStr,
    });
    setIsBillModalOpen(true);
  };

  // Pay Balance submit
  const handleConfirmPayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBalanceCustomer) return;
    const addPay = parseFloat(payAmount);
    if (isNaN(addPay) || addPay <= 0) {
      toast.error('Please enter a valid positive payment amount.');
      return;
    }

    setIsPaying(true);
    try {
      const newPaidAmount = payBalanceCustomer.paidAmount + addPay;
      await api.updateCustomer(payBalanceCustomer.id, {
        paidAmount: newPaidAmount,
      });

      // Dispatch automated SMS receipt if customer has phone
      if (payBalanceCustomer.phoneNo && payBalanceCustomer.phoneNo.trim() !== '' && addPay > 0) {
        const remainingBal = Math.max(0, payBalanceCustomer.totalAmount - newPaidAmount);
        api
          .sendPaymentSms({
            customerName: payBalanceCustomer.name,
            phoneNo: payBalanceCustomer.phoneNo,
            boxNo: payBalanceCustomer.boxNo,
            paidAmount: addPay,
            balanceAmount: remainingBal,
            paymentDate: todayStr,
          })
          .then((smsRes) => {
            if (smsRes.success) {
              toast.success(`SMS receipt sent to ${payBalanceCustomer.phoneNo}`);
            }
          })
          .catch((err) => console.warn('SMS dispatch failed:', err));
      }

      setPayBalanceCustomer(null);
      toast.success(`Payment of ${formatMoney(addPay, currency)} recorded for "${payBalanceCustomer.name}"`);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process balance payment');
    } finally {
      setIsPaying(false);
    }
  };

  // Create Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim() || !nicNo.trim() || !phoneNo.trim() || !boxNo.trim()) {
      setErrorMsg('Name, NIC No, Phone No, and Box No are required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPkg = getPackageById(selectedPackageId);
      const createdCust = await api.createCustomer({
        name: name.trim(),
        nicNo: nicNo.trim(),
        phoneNo: phoneNo.trim(),
        address: address.trim(),
        boxNo: boxNo.trim(),
        totalAmount: parsedTotal,
        paidAmount: parsedPaid,
        status: status,
        packageId: selectedPackageId,
        packageName: selectedPkg.name,
        monthlyFee: selectedPkg.monthlyFee,
      });

      const fee = selectedPkg.monthlyFee ? Number(selectedPkg.monthlyFee) : 1200;
      await setCustomerPackage(
        { id: createdCust.id, boxNo: createdCust.boxNo },
        { packageId: selectedPackageId, packageName: selectedPkg.name, monthlyFee: fee }
      );

      // Reset form
      setName('');
      setNicNo('');
      setPhoneNo('');
      setAddress('');
      setBoxNo('');
      setTotalAmount('9500');
      setPaidAmount('');
      setStatus('ACTIVE');
      setShowRegistrationForm(false);

      setSuccessModalData({
        title: 'Subscriber Registered Successfully!',
        message: `Subscriber ${createdCust.name} (Box: #${createdCust.boxNo}) has been added to the database.`,
        details: {
          customerName: createdCust.name,
          nicNo: createdCust.nicNo,
          phoneNo: createdCust.phoneNo,
          boxNo: createdCust.boxNo,
          totalAmount: createdCust.totalAmount,
          paidAmount: createdCust.paidAmount,
          balanceAmount: createdCust.balanceAmount,
          status: createdCust.status,
        },
        onPrintBill: () => handlePrintCustomerBill(createdCust),
        onViewHistory: onViewHistory ? () => onViewHistory(createdCust.id) : undefined,
      });
      setIsSuccessModalOpen(true);
      toast.success(`Customer "${createdCust.name}" registered successfully!`);

      // Welcome SMS
      if (createdCust.phoneNo && createdCust.phoneNo.trim() !== '') {
        api
          .sendRegistrationSms({
            customerName: createdCust.name,
            phoneNo: createdCust.phoneNo,
            boxNo: createdCust.boxNo,
            totalAmount: createdCust.totalAmount,
            paidAmount: createdCust.paidAmount,
            balanceAmount: createdCust.balanceAmount,
            registrationDate: todayStr,
          })
          .catch((err) => console.warn('Registration SMS dispatch failed:', err));
      }

      onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register customer');
      toast.error(err.message || 'Failed to register customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name);
    setEditNicNo(cust.nicNo);
    setEditPhoneNo(cust.phoneNo);
    setEditAddress(cust.address);
    setEditBoxNo(cust.boxNo);
    setEditTotalAmount(cust.totalAmount.toString());
    setEditPaidAmount(cust.paidAmount.toString());
    setEditStatus(cust.status || 'ACTIVE');

    const currentPkg = getCustomerPackage(cust.id || cust.boxNo);
    setEditPackageId(currentPkg.packageId);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim() || !editNicNo.trim() || !editPhoneNo.trim() || !editBoxNo.trim()) return;

    try {
      const editPkg = getPackageById(editPackageId);
      await api.updateCustomer(editingCustomer.id, {
        name: editName.trim(),
        nicNo: editNicNo.trim(),
        phoneNo: editPhoneNo.trim(),
        address: editAddress.trim(),
        boxNo: editBoxNo.trim(),
        totalAmount: parsedEditTotal,
        paidAmount: parsedEditPaid,
        status: editStatus,
        packageId: editPackageId,
        packageName: editPkg.name,
        monthlyFee: editPkg.monthlyFee,
      });

      const editFee = editPkg.monthlyFee ? Number(editPkg.monthlyFee) : 1200;
      await setCustomerPackage(
        { id: editingCustomer.id, boxNo: editBoxNo.trim() || editingCustomer.boxNo },
        { packageId: editPackageId, packageName: editPkg.name, monthlyFee: editFee }
      );

      toast.success(`Subscriber "${editName.trim()}" updated successfully!`);
      setEditingCustomer(null);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer');
    }
  };

  // Delete Customer
  const handleDelete = (id: string, name: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Subscriber Account',
      message: `Are you sure you want to delete customer "${name}"? This action permanently removes subscriber details and records.`,
      confirmText: 'Delete Account',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteCustomer(id);
          toast.success(`Customer "${name}" deleted.`);
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete customer');
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
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Subscriber Directory & Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage cable TV subscribers, box assignments, package tiers, and registration balances
          </p>
        </div>

        <button
          onClick={() => setShowRegistrationForm((prev) => !prev)}
          className="btn-primary px-4 py-2 text-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>{showRegistrationForm ? 'Close Form' : '+ New Subscriber'}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1A. MOBILE VIEW: SINGLE CONSOLIDATED COMPACT KPI CARD (sm:hidden) */}
      {/* ==================================================================== */}
      <div className="erp-card p-3 sm:hidden shadow-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Subscribers Overview</span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {totalSubscribers} Total
          </span>
        </div>

        {/* Row 1: Accounts (3 mini-tiles) */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
              Total
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">
              {totalSubscribers}
            </div>
            <span className="text-[9px] text-slate-400 block truncate">Boxes</span>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 text-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block truncate">
              Active
            </span>
            <div className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
              {activeCount}
            </div>
            <span className="text-[9px] font-semibold text-emerald-600/90 dark:text-emerald-400/90 block truncate">
              Live
            </span>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200/60 dark:border-amber-500/20 text-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
              Inactive
            </span>
            <div className="text-base font-black text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
              {inactiveCount}
            </div>
            <span className="text-[9px] font-semibold text-amber-600/90 dark:text-amber-400/90 block truncate">
              Off
            </span>
          </div>
        </div>

        {/* Row 2: Registration Fees (Paid Amount vs Balance Dues) */}
        <div className="border-t border-slate-100 dark:border-white/[0.04] pt-2">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Paid Amount */}
            <div className="bg-teal-50/50 dark:bg-teal-500/10 p-2 rounded-xl border border-teal-200/60 dark:border-teal-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block truncate">
                  Paid Amount
                </span>
                <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-xs font-black font-mono text-teal-700 dark:text-teal-400 mt-0.5 truncate">
                {formatMoney(totalRegPaidAmount, currency)}
              </div>
              <span className="text-[9px] text-teal-600/80 dark:text-teal-400/80 block truncate">
                Collected Setup
              </span>
            </div>

            {/* Reg Balance Dues */}
            <div className="bg-rose-50/50 dark:bg-rose-500/10 p-2 rounded-xl border border-rose-200/60 dark:border-rose-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block truncate">
                  Balance Dues
                </span>
                <Banknote className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-xs font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5 truncate">
                {formatMoney(totalRegBalanceDues, currency)}
              </div>
              <span className="text-[9px] text-rose-600/80 dark:text-rose-400/80 block truncate">
                Pending Reg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1B. DESKTOP/TABLET VIEW: EXPANSIVE 5-CARD GRID (hidden sm:grid) */}
      {/* ==================================================================== */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Subscribers</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalSubscribers}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active Accounts</span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{activeCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Inactive Accounts</span>
            <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{inactiveCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <UserX className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Paid Amount</span>
            <div className="text-lg font-black font-mono text-teal-700 dark:text-teal-400 mt-0.5">
              {formatMoney(totalRegPaidAmount, currency)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Reg. Balance Dues</span>
            <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
              {formatMoney(totalRegBalanceDues, currency)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center">
            <Banknote className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. REGISTRATION FORM (COLLAPSIBLE) */}
      {/* ==================================================================== */}
      {showRegistrationForm && (
        <div className="erp-card p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-900/60 border-blue-500/30 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Register New Cable TV Subscriber</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Assign Set-Top Box, Package Tier, and setup fee balance
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRegistrationForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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

          <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Customer Name *</label>
                  {name.trim() && (
                    <button
                      type="button"
                      disabled={isAiFixing}
                      onClick={async () => {
                        setIsAiFixing(true);
                        const fixed = await api.fixSpelling(name);
                        if (fixed) setName(fixed);
                        setIsAiFixing(false);
                      }}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isAiFixing ? 'Checking...' : 'AI Polish'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. K. Vimalanathan"
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">NIC Number *</label>
                <input
                  type="text"
                  required
                  value={nicNo}
                  onChange={(e) => setNicNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 198523456789 or 852345678V"
                  className="erp-input font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="erp-input font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Box Number *</label>
                <input
                  type="text"
                  required
                  value={boxNo}
                  onChange={(e) => setBoxNo(e.target.value)}
                  placeholder="e.g. 001, 104"
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">TV Package *</label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => {
                    setSelectedPackageId(e.target.value);
                    const pkg = getPackageById(e.target.value);
                    setMonthlyRental(pkg.monthlyFee.toString());
                  }}
                  className="erp-input font-medium"
                >
                  {cablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — {formatMoney(pkg.monthlyFee, currency)}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="erp-input font-medium"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="DISCONNECTED">DISCONNECTED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subscriber Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. No. 45, Station Road, Nanu Oya"
                className="erp-input"
              />
            </div>

            {/* Financial breakdown for registration */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Setup Fee (LKR) *
                </label>
                <input
                  type="number"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="erp-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paid Amount (LKR)
                </label>
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
                  Calculated Balance Due
                </label>
                <div className="h-10 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center font-mono font-black text-rose-700 dark:text-rose-400">
                  {formatMoney(calculatedBalance, currency)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRegistrationForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Save & Register Subscriber'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. ADVANCED SEARCH & MULTI-FILTER BAR */}
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
            placeholder="Search by customer name, box #, phone, NIC, address..."
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

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          {(['ALL', 'ACTIVE', 'INACTIVE', 'DISCONNECTED'] as const).map((st) => (
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

          {/* Package filter */}
          <select
            value={packageFilter}
            onChange={(e) => {
              setPackageFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="erp-input py-1 text-xs w-auto font-semibold ml-1"
          >
            <option value="ALL">All Packages</option>
            {cablePackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. PROFESSIONAL DATA TABLE & MOBILE CARDS WITH PAGINATION */}
      {/* ==================================================================== */}
      <div className="erp-card overflow-hidden">
        {/* Desktop View: Table (hidden on mobile, visible on md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Box #</th>
                <th>Subscriber Info</th>
                <th>Phone / NIC</th>
                <th>Package Tier</th>
                <th className="text-right">Total Setup</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance Due</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold">No subscribers match the current filters.</p>
                    <p className="text-[11px] mt-1 text-slate-400">Try adjusting your search terms or filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const custPkg = getCustomerPackage(cust.id || cust.boxNo);
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Box # */}
                      <td>
                        <span className="font-mono font-black text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25">
                          #{cust.boxNo}
                        </span>
                      </td>

                      {/* Name & Address */}
                      <td>
                        <div className="min-w-[140px]">
                          <button
                            onClick={() => onViewHistory && onViewHistory(cust.id)}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                          >
                            {cust.name}
                          </button>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{cust.address || '—'}</p>
                        </div>
                      </td>

                      {/* Phone / NIC */}
                      <td>
                        <div className="font-mono text-[11px]">
                          <div className="font-semibold text-slate-700 dark:text-slate-200">{cust.phoneNo}</div>
                          <div className="text-slate-400 text-[10px]">{cust.nicNo}</div>
                        </div>
                      </td>

                      {/* Package */}
                      <td>
                        <span className="badge-status badge-teal font-medium">
                          {custPkg.packageName}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(cust.totalAmount, currency)}
                      </td>

                      {/* Paid */}
                      <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatMoney(cust.paidAmount, currency)}
                      </td>

                      {/* Balance */}
                      <td className="text-right font-mono font-bold">
                        <span
                          className={
                            cust.balanceAmount > 0
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }
                        >
                          {formatMoney(cust.balanceAmount, currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge-status ${
                            cust.status === 'ACTIVE' || !cust.status
                              ? 'badge-success'
                              : cust.status === 'INACTIVE'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {cust.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Pay Balance */}
                          {cust.balanceAmount > 0 && (
                            <button
                              onClick={() => {
                                setPayBalanceCustomer(cust);
                                setPayAmount(cust.balanceAmount.toString());
                              }}
                              className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15"
                              title="Collect Balance Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Receipt */}
                          <button
                            onClick={() => handlePrintCustomerBill(cust)}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15"
                            title="Print Customer Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View History */}
                          {onViewHistory && (
                            <button
                              onClick={() => onViewHistory(cust.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Subscriber Statement & History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Subscriber"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Admin only) */}
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDelete(cust.id, cust.name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/15"
                              title="Delete Subscriber"
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

        {/* Mobile View: Subscriber Cards List (visible on mobile < md, hidden on md+) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold">No subscribers match the current filters.</p>
              <p className="text-[11px] mt-1 text-slate-400">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            paginatedCustomers.map((cust) => {
              const custPkg = getCustomerPackage(cust.id || cust.boxNo);
              return (
                <div key={cust.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                  {/* Card Header: Box #, Name, and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25 shrink-0">
                          #{cust.boxNo}
                        </span>
                        <button
                          onClick={() => onViewHistory && onViewHistory(cust.id)}
                          className="font-bold text-slate-900 dark:text-white text-sm truncate text-left hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {cust.name}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{cust.address || '—'}</p>
                    </div>
                    <span
                      className={`badge-status shrink-0 text-[10px] ${
                        cust.status === 'ACTIVE' || !cust.status
                          ? 'badge-success'
                          : cust.status === 'INACTIVE'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {cust.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Card Meta: Phone with direct call & Package */}
                  <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <a
                      href={`tel:${cust.phoneNo}`}
                      className="flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{cust.phoneNo}</span>
                    </a>
                    <span className="badge-status badge-teal font-medium text-[10px]">
                      {custPkg.packageName}
                    </span>
                  </div>

                  {/* Financial Status Strip */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Total</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        {formatMoney(cust.totalAmount, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Paid</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {formatMoney(cust.paidAmount, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Balance</span>
                      <span
                        className={`font-black text-xs ${
                          cust.balanceAmount > 0
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {formatMoney(cust.balanceAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {cust.balanceAmount > 0 && (
                        <button
                          onClick={() => {
                            setPayBalanceCustomer(cust);
                            setPayAmount(cust.balanceAmount.toString());
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>
                      )}
                      <button
                        onClick={() => handlePrintCustomerBill(cust)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {onViewHistory && (
                        <button
                          onClick={() => onViewHistory(cust.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="View Statement History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Edit Subscriber"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(cust.id, cust.name)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Subscriber"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
              {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>
            <span>to</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {Math.min(currentPage * pageSize, filteredCustomers.length)}
            </span>
            <span>of</span>
            <span className="font-bold text-slate-900 dark:text-white">{filteredCustomers.length}</span>
            <span>subscribers</span>

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
      {/* 5. MODALS (EDIT, PAY BALANCE, CONFIRM, SUCCESS, PRINT) */}
      {/* ==================================================================== */}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Edit Subscriber Details</span>
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Box #</label>
                  <input
                    type="text"
                    required
                    value={editBoxNo}
                    onChange={(e) => setEditBoxNo(e.target.value)}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="text"
                    required
                    value={editPhoneNo}
                    onChange={(e) => setEditPhoneNo(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">NIC</label>
                  <input
                    type="text"
                    required
                    value={editNicNo}
                    onChange={(e) => setEditNicNo(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Package</label>
                  <select
                    value={editPackageId}
                    onChange={(e) => setEditPackageId(e.target.value)}
                    className="erp-input"
                  >
                    {cablePackages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatMoney(p.monthlyFee, currency)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="erp-input font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="DISCONNECTED">DISCONNECTED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <label className="font-semibold block mb-1 text-slate-600">Total Fee</label>
                  <input
                    type="number"
                    value={editTotalAmount}
                    onChange={(e) => setEditTotalAmount(e.target.value)}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-600">Paid</label>
                  <input
                    type="number"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(e.target.value)}
                    className="erp-input font-mono text-emerald-700"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-600">Balance</label>
                  <div className="h-9 px-2.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 flex items-center font-mono font-bold text-rose-700">
                    {formatMoney(calculatedEditBalance, currency)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-xs font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Balance Modal */}
      {payBalanceCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Collect Registration Balance</span>
              </h3>
              <button
                onClick={() => setPayBalanceCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{payBalanceCustomer.name}</span>
                <span className="badge-status badge-royal font-mono">Box #{payBalanceCustomer.boxNo}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>Outstanding Balance:</span>
                <span className="font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                  {formatMoney(payBalanceCustomer.balanceAmount, currency)}
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
                  onClick={() => setPayBalanceCustomer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="btn-teal px-5 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {isPaying ? 'Recording...' : 'Confirm Payment & Print'}
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

      {/* Confirm Delete Modal */}
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
