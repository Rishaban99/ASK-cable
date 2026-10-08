import {
  User,
  Category,
  Customer,
  MonthlyPayment,
  IncomeRecord,
  ExpenseRecord,
  AnalyticsOverview,
  SupportedCurrency,
  TableMeta,
  TableQueryResponse,
  SqlQueryResult
} from '../types/finance.js';

export const CURRENCY_CONF = {
  code: 'LKR',
  symbol: 'Rs. ',
  name: 'Sri Lankan Rupee',
};

export function formatMoney(amount: number, _currency?: SupportedCurrency): string {
  return `Rs. ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCompactMoney(amount: number, _currency?: SupportedCurrency): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `Rs. ${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rs. ${(amount / 1_000).toFixed(1)}k`;
  }
  return formatMoney(amount);
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // AI Spell Check & Polish
  async fixSpelling(text: string): Promise<string> {
    if (!text || !text.trim()) return '';
    try {
      const res = await this.request<{ correctedText: string }>('/ai/autocorrect', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      return res.correctedText || text;
    } catch (e) {
      console.warn('AI spell check error:', e);
      return text;
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await this.request<{ categories: Category[] }>('/categories');
    return res.categories;
  }

  async createCategory(data: { name: string; type: 'INCOME' | 'EXPENSE'; icon: string; color: string }): Promise<Category> {
    const res = await this.request<{ category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.category;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const res = await this.request<{ category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.category;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // Incomes Table API
  async getIncomes(filter?: { categoryId?: string; search?: string }): Promise<IncomeRecord[]> {
    const params = new URLSearchParams();
    if (filter?.categoryId) params.set('categoryId', filter.categoryId);
    if (filter?.search) params.set('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ incomes: IncomeRecord[] }>(`/incomes${query}`);
    return res.incomes;
  }

  async createIncome(data: {
    categoryId: string;
    amount: number;
    date: string;
    description: string;
    paymentMethod: string;
    tags?: string[];
  }): Promise<IncomeRecord> {
    const res = await this.request<{ income: IncomeRecord }>('/incomes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.income;
  }

  async updateIncome(id: string, data: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const res = await this.request<{ income: IncomeRecord }>(`/incomes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.income;
  }

  async deleteIncome(id: string): Promise<void> {
    await this.request(`/incomes/${id}`, { method: 'DELETE' });
  }

  // Expenses Table API
  async getExpenses(filter?: { categoryId?: string; search?: string }): Promise<ExpenseRecord[]> {
    const params = new URLSearchParams();
    if (filter?.categoryId) params.set('categoryId', filter.categoryId);
    if (filter?.search) params.set('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ expenses: ExpenseRecord[] }>(`/expenses${query}`);
    return res.expenses;
  }

  async createExpense(data: {
    categoryId: string;
    amount: number;
    date: string;
    description: string;
    paymentMethod: string;
    tags?: string[];
  }): Promise<ExpenseRecord> {
    const res = await this.request<{ expense: ExpenseRecord }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.expense;
  }

  async updateExpense(id: string, data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const res = await this.request<{ expense: ExpenseRecord }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.expense;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.request(`/expenses/${id}`, { method: 'DELETE' });
  }

  // Customers API
  async getCustomers(search?: string): Promise<Customer[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await this.request<{ customers: Customer[] }>(`/customers${query}`);
    return res.customers;
  }

  async createCustomer(data: {
    name: string;
    nicNo: string;
    phoneNo: string;
    address: string;
    boxNo: string;
    totalAmount: number;
    paidAmount: number;
    status?: 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED';
  }): Promise<Customer> {
    const res = await this.request<{ customer: Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.customer;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await this.request<{ customer: Customer }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.request(`/customers/${id}`, { method: 'DELETE' });
  }

  // Monthly Payments API
  async getMonthlyPayments(filter?: {
    month?: string;
    customerId?: string;
    search?: string;
    status?: string;
  }): Promise<MonthlyPayment[]> {
    const params = new URLSearchParams();
    if (filter?.month) params.set('month', filter.month);
    if (filter?.customerId) params.set('customerId', filter.customerId);
    if (filter?.search) params.set('search', filter.search);
    if (filter?.status) params.set('status', filter.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ payments: MonthlyPayment[] }>(`/monthly-payments${query}`);
    return res.payments;
  }

  async createMonthlyPayment(data: {
    customerId: string;
    month: string;
    monthlyFee: number;
    paidAmount: number;
    paymentDate?: string;
  }): Promise<MonthlyPayment> {
    const res = await this.request<{ payment: MonthlyPayment }>('/monthly-payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.payment;
  }

  async updateMonthlyPayment(id: string, data: Partial<MonthlyPayment>): Promise<MonthlyPayment> {
    const res = await this.request<{ payment: MonthlyPayment }>(`/monthly-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.payment;
  }

  async deleteMonthlyPayment(id: string): Promise<void> {
    await this.request(`/monthly-payments/${id}`, { method: 'DELETE' });
  }

  // Analytics Overview
  async getAnalytics(): Promise<AnalyticsOverview> {
    const res = await this.request<{ analytics: AnalyticsOverview }>('/analytics/overview');
    return res.analytics;
  }

  // CSV Exports
  downloadIncomesCsv() {
    fetch('/api/export/incomes-csv')
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incomes_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  downloadExpensesCsv() {
    fetch('/api/export/expenses-csv')
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  async getSqlSchema(): Promise<string> {
    const res = await this.request<{ sql: string }>('/schema/sql');
    return res.sql;
  }

  // DB Table Inspector
  async getDbTables(): Promise<TableMeta[]> {
    const res = await this.request<{ tables: TableMeta[] }>('/database/tables');
    return res.tables;
  }

  async getTableData(tableName: string, page = 1, limit = 50, search = ''): Promise<TableQueryResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
    });
    return this.request<TableQueryResponse>(`/database/tables/${tableName}?${params.toString()}`);
  }

  async insertTableRow(tableName: string, data: Record<string, any>): Promise<any> {
    return this.request<{ row: any; message: string }>(`/database/tables/${tableName}/rows`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTableRow(tableName: string, rowId: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/database/tables/${tableName}/rows/${rowId}`, {
      method: 'DELETE',
    });
    return res.success;
  }

  async executeSqlQuery(sql: string): Promise<SqlQueryResult> {
    return this.request<SqlQueryResult>('/database/query', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    });
  }

  // Authentication API
  async login(username: string, password: string): Promise<User> {
    const res = await this.request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return res.user;
  }

  async getUsers(): Promise<User[]> {
    const res = await this.request<{ users: User[] }>('/auth/users');
    return res.users;
  }

  async createUser(data: { username: string; password: string; name: string; role: 'ADMIN' | 'STAFF' }): Promise<User> {
    const res = await this.request<{ user: User }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/auth/users/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
