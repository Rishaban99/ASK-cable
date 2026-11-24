import React, { useState } from 'react';
import { User } from '../types/finance.js';
import { api } from '../api/client.js';
import {
  Tv,
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  KeyRound,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, theme = 'dark', onToggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await api.login(username.trim(), password.trim());
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (userStr: string, passStr: string) => {
    setUsername(userStr);
    setPassword(passStr);
    setErrorMsg('');
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-200 relative overflow-hidden select-none ${
        theme === 'light' ? 'theme-light bg-slate-100/80 text-slate-900' : 'bg-[#090D16] text-slate-100'
      }`}
    >
      {/* Background Micro-Grid & Ambient Radial Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#1D4ED8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] dark:opacity-[0.12] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar Theme Toggle */}
      {onToggleTheme && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm backdrop-blur-md cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Authentication Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-[#0F172A]/90 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative z-10 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-blue-600/15 to-teal-500/15 border border-blue-500/25 rounded-2xl text-blue-600 dark:text-blue-400 mb-1 shadow-inner">
            <Tv className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
              <span>Enterprise ERP + Fintech</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              <span className="text-blue-600 dark:text-blue-400">ASK</span> CABLE TV
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Subscriber Management &amp; Automated Billing Platform
            </p>
          </div>
        </div>

        {/* Quick Role Fill Pills */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              <span>Fast Sign-In Presets:</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">1-Click Auto Fill</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin123')}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
                <span>Administrator</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded font-mono">ADMIN</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                admin / admin123
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('staff', 'staff123')}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/30 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 flex items-center justify-between">
                <span>Staff Operator</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded font-mono">STAFF</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                staff / staff123
              </div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5 animate-fade-in font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs sm:text-sm">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Operator Username</span>
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. admin or staff"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="erp-input w-full font-mono text-xs sm:text-sm py-2.5"
            />
          </div>

          {/* Password with Eye Visibility Toggle */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Security Password</span>
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="erp-input w-full font-mono text-xs sm:text-sm py-2.5 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Meta */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Encrypted Session</span>
          </span>
          <span className="font-mono text-[10px]">ESC/POS 80mm Ready</span>
        </div>
      </div>
    </div>
  );
};
