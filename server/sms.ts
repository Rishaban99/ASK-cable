/**
 * Notify.lk SMS Gateway Integration
 * High-reliability SMS dispatch for ASK Cable TV Network
 */

export interface NotifyLkSmsParams {
  to: string;
  message: string;
  userId: string;
  apiKey: string;
  senderId?: string;
}

export interface SmsSendResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Format & validate Sri Lankan mobile number into 947XXXXXXXX standard format
 * Supports: 0771234567, +94 77 123 4567, 94771234567, 771234567
 */
export function formatSriLankanPhone(phone: string): string | null {
  if (!phone) return null;
  // Remove non-digit characters
  const clean = phone.replace(/\D/g, '');

  // 07XXXXXXXX (10 digits) -> 947XXXXXXXX
  if (clean.length === 10 && clean.startsWith('07')) {
    return '94' + clean.slice(1);
  }

  // 7XXXXXXXX (9 digits) -> 947XXXXXXXX
  if (clean.length === 9 && clean.startsWith('7')) {
    return '94' + clean;
  }

  // 947XXXXXXXX (11 digits)
  if (clean.length === 11 && clean.startsWith('947')) {
    return clean;
  }

  // Fallback: if already starts with 94 or 0
  if (clean.length >= 9 && clean.length <= 12) {
    return clean;
  }

  return null;
}

/**
 * Send SMS message via Notify.lk Gateway REST API
 */
export async function sendNotifyLkSms(params: NotifyLkSmsParams): Promise<SmsSendResponse> {
  const { to, message, userId, apiKey, senderId = 'NotifyDEMO' } = params;

  if (!userId || !apiKey) {
    return {
      success: false,
      message: 'Notify.lk User ID and API Key are required. Please configure them in Settings > SMS Gateway.',
    };
  }

  const formattedTo = formatSriLankanPhone(to);
  if (!formattedTo) {
    return {
      success: false,
      message: `Invalid Sri Lankan phone number: "${to}". Must be a valid mobile number (e.g. 0771234567).`,
    };
  }

  if (!message || message.trim() === '') {
    return {
      success: false,
      message: 'SMS message content cannot be empty.',
    };
  }

  try {
    const postData = new URLSearchParams();
    postData.append('user_id', userId.trim());
    postData.append('api_key', apiKey.trim());
    postData.append('sender_id', (senderId || 'NotifyDEMO').trim());
    postData.append('to', formattedTo);
    postData.append('message', message.trim());

    const response = await fetch('https://app.notify.lk/api/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: postData.toString(),
    });

    const responseText = await response.text();
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (response.ok && (result.status === 'success' || result.status === 'queued' || result.data === 'Sent' || result.data?.message_id)) {
      return {
        success: true,
        message: 'SMS dispatched successfully via Notify.lk',
        data: result.data || result,
      };
    }

    let errorMsg = '';
    if (Array.isArray(result?.errors) && result.errors.length > 0) {
      errorMsg = result.errors.join(', ');
    } else if (result?.message) {
      errorMsg = result.message;
    } else if (result?.error) {
      errorMsg = result.error;
    } else {
      errorMsg = responseText || `HTTP ${response.status}`;
    }

    if (errorMsg.toLowerCase().includes('sender id is not registered') && senderId !== 'NotifyDEMO') {
      try {
        const fallbackPost = new URLSearchParams();
        fallbackPost.append('user_id', userId.trim());
        fallbackPost.append('api_key', apiKey.trim());
        fallbackPost.append('sender_id', 'NotifyDEMO');
        fallbackPost.append('to', formattedTo);
        fallbackPost.append('message', message.trim());

        const fbResponse = await fetch('https://app.notify.lk/api/v1/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: fallbackPost.toString(),
        });
        const fbText = await fbResponse.text();
        let fbResult: any;
        try { fbResult = JSON.parse(fbText); } catch { fbResult = { raw: fbText }; }

        if (fbResponse.ok && (fbResult.status === 'success' || fbResult.status === 'queued' || fbResult.data === 'Sent' || fbResult.data?.message_id)) {
          return {
            success: true,
            message: `SMS delivered via "NotifyDEMO" fallback (Sender ID "${senderId}" is not yet registered in Notify.lk).`,
            data: fbResult.data || fbResult,
          };
        }
      } catch {
        // proceed with original errorMsg
      }

      errorMsg = `Sender ID "${senderId}" is not registered in your Notify.lk account. Please change Sender ID to "NotifyDEMO" for trial testing, or submit "${senderId}" for TRCSL approval in your Notify.lk dashboard.`;
    }

    return {
      success: false,
      message: errorMsg,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Network failure connecting to Notify.lk: ${error.message || error}`,
    };
  }
}

export interface NotifyLkBalanceResponse {
  success: boolean;
  balance: number;
  active: boolean;
  checkedAt: string;
  error?: string;
}

/**
 * Fetch live account status and credit balance from Notify.lk API
 * Endpoint: GET https://app.notify.lk/api/v1/status?user_id=...&api_key=...
 */
export async function getNotifyLkBalance(credentials: { userId: string; apiKey: string }): Promise<NotifyLkBalanceResponse> {
  const { userId, apiKey } = credentials;
  if (!userId || !apiKey) {
    return {
      success: false,
      balance: 0,
      active: false,
      checkedAt: new Date().toISOString(),
      error: 'User ID and API Key are required to check balance.',
    };
  }

  try {
    const url = `https://app.notify.lk/api/v1/status?user_id=${encodeURIComponent(userId.trim())}&api_key=${encodeURIComponent(apiKey.trim())}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (response.ok && (result.status === 'success' || result.data?.acc_balance !== undefined)) {
      const balance = Number(result.data?.acc_balance ?? 0);
      const active = Boolean(result.data?.active ?? true);
      return {
        success: true,
        balance,
        active,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      balance: 0,
      active: false,
      checkedAt: new Date().toISOString(),
      error: result?.message || result?.errors?.join(', ') || responseText || 'Failed to retrieve balance from Notify.lk',
    };
  } catch (error: any) {
    return {
      success: false,
      balance: 0,
      active: false,
      checkedAt: new Date().toISOString(),
      error: `Network error connecting to Notify.lk: ${error.message || error}`,
    };
  }
}

/**
 * Format YYYY-MM into human-readable English month name (e.g. "2026-10" -> "October 2026")
 */
export function formatMonthName(ym?: string): string {
  if (!ym || !ym.trim()) return '';
  const clean = ym.trim();
  const match = clean.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const monthIndex = parseInt(match[2], 10) - 1;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${year}`;
    }
  }
  return clean;
}

/**
 * Compile payment received SMS template with dynamic customer, bill, and month data
 */
export function compilePaymentSmsTemplate(
  template: string,
  data: {
    customerName: string;
    boxNo: string;
    paidAmount: number | string;
    balanceAmount: number | string;
    month?: string;
    date?: string;
    companyName?: string;
  }
): string {
  const {
    customerName,
    boxNo,
    paidAmount,
    balanceAmount,
    month = '',
    date = new Date().toISOString().split('T')[0],
    companyName = 'ASK CABLE TV NETWORK',
  } = data;

  const formattedPaid = typeof paidAmount === 'number'
    ? paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : paidAmount;

  const formattedBalance = typeof balanceAmount === 'number'
    ? balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : balanceAmount;

  const monthName = formatMonthName(month);

  let compiled = template;

  if (monthName) {
    if (compiled.includes('{month}')) {
      compiled = compiled.replace(/\{month\}/g, monthName);
    } else if (compiled.includes('{boxNo}')) {
      compiled = compiled.replace(/(\{boxNo\})/g, `$1 (${monthName})`);
    } else {
      compiled = `${compiled} [Month: ${monthName}]`;
    }
  } else {
    // If no month provided (e.g. Registration payment), cleanly strip out {month} and optional surrounding parens
    compiled = compiled
      .replace(/\s*\(\{month\}\)/g, '')
      .replace(/\s*for\s*\{month\}/gi, '')
      .replace(/\s*\{month\}/g, '');
  }

  return compiled
    .replace(/\{customerName\}/g, customerName)
    .replace(/\{boxNo\}/g, boxNo)
    .replace(/\{paidAmount\}/g, formattedPaid)
    .replace(/\{balanceAmount\}/g, formattedBalance)
    .replace(/\{date\}/g, date)
    .replace(/\{companyName\}/g, companyName)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Compile new customer registration welcome SMS template
 */
export function compileRegistrationSmsTemplate(
  template: string,
  data: {
    customerName: string;
    boxNo: string;
    totalAmount: number | string;
    paidAmount: number | string;
    balanceAmount: number | string;
    date?: string;
    companyName?: string;
    companyPhone?: string;
  }
): string {
  const {
    customerName,
    boxNo,
    totalAmount,
    paidAmount,
    balanceAmount,
    date = new Date().toISOString().split('T')[0],
    companyName = 'ASK CABLE TV NETWORK',
    companyPhone = '',
  } = data;

  const formattedTotal = typeof totalAmount === 'number'
    ? totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : totalAmount;

  const formattedPaid = typeof paidAmount === 'number'
    ? paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : paidAmount;

  const formattedBalance = typeof balanceAmount === 'number'
    ? balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : balanceAmount;

  return template
    .replace(/\{customerName\}/g, customerName)
    .replace(/\{boxNo\}/g, boxNo)
    .replace(/\{totalAmount\}/g, formattedTotal)
    .replace(/\{paidAmount\}/g, formattedPaid)
    .replace(/\{balanceAmount\}/g, formattedBalance)
    .replace(/\{date\}/g, date)
    .replace(/\{companyName\}/g, companyName)
    .replace(/\{companyPhone\}/g, companyPhone)
    .replace(/\s{2,}/g, ' ')
    .trim();
}
