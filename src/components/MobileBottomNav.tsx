import React from 'react';
import { NavTab } from './Sidebar.js';
import {
  LayoutDashboard,
  Banknote,
  CalendarCheck,
  Users,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobileMenu: () => void;
  pendingBillsCount?: number;
  customersCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMobileMenu,
  pendingBillsCount = 0,
}) => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-2 py-1.5 safe-area-bottom select-none transition-colors"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentTab === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-5 h-5" />
            {currentTab === 'dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-medium">Home</span>
        </button>

        {/* 2. Collect Payment (Hero POS Action) */}
        <button
          type="button"
          onClick={() => onSelectTab('payment-collection')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentTab === 'payment-collection'
              ? 'text-teal-600 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-teal-600'
          }`}
        >
          <div
            className={`relative p-1.5 rounded-xl transition-transform active:scale-95 ${
              currentTab === 'payment-collection'
                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Banknote className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">Collect</span>
        </button>

        {/* 3. Monthly Bills Ledger */}
        <button
          type="button"
          onClick={() => onSelectTab('monthly-payment')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentTab === 'monthly-payment'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CalendarCheck className="w-5 h-5" />
            {pendingBillsCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-[14px] text-[9px] font-mono font-bold bg-amber-500 text-white rounded-full flex items-center justify-center leading-none">
                {pendingBillsCount > 99 ? '99+' : pendingBillsCount}
              </span>
            )}
            {currentTab === 'monthly-payment' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-medium">Bills</span>
        </button>

        {/* 4. Subscribers Directory */}
        <button
          type="button"
          onClick={() => onSelectTab('customers')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] ${
            currentTab === 'customers'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {currentTab === 'customers' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-medium">Subscribers</span>
        </button>

        {/* 5. More Menu Drawer */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer min-h-[46px] active:scale-95"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
};
