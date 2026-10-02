import express from 'express';
import dotenv from 'dotenv';
import { prisma } from '../server/db.js';
import { router as apiRouter } from '../server/routes.js';

dotenv.config();

const app = express();
app.use(express.json());

// Serverless Prisma DB connection verification
app.use(async (_req, _res, next) => {
  try {
    await prisma.$connect();
  } catch (err: any) {
    console.error('❌ Vercel Prisma DB connection error:', err.message);
  }
  next();
});

// Mount /api routes
app.use('/api', apiRouter);

// Root fallback for /api
app.get('/api', (_req, res) => {
  res.json({ status: 'healthy', service: 'ASK Cable API', orm: 'prisma' });
});

export default app;
