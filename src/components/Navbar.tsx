import React from 'react';
import { AnalyticsOverview, SupportedCurrency, User, StaffPrivileges, DEFAULT_STAFF_PRIVILEGES } from '../types/finance.js';
import { CURRENCY_CONF } from '../api/client.js';
import { LogOut, ShieldCheck, UserCheck, Settings } from 'lucide-react';

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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currency = 'LKR',
  onOpenRecordModal,
  analytics,
  currentUser,
  onLogout,
  staffPrivileges = DEFAULT_STAFF_PRIVILEGES,
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
    ...(currentUser?.role === 'ADMIN' ? [{ id: 'settings' as const, label: 'Settings' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand logo */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="text-left font-bold tracking-tight text-white hover:text-neutral-200 transition-colors shrink-0 text-base sm:text-lg"
        >
          <span className="text-emerald-400">ASK</span> Cable
        </button>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {visibleNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab(link.id as any)}
                className={`relative py-1 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {link.id === 'settings' && <Settings className="w-3.5 h-3.5 text-emerald-400" />}
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* LKR Currency Indicator */}
          <div
            className="hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-mono font-medium text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 rounded-md"
            title="Standard Sri Lankan Rupee (LKR)"
          >
            <span>{CURRENCY_CONF.symbol.trim()}</span>
            <span>{CURRENCY_CONF.code}</span>
          </div>

          {/* User Profile & Role Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 border-l border-neutral-800 pl-2 sm:pl-3">
              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={() => onSelectTab('settings')}
                  className={`p-1.5 rounded-md transition-colors ${
                    currentTab === 'settings'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                  title="Admin Settings & Staff Privileges"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              <div
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-bold ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
                title={`Logged in as ${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <UserCheck className="w-3 h-3 text-indigo-400" />
                )}
                <span>{currentUser.role}</span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded-md transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Subnav Strip */}
      <div className="flex md:hidden overflow-x-auto border-t border-neutral-850 px-3 py-2 gap-1.5 text-xs font-medium scrollbar-none items-center">
        {visibleNavLinks.map((link) => {
          const isActive = currentTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => onSelectTab(link.id as any)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
