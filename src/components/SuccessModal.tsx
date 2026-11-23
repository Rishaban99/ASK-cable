import React from 'react';
import { CheckCircle2, Printer, X, Box, User as UserIcon, ShieldCheck, RefreshCw, Sparkles, ArrowRight, FileText } from 'lucide-react';
import { formatMoney } from '../api/client.js';
import { SupportedCurrency } from '../types/finance.js';

export interface SuccessData {
  title: string;
  message: string;
  details?: {
    customerName?: string;
    nicNo?: string;
    phoneNo?: string;
    boxNo?: string;
    totalAmount?: number;
    paidAmount?: number;
    balanceAmount?: number;
    status?: string;
    date?: string;
    month?: string;
    paymentMethod?: string;
  };
  onPrintBill?: () => void;
  onViewHistory?: () => void;
  onResetForm?: () => void;
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SuccessData | null;
  currency?: SupportedCurrency;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  data,
  currency = 'LKR',
}) => {
  if (!isOpen || !data) return null;

  const details = data.details || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden space-y-5 p-6 sm:p-8 relative z-10 text-slate-900 dark:text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon & Radiant Badge */}
        <div className="text-center space-y-2 pt-2">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative inline-flex items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 rounded-full text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <span>{data.title}</span>
            <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2 font-sans">
            {data.message}
          </p>
        </div>

        {/* Record Details Breakdown */}
        {details.customerName && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">{details.customerName}</span>
              </div>
              {details.boxNo && (
                <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-xs">
                  <Box className="w-3.5 h-3.5 text-slate-400" />
                  <span>{details.boxNo}</span>
                </span>
              )}
            </div>

            {/* Grid attributes */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              {details.nicNo && <div>NIC: <span className="text-slate-700 dark:text-slate-200 font-semibold">{details.nicNo}</span></div>}
              {details.phoneNo && <div>Tel: <span className="text-slate-700 dark:text-slate-200 font-semibold">{details.phoneNo}</span></div>}
              {details.month && <div>Month: <span className="text-slate-700 dark:text-slate-200 font-semibold">{details.month}</span></div>}
              {details.status && (
                <div>
                  Status:{' '}
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    details.status === 'ACTIVE' || details.status === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                  }`}>
                    {details.status}
                  </span>
                </div>
              )}
            </div>

            {/* Financial Summary 3-Column Card */}
            {(details.totalAmount !== undefined || details.paidAmount !== undefined) && (
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center text-xs mt-2">
                {details.totalAmount !== undefined && (
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold tracking-wider">Total</span>
                    <span className="text-slate-700 dark:text-slate-200 font-bold">{formatMoney(details.totalAmount, currency)}</span>
                  </div>
                )}
                {details.paidAmount !== undefined && (
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold tracking-wider">Paid</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(details.paidAmount, currency)}</span>
                  </div>
                )}
                {details.balanceAmount !== undefined && (
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold tracking-wider">Balance</span>
                    <span className={`font-bold ${details.balanceAmount === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {formatMoney(details.balanceAmount, currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {data.onPrintBill && (
            <button
              onClick={() => {
                data.onPrintBill!();
                onClose();
              }}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill / Receipt</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {data.onViewHistory && (
              <button
                onClick={() => {
                  data.onViewHistory!();
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>View History</span>
              </button>
            )}

            <button
              onClick={() => {
                if (data.onResetForm) data.onResetForm();
                onClose();
              }}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{data.onResetForm ? 'Register Another' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
