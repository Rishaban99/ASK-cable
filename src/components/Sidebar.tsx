import React, { useState } from 'react';
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
  Banknote
} from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'summary' | 'customers' | 'monthly-payment' | 'customer-history' | 'payment-collection' | 'settings';

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
      if (item.id === 'settings') return false;
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

  const currentTabLabel = ALL_NAV_ITEMS.find((i) => i.id === currentTab)?.label || 'Dashboard';

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1. MOBILE TOP HEADER BAR (Mobile Only: block md:hidden) */}
      {/* ------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 flex md:hidden items-center justify-between px-4 h-14 bg-neutral-950/95 border-b border-neutral-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-md transition-colors cursor-pointer"
            aria-label="Open Side Menu"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white tracking-tight">
              <span className="text-emerald-400">ASK</span> Cable
            </span>
            <span className="text-xs text-neutral-500 font-medium border-l border-neutral-800 pl-2">
              {currentTabLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-md transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* 2. MOBILE SIDEBAR DRAWER OVERLAY (Mobile Only) */}
      {/* ------------------------------------------------------------------- */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[80vw] bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between h-full z-10 p-4 space-y-4 shadow-2xl animate-slide-in-left">
            <div className="space-y-6 overflow-y-auto">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white tracking-tight text-base">
                      <span className="text-emerald-400">ASK</span> Cable
                    </h2>
                    <p className="text-[10px] text-neutral-400 font-mono">Subscription ERP</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu Links */}
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2 px-2">
                    Main Menu
                  </p>
                  <div className="space-y-1">
                    {mainSectionItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {adminSectionItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2 px-2">
                      Admin Tools
                    </p>
                    <div className="space-y-1">
                      {adminSectionItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Drawer Footer User Profile */}
            <div className="pt-3 border-t border-neutral-800 space-y-3">
              {currentUser && (
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center font-bold text-xs">
                        {currentUser.name ? currentUser.name.charAt(0) : currentUser.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[120px]">{currentUser.name}</p>
                        <p className="text-[10px] font-mono text-neutral-400">{currentUser.username}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        currentUser.role === 'ADMIN'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setIsMobileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. DESKTOP FIXED SIDEBAR MENU (Desktop Only: hidden md:flex) */}
      {/* ------------------------------------------------------------------- */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 fixed inset-y-0 left-0 z-30 border-r border-neutral-800 bg-neutral-950/95 backdrop-blur-md p-4 justify-between h-screen select-none">
        <div className="space-y-6 overflow-y-auto pr-1 scrollbar-thin">
          {/* Brand Logo & ERP Title */}
          <div className="flex items-center gap-3 px-2 border-b border-neutral-800 pb-4">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-md">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <button
                onClick={() => onSelectTab('dashboard')}
                className="text-left font-bold text-lg text-white tracking-tight hover:text-emerald-300 transition-colors"
              >
                <span className="text-emerald-400">ASK</span> Cable
              </button>
              <p className="text-[11px] text-neutral-400 font-mono tracking-wide">
                Cable ERP System
              </p>
            </div>
          </div>

          {/* Main Navigation Links */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2.5 px-3">
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm font-bold'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin Tools Section */}
            {adminSectionItems.length > 0 && (
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2.5 px-3">
                  Admin Tools
                </p>
                <div className="space-y-1">
                  {adminSectionItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm font-bold'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-900/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
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
        <div className="pt-3 border-t border-neutral-800 space-y-3">
          {/* LKR Currency & Theme Controls Row */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
              title="Standard Sri Lankan Rupee (LKR)"
            >
              <span>{CURRENCY_CONF.symbol.trim()}</span>
              <span>{CURRENCY_CONF.code}</span>
            </div>

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px]">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[11px]">Dark</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Logged in User Profile Card */}
          {currentUser && (
            <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0) : currentUser.username.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] font-mono text-neutral-400 truncate">@{currentUser.username}</p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                  title={`Role: ${currentUser.role}`}
                >
                  {currentUser.role === 'ADMIN' ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <UserCheck className="w-3 h-3 text-indigo-400" />
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
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-rose-500/10 border border-neutral-800 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
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
