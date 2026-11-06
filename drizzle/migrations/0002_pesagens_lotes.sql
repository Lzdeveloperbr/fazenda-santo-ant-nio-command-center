-- Append-only live-weight records for production batches.
create table public.batch_weights (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches(id) on delete restrict,
  weigh_date date not null default current_date,
  average_weight_kg numeric(10,3) not null check (average_weight_kg > 0),
  sample_size integer not null check (sample_size > 0),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.batch_weights enable row level security;
grant select, insert on public.batch_weights to authenticated;
grant all on public.batch_weights to service_role;
create policy "members read weights" on public.batch_weights for select to authenticated using (public.is_member());
create policy "members insert weights" on public.batch_weights for insert to authenticated with check (public.is_member());
create index batch_weights_batch_date_idx on public.batch_weights(batch_id, weigh_date desc);
