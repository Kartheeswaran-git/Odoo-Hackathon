-- User onboarding and granular ERP permissions.
-- Run after 01_init_schema.sql.

begin;

alter table public.users add column if not exists active boolean not null default false;
alter table public.users alter column active set default false;

create table if not exists public.user_module_permissions (
  user_id uuid not null references public.users(id) on delete cascade,
  module_name text not null check (module_name in ('dashboard', 'parties', 'items', 'sales', 'purchases', 'manufacturing', 'bill_of_materials', 'reports', 'audit_logs', 'manage_users', 'settings')),
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_approve boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_name)
);

-- Admins always have full access. Every other active account is governed by
-- the module permissions assigned by Admin in Staff Management.
create or replace function public.can_module_action(requested_module text, action_name text)
returns boolean language sql stable security definer set search_path = public
as $$
  select case
    when public.current_role() = 'Admin' then true
    when not coalesce((select active from public.users where id = auth.uid()), false) then false
    else coalesce((
      select case action_name
        when 'view' then can_view
        when 'create' then can_create
        when 'edit' then can_edit
        when 'delete' then can_delete
        when 'approve' then can_approve
        else false
      end
      from public.user_module_permissions
      where user_id = auth.uid() and user_module_permissions.module_name = requested_module
    ), false)
  end
$$;

create or replace function public.can_access_module(module_name text)
returns boolean language sql stable security definer set search_path = public
as $$ select public.can_module_action(module_name, 'view') $$;

alter table public.user_module_permissions enable row level security;
drop policy if exists permission_read_own_or_admin on public.user_module_permissions;
drop policy if exists permission_admin_manage on public.user_module_permissions;
create policy permission_read_own_or_admin on public.user_module_permissions for select
  using (user_id = auth.uid() or public.has_any_role(array['Admin']::public.user_role[]));
create policy permission_admin_manage on public.user_module_permissions for all
  using (public.has_any_role(array['Admin']::public.user_role[]))
  with check (public.has_any_role(array['Admin']::public.user_role[]));

-- Replace coarse operational policies with the permission matrix.
drop policy if exists products_read on public.products;
drop policy if exists products_create on public.products;
drop policy if exists products_edit on public.products;
create policy products_read on public.products for select using (public.can_module_action('items', 'view'));
create policy products_create on public.products for insert with check (public.can_module_action('items', 'create'));
create policy products_edit on public.products for update using (public.can_module_action('items', 'edit')) with check (public.can_module_action('items', 'edit'));

drop policy if exists sales_read on public.sales_orders;
drop policy if exists sales_create on public.sales_orders;
drop policy if exists sales_edit_draft on public.sales_orders;
drop policy if exists sales_lines_read on public.sales_order_lines;
drop policy if exists sales_lines_write on public.sales_order_lines;
create policy sales_read on public.sales_orders for select using (public.can_module_action('sales', 'view'));
create policy sales_create on public.sales_orders for insert with check (public.can_module_action('sales', 'create'));
create policy sales_edit on public.sales_orders for update using (public.can_module_action('sales', 'edit') or public.can_module_action('sales', 'approve')) with check (public.can_module_action('sales', 'edit') or public.can_module_action('sales', 'approve'));
create policy sales_lines_read on public.sales_order_lines for select using (public.can_module_action('sales', 'view'));
create policy sales_lines_create on public.sales_order_lines for insert with check (public.can_module_action('sales', 'create'));
create policy sales_lines_edit on public.sales_order_lines for update using (public.can_module_action('sales', 'edit')) with check (public.can_module_action('sales', 'edit'));

drop policy if exists purchase_read on public.purchase_orders;
drop policy if exists purchase_write on public.purchase_orders;
drop policy if exists purchase_lines_read on public.purchase_order_lines;
drop policy if exists purchase_lines_write on public.purchase_order_lines;
create policy purchase_read on public.purchase_orders for select using (public.can_module_action('purchases', 'view'));
create policy purchase_create on public.purchase_orders for insert with check (public.can_module_action('purchases', 'create'));
create policy purchase_edit on public.purchase_orders for update using (public.can_module_action('purchases', 'edit') or public.can_module_action('purchases', 'approve')) with check (public.can_module_action('purchases', 'edit') or public.can_module_action('purchases', 'approve'));
create policy purchase_lines_read on public.purchase_order_lines for select using (public.can_module_action('purchases', 'view'));
create policy purchase_lines_create on public.purchase_order_lines for insert with check (public.can_module_action('purchases', 'create'));
create policy purchase_lines_edit on public.purchase_order_lines for update using (public.can_module_action('purchases', 'edit')) with check (public.can_module_action('purchases', 'edit'));

drop policy if exists mo_read on public.manufacturing_orders;
drop policy if exists mo_write on public.manufacturing_orders;
create policy mo_read on public.manufacturing_orders for select using (public.can_module_action('manufacturing', 'view'));
create policy mo_create on public.manufacturing_orders for insert with check (public.can_module_action('manufacturing', 'create'));
create policy mo_edit on public.manufacturing_orders for update using (public.can_module_action('manufacturing', 'edit')) with check (public.can_module_action('manufacturing', 'edit'));

commit;
