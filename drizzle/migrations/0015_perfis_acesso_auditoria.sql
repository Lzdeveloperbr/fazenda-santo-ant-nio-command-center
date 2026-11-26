-- 0015 — Perfis de acesso e trilha de auditoria
--
-- Não destrutiva: não apaga tabelas, colunas nem dados.
--  * Cria public.user_access (perfil, ativo, último acesso) ao lado de
--    user_roles. O papel 'member' continua sendo a entrada na granja.
--  * is_member() passa a recusar usuários desativados, o que vale para
--    todas as políticas existentes sem reescrevê-las.
--  * Políticas RESTRITIVAS exigem perfil com escrita para inserir/alterar e
--    perfil administrador/gerente para excluir, em todas as tabelas da granja.
--  * public.audit_logs registra inserções, alterações e exclusões com valor
--    anterior e novo. Clientes só podem ler (administrador/gerente).
--
-- Perfis existentes: os dois primeiros membros (por data de cadastro) viram
-- 'admin'; os demais membros viram 'funcionario'. Ajuste na tela Usuários.

-- 1. Perfis -----------------------------------------------------------------
create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'funcionario'
    check (role in ('admin', 'gerente', 'veterinario', 'funcionario', 'consulta')),
  active boolean not null default true,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.user_access enable row level security;
revoke all on table public.user_access from public, anon, authenticated;
grant select on table public.user_access to authenticated;
grant all on table public.user_access to service_role;

insert into public.user_access (user_id, role)
select r.user_id,
       case when row_number() over (order by p.created_at nulls last, r.user_id) <= 2
            then 'admin' else 'funcionario' end
from public.user_roles r
left join public.profiles p on p.id = r.user_id
where r.role = 'member'
on conflict (user_id) do nothing;

-- Membro ativo: tem o papel 'member' e não foi desativado.
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.has_role(auth.uid(), 'member')
     and not exists (
       select 1 from public.user_access a
       where a.user_id = auth.uid() and a.active = false
     )
$$;

-- Perfil efetivo do usuário atual (null quando não é membro ativo).
create or replace function public.access_role()
returns text language sql stable security definer set search_path = public
as $$
  select case when public.is_member()
    then coalesce((select a.role from public.user_access a where a.user_id = auth.uid()), 'funcionario')
  end
$$;

create or replace function public.can_write()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.access_role() <> 'consulta', false) $$;

create or replace function public.can_delete()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.access_role() in ('admin', 'gerente'), false) $$;

create or replace function public.is_farm_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.access_role() = 'admin', false) $$;

create or replace function public.can_view_audit()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.access_role() in ('admin', 'gerente'), false) $$;

revoke all on function public.access_role(), public.can_write(), public.can_delete(),
  public.is_farm_admin(), public.can_view_audit() from public, anon;
grant execute on function public.access_role(), public.can_write(), public.can_delete(),
  public.is_farm_admin(), public.can_view_audit() to authenticated;

drop policy if exists "members read access" on public.user_access;
create policy "members read access" on public.user_access
  for select to authenticated using (public.is_member() or user_id = auth.uid());

-- Alteração de perfil: somente administrador, sempre mantendo um admin ativo.
create or replace function public.set_user_access(p_user_id uuid, p_role text, p_active boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_farm_admin() then
    raise exception 'Apenas administradores podem alterar perfis.';
  end if;
  if p_role not in ('admin', 'gerente', 'veterinario', 'funcionario', 'consulta') then
    raise exception 'Perfil inválido.';
  end if;
  if not public.has_role(p_user_id, 'member') then
    raise exception 'Usuário não pertence à granja.';
  end if;
  insert into public.user_access (user_id, role, active, updated_at, updated_by)
  values (p_user_id, p_role, coalesce(p_active, true), now(), auth.uid())
  on conflict (user_id) do update
    set role = excluded.role, active = excluded.active,
        updated_at = now(), updated_by = auth.uid();
  if not exists (select 1 from public.user_access where role = 'admin' and active) then
    raise exception 'A granja precisa manter pelo menos um administrador ativo.';
  end if;
end $$;
revoke all on function public.set_user_access(uuid, text, boolean) from public, anon;
grant execute on function public.set_user_access(uuid, text, boolean) to authenticated;

-- Registro de último acesso do próprio usuário.
create or replace function public.touch_last_seen()
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_member() then return; end if;
  insert into public.user_access (user_id, last_seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = now();
end $$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- Lista da equipe (com e-mail) para administrador e gerente.
create or replace function public.farm_users()
returns table (user_id uuid, display_name text, email text, role text, active boolean,
               last_seen_at timestamptz, joined_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.user_id, p.display_name, u.email::text,
         coalesce(a.role, 'funcionario'), coalesce(a.active, true),
         a.last_seen_at, p.created_at
  from public.user_roles r
  join auth.users u on u.id = r.user_id
  left join public.profiles p on p.id = r.user_id
  left join public.user_access a on a.user_id = r.user_id
  where r.role = 'member' and public.can_view_audit()
  order by p.created_at nulls last
$$;
revoke all on function public.farm_users() from public, anon;
grant execute on function public.farm_users() to authenticated;

-- Novos cadastros: mesmas regras de entrada da 0008 + perfil inicial.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  supplied_code text := upper(regexp_replace(trim(coalesce(new.raw_user_meta_data->>'farm_code','')), '[^A-Z0-9]', '', 'g'));
  invited boolean := false;
  founders int;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));

  if length(supplied_code) >= 8 then
    select exists (
      select 1 from public.farm_access_codes
      where active = true
        and code_hash = encode(digest(convert_to(supplied_code, 'UTF8'), 'sha256'), 'hex')
    ) into invited;
  end if;

  select count(*) into founders from public.user_roles where role = 'member';
  if invited or founders < 2 then
    insert into public.user_roles (user_id, role) values (new.id, 'member')
    on conflict (user_id, role) do nothing;
    insert into public.user_access (user_id, role)
    values (new.id, case when founders < 2 and not invited then 'admin' else 'funcionario' end)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Funções privilegiadas existentes passam a respeitar o perfil.
create or replace function public.create_farm_access_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare normalized text := upper(regexp_replace(trim(coalesce(p_code,'')), '[^A-Z0-9]', '', 'g'));
begin
  if auth.uid() is null or not public.is_farm_admin() then
    raise exception 'Apenas administradores podem gerar código.';
  end if;
  if length(normalized) < 8 or length(normalized) > 20 then
    raise exception 'Código inválido.';
  end if;
  update public.farm_access_codes set active = false where active;
  insert into public.farm_access_codes(code_hash, created_by)
  values (encode(digest(convert_to(normalized, 'UTF8'), 'sha256'), 'hex'), auth.uid());
end;
$$;

create or replace function public.delete_sow(p_sow_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l_ids uuid[];
begin
  if not public.can_delete() then
    raise exception 'Sem permissão: apenas administrador ou gerente pode excluir matrizes.';
  end if;
  select coalesce(array_agg(id), '{}') into l_ids from public.litters where sow_id = p_sow_id;
  delete from public.tasks where sow_id = p_sow_id or litter_id = any(l_ids);
  delete from public.medication_records where sow_id = p_sow_id or litter_id = any(l_ids);
  delete from public.vaccination_records where sow_id = p_sow_id or litter_id = any(l_ids);
  delete from public.health_records where sow_id = p_sow_id or litter_id = any(l_ids);
  delete from public.inventory_checks where sow_id = p_sow_id;
  delete from public.piglet_identifications where litter_id = any(l_ids);
  delete from public.weaning_feed_schedules where litter_id = any(l_ids);
  delete from public.litter_events where litter_id = any(l_ids);
  delete from public.litters where id = any(l_ids);
  delete from public.gestation_events where sow_id = p_sow_id;
  delete from public.pregnancy_diagnoses where sow_id = p_sow_id;
  delete from public.sow_events where sow_id = p_sow_id;
  delete from public.breedings where sow_id = p_sow_id;
  delete from public.sows where id = p_sow_id;
end $$;

-- 2. Trilha de auditoria ----------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_role text,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id text,
  changed_fields text[],
  old_data jsonb,
  new_data jsonb,
  origin text not null check (origin in ('app', 'automatico', 'sistema'))
);
create index if not exists audit_logs_occurred_idx on public.audit_logs (occurred_at desc);
create index if not exists audit_logs_record_idx on public.audit_logs (table_name, record_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, occurred_at desc);
alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from public, anon, authenticated, service_role;
grant select on table public.audit_logs to authenticated, service_role;
drop policy if exists "audit readers" on public.audit_logs;
create policy "audit readers" on public.audit_logs
  for select to authenticated using (public.can_view_audit());

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
    -- Sem mudança real, ou só carimbo de acesso/horário: não polui a trilha.
    if changed is null or changed <@ array['last_seen_at', 'updated_at'] then return null; end if;
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, table_name, record_id,
                                 changed_fields, old_data, new_data, origin)
  values (
    auth.uid(),
    (select a.role from public.user_access a where a.user_id = auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(new_j ->> 'id', old_j ->> 'id', new_j ->> 'user_id', old_j ->> 'user_id'),
    changed,
    old_j,
    new_j,
    case when pg_trigger_depth() > 1 then 'automatico'
         when auth.uid() is null then 'sistema'
         else 'app' end
  );
  return null;
end $$;
revoke all on function public.write_audit_log() from public, anon, authenticated;

-- 3. Aplicar regras em todas as tabelas da granja ---------------------------
do $$
declare t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname not in ('audit_logs', 'farm_access_codes', 'user_roles', 'user_access', 'profiles')
  loop
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

drop trigger if exists audit_log on public.user_access;
create trigger audit_log after insert or update or delete on public.user_access
  for each row execute function public.write_audit_log();
drop trigger if exists audit_log on public.user_roles;
create trigger audit_log after insert or update or delete on public.user_roles
  for each row execute function public.write_audit_log();

-- Evidências veterinárias seguem a mesma regra de escrita.
drop policy if exists "perfil escreve evidencias" on storage.objects;
create policy "perfil escreve evidencias" on storage.objects as restrictive
  for insert to authenticated
  with check (bucket_id <> 'veterinary-evidence' or public.can_write());
drop policy if exists "perfil altera evidencias" on storage.objects;
create policy "perfil altera evidencias" on storage.objects as restrictive
  for update to authenticated
  using (bucket_id <> 'veterinary-evidence' or public.can_write())
  with check (bucket_id <> 'veterinary-evidence' or public.can_write());
