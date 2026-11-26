import React, { useState, useMemo, useEffect } from 'react';
import { Customer, SupportedCurrency, User } from '../types/finance.js';
import { api, formatMoney } from '../api/client.js';
import { getCablePackages, getPackageById, setCustomerPackage, getCustomerPackage } from '../utils/packageManager.js';
import { BillPrintModal, BillData } from './BillPrintModal.js';
import { SuccessModal, SuccessData } from './SuccessModal.js';
import { useToast } from './Toast.js';
import {
  UserPlus,
  X,
  Sparkles,
  AlertCircle,
  Tv,
  CheckCircle2,
  DollarSign,
  Phone,
  CreditCard,
  MapPin,
  Box,
} from 'lucide-react';

interface CustomerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: SupportedCurrency;
  onSuccess?: () => void;
  currentUser?: User | null;
  onViewHistory?: (customerId: string) => void;
}

export const CustomerRegistrationModal: React.FC<CustomerRegistrationModalProps> = ({
  isOpen,
  onClose,
  currency = 'LKR',
  onSuccess,
  onViewHistory,
}) => {
  const toast = useToast();

  // Form Fields
  const [name, setName] = useState('');
  const [nicNo, setNicNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [address, setAddress] = useState('');
  const [boxNo, setBoxNo] = useState('');
  const [totalAmount, setTotalAmount] = useState('10500');
  const [paidAmount, setPaidAmount] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'>('ACTIVE');

  // Package Selection
  const cablePackages = useMemo(() => getCablePackages(), []);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('STANDARD');
  const [monthlyRental, setMonthlyRental] = useState<string>('1200');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiFixing, setIsAiFixing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals inside
  const [successModalData, setSuccessModalData] = useState<SuccessData | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [activeBillData, setActiveBillData] = useState<BillData | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedPaid = parseFloat(paidAmount) || 0;
  const calculatedBalance = Math.max(0, parsedTotal - parsedPaid);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSuccessModalOpen && !isBillModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSuccessModalOpen, isBillModalOpen, onClose]);

  const resetForm = () => {
    setName('');
    setNicNo('');
    setPhoneNo('');
    setAddress('');
    setBoxNo('');
    setTotalAmount('10500');
    setPaidAmount('');
    setStatus('ACTIVE');
    setSelectedPackageId('STANDARD');
    setMonthlyRental('1200');
    setErrorMsg('');
  };

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
    });
    setIsBillModalOpen(true);
  };

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

      toast.success(`Subscriber "${createdCust.name}" registered successfully.`);

      // Open Success Modal
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

      resetForm();
      onClose();
      setIsSuccessModalOpen(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to register subscriber:', err);
      setErrorMsg(err.message || 'Failed to register subscriber. Ensure Box Number is unique.');
      toast.error(err.message || 'Failed to register subscriber.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-reg-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                  <UserPlus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2
                    id="customer-reg-title"
                    className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"
                  >
                    <span>Register New Cable TV Subscriber</span>
                    <span className="badge-status badge-royal text-[10px]">Customer Registration Form</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assign Set-Top Box, Package Tier, and setup fee balance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto custom-scrollbar">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form id="customer-registration-modal-form" onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
                {/* Row 1: Name, NIC, Phone */}
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
                            try {
                              const fixed = await api.fixSpelling(name);
                              if (fixed) setName(fixed);
                            } catch {
                              // ignore
                            } finally {
                              setIsAiFixing(false);
                            }
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
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
                      className="erp-input w-full"
                      autoFocus
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
                      className="erp-input w-full font-mono"
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
                      className="erp-input w-full font-mono"
                    />
                  </div>
                </div>

                {/* Row 2: Box No, TV Package, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Box Number *</label>
                    <input
                      type="text"
                      required
                      value={boxNo}
                      onChange={(e) => setBoxNo(e.target.value)}
                      placeholder="e.g. 001, 104"
                      className="erp-input w-full font-mono font-bold"
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
                      className="erp-input w-full font-medium"
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
                      className="erp-input w-full font-medium"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="DISCONNECTED">DISCONNECTED</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Address */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subscriber Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. No. 45, Station Road, Nanu Oya"
                    className="erp-input w-full"
                  />
                </div>

                {/* Financial Breakdown Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Registration & Setup Fee (LKR)
                    </span>
                    <span className="text-[10px] text-slate-400">Box hardware + installation fee</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Total Setup Fee (LKR) *
                      </label>
                      <input
                        type="number"
                        required
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        className="erp-input w-full font-mono font-bold"
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
                        className="erp-input w-full font-mono font-bold text-emerald-700 dark:text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Calculated Balance Due
                      </label>
                      <div className="h-10 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center font-mono font-black text-rose-700 dark:text-rose-400 border border-slate-200 dark:border-white/[0.06]">
                        {formatMoney(calculatedBalance, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="customer-registration-modal-form"
                disabled={isSubmitting}
                className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Registering...' : 'Save & Register Subscriber'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        data={successModalData}
        currency={currency}
      />

      {/* Bill Print Modal (80mm / 58mm Thermal Receipt) */}
      {activeBillData && (
        <BillPrintModal
          isOpen={isBillModalOpen}
          onClose={() => setIsBillModalOpen(false)}
          billData={activeBillData}
          currency={currency}
        />
      )}
    </>
  );
};
