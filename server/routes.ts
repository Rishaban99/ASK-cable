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

router.get('/categories', (_req, res) => {
  const categories = db.getCategories();
  res.json({ categories });
});

router.post('/categories', (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Category name and type (INCOME or EXPENSE) are required' });
    }
    const cat = db.createCategory({ name, type, icon, color });
    res.status(201).json({ category: cat });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const cat = db.updateCategory(req.params.id, req.body);
    res.json({ category: cat });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update category' });
  }
});

router.delete('/categories/:id', (req, res) => {
  const success = db.deleteCategory(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json({ message: 'Category deleted successfully' });
});

// ==========================================
// 3. INCOMES ROUTES
// ==========================================

router.get('/incomes', (req, res) => {
  const { categoryId, search } = req.query;
  const incomes = db.getIncomes({
    categoryId: categoryId as string,
    search: search as string,
  });
  res.json({ incomes });
});

router.post('/incomes', (req, res) => {
  try {
    const { categoryId, amount, date, description, paymentMethod, tags } = req.body;
    if (!categoryId || amount === undefined || !date || !description) {
      return res.status(400).json({ error: 'Missing required income fields' });
    }

    const income = db.createIncome({
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

router.put('/incomes/:id', (req, res) => {
  try {
    const income = db.updateIncome(req.params.id, req.body);
    res.json({ income });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update income record' });
  }
});

router.delete('/incomes/:id', (req, res) => {
  const success = db.deleteIncome(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Income record not found' });
  }
  res.json({ message: 'Income record deleted successfully' });
});

// ==========================================
// 4. EXPENSES ROUTES
// ==========================================

router.get('/expenses', (req, res) => {
  const { categoryId, search } = req.query;
  const expenses = db.getExpenses({
    categoryId: categoryId as string,
    search: search as string,
  });
  res.json({ expenses });
});

router.post('/expenses', (req, res) => {
  try {
    const { categoryId, amount, date, description, paymentMethod, tags } = req.body;
    if (!categoryId || amount === undefined || !date || !description) {
      return res.status(400).json({ error: 'Missing required expense fields' });
    }

    const expense = db.createExpense({
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

router.put('/expenses/:id', (req, res) => {
  try {
    const expense = db.updateExpense(req.params.id, req.body);
    res.json({ expense });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update expense record' });
  }
});

router.delete('/expenses/:id', (req, res) => {
  const success = db.deleteExpense(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Expense record not found' });
  }
  res.json({ message: 'Expense record deleted successfully' });
});

// ==========================================
// 5. ANALYTICS ROUTES
// ==========================================

router.get('/analytics/overview', (_req, res) => {
  const analytics = db.getAnalyticsOverview();
  res.json({ analytics });
});

// CSV Exports
router.get('/export/incomes-csv', (_req, res) => {
  const recs = db.getIncomes();
  let csv = 'ID,Date,Category,Amount,Description,Payment Method\n';
  for (const r of recs) {
    csv += `"${r.id}","${r.date}","${r.categoryName || ''}",${r.amount},"${r.description.replace(/"/g, '""')}","${r.paymentMethod}"\n`;
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=incomes_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

router.get('/export/expenses-csv', (_req, res) => {
  const recs = db.getExpenses();
  let csv = 'ID,Date,Category,Amount,Description,Payment Method\n';
  for (const r of recs) {
    csv += `"${r.id}","${r.date}","${r.categoryName || ''}",${r.amount},"${r.description.replace(/"/g, '""')}","${r.paymentMethod}"\n`;
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=expenses_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
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

router.get('/database/tables', (_req, res) => {
  const tables = db.getTablesMeta();
  res.json({ tables });
});

router.get('/database/tables/:tableName', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const data = db.getTableData(req.params.tableName, page, limit);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/database/tables/:tableName/rows', (req, res) => {
  try {
    const row = db.insertTableRow(req.params.tableName, req.body);
    res.status(201).json({ row, message: 'Row inserted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/database/tables/:tableName/rows/:rowId', (req, res) => {
  const success = db.deleteTableRow(req.params.tableName, req.params.rowId);
  res.json({ success });
});

router.post('/database/query', (req, res) => {
  try {
    const { sql } = req.body;
    const result = db.executeSql(sql || '');
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
