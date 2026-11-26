-- 0022 — Isolamento dos dados por granja (multi-granja)
--
-- Não apaga dados. Todos os registros existentes passam a pertencer à granja
-- criada aqui ("Fazenda Santo Antônio"). Depois disso:
--  * cada usuário pertence a UMA granja (user_access.farm_id);
--  * toda tabela da granja ganha farm_id + política RESTRITIVA "granja isolada",
--    que se soma às regras de perfil já existentes;
--  * códigos passam a ser únicos POR GRANJA (baia, leitão, sêmen, material,
--    fornecedor) e o brinco da matriz não pode repetir entre matrizes ativas;
--  * um registro não pode apontar para animal/item de outra granja.
-- Durante o preenchimento de farm_id os gatilhos de usuário ficam desligados,
-- para não gerar milhares de linhas falsas na auditoria.

-- 1. Granjas -------------------------------------------------------------------------
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 3),
  legal_name text,
  document text,
  city text,
  state text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from public.farms) then
    insert into public.farms (name) values ('Fazenda Santo Antônio');
  end if;
end $$;

-- 2. Usuário ↔ granja -------------------------------------------------------------------
alter table public.user_access add column if not exists farm_id uuid references public.farms(id) on delete restrict;
update public.user_access set farm_id = (select id from public.farms order by created_at limit 1) where farm_id is null;
-- Membros antigos sem linha de perfil passam a ter uma, na granja existente.
insert into public.user_access (user_id, role, farm_id)
select r.user_id, 'funcionario', (select id from public.farms order by created_at limit 1)
from public.user_roles r
where r.role = 'member' and not exists (select 1 from public.user_access a where a.user_id = r.user_id)
on conflict (user_id) do nothing;

create or replace function public.current_farm_id()
returns uuid language sql stable security definer set search_path = public
as $$ select a.farm_id from public.user_access a where a.user_id = auth.uid() and a.active $$;
revoke all on function public.current_farm_id() from public, anon;
grant execute on function public.current_farm_id() to authenticated;

-- Granja padrão para novos registros: a do usuário; em rotinas do sistema
-- (sem usuário), só quando existe uma única granja — com várias, é obrigatório informar.
create or replace function public.default_farm_id()
returns uuid language sql stable security definer set search_path = public
as $$
  select coalesce(
    public.current_farm_id(),
    (select f.id from public.farms f where (select count(*) from public.farms) = 1)
  )
$$;
grant execute on function public.default_farm_id() to authenticated, service_role;

alter table public.user_access alter column farm_id set default public.default_farm_id();
alter table public.user_access alter column farm_id set not null;
create index if not exists user_access_farm_idx on public.user_access (farm_id);

-- 3. farm_id em todas as tabelas da granja --------------------------------------------------
do $$
declare t text; f uuid := (select id from public.farms order by created_at limit 1);
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('farms', 'profiles', 'user_roles', 'user_access')
  loop
    execute format('alter table public.%I add column if not exists farm_id uuid references public.farms(id) on delete restrict', t);
    execute format('alter table public.%I disable trigger user', t);
    execute format('update public.%I set farm_id = $1 where farm_id is null', t) using f;
    execute format('alter table public.%I enable trigger user', t);
    execute format('alter table public.%I alter column farm_id set default public.default_farm_id()', t);
    if t <> 'audit_logs' then
      execute format('alter table public.%I alter column farm_id set not null', t);
    end if;
    execute format('create index if not exists %I on public.%I (farm_id)', t || '_farm_idx', t);
    if t not in ('audit_logs', 'farm_access_codes') then
      execute format('drop policy if exists "granja isolada" on public.%I', t);
      execute format('create policy "granja isolada" on public.%I as restrictive for all to authenticated using (farm_id = (select public.current_farm_id())) with check (farm_id = (select public.current_farm_id()))', t);
    end if;
  end loop;
end $$;

-- 4. Leituras de equipe, perfis e auditoria limitadas à própria granja ----------------------
drop policy if exists "members read access" on public.user_access;
create policy "members read access" on public.user_access for select to authenticated
  using (user_id = auth.uid() or (public.is_member() and farm_id = (select public.current_farm_id())));

drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or (public.is_member() and exists (
    select 1 from public.user_access a where a.user_id = profiles.id and a.farm_id = (select public.current_farm_id())
  )));

drop policy if exists "audit readers" on public.audit_logs;
create policy "audit readers" on public.audit_logs for select to authenticated
  using (public.can_view_audit() and farm_id = (select public.current_farm_id()));

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  changed text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into changed
    from jsonb_object_keys(new_j) k
    where new_j -> k is distinct from old_j -> k;
    if changed is null or changed <@ array['last_seen_at', 'updated_at'] then return null; end if;
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, table_name, record_id, changed_fields, old_data, new_data, origin, farm_id)
  values (
    auth.uid(),
    (select a.role from public.user_access a where a.user_id = auth.uid()),
    lower(tg_op), tg_table_name,
    coalesce(new_j ->> 'id', old_j ->> 'id', new_j ->> 'user_id', old_j ->> 'user_id'),
    changed, old_j, new_j,
    case when pg_trigger_depth() > 1 then 'automatico' when auth.uid() is null then 'sistema' else 'app' end,
    coalesce((coalesce(new_j, old_j) ->> 'farm_id')::uuid, public.current_farm_id(), case when tg_table_name = 'farms' then (coalesce(new_j, old_j) ->> 'id')::uuid end)
  );
  return null;
end $$;

-- Equipe: só a própria granja; perfil só pode ser alterado entre usuários da mesma granja.
create or replace function public.farm_users()
returns table (user_id uuid, display_name text, email text, role text, active boolean, last_seen_at timestamptz, joined_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.user_id, p.display_name, u.email::text, coalesce(a.role, 'funcionario'), coalesce(a.active, true), a.last_seen_at, p.created_at
  from public.user_roles r
  join auth.users u on u.id = r.user_id
  left join public.profiles p on p.id = r.user_id
  join public.user_access a on a.user_id = r.user_id
  where r.role = 'member' and public.can_view_audit() and a.farm_id = public.current_farm_id()
  order by p.created_at nulls last
$$;

create or replace function public.set_user_access(p_user_id uuid, p_role text, p_active boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare my_farm uuid := public.current_farm_id();
begin
  if not public.is_farm_admin() then raise exception 'Apenas administradores podem alterar perfis.'; end if;
  if p_role not in ('admin', 'gerente', 'veterinario', 'funcionario', 'consulta') then raise exception 'Perfil inválido.'; end if;
  if not public.has_role(p_user_id, 'member') or not exists (select 1 from public.user_access where user_id = p_user_id and farm_id = my_farm) then
    raise exception 'Usuário não pertence à granja.';
  end if;
  update public.user_access set role = p_role, active = coalesce(p_active, true), updated_at = now(), updated_by = auth.uid()
    where user_id = p_user_id and farm_id = my_farm;
  if not exists (select 1 from public.user_access where farm_id = my_farm and role = 'admin' and active) then
    raise exception 'A granja precisa manter pelo menos um administrador ativo.';
  end if;
end $$;

-- 5. Convites por granja e entrada de novos usuários ------------------------------------------
create or replace function public.create_farm_access_code(p_code text)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare normalized text := upper(regexp_replace(trim(coalesce(p_code,'')), '[^A-Z0-9]', '', 'g'));
begin
  if auth.uid() is null or not public.is_farm_admin() then raise exception 'Apenas administradores podem gerar código.'; end if;
  if length(normalized) < 8 or length(normalized) > 20 then raise exception 'Código inválido.'; end if;
  update public.farm_access_codes set active = false where active and farm_id = public.current_farm_id();
  insert into public.farm_access_codes(code_hash, created_by, farm_id)
  values (encode(digest(convert_to(normalized, 'UTF8'), 'sha256'), 'hex'), auth.uid(), public.current_farm_id());
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions
as $$
declare
  supplied_code text := upper(regexp_replace(trim(coalesce(new.raw_user_meta_data->>'farm_code','')), '[^A-Z0-9]', '', 'g'));
  invited_farm uuid;
  founders int;
  first_farm uuid := (select id from public.farms order by created_at limit 1);
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  if length(supplied_code) >= 8 then
    select farm_id into invited_farm from public.farm_access_codes
      where active = true and code_hash = encode(digest(convert_to(supplied_code, 'UTF8'), 'sha256'), 'hex') limit 1;
  end if;
  select count(*) into founders from public.user_roles where role = 'member';
  if invited_farm is not null or (founders < 2 and first_farm is not null) then
    insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict (user_id, role) do nothing;
    insert into public.user_access (user_id, role, farm_id)
    values (new.id, case when invited_farm is null then 'admin' else 'funcionario' end, coalesce(invited_farm, first_farm))
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Nova granja com seu administrador: só pelo servidor (service_role), nunca pelo app.
create or replace function public.create_farm_with_owner(p_name text, p_owner uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare fid uuid;
begin
  if exists (select 1 from public.user_access where user_id = p_owner and farm_id is not null and active) then
    raise exception 'Este usuário já pertence a uma granja.';
  end if;
  insert into public.farms (name) values (p_name) returning id into fid;
  insert into public.user_roles (user_id, role) values (p_owner, 'member') on conflict do nothing;
  insert into public.user_access (user_id, role, farm_id) values (p_owner, 'admin', fid)
    on conflict (user_id) do update set role = 'admin', farm_id = fid, active = true;
  return fid;
end $$;
revoke all on function public.create_farm_with_owner(text, uuid) from public, anon, authenticated;
grant execute on function public.create_farm_with_owner(text, uuid) to service_role;

-- 6. Parâmetros por granja -----------------------------------------------------------------------
alter table public.farm_settings drop constraint if exists farm_settings_pkey;
alter table public.farm_settings drop constraint if exists farm_settings_id_check;
alter table public.farm_settings alter column id drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.farm_settings'::regclass and contype = 'p') then
    alter table public.farm_settings add primary key (farm_id);
  end if;
end $$;
insert into public.farm_settings (farm_id) select id from public.farms f
  where not exists (select 1 from public.farm_settings s where s.farm_id = f.id);

create or replace function public.init_farm()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.farm_settings (farm_id) values (new.id) on conflict do nothing; return new; end $$;
drop trigger if exists init_farm on public.farms;
create trigger init_farm after insert on public.farms for each row execute function public.init_farm();

-- 7. Unicidade por granja ---------------------------------------------------------------------------
alter table public.farm_pens drop constraint if exists farm_pens_code_key;
create unique index if not exists farm_pens_farm_code_unique on public.farm_pens (farm_id, code);
alter table public.piglet_identifications drop constraint if exists piglet_identifications_australian_number_key;
create unique index if not exists piglets_farm_australian_unique on public.piglet_identifications (farm_id, australian_number);
drop index if exists public.semen_batches_code_unique;
create unique index if not exists semen_batches_farm_code_unique on public.semen_batches (farm_id, lower(trim(code)));
drop index if exists public.stock_items_name_unique;
create unique index if not exists stock_items_farm_name_unique on public.stock_items (farm_id, lower(trim(name)), unit);
drop index if exists public.suppliers_name_unique;
create unique index if not exists suppliers_farm_name_unique on public.suppliers (farm_id, lower(trim(name)));

-- Brinco/código: sem repetição entre registros ativos da mesma granja. Duplicatas antigas
-- não impedem a migration (aparecem na conferência de dados); novas são recusadas.
create or replace function public.guard_unique_identifier()
returns trigger language plpgsql security definer set search_path = public
as $$
declare col text := tg_argv[0]; val text; dup boolean;
begin
  val := lower(trim(to_jsonb(new) ->> col));
  if val is null or val = '' then return new; end if;
  if tg_table_name = 'sows' then
    if new.archived_at is not null then return new; end if;
    select exists (select 1 from public.sows s where s.farm_id = new.farm_id and s.id <> new.id and s.archived_at is null and lower(trim(s.ear_tag)) = val) into dup;
  else
    execute format('select exists (select 1 from public.%I x where x.farm_id = $1 and x.id <> $2 and lower(trim(x.%I)) = $3)', tg_table_name, col)
      into dup using new.farm_id, new.id, val;
  end if;
  if dup then
    raise exception 'Já existe registro ativo com a identificação "%" nesta granja.', to_jsonb(new) ->> col using errcode = 'unique_violation';
  end if;
  return new;
end $$;
drop trigger if exists guard_unique_ear_tag on public.sows;
create trigger guard_unique_ear_tag before insert or update of ear_tag, archived_at on public.sows
  for each row execute function public.guard_unique_identifier('ear_tag');
drop trigger if exists guard_unique_boar_code on public.boars;
create trigger guard_unique_boar_code before insert or update of code on public.boars
  for each row execute function public.guard_unique_identifier('code');

-- 8. Relações sempre dentro da mesma granja --------------------------------------------------------
create or replace function public.guard_same_farm()
returns trigger language plpgsql security definer set search_path = public
as $$
declare parent text := tg_argv[0]; col text := tg_argv[1]; ref uuid; parent_farm uuid;
begin
  ref := (to_jsonb(new) ->> col)::uuid;
  if ref is null then return new; end if;
  execute format('select farm_id from public.%I where id = $1', parent) into parent_farm using ref;
  if parent_farm is not null and parent_farm <> new.farm_id then
    raise exception 'Registro de outra granja não pode ser vinculado (%).', col using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('breedings', 'sow_id', 'sows'), ('breedings', 'boar_id', 'boars'), ('breedings', 'semen_batch_id', 'semen_batches'),
    ('litters', 'sow_id', 'sows'), ('litters', 'breeding_id', 'breedings'), ('litters', 'pen_id', 'farm_pens'),
    ('litter_events', 'litter_id', 'litters'), ('litter_events', 'related_litter_id', 'litters'), ('litter_events', 'piglet_id', 'piglet_identifications'),
    ('piglet_identifications', 'litter_id', 'litters'), ('sow_events', 'sow_id', 'sows'), ('pregnancy_diagnoses', 'sow_id', 'sows'),
    ('pregnancy_diagnoses', 'breeding_id', 'breedings'), ('gestation_events', 'sow_id', 'sows'), ('sows', 'pen_id', 'farm_pens'),
    ('heat_detections', 'sow_id', 'sows'), ('sow_condition_records', 'sow_id', 'sows'), ('vaccination_records', 'sow_id', 'sows'),
    ('medication_records', 'sow_id', 'sows'), ('stock_movements', 'item_id', 'stock_items'), ('farm_medication_lots', 'medication_id', 'farm_medications'),
    ('farm_medication_movements', 'lot_id', 'farm_medication_lots'), ('pen_records', 'pen_id', 'farm_pens'), ('tasks', 'sow_id', 'sows'),
    ('finance_entries', 'batch_id', 'production_batches'), ('batch_events', 'batch_id', 'production_batches'), ('batch_weights', 'batch_id', 'production_batches')
  ) as v(child, col, parent)
  loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = r.child and column_name = r.col) then
      execute format('drop trigger if exists %I on public.%I', 'same_farm_' || r.col, r.child);
      execute format('create trigger %I before insert or update of %I, farm_id on public.%I for each row execute function public.guard_same_farm(%L, %L)', 'same_farm_' || r.col, r.col, r.child, r.parent, r.col);
    end if;
  end loop;
end $$;

-- 9. Permissões da tabela de granjas ----------------------------------------------------------------
alter table public.farms enable row level security;
revoke all on table public.farms from public, anon, authenticated;
grant select, update on table public.farms to authenticated;
grant all on table public.farms to service_role;
drop policy if exists "propria granja" on public.farms;
create policy "propria granja" on public.farms for select to authenticated using (id = (select public.current_farm_id()));
drop policy if exists "admin altera granja" on public.farms;
create policy "admin altera granja" on public.farms for update to authenticated
  using (id = (select public.current_farm_id()) and public.is_farm_admin()) with check (id = (select public.current_farm_id()));
drop policy if exists "perfil insere" on public.farms;
drop policy if exists "perfil altera" on public.farms;
drop policy if exists "perfil exclui" on public.farms;
create policy "perfil insere" on public.farms as restrictive for insert to authenticated with check (false);
create policy "perfil altera" on public.farms as restrictive for update to authenticated using (public.can_write()) with check (public.can_write());
create policy "perfil exclui" on public.farms as restrictive for delete to authenticated using (false);
drop trigger if exists audit_log on public.farms;
create trigger audit_log after insert or update or delete on public.farms for each row execute function public.write_audit_log();

-- 10. Fotos das matrizes: só da própria granja (o caminho começa com o id da matriz) ----------------
drop policy if exists "membros veem fotos de matrizes" on storage.objects;
create policy "membros veem fotos de matrizes" on storage.objects for select to authenticated
  using (bucket_id = 'sow-photos' and public.is_member() and exists (select 1 from public.sows s where s.id::text = split_part(name, '/', 1)));
