import React from 'react';
import { AlertTriangle, Trash2, CalendarCheck, HelpCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'emerald' | 'indigo';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getHeaderIcon = () => {
    if (variant === 'danger') return <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
    if (variant === 'emerald') return <CalendarCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    return <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  };

  const getConfirmBtnClass = () => {
    if (variant === 'danger') {
      return 'bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xs';
    }
    if (variant === 'emerald') {
      return 'btn-teal text-white font-bold';
    }
    return 'btn-primary text-white font-bold';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="erp-card w-full max-w-md p-6 sm:p-7 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              variant === 'danger'
                ? 'bg-rose-500/10 border-rose-500/20'
                : variant === 'emerald'
                ? 'bg-teal-500/10 border-teal-500/20'
                : 'bg-blue-500/10 border-blue-500/20'
            }`}>
              {getHeaderIcon()}
            </div>
            <div>
              <span className="badge-status badge-neutral text-[10px] font-mono">CONFIRMATION REQUIRED</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="font-medium">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={`px-5 py-2 text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 ${getConfirmBtnClass()}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
