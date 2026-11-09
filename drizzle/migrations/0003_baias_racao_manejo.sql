-- Baias numeradas, caderno de manejo e controle de ração.
create table public.farm_pens (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  sector text not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'ativa' check (status in ('ativa','manutencao','inativa')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.feed_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase text not null,
  supplier text,
  bag_weight_kg numeric(10,2) check (bag_weight_kg is null or bag_weight_kg > 0),
  stock_kg numeric(12,2) not null default 0 check (stock_kg >= 0),
  minimum_stock_kg numeric(12,2) not null default 0 check (minimum_stock_kg >= 0),
  cost_per_kg numeric(12,4) check (cost_per_kg is null or cost_per_kg >= 0),
  created_at timestamptz not null default now()
);

create table public.pen_records (
  id uuid primary key default gen_random_uuid(),
  pen_id uuid not null references public.farm_pens(id) on delete restrict,
  event_date date not null default current_date,
  record_type text not null,
  animal_count integer check (animal_count is null or animal_count >= 0),
  feed_product_id uuid references public.feed_products(id) on delete restrict,
  feed_kg numeric(12,2) not null default 0 check (feed_kg >= 0),
  water_liters numeric(12,2) check (water_liters is null or water_liters >= 0),
  temperature_c numeric(5,2),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint pen_record_feed_pair check ((feed_kg = 0 and feed_product_id is null) or (feed_kg > 0 and feed_product_id is not null))
);

create table public.feed_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.feed_products(id) on delete restrict,
  movement_type text not null check (movement_type in ('entrada','consumo')),
  quantity_kg numeric(12,2) not null check (quantity_kg > 0),
  movement_date date not null default current_date,
  pen_id uuid references public.farm_pens(id) on delete restrict,
  pen_record_id uuid unique references public.pen_records(id) on delete restrict,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index farm_pens_sector_code_idx on public.farm_pens(sector, code);
create index pen_records_pen_date_idx on public.pen_records(pen_id, event_date desc);
create index feed_movements_product_date_idx on public.feed_movements(product_id, movement_date desc);

alter table public.farm_pens enable row level security;
alter table public.feed_products enable row level security;
alter table public.pen_records enable row level security;
alter table public.feed_movements enable row level security;

grant select, insert, update on public.farm_pens to authenticated;
grant select, insert, update on public.feed_products to authenticated;
grant select, insert on public.pen_records to authenticated;
grant select, insert on public.feed_movements to authenticated;
grant all on public.farm_pens, public.feed_products, public.pen_records, public.feed_movements to service_role;

create policy "members manage pens" on public.farm_pens for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members manage feed products" on public.feed_products for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members read pen records" on public.pen_records for select to authenticated using (public.is_member());
create policy "members add pen records" on public.pen_records for insert to authenticated with check (public.is_member());
create policy "members read feed movements" on public.feed_movements for select to authenticated using (public.is_member());
create policy "members add feed movements" on public.feed_movements for insert to authenticated with check (public.is_member());

-- Estoque sempre é atualizado pelo livro de movimentações; não editar o saldo diretamente.
create or replace function public.apply_feed_movement()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.movement_type = 'entrada' then
    update public.feed_products
      set stock_kg = stock_kg + new.quantity_kg
      where id = new.product_id;
  else
    update public.feed_products
      set stock_kg = stock_kg - new.quantity_kg
      where id = new.product_id and stock_kg >= new.quantity_kg;
    if not found then
      raise exception 'Estoque insuficiente para registrar esse consumo.';
    end if;
  end if;
  return new;
end $$;

create trigger on_feed_movement_insert
before insert on public.feed_movements
for each row execute function public.apply_feed_movement();

-- Quando um trato é anotado na baia, registra a saída de ração automaticamente.
create or replace function public.record_pen_feed_consumption()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.feed_kg > 0 and new.feed_product_id is not null then
    insert into public.feed_movements(product_id, movement_type, quantity_kg, movement_date, pen_id, pen_record_id, notes, created_by)
    values (new.feed_product_id, 'consumo', new.feed_kg, new.event_date, new.pen_id, new.id,
      'Consumo registrado no caderno de manejo da baia', new.created_by);
  end if;
  return new;
end $$;

create trigger on_pen_record_feed
after insert on public.pen_records
for each row execute function public.record_pen_feed_consumption();
