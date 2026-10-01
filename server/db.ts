import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  Category,
  IncomeRecord,
  ExpenseRecord,
  CashFlowSummary,
  AnalyticsOverview,
  TableMeta,
  TableQueryResponse,
  SqlQueryResult
} from '../src/types/finance.js';

interface DatabaseSchema {
  categories: Category[];
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Mongoose Models for MongoDB Atlas
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['INCOME', 'EXPENSE'], required: true },
  icon: { type: String, default: 'Tag' },
  color: { type: String, default: '#10B981' },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: String }
});

const incomeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  paymentMethod: { type: String, default: 'BANK_TRANSFER' },
  tags: [String],
  createdAt: { type: String },
  updatedAt: { type: String }
});

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  paymentMethod: { type: String, default: 'CASH' },
  tags: [String],
  createdAt: { type: String },
  updatedAt: { type: String }
});

const CategoryModel = mongoose.models.Category || mongoose.model('Category', categorySchema);
const IncomeModel = mongoose.models.Income || mongoose.model('Income', incomeSchema, 'incomes');
const ExpenseModel = mongoose.models.Expense || mongoose.model('Expense', expenseSchema, 'expenses');

function createDefaultSeed(): DatabaseSchema {
  return { categories: [], incomes: [], expenses: [] };
}

export class RelationalDatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      this.data = createDefaultSeed();
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          categories: parsed.categories || [],
          incomes: parsed.incomes || [],
          expenses: parsed.expenses || [],
        };
      } catch (err) {
        console.error('Error loading database.json, resetting:', err);
        this.data = createDefaultSeed();
        this.save();
      }
    }
  }

  private save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // -------------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------------
  public getCategories(): Category[] {
    return this.data.categories;
  }

  public createCategory(dto: { name: string; type: 'INCOME' | 'EXPENSE'; icon?: string; color?: string }): Category {
    const id = `cat_${crypto.randomBytes(6).toString('hex')}`;
    const newCat: Category = {
      id,
      name: dto.name,
      type: dto.type,
      icon: dto.icon || 'Tag',
      color: dto.color || (dto.type === 'INCOME' ? '#10B981' : '#F43F5E'),
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this.data.categories.push(newCat);
    this.save();

    if (mongoose.connection.readyState === 1) {
      CategoryModel.create(newCat).catch(err => console.error('Mongo create category error:', err.message));
    }
    return newCat;
  }

  public updateCategory(id: string, dto: Partial<Category>): Category {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Category "${id}" not found`);

    const updated = { ...this.data.categories[idx], ...dto };
    this.data.categories[idx] = updated;
    this.save();

    if (mongoose.connection.readyState === 1) {
      CategoryModel.updateOne({ id }, updated).catch(err => console.error('Mongo update category error:', err.message));
    }
    return updated;
  }

  public deleteCategory(id: string): boolean {
    const before = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    const deleted = this.data.categories.length < before;
    if (deleted) {
      this.save();
      if (mongoose.connection.readyState === 1) {
        CategoryModel.deleteOne({ id }).catch(err => console.error('Mongo delete category error:', err.message));
      }
    }
    return deleted;
  }

  // -------------------------------------------------------------------
  // INCOMES TABLE
  // -------------------------------------------------------------------
  public getIncomes(filter?: { categoryId?: string; search?: string }): IncomeRecord[] {
    let recs = [...this.data.incomes];
    const catMap = new Map(this.data.categories.map((c) => [c.id, c]));

    if (filter?.categoryId) {
      recs = recs.filter((r) => r.categoryId === filter.categoryId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      recs = recs.filter((r) => r.description.toLowerCase().includes(q));
    }

    recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return recs.map((r) => {
      const cat = catMap.get(r.categoryId);
      return {
        ...r,
        categoryName: cat ? cat.name : 'Uncategorized Income',
        categoryIcon: cat ? cat.icon : 'TrendingUp',
        categoryColor: cat ? cat.color : '#10B981',
      };
    });
  }

  public createIncome(dto: {
    categoryId: string;
    amount: number;
    date: string;
    description: string;
    paymentMethod?: string;
    tags?: string[];
  }): IncomeRecord {
    const id = `inc_${crypto.randomBytes(6).toString('hex')}`;
    const record: IncomeRecord = {
      id,
      categoryId: dto.categoryId,
      amount: Math.abs(dto.amount),
      date: dto.date,
      description: dto.description,
      paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
      tags: dto.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.incomes.unshift(record);
    this.save();

    if (mongoose.connection.readyState === 1) {
      IncomeModel.create(record).catch(err => console.error('Mongo create income error:', err.message));
    }

    const cat = this.data.categories.find((c) => c.id === dto.categoryId);
    return {
      ...record,
      categoryName: cat ? cat.name : 'Uncategorized Income',
      categoryIcon: cat ? cat.icon : 'TrendingUp',
      categoryColor: cat ? cat.color : '#10B981',
    };
  }

  public updateIncome(id: string, dto: Partial<IncomeRecord>): IncomeRecord {
    const idx = this.data.incomes.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Income record "${id}" not found`);

    const existing = this.data.incomes[idx];
    const updated: IncomeRecord = {
      ...existing,
      ...dto,
      amount: dto.amount !== undefined ? Math.abs(dto.amount) : existing.amount,
      updatedAt: new Date().toISOString(),
    };

    this.data.incomes[idx] = updated;
    this.save();

    if (mongoose.connection.readyState === 1) {
      IncomeModel.updateOne({ id }, updated).catch(err => console.error('Mongo update income error:', err.message));
    }

    const cat = this.data.categories.find((c) => c.id === updated.categoryId);
    return {
      ...updated,
      categoryName: cat ? cat.name : 'Uncategorized Income',
      categoryIcon: cat ? cat.icon : 'TrendingUp',
      categoryColor: cat ? cat.color : '#10B981',
    };
  }

  public deleteIncome(id: string): boolean {
    const before = this.data.incomes.length;
    this.data.incomes = this.data.incomes.filter((r) => r.id !== id);
    const deleted = this.data.incomes.length < before;
    if (deleted) {
      this.save();
      if (mongoose.connection.readyState === 1) {
        IncomeModel.deleteOne({ id }).catch(err => console.error('Mongo delete income error:', err.message));
      }
    }
    return deleted;
  }

  // -------------------------------------------------------------------
  // EXPENSES TABLE
  // -------------------------------------------------------------------
  public getExpenses(filter?: { categoryId?: string; search?: string }): ExpenseRecord[] {
    let recs = [...this.data.expenses];
    const catMap = new Map(this.data.categories.map((c) => [c.id, c]));

    if (filter?.categoryId) {
      recs = recs.filter((r) => r.categoryId === filter.categoryId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      recs = recs.filter((r) => r.description.toLowerCase().includes(q));
    }

    recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return recs.map((r) => {
      const cat = catMap.get(r.categoryId);
      return {
        ...r,
        categoryName: cat ? cat.name : 'Uncategorized Expense',
        categoryIcon: cat ? cat.icon : 'TrendingDown',
        categoryColor: cat ? cat.color : '#F43F5E',
      };
    });
  }

  public createExpense(dto: {
    categoryId: string;
    amount: number;
    date: string;
    description: string;
    paymentMethod?: string;
    tags?: string[];
  }): ExpenseRecord {
    const id = `exp_${crypto.randomBytes(6).toString('hex')}`;
    const record: ExpenseRecord = {
      id,
      categoryId: dto.categoryId,
      amount: Math.abs(dto.amount),
      date: dto.date,
      description: dto.description,
      paymentMethod: dto.paymentMethod || 'CASH',
      tags: dto.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.expenses.unshift(record);
    this.save();

    if (mongoose.connection.readyState === 1) {
      ExpenseModel.create(record).catch(err => console.error('Mongo create expense error:', err.message));
    }

    const cat = this.data.categories.find((c) => c.id === dto.categoryId);
    return {
      ...record,
      categoryName: cat ? cat.name : 'Uncategorized Expense',
      categoryIcon: cat ? cat.icon : 'TrendingDown',
      categoryColor: cat ? cat.color : '#F43F5E',
    };
  }

  public updateExpense(id: string, dto: Partial<ExpenseRecord>): ExpenseRecord {
    const idx = this.data.expenses.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Expense record "${id}" not found`);

    const existing = this.data.expenses[idx];
    const updated: ExpenseRecord = {
      ...existing,
      ...dto,
      amount: dto.amount !== undefined ? Math.abs(dto.amount) : existing.amount,
      updatedAt: new Date().toISOString(),
    };

    this.data.expenses[idx] = updated;
    this.save();

    if (mongoose.connection.readyState === 1) {
      ExpenseModel.updateOne({ id }, updated).catch(err => console.error('Mongo update expense error:', err.message));
    }

    const cat = this.data.categories.find((c) => c.id === updated.categoryId);
    return {
      ...updated,
      categoryName: cat ? cat.name : 'Uncategorized Expense',
      categoryIcon: cat ? cat.icon : 'TrendingDown',
      categoryColor: cat ? cat.color : '#F43F5E',
    };
  }

  public deleteExpense(id: string): boolean {
    const before = this.data.expenses.length;
    this.data.expenses = this.data.expenses.filter((r) => r.id !== id);
    const deleted = this.data.expenses.length < before;
    if (deleted) {
      this.save();
      if (mongoose.connection.readyState === 1) {
        ExpenseModel.deleteOne({ id }).catch(err => console.error('Mongo delete expense error:', err.message));
      }
    }
    return deleted;
  }

  // -------------------------------------------------------------------
  // ANALYTICS OVERVIEW
  // -------------------------------------------------------------------
  public getAnalyticsOverview(): AnalyticsOverview {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalIncome = 0;
    let totalExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const inc of this.data.incomes) {
      totalIncome += inc.amount;
      if (inc.date.startsWith(currentMonthStr)) {
        monthlyIncome += inc.amount;
        incomeCount++;
      }
    }

    const curMonthExpenses: ExpenseRecord[] = [];
    for (const exp of this.data.expenses) {
      totalExpense += exp.amount;
      if (exp.date.startsWith(currentMonthStr)) {
        monthlyExpense += exp.amount;
        expenseCount++;
        curMonthExpenses.push(exp);
      }
    }

    const netSavings = monthlyIncome - monthlyExpense;
    const savingsRatePct = monthlyIncome > 0 ? Number(((netSavings / monthlyIncome) * 100).toFixed(1)) : 0;
    const netBalance = totalIncome - totalExpense;

    const monthlyCashFlow: CashFlowSummary = {
      periodMonth: currentMonthStr,
      totalIncome: monthlyIncome,
      totalExpense: monthlyExpense,
      netSavings,
      savingsRatePct,
      incomeTransactionsCount: incomeCount,
      expenseTransactionsCount: expenseCount,
    };

    // Category breakdown for current month expenses
    const categoriesMap = new Map(this.data.categories.map((c) => [c.id, c]));
    const catSpend: Record<string, number> = {};
    for (const exp of curMonthExpenses) {
      catSpend[exp.categoryId] = (catSpend[exp.categoryId] || 0) + exp.amount;
    }

    const topExpenseCategories = Object.entries(catSpend)
      .map(([catId, amount]) => {
        const cat = categoriesMap.get(catId);
        return {
          categoryName: cat ? cat.name : 'Other',
          color: cat ? cat.color : '#64748B',
          amount,
          percentage: monthlyExpense > 0 ? Number(((amount / monthlyExpense) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Monthly Cashflow History
    const monthlyCashflowHistory: { month: string; income: number; expense: number; net: number }[] = [];
    const netWorthHistory: { month: string; value: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });

      let inc = 0;
      let exp = 0;
      for (const item of this.data.incomes) {
        if (item.date.startsWith(monthKey)) inc += item.amount;
      }
      for (const item of this.data.expenses) {
        if (item.date.startsWith(monthKey)) exp += item.amount;
      }

      monthlyCashflowHistory.push({
        month: monthLabel,
        income: inc,
        expense: exp,
        net: inc - exp,
      });

      netWorthHistory.push({
        month: monthLabel,
        value: Math.max(0, netBalance),
      });
    }

    return {
      netWorth: netBalance,
      totalLiquidCash: netBalance,
      monthlyCashFlow,
      recentIncomes: this.getIncomes().slice(0, 5),
      recentExpenses: this.getExpenses().slice(0, 5),
      topExpenseCategories,
      monthlyCashflowHistory,
      netWorthHistory,
    };
  }

  // -------------------------------------------------------------------
  // TABLE & QUERY INSPECTOR (for DB management)
  // -------------------------------------------------------------------
  public getTablesMeta(): TableMeta[] {
    return [
      {
        name: 'categories',
        displayName: 'Categories',
        description: 'Category lookup table linked to incomes and expenses',
        rowCount: this.data.categories.length,
        columnCount: 5,
        sizeBytes: JSON.stringify(this.data.categories).length,
        columns: [
          { name: 'id', type: 'VARCHAR(36)' },
          { name: 'name', type: 'VARCHAR(100)' },
          { name: 'type', type: 'VARCHAR(10)' },
          { name: 'icon', type: 'VARCHAR(50)' },
          { name: 'color', type: 'VARCHAR(20)' },
        ],
      },
      {
        name: 'incomes',
        displayName: 'Incomes Table',
        description: 'All revenue & income ledger entries linked to categories',
        rowCount: this.data.incomes.length,
        columnCount: 7,
        sizeBytes: JSON.stringify(this.data.incomes).length,
        columns: [
          { name: 'id', type: 'VARCHAR(36)' },
          { name: 'categoryId', type: 'VARCHAR(36)' },
          { name: 'amount', type: 'DECIMAL(15,2)' },
          { name: 'date', type: 'DATE' },
          { name: 'description', type: 'VARCHAR(255)' },
          { name: 'paymentMethod', type: 'VARCHAR(30)' },
          { name: 'createdAt', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'expenses',
        displayName: 'Expenses Table',
        description: 'All operational & expense entries linked to categories',
        rowCount: this.data.expenses.length,
        columnCount: 7,
        sizeBytes: JSON.stringify(this.data.expenses).length,
        columns: [
          { name: 'id', type: 'VARCHAR(36)' },
          { name: 'categoryId', type: 'VARCHAR(36)' },
          { name: 'amount', type: 'DECIMAL(15,2)' },
          { name: 'date', type: 'DATE' },
          { name: 'description', type: 'VARCHAR(255)' },
          { name: 'paymentMethod', type: 'VARCHAR(30)' },
          { name: 'createdAt', type: 'TIMESTAMP' },
        ],
      },
    ];
  }

  public getTableData(tableName: string, page = 1, limit = 50): TableQueryResponse {
    const meta = this.getTablesMeta().find((t) => t.name === tableName);
    if (!meta) throw new Error(`Table "${tableName}" not found`);

    let rows: any[] = [];
    if (tableName === 'incomes') rows = this.getIncomes();
    else if (tableName === 'expenses') rows = this.getExpenses();
    else if (tableName === 'categories') rows = this.data.categories;

    const totalRows = rows.length;
    const start = (page - 1) * limit;
    const paginatedRows = rows.slice(start, start + limit);

    return {
      tableName,
      columns: meta.columns,
      rows: paginatedRows,
      totalRows,
      page,
      limit,
    };
  }

  public insertTableRow(tableName: string, data: Record<string, any>): Record<string, any> {
    if (tableName === 'incomes') return this.createIncome(data as any);
    if (tableName === 'expenses') return this.createExpense(data as any);
    if (tableName === 'categories') return this.createCategory(data as any);
    throw new Error(`Cannot insert into unknown table "${tableName}"`);
  }

  public deleteTableRow(tableName: string, rowId: string): boolean {
    if (tableName === 'incomes') return this.deleteIncome(rowId);
    if (tableName === 'expenses') return this.deleteExpense(rowId);
    if (tableName === 'categories') return this.deleteCategory(rowId);
    return false;
  }

  public executeSql(sql: string): SqlQueryResult {
    const startTime = Date.now();
    const upper = sql.trim().toUpperCase();
    let statementType: SqlQueryResult['statementType'] = 'UNKNOWN';
    let rows: any[] = [];
    let columns: string[] = [];

    if (upper.startsWith('SELECT')) {
      statementType = 'SELECT';
      if (upper.includes('FROM INCOMES')) {
        const data = this.getTableData('incomes', 1, 100);
        rows = data.rows;
        columns = data.columns.map((c) => c.name);
      } else if (upper.includes('FROM EXPENSES')) {
        const data = this.getTableData('expenses', 1, 100);
        rows = data.rows;
        columns = data.columns.map((c) => c.name);
      } else if (upper.includes('FROM CATEGORIES')) {
        const data = this.getTableData('categories', 1, 100);
        rows = data.rows;
        columns = data.columns.map((c) => c.name);
      } else {
        rows = this.getTablesMeta().map((t) => ({ table_name: t.name, row_count: t.rowCount }));
        columns = ['table_name', 'row_count'];
      }
    }

    return {
      statementType,
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: Math.max(1, Date.now() - startTime),
      message: 'Query executed successfully',
    };
  }
}

export const db = new RelationalDatabaseStore();
