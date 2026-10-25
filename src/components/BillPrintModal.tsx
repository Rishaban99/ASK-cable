import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatMoney } from '../api/client.js';
import { SupportedCurrency, SystemProfile, DEFAULT_SYSTEM_PROFILE } from '../types/finance.js';
import {
  Printer,
  X,
  CheckCircle,
  AlertTriangle,
  Tv,
  Bluetooth,
  Loader2,
  HelpCircle,
  Check,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  generateEscPosReceipt,
  printViaWebBluetooth,
  getSavedPrinterInfo,
  clearDefaultPrinter,
  ThermalPaperWidth,
} from '../utils/thermalPrinter.js';

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

// Reusable thermal receipt slip component (adapts to 58mm or 80mm)
const ThermalReceiptSlip: React.FC<{
  billData: BillData;
  currency: SupportedCurrency;
  profile: SystemProfile;
  paperWidth: ThermalPaperWidth;
  isPrintOnly?: boolean;
}> = ({ billData, currency, profile, paperWidth, isPrintOnly = false }) => {
  const getBadgeLabel = () => {
    if (billData.type === 'TOTAL') return 'TOTAL BILL STATEMENT';
    if (billData.type === 'MONTHLY') return 'MONTHLY BILL RECEIPT';
    return 'CUSTOMER RECEIPT';
  };

  const is58mm = paperWidth === 58;

  return (
    <div
      className={`bg-white text-black font-mono leading-tight select-text ${
        is58mm ? 'text-[10px]' : 'text-[11px]'
      }`}
      style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: "'Courier New', Courier, monospace, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header: Brand and Contact */}
      <div className="text-center pb-1.5">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <Tv className="w-3.5 h-3.5 text-black shrink-0" />
          <h1
            className={`font-black tracking-tight uppercase text-black ${
              is58mm ? 'text-xs' : 'text-sm'
            }`}
          >
            {profile.companyName || 'ASK CABLE TV NETWORK'}
          </h1>
        </div>
        <p className="text-[9.5px] font-semibold text-neutral-800">
          {profile.tagline || 'Cable TV Subscriptions & Services'}
        </p>
        <p className="text-[8.5px] text-neutral-700">
          Tel: {profile.phone || '+94 77 123 4567'}
          {!is58mm && profile.email && ` | ${profile.email}`}
        </p>
      </div>

      {/* Dashed Divider */}
      <div className="border-t border-dashed border-neutral-400 my-1" />

      {/* Receipt Type & Meta */}
      <div className="text-center my-1">
        <span
          className="inline-block px-2 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-xs"
          style={{ backgroundColor: '#000000', color: '#ffffff' }}
        >
          *** {getBadgeLabel()} ***
        </span>
      </div>

      <div className="space-y-0.5 pt-0.5 text-[9.5px] text-neutral-800">
        <div className="flex justify-between items-center">
          <span>Bill #:</span>
          <span className="font-extrabold text-black font-mono">{billData.billNo}</span>
        </div>
        {billData.paymentDate && billData.paymentDate !== billData.date ? (
          <>
            <div className="flex justify-between items-center">
              <span>Bill Date:</span>
              <span className="font-semibold text-black">{billData.date}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Payment Date:</span>
              <span className="font-semibold text-black">{billData.paymentDate}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center">
            <span>Date:</span>
            <span className="font-semibold text-black">{billData.paymentDate || billData.date}</span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-t border-dashed border-neutral-400 my-1" />

      {/* Subscriber & Connection Info */}
      <div className="space-y-0.5 text-[9.5px]">
        <div className="flex justify-between items-start">
          <span className="text-[8.5px] font-bold text-neutral-600 uppercase shrink-0 pt-0.5">
            Customer:
          </span>
          <span
            className={`font-extrabold text-black text-right break-words ${
              is58mm ? 'max-w-[150px] text-[10px]' : 'max-w-[190px] text-[11px]'
            }`}
          >
            {billData.customerName}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[8.5px] font-bold text-neutral-600 uppercase">
            Box Number:
          </span>
          <span
            className="font-extrabold text-[10.5px] text-black px-1.5 py-0.2 rounded border border-neutral-400"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            BOX #{billData.boxNo}
          </span>
        </div>

        {billData.month && (
          <div className="flex justify-between items-center">
            <span className="text-[8.5px] font-bold text-neutral-600 uppercase">
              Month:
            </span>
            <span className="font-extrabold text-black">
              {formatMonthDisplay(billData.month)}
            </span>
          </div>
        )}

        {billData.phoneNo && (
          <div className="flex justify-between items-center">
            <span className="text-[8.5px] font-bold text-neutral-600 uppercase">
              Phone:
            </span>
            <span className="font-semibold text-black">{billData.phoneNo}</span>
          </div>
        )}

        {billData.nicNo && (
          <div className="flex justify-between items-center">
            <span className="text-[8.5px] font-bold text-neutral-600 uppercase">
              NIC:
            </span>
            <span className="font-semibold text-black">{billData.nicNo}</span>
          </div>
        )}

        {billData.address && (
          <div className="flex justify-between items-start pt-0.5">
            <span className="text-[8.5px] font-bold text-neutral-600 uppercase shrink-0 pt-0.5">
              Address:
            </span>
            <span
              className={`text-right text-[8.5px] text-neutral-800 break-words leading-tight ${
                is58mm ? 'max-w-[150px]' : 'max-w-[190px]'
              }`}
            >
              {billData.address}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-t border-dashed border-neutral-400 my-1" />

      {/* Dues / Charges Breakdown */}
      <div className="space-y-1">
        <div className="flex justify-between text-[8.5px] font-bold text-neutral-700 uppercase border-b border-dashed border-neutral-300 pb-0.5">
          <span>Description</span>
          <span>Amount ({currency})</span>
        </div>

        {billData.items && billData.items.length > 0 ? (
          billData.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5 text-[9.5px]">
              <div className="flex justify-between items-start font-bold text-black">
                <span className={`break-words ${is58mm ? 'max-w-[140px]' : 'max-w-[180px]'}`}>
                  {idx + 1}. {item.description}
                </span>
                <span className="font-mono text-right shrink-0">
                  {formatMoney(item.amount, currency)}
                </span>
              </div>
              {item.dateOrPeriod && (
                <div className="text-[8.5px] text-neutral-600 pl-1.5">
                  Period: {item.dateOrPeriod}
                </div>
              )}
              <div className="flex justify-between text-[8.5px] text-neutral-700 pl-1.5">
                <span>Paid: {formatMoney(item.paidAmount, currency)}</span>
                <span>Bal: {formatMoney(item.balanceAmount, currency)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-0.5 text-[9.5px]">
            <div className="font-bold text-black text-[10px]">
              {billData.type === 'MONTHLY'
                ? `Monthly Fee (${formatMonthDisplay(billData.month)})`
                : 'Cable Subscription Dues'}
            </div>
            <div className="text-[8.5px] text-neutral-600">
              Box: #{billData.boxNo} | {billData.paymentDate ? `Paid: ${billData.paymentDate}` : `Date: ${billData.date}`}
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
      <div className="border-t border-dashed border-neutral-400 my-1" />

      {/* Financial Totals */}
      <div className="space-y-0.5 text-[10px]">
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
        <div className="border-t-2 border-b-2 border-black py-0.5 my-1 flex justify-between items-center text-black">
          <span className="text-[10px] font-black uppercase tracking-tight">
            BALANCE DUE:
          </span>
          <span className={`font-black font-mono ${is58mm ? 'text-xs' : 'text-sm'}`}>
            {formatMoney(billData.balanceAmount, currency)}
          </span>
        </div>
      </div>

      {/* Payment Status Stamp */}
      <div className="my-1.5 text-center">
        <div
          className="inline-flex items-center justify-center gap-1.5 w-full py-0.5 px-1.5 border border-dashed font-extrabold text-[9.5px] uppercase tracking-wider"
          style={{
            borderColor: '#000000',
            backgroundColor: '#f3f4f6',
            color: '#000000',
          }}
        >
          {billData.balanceAmount === 0 ? (
            <>
              <CheckCircle className="w-3 h-3 shrink-0 text-black" />
              <span>*** PAID IN FULL ***</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 shrink-0 text-black" />
              <span>*** BALANCE PENDING ***</span>
            </>
          )}
        </div>
      </div>

      {/* Cashier / Signature Line */}
      <div className="pt-1.5 pb-0.5 text-center">
        <div className="border-b border-dotted border-neutral-500 w-28 mx-auto mb-1"></div>
        <p className="text-[8px] text-neutral-700 font-semibold uppercase tracking-wider">
          Authorized Cashier / Stamp
        </p>
      </div>

      {/* Receipt Footer */}
      <div className="text-center pt-1 text-[8px] text-neutral-700 space-y-0.5 border-t border-dashed border-neutral-300">
        <p className="font-bold text-black">
          {profile.receiptFooter || 'Thank you for subscribing to ASK Cable!'}
        </p>
        <p>Please retain this slip for your records.</p>
        <p className="text-[7.5px] text-neutral-500">
          {profile.receiptNotice ||
            `Computer Generated ${paperWidth}mm Thermal Slip`}
        </p>
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
  // Paper size: default to 58mm (standard mini portable Bluetooth printer) or 80mm
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(() => {
    try {
      const saved = localStorage.getItem('ask_cable_thermal_paper_size');
      if (saved === '80') return 80;
    } catch {
      // ignore
    }
    return 58;
  });

  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string>('');
  const [bluetoothMessage, setBluetoothMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [savedPrinter, setSavedPrinter] = useState<{ id: string | null; name: string | null }>(
    () => getSavedPrinterInfo()
  );

  // Save paper size preference
  const handlePaperWidthChange = (width: ThermalPaperWidth) => {
    setPaperWidth(width);
    try {
      localStorage.setItem('ask_cable_thermal_paper_size', String(width));
    } catch {
      // ignore
    }
  };

  // Refresh saved printer and clear messages when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSavedPrinter(getSavedPrinterInfo());
    } else {
      setBluetoothMessage(null);
      setBluetoothStatus('');
      setIsBluetoothPrinting(false);
    }
  }, [isOpen]);

  if (!isOpen || !billData) return null;

  // Resolve active profile
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

  // 1. Direct Web Bluetooth Print (Supports Silent Auto-Reconnection to saved printer!)
  const handleDirectBluetoothPrint = async (forceNewPicker: boolean = false) => {
    setIsBluetoothPrinting(true);
    setBluetoothMessage(null);
    setBluetoothStatus(
      savedPrinter.name && !forceNewPicker
        ? `Connecting to ${savedPrinter.name}...`
        : 'Connecting to Bluetooth printer...'
    );

    try {
      const escPosBytes = generateEscPosReceipt(
        billData,
        currency,
        activeProfile,
        paperWidth
      );

      const result = await printViaWebBluetooth(
        escPosBytes,
        (status) => {
          setBluetoothStatus(status);
        },
        forceNewPicker
      );

      if (result.success) {
        setSavedPrinter(getSavedPrinterInfo());
        setBluetoothMessage({
          type: 'success',
          text: `Printed successfully to ${result.deviceName || savedPrinter.name || 'Bluetooth Printer'}!`,
        });
      } else {
        setBluetoothMessage({
          type: 'error',
          text: result.error || 'Failed to print via Bluetooth.',
        });
      }
    } catch (err: any) {
      setBluetoothMessage({
        type: 'error',
        text: err?.message || 'Bluetooth connection failed.',
      });
    } finally {
      setIsBluetoothPrinting(false);
      setBluetoothStatus('');
    }
  };

  // 2. System Print (PDF / Desktop fallback)
  const handleSystemPrint = () => {
    window.print();
  };

  return (
    <>
      {/* =========================================================================
          SCREEN MODAL (Hidden completely during Print via @media print)
          ========================================================================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:hidden">
        {/* Container Card */}
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Printer className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate leading-tight flex items-center gap-1.5">
                  <span>Thermal Bill Printer</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {paperWidth}mm
                  </span>
                </h3>
                <p className="text-[10.5px] text-neutral-400 font-mono truncate">
                  POS Slip • {billData.billNo}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Paper Size & Quick Control Bar */}
          <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
              <span>Paper Roll:</span>
              <div className="inline-flex rounded-lg bg-neutral-950 p-0.5 border border-neutral-750">
                <button
                  type="button"
                  onClick={() => handlePaperWidthChange(58)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    paperWidth === 58
                      ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  58mm (Mini)
                </button>
                <button
                  type="button"
                  onClick={() => handlePaperWidthChange(80)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    paperWidth === 80
                      ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  80mm (POS)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showGuide ? 'Hide Help' : 'Printer Help'}</span>
            </button>
          </div>

          {/* Quick Help Guide Banner (Collapsible) */}
          {showGuide && (
            <div className="p-3 bg-sky-950/40 border-b border-sky-800/40 text-[11px] text-sky-200 space-y-1.5 animate-in fade-in duration-200">
              <div className="font-bold text-sky-100 flex items-center gap-1">
                <Bluetooth className="w-3.5 h-3.5 text-sky-400" />
                <span>புளூடூத் பிரிண்டர் இயக்கும் முறை:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[10.5px] text-neutral-300">
                <li>
                  பிரிண்டரை ஆன் செய்து உங்கள் சாதனம் (Mobile / PC)-ல் Bluetooth Settings சென்று Pair செய்யவும் (Default PIN: <span className="font-mono font-bold text-white">0000</span> அல்லது <span className="font-mono font-bold text-white">1234</span>).
                </li>
                <li>
                  கீழே உள்ள <strong className="text-emerald-400">⚡ Direct Bluetooth Print</strong> பட்டனை அழுத்தி உங்கள் பிரிண்டரைத் தொடுங்கள் — பில் நேரடியாக அச்சிடப்படும்!
                </li>
                <li>
                  அல்லது வழக்கமான பிரிண்டர் / PDF செய்ய <strong className="text-neutral-200">🖨️ System Print (PDF)</strong> பட்டனை அழுத்தவும்.
                </li>
              </ol>
            </div>
          )}

          {/* Status / Feedback Alert Banner */}
          {bluetoothMessage && (
            <div
              className={`px-4 py-2 text-xs flex items-center justify-between gap-2 border-b ${
                bluetoothMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-200'
                  : bluetoothMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-800/60 text-rose-200'
                  : 'bg-sky-950/60 border-sky-800/60 text-sky-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {bluetoothMessage.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : bluetoothMessage.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span className="truncate">{bluetoothMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setBluetoothMessage(null)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Paper Slip Preview Area */}
          <div className="p-3 sm:p-4 bg-neutral-950 overflow-y-auto flex flex-col items-center flex-1 max-h-[50vh]">
            {/* Helper label */}
            <div className="text-[10px] text-neutral-400 font-mono mb-2 flex items-center gap-1.5">
              <span>🧾 POS Thermal Slip Preview ({paperWidth}mm Roll)</span>
            </div>

            {/* Paper Preview Slip (matches exact roll size) */}
            <div
              className={`bg-white p-3 rounded-xs shadow-2xl border border-neutral-300 transition-all ${
                paperWidth === 58 ? 'w-[230px] max-w-[230px]' : 'w-[290px] max-w-[290px]'
              }`}
            >
              <ThermalReceiptSlip
                billData={billData}
                currency={currency}
                profile={activeProfile}
                paperWidth={paperWidth}
                isPrintOnly={false}
              />
            </div>
          </div>

          {/* Action Toolbar / Print Buttons */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-800 space-y-2">
            {/* Saved Printer status indicator pill */}
            {savedPrinter.name && (
              <div className="flex items-center justify-between px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-[10.5px]">
                <div className="flex items-center gap-1.5 text-neutral-300 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="text-neutral-400 shrink-0">Default Printer:</span>
                  <span className="font-bold text-white truncate">{savedPrinter.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDirectBluetoothPrint(true)}
                  disabled={isBluetoothPrinting}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[10px] font-semibold cursor-pointer shrink-0 ml-2"
                  title="Pair or select another Bluetooth printer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Button 1: Direct Web Bluetooth Print */}
              <button
                type="button"
                onClick={() => handleDirectBluetoothPrint(false)}
                disabled={isBluetoothPrinting}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isBluetoothPrinting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                    <span className="truncate">{bluetoothStatus || 'Printing...'}</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4 text-neutral-950 shrink-0" />
                    <span className="truncate">
                      {savedPrinter.name ? `Direct Print (${savedPrinter.name})` : 'Direct Bluetooth Print'}
                    </span>
                  </>
                )}
              </button>

              {/* Button 2: System Print (PDF) */}
              <button
                type="button"
                onClick={handleSystemPrint}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] text-neutral-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-neutral-700 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span className="truncate">System Print (PDF)</span>
              </button>
            </div>

            {/* Close action */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                Close
              </button>
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
          <ThermalReceiptSlip
            billData={billData}
            currency={currency}
            profile={activeProfile}
            paperWidth={paperWidth}
            isPrintOnly={true}
          />
        </div>,
        document.body
      )}

      {/* =========================================================================
          STRICT SINGLE-SHEET THERMAL PRINT CSS (Supports 58mm & 80mm)
          ========================================================================= */}
      <style>{`
        /* Hide print portal on interactive screen */
        #thermal-receipt-print-portal {
          display: none;
        }

        @media print {
          @page {
            size: ${paperWidth}mm auto;
            margin: 0mm !important;
          }

          html, body {
            width: ${paperWidth}mm !important;
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
           * Removes the app layout, fixed modal backdrops, and background
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
           * Guaranteed single sheet, strictly matching selected roll width
           */
          #thermal-receipt-print-portal {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: ${paperWidth === 58 ? '52mm' : '74mm'} !important;
            max-width: ${paperWidth}mm !important;
            margin: 0 auto !important;
            padding: 1.5mm 2mm 3mm 2mm !important;
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
