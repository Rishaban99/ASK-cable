import React, { useRef } from 'react';
import { formatMoney } from '../api/client.js';
import { SupportedCurrency } from '../types/finance.js';
import { Printer, X, CheckCircle, AlertTriangle, Tv, FileText, Calendar } from 'lucide-react';

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
}

export const BillPrintModal: React.FC<BillPrintModalProps> = ({
  isOpen,
  onClose,
  billData,
  currency = 'LKR',
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !billData) return null;

  const handlePrint = () => {
    window.print();
  };

  // Format month string nicely (e.g. 2026-10 -> October 2026)
  const formatMonthDisplay = (mStr?: string) => {
    if (!mStr) return '';
    const [year, month] = mStr.split('-');
    if (!year || !month) return mStr;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getBadgeLabel = () => {
    if (billData.type === 'TOTAL') return 'TOTAL BILL STATEMENT';
    if (billData.type === 'MONTHLY') return 'MONTHLY BILL RECEIPT';
    return 'CUSTOMER RECEIPT';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container Card */}
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-800 bg-neutral-950 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-base font-semibold text-white truncate">
              {billData.type === 'TOTAL' ? 'Grand Total Bill Statement' : billData.type === 'MONTHLY' ? 'Monthly Bill Receipt' : 'Customer Connection Receipt'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-4 sm:p-6 overflow-y-auto print-area">
          <div
            ref={printRef}
            className="p-6 bg-white text-neutral-900 rounded-lg shadow-inner space-y-5 border border-neutral-200 font-sans text-xs print:p-0 print:border-none print:shadow-none"
          >
            {/* Bill Header */}
            <div className="flex justify-between items-start border-b border-neutral-300 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-600 text-white rounded">
                    <Tv className="w-4 h-4" />
                  </div>
                  <h1 className="text-lg font-bold tracking-tight text-neutral-900 uppercase">
                    ASK CABLE TV NETWORK
                  </h1>
                </div>
                <p className="text-[11px] text-neutral-600 mt-1">
                  High-Definition Cable Subscriptions & Service Center
                </p>
                <p className="text-[10px] text-neutral-500">
                  Tel: +94 77 123 4567 | Email: support@askcable.lk
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-neutral-900 text-white font-mono font-bold text-[11px] rounded uppercase">
                  {getBadgeLabel()}
                </span>
                <p className="font-mono text-[11px] text-neutral-700 mt-1 font-semibold">
                  Bill #: {billData.billNo}
                </p>
                <p className="text-[11px] text-neutral-500 font-mono">Date: {billData.date}</p>
              </div>
            </div>

            {/* Subscriber & Box Info */}
            <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-3 rounded border border-neutral-200">
              <div>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Subscriber Details</p>
                <p className="font-bold text-sm text-neutral-900 mt-0.5">{billData.customerName}</p>
                {billData.nicNo && <p className="text-neutral-600 font-mono">NIC: {billData.nicNo}</p>}
                {billData.phoneNo && <p className="text-neutral-600 font-mono">Phone: {billData.phoneNo}</p>}
                {billData.address && <p className="text-neutral-600 truncate">{billData.address}</p>}
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Connection Info</p>
                <p className="text-[11px] font-medium text-neutral-700 mt-0.5">Box Number:</p>
                <p className="font-mono font-bold text-base text-emerald-700">{billData.boxNo}</p>
                {billData.month && (
                  <p className="text-neutral-700 font-semibold mt-1">
                    Month: <span className="font-mono">{formatMonthDisplay(billData.month)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-900 text-neutral-700 text-[11px] uppercase">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right">Fee</th>
                    <th className="py-2 text-right">Paid</th>
                    <th className="py-2 text-right">Balance (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {billData.items && billData.items.length > 0 ? (
                    billData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5">
                          <p className="font-semibold text-neutral-900">{item.description}</p>
                          {item.dateOrPeriod && (
                            <p className="text-[10px] text-neutral-500">Period/Date: {item.dateOrPeriod}</p>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium text-neutral-800">
                          {formatMoney(item.amount, currency)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium text-emerald-700">
                          {formatMoney(item.paidAmount, currency)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-neutral-900">
                          {formatMoney(item.balanceAmount, currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5">
                        <p className="font-semibold text-neutral-900">
                          {billData.type === 'MONTHLY'
                            ? `Cable Subscription Fee (${formatMonthDisplay(billData.month)})`
                            : 'Initial Package / Total Connection Dues'}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Box No: {billData.boxNo} | Payment Date: {billData.paymentDate || billData.date}
                        </p>
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium text-neutral-800">
                        {formatMoney(billData.totalOrFeeAmount, currency)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium text-emerald-700">
                        {formatMoney(billData.paidAmount, currency)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-neutral-900">
                        {formatMoney(billData.balanceAmount, currency)}
                      </td>
                    </tr>
                  )}

                  {/* Summary Totals */}
                  <tr className="bg-neutral-100 font-bold border-t-2 border-neutral-400">
                    <td colSpan={3} className="py-2.5 text-neutral-900 uppercase">Grand Total Amount Billed</td>
                    <td className="py-2.5 text-right font-mono text-sm text-neutral-900">
                      {formatMoney(billData.totalOrFeeAmount, currency)}
                    </td>
                  </tr>

                  <tr className="bg-emerald-50 text-emerald-800 font-bold">
                    <td colSpan={3} className="py-2.5 uppercase">Total Amount Paid to Date</td>
                    <td className="py-2.5 text-right font-mono text-sm">
                      {formatMoney(billData.paidAmount, currency)}
                    </td>
                  </tr>

                  <tr className="bg-neutral-900 text-white font-bold">
                    <td colSpan={3} className="py-2.5 uppercase">Grand Balance Amount Due</td>
                    <td className="py-2.5 text-right font-mono text-base text-amber-300">
                      {formatMoney(billData.balanceAmount, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Status Stamp & Signatures */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-300">
              <div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded font-mono font-bold text-xs border ${
                    billData.balanceAmount === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {billData.balanceAmount === 0 ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>STATUS: PAID IN FULL</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>STATUS: BALANCE PENDING</span>
                    </>
                  )}
                </span>
              </div>

              <div className="text-center w-36">
                <div className="border-b border-dashed border-neutral-400 h-8 mb-1"></div>
                <p className="text-[10px] text-neutral-500 font-medium">Authorized Signature</p>
              </div>
            </div>

            {/* Bill Footer */}
            <div className="text-center pt-2 text-[10px] text-neutral-500 border-t border-neutral-200">
              <p className="font-semibold text-neutral-700">Thank you for subscribing to ASK Cable!</p>
              <p>Computer generated payment receipt. System stamp valid without physical seal.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Specific CSS Override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
