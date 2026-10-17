import React, { useState, useEffect } from 'react';
import { Customer, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import { SuccessModal, SuccessData } from './SuccessModal.js';
import { ConfirmModal } from './ConfirmModal.js';
import { useToast } from './Toast.js';
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
  Box,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Printer,
  History,
  ShieldCheck,
  ChevronDown,
  ChevronUp
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
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiFixing, setIsAiFixing] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(true);

  // Registration Form States
  const [name, setName] = useState('');
  const [nicNo, setNicNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [address, setAddress] = useState('');
  const [boxNo, setBoxNo] = useState('');
  const [totalAmount, setTotalAmount] = useState('9500');
  const [paidAmount, setPaidAmount] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'>('ACTIVE');

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'>('ALL');

  // Fixed Date (cannot be changed)
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculated Balance
  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedPaid = parseFloat(paidAmount) || 0;
  const calculatedBalance = Math.max(0, parsedTotal - parsedPaid);

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

  const parsedEditTotal = parseFloat(editTotalAmount) || 0;
  const parsedEditPaid = parseFloat(editPaidAmount) || 0;
  const calculatedEditBalance = Math.max(0, parsedEditTotal - parsedEditPaid);

  // Pay Balance Modal States
  const [payBalanceCustomer, setPayBalanceCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Bill Printing Modal States
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const handlePrintCustomerBill = (cust: Customer) => {
    setActiveBillData({
      type: 'CUSTOMER',
      billNo: `CUST-${cust.boxNo}-${todayStr.replace(/-/g, '')}`,
      date: cust.createdAt ? cust.createdAt.split('T')[0] : todayStr,
      customerName: cust.name,
      nicNo: cust.nicNo,
      phoneNo: cust.phoneNo,
      address: cust.address,
      boxNo: cust.boxNo,
      totalOrFeeAmount: cust.totalAmount,
      paidAmount: cust.paidAmount,
      balanceAmount: cust.balanceAmount,
      status: cust.balanceAmount === 0 ? 'PAID' : 'PARTIAL',
      paymentDate: cust.createdAt ? cust.createdAt.split('T')[0] : todayStr,
    });
    setIsBillModalOpen(true);
  };

  const handleOpenPayBalance = (cust: Customer) => {
    setPayBalanceCustomer(cust);
    setPayAmount(cust.balanceAmount.toString());
  };

  const handleConfirmPayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBalanceCustomer) return;
    const addPay = parseFloat(payAmount);
    if (isNaN(addPay) || addPay <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    setIsPaying(true);
    try {
      const newPaidAmount = payBalanceCustomer.paidAmount + addPay;
      await api.updateCustomer(payBalanceCustomer.id, {
        paidAmount: newPaidAmount,
      });

      // Dispatch automated SMS receipt if customer has phone number
      if (payBalanceCustomer.phoneNo && payBalanceCustomer.phoneNo.trim() !== '' && addPay > 0) {
        const remainingBal = Math.max(0, payBalanceCustomer.totalAmount - newPaidAmount);
        api.sendPaymentSms({
          customerName: payBalanceCustomer.name,
          phoneNo: payBalanceCustomer.phoneNo,
          boxNo: payBalanceCustomer.boxNo,
          paidAmount: addPay,
          balanceAmount: remainingBal,
          paymentDate: todayStr,
        }).then((smsRes) => {
          if (smsRes.success) {
            toast.success(`SMS receipt sent to ${payBalanceCustomer.phoneNo}`);
          }
        }).catch((err) => {
          console.warn('Automated SMS receipt dispatch failed:', err);
        });
      }

      setPayBalanceCustomer(null);
      toast.success(`Payment of ${formatMoney(addPay, currency)} recorded for "${payBalanceCustomer.name}"`);
      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to process balance payment';
      toast.error(msg);
    } finally {
      setIsPaying(false);
    }
  };

  // Success Screen Modal States
  const [successModalData, setSuccessModalData] = useState<SuccessData | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Handle Customer Registration Submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim() || !nicNo.trim() || !phoneNo.trim() || !boxNo.trim()) {
      setErrorMsg('Name, NIC No, Phone No, and Box No are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdCust = await api.createCustomer({
        name: name.trim(),
        nicNo: nicNo.trim(),
        phoneNo: phoneNo.trim(),
        address: address.trim(),
        boxNo: boxNo.trim(),
        totalAmount: parsedTotal,
        paidAmount: parsedPaid,
        status: status,
      });

      // Clear Form
      setName('');
      setNicNo('');
      setPhoneNo('');
      setAddress('');
      setBoxNo('');
      setTotalAmount('');
      setPaidAmount('');
      setStatus('ACTIVE');

      // Trigger Success Screen Modal
      setSuccessModalData({
        title: 'Customer Registered Successfully!',
        message: `Subscriber ${createdCust.name} (Box: ${createdCust.boxNo}) has been added to the database.`,
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

      // Dispatch automated Customer Registration Welcome SMS
      if (createdCust.phoneNo && createdCust.phoneNo.trim() !== '') {
        api.sendRegistrationSms({
          customerName: createdCust.name,
          phoneNo: createdCust.phoneNo,
          boxNo: createdCust.boxNo,
          totalAmount: createdCust.totalAmount,
          paidAmount: createdCust.paidAmount,
          balanceAmount: createdCust.balanceAmount,
          registrationDate: todayStr,
        }).then((smsRes) => {
          if (smsRes.success) {
            toast.success(`Registration SMS sent to ${createdCust.phoneNo}`);
          }
        }).catch((err) => {
          console.warn('Automated registration SMS dispatch failed:', err);
        });
      }

      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to register customer';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
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
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim() || !editNicNo.trim() || !editPhoneNo.trim() || !editBoxNo.trim()) return;

    try {
      await api.updateCustomer(editingCustomer.id, {
        name: editName.trim(),
        nicNo: editNicNo.trim(),
        phoneNo: editPhoneNo.trim(),
        address: editAddress.trim(),
        boxNo: editBoxNo.trim(),
        totalAmount: parsedEditTotal,
        paidAmount: parsedEditPaid,
        status: editStatus,
      });

      toast.success(`Customer "${editName.trim()}" updated successfully!`);
      setEditingCustomer(null);
      onRefreshData();
    } catch (err: any) {
      const msg = err.message || 'Failed to update customer details';
      toast.error(msg);
    }
  };

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

  // Delete Customer
  const handleDelete = (id: string, name: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Customer Account',
      message: `Are you sure you want to delete customer "${name}"? This action cannot be undone and will remove subscriber records.`,
      confirmText: 'Delete Customer',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteCustomer(id);
          toast.success(`Customer "${name}" deleted successfully!`);
          onRefreshData();
        } catch (err: any) {
          const msg = err.message || 'Failed to delete customer';
          toast.error(msg);
        }
      },
    });
  };

  // Filtered customers
  const filteredCustomers = customers.filter((c) => {
    // Status Filter
    if (statusFilter !== 'ALL' && c.status !== statusFilter) {
      return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.nicNo.toLowerCase().includes(q) ||
      c.phoneNo.toLowerCase().includes(q) ||
      c.boxNo.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-[1700px] w-full px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            <span>Customer Registration & Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5 sm:mt-1">
            Register new cable subscribers, track total/paid amounts, balance dues, and box numbers stored in MongoDB.
          </p>
        </div>

        {/* Form Visibility Toggle */}
        <button
          type="button"
          onClick={() => setShowRegistrationForm(!showRegistrationForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer bg-neutral-900 border-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-700 shadow-xs self-start sm:self-auto shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span>{showRegistrationForm ? 'Hide Form' : '+ Register New Customer'}</span>
          {showRegistrationForm ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
        </button>
      </div>

      {/* Main Grid: Registration Form (Left) & Customer Table (Right) */}
      <div className={`grid grid-cols-1 ${showRegistrationForm ? 'xl:grid-cols-12' : ''} gap-5 sm:gap-6`}>
        {/* 1. Customer Registration Form Card */}
        {showRegistrationForm && (
          <div className="xl:col-span-4 p-5 sm:p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5 h-fit shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Customer Registration</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  DB Connected
                </span>
                <button
                  type="button"
                  onClick={() => setShowRegistrationForm(false)}
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                  title="Collapse Registration Form"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
            {/* Customer Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-neutral-400 font-medium">Customer Name *</label>
                {name.trim() && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsAiFixing(true);
                      const fixed = await api.fixSpelling(name);
                      if (fixed) setName(fixed);
                      setIsAiFixing(false);
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAiFixing ? 'Checking...' : 'Fix AI ✨'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. K. Perera, A. Rahman"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* NIC No & Phone No */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">NIC No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 199012345678"
                  value={nicNo}
                  onChange={(e) => setNicNo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-neutral-500" />
                  <span>Phone No *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0771234567"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-neutral-500" />
                <span>Address</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 45 Main Street, Jaffna"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Box No & Customer Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1 flex items-center gap-1">
                  <Box className="w-3 h-3 text-neutral-500" />
                  <span>Box No *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOX-1042"
                  value={boxNo}
                  onChange={(e) => setBoxNo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono uppercase placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Customer Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="DISCONNECTED">Disconnected</option>
                </select>
              </div>
            </div>

            {/* Financials: Total Amount & Paid Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-neutral-500" />
                  <span>Total Amount</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Paid Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Calculated Balance Amount Badge */}
            <div className="p-3 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400 font-medium">Balance Amount Due:</span>
              <span className={`font-mono font-bold text-sm ${
                calculatedBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {formatMoney(calculatedBalance, currency)}
              </span>
            </div>

            {/* Registration Date (Read Only - Cannot be changed) */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-500" />
                <span>Registration Date (Fixed System Date)</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={todayStr}
                className="w-full px-3 py-2 bg-neutral-950/60 border border-neutral-850 rounded-md text-neutral-400 font-mono cursor-not-allowed select-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Customer'}</span>
            </button>
          </form>
        </div>
        )}

        {/* 2. Registered Customer Table Card */}
        <div className={`${showRegistrationForm ? 'xl:col-span-8' : 'w-full'} p-4 sm:p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white">Registered Customers ({customers.length})</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Live database records with edit and delete operations</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Filter */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, NIC, box..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 bg-neutral-950 p-1 border border-neutral-800 rounded-md">
                  {(['ALL', 'ACTIVE', 'INACTIVE', 'DISCONNECTED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
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

            {/* Mobile Cards View (block md:hidden) - Perfectly Aligned */}
            <div className="block md:hidden space-y-3">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 text-xs bg-neutral-950 rounded-xl border border-neutral-800">
                  No customer records found matching the criteria.
                </div>
              ) : (
                filteredCustomers.map((cust) => (
                  <div key={cust.id} className="p-4 space-y-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-md transition-all hover:border-emerald-500/40">
                    {/* Header: Name + Status Badge + Box No Pill */}
                    <div className="flex items-start justify-between gap-2 border-b border-neutral-800/80 pb-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="font-black text-xl sm:text-2xl text-white tracking-tight leading-tight">
                            {cust.name}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-extrabold rounded-full ${
                            (cust.status || 'ACTIVE') === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                              : (cust.status || 'ACTIVE') === 'INACTIVE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (cust.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`} />
                            {cust.status || 'ACTIVE'}
                          </span>
                        </div>

                        {/* Colorful Address Badge */}
                        {cust.address && (
                          <div className="flex items-start gap-1.5 text-xs text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1.5 rounded-xl shadow-xs">
                            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span className="font-semibold leading-tight">{cust.address}</span>
                          </div>
                        )}

                        {/* Colorful NIC & Phone Badges */}
                        <div className="flex items-center flex-wrap gap-2 text-xs font-mono pt-0.5">
                          {cust.nicNo && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold shadow-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>NIC: {cust.nicNo}</span>
                            </span>
                          )}
                          {cust.phoneNo && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold shadow-xs">
                              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Tel: {cust.phoneNo}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Box Number Pill */}
                      <div className="shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/40 rounded-xl text-xs font-mono font-black text-emerald-300 shadow-xs">
                          <Box className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Box: {cust.boxNo || '-'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Financial Metrics 3-Column Color Cards */}
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      {/* TOTAL TILE */}
                      <div className="p-2.5 bg-sky-500/10 border border-sky-500/25 rounded-xl text-center space-y-0.5 shadow-xs">
                        <span className="text-[10px] text-sky-400 font-sans block uppercase font-extrabold tracking-wide">Total</span>
                        <span className="text-white font-black text-xs sm:text-sm block">{formatMoney(cust.totalAmount, currency)}</span>
                      </div>

                      {/* PAID TILE */}
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-center space-y-0.5 shadow-xs">
                        <span className="text-[10px] text-emerald-400 font-sans block uppercase font-extrabold tracking-wide">Paid</span>
                        <span className="text-emerald-400 font-black text-xs sm:text-sm block">{formatMoney(cust.paidAmount, currency)}</span>
                      </div>

                      {/* BALANCE TILE */}
                      <div className={`p-2.5 rounded-xl text-center space-y-0.5 shadow-xs ${
                        cust.balanceAmount === 0
                          ? 'bg-emerald-500/10 border border-emerald-500/25'
                          : 'bg-amber-500/15 border border-amber-500/35'
                      }`}>
                        <span className={`text-[10px] font-sans block uppercase font-extrabold tracking-wide ${
                          cust.balanceAmount === 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>Balance</span>
                        <span className={`font-black text-xs sm:text-sm block ${
                          cust.balanceAmount === 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {formatMoney(cust.balanceAmount, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Perfectly Aligned Action Buttons Grid */}
                    <div className="flex flex-col gap-2 pt-1">
                      {/* Top Row Primary Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        {cust.balanceAmount > 0 ? (
                          <button
                            onClick={() => handleOpenPayBalance(cust)}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 btn-gradient-submit"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-white" />
                            <span>Pay Balance</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Fully Paid</span>
                          </div>
                        )}

                        {onViewHistory && (
                          <button
                            onClick={() => onViewHistory(cust.id)}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <History className="w-3.5 h-3.5 text-indigo-400" />
                            <span>History</span>
                          </button>
                        )}
                      </div>

                      {/* Bottom Row Secondary Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
                        <button
                          onClick={() => handlePrintCustomerBill(cust)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Print Bill</span>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-2 text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDelete(cust.id, cust.name)}
                              className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
                  <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono text-[11px]">
                    <tr>
                      <th className="px-2.5 sm:px-3 py-2.5">Customer</th>
                      <th className="px-2.5 sm:px-3 py-2.5">NIC & Phone</th>
                      <th className="px-2.5 sm:px-3 py-2.5">Box No</th>
                      <th className="px-2.5 sm:px-3 py-2.5 text-center">Status</th>
                      <th className="px-2.5 sm:px-3 py-2.5 text-right">Total</th>
                      <th className="px-2.5 sm:px-3 py-2.5 text-right">Paid</th>
                      <th className="px-2.5 sm:px-3 py-2.5 text-right">Balance</th>
                      <th className="px-2.5 sm:px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-10 text-center text-neutral-500">
                          No customer records found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <tr key={cust.id} className="hover:bg-neutral-900/60 transition-colors">
                          <td className="px-2.5 sm:px-3 py-2.5">
                            <p className="font-black text-sm text-white leading-snug">{cust.name}</p>
                            <p className="text-[11px] text-purple-300 truncate max-w-[140px] 2xl:max-w-[200px]" title={cust.address || 'No Address'}>
                              {cust.address || 'No Address'}
                            </p>
                          </td>
                          <td className="px-2.5 sm:px-3 py-2.5 font-mono whitespace-nowrap">
                            <p className="text-sky-300 font-bold text-xs">{cust.nicNo || '-'}</p>
                            <p className="text-emerald-300 font-bold text-[11px]">{cust.phoneNo || '-'}</p>
                          </td>
                          <td className="px-2.5 sm:px-3 py-2.5 font-mono whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/40 rounded-lg text-xs font-bold text-emerald-300 shadow-xs">
                              <Box className="w-3 h-3 text-emerald-400" />
                              <span>{cust.boxNo || '-'}</span>
                            </span>
                          </td>
                          <td className="px-2.5 sm:px-3 py-2.5 text-center font-mono whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                              (cust.status || 'ACTIVE') === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                                : (cust.status || 'ACTIVE') === 'INACTIVE'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                (cust.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                              }`} />
                              {cust.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-2.5 sm:px-3 py-2.5 text-right font-mono text-sky-200 font-bold whitespace-nowrap text-xs">
                            {formatMoney(cust.totalAmount, currency)}
                          </td>
                          <td className="px-2.5 sm:px-3 py-2.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap text-xs">
                            {formatMoney(cust.paidAmount, currency)}
                          </td>
                          <td className="px-2.5 sm:px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap text-xs">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-black inline-block ${
                              cust.balanceAmount === 0
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                            }`}>
                              {formatMoney(cust.balanceAmount, currency)}
                            </span>
                          </td>
                          <td className="px-2.5 sm:px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {cust.balanceAmount > 0 && (
                                <button
                                  onClick={() => handleOpenPayBalance(cust)}
                                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                                  title="Pay Balance"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay</span>
                                </button>
                              )}
                              {onViewHistory && (
                                <button
                                  onClick={() => onViewHistory(cust.id)}
                                  className="p-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 rounded transition-colors cursor-pointer shrink-0"
                                  title="View Customer Payment History"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handlePrintCustomerBill(cust)}
                                className="p-1.5 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded transition-colors cursor-pointer shrink-0"
                                title="Print Customer Receipt / Bill"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(cust)}
                                className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-900 rounded transition-colors cursor-pointer shrink-0"
                                title="Edit Customer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {currentUser?.role !== 'STAFF' && (
                                <button
                                  onClick={() => handleDelete(cust.id, cust.name)}
                                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded transition-colors cursor-pointer shrink-0"
                                  title="Delete Customer (Admin Only)"
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

          <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-400 gap-2">
            <span>Total Registered Customers: <strong className="text-white font-mono">{customers.length}</strong></span>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>Total Dues: <strong className="text-amber-400">{formatMoney(customers.reduce((sum, c) => sum + c.balanceAmount, 0), currency)}</strong></span>
              <span>Total Paid: <strong className="text-emerald-400">{formatMoney(customers.reduce((sum, c) => sum + c.paidAmount, 0), currency)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* EDIT CUSTOMER MODAL */}
      {/* ------------------------------------------------------------------- */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Edit Customer Details</span>
              </h2>
              <button onClick={() => setEditingCustomer(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">NIC No *</label>
                  <input
                    type="text"
                    required
                    value={editNicNo}
                    onChange={(e) => setEditNicNo(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Phone No *</label>
                  <input
                    type="text"
                    required
                    value={editPhoneNo}
                    onChange={(e) => setEditPhoneNo(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Box No *</label>
                  <input
                    type="text"
                    required
                    value={editBoxNo}
                    onChange={(e) => setEditBoxNo(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Customer Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-medium"
                  >
                    <option value="ACTIVE">ACTIVE (Connected)</option>
                    <option value="INACTIVE">INACTIVE (Suspended)</option>
                    <option value="DISCONNECTED">DISCONNECTED (Cut)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editTotalAmount}
                    onChange={(e) => setEditTotalAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Paid Amount</label>
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
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
      {payBalanceCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Pay Customer Balance</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {payBalanceCustomer.name} (Box: <span className="font-mono text-emerald-400">{payBalanceCustomer.boxNo}</span>)
                </p>
              </div>
              <button onClick={() => setPayBalanceCustomer(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayBalance} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Total Amount:</span>
                  <span className="font-mono text-white">{formatMoney(payBalanceCustomer.totalAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Already Paid:</span>
                  <span className="font-mono text-emerald-400">{formatMoney(payBalanceCustomer.paidAmount, currency)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-neutral-850 pt-1.5 text-amber-400">
                  <span>Current Balance Due:</span>
                  <span className="font-mono text-sm">{formatMoney(payBalanceCustomer.balanceAmount, currency)}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-400 font-medium">Payment Amount (LKR) *</label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(payBalanceCustomer.balanceAmount.toString())}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payBalanceCustomer.balanceAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-md text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayBalanceCustomer(null)}
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

      {/* Success Screen Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        data={successModalData}
        currency={currency}
      />

      {/* Confirmation Dialog Modal Card */}
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
