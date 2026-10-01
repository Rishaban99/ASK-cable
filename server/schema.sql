-- =========================================================================
-- ASK CABLE — NORMALIZED RELATIONAL DATABASE SCHEMA (MySQL / MariaDB / PostgreSQL)
-- Multi-Asset Expense, Income & Investment Portfolio Architecture
-- =========================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon VARCHAR(50) NOT NULL DEFAULT 'Tag',
    color VARCHAR(20) NOT NULL DEFAULT '#64748B',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_category UNIQUE (user_id, name, type)
);

-- 3. TRANSACTIONS TABLE (Income & Expense Ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    transaction_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CREDIT_CARD',
    tags JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- 4. INVESTMENT ASSETS TABLE
CREATE TABLE IF NOT EXISTS investments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    asset_name VARCHAR(150) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    asset_class VARCHAR(30) NOT NULL CHECK (asset_class IN ('STOCKS', 'MUTUAL_FUNDS', 'CRYPTO', 'FIXED_DEPOSITS', 'REAL_ESTATE', 'COMMODITIES')),
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_investments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_ticker UNIQUE (user_id, ticker)
);

-- 5. INVESTMENT TRANSACTIONS TABLE (Buy / Sell Tax Lots)
CREATE TABLE IF NOT EXISTS investment_transactions (
    id VARCHAR(36) PRIMARY KEY,
    investment_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
    quantity DECIMAL(18, 6) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 4) NOT NULL CHECK (unit_price >= 0),
    transaction_date DATE NOT NULL,
    fees DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_tx_investment FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. ASSET MARKET QUOTES (Live Valuation Feed)
CREATE TABLE IF NOT EXISTS asset_market_quotes (
    ticker VARCHAR(20) PRIMARY KEY,
    current_price DECIMAL(15, 4) NOT NULL,
    change_24h_pct DECIMAL(7, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. BUDGETS TABLE (Category monthly spending caps with threshold triggers)
CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    period_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    budget_limit DECIMAL(15, 2) NOT NULL CHECK (budget_limit > 0),
    alert_threshold_pct INT NOT NULL DEFAULT 85 CHECK (alert_threshold_pct BETWEEN 1 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_budgets_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_cat_month UNIQUE (user_id, category_id, period_month)
);

-- =========================================================================
-- OPTIMIZATION INDEXES
-- =========================================================================
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_investment_tx_asset ON investment_transactions(investment_id, transaction_date DESC);
CREATE INDEX idx_budgets_user_month ON budgets(user_id, period_month);

-- =========================================================================
-- SEED DATA TEMPLATE
-- =========================================================================
-- INSERT INTO users (id, email, password_hash, salt, full_name, base_currency)
-- VALUES ('usr_01', 'alex@apexledger.dev', 'hash_sample', 'salt_sample', 'Alex Morgan', 'USD');
