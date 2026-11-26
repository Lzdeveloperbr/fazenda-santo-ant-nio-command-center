-- 0017 — Maternidade detalhada, leitões individuais, desmame e instalações
--
-- Não destrutiva: só adiciona colunas opcionais, gatilhos e uma função.
-- O livro litter_events continua sendo a fonte da verdade dos saldos: os
-- novos campos (motivo, peso, sexo, destino…) só detalham os eventos.

-- 1. Parto ------------------------------------------------------------------------
alter table public.litters
  add column if not exists runts int,
  add column if not exists pen_id uuid references public.farm_pens(id) on delete set null;
alter table public.litters drop constraint if exists litters_runts_check;
alter table public.litters add constraint litters_runts_check
  check (runts is null or (runts >= 0 and runts <= born_alive));
create index if not exists litters_pen_idx on public.litters (pen_id);

-- 2. Detalhes dos eventos da leitegada --------------------------------------------
alter table public.litter_events
  add column if not exists cause text,
  add column if not exists piglet_id uuid references public.piglet_identifications(id) on delete set null,
  add column if not exists weight_kg numeric(6,2),
  add column if not exists responsible text,
  add column if not exists related_litter_id uuid references public.litters(id) on delete set null,
  add column if not exists males int,
  add column if not exists females int,
  add column if not exists destination text,
  add column if not exists destination_pen_id uuid references public.farm_pens(id) on delete set null;
alter table public.litter_events drop constraint if exists litter_events_sex_split_check;
alter table public.litter_events add constraint litter_events_sex_split_check
  check ((males is null or males >= 0) and (females is null or females >= 0)
         and coalesce(males, 0) + coalesce(females, 0) <= greatest(quantity, 0));
alter table public.litter_events drop constraint if exists litter_events_weight_check;
alter table public.litter_events add constraint litter_events_weight_check
  check (weight_kg is null or (weight_kg > 0 and weight_kg < 60));
alter table public.litter_events drop constraint if exists litter_events_related_check;
alter table public.litter_events add constraint litter_events_related_check
  check (related_litter_id is null or related_litter_id <> litter_id);
create index if not exists litter_events_type_date_idx on public.litter_events (event_type, event_date desc);
create index if not exists litter_events_piglet_idx on public.litter_events (piglet_id);

-- Adoção / transferência entre leitegadas em uma única operação (saída + entrada).
create or replace function public.transfer_piglets(
  p_from uuid, p_to uuid, p_quantity int, p_date date, p_reason text, p_responsible text
) returns void language plpgsql security invoker set search_path = public
as $$
begin
  if p_from = p_to then raise exception 'Escolha leitegadas diferentes.'; end if;
  if not exists (select 1 from public.litters where id = p_to and status = 'maternidade') then
    raise exception 'A leitegada receptora precisa estar em maternidade.';
  end if;
  insert into public.litter_events (litter_id, event_type, quantity, event_date, cause, responsible, related_litter_id, note)
  values (p_from, 'transferencia_saida', p_quantity, p_date, nullif(trim(p_reason), ''), nullif(trim(p_responsible), ''), p_to, 'Adoção / transferência para outra matriz');
  insert into public.litter_events (litter_id, event_type, quantity, event_date, cause, responsible, related_litter_id, note)
  values (p_to, 'transferencia_entrada', p_quantity, p_date, nullif(trim(p_reason), ''), nullif(trim(p_responsible), ''), p_from, 'Adoção / transferência de outra matriz');
end $$;
revoke all on function public.transfer_piglets(uuid, uuid, int, date, text, text) from public, anon;
grant execute on function public.transfer_piglets(uuid, uuid, int, date, text, text) to authenticated;

-- 3. Leitão individual ----------------------------------------------------------------
alter table public.piglet_identifications
  add column if not exists status text not null default 'ativo',
  add column if not exists birth_condition text,
  add column if not exists colostrum_checked boolean,
  add column if not exists iron_date date,
  add column if not exists tail_dock_date date,
  add column if not exists castration_date date,
  add column if not exists pen_id uuid references public.farm_pens(id) on delete set null,
  add column if not exists death_date date,
  add column if not exists death_cause text,
  add column if not exists weaning_date date,
  add column if not exists weaning_weight_kg numeric(5,2);
alter table public.piglet_identifications drop constraint if exists piglet_status_check;
alter table public.piglet_identifications add constraint piglet_status_check
  check (status in ('ativo', 'morto', 'transferido', 'desmamado'));
alter table public.piglet_identifications drop constraint if exists piglet_condition_check;
alter table public.piglet_identifications add constraint piglet_condition_check
  check (birth_condition is null or birth_condition in ('normal', 'fraco', 'refugo'));
alter table public.piglet_identifications drop constraint if exists piglet_death_check;
alter table public.piglet_identifications add constraint piglet_death_check
  check (status <> 'morto' or death_date is not null);
alter table public.piglet_identifications drop constraint if exists piglet_weaning_weight_check;
alter table public.piglet_identifications add constraint piglet_weaning_weight_check
  check (weaning_weight_kg is null or (weaning_weight_kg > 0 and weaning_weight_kg < 60));

-- Eventos da leitegada refletem no leitão identificado (sem criar saldo novo).
create or replace function public.sync_piglet_from_event()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.event_type = 'morte' and new.piglet_id is not null then
    update public.piglet_identifications
      set status = 'morto', death_date = new.event_date, death_cause = coalesce(new.cause, death_cause)
      where id = new.piglet_id and litter_id = new.litter_id;
  elsif new.event_type = 'desmame' then
    update public.piglet_identifications
      set status = 'desmamado', weaning_date = new.event_date, pen_id = coalesce(new.destination_pen_id, pen_id)
      where litter_id = new.litter_id and status = 'ativo';
  end if;
  return new;
end $$;
drop trigger if exists sync_piglet_from_event on public.litter_events;
create trigger sync_piglet_from_event after insert on public.litter_events
  for each row execute function public.sync_piglet_from_event();

-- 4. Instalações -----------------------------------------------------------------------
alter table public.farm_pens
  add column if not exists building text,
  add column if not exists room text,
  add column if not exists animal_type text;

-- Lotação de matrizes por baia: acima da capacidade só com perfil de gestão.
create or replace function public.guard_sow_pen_capacity()
returns trigger language plpgsql security definer set search_path = public
as $$
declare cap int; used int;
begin
  if new.pen_id is null or new.archived_at is not null or new.status in ('morta', 'descartada', 'transferida') then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.pen_id is not distinct from old.pen_id then return new; end if;
  select capacity into cap from public.farm_pens where id = new.pen_id;
  select count(*) into used from public.sows
    where pen_id = new.pen_id and id <> new.id and archived_at is null
      and status not in ('morta', 'descartada', 'transferida');
  if used + 1 > cap and auth.uid() is not null and not public.can_manage_farm() then
    raise exception 'Baia lotada: capacidade % e já há % matriz(es). Peça a um administrador ou gerente.', cap, used;
  end if;
  return new;
end $$;
drop trigger if exists guard_sow_pen_capacity on public.sows;
create trigger guard_sow_pen_capacity before insert or update of pen_id, status, archived_at on public.sows
  for each row execute function public.guard_sow_pen_capacity();
