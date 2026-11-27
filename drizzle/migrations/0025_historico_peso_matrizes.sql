-- 0025: histórico de pesagens das matrizes.
-- Antes só existia o último peso em sows.weight_kg/weight_date. Agora cada pesagem fica
-- guardada em sow_weighings e o último peso da matriz é atualizado por gatilho.
-- Não apaga nem altera dados: o peso atual de cada matriz vira a primeira pesagem do histórico.

create table if not exists public.sow_weighings (
  id uuid primary key default gen_random_uuid(),
  sow_id uuid not null references public.sows(id) on delete cascade,
  weighed_on date not null default current_date,
  weight_kg numeric(6, 2) not null check (weight_kg > 20 and weight_kg < 500),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  farm_id uuid not null default public.default_farm_id() references public.farms(id) on delete restrict,
  unique (sow_id, weighed_on)
);
create index if not exists sow_weighings_sow_idx on public.sow_weighings (sow_id, weighed_on desc);
create index if not exists sow_weighings_farm_idx on public.sow_weighings (farm_id);

create or replace function public.guard_sow_weighing()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.weighed_on > current_date then raise exception 'A data da pesagem não pode ser futura.'; end if;
  return new;
end $$;
drop trigger if exists guard_sow_weighing on public.sow_weighings;
create trigger guard_sow_weighing before insert or update on public.sow_weighings for each row execute function public.guard_sow_weighing();

-- Último peso da matriz = pesagem mais recente (ou nada, se todas forem apagadas).
create or replace function public.sync_sow_last_weight()
returns trigger language plpgsql set search_path = public
as $$
declare v_sow uuid := coalesce(new.sow_id, old.sow_id); w record;
begin
  select weight_kg, weighed_on into w from public.sow_weighings where sow_id = v_sow order by weighed_on desc, created_at desc limit 1;
  update public.sows set weight_kg = w.weight_kg, weight_date = w.weighed_on
   where id = v_sow and (weight_kg is distinct from w.weight_kg or weight_date is distinct from w.weighed_on);
  return null;
end $$;
drop trigger if exists sync_sow_last_weight on public.sow_weighings;
create trigger sync_sow_last_weight after insert or update or delete on public.sow_weighings for each row execute function public.sync_sow_last_weight();

-- Peso editado direto na ficha também entra no histórico.
create or replace function public.record_sow_weight_change()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.weight_kg is not null and new.weight_kg > 20 and new.weight_kg < 500 then
    insert into public.sow_weighings (sow_id, weighed_on, weight_kg, farm_id)
    values (new.id, least(coalesce(new.weight_date, current_date), current_date), new.weight_kg, new.farm_id)
    on conflict (sow_id, weighed_on) do update set weight_kg = excluded.weight_kg
      where public.sow_weighings.weight_kg is distinct from excluded.weight_kg;
  end if;
  return null;
end $$;
drop trigger if exists record_sow_weight_change on public.sows;
create trigger record_sow_weight_change after insert or update of weight_kg, weight_date on public.sows
  for each row when (new.weight_kg is not null) execute function public.record_sow_weight_change();

-- Segurança: mesma granja, perfis, auditoria.
alter table public.sow_weighings enable row level security;
revoke all on table public.sow_weighings from public, anon, authenticated;
grant select, insert, update, delete on table public.sow_weighings to authenticated;
grant all on table public.sow_weighings to service_role;
drop policy if exists "granja isolada" on public.sow_weighings;
create policy "granja isolada" on public.sow_weighings as restrictive for all to authenticated
  using (farm_id = (select public.current_farm_id())) with check (farm_id = (select public.current_farm_id()));
drop policy if exists "perfil insere" on public.sow_weighings;
create policy "perfil insere" on public.sow_weighings as restrictive for insert to authenticated with check (public.can_write());
drop policy if exists "perfil altera" on public.sow_weighings;
create policy "perfil altera" on public.sow_weighings as restrictive for update to authenticated using (public.can_write()) with check (public.can_write());
drop policy if exists "perfil exclui" on public.sow_weighings;
create policy "perfil exclui" on public.sow_weighings as restrictive for delete to authenticated using (public.can_delete());
drop policy if exists "membros leem" on public.sow_weighings;
create policy "membros leem" on public.sow_weighings for select to authenticated using (public.is_member());
drop policy if exists "membros gravam" on public.sow_weighings;
create policy "membros gravam" on public.sow_weighings for insert to authenticated with check (public.is_member());
drop policy if exists "membros alteram" on public.sow_weighings;
create policy "membros alteram" on public.sow_weighings for update to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists "membros excluem" on public.sow_weighings;
create policy "membros excluem" on public.sow_weighings for delete to authenticated using (public.is_member());
drop trigger if exists same_farm_sow_id on public.sow_weighings;
create trigger same_farm_sow_id before insert or update of sow_id, farm_id on public.sow_weighings
  for each row execute function public.guard_same_farm('sows', 'sow_id');
drop trigger if exists audit_log on public.sow_weighings;
create trigger audit_log after insert or update or delete on public.sow_weighings for each row execute function public.write_audit_log();

-- Peso atual vira a primeira pesagem (sem gatilhos de usuário, para não reescrever as matrizes nem a auditoria).
alter table public.sow_weighings disable trigger user;
insert into public.sow_weighings (sow_id, weighed_on, weight_kg, farm_id, created_by)
select s.id, least(coalesce(s.weight_date, s.created_at::date), current_date), s.weight_kg, s.farm_id, null
from public.sows s
where s.weight_kg is not null and s.weight_kg > 20 and s.weight_kg < 500
on conflict (sow_id, weighed_on) do nothing;
alter table public.sow_weighings enable trigger user;
