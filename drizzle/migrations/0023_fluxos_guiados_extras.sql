-- 0023 — Fluxos guiados (parto, inseminação, desmame) e tabelas dos recursos extras
--
-- Não destrutiva. Os fluxos são funções SECURITY INVOKER: rodam com as
-- permissões e a granja do próprio usuário (RLS vale) e são atômicas — se
-- qualquer passo falhar, nada é gravado.

-- Identificação australiana passa a ser opcional (granjas que não usam o sistema
-- australiano podem numerar só pela leitegada). Continua única por granja.
alter table public.piglet_identifications alter column australian_number drop not null;

-- 1. Fluxo de inseminação / cobertura -------------------------------------------------------
create or replace function public.flow_register_breeding(
  p_sow_id uuid, p_date date, p_time time, p_type text, p_boar_id uuid, p_boar text,
  p_semen_batch_id uuid, p_doses int, p_responsible text, p_heat_started_at timestamptz, p_notes text
) returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  s record; cfg record; bid uuid; tag text;
  diag_date date; heat_date date;
begin
  select id, ear_tag, status, archived_at into s from public.sows where id = p_sow_id;
  if not found then raise exception 'Matriz não encontrada.'; end if;
  if s.archived_at is not null or s.status not in ('vazia', 'coberta') then
    raise exception 'A matriz % está como "%"; só matrizes vazias ou cobertas recebem nova cobertura.', s.ear_tag, s.status;
  end if;
  if p_date is null or p_date > current_date then raise exception 'Data da cobertura inválida (não pode ser futura).'; end if;
  if p_type not in ('monta_natural', 'inseminacao', 'reinseminacao', 'complementar') then raise exception 'Tipo de cobertura inválido.'; end if;
  if p_semen_batch_id is not null and coalesce(p_doses, 0) < 1 then raise exception 'Informe as doses usadas do lote de sêmen.'; end if;
  if p_heat_started_at is not null and p_heat_started_at::date > p_date then raise exception 'O cio não pode começar depois da cobertura.'; end if;
  select * into cfg from public.farm_settings limit 1;
  tag := s.ear_tag;

  if p_heat_started_at is not null then
    insert into public.heat_detections (sow_id, started_at, detected_by, notes) values (p_sow_id, p_heat_started_at, p_responsible, 'Registrado no fluxo de cobertura');
  end if;
  insert into public.breedings (sow_id, breeding_date, breeding_time, breeding_type, boar_id, boar, semen_batch_id, semen_doses_used, responsible, notes)
  values (p_sow_id, p_date, p_time, p_type, p_boar_id, nullif(trim(p_boar), ''), p_semen_batch_id, case when p_semen_batch_id is null then null else p_doses end, nullif(trim(p_responsible), ''), nullif(trim(p_notes), ''))
  returning id into bid;
  update public.sows set status = 'coberta' where id = p_sow_id and status = 'vazia';

  heat_date := p_date + coalesce(cfg.heat_start_day, 19);
  insert into public.tasks (title, priority, sector, due_date, sow_id)
  values ('Observar retorno ao cio · ' || tag, 'media', 'Gestação', heat_date, p_sow_id);
  if cfg.diagnosis_day is not null then
    diag_date := p_date + cfg.diagnosis_day;
    insert into public.tasks (title, priority, sector, due_date, sow_id)
    values ('Diagnóstico de gestação · ' || tag, 'alta', 'Gestação', diag_date, p_sow_id);
  end if;
  return jsonb_build_object('breeding_id', bid, 'heat_check', heat_date, 'diagnosis', diag_date,
    'farrowing', p_date + coalesce(cfg.gestation_days, 114));
end $$;

-- 2. Fluxo de parto ----------------------------------------------------------------------------
create or replace function public.flow_register_farrowing(
  p_breeding_id uuid, p_date date, p_start time, p_end time, p_responsible text,
  p_alive int, p_stillborn int, p_mummified int, p_runts int, p_deaths_after int,
  p_pen_id uuid, p_complications text[], p_notes text, p_piglets jsonb
) returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  b record; cfg record; lid uuid; tag text; p jsonb; n int := 0; wean date;
begin
  select br.id, br.sow_id, br.breeding_date, br.cycle_status, so.ear_tag into b
    from public.breedings br join public.sows so on so.id = br.sow_id where br.id = p_breeding_id;
  if not found then raise exception 'Ciclo de cobertura não encontrado.'; end if;
  if b.cycle_status <> 'ativo' then raise exception 'Este ciclo não está ativo (%).', b.cycle_status; end if;
  if p_date is null or p_date < b.breeding_date or p_date > current_date then raise exception 'Data do parto inválida.'; end if;
  if least(p_alive, p_stillborn, p_mummified, coalesce(p_runts, 0), coalesce(p_deaths_after, 0)) < 0 then raise exception 'Quantidades não podem ser negativas.'; end if;
  if p_alive + p_stillborn + p_mummified = 0 then raise exception 'Informe os leitões nascidos.'; end if;
  if coalesce(p_runts, 0) > p_alive or coalesce(p_deaths_after, 0) > p_alive then raise exception 'Refugos e mortes após o nascimento não podem passar dos nascidos vivos.'; end if;
  if jsonb_array_length(coalesce(p_piglets, '[]'::jsonb)) > p_alive then raise exception 'Mais leitões identificados do que nascidos vivos.'; end if;
  select * into cfg from public.farm_settings limit 1;
  tag := b.ear_tag;

  insert into public.litters (sow_id, breeding_id, farrowing_date, start_time, end_time, responsible, born_total, born_alive, stillborn, mummified, runts, pen_id, complications, farrowing_notes)
  values (b.sow_id, b.id, p_date, p_start, p_end, nullif(trim(p_responsible), ''), p_alive + p_stillborn + p_mummified, p_alive, p_stillborn, p_mummified, p_runts, p_pen_id, coalesce(p_complications, '{}'), nullif(trim(p_notes), ''))
  returning id into lid;
  update public.sows set status = 'lactante' where id = b.sow_id;

  for p in select * from jsonb_array_elements(coalesce(p_piglets, '[]'::jsonb)) loop
    n := n + 1;
    insert into public.piglet_identifications (litter_id, piglet_number, australian_number, birth_date, sex, birth_weight_kg, birth_condition, colostrum_checked, iron_date, tail_dock_date)
    values (lid, coalesce((p ->> 'piglet_number')::int, n), (p ->> 'australian_number')::int, p_date, nullif(p ->> 'sex', ''),
            (p ->> 'birth_weight_kg')::numeric, nullif(p ->> 'birth_condition', ''), (p ->> 'colostrum_checked')::boolean,
            (p ->> 'iron_date')::date, (p ->> 'tail_dock_date')::date);
  end loop;
  if coalesce(p_deaths_after, 0) > 0 then
    insert into public.litter_events (litter_id, event_type, quantity, event_date, cause, responsible, note)
    values (lid, 'morte', p_deaths_after, p_date, 'Causa não identificada', nullif(trim(p_responsible), ''), 'Morte após o nascimento (registro do parto)');
  end if;
  if cfg.weaning_age_days is not null then
    wean := p_date + cfg.weaning_age_days;
    insert into public.tasks (title, priority, sector, due_date, sow_id, litter_id)
    values ('Desmame previsto · ' || tag, 'media', 'Maternidade', wean, b.sow_id, lid);
  end if;
  return jsonb_build_object('litter_id', lid, 'piglets', n, 'weaning', wean);
end $$;

-- 3. Fluxo de desmame ---------------------------------------------------------------------------
create or replace function public.flow_register_weaning(
  p_litter_id uuid, p_date date, p_males int, p_females int, p_avg_weight numeric,
  p_piglet_weights jsonb, p_destination text, p_dest_pen uuid, p_responsible text, p_notes text
) returns jsonb language plpgsql security invoker set search_path = public
as $$
declare l record; live int; w jsonb; tag text; avg_w numeric := p_avg_weight; individual numeric[];
begin
  select li.*, so.ear_tag into l from public.litters li join public.sows so on so.id = li.sow_id where li.id = p_litter_id;
  if not found then raise exception 'Leitegada não encontrada.'; end if;
  if l.status <> 'maternidade' then raise exception 'A leitegada não está em maternidade.'; end if;
  if p_date is null or p_date < l.farrowing_date or p_date > current_date then raise exception 'Data de desmame inválida.'; end if;
  live := l.born_alive - l.deaths + l.transfers_in - l.transfers_out;
  if live <= 0 then raise exception 'A leitegada não tem leitões vivos registrados.'; end if;
  if coalesce(p_males, 0) + coalesce(p_females, 0) > live then raise exception 'Machos + fêmeas (%) passam dos % leitões vivos.', coalesce(p_males, 0) + coalesce(p_females, 0), live; end if;
  tag := l.ear_tag;

  for w in select * from jsonb_array_elements(coalesce(p_piglet_weights, '[]'::jsonb)) loop
    if (w ->> 'weight')::numeric is null or (w ->> 'weight')::numeric <= 0 or (w ->> 'weight')::numeric >= 60 then raise exception 'Peso individual inválido.'; end if;
    update public.piglet_identifications set weaning_weight_kg = (w ->> 'weight')::numeric
      where id = (w ->> 'piglet_id')::uuid and litter_id = p_litter_id;
    if not found then raise exception 'Leitão % não pertence a esta leitegada.', w ->> 'piglet_id'; end if;
    individual := array_append(individual, (w ->> 'weight')::numeric);
  end loop;
  if avg_w is null and individual is not null then
    select round(avg(x), 2) into avg_w from unnest(individual) x;
  end if;
  if avg_w is not null and (avg_w <= 0 or avg_w >= 60) then raise exception 'Peso médio inválido.'; end if;

  insert into public.litter_events (litter_id, event_type, quantity, event_date, males, females, weight_kg, destination, destination_pen_id, responsible, note)
  values (p_litter_id, 'desmame', live, p_date, p_males, p_females, avg_w, nullif(trim(p_destination), ''), p_dest_pen, nullif(trim(p_responsible), ''), nullif(trim(p_notes), ''));
  update public.sows set status = 'vazia' where id = l.sow_id and status = 'lactante';
  update public.tasks set status = 'concluida' where litter_id = p_litter_id and status <> 'concluida' and title like 'Desmame previsto%';
  return jsonb_build_object('weaned', live, 'avg_weight', avg_w, 'age_days', p_date - l.farrowing_date);
end $$;

revoke all on function public.flow_register_breeding(uuid, date, time, text, uuid, text, uuid, int, text, timestamptz, text) from public, anon;
revoke all on function public.flow_register_farrowing(uuid, date, time, time, text, int, int, int, int, int, uuid, text[], text, jsonb) from public, anon;
revoke all on function public.flow_register_weaning(uuid, date, int, int, numeric, jsonb, text, uuid, text, text) from public, anon;
grant execute on function public.flow_register_breeding(uuid, date, time, text, uuid, text, uuid, int, text, timestamptz, text) to authenticated;
grant execute on function public.flow_register_farrowing(uuid, date, time, time, text, int, int, int, int, int, uuid, text[], text, jsonb) to authenticated;
grant execute on function public.flow_register_weaning(uuid, date, int, int, numeric, jsonb, text, uuid, text, text) to authenticated;

-- 4. Extras: problemas, passagem de turno, favoritos -----------------------------------------------
create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) >= 4),
  description text not null check (length(trim(description)) >= 10),
  category text not null check (category in ('erro', 'dado_incorreto', 'sugestao', 'duvida', 'outro')),
  page text,
  status text not null default 'aberto' check (status in ('aberto', 'em_analise', 'resolvido', 'descartado')),
  resolution text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table if not exists public.shift_handovers (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null default current_date,
  shift text not null check (shift in ('manha', 'tarde', 'noite', 'integral')),
  sector text,
  summary text not null check (length(trim(summary)) >= 10),
  pending text,
  occurrences text,
  received_by uuid references auth.users(id) on delete set null,
  received_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('pagina', 'matriz', 'baia', 'lote')),
  ref text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

create or replace function public.guard_handover_receipt()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.received_at is distinct from old.received_at then
    if new.received_at is not null and auth.uid() = old.created_by then raise exception 'Quem passa o turno não pode confirmar o recebimento.'; end if;
    new.received_by := case when new.received_at is null then null else auth.uid() end;
  end if;
  if (new.summary, new.pending, new.occurrences, new.shift, new.shift_date) is distinct from (old.summary, old.pending, old.occurrences, old.shift, old.shift_date)
     and old.received_at is not null then
    raise exception 'Passagem de turno já recebida não pode ser alterada.';
  end if;
  return new;
end $$;
drop trigger if exists guard_handover_receipt on public.shift_handovers;
create trigger guard_handover_receipt before update on public.shift_handovers for each row execute function public.guard_handover_receipt();

create or replace function public.guard_issue_update()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.status is distinct from old.status and not public.can_manage_farm() then raise exception 'Somente administrador ou gerente muda a situação do problema.'; end if;
  if (new.title, new.description, new.category) is distinct from (old.title, old.description, old.category) and auth.uid() <> old.created_by then
    raise exception 'Só quem registrou pode editar o relato.';
  end if;
  new.resolved_at := case when new.status in ('resolvido', 'descartado') then coalesce(new.resolved_at, now()) else null end;
  return new;
end $$;
drop trigger if exists guard_issue_update on public.issue_reports;
create trigger guard_issue_update before update on public.issue_reports for each row execute function public.guard_issue_update();

do $$
declare t text;
begin
  foreach t in array array['issue_reports', 'shift_handovers', 'user_favorites'] loop
    execute format('alter table public.%I add column if not exists farm_id uuid not null default public.default_farm_id() references public.farms(id) on delete restrict', t);
    execute format('create index if not exists %I on public.%I (farm_id)', t || '_farm_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('drop policy if exists "granja isolada" on public.%I', t);
    execute format('create policy "granja isolada" on public.%I as restrictive for all to authenticated using (farm_id = (select public.current_farm_id())) with check (farm_id = (select public.current_farm_id()))', t);
    execute format('drop policy if exists "perfil insere" on public.%I', t);
    execute format('drop policy if exists "perfil altera" on public.%I', t);
    execute format('drop policy if exists "perfil exclui" on public.%I', t);
    execute format('create policy "perfil exclui" on public.%I as restrictive for delete to authenticated using (public.can_delete() or %s)', t, case when t = 'user_favorites' then 'user_id = auth.uid()' else 'false' end);
    execute format('drop trigger if exists audit_log on public.%I', t);
    execute format('create trigger audit_log after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t);
  end loop;
end $$;
-- Problemas e turnos: qualquer membro ativo registra (inclusive Consulta, para relatar problemas).
create policy "perfil insere" on public.issue_reports as restrictive for insert to authenticated with check (public.is_member());
create policy "perfil altera" on public.issue_reports as restrictive for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "perfil insere" on public.shift_handovers as restrictive for insert to authenticated with check (public.can_write());
create policy "perfil altera" on public.shift_handovers as restrictive for update to authenticated using (public.can_write()) with check (public.can_write());
create policy "perfil insere" on public.user_favorites as restrictive for insert to authenticated with check (user_id = auth.uid());
create policy "perfil altera" on public.user_favorites as restrictive for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant delete on table public.user_favorites to authenticated;

drop policy if exists "membros leem problemas" on public.issue_reports;
create policy "membros leem problemas" on public.issue_reports for select to authenticated using (public.is_member());
drop policy if exists "membros relatam" on public.issue_reports;
create policy "membros relatam" on public.issue_reports for insert to authenticated with check (public.is_member() and created_by = auth.uid());
drop policy if exists "membros atualizam problemas" on public.issue_reports;
create policy "membros atualizam problemas" on public.issue_reports for update to authenticated using (public.is_member()) with check (public.is_member());

drop policy if exists "membros leem turnos" on public.shift_handovers;
create policy "membros leem turnos" on public.shift_handovers for select to authenticated using (public.is_member());
drop policy if exists "membros passam turno" on public.shift_handovers;
create policy "membros passam turno" on public.shift_handovers for insert to authenticated with check (public.is_member() and created_by = auth.uid());
drop policy if exists "membros recebem turno" on public.shift_handovers;
create policy "membros recebem turno" on public.shift_handovers for update to authenticated using (public.is_member()) with check (public.is_member());

drop policy if exists "proprios favoritos" on public.user_favorites;
create policy "proprios favoritos" on public.user_favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
