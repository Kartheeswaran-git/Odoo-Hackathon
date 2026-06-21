import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const products = [
    { name: 'wood', cost_price: 1500, sales_price: 2000, qty_on_hand: 50 },
    { name: 'screws', cost_price: 5, sales_price: 10, qty_on_hand: 1000 },
    { name: 'legs', cost_price: 200, sales_price: 400, qty_on_hand: 100 },
    { name: 'top', cost_price: 800, sales_price: 1500, qty_on_hand: 50 },
  ];

  for (const p of products) {
    const { data: prod, error: err1 } = await supabase.from('products').insert({
      name: p.name,
      sku: 'SKU-' + Date.now() + Math.floor(Math.random()*100),
      cost_price: p.cost_price,
      sales_price: p.sales_price,
      qty_on_hand: p.qty_on_hand,
      qty_reserved: 0
    }).select('id').single();

    if (err1) {
      console.log('Error creating product:', p.name, err1.message);
      continue;
    }

    // Insert stock ledger to trigger qty_free_to_use calculation
    const { error: err2 } = await supabase.from('stock_ledger').insert({
      product_id: prod.id,
      quantity_change: p.qty_on_hand,
      movement_kind: 'Adjustment',
      reference_source: 'Adjustment',
      reference_id: prod.id,
      // created_by is nullable or we can leave it
    });
    
    if (err2) {
      console.log('Error creating ledger for:', p.name, err2.message);
    } else {
      console.log('Created product:', p.name);
    }
  }
}
run();
