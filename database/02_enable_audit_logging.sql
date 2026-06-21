-- Allow authenticated ERP operations to append immutable audit events.
-- Audit records remain readable only by Admin users.
alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs for insert
with check (
  actor_id = auth.uid()
  and public.has_any_role(array['Admin','Sales','Purchase','Manufacturing']::public.user_role[])
);
