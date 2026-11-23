import React, { useState } from 'react';
import { User } from '../types/finance.js';
import { api } from '../api/client.js';
import { Tv, Lock, User as UserIcon, AlertCircle, ArrowRight, Eye, EyeOff, Sun, Moon, ShieldCheck } from 'lucide-react';

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
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-200 selection:bg-emerald-500/20 selection:text-emerald-600 relative overflow-hidden ${
      theme === 'light' ? 'theme-light bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Light / Dark Mode Toggle Button in Top Right */}
      {onToggleTheme && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-xs cursor-pointer backdrop-blur-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Background Accent Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 mb-1 shadow-xs">
            <Tv className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            <span className="text-emerald-600 dark:text-emerald-400">ASK</span> Cable ERP
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Subscriber Management & Enterprise Billing Portal
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs sm:text-sm">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Username</span>
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter username (e.g. admin or staff)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-inner text-xs sm:text-sm min-h-[44px] transition-all"
            />
          </div>

          {/* Password with Eye Visibility Toggle */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password</span>
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-inner text-xs sm:text-sm min-h-[44px] transition-all"
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
            className="w-full py-3.5 px-4 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-sm shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer mt-3 min-h-[44px] disabled:opacity-50"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Secure Enterprise Access</span>
          </p>
        </div>
      </div>
    </div>
  );
};
