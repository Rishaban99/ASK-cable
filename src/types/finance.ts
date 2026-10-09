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
