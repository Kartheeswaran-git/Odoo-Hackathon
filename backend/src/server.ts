import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import pool from './db';

// Import Routes
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import bomRoutes from './routes/bom.routes';
import salesRoutes from './routes/sales.routes';
import purchaseRoutes from './routes/purchase.routes';
import manufacturingRoutes from './routes/manufacturing.routes';

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_request: Request, response: Response) => {
  try {
    await pool.query('SELECT 1');
    response.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error: unknown) {
    console.error('Health check failed:', error);
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/manufacturing', manufacturingRoutes);

const server = app.listen(port, () => {
  console.log(`Mini ERP API listening on port ${port}`);
});

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received; shutting down`);
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
