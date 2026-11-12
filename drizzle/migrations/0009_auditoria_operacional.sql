-- Audit trail for operational changes across the shared farm workspace.
-- The log is append-only for authenticated users; rows are written only by triggers.
create table public.farm_activity_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id) on delete set null default auth.uid(),
  changed_at timestamptz not null default now()
);

create index farm_activity_log_changed_at_idx
  on public.farm_activity_log(changed_at desc);
create index farm_activity_log_table_changed_at_idx
  on public.farm_activity_log(table_name, changed_at desc);

alter table public.farm_activity_log enable row level security;
grant select on public.farm_activity_log to authenticated;
grant all on public.farm_activity_log to service_role;
create policy "members read farm activity" on public.farm_activity_log
  for select to authenticated using (public.is_member());

create or replace function public.capture_farm_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row jsonb;
  after_row jsonb;
  target_id uuid;
begin
  if tg_op = 'INSERT' then
    after_row := to_jsonb(new);
    target_id := (after_row->>'id')::uuid;
  elsif tg_op = 'UPDATE' then
    before_row := to_jsonb(old);
    after_row := to_jsonb(new);
    target_id := (after_row->>'id')::uuid;
  else
    before_row := to_jsonb(old);
    target_id := (before_row->>'id')::uuid;
  end if;

  insert into public.farm_activity_log(table_name, record_id, action, old_data, new_data, changed_by)
  values (tg_table_name, target_id, tg_op, before_row, after_row, auth.uid());

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'sows','breedings','litters','litter_events','tasks',
    'production_batches','batch_events','health_records',
    'farm_pens','feed_products','pen_records','feed_movements'
  ] loop
    execute format(
      'create trigger farm_activity_audit after insert or update or delete on public.%I for each row execute function public.capture_farm_activity()',
      t
    );
  end loop;
end $$;

-- Keep the audit log append-only for normal authenticated sessions.
revoke insert, update, delete on public.farm_activity_log from authenticated;
