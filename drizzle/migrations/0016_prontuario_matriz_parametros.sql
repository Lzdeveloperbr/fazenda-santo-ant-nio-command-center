-- 0016 — Prontuário da matriz e parâmetros da granja
--
-- Não destrutiva: só adiciona colunas (todas opcionais), uma tabela de
-- parâmetros com uma única linha e um bucket privado de fotos.
--  * sows.status continua sendo mantido pelos gatilhos existentes; as novas
--    colunas category/condition complementam a situação sem conflitar com eles.
--  * Arquivar (exclusão lógica) exige administrador/gerente e motivo.
--  * Prazos reprodutivos passam do aparelho (localStorage) para o banco, para
--    todos os usuários verem os mesmos alertas. Prazos sem valor (null) não
--    são inventados: a tela pede para configurar.

-- 1. Prontuário ----------------------------------------------------------------
alter table public.sows
  add column if not exists lineage text,
  add column if not exists origin text,
  add column if not exists sire text,
  add column if not exists dam text,
  add column if not exists entry_date date,
  add column if not exists pen_id uuid references public.farm_pens(id) on delete set null,
  add column if not exists group_label text,
  add column if not exists weight_kg numeric(6,1),
  add column if not exists weight_date date,
  add column if not exists category text,
  add column if not exists condition text,
  add column if not exists photo_path text,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

alter table public.sows drop constraint if exists sows_category_check;
alter table public.sows add constraint sows_category_check
  check (category is null or category in ('leitoa', 'em_preparacao', 'matriz'));
alter table public.sows drop constraint if exists sows_condition_check;
alter table public.sows add constraint sows_condition_check
  check (condition is null or condition in ('em_observacao', 'em_tratamento', 'em_recuperacao'));
alter table public.sows drop constraint if exists sows_weight_check;
alter table public.sows add constraint sows_weight_check
  check (weight_kg is null or (weight_kg > 0 and weight_kg < 500));
alter table public.sows drop constraint if exists sows_weight_date_check;
alter table public.sows add constraint sows_weight_date_check
  check (weight_kg is null or weight_date is not null);
alter table public.sows drop constraint if exists sows_entry_after_birth_check;
alter table public.sows add constraint sows_entry_after_birth_check
  check (entry_date is null or birth_date is null or entry_date >= birth_date);
alter table public.sows drop constraint if exists sows_archive_reason_check;
alter table public.sows add constraint sows_archive_reason_check
  check (archived_at is null or length(trim(coalesce(archived_reason, ''))) >= 3);

create index if not exists sows_pen_idx on public.sows (pen_id);
create index if not exists sows_active_idx on public.sows (ear_tag) where archived_at is null;

-- Arquivar/desarquivar: somente administrador ou gerente; registra quem fez.
create or replace function public.guard_sow_archive()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.archived_at is distinct from old.archived_at then
    if auth.uid() is not null and not public.can_delete() then
      raise exception 'Apenas administrador ou gerente pode arquivar ou reativar o cadastro da matriz.';
    end if;
    if new.archived_at is null then
      new.archived_reason := null;
      new.archived_by := null;
    else
      new.archived_by := auth.uid();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_sow_archive on public.sows;
create trigger guard_sow_archive before update on public.sows
  for each row execute function public.guard_sow_archive();

-- 2. Parâmetros da granja --------------------------------------------------------
create table if not exists public.farm_settings (
  id boolean primary key default true check (id),
  farm_name text not null default 'Fazenda Santo Antônio',
  heat_prep_day int not null default 18,
  heat_start_day int not null default 19,
  heat_end_day int not null default 21,
  attention_start_day int not null default 105,
  approach_day int not null default 110,
  intensive_day int not null default 112,
  gestation_days int not null default 114,
  diagnosis_day int,
  maternity_transfer_day int,
  weaning_age_days int,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint farm_settings_order_check check (
    heat_prep_day >= 1 and heat_prep_day < heat_start_day and heat_start_day <= heat_end_day
    and heat_end_day < attention_start_day and attention_start_day <= approach_day
    and approach_day <= intensive_day and intensive_day <= gestation_days and gestation_days <= 130
  ),
  constraint farm_settings_diagnosis_check check (diagnosis_day is null or diagnosis_day between heat_end_day and 60),
  constraint farm_settings_transfer_check check (maternity_transfer_day is null or maternity_transfer_day between 60 and gestation_days),
  constraint farm_settings_weaning_check check (weaning_age_days is null or weaning_age_days between 7 and 60)
);
insert into public.farm_settings (id) values (true) on conflict (id) do nothing;

create or replace function public.can_manage_farm()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.access_role() in ('admin', 'gerente'), false) $$;
revoke all on function public.can_manage_farm() from public, anon;
grant execute on function public.can_manage_farm() to authenticated;

alter table public.farm_settings enable row level security;
revoke all on table public.farm_settings from public, anon, authenticated;
grant select, update on table public.farm_settings to authenticated;
grant all on table public.farm_settings to service_role;
drop policy if exists "membros leem parametros" on public.farm_settings;
create policy "membros leem parametros" on public.farm_settings
  for select to authenticated using (public.is_member());
drop policy if exists "gestao altera parametros" on public.farm_settings;
create policy "gestao altera parametros" on public.farm_settings
  for update to authenticated using (public.can_manage_farm()) with check (public.can_manage_farm());

-- Mesmo padrão das demais tabelas (0015).
drop policy if exists "perfil insere" on public.farm_settings;
drop policy if exists "perfil altera" on public.farm_settings;
drop policy if exists "perfil exclui" on public.farm_settings;
create policy "perfil insere" on public.farm_settings as restrictive for insert to authenticated with check (public.can_write());
create policy "perfil altera" on public.farm_settings as restrictive for update to authenticated using (public.can_write()) with check (public.can_write());
create policy "perfil exclui" on public.farm_settings as restrictive for delete to authenticated using (public.can_delete());

create or replace function public.stamp_farm_settings()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
drop trigger if exists stamp_farm_settings on public.farm_settings;
create trigger stamp_farm_settings before update on public.farm_settings
  for each row execute function public.stamp_farm_settings();
drop trigger if exists audit_log on public.farm_settings;
create trigger audit_log after insert or update or delete on public.farm_settings
  for each row execute function public.write_audit_log();

-- 3. Fotos das matrizes (bucket privado) -----------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sow-photos', 'sow-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "membros veem fotos de matrizes" on storage.objects;
create policy "membros veem fotos de matrizes" on storage.objects
  for select to authenticated using (bucket_id = 'sow-photos' and public.is_member());
drop policy if exists "perfil envia fotos de matrizes" on storage.objects;
create policy "perfil envia fotos de matrizes" on storage.objects
  for insert to authenticated with check (bucket_id = 'sow-photos' and public.can_write());
drop policy if exists "perfil troca fotos de matrizes" on storage.objects;
create policy "perfil troca fotos de matrizes" on storage.objects
  for update to authenticated
  using (bucket_id = 'sow-photos' and public.can_write())
  with check (bucket_id = 'sow-photos' and public.can_write());
drop policy if exists "gestao remove fotos de matrizes" on storage.objects;
create policy "gestao remove fotos de matrizes" on storage.objects
  for delete to authenticated using (bucket_id = 'sow-photos' and public.can_delete());
