import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SupportedCurrency, User, StaffPrivileges, DEFAULT_STAFF_PRIVILEGES } from '../types/finance.js';
import { CURRENCY_CONF } from '../api/client.js';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Users,
  CalendarCheck,
  History,
  Settings,
  ShieldCheck,
  UserCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Tv,
  Banknote,
  Printer,
  ChevronRight,
  Radio,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'summary' | 'customers' | 'packages' | 'monthly-payment' | 'customer-history' | 'payment-collection' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currency?: SupportedCurrency;
  currentUser?: User | null;
  onLogout?: () => void;
  staffPrivileges?: StaffPrivileges;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  section: 'main' | 'admin';
}

const ALL_NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'transactions', label: 'Income & Expenses', icon: Receipt, section: 'main' },
  { id: 'payment-collection', label: 'Collect Payment', icon: Banknote, section: 'main' },
  { id: 'customers', label: 'Customers', icon: Users, section: 'main' },
  { id: 'packages', label: 'TV Packages', icon: Tv, section: 'main' },
  { id: 'monthly-payment', label: 'Monthly Payment', icon: CalendarCheck, section: 'main' },
  { id: 'customer-history', label: 'Payment History', icon: History, section: 'main' },
  { id: 'summary', label: 'Total Summary', icon: PieChart, section: 'admin' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'admin' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currency = 'LKR',
  currentUser,
  onLogout,
  staffPrivileges = DEFAULT_STAFF_PRIVILEGES,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Filter links dynamically based on user role and Admin-configured Staff Privileges
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (currentUser?.role === 'STAFF') {
      // Bluetooth Thermal Receipt Printer in Settings is allowed for Staff & Admin
      if (item.id === 'settings') return true;
      const privilegeKey = item.id as keyof StaffPrivileges;
      return staffPrivileges[privilegeKey] !== false;
    }
    return true; // Admin has access to all links
  });

  const mainSectionItems = visibleNavItems.filter((i) => i.section === 'main');
  const adminSectionItems = visibleNavItems.filter((i) => i.section === 'admin');

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setIsMobileOpen(false);
  };

  const currentTabLabel = currentTab === 'settings' && currentUser?.role === 'STAFF'
    ? 'Thermal Printer'
    : (ALL_NAV_ITEMS.find((i) => i.id === currentTab)?.label || 'Dashboard');

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1. MOBILE TOP HEADER BAR (Mobile Only: block md:hidden) */}
      {/* ------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 flex md:hidden items-center justify-between px-4 h-15 bg-white/95 dark:bg-[#090d16]/95 border-b border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.08] rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
            aria-label="Open Side Menu"
          >
            <Menu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                <span className="text-emerald-600 dark:text-emerald-400">ASK</span> Cable
              </span>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium leading-none">
                {currentTabLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.08] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* 2. MOBILE SIDEBAR DRAWER OVERLAY (Animated with Framer Motion) */}
      {/* ------------------------------------------------------------------- */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-76 max-w-[85vw] bg-white dark:bg-[#0c121e] border-r border-slate-200 dark:border-white/[0.08] flex flex-col justify-between h-full z-10 p-5 space-y-4 shadow-2xl"
            >
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* Drawer Top Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base leading-tight">
                        <span className="text-emerald-600 dark:text-emerald-400">ASK</span> Cable
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Enterprise Cable ERP</p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsMobileOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-white/[0.05] rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Mobile Menu Links */}
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-2.5 px-3">
                      Main Menu
                    </p>
                    <div className="space-y-1">
                      {mainSectionItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                          <motion.button
                            key={item.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                                : 'text-slate-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-neutral-400'}`} />
                              <span>{item.label}</span>
                            </div>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {adminSectionItems.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-2.5 px-3">
                        {currentUser?.role === 'STAFF' ? 'Printer & Tools' : 'Administration'}
                      </p>
                      <div className="space-y-1">
                        {adminSectionItems.map((item) => {
                          const Icon = item.id === 'settings' && currentUser?.role === 'STAFF' ? Printer : item.icon;
                          const label = item.id === 'settings' && currentUser?.role === 'STAFF' ? 'Thermal Printer' : item.label;
                          const isActive = currentTab === item.id;
                          return (
                            <motion.button
                              key={item.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleNavClick(item.id)}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                                  : 'text-slate-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-neutral-400'}`} />
                                <span>{label}</span>
                              </div>
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Drawer Footer User Profile */}
              <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.08] space-y-3">
                {currentUser && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/25">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{currentUser.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">@{currentUser.username}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                          currentUser.role === 'ADMIN'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {currentUser.role}
                      </span>
                    </div>
                  </div>
                )}

                {onLogout && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setIsMobileOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------- */}
      {/* 2B. NATIVE MOBILE BOTTOM NAVIGATION BAR (iOS / Android Style) */}
      {/* ------------------------------------------------------------------- */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] px-3 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)]">
        {/* Dashboard */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => handleNavClick('dashboard')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {currentTab === 'dashboard' && (
            <motion.div
              layoutId="mobile-bottom-nav-pill"
              className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/15 rounded-xl border border-emerald-200/60 dark:border-emerald-500/25"
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          )}
          <LayoutDashboard className="w-5 h-5 relative z-10" />
          <span className="text-[10px] tracking-tight relative z-10 mt-0.5">Home</span>
        </motion.button>

        {/* Collect Payment - Center Floating Native Style */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => handleNavClick('payment-collection')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            currentTab === 'payment-collection'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-600 dark:text-neutral-300'
          }`}
        >
          {currentTab === 'payment-collection' ? (
            <motion.div
              layoutId="mobile-bottom-nav-pill"
              className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/15 rounded-xl border border-emerald-200/60 dark:border-emerald-500/25"
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Banknote className="w-4 h-4 stroke-[2.5]" />
            </div>
          )}
          {currentTab === 'payment-collection' ? (
            <Banknote className="w-5 h-5 relative z-10" />
          ) : null}
          <span className="text-[10px] tracking-tight relative z-10 mt-0.5 font-bold">Collect</span>
        </motion.button>

        {/* Customers */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => handleNavClick('customers')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
            currentTab === 'customers'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {currentTab === 'customers' && (
            <motion.div
              layoutId="mobile-bottom-nav-pill"
              className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/15 rounded-xl border border-emerald-200/60 dark:border-emerald-500/25"
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          )}
          <Users className="w-5 h-5 relative z-10" />
          <span className="text-[10px] tracking-tight relative z-10 mt-0.5">Customers</span>
        </motion.button>

        {/* Monthly Payment */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => handleNavClick('monthly-payment')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
            currentTab === 'monthly-payment'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {currentTab === 'monthly-payment' && (
            <motion.div
              layoutId="mobile-bottom-nav-pill"
              className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/15 rounded-xl border border-emerald-200/60 dark:border-emerald-500/25"
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          )}
          <CalendarCheck className="w-5 h-5 relative z-10" />
          <span className="text-[10px] tracking-tight relative z-10 mt-0.5">Monthly</span>
        </motion.button>

        {/* More / Menu Drawer Toggle */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setIsMobileOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
            isMobileOpen || currentTab === 'settings' || currentTab === 'summary' || currentTab === 'customer-history' || currentTab === 'transactions'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5 relative z-10" />
          <span className="text-[10px] tracking-tight relative z-10 mt-0.5">Menu</span>
        </motion.button>
      </nav>

      {/* ------------------------------------------------------------------- */}
      {/* 3. DESKTOP FIXED SIDEBAR MENU (Desktop Only: hidden md:flex) */}
      {/* ------------------------------------------------------------------- */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 fixed inset-y-0 left-0 z-30 border-r border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-xl p-4.5 justify-between h-screen select-none transition-colors duration-200 shadow-sm">
        <div className="space-y-6 overflow-y-auto pr-1 scrollbar-thin">
          {/* Brand Logo & ERP Title */}
          <div className="flex items-center gap-3 px-2 border-b border-slate-200/80 dark:border-white/[0.08] pb-4.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/25 shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <button
                onClick={() => onSelectTab('dashboard')}
                className="text-left font-extrabold text-lg text-slate-900 dark:text-white tracking-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer leading-tight flex items-center gap-1.5"
              >
                <span><span className="text-emerald-600 dark:text-emerald-400">ASK</span> Cable</span>
              </button>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono tracking-wide uppercase">
                  Cable ERP SaaS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
            </div>
          </div>

          {/* Main Navigation Links */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-2 px-3">
                Main Menu
              </p>
              <div className="space-y-1">
                {mainSectionItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 dark:border-emerald-500/30 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                        }`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin Tools Section */}
            {adminSectionItems.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-2 px-3">
                  {currentUser?.role === 'STAFF' ? 'Printer & Tools' : 'Administration'}
                </p>
                <div className="space-y-1">
                  {adminSectionItems.map((item) => {
                    const Icon = item.id === 'settings' && currentUser?.role === 'STAFF' ? Printer : item.icon;
                    const label = item.id === 'settings' && currentUser?.role === 'STAFF' ? 'Thermal Printer' : item.label;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 dark:border-emerald-500/30 font-bold shadow-xs'
                            : 'text-slate-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 transition-colors ${
                            isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                          }`} />
                          <span>{label}</span>
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer: User Profile, Currency & Theme Controls */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.08] space-y-3">
          {/* LKR Currency & Theme Controls Row */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 rounded-xl"
              title="Standard Sri Lankan Rupee (LKR)"
            >
              <span>{CURRENCY_CONF.symbol.trim()}</span>
              <span>{CURRENCY_CONF.code}</span>
            </div>

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-semibold">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px] font-semibold">Dark</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Logged in User Profile Card */}
          {currentUser && (
            <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center uppercase shrink-0 border border-emerald-500/25">
                    {currentUser.name ? currentUser.name.charAt(0) : currentUser.username.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 truncate">@{currentUser.username}</p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                  }`}
                  title={`Role: ${currentUser.role}`}
                >
                  {currentUser.role === 'ADMIN' ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <UserCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>{currentUser.role}</span>
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100/80 dark:bg-white/[0.02] hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-white/[0.08] hover:border-rose-200 dark:hover:border-rose-500/20 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
