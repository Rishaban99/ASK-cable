import React from 'react';
import { AnalyticsOverview, SupportedCurrency, User, StaffPrivileges, DEFAULT_STAFF_PRIVILEGES } from '../types/finance.js';
import { CURRENCY_CONF } from '../api/client.js';
import { LogOut, ShieldCheck, UserCheck, Settings, Sun, Moon, Printer, Tv } from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'summary' | 'customers' | 'monthly-payment' | 'customer-history' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currency?: SupportedCurrency;
  onOpenRecordModal: () => void;
  analytics?: AnalyticsOverview | null;
  currentUser?: User | null;
  onLogout?: () => void;
  staffPrivileges?: StaffPrivileges;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currency = 'LKR',
  currentUser,
  onLogout,
  staffPrivileges = DEFAULT_STAFF_PRIVILEGES,
  theme = 'dark',
  onToggleTheme,
}) => {
  const baseNavLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Income & Expenses' },
    { id: 'summary', label: 'Total Summary' },
    { id: 'customers', label: 'Customers' },
    { id: 'monthly-payment', label: 'Monthly Payment' },
    { id: 'customer-history', label: 'Payment History' },
  ] as const;

  // Filter links dynamically based on user role and Admin-configured Staff Privileges
  const visibleNavLinks = [
    ...baseNavLinks.filter((link) => {
      if (currentUser?.role === 'STAFF') {
        const privilegeKey = link.id as keyof StaffPrivileges;
        return staffPrivileges[privilegeKey] !== false;
      }
      return true; // Admin has access to all pages
    }),
    ...(currentUser ? [{ id: 'settings' as const, label: currentUser.role === 'STAFF' ? 'Thermal Printer' : 'Settings' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand logo */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 text-left font-extrabold tracking-tight text-slate-900 dark:text-white hover:opacity-90 transition-opacity shrink-0 text-base sm:text-lg cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25">
            <Tv className="w-4 h-4" />
          </div>
          <span><span className="text-emerald-600 dark:text-emerald-400">ASK</span> Cable</span>
        </button>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold">
          {visibleNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab(link.id as any)}
                className={`relative py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {link.id === 'settings' && (
                  currentUser?.role === 'STAFF' ? (
                    <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )
                )}
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* LKR Currency Indicator */}
          <div
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 rounded-xl"
            title="Standard Sri Lankan Rupee (LKR)"
          >
            <span>{CURRENCY_CONF.symbol.trim()}</span>
            <span>{CURRENCY_CONF.code}</span>
          </div>

          {/* Theme Mode Switcher Toggle */}
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

          {/* User Profile & Role Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-2 sm:pl-3">
              <button
                onClick={() => onSelectTab('settings')}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  currentTab === 'settings'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900'
                }`}
                title={currentUser.role === 'STAFF' ? 'Bluetooth Thermal Printer Settings' : 'Admin Settings & Staff Privileges'}
              >
                {currentUser.role === 'STAFF' ? (
                  <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
              </button>

              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                }`}
                title={`Logged in as ${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{currentUser.role}</span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 dark:text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Subnav Strip */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-200/80 dark:border-white/[0.08] px-3 py-2 gap-2 text-xs font-semibold scrollbar-none items-center bg-slate-50/90 dark:bg-[#0c121e]/90">
        {visibleNavLinks.map((link) => {
          const isActive = currentTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => onSelectTab(link.id as any)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800'
              }`}
            >
              {link.id === 'settings' && <Settings className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
              {link.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
