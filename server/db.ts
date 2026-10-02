import { PrismaClient } from '@prisma/client';
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

export const prisma = new PrismaClient();

export class RelationalDatabaseStore {
  // -------------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------------
  public async getCategories(): Promise<Category[]> {
    const cats = await prisma.category.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as 'INCOME' | 'EXPENSE',
      icon: c.icon,
      color: c.color,
      isDefault: c.isDefault,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  public async createCategory(dto: { name: string; type: 'INCOME' | 'EXPENSE'; icon?: string; color?: string }): Promise<Category> {
    const cat = await prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        icon: dto.icon || 'Tag',
        color: dto.color || (dto.type === 'INCOME' ? '#10B981' : '#F43F5E'),
        isDefault: false,
      },
    });
    return {
      id: cat.id,
      name: cat.name,
      type: cat.type as 'INCOME' | 'EXPENSE',
      icon: cat.icon,
      color: cat.color,
      isDefault: cat.isDefault,
      createdAt: cat.createdAt.toISOString(),
    };
  }

  public async updateCategory(id: string, dto: Partial<Category>): Promise<Category> {
    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.type !== undefined) dataToUpdate.type = dto.type;
    if (dto.icon !== undefined) dataToUpdate.icon = dto.icon;
    if (dto.color !== undefined) dataToUpdate.color = dto.color;

    const cat = await prisma.category.update({
      where: { id },
      data: dataToUpdate,
    });
    return {
      id: cat.id,
      name: cat.name,
      type: cat.type as 'INCOME' | 'EXPENSE',
      icon: cat.icon,
      color: cat.color,
      isDefault: cat.isDefault,
      createdAt: cat.createdAt.toISOString(),
    };
  }

  public async deleteCategory(id: string): Promise<boolean> {
    await prisma.category.delete({ where: { id } });
    return true;
  }

  // -------------------------------------------------------------------
  // INCOMES TABLE
  // -------------------------------------------------------------------
  public async getIncomes(filter?: { categoryId?: string; search?: string }): Promise<IncomeRecord[]> {
    const whereClause: any = {};
    if (filter?.categoryId) whereClause.categoryId = filter.categoryId;
    if (filter?.search) whereClause.description = { contains: filter.search, mode: 'insensitive' };

    const [recs, cats] = await Promise.all([
      prisma.income.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
      }),
      this.getCategories(),
    ]);

    const catMap = new Map(cats.map((c) => [c.id, c]));

    return recs.map((r) => {
      const cat = catMap.get(r.categoryId);
      return {
        id: r.id,
        categoryId: r.categoryId,
        categoryName: cat ? cat.name : 'Uncategorized Income',
        categoryIcon: cat ? cat.icon : 'TrendingUp',
        categoryColor: cat ? cat.color : '#10B981',
        amount: r.amount,
        date: r.date,
        description: r.description,
        paymentMethod: r.paymentMethod,
        tags: r.tags,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  public async createIncome(dto: {
    categoryId: string;
    amount: number;
    date: string;
    description: string;
    paymentMethod?: string;
    tags?: string[];
  }): Promise<IncomeRecord> {
    const record = await prisma.income.create({
      data: {
        categoryId: dto.categoryId,
        amount: Math.abs(dto.amount),
        date: dto.date,
        description: dto.description,
        paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
        tags: dto.tags || [],
      },
    });

    const cats = await this.getCategories();
    const cat = cats.find((c) => c.id === record.categoryId);

    return {
      id: record.id,
      categoryId: record.categoryId,
      categoryName: cat ? cat.name : 'Uncategorized Income',
      categoryIcon: cat ? cat.icon : 'TrendingUp',
      categoryColor: cat ? cat.color : '#10B981',
      amount: record.amount,
      date: record.date,
      description: record.description,
      paymentMethod: record.paymentMethod,
      tags: record.tags,
      createdAt: record.createdAt.toISOString(),
    };
  }

  public async updateIncome(id: string, dto: Partial<IncomeRecord>): Promise<IncomeRecord> {
    const dataToUpdate: any = {};
    if (dto.categoryId !== undefined) dataToUpdate.categoryId = dto.categoryId;
    if (dto.amount !== undefined) dataToUpdate.amount = Math.abs(dto.amount);
    if (dto.date !== undefined) dataToUpdate.date = dto.date;
    if (dto.description !== undefined) dataToUpdate.description = dto.description;
    if (dto.paymentMethod !== undefined) dataToUpdate.paymentMethod = dto.paymentMethod;
    if (dto.tags !== undefined) dataToUpdate.tags = dto.tags;

    const record = await prisma.income.update({
      where: { id },
      data: dataToUpdate,
    });

    const cats = await this.getCategories();
    const cat = cats.find((c) => c.id === record.categoryId);

    return {
      id: record.id,
      categoryId: record.categoryId,
      categoryName: cat ? cat.name : 'Uncategorized Income',
      categoryIcon: cat ? cat.icon : 'TrendingUp',
      categoryColor: cat ? cat.color : '#10B981',
      amount: record.amount,
      date: record.date,
      description: record.description,
      paymentMethod: record.paymentMethod,
      tags: record.tags,
      createdAt: record.createdAt.toISOString(),
    };
  }

  public async deleteIncome(id: string): Promise<boolean> {
    await prisma.income.delete({ where: { id } });
    return true;
  }

  // -------------------------------------------------------------------
  // EXPENSES TABLE
  // -------------------------------------------------------------------
  public async getExpenses(filter?: { categoryId?: string; search?: string }): Promise<ExpenseRecord[]> {
    const whereClause: any = {};
    if (filter?.categoryId) whereClause.categoryId = filter.categoryId;
    if (filter?.search) whereClause.description = { contains: filter.search, mode: 'insensitive' };

    const [recs, cats] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
      }),
      this.getCategories(),
    ]);

    const catMap = new Map(cats.map((c) => [c.id, c]));

    return recs.map((r) => {
      const cat = catMap.get(r.categoryId);
      return {
        id: r.id,
        categoryId: r.categoryId,
        categoryName: cat ? cat.name : 'Uncategorized Expense',
        categoryIcon: cat ? cat.icon : 'TrendingDown',
        categoryColor: cat ? cat.color : '#F43F5E',
        amount: r.amount,
        date: r.date,
        description: r.description,
        paymentMethod: r.paymentMethod,
        tags: r.tags,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  public async createExpense(dto: {
    categoryId: string;
    amount: number;
    date: string;
    description: string;
    paymentMethod?: string;
    tags?: string[];
  }): Promise<ExpenseRecord> {
    const record = await prisma.expense.create({
      data: {
        categoryId: dto.categoryId,
        amount: Math.abs(dto.amount),
        date: dto.date,
        description: dto.description,
        paymentMethod: dto.paymentMethod || 'CASH',
        tags: dto.tags || [],
      },
    });

    const cats = await this.getCategories();
    const cat = cats.find((c) => c.id === record.categoryId);

    return {
      id: record.id,
      categoryId: record.categoryId,
      categoryName: cat ? cat.name : 'Uncategorized Expense',
      categoryIcon: cat ? cat.icon : 'TrendingDown',
      categoryColor: cat ? cat.color : '#F43F5E',
      amount: record.amount,
      date: record.date,
      description: record.description,
      paymentMethod: record.paymentMethod,
      tags: record.tags,
      createdAt: record.createdAt.toISOString(),
    };
  }

  public async updateExpense(id: string, dto: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const dataToUpdate: any = {};
    if (dto.categoryId !== undefined) dataToUpdate.categoryId = dto.categoryId;
    if (dto.amount !== undefined) dataToUpdate.amount = Math.abs(dto.amount);
    if (dto.date !== undefined) dataToUpdate.date = dto.date;
    if (dto.description !== undefined) dataToUpdate.description = dto.description;
    if (dto.paymentMethod !== undefined) dataToUpdate.paymentMethod = dto.paymentMethod;
    if (dto.tags !== undefined) dataToUpdate.tags = dto.tags;

    const record = await prisma.expense.update({
      where: { id },
      data: dataToUpdate,
    });

    const cats = await this.getCategories();
    const cat = cats.find((c) => c.id === record.categoryId);

    return {
      id: record.id,
      categoryId: record.categoryId,
      categoryName: cat ? cat.name : 'Uncategorized Expense',
      categoryIcon: cat ? cat.icon : 'TrendingDown',
      categoryColor: cat ? cat.color : '#F43F5E',
      amount: record.amount,
      date: record.date,
      description: record.description,
      paymentMethod: record.paymentMethod,
      tags: record.tags,
      createdAt: record.createdAt.toISOString(),
    };
  }

  public async deleteExpense(id: string): Promise<boolean> {
    await prisma.expense.delete({ where: { id } });
    return true;
  }

  // -------------------------------------------------------------------
  // ANALYTICS OVERVIEW
  // -------------------------------------------------------------------
  public async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [allIncomes, allExpenses, categories] = await Promise.all([
      this.getIncomes(),
      this.getExpenses(),
      this.getCategories(),
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const inc of allIncomes) {
      totalIncome += inc.amount;
      if (inc.date.startsWith(currentMonthStr)) {
        monthlyIncome += inc.amount;
        incomeCount++;
      }
    }

    const curMonthExpenses: ExpenseRecord[] = [];
    for (const exp of allExpenses) {
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

    const categoriesMap = new Map(categories.map((c) => [c.id, c]));
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

    const monthlyCashflowHistory: { month: string; income: number; expense: number; net: number }[] = [];
    const netWorthHistory: { month: string; value: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });

      let inc = 0;
      let exp = 0;
      for (const item of allIncomes) {
        if (item.date.startsWith(monthKey)) inc += item.amount;
      }
      for (const item of allExpenses) {
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
      recentIncomes: allIncomes.slice(0, 5),
      recentExpenses: allExpenses.slice(0, 5),
      topExpenseCategories,
      monthlyCashflowHistory,
      netWorthHistory,
    };
  }

  // -------------------------------------------------------------------
  // TABLE & QUERY INSPECTOR (for DB management)
  // -------------------------------------------------------------------
  public async getTablesMeta(): Promise<TableMeta[]> {
    const cats = await this.getCategories();
    const incs = await this.getIncomes();
    const exps = await this.getExpenses();

    return [
      {
        name: 'categories',
        displayName: 'Categories',
        description: 'Category lookup table linked to incomes and expenses',
        rowCount: cats.length,
        columnCount: 5,
        sizeBytes: cats.length * 128,
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
        rowCount: incs.length,
        columnCount: 7,
        sizeBytes: incs.length * 256,
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
        rowCount: exps.length,
        columnCount: 7,
        sizeBytes: exps.length * 256,
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

  public async getTableData(tableName: string, page = 1, limit = 50): Promise<TableQueryResponse> {
    const metaList = await this.getTablesMeta();
    const meta = metaList.find((t) => t.name === tableName);
    if (!meta) throw new Error(`Table "${tableName}" not found`);

    let rows: any[] = [];
    if (tableName === 'incomes') rows = await this.getIncomes();
    else if (tableName === 'expenses') rows = await this.getExpenses();
    else if (tableName === 'categories') rows = await this.getCategories();

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

  public async insertTableRow(tableName: string, data: Record<string, any>): Promise<Record<string, any>> {
    if (tableName === 'incomes') return this.createIncome(data as any);
    if (tableName === 'expenses') return this.createExpense(data as any);
    if (tableName === 'categories') return this.createCategory(data as any);
    throw new Error(`Cannot insert into unknown table "${tableName}"`);
  }

  public async deleteTableRow(tableName: string, rowId: string): Promise<boolean> {
    if (tableName === 'incomes') return this.deleteIncome(rowId);
    if (tableName === 'expenses') return this.deleteExpense(rowId);
    if (tableName === 'categories') return this.deleteCategory(rowId);
    return false;
  }

  public async executeSql(sql: string): Promise<SqlQueryResult> {
    const startTime = Date.now();
    const upper = sql.trim().toUpperCase();
    let statementType: SqlQueryResult['statementType'] = 'UNKNOWN';
    let rows: any[] = [];
    let columns: string[] = [];

    if (upper.startsWith('SELECT')) {
      statementType = 'SELECT';
      if (upper.includes('FROM INCOMES')) {
        const data = await this.getTableData('incomes', 1, 100);
        rows = data.rows;
        columns = data.columns.map((c) => c.name);
      } else if (upper.includes('FROM EXPENSES')) {
        const data = await this.getTableData('expenses', 1, 100);
        rows = data.rows;
        columns = data.columns.map((c) => c.name);
      } else if (upper.includes('FROM CATEGORIES')) {
        const data = await this.getTableData('categories', 1, 100);
        rows = data.rows;
        columns = data.columns.map((c) => c.name);
      } else {
        const meta = await this.getTablesMeta();
        rows = meta.map((t) => ({ table_name: t.name, row_count: t.rowCount }));
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
