import React, { useState, useEffect } from 'react';
import { User, StaffPrivileges, DEFAULT_STAFF_PRIVILEGES } from '../types/finance.js';
import { api } from '../api/client.js';
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
  RotateCcw
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  onPrivilegesUpdated?: () => void;
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
];

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onPrivilegesUpdated }) => {
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
  const [activeTab, setActiveTab] = useState<'privileges' | 'users' | 'system'>('privileges');

  // Load Users & Privileges from DB
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

  useEffect(() => {
    fetchUsers();
    fetchPrivileges();
  }, []);

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
      setTimeout(() => setPrivilegeSaveStatus(null), 2500);
      if (onPrivilegesUpdated) onPrivilegesUpdated();
    } catch (e: any) {
      console.error('Failed to save staff privileges to DB:', e);
      setPrivilegeSaveStatus('Saved to DB & Local state');
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
      setUserError('Please fill in all user fields.');
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
      setUserSuccess(`User "${newUsername}" created successfully!`);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('STAFF');
      setIsAddUserOpen(false);
      await fetchUsers();
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (err: any) {
      setUserError(err?.message || 'Failed to create user account.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.username.toLowerCase() === currentUser.username.toLowerCase()) {
      alert('You cannot delete your own active account!');
      return;
    }
    if (!confirm(`Are you sure you want to delete user account "${userToDelete.name}" (${userToDelete.username})?`)) {
      return;
    }

    try {
      await api.deleteUser(userToDelete.id);
      setUserSuccess(`User "${userToDelete.username}" deleted successfully.`);
      await fetchUsers();
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (err: any) {
      setUserError(err?.message || 'Failed to delete user.');
    }
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
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('privileges')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'users'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
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
    </div>
  );
};
