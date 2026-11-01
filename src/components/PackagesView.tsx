import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, SupportedCurrency, User } from '../types/finance.js';
import { formatMoney } from '../api/client.js';
import { useToast } from './Toast.js';
import { ConfirmModal } from './ConfirmModal.js';
import {
  getCablePackages,
  saveCablePackages,
  upsertCablePackage,
  deleteCablePackage,
  resetCablePackagesToDefault,
  getCustomerPackage,
  setCustomerPackage,
  CablePackage,
  DEFAULT_CABLE_PACKAGES,
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
  Phone,
  ShieldCheck,
  TrendingUp,
  Percent,
  Check,
  ArrowRight,
  Filter
} from 'lucide-react';

interface PackagesViewProps {
  customers: Customer[];
  currency: SupportedCurrency;
  onRefreshData: () => void;
  currentUser?: User | null;
  onSelectCustomerHistory?: (customerId: string) => void;
}

const COLOR_PRESETS = [
  {
    id: 'emerald',
    name: 'Emerald Green',
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    cardRing: 'ring-emerald-500/30',
    borderActive: 'border-emerald-500',
    bgTint: 'bg-emerald-500/5',
  },
  {
    id: 'blue',
    name: 'Sapphire Blue',
    color: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    cardRing: 'ring-blue-500/30',
    borderActive: 'border-blue-500',
    bgTint: 'bg-blue-500/5',
  },
  {
    id: 'amber',
    name: 'Royal Gold / Amber',
    color: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    cardRing: 'ring-amber-500/30',
    borderActive: 'border-amber-500',
    bgTint: 'bg-amber-500/5',
  },
  {
    id: 'purple',
    name: 'Purple Velvet',
    color: 'from-purple-500 to-pink-600',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
    cardRing: 'ring-purple-500/30',
    borderActive: 'border-purple-500',
    bgTint: 'bg-purple-500/5',
  },
  {
    id: 'rose',
    name: 'Ruby Rose',
    color: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-400',
    cardRing: 'ring-rose-500/30',
    borderActive: 'border-rose-500',
    bgTint: 'bg-rose-500/5',
  },
  {
    id: 'cyan',
    name: 'Cyan Teal',
    color: 'from-cyan-500 to-blue-600',
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400',
    cardRing: 'ring-cyan-500/30',
    borderActive: 'border-cyan-500',
    bgTint: 'bg-cyan-500/5',
  },
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
    setModalChannelsCount('80+ SD & HD Channels');
    setModalDescription('Quality television channels including entertainment, news, movies and music.');
    setModalColorPreset('emerald');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (pkg: CablePackage) => {
    setEditingPkgId(pkg.id);
    setModalPkgName(pkg.name);
    setModalShortName(pkg.shortName || pkg.name.replace(' Package', ''));
    setModalMonthlyFee(pkg.monthlyFee.toString());
    setModalChannelsCount(pkg.channelsCount || '');
    setModalDescription(pkg.description || '');

    const foundPreset = COLOR_PRESETS.find((cp) => pkg.color?.includes(cp.id)) || COLOR_PRESETS[1];
    setModalColorPreset(foundPreset.id);
    setIsModalOpen(true);
  };

  // Save / Update Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPkgName.trim() || !modalMonthlyFee.trim()) {
      toast.error('Package name and monthly fee are required.');
      return;
    }

    const feeNum = parseFloat(modalMonthlyFee);
    if (isNaN(feeNum) || feeNum <= 0) {
      toast.error('Monthly fee must be a valid positive amount.');
      return;
    }

    setIsSaving(true);
    try {
      const preset = COLOR_PRESETS.find((cp) => cp.id === modalColorPreset) || COLOR_PRESETS[0];
      const pkgId = editingPkgId || modalShortName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_') || `PKG_${Date.now()}`;

      const pkgData: CablePackage = {
        id: pkgId,
        name: modalPkgName.trim(),
        shortName: modalShortName.trim() || modalPkgName.trim(),
        monthlyFee: feeNum,
        channelsCount: modalChannelsCount.trim() || 'Custom Channels',
        color: preset.color,
        badgeBg: preset.badgeBg,
        badgeBorder: preset.badgeBorder,
        badgeText: preset.badgeText,
        description: modalDescription.trim() || `${modalPkgName.trim()} subscription service.`,
      };

      const updated = await upsertCablePackage(pkgData);
      setPackages(updated);
      setIsModalOpen(false);
      toast.success(`Package "${pkgData.name}" saved successfully!`);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save cable package.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Package
  const handleDeletePackage = (pkg: CablePackage) => {
    setConfirmConfig({
      isOpen: true,
      title: `Delete Package: ${pkg.name}`,
      message: `Are you sure you want to delete "${pkg.name}" (${formatMoney(pkg.monthlyFee, currency)}/mo)? Subscribers assigned to this package will default back to the Standard package.`,
      confirmText: 'Delete Package',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const updated = await deleteCablePackage(pkg.id);
          setPackages(updated);
          toast.success(`Package "${pkg.name}" removed.`);
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete package.');
        }
      },
    });
  };

  // Reset to Factory Defaults
  const handleResetDefaults = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reset to Default Packages',
      message: 'Restore the standard 3 cable packages (Basic: LKR 600, Standard: LKR 1,200, Premium HD: LKR 1,800)? Custom modifications will be reset to factory defaults.',
      confirmText: 'Restore Defaults',
      variant: 'emerald',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const defaults = await resetCablePackagesToDefault();
          setPackages(defaults);
          toast.success('Packages reset to factory defaults (Basic, Standard, Premium HD)!');
          onRefreshData();
        } catch (err: any) {
          toast.error(err.message || 'Failed to reset packages.');
        }
      },
    });
  };

  // Quick switch customer package directly from the table
  const handleQuickSwitchPackage = async (customer: Customer, targetPackageId: string) => {
    const targetPkg = packages.find((p) => p.id === targetPackageId) || DEFAULT_CABLE_PACKAGES[1];
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
      toast.success(`${customer.name} switched to ${targetPkg.name} (${formatMoney(targetPkg.monthlyFee, currency)}/mo)`);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer package.');
    } finally {
      setSwitchingCustomerId(null);
    }
  };

  // Filtered subscribers list
  const filteredSubscribers = useMemo(() => {
    return customers.filter((cust) => {
      const assigned = getCustomerPackage(cust.id || cust.boxNo);

      if (selectedPackageFilter !== 'ALL' && assigned.packageId !== selectedPackageFilter) {
        return false;
      }

      if (!customerSearchQuery.trim()) return true;
      const q = customerSearchQuery.toLowerCase();
      return (
        cust.name.toLowerCase().includes(q) ||
        cust.boxNo.toLowerCase().includes(q) ||
        cust.nicNo.toLowerCase().includes(q) ||
        cust.phoneNo.toLowerCase().includes(q) ||
        assigned.packageName.toLowerCase().includes(q)
      );
    });
  }, [customers, selectedPackageFilter, customerSearchQuery]);

  return (
    <div className="mx-auto max-w-[1700px] w-full px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* ------------------------------------------------------------------- */}
      {/* 1. HEADER SECTION & ACTIONS */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            <span>Cable TV Packages & Configurations</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5 sm:mt-1">
            Manage subscription plans, customize monthly fees, configure channel lineups, and assign packages to subscribers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-all cursor-pointer shadow-xs"
              title="Reset to Factory Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>Reset Defaults</span>
            </button>
          )}

          {currentUser?.role === 'ADMIN' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add New Package</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. TOP KPI CARDS OVERVIEW */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Packages */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Packages</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 dark:text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {packages.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            Customizable TV channel tiers
          </p>
        </div>

        {/* Total Active Subscribers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Subscribers</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {packageAnalytics.totalActiveCount}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Active connections in network
          </p>
        </div>

        {/* Projected Monthly Revenue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Projected Revenue</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatMoney(packageAnalytics.totalProjectedMonthlyRevenue, currency)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            Recurring monthly subscription pool
          </p>
        </div>

        {/* Average Revenue Per User (ARPU) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Rate / User</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatMoney(packageAnalytics.arpu, currency)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            Monthly ARPU per subscriber
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. PACKAGE CARDS (GRID VIEW) */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Available Packages & Pricing Lineup</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Click "Edit" on any package to customize its fee, channel count, or description in MongoDB.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            Live MongoDB Config
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {packages.map((pkg) => {
            const subCount = packageAnalytics.counts[pkg.id] || 0;
            const revSum = packageAnalytics.revenue[pkg.id] || 0;
            const sharePct = packageAnalytics.totalActiveCount > 0
              ? Math.round((subCount / packageAnalytics.totalActiveCount) * 100)
              : 0;
            const isPremium = pkg.id === 'PREMIUM_HD';
            const isPopular = pkg.id === packageAnalytics.popularPkgId;

            return (
              <motion.div
                key={pkg.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-3xl p-5 sm:p-6 bg-white dark:bg-neutral-900 border transition-all shadow-md flex flex-col justify-between space-y-4 ${
                  isPremium
                    ? 'border-amber-500/50 dark:border-amber-500/40 shadow-amber-500/5'
                    : 'border-slate-200 dark:border-neutral-800'
                }`}
              >
                {/* Popular / Premium Ribbons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${pkg.badgeBg} ${pkg.badgeBorder} ${pkg.badgeText}`}>
                      {isPremium ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : <Tv className="w-3.5 h-3.5" />}
                      <span>{pkg.shortName || pkg.name}</span>
                    </span>
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Most Popular</span>
                      </span>
                    )}
                  </div>

                  {currentUser?.role === 'ADMIN' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(pkg)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Edit Package"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {packages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Package Main Info */}
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {pkg.name}
                  </h3>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {formatMoney(pkg.monthlyFee, currency)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 font-sans">
                      / month
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-700 dark:text-neutral-300">
                    <Tv className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{pkg.channelsCount}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed min-h-[36px]">
                    {pkg.description}
                  </p>
                </div>

                {/* Live Subscriber Metrics Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
                    <span className="font-medium">Active Subscribers:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{subCount} subscribers</span>
                      <span className="text-[10px] text-slate-400 font-normal">({sharePct}%)</span>
                    </span>
                  </div>

                  {/* Progress Bar for Share */}
                  <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${pkg.color || 'from-emerald-500 to-teal-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400 pt-1 border-t border-slate-200/80 dark:border-neutral-800/80">
                    <span className="font-medium">Monthly Contribution:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(revSum, currency)}
                    </span>
                  </div>
                </div>

                {/* Filter Subscribers Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPackageFilter(selectedPackageFilter === pkg.id ? 'ALL' : pkg.id)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedPackageFilter === pkg.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-750 text-slate-800 dark:text-neutral-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>
                    {selectedPackageFilter === pkg.id ? 'Showing Subscribers (Click to clear)' : `View ${subCount} Subscribers`}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. SUBSCRIBER PACKAGE ALLOCATION TABLE */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Subscriber Package Allocations</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Change any subscriber's TV package instantly using the dropdown. Changes save directly to MongoDB.
            </p>
          </div>

          {/* Search & Package Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subscriber, box no, NIC..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-950 p-1 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setSelectedPackageFilter('ALL')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  selectedPackageFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({customers.length})
              </button>
              {packages.map((p) => {
                const count = packageAnalytics.counts[p.id] || 0;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPackageFilter(p.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedPackageFilter === p.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{p.shortName || p.name}</span>
                    <span className="text-[10px] font-mono opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop Table View (hidden md:block) */}
        <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-3 py-3">Box Number</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-4 py-3">Assigned Package</th>
                <th className="px-3 py-3 text-right">Monthly Fee</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 dark:text-neutral-500">
                    No subscribers found matching the selected package and search filters.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((cust) => {
                  const assigned = getCustomerPackage(cust.id || cust.boxNo);
                  const isSwitching = switchingCustomerId === cust.id;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{cust.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate max-w-[200px]" title={cust.address}>
                          {cust.address || 'No Address'}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700/80 rounded-md text-xs font-bold text-slate-800 dark:text-neutral-200">
                          <Box className="w-3 h-3 text-slate-500 dark:text-neutral-400" />
                          <span>{cust.boxNo || '-'}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono whitespace-nowrap">
                        {cust.phoneNo ? (
                          <a href={`tel:${cust.phoneNo}`} className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold">
                            {cust.phoneNo}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="relative inline-block w-48">
                          <select
                            disabled={isSwitching}
                            value={assigned.packageId}
                            onChange={(e) => handleQuickSwitchPackage(cust, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-750 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {packages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatMoney(p.monthlyFee, currency)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap text-sm">
                        {formatMoney(assigned.monthlyFee, currency)}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          (cust.status || 'ACTIVE') === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (cust.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`} />
                          {cust.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {onSelectCustomerHistory && (
                          <button
                            type="button"
                            onClick={() => onSelectCustomerHistory(cust.id)}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Ledger</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (block md:hidden) */}
        <div className="block md:hidden space-y-3">
          {filteredSubscribers.length === 0 ? (
            <div className="p-6 text-center text-slate-400 dark:text-neutral-500 text-xs bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800">
              No subscribers found matching criteria.
            </div>
          ) : (
            filteredSubscribers.map((cust) => {
              const assigned = getCustomerPackage(cust.id || cust.boxNo);
              return (
                <div
                  key={cust.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-neutral-800 pb-2.5">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                        {cust.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                        <Box className="w-3 h-3 text-emerald-500" />
                        <span>Box: {cust.boxNo}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      (cust.status || 'ACTIVE') === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400'
                    }`}>
                      {cust.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Package Selector on Mobile */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-neutral-400 flex items-center justify-between">
                      <span>Assigned TV Package:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatMoney(assigned.monthlyFee, currency)}/mo
                      </span>
                    </label>
                    <select
                      value={assigned.packageId}
                      onChange={(e) => handleQuickSwitchPackage(cust, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatMoney(p.monthlyFee, currency)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 5. ADD / EDIT PACKAGE MODAL */}
      {/* ------------------------------------------------------------------- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {editingPkgId ? 'Edit Cable Package' : 'Create New Cable Package'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Configure subscription rate and channel offerings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
                {/* Package Name */}
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium HD Package, Diamond Sports Pack"
                    value={modalPkgName}
                    onChange={(e) => setModalPkgName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Short Name & Monthly Fee */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                      Short Badge Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Premium, Gold, Basic"
                      value={modalShortName}
                      onChange={(e) => setModalShortName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                      Monthly Fee ({currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="1200"
                      value={modalMonthlyFee}
                      onChange={(e) => setModalMonthlyFee(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                </div>

                {/* Channels Count Breakdown */}
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Channels Count & Quality
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 140+ Full HD & 4K Channels"
                    value={modalChannelsCount}
                    onChange={(e) => setModalChannelsCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Channel Lineup & Features Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe included genres, sports, movies, local and international channels..."
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Color Theme Selector */}
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1.5">
                    Card & Badge Color Theme
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {COLOR_PRESETS.map((cp) => (
                      <button
                        type="button"
                        key={cp.id}
                        onClick={() => setModalColorPreset(cp.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          modalColorPreset === cp.id
                            ? `${cp.badgeBg} ${cp.badgeBorder} ring-2 ${cp.cardRing}`
                            : 'bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-gradient-to-r ${cp.color}`} />
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-neutral-300 truncate w-full">
                          {cp.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium hover:bg-slate-200 dark:hover:bg-neutral-750"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : editingPkgId ? 'Save Changes' : 'Create Package'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
