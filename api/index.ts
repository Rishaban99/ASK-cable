import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { router as apiRouter } from '../server/routes.js';

dotenv.config();

const app = express();
app.use(express.json());

// Serverless MongoDB connection cache
let isDbConnected = false;

async function ensureDbConnection() {
  if (isDbConnected && mongoose.connection.readyState === 1) {
    return;
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('⚠️ DATABASE_URL environment variable is missing on Vercel');
    return;
  }
  try {
    await mongoose.connect(dbUrl);
    isDbConnected = true;
  } catch (err: any) {
    console.error('❌ Vercel MongoDB connection error:', err.message);
  }
}

// Middleware to ensure DB connection before handling API request
app.use(async (_req, _res, next) => {
  await ensureDbConnection();
  next();
});

// Mount /api routes
app.use('/api', apiRouter);

// Root fallback for /api
app.get('/api', (_req, res) => {
  res.json({ status: 'healthy', service: 'ASK Cable API on Vercel' });
});

export default app;
