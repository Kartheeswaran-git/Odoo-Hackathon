import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM manufacturing_orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { product_id, quantity } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO manufacturing_orders (product_id, quantity) VALUES ($1, $2) RETURNING *',
      [product_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
