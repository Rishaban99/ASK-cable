import React from 'react';
import { createPortal } from 'react-dom';
import { formatMoney } from '../api/client.js';
import { SupportedCurrency, SystemProfile, DEFAULT_SYSTEM_PROFILE } from '../types/finance.js';
import { Printer, X, CheckCircle, AlertTriangle, Tv } from 'lucide-react';

export interface BillLineItem {
  description: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  dateOrPeriod?: string;
}

export interface BillData {
  type: 'TOTAL' | 'MONTHLY' | 'CUSTOMER';
  billNo: string;
  date: string;
  customerName: string;
  nicNo?: string;
  phoneNo?: string;
  address?: string;
  boxNo: string;
  month?: string; // YYYY-MM
  totalOrFeeAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status?: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentDate?: string;
  items?: BillLineItem[];
}

interface BillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  billData: BillData | null;
  currency?: SupportedCurrency;
  systemProfile?: SystemProfile;
}

// Format month string nicely (e.g. 2026-10 -> October 2026)
const formatMonthDisplay = (mStr?: string) => {
  if (!mStr) return '';
  const [year, month] = mStr.split('-');
  if (!year || !month) return mStr;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

// Reusable single 80mm thermal receipt slip content
const ThermalReceiptSlip: React.FC<{
  billData: BillData;
  currency: SupportedCurrency;
  profile: SystemProfile;
  isPrintOnly?: boolean;
}> = ({ billData, currency, profile, isPrintOnly = false }) => {
  const getBadgeLabel = () => {
    if (billData.type === 'TOTAL') return 'TOTAL BILL STATEMENT';
    if (billData.type === 'MONTHLY') return 'MONTHLY BILL RECEIPT';
    return 'CUSTOMER RECEIPT';
  };

  return (
    <div
      className="bg-white text-black font-mono text-[11px] leading-tight select-text"
      style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: "'Courier New', Courier, monospace, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header: Brand and Contact */}
      <div className="text-center pb-1.5">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <Tv className="w-4 h-4 text-black shrink-0" />
          <h1 className="text-sm font-black tracking-tight uppercase text-black">
            {profile.companyName || 'ASK CABLE TV NETWORK'}
          </h1>
        </div>
        <p className="text-[10px] font-semibold text-neutral-800">
          {profile.tagline || 'Cable TV Subscriptions & Services'}
        </p>
        <p className="text-[9px] text-neutral-700">
          Tel: {profile.phone || '+94 77 123 4567'} | {profile.email || 'support@askcable.lk'}
        </p>
      </div>

      {/* Dashed Divider */}
      <div className="border-t border-dashed border-neutral-400 my-1.5" />

      {/* Receipt Type & Meta */}
      <div className="text-center my-1">
        <span
          className="inline-block px-2.5 py-0.5 text-[9.5px] font-black tracking-wider uppercase rounded-xs"
          style={{ backgroundColor: '#000000', color: '#ffffff' }}
        >
          *** {getBadgeLabel()} ***
        </span>
      </div>

      <div className="space-y-0.5 pt-1 text-[10px] text-neutral-800">
        <div className="flex justify-between items-center">
          <span>Bill #:</span>
          <span className="font-extrabold text-black font-mono">{billData.billNo}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Date:</span>
          <span className="font-semibold text-black">{billData.date}</span>
        </div>
        {billData.paymentDate && (
          <div className="flex justify-between items-center">
            <span>Payment Date:</span>
            <span className="font-semibold text-black">{billData.paymentDate}</span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-t border-dashed border-neutral-400 my-1.5" />

      {/* Subscriber & Connection Info */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between items-start">
          <span className="text-[9px] font-bold text-neutral-600 uppercase shrink-0 pt-0.5">
            Customer:
          </span>
          <span className="font-extrabold text-[11.5px] text-black text-right max-w-[190px] break-words">
            {billData.customerName}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-neutral-600 uppercase">
            Box Number:
          </span>
          <span
            className="font-extrabold text-[11.5px] text-black px-1.5 py-0.5 rounded border border-neutral-400"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            BOX #{billData.boxNo}
          </span>
        </div>

        {billData.month && (
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-neutral-600 uppercase">
              Month:
            </span>
            <span className="font-extrabold text-black">
              {formatMonthDisplay(billData.month)}
            </span>
          </div>
        )}

        {billData.phoneNo && (
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-neutral-600 uppercase">
              Phone:
            </span>
            <span className="font-semibold text-black">{billData.phoneNo}</span>
          </div>
        )}

        {billData.nicNo && (
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-neutral-600 uppercase">
              NIC:
            </span>
            <span className="font-semibold text-black">{billData.nicNo}</span>
          </div>
        )}

        {billData.address && (
          <div className="flex justify-between items-start pt-0.5">
            <span className="text-[9px] font-bold text-neutral-600 uppercase shrink-0 pt-0.5">
              Address:
            </span>
            <span className="text-right text-[9.5px] text-neutral-800 max-w-[190px] break-words leading-tight">
              {billData.address}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-t border-dashed border-neutral-400 my-1.5" />

      {/* Dues / Charges Breakdown */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px] font-bold text-neutral-700 uppercase border-b border-dashed border-neutral-300 pb-0.5">
          <span>Description</span>
          <span>Amount ({currency})</span>
        </div>

        {billData.items && billData.items.length > 0 ? (
          billData.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5 text-[10px]">
              <div className="flex justify-between items-start font-bold text-black">
                <span className="max-w-[180px] break-words">
                  {idx + 1}. {item.description}
                </span>
                <span className="font-mono text-right shrink-0">
                  {formatMoney(item.amount, currency)}
                </span>
              </div>
              {item.dateOrPeriod && (
                <div className="text-[9px] text-neutral-600 pl-2">
                  Period: {item.dateOrPeriod}
                </div>
              )}
              <div className="flex justify-between text-[9px] text-neutral-700 pl-2">
                <span>Paid: {formatMoney(item.paidAmount, currency)}</span>
                <span>Bal: {formatMoney(item.balanceAmount, currency)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1 text-[10px]">
            <div className="font-bold text-black text-[10.5px]">
              {billData.type === 'MONTHLY'
                ? `Monthly Fee (${formatMonthDisplay(billData.month)})`
                : 'Cable Subscription Dues'}
            </div>
            <div className="text-[9px] text-neutral-600">
              Box No: {billData.boxNo} | {billData.paymentDate ? `Paid: ${billData.paymentDate}` : `Date: ${billData.date}`}
            </div>
            <div className="pt-0.5 space-y-0.5">
              <div className="flex justify-between text-neutral-800">
                <span>Standard Fee:</span>
                <span className="font-mono font-semibold">
                  {formatMoney(billData.totalOrFeeAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-800">
                <span>Amount Paid:</span>
                <span className="font-mono font-semibold">
                  {formatMoney(billData.paidAmount, currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-t border-dashed border-neutral-400 my-1.5" />

      {/* Financial Totals */}
      <div className="space-y-0.5 text-[10.5px]">
        <div className="flex justify-between font-bold text-neutral-900">
          <span>TOTAL BILLED:</span>
          <span className="font-mono text-right">
            {formatMoney(billData.totalOrFeeAmount, currency)}
          </span>
        </div>
        <div className="flex justify-between font-bold text-neutral-900">
          <span>TOTAL PAID:</span>
          <span className="font-mono text-right">
            {formatMoney(billData.paidAmount, currency)}
          </span>
        </div>

        {/* High-Contrast Balance Due Banner */}
        <div className="border-t-2 border-b-2 border-black py-1 my-1 flex justify-between items-center text-black">
          <span className="text-[11px] font-black uppercase tracking-tight">
            BALANCE DUE:
          </span>
          <span className="text-sm font-black font-mono">
            {formatMoney(billData.balanceAmount, currency)}
          </span>
        </div>
      </div>

      {/* Payment Status Stamp */}
      <div className="my-2 text-center">
        <div
          className="inline-flex items-center justify-center gap-1.5 w-full py-0.5 px-2 border-2 border-dashed font-extrabold text-[10.5px] uppercase tracking-wider"
          style={{
            borderColor: '#000000',
            backgroundColor: '#f3f4f6',
            color: '#000000',
          }}
        >
          {billData.balanceAmount === 0 ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 shrink-0 text-black" />
              <span>*** PAID IN FULL ***</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-black" />
              <span>*** BALANCE PENDING ***</span>
            </>
          )}
        </div>
      </div>

      {/* Cashier / Signature Line */}
      <div className="pt-2 pb-0.5 text-center">
        <div className="border-b border-dotted border-neutral-500 w-32 mx-auto mb-1"></div>
        <p className="text-[8.5px] text-neutral-700 font-semibold uppercase tracking-wider">
          Authorized Cashier / Stamp
        </p>
      </div>

      {/* Receipt Footer */}
      <div className="text-center pt-1.5 text-[8.5px] text-neutral-700 space-y-0.5 border-t border-dashed border-neutral-300">
        <p className="font-bold text-black">
          {profile.receiptFooter || 'Thank you for subscribing to ASK Cable!'}
        </p>
        <p>Please retain this slip for your records.</p>
        <p className="text-[8px] text-neutral-500">
          {profile.receiptNotice || 'Computer Generated 80mm Receipt • System Validated'}
        </p>
        {/* Paper feed gap before tear-off cutter (only rendered in print) */}
        {isPrintOnly && <div className="h-6" />}
      </div>
    </div>
  );
};

export const BillPrintModal: React.FC<BillPrintModalProps> = ({
  isOpen,
  onClose,
  billData,
  currency = 'LKR',
  systemProfile,
}) => {
  if (!isOpen || !billData) return null;

  // Resolve active profile from prop or localStorage or fallback to defaults
  const activeProfile: SystemProfile = (() => {
    if (systemProfile) return systemProfile;
    try {
      const saved = localStorage.getItem('ask_cable_system_profile');
      if (saved) return { ...DEFAULT_SYSTEM_PROFILE, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SYSTEM_PROFILE;
  })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* =========================================================================
          SCREEN MODAL (Hidden completely during Print via @media print)
          ========================================================================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:hidden">
        {/* Container Card */}
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-750 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Printer className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate leading-tight">
                  80mm Thermal Receipt
                </h3>
                <p className="text-[10px] text-neutral-400 font-mono">
                  1-Sheet POS Slip • {billData.billNo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Paper Slip Preview Area */}
          <div className="p-3 sm:p-4 bg-neutral-950 overflow-y-auto flex flex-col items-center">
            {/* Helper hint */}
            <div className="text-[10.5px] text-neutral-400 font-mono mb-2 flex items-center gap-1">
              <span>🖨️ 80mm POS Slip Preview (Single Sheet)</span>
            </div>

            {/* Paper Preview Slip */}
            <div className="w-[300px] max-w-[300px] bg-white p-3.5 rounded-sm shadow-2xl border border-neutral-300">
              <ThermalReceiptSlip billData={billData} currency={currency} profile={activeProfile} isPrintOnly={false} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINT PORTAL: Directly appended to <body>
          Completely isolated from #root and screen modal to guarantee EXACTLY 1 SHEET
          ========================================================================= */}
      {createPortal(
        <div id="thermal-receipt-print-portal" aria-hidden="true">
          <ThermalReceiptSlip billData={billData} currency={currency} profile={activeProfile} isPrintOnly={true} />
        </div>,
        document.body
      )}

      {/* =========================================================================
          STRICT 80MM SINGLE-SHEET PRINT CSS
          ========================================================================= */}
      <style>{`
        /* Hide print portal on interactive screen */
        #thermal-receipt-print-portal {
          display: none;
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm !important;
          }

          html, body {
            width: 80mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 
           * COMPLETELY ELIMINATE #root FROM PRINT LAYOUT:
           * Removes the 1500px app page height, fixed modal backdrops, and black background
           */
          #root {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
          }

          /*
           * DISPLAY ONLY THE PRINT PORTAL:
           * Guaranteed single sheet, strictly 74mm-78mm printable width, no page break duplicates
           */
          #thermal-receipt-print-portal {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 74mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 2mm 2.5mm 4mm 2.5mm !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #thermal-receipt-print-portal * {
            visibility: visible !important;
          }
        }
      `}</style>
    </>
  );
};
