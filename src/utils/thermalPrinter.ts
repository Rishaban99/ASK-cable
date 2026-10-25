// Thermal Printer Utility for ASK Cable
// Supports ESC/POS generation, Direct Web Bluetooth BLE printing, and RawBT Android App Intent

import { BillData, BillLineItem } from '../components/BillPrintModal';
import { SupportedCurrency, SystemProfile } from '../types/finance';
import { formatMoney } from '../api/client';

export type ThermalPaperWidth = 58 | 80;

// ESC/POS Command Constants
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD_INIT = [ESC, 0x40]; // Initialize printer
const CMD_ALIGN_LEFT = [ESC, 0x61, 0x00];
const CMD_ALIGN_CENTER = [ESC, 0x61, 0x01];
const CMD_ALIGN_RIGHT = [ESC, 0x61, 0x02];
const CMD_BOLD_ON = [ESC, 0x45, 0x01];
const CMD_BOLD_OFF = [ESC, 0x45, 0x00];
const CMD_DOUBLE_HEIGHT_ON = [GS, 0x21, 0x01]; // GS ! 1
const CMD_DOUBLE_SIZE_ON = [GS, 0x21, 0x11]; // GS ! 17 (Double width & height)
const CMD_TEXT_NORMAL = [GS, 0x21, 0x00]; // Normal size
const CMD_FEED_AND_CUT = [GS, 0x56, 0x41, 0x03]; // Feed and cut

// Helper to format 2 columns (e.g. Left: Description, Right: Amount)
function formatTwoColumns(left: string, right: string, width: number): string {
  const l = left.trim();
  const r = right.trim();
  const spaceNeeded = width - l.length - r.length;
  if (spaceNeeded >= 1) {
    return l + ' '.repeat(spaceNeeded) + r;
  }
  // Wrap if too long to fit on single line
  const availableForLeft = Math.max(10, width - r.length - 2);
  const truncatedLeft = l.length > availableForLeft ? l.substring(0, availableForLeft - 1) + '.' : l;
  const remSpace = Math.max(1, width - truncatedLeft.length - r.length);
  return truncatedLeft + ' '.repeat(remSpace) + r;
}

// Convert Uint8Array to Base64 safely
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

// ESC/POS Byte Buffer Builder
export class EscPosBuilder {
  private buffer: number[] = [];

  raw(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Ensure ASCII / Latin-1 byte code (0-255)
      this.buffer.push(code <= 255 ? code : 0x3F);
    }
    return this;
  }

  line(str: string = ''): this {
    if (str) {
      this.text(str);
    }
    this.buffer.push(LF);
    return this;
  }

  center(str: string): this {
    this.raw(CMD_ALIGN_CENTER);
    this.line(str);
    this.raw(CMD_ALIGN_LEFT);
    return this;
  }

  bold(enable: boolean = true): this {
    this.raw(enable ? CMD_BOLD_ON : CMD_BOLD_OFF);
    return this;
  }

  normal(): this {
    this.raw(CMD_TEXT_NORMAL);
    this.raw(CMD_BOLD_OFF);
    this.raw(CMD_ALIGN_LEFT);
    return this;
  }

  twoColumn(left: string, right: string, width: number): this {
    this.line(formatTwoColumns(left, right, width));
    return this;
  }

  divider(char: string = '-', width: number): this {
    this.line(char.repeat(width));
    return this;
  }

  feed(lines: number = 2): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  cut(): this {
    this.feed(3);
    this.raw(CMD_FEED_AND_CUT);
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// Helper to format Month (e.g. 2026-10 -> October 2026)
function formatMonthDisplay(mStr?: string): string {
  if (!mStr) return '';
  const [year, month] = mStr.split('-');
  if (!year || !month) return mStr;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

/**
 * Generate binary ESC/POS byte stream for 58mm or 80mm thermal printers
 */
export function generateEscPosReceipt(
  billData: BillData,
  currency: SupportedCurrency = 'LKR',
  profile: SystemProfile,
  paperWidth: ThermalPaperWidth = 58
): Uint8Array {
  const width = paperWidth === 58 ? 32 : 48;
  const builder = new EscPosBuilder();

  // 1. Initialize printer
  builder.raw(CMD_INIT);

  // 2. Company Brand Header
  builder.raw(CMD_ALIGN_CENTER);
  builder.raw(CMD_DOUBLE_HEIGHT_ON);
  builder.bold(true);
  builder.line(profile.companyName || 'ASK CABLE TV NETWORK');
  builder.normal();
  builder.raw(CMD_ALIGN_CENTER);

  if (profile.tagline) {
    builder.line(profile.tagline);
  }
  const contact = `Tel: ${profile.phone || '+94 77 123 4567'}`;
  builder.line(contact);
  builder.raw(CMD_ALIGN_LEFT);

  // 3. Divider
  builder.divider('-', width);

  // 4. Receipt Badge
  builder.raw(CMD_ALIGN_CENTER);
  builder.bold(true);
  const badgeLabel =
    billData.type === 'TOTAL'
      ? '*** TOTAL BILL STATEMENT ***'
      : billData.type === 'MONTHLY'
      ? '*** MONTHLY BILL RECEIPT ***'
      : '*** CUSTOMER RECEIPT ***';
  builder.line(badgeLabel);
  builder.bold(false);
  builder.raw(CMD_ALIGN_LEFT);

  // 5. Bill & Date Metadata
  builder.twoColumn('Bill #:', billData.billNo, width);
  if (billData.paymentDate && billData.paymentDate !== billData.date) {
    builder.twoColumn('Bill Date:', billData.date, width);
    builder.twoColumn('Payment Date:', billData.paymentDate, width);
  } else {
    builder.twoColumn('Date:', billData.paymentDate || billData.date, width);
  }

  // 6. Divider
  builder.divider('-', width);

  // 7. Customer & Box Info
  builder.twoColumn('Customer:', billData.customerName, width);
  builder.twoColumn('Box Number:', `BOX #${billData.boxNo}`, width);

  if (billData.month) {
    builder.twoColumn('Month:', formatMonthDisplay(billData.month), width);
  }
  if (billData.phoneNo) {
    builder.twoColumn('Phone:', billData.phoneNo, width);
  }
  if (billData.nicNo) {
    builder.twoColumn('NIC:', billData.nicNo, width);
  }
  if (billData.address) {
    builder.line(`Address: ${billData.address}`);
  }

  // 8. Divider
  builder.divider('-', width);

  // 9. Line Items / Breakdown
  builder.bold(true);
  builder.twoColumn('Description', `Amount (${currency})`, width);
  builder.bold(false);

  if (billData.items && billData.items.length > 0) {
    billData.items.forEach((item: BillLineItem, idx: number) => {
      builder.twoColumn(`${idx + 1}. ${item.description}`, formatMoney(item.amount, currency), width);
      if (item.dateOrPeriod) {
        builder.line(`   Period: ${item.dateOrPeriod}`);
      }
      builder.twoColumn(
        `   Paid: ${formatMoney(item.paidAmount, currency)}`,
        `Bal: ${formatMoney(item.balanceAmount, currency)}`,
        width
      );
    });
  } else {
    const desc =
      billData.type === 'MONTHLY'
        ? `Monthly Fee (${formatMonthDisplay(billData.month)})`
        : 'Cable Subscription Dues';
    builder.twoColumn(desc, formatMoney(billData.totalOrFeeAmount, currency), width);
    builder.twoColumn('Amount Paid:', formatMoney(billData.paidAmount, currency), width);
  }

  // 10. Divider
  builder.divider('-', width);

  // 11. Financial Totals
  builder.twoColumn('TOTAL BILLED:', formatMoney(billData.totalOrFeeAmount, currency), width);
  builder.twoColumn('TOTAL PAID:', formatMoney(billData.paidAmount, currency), width);

  // High contrast Balance Due
  builder.divider('=', width);
  builder.bold(true);
  builder.raw(CMD_DOUBLE_HEIGHT_ON);
  builder.twoColumn('BALANCE DUE:', formatMoney(billData.balanceAmount, currency), width);
  builder.normal();
  builder.divider('=', width);

  // 12. Payment Status Stamp
  builder.raw(CMD_ALIGN_CENTER);
  builder.bold(true);
  if (billData.balanceAmount === 0) {
    builder.line('[ PAID IN FULL ]');
  } else {
    builder.line('[ BALANCE PENDING ]');
  }
  builder.bold(false);
  builder.raw(CMD_ALIGN_LEFT);

  // 13. Cashier signature line
  builder.feed(1);
  builder.raw(CMD_ALIGN_CENTER);
  builder.line('-----------------------------');
  builder.line('Authorized Cashier / Stamp');
  builder.feed(1);

  // 14. Footer Notice
  builder.line(profile.receiptFooter || 'Thank you for subscribing to ASK Cable!');
  builder.line('Please retain this slip for your records.');
  builder.line(profile.receiptNotice || 'Computer Generated Thermal Receipt');

  // 15. Feed & cut paper
  builder.cut();

  return builder.toBytes();
}

/**
 * Universal GATT Service UUIDs used by Bluetooth thermal printers (POS-58, MPT-II, Goojprt, Netum, etc.)
 */
const COMMON_BLUETOOTH_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // BLE Serial Port Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 common BLE UART
  '0000fff0-0000-1000-8000-00805f9b34fb', // Goojprt / MPT-II / Netum
  '0000e0ff-0000-1000-8000-00805f9b34fb', // Xprinter / Rongta
  '0000ff00-0000-1000-8000-00805f9b34fb', // POS-5802 / POS-80
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / Wechat POS
  '000018f1-0000-1000-8000-00805f9b34fb',
];

export interface BluetoothPrintResult {
  success: boolean;
  deviceName?: string;
  error?: string;
}

export interface SavedPrinterInfo {
  id: string | null;
  name: string | null;
  paperWidth: ThermalPaperWidth;
}

/**
 * Retrieve saved default printer details from localStorage
 */
export function getSavedPrinterInfo(): SavedPrinterInfo {
  try {
    const id = localStorage.getItem('ask_cable_default_printer_id');
    const name = localStorage.getItem('ask_cable_default_printer_name');
    const savedWidth = localStorage.getItem('ask_cable_thermal_paper_size');
    const paperWidth: ThermalPaperWidth = savedWidth === '80' ? 80 : 58;
    return { id, name, paperWidth };
  } catch {
    return { id: null, name: null, paperWidth: 58 };
  }
}

/**
 * Save default printer to localStorage for 1-click silent reconnection
 */
export function saveDefaultPrinter(id: string, name: string): void {
  try {
    localStorage.setItem('ask_cable_default_printer_id', id);
    localStorage.setItem('ask_cable_default_printer_name', name);
  } catch (e) {
    console.error('Failed to save printer to localStorage', e);
  }
}

/**
 * Clear saved default printer from localStorage
 */
export function clearDefaultPrinter(): void {
  try {
    localStorage.removeItem('ask_cable_default_printer_id');
    localStorage.removeItem('ask_cable_default_printer_name');
  } catch (e) {
    console.error('Failed to clear printer from localStorage', e);
  }
}

/**
 * Pair and save a Bluetooth printer (Triggered from Settings or Modal)
 */
export async function pairAndSaveBluetoothPrinter(
  onProgress?: (status: string) => void
): Promise<BluetoothPrintResult> {
  const nav = navigator as unknown as {
    bluetooth?: {
      requestDevice: (options: unknown) => Promise<any>;
    };
  };

  if (!nav.bluetooth) {
    return {
      success: false,
      error: 'Web Bluetooth is not supported on this browser or requires a secure HTTPS connection.',
    };
  }

  try {
    onProgress?.('Searching for Bluetooth printers...');
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_BLUETOOTH_PRINTER_SERVICES,
    });

    const deviceName = device.name || 'Bluetooth Printer';
    const deviceId = device.id || '';
    onProgress?.(`Connecting to test ${deviceName}...`);

    if (device.gatt) {
      try {
        const server = await device.gatt.connect();
        setTimeout(() => {
          try {
            server.disconnect();
          } catch {}
        }, 400);
      } catch (err) {
        console.warn('Initial GATT handshake check had a warning, still saving pairing:', err);
      }
    }

    // Save as default
    saveDefaultPrinter(deviceId, deviceName);
    onProgress?.(`Saved "${deviceName}" as default printer!`);

    return {
      success: true,
      deviceName,
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
      return {
        success: false,
        error: 'Printer selection was cancelled.',
      };
    }
    return {
      success: false,
      error: err.message || 'Failed to pair Bluetooth printer.',
    };
  }
}

/**
 * Generate a small test receipt slip to verify printer connection
 */
export function generateTestReceipt(
  profile: SystemProfile,
  paperWidth: ThermalPaperWidth = 58
): Uint8Array {
  const width = paperWidth === 58 ? 32 : 48;
  const builder = new EscPosBuilder();

  builder.raw(CMD_INIT);
  builder.raw(CMD_ALIGN_CENTER);
  builder.bold(true);
  builder.line(profile.companyName || 'ASK CABLE TV NETWORK');
  builder.normal();
  builder.raw(CMD_ALIGN_CENTER);
  builder.line('*** THERMAL PRINTER TEST ***');
  builder.divider('-', width);
  builder.twoColumn('Status:', 'CONNECTED [OK]', width);
  builder.twoColumn('Paper Width:', `${paperWidth}mm`, width);
  builder.twoColumn('Date:', new Date().toLocaleDateString(), width);
  builder.twoColumn('Time:', new Date().toLocaleTimeString(), width);
  builder.divider('=', width);
  builder.raw(CMD_ALIGN_CENTER);
  builder.bold(true);
  builder.line('[ ONE-TIME PAIR SUCCESSFUL ]');
  builder.normal();
  builder.divider('=', width);
  builder.raw(CMD_ALIGN_CENTER);
  builder.line('Ready for instant 1-click printing!');
  builder.feed(2);
  builder.cut();

  return builder.toBytes();
}

/**
 * Direct Web Bluetooth Printing with Silent Reconnection
 * If a printer was previously paired and permitted, automatically reconnects without showing the device picker!
 */
export async function printViaWebBluetooth(
  data: Uint8Array,
  onProgress?: (status: string) => void,
  forceNewPicker: boolean = false
): Promise<BluetoothPrintResult> {
  const nav = navigator as unknown as {
    bluetooth?: {
      requestDevice: (options: unknown) => Promise<any>;
      getDevices?: () => Promise<any[]>;
    };
  };

  if (!nav.bluetooth) {
    return {
      success: false,
      error:
        'Web Bluetooth is not supported on this browser. Please ensure you are using Chrome on Android or Desktop over HTTPS.',
    };
  }

  try {
    let device: any = null;
    const savedInfo = getSavedPrinterInfo();

    // 1. Silent Auto-Reconnection: If not forcing a new picker, check previously permitted devices
    if (!forceNewPicker && typeof nav.bluetooth.getDevices === 'function') {
      try {
        onProgress?.('Checking saved Bluetooth printer...');
        const permittedDevices = await nav.bluetooth.getDevices();
        if (permittedDevices && permittedDevices.length > 0) {
          if (savedInfo.id) {
            device = permittedDevices.find((d) => d.id === savedInfo.id);
          }
          // If no exact ID match or ID wasn't saved, but exactly 1 device is permitted for this site
          if (!device && permittedDevices.length === 1) {
            device = permittedDevices[0];
          }
        }
      } catch (e) {
        console.warn('Silent getDevices check failed, will open picker:', e);
      }
    }

    // 2. If no previously permitted device found or picker forced, prompt user
    if (!device) {
      onProgress?.('Searching for Bluetooth printers...');
      device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: COMMON_BLUETOOTH_PRINTER_SERVICES,
      });

      // Automatically save as default printer for future silent prints!
      if (device.id && device.name) {
        saveDefaultPrinter(device.id, device.name);
      }
    }

    const deviceName = device.name || savedInfo.name || 'Bluetooth Printer';
    onProgress?.(`Connecting to ${deviceName}...`);

    if (!device.gatt) {
      throw new Error('Device does not have a GATT server available.');
    }

    const server = await device.gatt.connect();
    onProgress?.('Locating printer communication channel...');

    let writeCharacteristic: any = null;

    // Scan known printer service UUIDs
    for (const serviceUuid of COMMON_BLUETOOTH_PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
        if (writeCharacteristic) break;
      } catch {
        // Service not found on this device, check next
      }
    }

    // Fallback: If no known service matched, inspect all primary services if supported
    if (!writeCharacteristic && typeof server.getPrimaryServices === 'function') {
      try {
        const allServices = await server.getPrimaryServices();
        for (const service of allServices) {
          try {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                writeCharacteristic = char;
                break;
              }
            }
            if (writeCharacteristic) break;
          } catch {
            // continue
          }
        }
      } catch {
        // continue
      }
    }

    if (!writeCharacteristic) {
      throw new Error(
        `Connected to "${deviceName}", but could not find a writable ESC/POS channel.`
      );
    }

    onProgress?.('Sending receipt to printer...');

    // Transmit in 100-byte chunks to prevent buffer overflow on low-speed microcontrollers
    const CHUNK_SIZE = 100;
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      if (writeCharacteristic.properties.writeWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
      // 20ms pause between chunks for printer buffer sync
      await new Promise((r) => setTimeout(r, 20));
    }

    onProgress?.('Printing completed successfully!');

    // Disconnect cleanly after 600ms
    setTimeout(() => {
      try {
        if (device.gatt && device.gatt.connected) {
          device.gatt.disconnect();
        }
      } catch {
        // ignore disconnect errors
      }
    }, 600);

    return {
      success: true,
      deviceName,
    };
  } catch (err: any) {
    console.error('Bluetooth Print Error:', err);
    if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
      return {
        success: false,
        error: 'Printer selection was cancelled.',
      };
    }
    return {
      success: false,
      error: err.message || 'Failed to print via Bluetooth.',
    };
  }
}

/**
 * Device helpers
 */
export const isAndroidDevice = (): boolean => {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
};

export const isMobileDevice = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

/**
 * 1-Tap Print via RawBT Android App
 * Uses the official Android intent and rawbt: scheme to pass ESC/POS Base64 data to RawBT
 */
export function printViaRawBt(escPosBytes: Uint8Array): void {
  const base64 = uint8ArrayToBase64(escPosBytes);

  // 1. Android Intent format (Primary for Chrome / Firefox on Android)
  const intentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  
  // 2. Direct scheme format (Secondary fallback)
  const rawbtSchemeUrl = `rawbt:base64,${base64}`;

  // Trigger via anchor click for best mobile browser compatibility
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = intentUrl;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch {
      // ignore
    }
  }, 1000);

  // Fallback to direct rawbt: scheme
  setTimeout(() => {
    try {
      window.location.href = rawbtSchemeUrl;
    } catch {
      // ignore
    }
  }, 250);
}
