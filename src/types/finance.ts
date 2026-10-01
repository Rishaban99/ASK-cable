export type SupportedCurrency = 'LKR';

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  isDefault?: boolean;
  createdAt?: string;
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
