import React from 'react';
import { AnalyticsOverview, SupportedCurrency } from '../types/finance.js';
import { CURRENCY_CONF, formatMoney } from '../api/client.js';
import { Plus, Wallet } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'transactions' | 'summary';
  onSelectTab: (tab: 'dashboard' | 'transactions' | 'summary') => void;
  currency?: SupportedCurrency;
  onOpenRecordModal: () => void;
  analytics?: AnalyticsOverview | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currency = 'LKR',
  onOpenRecordModal,
  analytics,
}) => {
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Income & Expenses' },
    { id: 'summary', label: 'Total Summary' },
  ] as const;

  const netWorth = analytics?.netWorth ?? 0;
  const isPositive = netWorth >= 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand logo */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="text-left font-semibold tracking-tight text-white hover:text-neutral-200 transition-colors shrink-0"
        >
          <span className="text-emerald-400">ASK</span> Cable
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab(link.id as any)}
                className={`relative py-1 transition-colors whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* LKR Currency Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 rounded-md"
            title="Standard Sri Lankan Rupee (LKR)"
          >
            <span>{CURRENCY_CONF.symbol.trim()}</span>
            <span>{CURRENCY_CONF.code}</span>
          </div>

          {/* Quick Record Action */}
          <button
            onClick={onOpenRecordModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Mobile Subnav Strip */}
      <div className="flex md:hidden overflow-x-auto border-t border-neutral-850 px-3 py-1.5 gap-4 text-xs font-medium scrollbar-none items-center justify-between">
        <div className="flex items-center gap-4">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onSelectTab(link.id as any)}
              className={`whitespace-nowrap py-1 ${
                currentTab === link.id ? 'text-emerald-400 font-semibold' : 'text-neutral-400'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
