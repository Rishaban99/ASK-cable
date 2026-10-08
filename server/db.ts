import { PrismaClient } from '@prisma/client';
import {
  User,
  Category,
  Customer,
  MonthlyPayment,
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
  // CUSTOMERS TABLE
  // -------------------------------------------------------------------
  public async getCustomers(search?: string): Promise<Customer[]> {
    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nicNo: { contains: search, mode: 'insensitive' } },
        { phoneNo: { contains: search, mode: 'insensitive' } },
        { boxNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const custs = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
    return custs.map((c) => ({
      id: c.id,
      name: c.name,
      nicNo: c.nicNo,
      phoneNo: c.phoneNo,
      address: c.address,
      boxNo: c.boxNo,
      totalAmount: c.totalAmount,
      paidAmount: c.paidAmount,
      balanceAmount: c.totalAmount - c.paidAmount,
      status: (c.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED',
      createdAt: c.createdAt.toISOString(),
    }));
  }

  private async getOrCreateCustomerIncomeCategory(): Promise<string> {
    let cat = await prisma.category.findFirst({
      where: {
        type: 'INCOME',
        name: { contains: 'Customer', mode: 'insensitive' }
      }
    });
    if (!cat) {
      cat = await prisma.category.findFirst({
        where: { type: 'INCOME' }
      });
    }
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: 'Customer Cable Payments',
          type: 'INCOME',
          icon: 'Tv',
          color: '#10B981',
          isDefault: true,
        }
      });
    }
    return cat.id;
  }

  public async createCustomer(dto: {
    name: string;
    nicNo: string;
    phoneNo: string;
    address: string;
    boxNo: string;
    totalAmount: number;
    paidAmount: number;
    status?: string;
  }): Promise<Customer> {
    const initialPaid = Math.abs(dto.paidAmount || 0);
    const cust = await prisma.customer.create({
      data: {
        name: dto.name,
        nicNo: dto.nicNo,
        phoneNo: dto.phoneNo,
        address: dto.address,
        boxNo: dto.boxNo,
        totalAmount: Math.abs(dto.totalAmount || 0),
        paidAmount: initialPaid,
        status: dto.status || 'ACTIVE',
      },
    });

    // Automatically record paid amount as an Income entry in DB
    if (initialPaid > 0) {
      try {
        const categoryId = await this.getOrCreateCustomerIncomeCategory();
        const todayStr = new Date().toISOString().split('T')[0];
        await prisma.income.create({
          data: {
            categoryId,
            amount: initialPaid,
            date: todayStr,
            description: `Customer Payment - ${cust.name} (Box: ${cust.boxNo})`,
            paymentMethod: 'CASH',
            tags: ['customer', cust.boxNo],
          }
        });
      } catch (e) {
        console.error('Failed to log customer payment to income ledger:', e);
      }
    }

    return {
      id: cust.id,
      name: cust.name,
      nicNo: cust.nicNo,
      phoneNo: cust.phoneNo,
      address: cust.address,
      boxNo: cust.boxNo,
      totalAmount: cust.totalAmount,
      paidAmount: cust.paidAmount,
      balanceAmount: cust.totalAmount - cust.paidAmount,
      status: (cust.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED',
      createdAt: cust.createdAt.toISOString(),
    };
  }

  public async updateCustomer(id: string, dto: Partial<{
    name: string;
    nicNo: string;
    phoneNo: string;
    address: string;
    boxNo: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  }>): Promise<Customer> {
    const oldCust = await prisma.customer.findUnique({ where: { id } });

    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.nicNo !== undefined) dataToUpdate.nicNo = dto.nicNo;
    if (dto.phoneNo !== undefined) dataToUpdate.phoneNo = dto.phoneNo;
    if (dto.address !== undefined) dataToUpdate.address = dto.address;
    if (dto.boxNo !== undefined) dataToUpdate.boxNo = dto.boxNo;
    if (dto.totalAmount !== undefined) dataToUpdate.totalAmount = Math.abs(dto.totalAmount);
    if (dto.paidAmount !== undefined) dataToUpdate.paidAmount = Math.abs(dto.paidAmount);
    if (dto.status !== undefined) dataToUpdate.status = dto.status;

    const cust = await prisma.customer.update({
      where: { id },
      data: dataToUpdate,
    });

    // Automatically record payment difference as an Income entry if paidAmount increased
    if (oldCust && dto.paidAmount !== undefined) {
      const paymentDiff = cust.paidAmount - oldCust.paidAmount;
      if (paymentDiff > 0) {
        try {
          const categoryId = await this.getOrCreateCustomerIncomeCategory();
          const todayStr = new Date().toISOString().split('T')[0];
          await prisma.income.create({
            data: {
              categoryId,
              amount: paymentDiff,
              date: todayStr,
              description: `Customer Balance Payment - ${cust.name} (Box: ${cust.boxNo})`,
              paymentMethod: 'CASH',
              tags: ['customer', 'balance-payment', cust.boxNo],
            }
          });
        } catch (e) {
          console.error('Failed to log customer balance payment to income ledger:', e);
        }
      }
    }

    return {
      id: cust.id,
      name: cust.name,
      nicNo: cust.nicNo,
      phoneNo: cust.phoneNo,
      address: cust.address,
      boxNo: cust.boxNo,
      totalAmount: cust.totalAmount,
      paidAmount: cust.paidAmount,
      balanceAmount: cust.totalAmount - cust.paidAmount,
      status: (cust.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED',
      createdAt: cust.createdAt.toISOString(),
    };
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    await prisma.customer.delete({ where: { id } });
    return true;
  }

  // -------------------------------------------------------------------
  // MONTHLY PAYMENTS TABLE
  // -------------------------------------------------------------------
  public async getMonthlyPayments(filter?: {
    month?: string;
    customerId?: string;
    search?: string;
    status?: string;
  }): Promise<MonthlyPayment[]> {
    const whereClause: any = {};
    if (filter?.month) whereClause.month = filter.month;
    if (filter?.customerId) whereClause.customerId = filter.customerId;
    if (filter?.search) {
      whereClause.OR = [
        { customerName: { contains: filter.search, mode: 'insensitive' } },
        { boxNo: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const recs = await prisma.monthlyPayment.findMany({
      where: whereClause,
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    });

    return recs.map((r) => {
      const balance = Math.max(0, r.monthlyFee - r.paidAmount);
      let status: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
      if (balance === 0 && r.paidAmount > 0) status = 'PAID';
      else if (r.paidAmount > 0 && balance > 0) status = 'PARTIAL';

      if (filter?.status && filter.status !== 'ALL' && status !== filter.status) {
        return null;
      }

      return {
        id: r.id,
        customerId: r.customerId,
        customerName: r.customerName,
        boxNo: r.boxNo,
        month: r.month,
        monthlyFee: r.monthlyFee,
        paidAmount: r.paidAmount,
        balanceAmount: balance,
        status,
        paymentDate: r.paymentDate,
        createdAt: r.createdAt.toISOString(),
      };
    }).filter(Boolean) as MonthlyPayment[];
  }

  public async createMonthlyPayment(dto: {
    customerId: string;
    month: string;
    monthlyFee: number;
    paidAmount: number;
    paymentDate?: string;
  }): Promise<MonthlyPayment> {
    const cust = await prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!cust) throw new Error(`Customer not found for ID "${dto.customerId}"`);

    const fee = Math.abs(dto.monthlyFee || 0);
    const paid = Math.abs(dto.paidAmount || 0);
    const todayStr = dto.paymentDate || new Date().toISOString().split('T')[0];

    const rec = await prisma.monthlyPayment.create({
      data: {
        customerId: cust.id,
        customerName: cust.name,
        boxNo: cust.boxNo,
        month: dto.month,
        monthlyFee: fee,
        paidAmount: paid,
        paymentDate: todayStr,
      },
    });

    // Automatically record payment as an Income entry in DB if paidAmount > 0
    if (paid > 0) {
      try {
        const categoryId = await this.getOrCreateCustomerIncomeCategory();
        await prisma.income.create({
          data: {
            categoryId,
            amount: paid,
            date: todayStr,
            description: `Monthly Cable Fee (${dto.month}) - ${cust.name} (Box: ${cust.boxNo})`,
            paymentMethod: 'CASH',
            tags: ['monthly-fee', dto.month, cust.boxNo],
          },
        });
      } catch (e) {
        console.error('Failed to log monthly payment to income ledger:', e);
      }
    }

    const balance = Math.max(0, fee - paid);
    let status: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (balance === 0 && paid > 0) status = 'PAID';
    else if (paid > 0 && balance > 0) status = 'PARTIAL';

    return {
      id: rec.id,
      customerId: rec.customerId,
      customerName: rec.customerName,
      boxNo: rec.boxNo,
      month: rec.month,
      monthlyFee: rec.monthlyFee,
      paidAmount: rec.paidAmount,
      balanceAmount: balance,
      status,
      paymentDate: rec.paymentDate,
      createdAt: rec.createdAt.toISOString(),
    };
  }

  public async updateMonthlyPayment(
    id: string,
    dto: Partial<{
      monthlyFee: number;
      paidAmount: number;
      paymentDate: string;
    }>
  ): Promise<MonthlyPayment> {
    const oldRec = await prisma.monthlyPayment.findUnique({ where: { id } });
    if (!oldRec) throw new Error(`Monthly payment record "${id}" not found`);

    const dataToUpdate: any = {};
    if (dto.monthlyFee !== undefined) dataToUpdate.monthlyFee = Math.abs(dto.monthlyFee);
    if (dto.paidAmount !== undefined) {
      dataToUpdate.paidAmount = Math.abs(dto.paidAmount);
      // Automatically pick current date for payment updates if not explicitly specified
      dataToUpdate.paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];
    } else if (dto.paymentDate !== undefined) {
      dataToUpdate.paymentDate = dto.paymentDate;
    }

    const rec = await prisma.monthlyPayment.update({
      where: { id },
      data: dataToUpdate,
    });

    // Log payment difference to income ledger if paidAmount increased
    if (dto.paidAmount !== undefined) {
      const diff = rec.paidAmount - oldRec.paidAmount;
      if (diff > 0) {
        try {
          const categoryId = await this.getOrCreateCustomerIncomeCategory();
          const todayStr = dto.paymentDate || new Date().toISOString().split('T')[0];
          await prisma.income.create({
            data: {
              categoryId,
              amount: diff,
              date: todayStr,
              description: `Monthly Cable Fee Payment (${rec.month}) - ${rec.customerName} (Box: ${rec.boxNo})`,
              paymentMethod: 'CASH',
              tags: ['monthly-fee', rec.month, rec.boxNo],
            },
          });
        } catch (e) {
          console.error('Failed to log monthly fee update to income ledger:', e);
        }
      }
    }

    const balance = Math.max(0, rec.monthlyFee - rec.paidAmount);
    let status: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (balance === 0 && rec.paidAmount > 0) status = 'PAID';
    else if (rec.paidAmount > 0 && balance > 0) status = 'PARTIAL';

    return {
      id: rec.id,
      customerId: rec.customerId,
      customerName: rec.customerName,
      boxNo: rec.boxNo,
      month: rec.month,
      monthlyFee: rec.monthlyFee,
      paidAmount: rec.paidAmount,
      balanceAmount: balance,
      status,
      paymentDate: rec.paymentDate,
      createdAt: rec.createdAt.toISOString(),
    };
  }

  public async deleteMonthlyPayment(id: string): Promise<boolean> {
    await prisma.monthlyPayment.delete({ where: { id } });
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

    // Calculate initial balance prior to the 6-month window
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const windowStartStr = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, '0')}-01`;
    let runningNet = 0;

    for (const item of allIncomes) {
      if (item.date < windowStartStr) runningNet += item.amount;
    }
    for (const item of allExpenses) {
      if (item.date < windowStartStr) runningNet -= item.amount;
    }

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

      runningNet += (inc - exp);

      monthlyCashflowHistory.push({
        month: monthLabel,
        income: inc,
        expense: exp,
        net: inc - exp,
      });

      netWorthHistory.push({
        month: monthLabel,
        value: runningNet,
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

  // -------------------------------------------------------------------
  // -------------------------------------------------------------------
  // USERS & AUTHENTICATION TABLE
  // -------------------------------------------------------------------
  private getUserClient(): any {
    const userModel = (prisma as any).user;
    if (userModel) return userModel;
    try {
      const freshClient = new PrismaClient();
      return (freshClient as any).user;
    } catch {
      return null;
    }
  }

  public async seedDefaultUsers(): Promise<void> {
    try {
      const userDb = this.getUserClient();
      if (!userDb) return;

      await userDb.upsert({
        where: { username: 'rishaban' },
        update: {},
        create: {
          username: 'rishaban',
          password: 'Rish6012$',
          name: 'Admin Manager',
          role: 'ADMIN',
        },
      });

      await userDb.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
          username: 'admin',
          password: 'admin123',
          name: 'System Admin',
          role: 'ADMIN',
        },
      });

      await userDb.upsert({
        where: { username: 'Dhinushan' },
        update: {},
        create: {
          username: 'Dhinushan',
          password: '121926',
          name: 'Staff Operator',
          role: 'STAFF',
        },
      });

      await userDb.upsert({
        where: { username: 'staff' },
        update: {},
        create: {
          username: 'staff',
          password: '121926',
          name: 'Staff Operator',
          role: 'STAFF',
        },
      });
    } catch (e: any) {
      if (e?.code !== 'P2002') {
        console.error('Failed to seed default users:', e);
      }
    }
  }

  public async authenticateUser(username: string, password: string): Promise<User | null> {
    await this.seedDefaultUsers();
    const userDb = this.getUserClient();
    if (!userDb) return null;

    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();

    const u = await userDb.findFirst({
      where: {
        username: { equals: cleanUsername, mode: 'insensitive' },
        password: cleanPassword,
      },
    });

    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      role: (u.role || 'STAFF') as 'ADMIN' | 'STAFF',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  public async getUsers(): Promise<User[]> {
    await this.seedDefaultUsers();
    const userDb = this.getUserClient();
    if (!userDb) return [];

    const users = await userDb.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u: any) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: (u.role || 'STAFF') as 'ADMIN' | 'STAFF',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  public async createUser(dto: { username: string; password: string; name: string; role: 'ADMIN' | 'STAFF' }): Promise<User> {
    const userDb = this.getUserClient();
    if (!userDb) throw new Error('User database service is unavailable');

    const existing = await userDb.findFirst({
      where: { username: { equals: dto.username, mode: 'insensitive' } },
    });
    if (existing) {
      throw new Error(`Username "${dto.username}" is already taken.`);
    }

    const u = await userDb.create({
      data: {
        username: dto.username.trim().toLowerCase(),
        password: dto.password,
        name: dto.name.trim(),
        role: dto.role || 'STAFF',
      },
    });

    return {
      id: u.id,
      username: u.username,
      name: u.name,
      role: (u.role || 'STAFF') as 'ADMIN' | 'STAFF',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  public async deleteUser(id: string): Promise<boolean> {
    const userDb = this.getUserClient();
    if (!userDb) return false;

    await userDb.delete({ where: { id } });
    return true;
  }
}

export const db = new RelationalDatabaseStore();
// Auto seed default users on server load
db.seedDefaultUsers();
