import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3000);

// Service-role admin client (for admin-only operations like staff management)
const adminClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Anon client (for login/signup only)
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  ...(process.env.FRONTEND_URL || '').split(',').map((v) => v.trim()).filter(Boolean),
]);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json());

const moduleDefaults = {
  parties: [{ id: 'party-1', name: 'Priya Interiors', party_type: 'Customer', phone: '98765 43210', address: 'Chennai' }, { id: 'party-2', name: 'Timber Traders', party_type: 'Supplier', phone: '98400 11223', address: 'Chennai' }],
  purchases: [{ id: 'purchase-1', number: 'PO-1001', supplier: 'Timber Traders', status: 'Draft', total: '₹18,500' }],
  manufacturing: [{ id: 'manufacturing-1', order: 'MO-1001', product: 'Dining Table', quantity: '10', status: 'Draft' }],
  bill_of_materials: [{ id: 'bom-1', product: 'Dining Table', version: '1', components: 'Legs, Top, Screws' }],

  audit_logs: [{ id: 'audit-1', event: 'Sales order confirmed', module: 'Sales', created: 'Today' }],
  settings: [{ id: 'settings-1', setting: 'Company name', value: 'Shiv Furniture Works', updated: 'Today' }, { id: 'settings-2', setting: 'Currency', value: 'INR', updated: 'Today' }],
};

// ── Auth middleware ────────────────────────────────────────────────────────────
async function auth(request, response, next) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return response.status(500).json({ error: 'Server misconfiguration: SUPABASE_URL or SUPABASE_ANON_KEY is not set.' });
    }
    const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return response.status(401).json({ error: 'Authentication is required.' });

    const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await userClient.auth.getUser(token);
    if (error || !data.user) return response.status(401).json({ error: 'Session is invalid or expired.' });

    let { data: profile, error: profileError } = await userClient.from('users').select('id, full_name, role, active').eq('id', data.user.id).single();
    if (profileError?.code === '42703') {
      const fallback = await userClient.from('users').select('id, full_name, role').eq('id', data.user.id).single();
      profile = fallback.data ? { ...fallback.data, active: true } : null;
      profileError = fallback.error;
    }
    if (profileError || !profile) return response.status(403).json({ error: 'User profile is missing or unavailable.' });
    if (!profile.active) return response.status(403).json({ error: 'Your account is waiting for Admin activation.' });

    request.user = { 
      id: data.user.id, 
      profile: {
        ...profile,
        email: data.user.email || '',
        phone: data.user.user_metadata?.phone || '',
        address: data.user.user_metadata?.address || ''
      }
    };
    request.supabase = userClient;
    next();
  } catch (error) { next(error); }
}

// ── Permission middleware ──────────────────────────────────────────────────────
async function permission(request, response, next, module, action = 'view') {
  if (request.user.profile.role === 'Admin') return next();
  const field = `can_${action}`;
  const { data: granted } = await request.supabase.from('user_module_permissions').select(field).eq('user_id', request.user.id).eq('module_name', module).maybeSingle();
  if (!granted?.[field]) return response.status(403).json({ error: `You do not have ${action} access to ${module}.` });
  next();
}
const allow = (module, action) => (req, res, next) => void permission(req, res, next, module, action).catch(next);

async function writeAudit(req, { action, entityType, entityId = null, details = {} }) {
  const { error } = await req.supabase.from('audit_logs').insert({ actor_id: req.user.id, action, entity_type: entityType, entity_id: entityId, details });
  if (error) console.error('Audit log write failed:', error.message);
}

// ── Public routes ──────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ name: 'Shiv Furniture Works ERP API', status: 'running', health: '/api/health' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'supabase-js' }));

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ session: data.session });
  } catch (error) { next(error); }
});

app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(422).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(422).json({ error: 'Password must be at least 6 characters.' });
    }

    // Use admin API to create user without sending a confirmation email.
    // This bypasses Supabase's email rate limit entirely.
    const hasAdminKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (hasAdminKey) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: email.trim(),
        password,
        user_metadata: { full_name: name.trim() },
        email_confirm: true, // mark as confirmed — no email sent
      });
      if (error) {
        if (error.message?.toLowerCase().includes('already')) {
          return res.status(409).json({ error: 'An account already exists for this email.' });
        }
        return res.status(400).json({ error: error.message });
      }
      return res.status(201).json({ user: { id: data.user?.id } });
    }

    // Fallback: regular signup (may hit email rate limit on free plan)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) {
      if (error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('email')) {
        return res.status(400).json({
          error: 'Email rate limit reached. Please wait a few minutes and try again, or contact your Admin to create your account directly.',
        });
      }
      return res.status(400).json({ error: error.message });
    }
    if (data.user?.identities?.length === 0) {
      return res.status(409).json({ error: 'An account already exists for this email.' });
    }
    res.status(201).json({ user: { id: data.user?.id } });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', auth, async (req, res, next) => {
  try {
    const { data: permissions = [] } = await req.supabase.from('user_module_permissions').select('module_name, can_view, can_create, can_edit, can_delete, can_approve').eq('user_id', req.user.id);
    res.json({ profile: req.user.profile, permissions });
  } catch (error) { next(error); }
});

// ── Inventory ──────────────────────────────────────────────────────────────────
app.get('/api/inventory', auth, allow('items', 'view'), async (_req, res, next) => {
  try {
    const { data, error } = await _req.supabase.from('product_inventory').select('id, sku, name, sales_price, cost_price, qty_on_hand, qty_reserved, qty_free_to_use, procure_on_demand, procurement_type').order('name');
    if (error) return res.status(422).json({ error: error.message });
    res.json(data ?? []);
  } catch (error) { next(error); }
});

app.post('/api/inventory', auth, allow('items', 'create'), async (req, res, next) => {
  try {
    const { name, sku, sales_price, cost_price, procurement_type, qty_on_hand = 0 } = req.body;
    if (!name?.trim() || !sku?.trim()) return res.status(422).json({ error: 'Product name and SKU are required.' });
    const normalizedType = procurement_type === 'Manufacture' ? 'Manufacturing' : 'Purchase';
    const procureOnDemand = procurement_type === 'Make to Order';
    const { data, error } = await req.supabase.from('products').insert({
      name: name.trim(), sku: sku.trim(), sales_price: Number(sales_price || 0), cost_price: Number(cost_price || 0),
      procure_on_demand: procureOnDemand, procurement_type: procureOnDemand ? normalizedType : null,
    }).select('id, sku, name, sales_price, cost_price, qty_on_hand, qty_reserved, procure_on_demand, procurement_type').single();
    if (error) return res.status(422).json({ error: error.message });
    if (Number(qty_on_hand) > 0) {
      const { error: stockError } = await req.supabase.from('stock_ledger').insert({ product_id: data.id, quantity_change: Number(qty_on_hand), movement_kind: 'Adjustment', reference_source: 'Adjustment', reference_id: data.id, created_by: req.user.id });
      if (stockError) return res.status(422).json({ error: stockError.message });
      data.qty_on_hand = Number(qty_on_hand);
    }
    await writeAudit(req, { action: 'Created', entityType: 'Product', entityId: data.id, details: { name: data.name, sku: data.sku } });
    res.status(201).json({ ...data, qty_free_to_use: Number(data.qty_on_hand) - Number(data.qty_reserved) });
  } catch (error) { next(error); }
});

// ── Debounced textbox suggestions ─────────────────────────────────────────────
app.get('/api/suggestions/:type', auth, async (req, res, next) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    const query = String(req.query.q || '').trim();

    if (query.length < 2) return res.json([]);

    if (type === 'items' || type === 'products') {
      await permission(req, res, () => {}, 'items', 'view');
      if (res.headersSent) return;

      const safeQuery = query.replace(/[%,]/g, '');
      const { data, error } = await req.supabase
        .from('product_inventory')
        .select('id, sku, name, sales_price, cost_price, qty_free_to_use')
        .or(`name.ilike.%${safeQuery}%,sku.ilike.%${safeQuery}%`)
        .order('name')
        .limit(10);

      if (error) return res.status(422).json({ error: error.message });
      return res.json(data ?? []);
    }

    if (type === 'parties') {
      await permission(req, res, () => {}, 'parties', 'view');
      if (res.headersSent) return;

      const { data: records, error } = await req.supabase
        .from('module_records')
        .select('id, payload')
        .eq('module_name', 'parties')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return res.status(422).json({ error: error.message });

      const needle = query.toLowerCase();
      const source = records?.length
        ? records.map((row) => ({ id: row.id, ...row.payload }))
        : moduleDefaults.parties;

      return res.json(source
        .filter((party) => [party.name, party.party_type, party.phone, party.address]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)))
        .slice(0, 10));
    }

    return res.status(404).json({ error: 'Suggestion API not found.' });
  } catch (error) { next(error); }
});

// ── Sales orders ───────────────────────────────────────────────────────────────
app.get('/api/sales-orders', auth, allow('sales', 'view'), async (_req, res, next) => {
  try {
    const { data, error } = await _req.supabase.from('sales_orders').select('id, order_number, customer_name, status, confirmed_at, created_at, sales_order_lines(id)').order('created_at', { ascending: false });
    if (error) return res.status(422).json({ error: error.message });
    res.json((data ?? []).map((row) => ({ ...row, line_count: row.sales_order_lines?.length ?? 0 })));
  } catch (error) { next(error); }
});

app.post('/api/sales-orders', auth, allow('sales', 'create'), async (req, res, next) => {
  try {
    const { customerName, lines } = req.body;
    if (!customerName?.trim() || !Array.isArray(lines) || !lines.length) {
      return res.status(422).json({ error: 'Customer and at least one line are required.' });
    }
    // Insert order
    const { data: order, error: orderErr } = await req.supabase.from('sales_orders').insert({ customer_name: customerName.trim(), created_by: req.user.id }).select('id').single();
    if (orderErr) return res.status(422).json({ error: orderErr.message });
    // Insert lines
    const lineRows = lines.map((l) => ({ sales_order_id: order.id, product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price }));
    const { error: linesErr } = await req.supabase.from('sales_order_lines').insert(lineRows);
    if (linesErr) {
      await req.supabase.from('sales_orders').delete().eq('id', order.id);
      return res.status(422).json({ error: linesErr.message });
    }
    await writeAudit(req, { action: 'Created', entityType: 'Sales', entityId: order.id, details: { customer_name: customerName.trim(), lines: lines.length } });
    res.status(201).json({ id: order.id });
  } catch (error) { next(error); }
});

app.post('/api/sales-orders/:id/confirm', auth, allow('sales', 'approve'), async (req, res, next) => {
  try {
    const orderId = req.params.id;
    // Fetch order
    const { data: order, error: orderErr } = await req.supabase.from('sales_orders').select('id, status').eq('id', orderId).single();
    if (orderErr || !order) return res.status(404).json({ error: 'Sales order not found.' });
    if (order.status !== 'Draft') return res.status(422).json({ error: 'Only Draft sales orders can be confirmed.' });
    // Fetch lines with product info
    const { data: lines, error: linesErr } = await req.supabase.from('sales_order_lines').select('product_id, quantity, products(name, cost_price, qty_on_hand, qty_reserved, procure_on_demand, procurement_type, default_vendor_id, bom_id)').eq('sales_order_id', orderId);
    if (linesErr) return res.status(422).json({ error: linesErr.message });
    if (!lines?.length) return res.status(422).json({ error: 'A sales order needs at least one line.' });

    const procurements = [];
    for (const line of lines) {
      const item = line.products;
      const requested = Number(line.quantity);
      const free = Number(item.qty_on_hand) - Number(item.qty_reserved);
      const reserve = Math.min(requested, Math.max(free, 0));
      const deficit = requested - reserve;

      if (deficit > 0 && !item.procure_on_demand) return res.status(422).json({ error: `Insufficient free stock for ${item.name}.` });

      if (reserve > 0) {
        await req.supabase.from('stock_ledger').insert({ product_id: line.product_id, reservation_change: reserve, movement_kind: 'Reservation', reference_source: 'Sales', reference_id: orderId, created_by: req.user.id });
      }
      if (deficit > 0 && item.procurement_type === 'Purchase') {
        if (!item.default_vendor_id) return res.status(422).json({ error: `${item.name} has no default vendor.` });
        const { data: po } = await req.supabase.from('purchase_orders').insert({ vendor_id: item.default_vendor_id, source_sales_order_id: orderId, created_by: req.user.id }).select('id').single();
        await req.supabase.from('purchase_order_lines').insert({ purchase_order_id: po.id, product_id: line.product_id, quantity: deficit, unit_cost: item.cost_price });
        procurements.push({ type: 'Purchase', id: po.id, productId: line.product_id, quantity: deficit });
      } else if (deficit > 0 && item.procurement_type === 'Manufacturing') {
        if (!item.bom_id) return res.status(422).json({ error: `${item.name} has no Bill of Materials.` });
        const { data: mo } = await req.supabase.from('manufacturing_orders').insert({ product_id: line.product_id, bom_id: item.bom_id, quantity: deficit, source_sales_order_id: orderId, created_by: req.user.id }).select('id').single();
        const { data: bomLines } = await req.supabase.from('bom_lines').select('component_id, required_quantity').eq('bom_id', item.bom_id);
        if (bomLines?.length) {
          await req.supabase.from('manufacturing_order_component_lines').insert(bomLines.map((b) => ({ manufacturing_order_id: mo.id, component_id: b.component_id, required_quantity: b.required_quantity * deficit })));
        }
        procurements.push({ type: 'Manufacturing', id: mo.id, productId: line.product_id, quantity: deficit });
      } else if (deficit > 0) {
        return res.status(422).json({ error: `${item.name} has an invalid MTO configuration.` });
      }
    }

    const { error: updateErr } = await req.supabase.from('sales_orders').update({ status: 'Confirmed', confirmed_at: new Date().toISOString() }).eq('id', orderId);
    if (updateErr) return res.status(422).json({ error: updateErr.message });
    await writeAudit(req, { action: 'Updated', entityType: 'Sales', entityId: orderId, details: { field: 'status', old_value: 'Draft', new_value: 'Confirmed', procurements } });
    res.json({ id: orderId, status: 'Confirmed', procurements });
  } catch (error) { next(error); }
});

app.post('/api/sales-orders/:id/deliver', auth, allow('sales', 'edit'), async (req, res, next) => {
  try {
    const { deliveredQty, orderedQty } = req.body;
    const status = deliveredQty < orderedQty ? 'Partially Delivered' : 'Fully Delivered';
    const { error } = await req.supabase.from('sales_orders').update({ status }).eq('id', req.params.id);
    if (error) return res.status(422).json({ error: error.message });
    
    // Log the event
    await req.supabase.from('audit_logs').insert([{ 
      actor_id: req.user.id, 
      action: 'Updated', 
      entity_type: 'Sales', 
      entity_id: req.params.id, 
      details: { field: 'status', old_value: 'Confirmed', new_value: status, deliveredQty, orderedQty } 
    }]);

    res.json({ success: true, status });
  } catch (error) { next(error); }
});

app.post('/api/sales-orders/:id/cancel', auth, allow('sales', 'edit'), async (req, res, next) => {
  try {
    const { error } = await req.supabase.from('sales_orders').update({ status: 'Cancelled' }).eq('id', req.params.id);
    if (error) return res.status(422).json({ error: error.message });

    // Log the event
    await req.supabase.from('audit_logs').insert([{ 
      actor_id: req.user.id, 
      action: 'Updated', 
      entity_type: 'Sales', 
      entity_id: req.params.id, 
      details: { field: 'status', old_value: 'Confirmed', new_value: 'Cancelled' } 
    }]);

    res.json({ success: true, status: 'Cancelled' });
  } catch (error) { next(error); }
});

// ── Audit Logs ───────────────────────────────────────────────────────────────
app.post('/api/audit-logs', auth, async (req, res, next) => {
  try {
    const { action, entityType, entityId, details } = req.body;
    await writeAudit(req, { action, entityType, entityId, details });
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

app.get('/api/audit-logs', auth, async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('audit_logs')
      .select('id, actor_id, action, entity_type, entity_id, details, occurred_at, users!actor_id(full_name)')
      .order('occurred_at', { ascending: false });
    
    if (error) return res.status(422).json({ error: error.message });
    
    // Aggregate metrics
    const metrics = { Total: 0, Created: 0, Updated: 0, Deleted: 0 };
    const logs = (data || []).map(row => {
      metrics.Total++;
      if (row.action === 'Created') metrics.Created++;
      else if (row.action === 'Updated') metrics.Updated++;
      else if (row.action === 'Deleted') metrics.Deleted++;

      return {
        id: row.id,
        date_time: new Date(row.occurred_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        user: row.users?.full_name || 'System',
        module: row.entity_type,
        record_type: row.entity_type, // E.g., 'Sales', 'Product'
        record_id: row.entity_id,
        action: row.action,
        field_changed: row.details?.field || '-',
        old_value: row.details?.old_value || '-',
        new_value: row.details?.new_value || '-'
      };
    });

    res.json({ metrics, logs });
  } catch (error) { next(error); }
});

// ── Staff management ───────────────────────────────────────────────────────────
// These are the ONLY module_name values allowed by the DB check constraint.
const VALID_MODULES = new Set([
  'dashboard', 'parties', 'items', 'sales', 'purchases',
  'manufacturing', 'bill_of_materials', 'audit_logs',
  'settings', 'manage_users',
]);
app.get('/api/staff', auth, allow('manage_users', 'view'), async (_req, res, next) => {
  try {
    const [usersRes, permsRes, authRes] = await Promise.all([
      adminClient.from('users').select('id, full_name, role, active, created_at').order('created_at', { ascending: false }),
      adminClient.from('user_module_permissions').select('user_id, module_name, can_view, can_create, can_edit, can_delete, can_approve'),
      adminClient.auth.admin.listUsers(),
    ]);
    if (usersRes.error) return res.status(422).json({ error: usersRes.error.message });
    if (authRes.error) return res.status(422).json({ error: authRes.error.message });
    
    const authUsers = authRes.data?.users || [];
    const combinedUsers = (usersRes.data ?? []).map(u => {
      const authU = authUsers.find(au => au.id === u.id);
      return {
        ...u,
        email: authU?.email || '',
        phone: authU?.user_metadata?.phone || '',
        address: authU?.user_metadata?.address || ''
      };
    });

    res.json({ users: combinedUsers, permissions: permsRes.data ?? [] });
  } catch (error) { next(error); }
});

// Update role, active status, and module permissions
app.put('/api/staff/:id', auth, allow('manage_users', 'edit'), async (req, res, next) => {
  try {
    const { role, active, full_name, phone, address, permissions = [] } = req.body;
    const userId = req.params.id;
    const updateFields = {};
    if (role !== undefined) updateFields.role = role;
    if (active !== undefined) updateFields.active = active;
    if (full_name !== undefined) updateFields.full_name = full_name;
    const { error: updateErr } = await adminClient.from('users').update(updateFields).eq('id', userId);
    if (updateErr) return res.status(422).json({ error: updateErr.message });
    
    // Update user metadata in Supabase Auth
    const metadataUpdate = {};
    if (full_name !== undefined) metadataUpdate.full_name = full_name;
    if (phone !== undefined) metadataUpdate.phone = phone;
    if (address !== undefined) metadataUpdate.address = address;
    
    if (Object.keys(metadataUpdate).length > 0) {
      await adminClient.auth.admin.updateUserById(userId, { user_metadata: metadataUpdate });
    }
    await adminClient.from('user_module_permissions').delete().eq('user_id', userId);
    if (permissions.length) {
      // Filter to only constraint-valid module names before inserting
      const rows = permissions
        .filter((p) => VALID_MODULES.has(p.module_name))
        .map((p) => ({ user_id: userId, module_name: p.module_name, can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete, can_approve: p.can_approve }));
      if (rows.length) {
        const { error: permErr } = await adminClient.from('user_module_permissions').insert(rows);
        if (permErr) return res.status(422).json({ error: permErr.message });
      }
    }
    await writeAudit(req, { action: 'Updated', entityType: 'User Access', entityId: userId, details: { role, active, permission_count: permissions.length } });
    res.json({ status: 'updated' });
  } catch (error) { next(error); }
});

// Delete a user (Admin only)
app.delete('/api/staff/:id', auth, async (req, res, next) => {
  try {
    if (req.user.profile.role !== 'Admin') return res.status(403).json({ error: 'Admin only.' });
    const userId = req.params.id;
    if (userId === req.user.id) return res.status(422).json({ error: 'You cannot delete your own account.' });
    await adminClient.from('user_module_permissions').delete().eq('user_id', userId);
    await adminClient.from('users').delete().eq('id', userId);
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return res.status(422).json({ error: error.message });
    await writeAudit(req, { action: 'Deleted', entityType: 'User', entityId: userId });
    res.status(204).end();
  } catch (error) { next(error); }
});

// ── Company Settings ───────────────────────────────────────────────────────────
const SETTINGS_KEY = 'company_settings';
const DEFAULT_SETTINGS = {
  company_name: 'Shiv Furniture Works',
  tagline: 'Central manufacturing backbone',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  website: '',
  gstin: '',
  pan: '',
  currency: 'INR',
  financial_year_start: '04',
};

app.get('/api/company-profile', auth, async (_req, res, next) => {
  try {
    const { data } = await adminClient.from('module_records').select('payload').eq('module_name', SETTINGS_KEY).maybeSingle();
    res.json(data?.payload ?? DEFAULT_SETTINGS);
  } catch (error) { next(error); }
});

app.get('/api/settings', auth, async (req, res, next) => {
  try {
    if (req.user.profile.role !== 'Admin') return res.status(403).json({ error: 'Admin only.' });
    const { data } = await adminClient.from('module_records').select('payload').eq('module_name', SETTINGS_KEY).maybeSingle();
    res.json(data?.payload ?? DEFAULT_SETTINGS);
  } catch (error) { next(error); }
});

app.put('/api/settings', auth, async (req, res, next) => {
  try {
    if (req.user.profile.role !== 'Admin') return res.status(403).json({ error: 'Admin only.' });
    const payload = { ...DEFAULT_SETTINGS, ...req.body };
    const { data: existing } = await adminClient.from('module_records').select('id').eq('module_name', SETTINGS_KEY).maybeSingle();
    if (existing?.id) {
      await adminClient.from('module_records').update({ payload }).eq('id', existing.id);
    } else {
      await adminClient.from('module_records').insert({ module_name: SETTINGS_KEY, payload, created_by: req.user.id });
    }
    res.json(payload);
  } catch (error) { next(error); }
});

// ── Manufacturing Production ───────────────────────────────────────────────────
app.post('/api/manufacturing/:id/produce', auth, async (req, res, next) => {
  await permission(req, res, () => {}, 'manufacturing', 'edit'); if (res.headersSent) return;
  try {
    const moId = req.params.id;
    const { data: moRecord, error: moError } = await req.supabase.from('module_records').select('*').eq('id', moId).eq('module_name', 'manufacturing').single();
    if (moError || !moRecord) return res.status(404).json({ error: 'Manufacturing order not found.' });
    
    const payload = moRecord.payload;
    if (payload.status !== 'In Progress') return res.status(400).json({ error: 'Order must be In Progress to produce.' });

    const { data: product, error: productError } = await req.supabase.from('product_inventory').select('id, name').eq('name', payload.product).single();
    if (productError || !product) return res.status(400).json({ error: `Product ${payload.product} not found in inventory.` });

    const componentsToConsume = [];
    for (const comp of payload.components) {
      const { data: cp, error: cpe } = await req.supabase.from('product_inventory').select('id, name').eq('name', comp.product).single();
      if (cpe || !cp) return res.status(400).json({ error: `Component ${comp.product} not found in inventory.` });
      componentsToConsume.push({ id: cp.id, name: cp.name, qty: comp.qty });
    }

    for (const comp of componentsToConsume) {
      await adminClient.from('stock_ledger').insert({
        product_id: comp.id,
        quantity_change: -comp.qty,
        movement_kind: 'Consumption',
        reference_source: 'MO',
        reference_id: moId,
        created_by: req.user.id
      });
    }

    await adminClient.from('stock_ledger').insert({
      product_id: product.id,
      quantity_change: payload.quantity,
      movement_kind: 'Production',
      reference_source: 'MO',
      reference_id: moId,
      created_by: req.user.id
    });

    payload.status = 'Done';
    const { error: updateError } = await req.supabase.from('module_records').update({ payload }).eq('id', moId);
    if (updateError) return res.status(500).json({ error: 'Failed to update order status.' });

    await writeAudit(req, { action: 'Produced', entityType: 'manufacturing', entityId: moId, details: { produced: payload.quantity } });

    res.json({ success: true, payload });
  } catch (error) { next(error); }
});

// ── Generic module records ─────────────────────────────────────────────────────
app.get('/api/modules/:module', auth, async (req, res, next) => {
  if (!moduleDefaults[req.params.module]) return res.status(404).json({ error: 'Module API not found.' });
  await permission(req, res, () => {}, req.params.module, 'view'); if (res.headersSent) return;
  try {
    const { data: records, error } = await adminClient.from('module_records').select('id, payload').eq('module_name', req.params.module).order('created_at', { ascending: false });
    if (error) {
      // Table may not exist yet — return defaults gracefully
      console.warn('module_records query error (returning defaults):', error.message);
      return res.json(moduleDefaults[req.params.module]);
    }
    res.json(records?.length ? records.map((row) => ({ id: row.id, ...row.payload })) : moduleDefaults[req.params.module]);
  } catch (error) { next(error); }
});

app.post('/api/modules/:module', auth, async (req, res, next) => {
  if (!moduleDefaults[req.params.module]) return res.status(404).json({ error: 'Module API not found.' });
  await permission(req, res, () => {}, req.params.module, 'create'); if (res.headersSent) return;
  try {
    const { data: created, error } = await adminClient.from('module_records').insert({ module_name: req.params.module, payload: req.body, created_by: req.user.id }).select('id').single();
    if (error) return res.status(422).json({ error: error.message });
    await writeAudit(req, { action: 'Created', entityType: req.params.module, entityId: created.id, details: req.body });
    res.status(201).json({ id: created.id, ...req.body });
  } catch (error) { next(error); }
});

app.put('/api/modules/:module/:id', auth, async (req, res, next) => {
  if (!moduleDefaults[req.params.module]) return res.status(404).json({ error: 'Module API not found.' });
  await permission(req, res, () => {}, req.params.module, 'edit'); if (res.headersSent) return;
  try {
    const { error } = await adminClient.from('module_records').update({ payload: req.body }).eq('module_name', req.params.module).eq('id', req.params.id);
    if (error) return res.status(422).json({ error: error.message });
    await writeAudit(req, { action: 'Updated', entityType: req.params.module, entityId: req.params.id, details: req.body });
    res.json({ id: req.params.id, ...req.body });
  } catch (error) { next(error); }
});

app.delete('/api/modules/:module/:id', auth, async (req, res, next) => {
  if (!moduleDefaults[req.params.module]) return res.status(404).json({ error: 'Module API not found.' });
  await permission(req, res, () => {}, req.params.module, 'delete'); if (res.headersSent) return;
  try {
    const { error } = await adminClient.from('module_records').delete().eq('module_name', req.params.module).eq('id', req.params.id);
    if (error) return res.status(422).json({ error: error.message });
    await writeAudit(req, { action: 'Deleted', entityType: req.params.module, entityId: req.params.id });
    res.status(204).end();
  } catch (error) { next(error); }
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Server error.' });
});

app.listen(port, () => console.log(`Shiv Furniture Works API listening on ${port}`));
