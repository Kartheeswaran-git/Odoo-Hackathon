import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.product_id, p.name as product_name
      FROM bills_of_materials b
      JOIN products p ON b.product_id = p.id
      ORDER BY b.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { product_id, components } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const bomRes = await client.query(
      'INSERT INTO bills_of_materials (product_id) VALUES ($1) RETURNING *',
      [product_id]
    );
    const bomId = bomRes.rows[0].id;
    
    if (components && components.length > 0) {
      for (const comp of components) {
        await client.query(
          'INSERT INTO bom_components (bom_id, component_product_id, quantity) VALUES ($1, $2, $3)',
          [bomId, comp.component_product_id, comp.quantity]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json(bomRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Transaction error' });
  } finally {
    client.release();
  }
});

export default router;
