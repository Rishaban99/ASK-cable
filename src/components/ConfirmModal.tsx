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
    if (variant === 'danger') return <Trash2 className="w-5 h-5 text-rose-400" />;
    if (variant === 'emerald') return <CalendarCheck className="w-5 h-5 text-emerald-400" />;
    return <HelpCircle className="w-5 h-5 text-indigo-400" />;
  };

  const getConfirmBtnClass = () => {
    if (variant === 'danger') {
      return 'bg-rose-500 hover:bg-rose-400 text-white font-bold shadow-md';
    }
    if (variant === 'emerald') {
      return 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold shadow-md';
    }
    return 'bg-indigo-500 hover:bg-indigo-400 text-white font-bold shadow-md';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              variant === 'danger'
                ? 'bg-rose-500/15 border-rose-500/30'
                : variant === 'emerald'
                ? 'bg-emerald-500/15 border-emerald-500/30'
                : 'bg-indigo-500/15 border-indigo-500/30'
            }`}>
              {getHeaderIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
              <p className="text-[11px] font-mono text-neutral-400 mt-0.5">Confirmation Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 leading-relaxed space-y-2 font-sans">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-neutral-300 font-medium">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 rounded-xl transition-all cursor-pointer"
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
