-- 0021 — Cio (início/fim), lotes de sêmen, condição corporal e planos de alimentação
--
-- Não destrutiva: só cria tabelas e adiciona uma coluna opcional em breedings.
--  * Doses de sêmen: o saldo do lote só muda pela cobertura vinculada; usar
--    mais doses do que o lote tem é recusado.
--  * Planos de alimentação não trazem valores prontos e só são "vigentes"
--    depois de validados por responsável técnico (nome e registro).

-- 1. Observações de cio ------------------------------------------------------------
create table if not exists public.heat_detections (
  id uuid primary key default gen_random_uuid(),
  sow_id uuid not null references public.sows(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  intensity text check (intensity is null or intensity in ('fraco', 'moderado', 'forte')),
  signs text[] not null default '{}',
  detected_by text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint heat_detections_end_check check (ended_at is null or ended_at >= started_at),
  constraint heat_detections_future_check check (started_at <= now() + interval '1 hour')
);
create index if not exists heat_detections_sow_idx on public.heat_detections (sow_id, started_at desc);

-- 2. Lotes de sêmen -------------------------------------------------------------------
create table if not exists public.semen_batches (
  id uuid primary key default gen_random_uuid(),
  code text not null check (length(trim(code)) >= 1),
  boar_id uuid references public.boars(id) on delete set null,
  boar_description text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  collection_date date,
  received_date date not null default current_date,
  expiry_date date,
  doses_received int not null check (doses_received > 0),
  doses_available int not null,
  storage text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint semen_doses_check check (doses_available >= 0 and doses_available <= doses_received),
  constraint semen_dates_check check (expiry_date is null or collection_date is null or expiry_date >= collection_date)
);
create unique index if not exists semen_batches_code_unique on public.semen_batches (lower(trim(code)));

create or replace function public.init_semen_batch()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' then new.doses_available := new.doses_received; end if;
  return new;
end $$;
drop trigger if exists init_semen_batch on public.semen_batches;
create trigger init_semen_batch before insert on public.semen_batches
  for each row execute function public.init_semen_batch();

-- Saldo de doses só muda pelas coberturas (não por edição direta).
create or replace function public.guard_semen_balance()
returns trigger language plpgsql set search_path = public
as $$
begin
  if (new.doses_available is distinct from old.doses_available or new.doses_received is distinct from old.doses_received)
     and pg_trigger_depth() = 1 then
    raise exception 'As doses do lote mudam somente pelas coberturas registradas.';
  end if;
  return new;
end $$;
drop trigger if exists guard_semen_balance on public.semen_batches;
create trigger guard_semen_balance before update on public.semen_batches
  for each row execute function public.guard_semen_balance();

alter table public.breedings
  add column if not exists semen_batch_id uuid references public.semen_batches(id) on delete set null,
  add column if not exists semen_doses_used int check (semen_doses_used is null or semen_doses_used between 1 and 10);

create or replace function public.consume_semen_doses()
returns trigger language plpgsql security definer set search_path = public
as $$
declare used_old int := 0; used_new int := 0; left_doses int; exp date;
begin
  if tg_op = 'UPDATE' and old.semen_batch_id is not null then
    used_old := coalesce(old.semen_doses_used, 1);
    update public.semen_batches set doses_available = doses_available + used_old where id = old.semen_batch_id;
  end if;
  if new.semen_batch_id is not null then
    used_new := coalesce(new.semen_doses_used, 1);
    select doses_available, expiry_date into left_doses, exp from public.semen_batches where id = new.semen_batch_id for update;
    if exp is not null and new.breeding_date > exp then
      raise exception 'Lote de sêmen vencido em % (cobertura em %).', exp, new.breeding_date;
    end if;
    if left_doses < used_new then
      raise exception 'Lote de sêmen sem doses suficientes: restam %.', left_doses;
    end if;
    update public.semen_batches set doses_available = doses_available - used_new where id = new.semen_batch_id;
  end if;
  return new;
end $$;
drop trigger if exists consume_semen_doses on public.breedings;
create trigger consume_semen_doses before insert or update of semen_batch_id, semen_doses_used on public.breedings
  for each row execute function public.consume_semen_doses();

-- 3. Condição corporal e alimentação da matriz -------------------------------------
create table if not exists public.sow_condition_records (
  id uuid primary key default gen_random_uuid(),
  sow_id uuid not null references public.sows(id) on delete cascade,
  record_date date not null default current_date,
  body_condition_score numeric(2,1) check (body_condition_score is null or (body_condition_score between 1 and 5 and body_condition_score * 2 = round(body_condition_score * 2))),
  backfat_mm numeric(4,1) check (backfat_mm is null or (backfat_mm > 0 and backfat_mm < 60)),
  feed_product_id uuid references public.feed_products(id) on delete set null,
  feed_kg_day numeric(5,2) check (feed_kg_day is null or (feed_kg_day > 0 and feed_kg_day < 20)),
  responsible text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint sow_condition_something_check check (body_condition_score is not null or backfat_mm is not null or feed_kg_day is not null or length(trim(coalesce(notes, ''))) > 0),
  constraint sow_condition_future_check check (record_date <= current_date)
);
create index if not exists sow_condition_sow_idx on public.sow_condition_records (sow_id, record_date desc);

-- 4. Planos de alimentação por fase (validados) -------------------------------------
create table if not exists public.feed_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 3),
  category text not null check (category in ('gestacao', 'lactacao', 'pre_inicial', 'inicial', 'crescimento', 'terminacao', 'reproducao', 'outra')),
  day_from int check (day_from is null or day_from >= 0),
  day_to int check (day_to is null or day_to >= 0),
  feed_product_id uuid references public.feed_products(id) on delete set null,
  kg_per_animal_day numeric(5,2) check (kg_per_animal_day is null or (kg_per_animal_day > 0 and kg_per_animal_day < 20)),
  notes text,
  validated_by_name text,
  validated_at date,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feed_plans_days_check check (day_from is null or day_to is null or day_to >= day_from),
  constraint feed_plans_validation_check check (
    (validated_at is null and validated_by_name is null) or (validated_at is not null and length(trim(coalesce(validated_by_name, ''))) >= 3)
  )
);

create or replace function public.guard_feed_plan()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (new.name, new.category, new.day_from, new.day_to, new.feed_product_id, new.kg_per_animal_day)
       is distinct from (old.name, old.category, old.day_from, old.day_to, old.feed_product_id, old.kg_per_animal_day)
     and new.validated_at is not distinct from old.validated_at then
    new.validated_at := null;
    new.validated_by_name := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_feed_plan on public.feed_plans;
create trigger guard_feed_plan before update on public.feed_plans
  for each row execute function public.guard_feed_plan();

-- 5. Permissões e auditoria -------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['heat_detections', 'semen_batches', 'sow_condition_records', 'feed_plans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('drop policy if exists "membros leem" on public.%I', t);
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('drop policy if exists "membros gravam" on public.%I', t);
    execute format('create policy "membros gravam" on public.%I for insert to authenticated with check (public.is_member())', t);
    execute format('drop policy if exists "membros alteram" on public.%I', t);
    execute format('create policy "membros alteram" on public.%I for update to authenticated using (public.is_member()) with check (public.is_member())', t);
    execute format('drop policy if exists "perfil insere" on public.%I', t);
    execute format('drop policy if exists "perfil altera" on public.%I', t);
    execute format('drop policy if exists "perfil exclui" on public.%I', t);
    execute format('create policy "perfil insere" on public.%I as restrictive for insert to authenticated with check (public.can_write())', t);
    execute format('create policy "perfil altera" on public.%I as restrictive for update to authenticated using (public.can_write()) with check (public.can_write())', t);
    execute format('create policy "perfil exclui" on public.%I as restrictive for delete to authenticated using (public.can_delete())', t);
    execute format('drop trigger if exists audit_log on public.%I', t);
    execute format('create trigger audit_log after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t);
  end loop;
end $$;
-- Planos de alimentação: criar/alterar só gestão ou veterinário (responsável técnico).
drop policy if exists "tecnico gerencia planos" on public.feed_plans;
create policy "tecnico gerencia planos" on public.feed_plans as restrictive for insert to authenticated with check (public.can_manage_health());
drop policy if exists "tecnico altera planos" on public.feed_plans;
create policy "tecnico altera planos" on public.feed_plans as restrictive for update to authenticated using (public.can_manage_health()) with check (public.can_manage_health());
