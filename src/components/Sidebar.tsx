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
  Tv,
  Banknote,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'summary'
  | 'customers'
  | 'packages'
  | 'monthly-payment'
  | 'customer-history'
  | 'payment-collection'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currency?: SupportedCurrency;
  currentUser?: User | null;
  onLogout?: () => void;
  staffPrivileges?: StaffPrivileges;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  section: 'operations' | 'subscribers' | 'finance' | 'admin';
  badge?: string;
  isAction?: boolean;
}

const ALL_NAV_ITEMS: NavItemDef[] = [
  // Core Operations
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'operations' },
  { id: 'payment-collection', label: 'Collect Payment', icon: Banknote, section: 'operations', badge: 'POS', isAction: true },
  { id: 'monthly-payment', label: 'Monthly Payment', icon: CalendarCheck, section: 'operations' },

  // Subscribers
  { id: 'customers', label: 'Customers', icon: Users, section: 'subscribers' },
  { id: 'packages', label: 'TV Packages', icon: Tv, section: 'subscribers' },
  { id: 'customer-history', label: 'Payment History', icon: History, section: 'subscribers' },

  // Finance & Ledger
  { id: 'transactions', label: 'Income & Expenses', icon: Receipt, section: 'finance' },
  { id: 'summary', label: 'Total Summary', icon: PieChart, section: 'finance' },

  // System Administration
  { id: 'settings', label: 'Settings', icon: Settings, section: 'admin' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  staffPrivileges = DEFAULT_STAFF_PRIVILEGES,
  theme = 'dark',
  onToggleTheme,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  // Filter links dynamically based on user role and Admin-configured Staff Privileges
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (currentUser?.role === 'STAFF') {
      if (item.id === 'settings') return true;
      const privilegeKey = item.id as keyof StaffPrivileges;
      return staffPrivileges[privilegeKey] !== false;
    }
    return true;
  });

  const operationsItems = visibleNavItems.filter((i) => i.section === 'operations');
  const subscribersItems = visibleNavItems.filter((i) => i.section === 'subscribers');
  const financeItems = visibleNavItems.filter((i) => i.section === 'finance');
  const adminItems = visibleNavItems.filter((i) => i.section === 'admin');

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavGroup = (title: string, items: NavItemDef[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        {!isCollapsed && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 px-3">
            {title}
          </p>
        )}
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.id === 'settings' && currentUser?.role === 'STAFF' ? Printer : item.icon;
            const label = item.id === 'settings' && currentUser?.role === 'STAFF' ? 'Thermal Printer' : item.label;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed ? label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs font-semibold transition-all cursor-pointer group relative ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                    : item.isAction
                    ? 'bg-teal-500/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : item.isAction
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && !isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-teal-500/15 text-teal-700 dark:text-teal-300">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1. MOBILE DRAWER OVERLAY */}
      {/* ------------------------------------------------------------------- */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
              onClick={onCloseMobile}
            />

            {/* Slide Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-white/[0.08] flex flex-col justify-between h-full z-10 p-4 shadow-2xl"
            >
              <div className="space-y-5 overflow-y-auto pr-1">
                {/* Brand */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/30">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
                        <span className="text-blue-600 dark:text-blue-400">ASK</span> Cable TV
                      </h2>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Enterprise Billing ERP</p>
                    </div>
                  </div>
                  <button
                    onClick={onCloseMobile}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Nav Links */}
                <div className="space-y-4">
                  {renderNavGroup('Operations', operationsItems)}
                  {renderNavGroup('Subscribers', subscribersItems)}
                  {renderNavGroup('Financials', financeItems)}
                  {renderNavGroup('System', adminItems)}
                </div>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] space-y-2.5">
                {currentUser && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0">
                        {currentUser.name ? currentUser.name.charAt(0) : currentUser.username.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">@{currentUser.username}</p>
                      </div>
                    </div>
                    <span className="badge-status badge-royal text-[10px]">{currentUser.role}</span>
                  </div>
                )}
                {onLogout && (
                  <button
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------- */}
      {/* 2. DESKTOP COLLAPSIBLE SIDEBAR */}
      {/* ------------------------------------------------------------------- */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-white/[0.08] transition-all duration-200 select-none ${
          isCollapsed ? 'w-20 p-2.5' : 'w-64 lg:w-68 p-4'
        } justify-between h-screen shadow-xs`}
      >
        <div className="space-y-5 overflow-y-auto overflow-x-hidden pr-0.5 scrollbar-thin">
          {/* Brand Header */}
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            } pb-3.5 border-b border-slate-200 dark:border-white/[0.08]`}
          >
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/30 shrink-0">
                <Tv className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-1">
                    <span className="text-blue-600 dark:text-blue-400">ASK</span> Cable
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wide">
                      Enterprise ERP
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block animate-pulse" />
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-4">
            {renderNavGroup('Operations', operationsItems)}
            {renderNavGroup('Subscribers', subscribersItems)}
            {renderNavGroup('Financials', financeItems)}
            {renderNavGroup('System', adminItems)}
          </div>
        </div>

        {/* Sidebar Footer & Collapse Toggle */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] space-y-2">
          {/* Collapse/Expand Toggle Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-between'
              } p-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {!isCollapsed && <span>Collapse Sidebar</span>}
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Mini User Card */}
          {currentUser && !isCollapsed && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0) : currentUser.username.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">@{currentUser.username}</p>
                </div>
              </div>
              <span className="badge-status badge-royal text-[9px]">{currentUser.role}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
