import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';

export const router = Router();

// ==========================================
// 1. AI SPELL CHECK & AUTO-CORRECT ROUTE
// ==========================================

const commonCorrections: Record<string, string> = {
  frist: 'First',
  inverstment: 'Investment',
  inverstments: 'Investments',
  payut: 'Payout',
  salry: 'Salary',
  expence: 'Expense',
  expences: 'Expenses',
  incme: 'Income',
  thinks: 'Things',
  cabel: 'Cable',
  houseing: 'Housing',
  grocerie: 'Groceries',
  groceries: 'Groceries',
  dyning: 'Dining',
  utilitis: 'Utilities',
};

router.post('/ai/autocorrect', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required' });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return res.json({ correctedText: '' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an AI English spell checker and grammar polisher for financial ledger entries.
Correct all spelling mistakes, typos, and formatting errors in the following text: "${trimmed}".
Return ONLY the corrected, clean English title-cased phrase without quotes, explanations, or punctuation at the end.`,
        });

        const corrected = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : '';
        if (corrected) {
          return res.json({ correctedText: corrected });
        }
      } catch (geminiError: any) {
        console.warn('Gemini AI error, using rule-based autocorrect fallback:', geminiError.message);
      }
    }

    // Rule-based smart fallback
    const words = trimmed.split(/\s+/);
    const correctedWords = words.map((w) => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (commonCorrections[clean]) {
        return commonCorrections[clean];
      }
      if (w.length > 0) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    });

    const correctedText = correctedWords.join(' ');
    res.json({ correctedText });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Auto-correct failed' });
  }
});

// ==========================================
// 2. CATEGORIES ROUTES
// ==========================================

router.get('/categories', async (_req, res) => {
  try {
    const categories = await db.getCategories();
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Category name and type (INCOME or EXPENSE) are required' });
    }
    const cat = await db.createCategory({ name, type, icon, color });
    res.status(201).json({ category: cat });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const cat = await db.updateCategory(req.params.id, req.body);
    res.json({ category: cat });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const success = await db.deleteCategory(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 3. INCOMES ROUTES
// ==========================================

router.get('/incomes', async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const incomes = await db.getIncomes({
      categoryId: categoryId as string,
      search: search as string,
    });
    res.json({ incomes });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch incomes' });
  }
});

router.post('/incomes', async (req, res) => {
  try {
    const { categoryId, amount, date, description, paymentMethod, tags } = req.body;
    if (!categoryId || amount === undefined || !date || !description) {
      return res.status(400).json({ error: 'Missing required income fields' });
    }

    const income = await db.createIncome({
      categoryId,
      amount: Number(amount),
      date,
      description,
      paymentMethod,
      tags,
    });
    res.status(201).json({ income });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create income record' });
  }
});

router.put('/incomes/:id', async (req, res) => {
  try {
    const income = await db.updateIncome(req.params.id, req.body);
    res.json({ income });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update income record' });
  }
});

router.delete('/incomes/:id', async (req, res) => {
  try {
    const success = await db.deleteIncome(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Income record not found' });
    }
    res.json({ message: 'Income record deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4. EXPENSES ROUTES
// ==========================================

router.get('/expenses', async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const expenses = await db.getExpenses({
      categoryId: categoryId as string,
      search: search as string,
    });
    res.json({ expenses });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch expenses' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { categoryId, amount, date, description, paymentMethod, tags } = req.body;
    if (!categoryId || amount === undefined || !date || !description) {
      return res.status(400).json({ error: 'Missing required expense fields' });
    }

    const expense = await db.createExpense({
      categoryId,
      amount: Number(amount),
      date,
      description,
      paymentMethod,
      tags,
    });
    res.status(201).json({ expense });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create expense record' });
  }
});

router.put('/expenses/:id', async (req, res) => {
  try {
    const expense = await db.updateExpense(req.params.id, req.body);
    res.json({ expense });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update expense record' });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    const success = await db.deleteExpense(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json({ message: 'Expense record deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4.5. CUSTOMERS ROUTES
// ==========================================

router.get('/customers', async (req, res) => {
  try {
    const { search } = req.query;
    const customers = await db.getCustomers(search as string);
    res.json({ customers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customers' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const { name, nicNo, phoneNo, address, boxNo, totalAmount, paidAmount } = req.body;
    if (!name || !nicNo || !phoneNo || !boxNo) {
      return res.status(400).json({ error: 'Customer Name, NIC No, Phone No, and Box No are required' });
    }
    const customer = await db.createCustomer({
      name,
      nicNo,
      phoneNo,
      address: address || '',
      boxNo,
      totalAmount: Number(totalAmount || 0),
      paidAmount: Number(paidAmount || 0),
    });
    res.status(201).json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create customer' });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const customer = await db.updateCustomer(req.params.id, req.body);
    res.json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    const success = await db.deleteCustomer(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4.6. MONTHLY PAYMENTS ROUTES
// ==========================================

router.get('/monthly-payments', async (req, res) => {
  try {
    const { month, customerId, search, status } = req.query;
    const payments = await db.getMonthlyPayments({
      month: month as string,
      customerId: customerId as string,
      search: search as string,
      status: status as string,
    });
    res.json({ payments });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch monthly payments' });
  }
});

router.post('/monthly-payments', async (req, res) => {
  try {
    const { customerId, month, monthlyFee, paidAmount, paymentDate } = req.body;
    if (!customerId || !month || monthlyFee === undefined) {
      return res.status(400).json({ error: 'Customer, Month, and Monthly Fee are required' });
    }
    const payment = await db.createMonthlyPayment({
      customerId,
      month,
      monthlyFee: Number(monthlyFee),
      paidAmount: Number(paidAmount || 0),
      paymentDate,
    });
    res.status(201).json({ payment });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record monthly payment' });
  }
});

router.put('/monthly-payments/:id', async (req, res) => {
  try {
    const payment = await db.updateMonthlyPayment(req.params.id, req.body);
    res.json({ payment });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update monthly payment' });
  }
});

router.delete('/monthly-payments/:id', async (req, res) => {
  try {
    const success = await db.deleteMonthlyPayment(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Monthly payment record not found' });
    }
    res.json({ message: 'Monthly payment record deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 5. ANALYTICS ROUTES
// ==========================================

router.get('/analytics/overview', async (_req, res) => {
  try {
    const analytics = await db.getAnalyticsOverview();
    res.json({ analytics });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to calculate analytics overview' });
  }
});

// CSV Exports
router.get('/export/incomes-csv', async (_req, res) => {
  try {
    const recs = await db.getIncomes();
    let csv = 'ID,Date,Category,Amount,Description,Payment Method\n';
    for (const r of recs) {
      csv += `"${r.id}","${r.date}","${r.categoryName || ''}",${r.amount},"${r.description.replace(/"/g, '""')}","${r.paymentMethod}"\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=incomes_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).send('CSV export failed');
  }
});

router.get('/export/expenses-csv', async (_req, res) => {
  try {
    const recs = await db.getExpenses();
    let csv = 'ID,Date,Category,Amount,Description,Payment Method\n';
    for (const r of recs) {
      csv += `"${r.id}","${r.date}","${r.categoryName || ''}",${r.amount},"${r.description.replace(/"/g, '""')}","${r.paymentMethod}"\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).send('CSV export failed');
  }
});

// ==========================================
// 6. SCHEMA & DATABASE INSPECTOR ROUTES
// ==========================================

router.get('/schema/sql', (_req, res) => {
  const sql = `-- =========================================================================
-- ASK CABLE — INCOMES, EXPENSES & CATEGORIES SCHEMA
-- =========================================================================

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon VARCHAR(50) NOT NULL DEFAULT 'Tag',
    color VARCHAR(20) NOT NULL DEFAULT '#10B981',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incomes (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    income_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incomes_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    expense_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);`;
  res.json({ sql });
});

router.get('/database/tables', async (_req, res) => {
  try {
    const tables = await db.getTablesMeta();
    res.json({ tables });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/database/tables/:tableName', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await db.getTableData(req.params.tableName, page, limit);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/database/tables/:tableName/rows', async (req, res) => {
  try {
    const row = await db.insertTableRow(req.params.tableName, req.body);
    res.status(201).json({ row, message: 'Row inserted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/database/tables/:tableName/rows/:rowId', async (req, res) => {
  try {
    const success = await db.deleteTableRow(req.params.tableName, req.params.rowId);
    res.json({ success });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/database/query', async (req, res) => {
  try {
    const { sql } = req.body;
    const result = await db.executeSql(sql || '');
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// AUTHENTICATION & USER MANAGEMENT API
// ==========================================
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ user, message: 'Login successful' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/auth/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }

    const user = await db.createUser({ username, password, name, role: role || 'STAFF' });
    res.status(201).json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/auth/users/:id', async (req, res) => {
  try {
    await db.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
