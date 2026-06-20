import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM purchase_orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { vendor_name, items } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const orderRes = await client.query(
      'INSERT INTO purchase_orders (vendor_name) VALUES ($1) RETURNING *',
      [vendor_name]
    );
    const orderId = orderRes.rows[0].id;
    
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost) VALUES ($1, $2, $3, $4)',
          [orderId, item.product_id, item.quantity, item.unit_cost]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json(orderRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Transaction error' });
  } finally {
    client.release();
  }
});

export default router;
