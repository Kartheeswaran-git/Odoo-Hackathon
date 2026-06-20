import type { Request, Response } from 'express';
import type { Pool, PoolClient } from 'pg';

type ProductForConfirmation = {
  id: string;
  name: string;
  quantity: string;
  cost_price: string;
  qty_on_hand: string;
  qty_reserved: string;
  procure_on_demand: boolean;
  procurement_type: 'Purchase' | 'Manufacturing' | null;
  default_vendor_id: string | null;
  bom_id: string | null;
};

type CreatedProcurement = { type: 'Purchase' | 'Manufacturing'; id: string; productId: string; quantity: number };

const asNumber = (value: string): number => Number(value);

async function createProcurement(
  client: PoolClient,
  product: ProductForConfirmation,
  deficit: number,
  salesOrderId: string,
  actorId: string,
): Promise<CreatedProcurement> {
  if (product.procurement_type === 'Purchase') {
    if (!product.default_vendor_id) {
      throw new Error(`${product.name} has no default vendor for MTO purchasing.`);
    }
    const purchaseOrder = await client.query<{ id: string }>(
      `insert into public.purchase_orders (vendor_id, source_sales_order_id, created_by)
       values ($1, $2, $3) returning id`,
      [product.default_vendor_id, salesOrderId, actorId],
    );
    const id = purchaseOrder.rows[0]!.id;
    await client.query(
      `insert into public.purchase_order_lines (purchase_order_id, product_id, quantity, unit_cost)
       values ($1, $2, $3, $4)`,
      [id, product.id, deficit, product.cost_price],
    );
    return { type: 'Purchase', id, productId: product.id, quantity: deficit };
  }

  if (product.procurement_type === 'Manufacturing') {
    if (!product.bom_id) {
      throw new Error(`${product.name} has no Bill of Materials for MTO manufacturing.`);
    }
    const manufacturingOrder = await client.query<{ id: string }>(
      `insert into public.manufacturing_orders
        (product_id, bom_id, quantity, source_sales_order_id, created_by)
       values ($1, $2, $3, $4, $5) returning id`,
      [product.id, product.bom_id, deficit, salesOrderId, actorId],
    );
    const id = manufacturingOrder.rows[0]!.id;
    await client.query(
      `insert into public.manufacturing_order_component_lines
        (manufacturing_order_id, component_id, required_quantity)
       select $1, component_id, required_quantity * $2
       from public.bom_lines where bom_id = $3`,
      [id, deficit, product.bom_id],
    );
    return { type: 'Manufacturing', id, productId: product.id, quantity: deficit };
  }

  throw new Error(`${product.name} has an invalid MTO procurement configuration.`);
}

/**
 * Confirms a draft sales order in one transaction.  Available inventory is
 * reserved through stock_ledger; shortages create draft MTO procurements.
 */
export const createConfirmSalesOrderController = (pool: Pool) => async (
  request: Request<{ id: string }>,
  response: Response,
): Promise<void> => {
  const actorId = request.authUserId;
  if (!actorId) {
    response.status(401).json({ error: 'Authenticated actor is required.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const actor = await client.query<{ role: string }>('select role from public.users where id = $1', [actorId]);
    if (actor.rows[0]?.role !== 'Admin') {
      response.status(403).json({ error: 'Only an Admin can confirm a sales order.' });
      await client.query('rollback');
      return;
    }

    const salesOrder = await client.query<{ id: string; status: string }>(
      'select id, status from public.sales_orders where id = $1 for update', [request.params.id],
    );
    if (!salesOrder.rows[0]) throw new Error('Sales order not found.');
    if (salesOrder.rows[0].status !== 'Draft') throw new Error('Only Draft sales orders can be confirmed.');

    // Lock product rows as well as the order, preventing concurrent orders from
    // reserving the same free stock.
    const lines = await client.query<ProductForConfirmation>(
      `select p.id, p.name, sol.quantity, p.cost_price, p.qty_on_hand, p.qty_reserved,
              p.procure_on_demand, p.procurement_type, p.default_vendor_id, p.bom_id
       from public.sales_order_lines sol
       join public.products p on p.id = sol.product_id
       where sol.sales_order_id = $1
       order by p.id
       for update of p`,
      [request.params.id],
    );
    if (!lines.rowCount) throw new Error('A sales order needs at least one line before confirmation.');

    const procurements: CreatedProcurement[] = [];
    for (const product of lines.rows) {
      const requested = asNumber(product.quantity);
      const freeToUse = asNumber(product.qty_on_hand) - asNumber(product.qty_reserved);
      const quantityToReserve = Math.min(requested, Math.max(freeToUse, 0));
      const deficit = requested - quantityToReserve;

      if (deficit > 0 && !product.procure_on_demand) {
        throw new Error(`Insufficient free stock for ${product.name}; it is not configured for MTO.`);
      }
      if (quantityToReserve > 0) {
        await client.query(
          `insert into public.stock_ledger
            (product_id, reservation_change, movement_kind, reference_source, reference_id, created_by)
           values ($1, $2, 'Reservation', 'Sales', $3, $4)`,
          [product.id, quantityToReserve, request.params.id, actorId],
        );
      }
      if (deficit > 0) procurements.push(await createProcurement(client, product, deficit, request.params.id, actorId));
    }

    await client.query(
      `update public.sales_orders set status = 'Confirmed', confirmed_at = now() where id = $1`,
      [request.params.id],
    );
    await client.query('commit');
    response.status(200).json({ salesOrderId: request.params.id, status: 'Confirmed', procurements });
  } catch (error: unknown) {
    await client.query('rollback');
    const message = error instanceof Error ? error.message : 'Could not confirm sales order.';
    response.status(message === 'Sales order not found.' ? 404 : 422).json({ error: message });
  } finally {
    client.release();
  }
};
