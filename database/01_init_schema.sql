-- Shiv Furniture Works ERP / Supabase database initialisation
-- Run in the Supabase SQL editor as the project owner.

begin;

do $$ begin create type public.user_role as enum ('Admin', 'Sales', 'Purchase', 'Manufacturing'); exception when duplicate_object then null; end $$;
do $$ begin create type public.procurement_type as enum ('Purchase', 'Manufacturing'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('Draft', 'Confirmed', 'Completed', 'Cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stock_reference_source as enum ('Sales', 'Purchase', 'MO', 'Adjustment'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stock_movement_kind as enum ('Receipt', 'Delivery', 'Reservation', 'ReservationRelease', 'Consumption', 'Production', 'Adjustment'); exception when duplicate_object then null; end $$;

-- A profile is created for every authenticated Supabase user.  Roles are never
-- client writable; assign them in SQL or through an admin-only service.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'New user' check (btrim(full_name) <> ''),
  role public.user_role not null default 'Sales',
  created_at timestamptz not null default now()
);

-- Provision a least-privileged profile whenever an Auth user is created.
-- Elevate roles only from the Supabase SQL editor or a trusted admin service.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user'));
  return new;
end;
$$;

drop trigger if exists auth_user_profile_created on auth.users;
create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  email text,
  created_at timestamptz not null default now()
);

-- Quantity columns are protected derived balances.  The ledger trigger is the
-- sole writer, so the stock ledger remains the source of truth.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  sku text not null unique check (btrim(sku) <> ''),
  sales_price numeric(14, 2) not null default 0 check (sales_price >= 0),
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  qty_on_hand numeric(14, 3) not null default 0 check (qty_on_hand >= 0),
  qty_reserved numeric(14, 3) not null default 0 check (qty_reserved >= 0),
  procure_on_demand boolean not null default false,
  procurement_type public.procurement_type,
  default_vendor_id uuid references public.vendors(id) on delete set null,
  bom_id uuid unique,
  created_at timestamptz not null default now(),
  check (
    (procure_on_demand = false)
    or (procurement_type is not null)
  )
);

create table if not exists public.boms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.products add constraint products_bom_id_fkey
    foreign key (bom_id) references public.boms(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.bom_lines (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid not null references public.boms(id) on delete cascade,
  component_id uuid not null references public.products(id) on delete restrict,
  required_quantity numeric(14, 3) not null check (required_quantity > 0),
  unique (bom_id, component_id)
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null check (btrim(customer_name) <> ''),
  status public.order_status not null default 'Draft',
  created_by uuid not null references public.users(id) on delete restrict,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  unique (sales_order_id, product_id)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  status public.order_status not null default 'Draft',
  source_sales_order_id uuid references public.sales_orders(id) on delete set null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  unique (purchase_order_id, product_id)
);

create table if not exists public.manufacturing_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  product_id uuid not null references public.products(id) on delete restrict,
  bom_id uuid not null references public.boms(id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  status public.order_status not null default 'Draft',
  source_sales_order_id uuid references public.sales_orders(id) on delete set null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Snapshot of the components required by an MO at creation time.  This keeps a
-- historical MO stable even if its source BoM is revised later.
create table if not exists public.manufacturing_order_component_lines (
  id uuid primary key default gen_random_uuid(),
  manufacturing_order_id uuid not null references public.manufacturing_orders(id) on delete cascade,
  component_id uuid not null references public.products(id) on delete restrict,
  required_quantity numeric(14, 3) not null check (required_quantity > 0),
  unique (manufacturing_order_id, component_id)
);

-- Append-only inventory source of truth.  quantity_change affects physical
-- stock; reservation_change affects availability without moving physical stock.
create table if not exists public.stock_ledger (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_change numeric(14, 3) not null default 0,
  reservation_change numeric(14, 3) not null default 0,
  movement_kind public.stock_movement_kind not null,
  reference_source public.stock_reference_source not null,
  reference_id uuid not null,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  check (quantity_change <> 0 or reservation_change <> 0)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Flexible records for lightweight ERP workspaces such as Parties, Reports,
-- Settings, and BoM views. All client writes go through the Express API.
create table if not exists public.module_records (
  id uuid primary key default gen_random_uuid(),
  module_name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null
);

create index if not exists stock_ledger_product_occurred_idx on public.stock_ledger(product_id, occurred_at desc);
create index if not exists sales_order_lines_product_idx on public.sales_order_lines(product_id);
create index if not exists bom_lines_component_idx on public.bom_lines(component_id);

create or replace view public.product_inventory
with (security_invoker = true) as
select
  p.*,
  p.qty_on_hand - p.qty_reserved as qty_free_to_use
from public.products p;

create or replace function public.apply_stock_ledger_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set qty_on_hand = qty_on_hand + new.quantity_change,
      qty_reserved = qty_reserved + new.reservation_change
  where id = new.product_id
    and qty_on_hand + new.quantity_change >= 0
    and qty_reserved + new.reservation_change >= 0
    and qty_reserved + new.reservation_change <= qty_on_hand + new.quantity_change;

  if not found then
    raise exception 'Insufficient stock or invalid reservation for product %', new.product_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists stock_ledger_apply_balances on public.stock_ledger;
create trigger stock_ledger_apply_balances
after insert on public.stock_ledger
for each row execute function public.apply_stock_ledger_entry();

create or replace function public.prevent_direct_inventory_balance_changes()
returns trigger language plpgsql as $$
begin
  -- The nested update made by the ledger trigger is allowed; all direct balance
  -- edits are rejected, preserving the ledger as the only inventory writer.
  if pg_trigger_depth() = 1
    and (new.qty_on_hand is distinct from old.qty_on_hand
      or new.qty_reserved is distinct from old.qty_reserved) then
    raise exception 'Inventory balances can only be changed through stock_ledger';
  end if;
  return new;
end;
$$;

drop trigger if exists products_no_direct_inventory_balance_update on public.products;
create trigger products_no_direct_inventory_balance_update
before update on public.products
for each row execute function public.prevent_direct_inventory_balance_changes();

create or replace function public.prevent_stock_ledger_changes()
returns trigger language plpgsql as $$
begin
  raise exception 'stock_ledger is append-only';
end;
$$;

drop trigger if exists stock_ledger_no_update on public.stock_ledger;
create trigger stock_ledger_no_update before update or delete on public.stock_ledger
for each row execute function public.prevent_stock_ledger_changes();

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.users where id = auth.uid() $$;

create or replace function public.has_any_role(roles public.user_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_role() = any(roles) $$;

-- RLS: Admin can manage everything; operational users get the permissions in
-- the supplied matrix.  Backend service-role requests bypass these policies.
alter table public.users enable row level security;
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.boms enable row level security;
alter table public.bom_lines enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.manufacturing_orders enable row level security;
alter table public.manufacturing_order_component_lines enable row level security;
alter table public.stock_ledger enable row level security;
alter table public.audit_logs enable row level security;
alter table public.module_records enable row level security;

drop policy if exists users_read_own_or_admin on public.users;
drop policy if exists products_read on public.products;
drop policy if exists products_create on public.products;
drop policy if exists products_edit on public.products;
drop policy if exists vendors_read on public.vendors;
drop policy if exists vendors_manage on public.vendors;
drop policy if exists boms_read on public.boms;
drop policy if exists boms_manage on public.boms;
drop policy if exists bom_lines_read on public.bom_lines;
drop policy if exists bom_lines_manage on public.bom_lines;
drop policy if exists sales_read on public.sales_orders;
drop policy if exists sales_create on public.sales_orders;
drop policy if exists sales_edit_draft on public.sales_orders;
drop policy if exists sales_lines_read on public.sales_order_lines;
drop policy if exists sales_lines_write on public.sales_order_lines;
drop policy if exists purchase_read on public.purchase_orders;
drop policy if exists purchase_write on public.purchase_orders;
drop policy if exists purchase_lines_read on public.purchase_order_lines;
drop policy if exists purchase_lines_write on public.purchase_order_lines;
drop policy if exists mo_read on public.manufacturing_orders;
drop policy if exists mo_write on public.manufacturing_orders;
drop policy if exists mo_components_read on public.manufacturing_order_component_lines;
drop policy if exists mo_components_write on public.manufacturing_order_component_lines;
drop policy if exists ledger_read on public.stock_ledger;
drop policy if exists ledger_insert on public.stock_ledger;
drop policy if exists audit_logs_read on public.audit_logs;
drop policy if exists audit_logs_insert on public.audit_logs;
drop policy if exists module_records_no_client_access on public.module_records;

create policy users_read_own_or_admin on public.users for select using (id = auth.uid() or public.has_any_role(array['Admin']::public.user_role[]));
create policy products_read on public.products for select using (public.has_any_role(array['Admin','Sales','Purchase','Manufacturing']::public.user_role[]));
create policy products_create on public.products for insert with check (public.has_any_role(array['Admin','Sales']::public.user_role[]));
create policy products_edit on public.products for update using (public.has_any_role(array['Admin','Sales']::public.user_role[]));
create policy vendors_read on public.vendors for select using (public.has_any_role(array['Admin','Purchase']::public.user_role[]));
create policy vendors_manage on public.vendors for all using (public.has_any_role(array['Admin','Purchase']::public.user_role[]));
create policy boms_read on public.boms for select using (public.has_any_role(array['Admin','Manufacturing']::public.user_role[]));
create policy boms_manage on public.boms for all using (public.has_any_role(array['Admin']::public.user_role[]));
create policy bom_lines_read on public.bom_lines for select using (public.has_any_role(array['Admin','Manufacturing']::public.user_role[]));
create policy bom_lines_manage on public.bom_lines for all using (public.has_any_role(array['Admin']::public.user_role[]));
create policy sales_read on public.sales_orders for select using (public.has_any_role(array['Admin','Sales']::public.user_role[]));
create policy sales_create on public.sales_orders for insert with check (public.has_any_role(array['Admin','Sales']::public.user_role[]));
create policy sales_edit_draft on public.sales_orders for update using (status = 'Draft' and public.has_any_role(array['Admin','Sales']::public.user_role[]));
create policy sales_lines_read on public.sales_order_lines for select using (public.has_any_role(array['Admin','Sales']::public.user_role[]));
create policy sales_lines_write on public.sales_order_lines for all using (public.has_any_role(array['Admin','Sales']::public.user_role[]));
create policy purchase_read on public.purchase_orders for select using (public.has_any_role(array['Admin','Purchase']::public.user_role[]));
create policy purchase_write on public.purchase_orders for all using (public.has_any_role(array['Admin','Purchase']::public.user_role[]));
create policy purchase_lines_read on public.purchase_order_lines for select using (public.has_any_role(array['Admin','Purchase']::public.user_role[]));
create policy purchase_lines_write on public.purchase_order_lines for all using (public.has_any_role(array['Admin','Purchase']::public.user_role[]));
create policy mo_read on public.manufacturing_orders for select using (public.has_any_role(array['Admin','Manufacturing']::public.user_role[]));
create policy mo_write on public.manufacturing_orders for all using (public.has_any_role(array['Admin','Manufacturing']::public.user_role[]));
create policy mo_components_read on public.manufacturing_order_component_lines for select using (public.has_any_role(array['Admin','Manufacturing']::public.user_role[]));
create policy mo_components_write on public.manufacturing_order_component_lines for all using (public.has_any_role(array['Admin','Manufacturing']::public.user_role[]));
create policy ledger_read on public.stock_ledger for select using (public.has_any_role(array['Admin','Sales','Purchase','Manufacturing']::public.user_role[]));
create policy ledger_insert on public.stock_ledger for insert with check (public.has_any_role(array['Admin','Purchase','Manufacturing']::public.user_role[]));
create policy audit_logs_read on public.audit_logs for select using (public.has_any_role(array['Admin']::public.user_role[]));
create policy audit_logs_insert on public.audit_logs for insert with check (actor_id = auth.uid() and public.has_any_role(array['Admin','Sales','Purchase','Manufacturing']::public.user_role[]));
create policy module_records_no_client_access on public.module_records for select using (false);

commit;
