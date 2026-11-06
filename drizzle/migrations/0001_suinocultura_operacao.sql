-- Swine production operations: batches, health records and feed inventory.
-- All records are shared by authorized farm members and protected by RLS.

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase text not null check (phase in ('creche','crescimento','terminacao','reprodutores','quarentena')),
  entry_date date not null default current_date,
  initial_headcount integer not null check (initial_headcount >= 0),
  current_headcount integer not null check (current_headcount >= 0),
  origin text,
  pen text,
  status text not null default 'ativo' check (status in ('ativo','encerrado')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.batch_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches(id) on delete cascade,
  event_type text not null check (event_type in ('morte','entrada','saida')),
  quantity integer not null check (quantity > 0),
  event_date date not null default current_date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.apply_batch_event()
returns trigger language plpgsql security definer set search_path = public
as $function$
declare
  delta integer;
begin
  delta := case when new.event_type = 'entrada' then new.quantity else -new.quantity end;
  update public.production_batches
     set current_headcount = current_headcount + delta
   where id = new.batch_id and current_headcount + delta >= 0;
  if not found then
    raise exception 'Quantidade inválida: o lote não pode ficar com saldo negativo';
  end if;
  return new;
end $function$;

create trigger on_batch_event after insert on public.batch_events
for each row execute function public.apply_batch_event();

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  record_date date not null default current_date,
  category text not null check (category in ('vacina','medicacao','vermifugo','sintoma','ocorrencia','visita')),
  animal_group text not null check (animal_group in ('matriz','leitegada','lote','reprodutor')),
  sow_id uuid references public.sows(id) on delete set null,
  litter_id uuid references public.litters(id) on delete set null,
  batch_id uuid references public.production_batches(id) on delete set null,
  product text,
  dosage text,
  responsible text,
  withdrawal_days integer not null default 0 check (withdrawal_days >= 0),
  notes text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (
    (animal_group = 'matriz' and sow_id is not null) or
    (animal_group = 'leitegada' and litter_id is not null) or
    (animal_group = 'lote' and batch_id is not null) or
    (animal_group = 'reprodutor')
  )
);

create table public.feed_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_stage text not null check (feed_stage in ('pre_inicial','inicial','crescimento','terminacao','gestacao','lactacao','reprodutor','outro')),
  unit text not null default 'kg' check (unit in ('kg','saco','unidade')),
  current_stock numeric(12,2) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(12,2) not null default 0 check (minimum_stock >= 0),
  cost_per_unit numeric(12,2) not null default 0 check (cost_per_unit >= 0),
  supplier text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.feed_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.feed_products(id) on delete restrict,
  movement_type text not null check (movement_type in ('entrada','saida')),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_cost numeric(12,2),
  movement_date date not null default current_date,
  batch_id uuid references public.production_batches(id) on delete set null,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.apply_feed_movement()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  delta numeric(12,2);
begin
  delta := case when new.movement_type = 'entrada' then new.quantity else -new.quantity end;
  update public.feed_products
     set current_stock = current_stock + delta,
         cost_per_unit = case when new.movement_type = 'entrada' and new.unit_cost is not null then new.unit_cost else cost_per_unit end
   where id = new.product_id and current_stock + delta >= 0;
  if not found then
    raise exception 'Estoque insuficiente ou produto não encontrado';
  end if;
  return new;
end $$;

create trigger on_feed_movement after insert on public.feed_movements
for each row execute function public.apply_feed_movement();

do $$ declare t text; begin
  foreach t in array array['production_batches','health_records','feed_products','feed_movements','batch_events'] loop
    if t = 'feed_movements' or t = 'batch_events' or t = 'health_records' then
      execute format('grant select, insert on public.%I to authenticated', t);
    else
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    end if;
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members all" on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

revoke update on public.feed_products from authenticated;
revoke update on public.production_batches from authenticated;
grant update (name, phase, entry_date, origin, pen, status, notes) on public.production_batches to authenticated;
grant update (name, feed_stage, unit, minimum_stock, cost_per_unit, supplier, notes) on public.feed_products to authenticated;

create index batch_events_batch_date_idx on public.batch_events(batch_id, event_date desc);
create index production_batches_phase_status_idx on public.production_batches(phase, status);
create index health_records_date_idx on public.health_records(record_date desc);
create index feed_movements_product_date_idx on public.feed_movements(product_id, movement_date desc);
