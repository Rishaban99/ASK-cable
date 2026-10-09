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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden space-y-5 p-6 sm:p-8 relative z-10 text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon & Radiant Badge */}
        <div className="text-center space-y-3 pt-2">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative inline-flex items-center justify-center p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>{data.title}</span>
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-medium leading-relaxed px-2">
            {data.message}
          </p>
        </div>

        {/* Record Details Breakdown */}
        {details.customerName && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-sm">{details.customerName}</span>
              </div>
              {details.boxNo && (
                <span className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-emerald-400 font-bold flex items-center gap-1 text-xs">
                  <Box className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{details.boxNo}</span>
                </span>
              )}
            </div>

            {/* Grid attributes */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 pt-0.5">
              {details.nicNo && <div>NIC: <span className="text-neutral-200">{details.nicNo}</span></div>}
              {details.phoneNo && <div>Tel: <span className="text-neutral-200">{details.phoneNo}</span></div>}
              {details.month && <div>Month: <span className="text-neutral-200">{details.month}</span></div>}
              {details.status && (
                <div>
                  Status:{' '}
                  <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                    details.status === 'ACTIVE' || details.status === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {details.status}
                  </span>
                </div>
              )}
            </div>

            {/* Financial Summary 3-Column Card */}
            {(details.totalAmount !== undefined || details.paidAmount !== undefined) && (
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-neutral-900/60 border border-neutral-850 rounded-xl text-center text-xs mt-2">
                {details.totalAmount !== undefined && (
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-sans uppercase font-medium">Total</span>
                    <span className="text-neutral-200 font-semibold">{formatMoney(details.totalAmount, currency)}</span>
                  </div>
                )}
                {details.paidAmount !== undefined && (
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-sans uppercase font-medium">Paid</span>
                    <span className="text-emerald-400 font-semibold">{formatMoney(details.paidAmount, currency)}</span>
                  </div>
                )}
                {details.balanceAmount !== undefined && (
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-sans uppercase font-medium">Balance</span>
                    <span className={`font-bold ${details.balanceAmount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formatMoney(details.balanceAmount, currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {data.onPrintBill && (
            <button
              onClick={() => {
                data.onPrintBill!();
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
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
                className="flex-1 py-2.5 px-3 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>View History</span>
              </button>
            )}

            <button
              onClick={() => {
                if (data.onResetForm) data.onResetForm();
                onClose();
              }}
              className="flex-1 py-2.5 px-3 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
              <span>{data.onResetForm ? 'Register Another' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
