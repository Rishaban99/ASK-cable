import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { prisma } from './server/db.js';
import { router as apiRouter } from './server/routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Connect & Verify Prisma Database Connection
async function connectDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('⚠️ DATABASE_URL is not defined in .env file.');
    return;
  }
  try {
    await prisma.$connect();
    console.log('✅ Connected successfully to MongoDB database via Prisma ORM');
  } catch (err: any) {
    console.error('❌ Failed to connect to MongoDB database via Prisma:', err.message);
  }
}

// Mount RESTful API endpoints under /api
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.category.findFirst();
    res.json({
      status: 'healthy',
      dbState: 'connected',
      orm: 'prisma',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.json({
      status: 'degraded',
      dbState: 'disconnected',
      orm: 'prisma',
      timestamp: new Date().toISOString()
    });
  }
});

async function startServer() {
  await connectDatabase();

  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static assets
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`ASK Cable Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
