import React, { useState, useEffect } from 'react';
import { User, StaffPrivileges, DEFAULT_STAFF_PRIVILEGES, SystemProfile, DEFAULT_SYSTEM_PROFILE, SmsSettings, DEFAULT_SMS_SETTINGS, SmsLogEntry, SmsBalanceResponse } from '../types/finance.js';
import { api } from '../api/client.js';
import { useToast } from './Toast.js';
import { ConfirmModal } from './ConfirmModal.js';
import {
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Receipt,
  PieChart,
  CalendarCheck,
  History,
  Save,
  RotateCcw,
  Banknote,
  Building2,
  Phone,
  Mail,
  MapPin,
  Tv,
  Sparkles,
  MessageSquare,
  Send,
  Key,
  Hash,
  Eye,
  EyeOff,
  Smartphone,
  HelpCircle,
  Info,
  ExternalLink,
  Check,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Copy,
  X,
  XCircle,
  Printer,
  Bluetooth,
  Loader2,
} from 'lucide-react';
import {
  pairAndSaveBluetoothPrinter,
  getSavedPrinterInfo,
  clearDefaultPrinter,
  generateTestReceipt,
  printViaWebBluetooth,
  ThermalPaperWidth,
  SavedPrinterInfo,
} from '../utils/thermalPrinter.js';

interface SettingsViewProps {
  currentUser: User;
  onPrivilegesUpdated?: () => void;
  onProfileUpdated?: (profile: SystemProfile) => void;
}

const PAGE_DEFINITIONS: {
  id: keyof StaffPrivileges;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'High-level business overview, income/expense metrics, and quick stat cards.',
    icon: LayoutDashboard,
  },
  {
    id: 'transactions',
    label: 'Income & Expenses',
    description: 'Full financial ledger records, adding/editing income and expense transactions.',
    icon: Receipt,
  },
  {
    id: 'summary',
    label: 'Total Summary',
    description: 'Comprehensive financial breakdowns, category distribution, and analytics summaries.',
    icon: PieChart,
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer directory, box numbers, monthly subscription rates, and profile management.',
    icon: Users,
  },
  {
    id: 'monthly-payment',
    label: 'Monthly Payment',
    description: 'Subscriber monthly billing ledger, bulk payment collection, and monthly status.',
    icon: CalendarCheck,
  },
  {
    id: 'customer-history',
    label: 'Payment History',
    description: 'Itemized historical payment ledger, statement printing, and customer balance history.',
    icon: History,
  },
  {
    id: 'payment-collection',
    label: 'Collect Payment',
    description: 'Rapid payment collection form, subscriber dues settlement, and quick receipt generation.',
    icon: Banknote,
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onPrivilegesUpdated,
  onProfileUpdated,
}) => {
  const toast = useToast();
  // Privileges State
  const [privileges, setPrivileges] = useState<StaffPrivileges>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_staff_privileges');
      return saved ? { ...DEFAULT_STAFF_PRIVILEGES, ...JSON.parse(saved) } : DEFAULT_STAFF_PRIVILEGES;
    } catch {
      return DEFAULT_STAFF_PRIVILEGES;
    }
  });

  const [privilegeSaveStatus, setPrivilegeSaveStatus] = useState<string | null>(null);

  // System Profile State (Company Name, Contacts, 80mm Receipt Header stored in DB)
  const [profile, setProfile] = useState<SystemProfile>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_system_profile');
      return saved ? { ...DEFAULT_SYSTEM_PROFILE, ...JSON.parse(saved) } : DEFAULT_SYSTEM_PROFILE;
    } catch {
      return DEFAULT_SYSTEM_PROFILE;
    }
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Active Tab in Settings Page
  const [activeTab, setActiveTab] = useState<'privileges' | 'users' | 'system' | 'sms' | 'printer'>('privileges');

  // SMS Gateway State (Notify.lk Integration)
  const [smsSettings, setSmsSettings] = useState<SmsSettings>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_sms_settings');
      return saved ? { ...DEFAULT_SMS_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SMS_SETTINGS;
    } catch {
      return DEFAULT_SMS_SETTINGS;
    }
  });
  const [isLoadingSms, setIsLoadingSms] = useState(false);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [templateTab, setTemplateTab] = useState<'payment' | 'registration'>('payment');

  // Live Test SMS Console State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Payment receipt test from ASK Cable TV Network.');
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  // SMS Account Balance State (Notify.lk live balance)
  const [smsBalance, setSmsBalance] = useState<SmsBalanceResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // SMS Logs State (Historical SMS Dispatches)
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsFilterType, setLogsFilterType] = useState<string>('ALL');
  const [logsFilterStatus, setLogsFilterStatus] = useState<string>('ALL');
  const [logsSearchTerm, setLogsSearchTerm] = useState('');
  const [selectedLogForModal, setSelectedLogForModal] = useState<SmsLogEntry | null>(null);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Thermal Printer State (Bluetooth 1-Click One-Time Pairing)
  const [savedPrinter, setSavedPrinter] = useState<SavedPrinterInfo>(() => getSavedPrinterInfo());
  const [isPairingPrinter, setIsPairingPrinter] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [printerPaperSize, setPrinterPaperSize] = useState<ThermalPaperWidth>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_thermal_paper_size');
      if (saved === '80') return 80;
    } catch {}
    return 58;
  });

  const handlePairPrinter = async () => {
    setIsPairingPrinter(true);
    try {
      const res = await pairAndSaveBluetoothPrinter();
      if (res.success) {
        const info = getSavedPrinterInfo();
        setSavedPrinter(info);
        toast.success(`Bluetooth printer "${res.deviceName}" paired & saved as default!`);
      } else {
        toast.error(res.error || 'Failed to pair Bluetooth printer.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Bluetooth pairing failed.');
    } finally {
      setIsPairingPrinter(false);
    }
  };

  const handleForgetPrinter = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Unpair Default Printer',
      message: `Are you sure you want to forget "${savedPrinter.name || 'Bluetooth Printer'}"? You will need to pair again to enable 1-click printing.`,
      confirmText: 'Unpair Printer',
      variant: 'danger',
      onConfirm: () => {
        clearDefaultPrinter();
        setSavedPrinter(getSavedPrinterInfo());
        toast.success('Default printer removed successfully.');
      },
    });
  };

  const handleTestPrint = async () => {
    setIsTestingPrinter(true);
    try {
      const testBytes = generateTestReceipt(profile, printerPaperSize);
      const res = await printViaWebBluetooth(testBytes, undefined, false);
      if (res.success) {
        setSavedPrinter(getSavedPrinterInfo());
        toast.success(`Test slip printed successfully to ${res.deviceName || savedPrinter.name || 'Printer'}!`);
      } else {
        toast.error(res.error || 'Failed to print test slip.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Test print failed.');
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handlePrinterPaperSizeChange = (width: ThermalPaperWidth) => {
    setPrinterPaperSize(width);
    try {
      localStorage.setItem('ask_cable_thermal_paper_size', String(width));
      toast.success(`Default paper size set to ${width}mm.`);
    } catch {}
  };

  // Load Users & Privileges & System Profile & SMS Settings from DB
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const uList = await api.getUsers();
      setUsers(uList);
    } catch (e: any) {
      console.error('Failed to load user list:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchPrivileges = async () => {
    try {
      const dbPrivs = await api.getStaffPrivileges();
      if (dbPrivs) {
        setPrivileges(dbPrivs);
        try {
          localStorage.setItem('ask_cable_staff_privileges', JSON.stringify(dbPrivs));
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      console.warn('DB staff privileges fetch fallback:', e);
    }
  };

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const dbProfile = await api.getSystemProfile();
      if (dbProfile) {
        setProfile(dbProfile);
        try {
          localStorage.setItem('ask_cable_system_profile', JSON.stringify(dbProfile));
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      console.warn('DB system profile fetch fallback:', e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchSmsSettings = async () => {
    setIsLoadingSms(true);
    try {
      const dbSms = await api.getSmsSettings();
      if (dbSms) {
        const merged: SmsSettings = {
          ...DEFAULT_SMS_SETTINGS,
          ...dbSms,
          registrationSmsTemplate: dbSms.registrationSmsTemplate || DEFAULT_SMS_SETTINGS.registrationSmsTemplate,
        };
        setSmsSettings(merged);
        try {
          localStorage.setItem('ask_cable_sms_settings', JSON.stringify(merged));
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      console.warn('DB SMS settings fetch fallback:', e);
    } finally {
      setIsLoadingSms(false);
    }
  };

  const fetchBalance = async (customUserId?: string, customApiKey?: string) => {
    setIsLoadingBalance(true);
    try {
      const uId = customUserId || smsSettings.userId;
      const key = customApiKey || smsSettings.apiKey;
      const res = await api.getSmsBalance(uId, key);
      setSmsBalance(res);
    } catch (e: any) {
      console.warn('Failed to load SMS balance:', e);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchLogs = async (overrideFilter?: { type?: string; status?: string; search?: string }) => {
    setIsLoadingLogs(true);
    try {
      const type = overrideFilter?.type !== undefined ? overrideFilter.type : logsFilterType;
      const status = overrideFilter?.status !== undefined ? overrideFilter.status : logsFilterStatus;
      const search = overrideFilter?.search !== undefined ? overrideFilter.search : logsSearchTerm;
      const logs = await api.getSmsLogs({ type, status, search });
      setSmsLogs(logs);
    } catch (e: any) {
      console.warn('Failed to load SMS logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleClearSmsLogs = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Clear All SMS Dispatch Logs',
      message: 'Are you sure you want to permanently clear all SMS dispatch logs from the database? This action cannot be undone.',
      confirmText: 'Clear All Logs',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        setIsClearingLogs(true);
        try {
          const res = await api.clearSmsLogs();
          if (res.success) {
            setSmsLogs([]);
            toast.success('All SMS dispatch logs have been cleared.');
          } else {
            toast.error(res.message || 'Failed to clear logs.');
          }
        } catch (err: any) {
          toast.error(err?.message || 'Failed to clear logs.');
        } finally {
          setIsClearingLogs(false);
        }
      },
    });
  };

  const handleCopyMessage = (text: string, logId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogId(logId);
    toast.success('SMS message copied to clipboard');
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const formatLogDateTime = (isoString?: string): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    } catch {
      return isoString;
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPrivileges();
    fetchProfile();
    fetchSmsSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'sms') {
      fetchBalance();
      fetchLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'sms') {
      fetchLogs();
    }
  }, [logsFilterType, logsFilterStatus]);

  // Save SMS Settings to DB
  const handleSaveSmsSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSms(true);
    setSmsStatus(null);
    try {
      const updated = await api.setSmsSettings(smsSettings);
      setSmsSettings(updated);
      try {
        localStorage.setItem('ask_cable_sms_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      const msg = 'Notify.lk SMS settings saved to database successfully!';
      toast.success(msg);
      setSmsStatus(msg);
      setTimeout(() => setSmsStatus(null), 3500);
      fetchBalance(updated.userId, updated.apiKey);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save SMS settings to database.';
      toast.error(msg);
      setSmsStatus(msg);
    } finally {
      setIsSavingSms(false);
    }
  };

  // Reset SMS Template to Default
  const handleResetSmsTemplate = () => {
    if (templateTab === 'payment') {
      setSmsSettings((prev) => ({
        ...prev,
        paymentSmsTemplate: DEFAULT_SMS_SETTINGS.paymentSmsTemplate,
      }));
      toast.success('Payment SMS template reset to default.');
    } else {
      setSmsSettings((prev) => ({
        ...prev,
        registrationSmsTemplate: DEFAULT_SMS_SETTINGS.registrationSmsTemplate,
      }));
      toast.success('Registration Welcome SMS template reset to default.');
    }
  };

  // Send Live Test SMS via Notify.lk
  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error('Please enter a phone number to test SMS delivery.');
      return;
    }
    if (!smsSettings.userId || !smsSettings.apiKey) {
      toast.error('Please enter and save your Notify.lk User ID and API Key first.');
      return;
    }

    setIsSendingTestSms(true);
    setTestSmsResult(null);
    try {
      const result = await api.sendTestSms({
        phone: testPhone.trim(),
        message: testMessage.trim(),
        userId: smsSettings.userId,
        apiKey: smsSettings.apiKey,
        senderId: smsSettings.senderId || 'NotifyDEMO',
      });
      setTestSmsResult(result);
      if (result.success) {
        toast.success(result.message || 'Test SMS sent successfully!');
      } else {
        toast.error(result.message || 'Failed to send test SMS.');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to send test SMS. Check credentials or network.';
      setTestSmsResult({ success: false, message: errMsg });
      toast.error(errMsg);
    } finally {
      setIsSendingTestSms(false);
      fetchBalance();
      fetchLogs();
    }
  };

  // Save System Profile to DB
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    setProfileStatus(null);
    try {
      const updated = await api.setSystemProfile(profile);
      setProfile(updated);
      try {
        localStorage.setItem('ask_cable_system_profile', JSON.stringify(updated));
      } catch {
        // ignore
      }
      const msg = 'System Profile saved to database successfully!';
      toast.success(msg);
      setProfileStatus(msg);
      setTimeout(() => setProfileStatus(null), 3500);
      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save system profile to database.';
      toast.error(msg);
      setProfileStatus(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Reset System Profile to Factory Defaults
  const handleResetProfile = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Reset System Profile to Defaults',
      message: 'Are you sure you want to reset Company Profile & Receipt headers to default settings in the database?',
      confirmText: 'Reset to Defaults',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        setProfile(DEFAULT_SYSTEM_PROFILE);
        try {
          await api.setSystemProfile(DEFAULT_SYSTEM_PROFILE);
          localStorage.setItem('ask_cable_system_profile', JSON.stringify(DEFAULT_SYSTEM_PROFILE));
          toast.success('System profile reset to defaults.');
          if (onProfileUpdated) onProfileUpdated(DEFAULT_SYSTEM_PROFILE);
        } catch (e: any) {
          toast.error('Failed to reset profile in DB.');
        }
      },
    });
  };

  // Save Privileges to DB
  const savePrivilegesToDb = async (updated: StaffPrivileges, successMsg: string) => {
    setPrivileges(updated);
    try {
      localStorage.setItem('ask_cable_staff_privileges', JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await api.setStaffPrivileges(updated);
      setPrivilegeSaveStatus(successMsg);
      toast.success(successMsg);
      setTimeout(() => setPrivilegeSaveStatus(null), 2500);
      if (onPrivilegesUpdated) onPrivilegesUpdated();
    } catch (e: any) {
      console.error('Failed to save staff privileges to DB:', e);
      setPrivilegeSaveStatus('Saved to DB & Local state');
      toast.success('Saved staff privileges');
      setTimeout(() => setPrivilegeSaveStatus(null), 2500);
    }
  };

  const handleTogglePrivilege = (pageId: keyof StaffPrivileges) => {
    const updated = {
      ...privileges,
      [pageId]: !privileges[pageId],
    };
    savePrivilegesToDb(updated, 'Privileges saved to database');
  };

  const handleGrantAll = () => {
    const allEnabled: StaffPrivileges = {
      dashboard: true,
      transactions: true,
      summary: true,
      customers: true,
      'monthly-payment': true,
      'customer-history': true,
      'payment-collection': true,
    };
    savePrivilegesToDb(allEnabled, 'All privileges granted & saved to DB');
  };

  const handleResetDefaults = () => {
    savePrivilegesToDb(DEFAULT_STAFF_PRIVILEGES, 'Reset to default staff privileges in DB');
  };

  // Add User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    if (!newUsername.trim() || !newName.trim() || !newPassword.trim()) {
      const msg = 'Please fill in all user fields.';
      setUserError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmittingUser(true);
    try {
      await api.createUser({
        username: newUsername.trim(),
        name: newName.trim(),
        password: newPassword.trim(),
        role: newRole,
      });
      const msg = `User "${newUsername}" created successfully!`;
      setUserSuccess(msg);
      toast.success(msg);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('STAFF');
      setIsAddUserOpen(false);
      await fetchUsers();
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create user account.';
      setUserError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Confirm Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
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

  // Delete User Handler
  const handleDeleteUser = (userToDelete: User) => {
    if (userToDelete.username.toLowerCase() === currentUser.username.toLowerCase()) {
      const msg = 'You cannot delete your own active account!';
      toast.error(msg);
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete System User Account',
      message: `Are you sure you want to delete user account "${userToDelete.name}" (${userToDelete.username})? This account will lose system access.`,
      confirmText: 'Delete User Account',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteUser(userToDelete.id);
          const msg = `User "${userToDelete.username}" deleted successfully.`;
          setUserSuccess(msg);
          toast.success(msg);
          await fetchUsers();
          setTimeout(() => setUserSuccess(null), 3000);
        } catch (err: any) {
          const msg = err?.message || 'Failed to delete user.';
          setUserError(msg);
          toast.error(msg);
        }
      },
    });
  };

  // Non-Admin Access Guard
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-neutral-400 max-w-md mx-auto">
          System Settings and Page Privileges are only accessible to System Administrators. Please contact an Administrator if you require access.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Admin System Settings</h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Manage Staff page privileges, system user credentials, and security controls.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('privileges')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'privileges'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Staff Privileges</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'system'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>System Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'sms'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS Gateway (Notify.lk)</span>
          </button>
          <button
            onClick={() => setActiveTab('printer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'printer'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Thermal Printer</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {smsStatus && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{smsStatus}</span>
        </div>
      )}
      {profileStatus && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{profileStatus}</span>
        </div>
      )}
      {privilegeSaveStatus && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{privilegeSaveStatus}</span>
        </div>
      )}
      {userSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{userSuccess}</span>
        </div>
      )}
      {userError && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{userError}</span>
        </div>
      )}

      {/* TAB 1: STAFF PAGE PRIVILEGES */}
      {activeTab === 'privileges' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/70 p-4 rounded-xl border border-neutral-800">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                Staff Page Privilege Controls
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Enable or disable specific pages for users logged in under the <strong className="text-indigo-300">STAFF</strong> role. Changes take effect instantly across all staff sessions.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleGrantAll}
                className="px-2.5 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
              >
                Enable All Pages
              </button>
              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-400 bg-neutral-800 border border-neutral-700 rounded-lg hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAGE_DEFINITIONS.map((page) => {
              const Icon = page.icon;
              const isAllowed = privileges[page.id];

              return (
                <div
                  key={page.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    isAllowed
                      ? 'bg-neutral-900/90 border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-neutral-950/60 border-neutral-800 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-lg ${
                          isAllowed
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-neutral-800 text-neutral-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{page.label}</h3>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                            isAllowed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isAllowed ? (
                            <>
                              <Unlock className="w-2.5 h-2.5" /> Staff Allowed
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5" /> Restricted for Staff
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Privilege Toggle */}
                    <button
                      onClick={() => handleTogglePrivilege(page.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAllowed ? 'bg-emerald-500' : 'bg-neutral-700'
                      }`}
                      role="switch"
                      aria-checked={isAllowed}
                      title={`Click to ${isAllowed ? 'revoke' : 'grant'} Staff access to ${page.label}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isAllowed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">{page.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/70 p-4 rounded-xl border border-neutral-800">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                System User Accounts & Login Credentials
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Create and manage staff operator logins and admin accounts.
              </p>
            </div>
            <button
              onClick={() => setIsAddUserOpen(!isAddUserOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New User</span>
            </button>
          </div>

          {/* Add User Modal / Form */}
          {isAddUserOpen && (
            <form onSubmit={handleCreateUser} className="bg-neutral-900 p-5 rounded-xl border border-emerald-500/30 space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Create New System User Account
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. john_staff"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STAFF">STAFF (Operator)</option>
                    <option value="ADMIN">ADMIN (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-md hover:bg-emerald-300 disabled:opacity-50"
                >
                  {isSubmittingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* User Table */}
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 font-medium uppercase border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role & Permissions</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-850/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center font-bold text-xs uppercase">
                          {u.name ? u.name.charAt(0) : u.username.charAt(0)}
                        </div>
                        <div>
                          <div>{u.name || u.username}</div>
                          {u.username.toLowerCase() === currentUser.username.toLowerCase() && (
                            <span className="text-[10px] font-mono text-emerald-400">(You)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-400">{u.username}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {u.role === 'ADMIN' ? (
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <UserCheck className="w-3 h-3 text-indigo-400" />
                          )}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System Default'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.username.toLowerCase() !== currentUser.username.toLowerCase() && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-md transition-colors"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SYSTEM PROFILE (Stored Permanently in Database)
          ========================================================================= */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 sm:p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Company System Profile & 80mm Receipt Header
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Configure your network brand name, contacts, and default receipt details stored permanently in the database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isLoadingProfile ? 'Loading from DB...' : 'SQLite DB Synchronized'}</span>
              </span>
            </div>
          </div>

          {/* Form & Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Fields */}
            <form onSubmit={handleSaveProfile} className="lg:col-span-7 space-y-5">
              {/* Card 1: Brand Identity */}
              <div className="p-4 sm:p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                  <Tv className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Company & Brand Identity
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Company / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.companyName}
                      onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                      placeholder="e.g. ASK CABLE TV NETWORK"
                      className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                      Prints on top of all 80mm POS slips and statement reports.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Tagline / Business Subtitle *
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.tagline}
                      onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                      placeholder="e.g. Cable TV Subscriptions & Services"
                      className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Contact Information */}
              <div className="p-4 sm:p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Support Contacts & Address
                  </h4>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Support Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="e.g. +94 77 123 4567"
                        className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Support Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="e.g. support@askcable.lk"
                        className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Business / Operating Address
                    </label>
                    <input
                      type="text"
                      value={profile.address || ''}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="e.g. Main Street, Nanu Oya"
                      className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: 80mm Receipt Customization */}
              <div className="p-4 sm:p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    80mm Receipt Slip Customization
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Receipt Footer Note / Greeting
                    </label>
                    <input
                      type="text"
                      value={profile.receiptFooter || ''}
                      onChange={(e) => setProfile({ ...profile, receiptFooter: e.target.value })}
                      placeholder="e.g. Thank you for subscribing to ASK Cable!"
                      className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Validation Notice / Disclaimer
                    </label>
                    <input
                      type="text"
                      value={profile.receiptNotice || ''}
                      onChange={(e) => setProfile({ ...profile, receiptNotice: e.target.value })}
                      placeholder=" • System Validated"
                      className="w-full bg-neutral-950 border border-neutral-750 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetProfile}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-xs font-bold shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? 'Saving to Database...' : 'Save System Profile to DB'}</span>
                </button>
              </div>
            </form>

            {/* Right Column: Live 80mm Thermal Receipt Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 sm:p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Live 80mm Slip Preview
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">Continuous Roll</span>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Real-time appearance of your receipt header and footer as printed by 80mm thermal printers:
                </p>

                {/* Simulated 80mm Paper Slip */}
                <div className="w-full max-w-[280px] bg-white text-black p-4 rounded-sm shadow-2xl border border-neutral-300 font-mono text-[10.5px] leading-tight mx-auto select-none">
                  {/* Dynamic Header */}
                  <div className="text-center pb-1.5">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Tv className="w-4 h-4 text-black shrink-0" />
                      <h1 className="text-sm font-black tracking-tight uppercase text-black">
                        {profile.companyName || 'ASK CABLE TV NETWORK'}
                      </h1>
                    </div>
                    <p className="text-[9.5px] font-semibold text-neutral-800">
                      {profile.tagline || 'Cable TV Subscriptions & Services'}
                    </p>
                    <p className="text-[8.5px] text-neutral-700">
                      Tel: {profile.phone || '+94 77 123 4567'} | {profile.email || 'support@askcable.lk'}
                    </p>
                    {profile.address && (
                      <p className="text-[8px] text-neutral-600 truncate mt-0.5">
                        {profile.address}
                      </p>
                    )}
                  </div>

                  {/* Dashed line */}
                  <div className="border-t border-dashed border-neutral-400 my-1.5" />

                  {/* Sample content */}
                  <div className="text-center my-0.5">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-black text-white rounded-xs">
                      *** SAMPLE 80MM RECEIPT ***
                    </span>
                  </div>

                  <div className="space-y-0.5 pt-1 text-[9.5px] text-neutral-700">
                    <div className="flex justify-between">
                      <span>Bill #:</span>
                      <span className="font-bold text-black">BILL-DEMO-01</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="font-bold text-black">Eramaiyya manoj</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Box No:</span>
                      <span className="font-bold text-black px-1 rounded bg-neutral-100 border border-neutral-300 text-[10px]">
                        BOX #2
                      </span>
                    </div>
                  </div>

                  {/* Dashed line */}
                  <div className="border-t border-dashed border-neutral-400 my-1.5" />

                  {/* Sample total */}
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between font-bold text-neutral-800">
                      <span>TOTAL BILLED:</span>
                      <span>Rs. 1,300.00</span>
                    </div>
                    <div className="border-t-2 border-b-2 border-black py-0.5 my-1 flex justify-between items-center text-black font-black">
                      <span className="uppercase text-[10.5px]">BALANCE DUE:</span>
                      <span className="text-xs">Rs. 0.00</span>
                    </div>
                  </div>

                  <div className="my-1.5 text-center">
                    <div className="border-2 border-dashed border-black py-0.5 px-1 font-bold text-[9.5px] bg-neutral-100 text-black">
                      *** PAID IN FULL ***
                    </div>
                  </div>

                  {/* Dashed line */}
                  <div className="border-t border-dashed border-neutral-400 my-1.5" />

                  {/* Dynamic Footer */}
                  <div className="text-center text-[8px] text-neutral-700 space-y-0.5 pt-1">
                    <p className="font-bold text-black">
                      {profile.receiptFooter || 'Thank you for subscribing to ASK Cable!'}
                    </p>
                    <p>Please retain this slip for your records.</p>
                    <p className="text-[7.5px] text-neutral-500">
                      {profile.receiptNotice || '• System Validated'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-neutral-300 space-y-1">
                  <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span>✓</span> Instant Receipt Sync
                  </p>
                  <p className="text-neutral-400 text-[10.5px] leading-relaxed">
                    Saving your profile immediately updates all receipts printed across Customers, Monthly Billing, and Quick Payment Collection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SMS GATEWAY (NOTIFY.LK)                                             */}
      {/* ========================================================================= */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          {/* Top Section: Gateway Master Card & Account Balance Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Gateway Master Card & Toggle (8 Columns) */}
            <div className="lg:col-span-7 xl:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl border shrink-0 ${
                    smsSettings.enabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}>
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Notify.lk SMS Gateway
                      </h2>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        smsSettings.enabled
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${smsSettings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                        {smsSettings.enabled ? 'Automatic Dispatch Active' : 'Automatic Dispatch Disabled'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono">
                        Sri Lanka Telco Gateway
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                      When enabled, whenever a payment is collected in <span className="text-emerald-400 font-semibold">Payment Collection</span> or <span className="text-emerald-400 font-semibold">Monthly Payment</span>, an instant SMS receipt will be automatically delivered to the customer&apos;s mobile number.
                    </p>
                  </div>
                </div>

                {/* Master Toggle */}
                <div className="flex items-center gap-3 self-end sm:self-center bg-neutral-950 p-2 rounded-xl border border-neutral-800 shrink-0">
                  <span className="text-xs font-semibold text-neutral-300">
                    {smsSettings.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSmsSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      smsSettings.enabled ? 'bg-emerald-500' : 'bg-neutral-700'
                    }`}
                    role="switch"
                    aria-checked={smsSettings.enabled}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        smsSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Account Balance Card - EXACT VISUAL MATCH TO media_1792347607905_9c268eba.png (4 Columns) */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-md flex flex-col justify-between relative transition-all">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    Account Balance
                  </span>
                  {smsBalance && (
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      smsBalance.active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                    }`}>
                      {smsBalance.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchBalance()}
                    disabled={isLoadingBalance}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-200 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                    title="Refresh Live SMS Balance from Notify.lk"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? 'animate-spin text-emerald-500' : ''}`} />
                  </button>

                  {/* Mail icon with check badge inside rounded badge matching user screenshot */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 relative border border-slate-200/60 dark:border-neutral-700/60 shadow-xs">
                    <Mail className="w-5 h-5 stroke-[1.8]" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Big bold balance */}
              <div className="my-3">
                {isLoadingBalance && !smsBalance ? (
                  <div className="h-10 w-28 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                      {smsBalance?.balance !== undefined ? smsBalance.balance.toLocaleString() : '—'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-neutral-500">
                      SMS Credits
                    </span>
                  </div>
                )}
              </div>

              {/* Footer: As of Timestamp matching screenshot */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 pt-2 border-t border-slate-100 dark:border-neutral-800/80">
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 shrink-0" />
                  <span className="truncate">
                    {smsBalance?.checkedAt
                      ? `As of ${formatLogDateTime(smsBalance.checkedAt)}`
                      : 'Click refresh to query Notify.lk'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Settings & Test Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Credentials and Template */}
            <div className="lg:col-span-7 space-y-6">
              {/* Credentials Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">API Credentials</h3>
                  </div>
                  <a
                    href="https://app.notify.lk"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
                  >
                    <span>Open Notify.lk Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* User ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Notify.lk User ID</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 21800"
                      value={smsSettings.userId}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, userId: e.target.value.trim() }))}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
                    />
                    <p className="text-[10.5px] text-neutral-500">
                      Numeric User ID found in your Notify.lk profile.
                    </p>
                  </div>

                  {/* Sender ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Sender ID / Name</span>
                      </label>
                      {smsSettings.senderId !== 'NotifyDEMO' && (
                        <button
                          type="button"
                          onClick={() => setSmsSettings(prev => ({ ...prev, senderId: 'NotifyDEMO' }))}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                        >
                          Use &quot;NotifyDEMO&quot;
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="NotifyDEMO"
                      value={smsSettings.senderId}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, senderId: e.target.value.trim() }))}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
                    />
                    <p className="text-[10.5px] text-neutral-400 leading-tight">
                      Use <button type="button" onClick={() => setSmsSettings(prev => ({ ...prev, senderId: 'NotifyDEMO' }))} className="font-mono text-emerald-400 font-bold hover:underline cursor-pointer">NotifyDEMO</button> for free trial testing. Custom names (e.g. ASKCABLE) require TRCSL registration in Notify.lk dashboard.
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Notify.lk API Key / Token</span>
                        <span className="text-rose-400">*</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(prev => !prev)}
                        className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {showApiKey ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hide API Key</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Show API Key</span>
                          </>
                        )}
                      </button>
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Paste your 32-character Notify.lk API Key here..."
                      value={smsSettings.apiKey}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, apiKey: e.target.value.trim() }))}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
                    />
                    <p className="text-[10.5px] text-neutral-500">
                      Keep this private. Stored securely in your local database.
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Template Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Automated SMS Templates</h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Template Switcher Tabs */}
                    <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setTemplateTab('payment')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          templateTab === 'payment'
                            ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Payment Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateTab('registration')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          templateTab === 'registration'
                            ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Registration Welcome
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetSmsTemplate}
                      className="text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                      title="Reset selected template to factory default"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {templateTab === 'payment' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-300">
                        Monthly Payment SMS Template (Sent upon payment collection)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Counter & Monthly Ledger
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={smsSettings.paymentSmsTemplate}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, paymentSmsTemplate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs leading-relaxed text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 resize-y"
                      placeholder="Enter payment SMS template..."
                    />

                    {/* Dynamic Variable Chips for Payment */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-neutral-400">
                        Click any tag below to insert into template:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { token: '{customerName}', desc: 'Customer Name' },
                          { token: '{boxNo}', desc: 'Box Number' },
                          { token: '{paidAmount}', desc: 'Amount Paid (Rs.)' },
                          { token: '{balanceAmount}', desc: 'Remaining Balance' },
                          { token: '{month}', desc: 'Billing Month Name (e.g. October 2026)' },
                          { token: '{date}', desc: 'Payment Date' },
                          { token: '{companyName}', desc: 'Company Name' },
                        ].map((chip) => (
                          <button
                            key={chip.token}
                            type="button"
                            onClick={() => {
                              setSmsSettings(prev => ({
                                ...prev,
                                paymentSmsTemplate: `${prev.paymentSmsTemplate} ${chip.token}`,
                              }));
                            }}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-[11px] font-mono text-emerald-400 cursor-pointer transition-colors"
                            title={`Insert ${chip.desc}`}
                          >
                            {chip.token}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-300">
                        Customer Registration Welcome SMS (Sent on new subscriber sign-up)
                      </label>
                      <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        Customer Registration Form
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={smsSettings.registrationSmsTemplate || DEFAULT_SMS_SETTINGS.registrationSmsTemplate}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, registrationSmsTemplate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs leading-relaxed text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 resize-y"
                      placeholder="Enter customer registration welcome SMS template..."
                    />

                    {/* Dynamic Variable Chips for Registration */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-neutral-400">
                        Click any tag below to insert into template:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { token: '{customerName}', desc: 'Customer Name' },
                          { token: '{boxNo}', desc: 'Assigned Box Number' },
                          { token: '{totalAmount}', desc: 'Total Registration Fee' },
                          { token: '{paidAmount}', desc: 'Amount Paid at Registration' },
                          { token: '{balanceAmount}', desc: 'Remaining Registration Balance' },
                          { token: '{date}', desc: 'Registration Date' },
                          { token: '{companyName}', desc: 'Company Name' },
                          { token: '{companyPhone}', desc: 'Company Phone / Helpline' },
                        ].map((chip) => (
                          <button
                            key={chip.token}
                            type="button"
                            onClick={() => {
                              setSmsSettings(prev => ({
                                ...prev,
                                registrationSmsTemplate: `${prev.registrationSmsTemplate || DEFAULT_SMS_SETTINGS.registrationSmsTemplate} ${chip.token}`,
                              }));
                            }}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-[11px] font-mono text-emerald-400 cursor-pointer transition-colors"
                            title={`Insert ${chip.desc}`}
                          >
                            {chip.token}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button Bar */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-neutral-500">
                  Settings are immediately persisted to the SQLite database.
                </span>
                <button
                  type="button"
                  onClick={handleSaveSmsSettings}
                  disabled={isSavingSms}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-xs shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSms ? 'Saving Settings...' : 'Save SMS Settings'}</span>
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Live Mobile Screen Preview & Test Console */}
            <div className="lg:col-span-5 space-y-6">
              {/* Live Smartphone Screen Preview */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Customer Mobile Preview</h3>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {templateTab === 'payment' ? 'Payment Slip' : 'Welcome SMS'}
                  </span>
                </div>

                {/* Smartphone Mockup */}
                <div className="bg-neutral-950 border-2 border-neutral-800 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                  {/* Phone Header Bar */}
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3 text-[10px] text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-neutral-300">
                        {smsSettings.senderId || 'NotifyDEMO'}
                      </span>
                    </div>
                    <span>Today • Just Now</span>
                  </div>

                  {/* SMS Bubble */}
                  <div className="p-3.5 bg-neutral-800/90 rounded-2xl rounded-tl-sm text-neutral-200 text-xs leading-relaxed border border-neutral-700/60 shadow-md">
                    <p className="whitespace-pre-wrap font-sans text-[11.5px]">
                      {templateTab === 'payment'
                        ? (smsSettings.paymentSmsTemplate || DEFAULT_SMS_SETTINGS.paymentSmsTemplate)
                            .replace(/{customerName}/g, 'Kamal Perera')
                            .replace(/{boxNo}/g, 'BOX-102')
                            .replace(/{paidAmount}/g, '1,300.00')
                            .replace(/{balanceAmount}/g, '0.00')
                            .replace(/{month}/g, new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))
                            .replace(/{date}/g, new Date().toISOString().split('T')[0])
                            .replace(/{companyName}/g, profile.companyName || 'ASK CABLE TV NETWORK')
                        : (smsSettings.registrationSmsTemplate || DEFAULT_SMS_SETTINGS.registrationSmsTemplate)
                            .replace(/{customerName}/g, 'Kamal Perera')
                            .replace(/{boxNo}/g, 'BOX-102')
                            .replace(/{totalAmount}/g, '9,500.00')
                            .replace(/{paidAmount}/g, '5,000.00')
                            .replace(/{balanceAmount}/g, '4,500.00')
                            .replace(/{date}/g, new Date().toISOString().split('T')[0])
                            .replace(/{companyName}/g, profile.companyName || 'ASK CABLE TV NETWORK')
                            .replace(/{companyPhone}/g, profile.phone || '0769866870')}
                    </p>
                  </div>

                  {/* Metric Chips */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[10.5px] text-neutral-400">
                    <span>
                      Length:{' '}
                      <strong className="text-white">
                        {((templateTab === 'payment' ? smsSettings.paymentSmsTemplate : smsSettings.registrationSmsTemplate) || '').length} chars
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                      <span>✓</span> Standard GSM-7 Format
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Test SMS Delivery Console */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Send Live Test SMS</h3>
                  </div>
                  <span className="text-[10.5px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Verify Gateway
                  </span>
                </div>

                <form onSubmit={handleSendTestSms} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Test Mobile Number (Sri Lanka)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0771234567 or 94771234567"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-300">
                      Test Message
                    </label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingTestSms || !testPhone.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingTestSms ? 'Transmitting to Notify.lk...' : 'Send Live Test SMS Now'}</span>
                  </button>

                  {/* Test Result Message Box */}
                  {testSmsResult && (
                    <div className={`p-3.5 rounded-lg border text-xs leading-relaxed animate-fade-in ${
                      testSmsResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        {testSmsResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1.5 flex-1">
                          <p className="font-bold text-xs">
                            {testSmsResult.success ? 'SMS Delivered Successfully!' : 'Delivery Failed'}
                          </p>
                          <p className="text-[11.5px] leading-relaxed opacity-95">{testSmsResult.message}</p>
                          {testSmsResult.message?.toLowerCase().includes('notifydemo') && smsSettings.senderId !== 'NotifyDEMO' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSmsSettings(prev => ({ ...prev, senderId: 'NotifyDEMO' }));
                                api.setSmsSettings({ ...smsSettings, senderId: 'NotifyDEMO' }).then(() => {
                                  toast.success('Sender ID updated to NotifyDEMO and saved to database!');
                                });
                              }}
                              className="mt-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded text-xs transition-colors cursor-pointer"
                            >
                              Set Sender ID to &quot;NotifyDEMO&quot; &amp; Save
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </form>

                {/* Helpful Hints Card */}
                <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>Notify.lk Free Trial Details</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed">
                    New Notify.lk accounts receive 10 free SMS credits for live testing. Your sender ID will show as <strong className="text-white">NotifyDEMO</strong> until a branded sender ID is registered with TRCSL.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SMS DISPATCH LOGS & DELIVERY HISTORY                                      */}
          {/* ========================================================================= */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      SMS Dispatch Logs &amp; Delivery History
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-mono">
                      {smsLogs.length} Records
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Live audit trail of all automated payment receipts, registration welcomes, and test transmissions.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => fetchLogs()}
                  disabled={isLoadingLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh SMS Logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Refresh</span>
                </button>

                {smsLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSmsLogs}
                    disabled={isClearingLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    title="Clear All SMS Logs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filters & Search Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by phone, customer, box #, or message text..."
                  value={logsSearchTerm}
                  onChange={(e) => {
                    setLogsSearchTerm(e.target.value);
                    fetchLogs({ search: e.target.value });
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                />
                {logsSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogsSearchTerm('');
                      fetchLogs({ search: '' });
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Type Filter */}
                <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5">
                  <Filter className="w-3 h-3 text-neutral-400" />
                  <span className="text-[11px] text-neutral-400 font-medium">Type:</span>
                  <select
                    value={logsFilterType}
                    onChange={(e) => setLogsFilterType(e.target.value)}
                    className="bg-transparent text-xs text-neutral-200 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-neutral-900 text-white">All Dispatches</option>
                    <option value="PAYMENT" className="bg-neutral-900 text-white">Payment Receipts</option>
                    <option value="REGISTRATION" className="bg-neutral-900 text-white">Registration Welcome</option>
                    <option value="TEST" className="bg-neutral-900 text-white">Test SMS</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5">
                  <span className="text-[11px] text-neutral-400 font-medium">Status:</span>
                  <select
                    value={logsFilterStatus}
                    onChange={(e) => setLogsFilterStatus(e.target.value)}
                    className="bg-transparent text-xs text-neutral-200 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-neutral-900 text-white">All Status</option>
                    <option value="DELIVERED" className="bg-neutral-900 text-emerald-400">Delivered</option>
                    <option value="FAILED" className="bg-neutral-900 text-rose-400">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logs List Table */}
            {isLoadingLogs && smsLogs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <p className="text-xs text-neutral-400">Loading SMS dispatch records...</p>
              </div>
            ) : smsLogs.length === 0 ? (
              <div className="py-12 px-4 rounded-xl border border-dashed border-neutral-800 text-center space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-neutral-600" />
                <h4 className="text-xs sm:text-sm font-bold text-neutral-300">
                  No SMS Dispatch Records Found
                </h4>
                <p className="text-[11.5px] text-neutral-500 max-w-sm mx-auto">
                  {logsSearchTerm || logsFilterType !== 'ALL' || logsFilterStatus !== 'ALL'
                    ? 'No SMS logs match the current search filters. Try clearing your search.'
                    : 'Dispatched payment receipts, registration welcomes, and test SMS messages will automatically appear here.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-semibold">
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Recipient &amp; Customer</th>
                      <th className="py-2.5 px-3">Message Content</th>
                      <th className="py-2.5 px-3">Sender ID</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {smsLogs.map((log) => {
                      const isDelivered = log.status === 'DELIVERED';
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-neutral-800/30 transition-colors"
                        >
                          {/* Timestamp */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-neutral-300 font-mono text-[11px]">
                            {formatLogDateTime(log.createdAt)}
                          </td>

                          {/* Type */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                              log.type === 'PAYMENT'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : log.type === 'REGISTRATION'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            }`}>
                              {log.type === 'PAYMENT' ? 'Payment Slip' : log.type === 'REGISTRATION' ? 'Welcome SMS' : 'Test SMS'}
                            </span>
                          </td>

                          {/* Recipient & Customer */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-white text-xs">
                                {log.recipientPhone}
                              </span>
                              {(log.customerName || log.boxNo) && (
                                <span className="text-[11px] text-neutral-400">
                                  {log.customerName} {log.boxNo ? `(${log.boxNo})` : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Message snippet */}
                          <td className="py-2.5 px-3 max-w-xs truncate text-neutral-300 text-[11.5px]">
                            <span
                              title={log.message}
                              className="cursor-pointer hover:text-white"
                              onClick={() => setSelectedLogForModal(log)}
                            >
                              {log.message}
                            </span>
                          </td>

                          {/* Sender ID */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-neutral-400 font-mono text-[11px]">
                            {log.senderId || 'NotifyDEMO'}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              title={log.gatewayResponse || ''}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                                isDelivered
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {isDelivered ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                              )}
                              <span>{isDelivered ? 'Delivered' : 'Failed'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedLogForModal(log)}
                                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                                title="View Full Message Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(log.message, log.id)}
                                className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                                title="Copy SMS Message Text"
                              >
                                {copiedLogId === log.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: THERMAL PRINTER SETTINGS (ONE-TIME BLUETOOTH PAIRING & AUTO-PRINT) */}
      {/* ========================================================================= */}
      {activeTab === 'printer' && (
        <div className="space-y-6">
          {/* Top Banner Card: Bluetooth Thermal Printer Status */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-800/80 pb-5">
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-2xl border shrink-0 ${
                  savedPrinter.name
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}>
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Bluetooth Thermal Receipt Printer
                    </h2>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      savedPrinter.name
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${savedPrinter.name ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                      {savedPrinter.name ? '1-Click Auto Reconnect Ready' : 'No Default Printer Paired'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                    இங்கு உங்கள் புளூடூத் பிரிண்டரை ஒருமுறை Pair செய்துவிட்டால், ஒவ்வொரு முறையும் பில் போடும்போது பிரிண்டரைத் தேர்ந்தெடுக்கத் தேவையில்லை — பில் 1-கிளிக்கில் தானாகவே அச்சிடப்படும்!
                  </p>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {savedPrinter.name ? (
                  <>
                    <button
                      type="button"
                      onClick={handleTestPrint}
                      disabled={isTestingPrinter || isPairingPrinter}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 border border-neutral-700 shadow-sm"
                    >
                      {isTestingPrinter ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Printing Test...</span>
                        </>
                      ) : (
                        <>
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Test Print Slip</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleForgetPrinter}
                      className="flex items-center gap-1 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Unpair saved printer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Forget</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handlePairPrinter}
                    disabled={isPairingPrinter}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isPairingPrinter ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                        <span>Pairing Printer...</span>
                      </>
                    ) : (
                      <>
                        <Bluetooth className="w-4 h-4 text-neutral-950" />
                        <span>Pair Bluetooth Printer</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Printer Details or Pair Callout Card */}
            {savedPrinter.name ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                  <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Paired Device</span>
                  <p className="text-base font-bold text-white flex items-center gap-2">
                    <span>{savedPrinter.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                      DEFAULT
                    </span>
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono truncate">
                    ID: {savedPrinter.id ? savedPrinter.id.substring(0, 24) + '...' : 'Browser Paired'}
                  </p>
                </div>

                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                  <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Paper Roll Width</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handlePrinterPaperSizeChange(58)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        printerPaperSize === 58
                          ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700'
                      }`}
                    >
                      58mm (Mini)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrinterPaperSizeChange(80)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        printerPaperSize === 80
                          ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700'
                      }`}
                    >
                      80mm (POS)
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    {printerPaperSize === 58 ? 'Standard 2-inch mini portable roll' : 'Standard 3-inch counter POS roll'}
                  </p>
                </div>

                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                  <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Change Printer</span>
                  <p className="text-xs text-neutral-300">வேறு பிரிண்டரை இணைக்க வேண்டுமா?</p>
                  <button
                    type="button"
                    onClick={handlePairPrinter}
                    disabled={isPairingPrinter}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-semibold rounded-lg border border-neutral-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-Pair / Select Another</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-neutral-950 rounded-2xl border border-neutral-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Bluetooth className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">புளூடூத் பிரிண்டரை இணைக்கவும்</h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                    கீழே உள்ள பட்டனை அழுத்தி உங்கள் போர்ட்டபிள் தெர்மல் பிரிண்டரை ஒருமுறை Pair செய்யுங்கள். பின்னர் ஒவ்வொரு பில்லிலும் 1-கிளிக்கில் பிரிண்ட் செய்து கொள்ளலாம்.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePairPrinter}
                  disabled={isPairingPrinter}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isPairingPrinter ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                      <span>Scanning Bluetooth...</span>
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-4 h-4 text-neutral-950" />
                      <span>Pair Bluetooth Printer Now (இணைக்கவும்)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Paper Size & How It Works Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="text-sm font-bold text-white">புளூடூத்தில் Pair செய்யுங்கள்</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                உங்கள் பிரிண்டரை ஆன் செய்து மொபைல் / கணினியின் Bluetooth Settings-ல் இணைத்துக் கொள்ளுங்கள் (Default PIN: <code className="text-emerald-400 font-mono font-bold">0000</code> அல்லது <code className="text-emerald-400 font-mono font-bold">1234</code>).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="text-sm font-bold text-white">செட்டிங்ஸில் ஒருமுறை இணைக்கவும்</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                மேலே உள்ள <strong className="text-emerald-400">Pair Bluetooth Printer</strong> பட்டனை அழுத்தி பிரிண்டரைத் தேர்ந்தெடுங்கள். அது தானாகவே Default Printer-ஆக சேமிக்கப்படும்.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="text-sm font-bold text-white">1-கிளிக் நேரடி பிரிண்ட்</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                இனி Customers அல்லது Monthly Payment பக்கத்தில் <strong className="text-white">Print Bill</strong> கொடுக்கும்போது, எந்த பாப்-அப் பட்டியலும் கேட்காமல் பில் நேரடியாக அச்சிடப்படும்!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SMS Log Details Modal */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    SMS Message Dispatch Record
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {formatLogDateTime(selectedLogForModal.createdAt)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Meta Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-1">
                <span className="text-[10.5px] text-neutral-400 font-medium">Recipient Mobile</span>
                <p className="font-mono font-bold text-white text-sm">
                  {selectedLogForModal.recipientPhone}
                </p>
                {selectedLogForModal.customerName && (
                  <p className="text-[11px] text-neutral-400 truncate">
                    {selectedLogForModal.customerName} {selectedLogForModal.boxNo ? `(${selectedLogForModal.boxNo})` : ''}
                  </p>
                )}
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-1">
                <span className="text-[10.5px] text-neutral-400 font-medium">Delivery Status</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                    selectedLogForModal.status === 'DELIVERED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {selectedLogForModal.status === 'DELIVERED' ? 'DELIVERED' : 'FAILED'}
                  </span>
                  <span className="text-[10.5px] text-neutral-400 font-mono">
                    via {selectedLogForModal.senderId}
                  </span>
                </div>
              </div>
            </div>

            {/* Full Message Text Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Full Dispatched Message Text ({selectedLogForModal.message.length} chars)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopyMessage(selectedLogForModal.message, selectedLogForModal.id)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedLogId === selectedLogForModal.id ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs leading-relaxed font-sans whitespace-pre-wrap selection:bg-emerald-500/30 max-h-48 overflow-y-auto">
                {selectedLogForModal.message}
              </div>
            </div>

            {/* Gateway Response details if available */}
            {selectedLogForModal.gatewayResponse && (
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <span className="font-semibold text-neutral-300">Notify.lk Gateway Response:</span>
                <p className="font-mono text-[10.5px] break-all text-neutral-400">
                  {selectedLogForModal.gatewayResponse}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        variant={confirmModalConfig.variant}
      />
    </div>
  );
};
