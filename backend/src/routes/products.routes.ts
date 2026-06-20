import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// Get all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create product
router.post('/', async (req: Request, res: Response) => {
  const { sku, name, cost_price, sales_price, procurement_type, procurement_source } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (sku, name, cost_price, sales_price, procurement_type, procurement_source) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [sku, name, cost_price || 0, sales_price || 0, procurement_type || 'MTS', procurement_source]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
