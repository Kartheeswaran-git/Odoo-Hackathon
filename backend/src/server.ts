import 'dotenv/config';

import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { Pool } from 'pg';

const app = express();
const port = Number(process.env.PORT ?? 3000);

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'minierp',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

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
