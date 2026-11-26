-- 0019 — Agenda: quem executou cada tarefa; protocolos sanitários configuráveis
--
-- Não destrutiva. Protocolos não trazem nenhum valor pronto: produto, dose e
-- prazos são escritos e validados pelo responsável técnico. Só protocolos
-- validados geram lembretes na agenda.

-- 1. Tarefas: quem criou e quem concluiu -----------------------------------------
alter table public.tasks
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists notes text;

create or replace function public.stamp_task_completion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    new.completed_at := coalesce(new.completed_at, now());
    new.completed_by := coalesce(auth.uid(), new.completed_by);
  elsif new.status <> 'concluida' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end $$;
drop trigger if exists stamp_task_completion on public.tasks;
create trigger stamp_task_completion before insert or update of status on public.tasks
  for each row execute function public.stamp_task_completion();

-- 2. Protocolos sanitários ------------------------------------------------------------
create or replace function public.can_manage_health()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.access_role() in ('admin', 'gerente', 'veterinario'), false) $$;
revoke all on function public.can_manage_health() from public, anon;
grant execute on function public.can_manage_health() to authenticated;

create table if not exists public.health_protocols (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 3),
  kind text not null check (kind in ('vacina', 'vermifugacao', 'ferro', 'medicacao', 'manejo', 'outro')),
  target text not null check (target in ('matriz', 'leitegada', 'reprodutor', 'lote')),
  anchor text not null check (anchor in ('cobertura', 'parto', 'nascimento', 'desmame', 'entrada_lote')),
  offset_days int not null check (offset_days between -120 and 400),
  repeat_every_days int check (repeat_every_days is null or repeat_every_days between 1 and 400),
  product text,
  dose_instructions text,
  notes text,
  validated_by_name text,
  validated_at date,
  validated_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_protocols_validation_check check (
    (validated_at is null and validated_by_name is null) or (validated_at is not null and length(trim(coalesce(validated_by_name, ''))) >= 3)
  )
);

-- Qualquer mudança de conteúdo exige nova validação.
create or replace function public.guard_health_protocol()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
      new.name, new.kind, new.target, new.anchor, new.offset_days, new.repeat_every_days, new.product, new.dose_instructions
    ) is distinct from (
      old.name, old.kind, old.target, old.anchor, old.offset_days, old.repeat_every_days, old.product, old.dose_instructions
    ) and new.validated_at is not distinct from old.validated_at then
    new.validated_at := null;
    new.validated_by_name := null;
    new.validated_by := null;
  end if;
  if new.validated_at is not null and (tg_op = 'INSERT' or old.validated_at is distinct from new.validated_at) then
    new.validated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_health_protocol on public.health_protocols;
create trigger guard_health_protocol before insert or update on public.health_protocols
  for each row execute function public.guard_health_protocol();

alter table public.health_protocols enable row level security;
revoke all on table public.health_protocols from public, anon, authenticated;
grant select, insert, update on table public.health_protocols to authenticated;
grant all on table public.health_protocols to service_role;
drop policy if exists "membros leem" on public.health_protocols;
create policy "membros leem" on public.health_protocols for select to authenticated using (public.is_member());
drop policy if exists "saude gerencia" on public.health_protocols;
create policy "saude gerencia" on public.health_protocols for insert to authenticated with check (public.can_manage_health());
drop policy if exists "saude altera" on public.health_protocols;
create policy "saude altera" on public.health_protocols for update to authenticated using (public.can_manage_health()) with check (public.can_manage_health());
drop policy if exists "perfil insere" on public.health_protocols;
drop policy if exists "perfil altera" on public.health_protocols;
drop policy if exists "perfil exclui" on public.health_protocols;
create policy "perfil insere" on public.health_protocols as restrictive for insert to authenticated with check (public.can_write());
create policy "perfil altera" on public.health_protocols as restrictive for update to authenticated using (public.can_write()) with check (public.can_write());
create policy "perfil exclui" on public.health_protocols as restrictive for delete to authenticated using (public.can_delete());
drop trigger if exists audit_log on public.health_protocols;
create trigger audit_log after insert or update or delete on public.health_protocols
  for each row execute function public.write_audit_log();
