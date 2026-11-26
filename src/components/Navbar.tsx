import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  StaffPrivileges,
  DEFAULT_STAFF_PRIVILEGES,
  SupportedCurrency,
  Customer,
  MonthlyPayment,
} from '../types/finance.js';
import { CURRENCY_CONF, formatMoney } from '../api/client.js';
import { NavTab } from './Sidebar.js';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ShieldCheck,
  UserCheck,
  LogOut,
  Settings,
  Printer,
  Menu,
  ChevronDown,
  Plus,
  UserPlus,
  Banknote,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currency?: SupportedCurrency;
  currentUser?: User | null;
  onLogout?: () => void;
  staffPrivileges?: StaffPrivileges;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenRecordModal?: () => void;
  onOpenCustomerRegistration?: () => void;
  onOpenGlobalSearch?: () => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  customers?: Customer[];
  monthlyPayments?: MonthlyPayment[];
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
  onOpenRecordModal,
  onOpenCustomerRegistration,
  onOpenGlobalSearch,
  onToggleMobileSidebar,
  customers = [],
  monthlyPayments = [],
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live notifications based on actual database data
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const pendingPaymentsCount = monthlyPayments.filter(
    (p) => p.month === currentMonthStr && (p.balanceAmount || 0) > 0
  ).length;
  const pendingAmountSum = monthlyPayments
    .filter((p) => p.month === currentMonthStr)
    .reduce((acc, p) => acc + (p.balanceAmount || 0), 0);

  const inactiveCustomersCount = customers.filter((c) => c.status && c.status !== 'ACTIVE').length;

  const notifications = [
    ...(pendingPaymentsCount > 0
      ? [
        {
          id: 'pending-bills',
          title: `${pendingPaymentsCount} Pending Bills (${currentMonthStr})`,
          description: `Outstanding balance of ${formatMoney(pendingAmountSum, currency)} awaiting collection`,
          type: 'warning' as const,
          tab: 'monthly-payment' as NavTab,
          time: 'Current Month',
        },
      ]
      : []),
    ...(inactiveCustomersCount > 0
      ? [
        {
          id: 'inactive-cust',
          title: `${inactiveCustomersCount} Inactive Subscribers`,
          description: 'Subscribers marked Inactive or Disconnected',
          type: 'info' as const,
          tab: 'customers' as NavTab,
          time: 'System Audit',
        },
      ]
      : []),
    {
      id: 'system-online',
      title: 'ASK Cable ERP Online',
      description: 'LKR database & billing services synchronized',
      type: 'success' as const,
      tab: 'dashboard' as NavTab,
      time: 'Just now',
    },
  ];

  // Breadcrumb mapping
  const getBreadcrumb = () => {
    switch (currentTab) {
      case 'dashboard':
        return { section: 'Operations', page: 'Dashboard Overview' };
      case 'payment-collection':
        return { section: 'Operations', page: 'Collect Payment (POS)' };
      case 'monthly-payment':
        return { section: 'Operations', page: 'Monthly Billing Ledger' };
      case 'customers':
        return { section: 'Subscribers', page: 'Customer Directory' };
      case 'customer-history':
        return { section: 'Subscribers', page: 'Payment History & Ledger' };
      case 'packages':
        return { section: 'Subscribers', page: 'TV Packages & Rental' };
      case 'transactions':
        return { section: 'Financials', page: 'Income & Expense Book' };
      case 'summary':
        return { section: 'Financials', page: 'Total Financial Summary' };
      case 'settings':
        return {
          section: 'System',
          page: currentUser?.role === 'STAFF' ? 'Thermal Printer Setup' : 'Settings & Privileges',
        };
      default:
        return { section: 'Portal', page: 'Dashboard' };
    }
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/[0.08] px-4 sm:px-6 flex items-center justify-between transition-colors shadow-xs">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Sidebar Hamburger */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </button>
        )}

        {/* Breadcrumb Navigation / Mobile Brand Display */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          {/* Mobile Brand Button (< sm) */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-1.5 sm:hidden font-black text-slate-900 dark:text-white shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="p-1 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Tv className="w-3.5 h-3.5" />
            </div>
            <span className="tracking-tight text-xs font-black">ASK</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700 sm:hidden">/</span>

          {/* Desktop Breadcrumbs (sm+) */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className="font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors hidden sm:inline-block cursor-pointer"
          >
            ASK Cable
          </button>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline-block">/</span>
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline-block">
            {breadcrumb.section}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline-block">/</span>
          <span className="font-bold text-slate-900 dark:text-white truncate">
            {breadcrumb.page}
          </span>
        </div>
      </div>

      {/* Middle: Global Search Trigger */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
        <button
          onClick={onOpenGlobalSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-400 dark:text-slate-400 hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>Search subscribers, box #, or jump to page...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Actions, Notifications, Theme & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenGlobalSearch}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Search (Ctrl + K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Quick Action: Customer Registration Form */}
        {onOpenCustomerRegistration && (
          <button
            onClick={onOpenCustomerRegistration}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Customer Registration Form"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span></span>
          </button>
        )}

        {/* Quick Action: Collect Payment (Primary highlight) */}
        <button
          onClick={() => onSelectTab('payment-collection')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-teal-600/25 active:scale-95"
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Collect</span>
        </button>

        {/* LKR Currency Badge */}
        <div
          className="hidden xl:flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] rounded-xl"
          title="Sri Lankan Rupee (LKR)"
        >
          <span>{CURRENCY_CONF.symbol.trim()}</span>
          <span>{CURRENCY_CONF.code}</span>
        </div>

        {/* Theme Mode Switcher */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-xs hover:border-slate-300 dark:hover:border-slate-700 border border-transparent"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>
        )}

        {/* Notification Center Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-xs"
            title="Notification Center"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-[#0F172A]" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Notifications
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {notifications.length} New
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.tab);
                      setIsNotificationsOpen(false);
                    }}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${item.type === 'warning'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : item.type === 'info'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                    >
                      {item.type === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : item.type === 'info' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 block">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 text-center">
                <button
                  onClick={() => {
                    onSelectTab('dashboard');
                    setIsNotificationsOpen(false);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Operations Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        {currentUser && (
          <div className="relative border-l border-slate-200 dark:border-slate-800 pl-2 sm:pl-2.5" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center uppercase shadow-xs">
                {currentUser.name ? currentUser.name.charAt(0) : currentUser.username.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight truncate max-w-[110px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                {/* Profile Header */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/[0.04]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    @{currentUser.username}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`badge-status ${currentUser.role === 'ADMIN' ? 'badge-royal' : 'badge-teal'
                        }`}
                    >
                      {currentUser.role === 'ADMIN' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <UserCheck className="w-3 h-3" />
                      )}
                      <span>{currentUser.role}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {currentUser.id.slice(0, 6)}
                    </span>
                  </div>
                </div>

                {/* Dropdown Links */}
                <div className="pt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      onSelectTab('settings');
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    {currentUser.role === 'STAFF' ? (
                      <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <span>
                      {currentUser.role === 'STAFF' ? 'Thermal Printer Setup' : 'System Settings'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('customer-history');
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Tv className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Customer Statements</span>
                  </button>
                </div>

                {/* Sign Out */}
                {onLogout && (
                  <div className="pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
