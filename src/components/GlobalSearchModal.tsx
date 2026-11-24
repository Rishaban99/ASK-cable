import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, MonthlyPayment } from '../types/finance.js';
import { NavTab } from './Sidebar.js';
import {
  Search,
  X,
  Users,
  Tv,
  CalendarCheck,
  Receipt,
  LayoutDashboard,
  Banknote,
  History,
  Settings,
  PieChart,
  ArrowRight,
  ShieldCheck,
  Box,
  Phone,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  monthlyPayments: MonthlyPayment[];
  onNavigateToTab: (tab: NavTab) => void;
  onSelectCustomerHistory?: (customerId: string) => void;
  onCollectCustomerPayment?: (customerId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  customers,
  onNavigateToTab,
  onSelectCustomerHistory,
  onCollectCustomerPayment,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Navigation commands
  const pages = useMemo(
    () => [
      { id: 'dashboard' as NavTab, label: 'Dashboard Overview', icon: LayoutDashboard, category: 'Navigation' },
      { id: 'payment-collection' as NavTab, label: 'Collect Payment (Field POS)', icon: Banknote, category: 'Navigation' },
      { id: 'customers' as NavTab, label: 'Customer Directory & New Registration', icon: Users, category: 'Navigation' },
      { id: 'monthly-payment' as NavTab, label: 'Monthly Billing Ledger', icon: CalendarCheck, category: 'Navigation' },
      { id: 'customer-history' as NavTab, label: 'Customer Payment History & Statements', icon: History, category: 'Navigation' },
      { id: 'packages' as NavTab, label: 'Cable TV Packages & Rates', icon: Tv, category: 'Navigation' },
      { id: 'transactions' as NavTab, label: 'Income & Expense Book', icon: Receipt, category: 'Navigation' },
      { id: 'summary' as NavTab, label: 'Total Financial Summary & AI Insights', icon: PieChart, category: 'Navigation' },
      { id: 'settings' as NavTab, label: 'System Settings, Privileges & Printer', icon: Settings, category: 'Navigation' },
    ],
    []
  );

  const filteredPages = useMemo(() => {
    if (!query.trim()) return pages;
    const q = query.toLowerCase();
    return pages.filter((p) => p.label.toLowerCase().includes(q));
  }, [query, pages]);

  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return customers.slice(0, 5);
    const q = query.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.boxNo.toLowerCase().includes(q) ||
          c.phoneNo.toLowerCase().includes(q) ||
          c.nicNo.toLowerCase().includes(q) ||
          (c.address && c.address.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [query, customers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, box number, phone, or jump to page... (ESC to close)"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 rounded">
            ESC
          </span>
        </div>

        {/* Search Results Area */}
        <div className="overflow-y-auto p-3 space-y-4 max-h-[60vh] scrollbar-thin">
          {/* Customers Section */}
          {filteredCustomers.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Subscribers & Customers ({filteredCustomers.length})</span>
                <span className="text-[9px] font-normal lowercase">click to open payment history</span>
              </div>
              <div className="space-y-1 mt-1">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (onSelectCustomerHistory) onSelectCustomerHistory(c.id);
                      else onNavigateToTab('customer-history');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {c.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Box #{c.boxNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{c.phoneNo}</span>
                          <span>•</span>
                          <span className="truncate">{c.address}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`badge-status ${
                          c.status === 'ACTIVE' || !c.status
                            ? 'badge-success'
                            : c.status === 'INACTIVE'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {c.status || 'ACTIVE'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Page Navigation */}
          {filteredPages.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                System Sections
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                {filteredPages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <button
                      key={page.id}
                      onClick={() => {
                        onNavigateToTab(page.id);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08]"
                    >
                      <div className="p-1.5 rounded-lg bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                        {page.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredCustomers.length === 0 && filteredPages.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No matching customers or sections found for "{query}".
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">ESC</kbd> to exit</span>
          </div>
          <span className="font-medium text-slate-600 dark:text-slate-300">ASK Cable Global Omnibox</span>
        </div>
      </div>
    </div>
  );
};
