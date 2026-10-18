export type SupportedCurrency = 'LKR';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
  createdAt?: string;
}

export interface StaffPrivileges {
  dashboard: boolean;
  transactions: boolean;
  summary: boolean;
  customers: boolean;
  'monthly-payment': boolean;
  'customer-history': boolean;
  'payment-collection': boolean;
}

export const DEFAULT_STAFF_PRIVILEGES: StaffPrivileges = {
  dashboard: true,
  transactions: true,
  summary: false,
  customers: true,
  'monthly-payment': true,
  'customer-history': true,
  'payment-collection': true,
};

export interface SystemProfile {
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address?: string;
  receiptFooter?: string;
  receiptNotice?: string;
}

export const DEFAULT_SYSTEM_PROFILE: SystemProfile = {
  companyName: 'ASK CABLE TV NETWORK',
  tagline: 'Cable TV Subscriptions & Services',
  phone: '+94 77 123 4567',
  email: 'support@askcable.lk',
  address: 'Main Street, Nanu Oya',
  receiptFooter: 'Thank you for subscribing to ASK Cable!',
  receiptNotice: 'Computer Generated 80mm Receipt • System Validated',
};

export interface SmsSettings {
  enabled: boolean;
  provider: 'NOTIFY_LK' | 'CUSTOM';
  userId: string;
  apiKey: string;
  senderId: string;
  paymentSmsTemplate: string;
  registrationSmsTemplate: string;
}

export const DEFAULT_SMS_SETTINGS: SmsSettings = {
  enabled: false,
  provider: 'NOTIFY_LK',
  userId: '',
  apiKey: '',
  senderId: 'NotifyDEMO',
  paymentSmsTemplate: 'Dear {customerName}, payment of Rs. {paidAmount} for Box #{boxNo} ({month}) received on {date}. Remaining Balance: Rs. {balanceAmount}. Thank you, {companyName}.',
  registrationSmsTemplate: 'Welcome {customerName}! Your ASK Cable TV registration for Box #{boxNo} is successful on {date}. Total Fee: Rs. {totalAmount}, Paid: Rs. {paidAmount}, Balance: Rs. {balanceAmount}. Helpline: {companyPhone}. Thank you, {companyName}.',
};

export interface SendPaymentSmsPayload {
  customerName: string;
  phoneNo: string;
  boxNo: string;
  paidAmount: number;
  balanceAmount: number;
  month?: string;
  paymentDate?: string;
  billNo?: string;
}

export interface SendRegistrationSmsPayload {
  customerName: string;
  phoneNo: string;
  boxNo: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  registrationDate?: string;
}

export interface SmsSendResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface SmsLogEntry {
  id: string;
  type: 'PAYMENT' | 'REGISTRATION' | 'TEST' | 'CUSTOM';
  recipientPhone: string;
  customerName?: string;
  boxNo?: string;
  message: string;
  senderId: string;
  status: 'DELIVERED' | 'FAILED';
  gatewayResponse?: string;
  createdAt: string;
}

export interface SmsBalanceResponse {
  success: boolean;
  balance: number;
  active: boolean;
  checkedAt: string;
  error?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  nicNo: string;
  phoneNo: string;
  address: string;
  boxNo: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED';
  createdAt: string;
}

export interface MonthlyPayment {
  id: string;
  customerId: string;
  customerName: string;
  boxNo: string;
  month: string;
  monthlyFee: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentDate: string;
  createdAt: string;
}

export interface IncomeRecord {
  id: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseRecord {
  id: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CashFlowSummary {
  periodMonth: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRatePct: number;
  incomeTransactionsCount: number;
  expenseTransactionsCount: number;
}

export interface AnalyticsOverview {
  netWorth: number;
  totalLiquidCash: number;
  monthlyCashFlow: CashFlowSummary;
  recentIncomes: IncomeRecord[];
  recentExpenses: ExpenseRecord[];
  topExpenseCategories: { categoryName: string; color: string; amount: number; percentage: number }[];
  monthlyCashflowHistory: { month: string; income: number; expense: number; net: number }[];
  netWorthHistory: { month: string; value: number }[];
}

export interface TableColumnDef {
  name: string;
  type: string;
}

export interface TableMeta {
  name: string;
  displayName: string;
  description: string;
  rowCount: number;
  columnCount: number;
  sizeBytes: number;
  columns: TableColumnDef[];
}

export interface TableQueryResponse {
  tableName: string;
  columns: TableColumnDef[];
  rows: Record<string, any>[];
  totalRows: number;
  page: number;
  limit: number;
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  statementType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALTER' | 'UNKNOWN';
  message?: string;
}
