import React, { useState, useMemo } from 'react';
import { Customer, SupportedCurrency, User } from '../types/finance.js';
import { formatMoney } from '../api/client.js';
import { useToast } from './Toast.js';
import { ConfirmModal } from './ConfirmModal.js';
import {
  getCablePackages,
  upsertCablePackage,
  deleteCablePackage,
  resetCablePackagesToDefault,
  getCustomerPackage,
  setCustomerPackage,
  CablePackage,
} from '../utils/packageManager.js';
import {
  Tv,
  Plus,
  Crown,
  Search,
  Users,
  DollarSign,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  Box,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface PackagesViewProps {
  customers: Customer[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  onSelectCustomerHistory?: (customerId: string) => void;
}

const COLOR_PRESETS = [
  { id: 'blue', name: 'Royal Blue', color: 'from-blue-600 to-indigo-700', badgeClass: 'badge-royal' },
  { id: 'teal', name: 'Teal Accent', color: 'from-teal-600 to-emerald-700', badgeClass: 'badge-teal' },
  { id: 'amber', name: 'Royal Gold', color: 'from-amber-500 to-orange-600', badgeClass: 'badge-warning' },
  { id: 'purple', name: 'Purple Velvet', color: 'from-purple-600 to-indigo-800', badgeClass: 'badge-royal' },
  { id: 'rose', name: 'Ruby Rose', color: 'from-rose-600 to-red-700', badgeClass: 'badge-danger' },
];

export const PackagesView: React.FC<PackagesViewProps> = ({
  customers,
  currency,
  onRefreshData,
  currentUser,
  onSelectCustomerHistory,
}) => {
  const toast = useToast();
  const [packages, setPackages] = useState<CablePackage[]>(() => getCablePackages());
  const [selectedPackageFilter, setSelectedPackageFilter] = useState<string>('ALL');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  // Pagination for subscriber table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [modalPkgName, setModalPkgName] = useState('');
  const [modalShortName, setModalShortName] = useState('');
  const [modalMonthlyFee, setModalMonthlyFee] = useState('');
  const [modalChannelsCount, setModalChannelsCount] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalColorPreset, setModalColorPreset] = useState('blue');
  const [isSaving, setIsSaving] = useState(false);

  // Quick Customer Switcher Loading Map
  const [switchingCustomerId, setSwitchingCustomerId] = useState<string | null>(null);

  // Confirm Modal States
  const [confirmConfig, setConfirmConfig] = useState<{
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

  // Analytics Computation
  const packageAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};
    const revenue: Record<string, number> = {};

    packages.forEach((p) => {
      counts[p.id] = 0;
      revenue[p.id] = 0;
    });

    let totalProjectedMonthlyRevenue = 0;
    const activeCustomers = customers.filter((c) => (c.status || 'ACTIVE') === 'ACTIVE');

    activeCustomers.forEach((cust) => {
      const assigned = getCustomerPackage(cust.id || cust.boxNo);
      const pkgId = assigned.packageId;
      const fee = assigned.monthlyFee || 0;

      counts[pkgId] = (counts[pkgId] || 0) + 1;
      revenue[pkgId] = (revenue[pkgId] || 0) + fee;
      totalProjectedMonthlyRevenue += fee;
    });

    const totalActiveCount = activeCustomers.length;
    const arpu = totalActiveCount > 0 ? Math.round(totalProjectedMonthlyRevenue / totalActiveCount) : 0;

    let popularPkgId = packages[0]?.id || 'STANDARD';
    let maxSubscribers = -1;
    packages.forEach((p) => {
      if ((counts[p.id] || 0) > maxSubscribers) {
        maxSubscribers = counts[p.id] || 0;
        popularPkgId = p.id;
      }
    });

    return {
      counts,
      revenue,
      totalActiveCount,
      totalProjectedMonthlyRevenue,
      arpu,
      popularPkgId,
    };
  }, [packages, customers]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingPkgId(null);
    setModalPkgName('');
    setModalShortName('');
    setModalMonthlyFee('1200');
    setModalChannelsCount('80+ Channels');
    setModalDescription('Quality digital television entertainment, news, movies, and music.');
    setModalColorPreset('blue');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (pkg: CablePackage) => {
    setEditingPkgId(pkg.id);
    setModalPkgName(pkg.name);
    setModalShortName(pkg.shortName || '');
    setModalMonthlyFee(pkg.monthlyFee.toString());
    setModalChannelsCount(pkg.channelsCount || '');
    setModalDescription(pkg.description || '');
    const preset = COLOR_PRESETS.find((p) => p.color === pkg.color) || COLOR_PRESETS[0];
    setModalColorPreset(preset.id);
    setIsModalOpen(true);
  };

  // Save Package Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPkgName.trim()) {
      toast.error('Package Name is required');
      return;
    }

    const fee = parseFloat(modalMonthlyFee);
    if (isNaN(fee) || fee <= 0) {
      toast.error('Please enter a valid monthly fee greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const pkgId = editingPkgId || modalPkgName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const selectedPreset = COLOR_PRESETS.find((p) => p.id === modalColorPreset) || COLOR_PRESETS[0];
      const updatedList = await upsertCablePackage({
        id: pkgId,
        name: modalPkgName.trim(),
        shortName: modalShortName.trim() || modalPkgName.trim(),
        monthlyFee: fee,
        channelsCount: modalChannelsCount.trim() || 'Custom Channels',
        description: modalDescription.trim() || 'Cable TV Package',
        color: selectedPreset.color,
        badgeBg: 'bg-blue-500/15',
        badgeBorder: 'border-blue-500/30',
        badgeText: 'text-blue-400',
      });

      setPackages(updatedList);
      setIsModalOpen(false);
      toast.success(`Package "${modalPkgName.trim()}" saved successfully!`);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save package');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Package
  const handleDeletePackage = (pkg: CablePackage) => {
    const subscriberCount = packageAnalytics.counts[pkg.id] || 0;
    setConfirmConfig({
      isOpen: true,
      title: `Delete Package "${pkg.name}"`,
      message:
        subscriberCount > 0
          ? `Package "${pkg.name}" currently has ${subscriberCount} active subscriber(s). Deleting it will reassign these subscribers to the default Standard package. Are you sure?`
          : `Are you sure you want to delete package "${pkg.name}"? This action cannot be undone.`,
      confirmText: 'Delete Package',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const updatedList = await deleteCablePackage(pkg.id);
          setPackages(updatedList);
          toast.success(`Package "${pkg.name}" deleted.`);
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete package');
        }
      },
    });
  };

  // Reset Packages
  const handleResetDefaults = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reset TV Packages to Factory Defaults',
      message: 'Restore Basic (Rs. 600), Standard (Rs. 1,200), and Premium HD (Rs. 1,800) tiers?',
      confirmText: 'Reset to Defaults',
      variant: 'indigo',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        const defaults = await resetCablePackagesToDefault();
        setPackages(defaults);
        toast.success('TV Packages restored to defaults.');
        onRefreshData();
      },
    });
  };

  // Live change subscriber's assigned package
  const handleChangeSubscriberPackage = async (customer: Customer, newPkgId: string) => {
    const targetPkg = packages.find((p) => p.id === newPkgId);
    if (!targetPkg) return;

    setSwitchingCustomerId(customer.id);
    try {
      await setCustomerPackage(
        { id: customer.id, boxNo: customer.boxNo },
        {
          packageId: targetPkg.id,
          packageName: targetPkg.name,
          monthlyFee: targetPkg.monthlyFee,
        }
      );
      toast.success(`Box #${customer.boxNo} assigned to ${targetPkg.name} (${formatMoney(targetPkg.monthlyFee, currency)}/mo)`);
      onRefreshData();
    } catch (err: any) {
      toast.error('Failed to change subscriber package');
    } finally {
      setSwitchingCustomerId(null);
    }
  };

  // Filtered Subscribers for allocation table
  const filteredSubscribers = useMemo(() => {
    return customers.filter((c) => {
      const assigned = getCustomerPackage(c.id || c.boxNo);
      if (selectedPackageFilter !== 'ALL' && assigned.packageId !== selectedPackageFilter) return false;

      if (!customerSearchQuery.trim()) return true;
      const q = customerSearchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.boxNo.toLowerCase().includes(q) ||
        c.phoneNo.toLowerCase().includes(q)
      );
    });
  }, [customers, selectedPackageFilter, customerSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / pageSize));
  const paginatedSubscribers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubscribers.slice(start, start + pageSize);
  }, [filteredSubscribers, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. HEADER & KPI CARDS STRIP */}
      {/* ==================================================================== */}
      <div className="erp-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Tv className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>TV Packages & Rental Rate Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure subscription tiers, channel allowances, monthly fees, and subscriber distribution
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Reset to factory packages"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>
          )}

          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={handleOpenCreateModal}
              className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Package</span>
            </button>
          )}
        </div>
      </div>

      {/* Mini KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Packages</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{packages.length} Tiers</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Tv className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active Subscribers</span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
              {packageAnalytics.totalActiveCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Projected Monthly</span>
            <div className="text-lg font-black font-mono text-teal-700 dark:text-teal-400 mt-0.5">
              {formatMoney(packageAnalytics.totalProjectedMonthlyRevenue, currency)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="erp-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Average ARPU</span>
            <div className="text-lg font-black font-mono text-purple-700 dark:text-purple-400 mt-0.5">
              {formatMoney(packageAnalytics.arpu, currency)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. PACKAGE TIER CARDS GRID */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map((pkg) => {
          const subscriberCount = packageAnalytics.counts[pkg.id] || 0;
          const tierRevenue = packageAnalytics.revenue[pkg.id] || 0;
          const isPopular = pkg.id === packageAnalytics.popularPkgId && subscriberCount > 0;

          return (
            <div
              key={pkg.id}
              className="erp-card p-5 flex flex-col justify-between space-y-4 hover:border-blue-500/50 hover:shadow-md transition-all relative overflow-hidden"
            >
              {isPopular && (
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-current" />
                  <span>Most Popular</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-600/30">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {pkg.name}
                    </h3>
                    <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                      {pkg.channelsCount || 'Standard Channels'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                    {formatMoney(pkg.monthlyFee, currency)}
                    <span className="text-xs font-normal text-slate-400 font-sans ml-1">/ month</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {pkg.description || 'Full cable television subscription channels included.'}
                  </p>
                </div>

                {/* Tier Performance Metrics */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/[0.04] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Subscribers</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {subscriberCount} accounts
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Monthly Yield</span>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatMoney(tierRevenue, currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {currentUser?.role === 'ADMIN' && (
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEditModal(pkg)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Tier</span>
                  </button>

                  <button
                    onClick={() => handleDeletePackage(pkg)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors"
                    title="Delete Tier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 3. SUBSCRIBER ALLOCATION TABLE */}
      {/* ==================================================================== */}
      <div className="erp-card overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.04] pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Subscriber TV Package Allocations ({filteredSubscribers.length})</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Live package assignment per subscriber — changing tier updates future monthly bills immediately
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search subscriber name or box #..."
                className="erp-input pl-8 py-1.5 text-xs"
              />
            </div>

            <select
              value={selectedPackageFilter}
              onChange={(e) => {
                setSelectedPackageFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="erp-input py-1.5 text-xs w-auto font-semibold"
            >
              <option value="ALL">All Packages</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table text-xs">
            <thead>
              <tr>
                <th>Box #</th>
                <th>Subscriber Name</th>
                <th>Phone Number</th>
                <th>Assigned TV Package</th>
                <th className="text-right">Monthly Rental</th>
                <th>Account Status</th>
                <th className="text-right">Change Tier</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No subscribers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedSubscribers.map((cust) => {
                  const custPkg = getCustomerPackage(cust.id || cust.boxNo);
                  const isSwitching = switchingCustomerId === cust.id;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td>
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300">
                          #{cust.boxNo}
                        </span>
                      </td>

                      <td className="font-bold text-slate-900 dark:text-white">
                        <button
                          onClick={() => onSelectCustomerHistory && onSelectCustomerHistory(cust.id)}
                          className="hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                        >
                          {cust.name}
                        </button>
                      </td>

                      <td className="font-mono text-slate-500">{cust.phoneNo || '—'}</td>

                      <td>
                        <span className="badge-status badge-teal">{custPkg.packageName}</span>
                      </td>

                      <td className="text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatMoney(custPkg.monthlyFee, currency)}
                      </td>

                      <td>
                        <span
                          className={`badge-status text-[9px] ${
                            cust.status === 'ACTIVE' || !cust.status ? 'badge-success' : 'badge-warning'
                          }`}
                        >
                          {cust.status || 'ACTIVE'}
                        </span>
                      </td>

                      <td className="text-right">
                        <select
                          disabled={isSwitching}
                          value={custPkg.packageId}
                          onChange={(e) => handleChangeSubscriberPackage(cust, e.target.value)}
                          className="erp-input py-1 text-xs w-auto font-semibold cursor-pointer"
                        >
                          {packages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatMoney(p.monthlyFee, currency)})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3.5 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filteredSubscribers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredSubscribers.length)} of {filteredSubscribers.length} subscribers
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-mono font-bold px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. CREATE / EDIT PACKAGE MODAL */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{editingPkgId ? 'Edit Cable TV Package' : 'Create New Cable TV Package'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={modalPkgName}
                  onChange={(e) => setModalPkgName(e.target.value)}
                  placeholder="e.g. Premium HD, Sports & Movie Plus"
                  className="erp-input font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Fee (LKR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={modalMonthlyFee}
                    onChange={(e) => setModalMonthlyFee(e.target.value)}
                    placeholder="1200"
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Channels Count
                  </label>
                  <input
                    type="text"
                    value={modalChannelsCount}
                    onChange={(e) => setModalChannelsCount(e.target.value)}
                    placeholder="e.g. 100+ Channels"
                    className="erp-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Channels and genres included..."
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Color Preset</label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setModalColorPreset(p.id)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                        modalColorPreset === p.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/20 text-blue-700 font-bold'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
      />
    </div>
  );
};
