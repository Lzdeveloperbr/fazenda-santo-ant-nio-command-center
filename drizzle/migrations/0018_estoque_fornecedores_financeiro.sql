-- 0018 — Estoque geral, fornecedores e financeiro
--
-- Não destrutiva: cria tabelas novas e adiciona colunas opcionais.
--  * Movimentações de estoque são imutáveis (sem UPDATE/DELETE): correções
--    se fazem com ajuste de inventário, que exige motivo e perfil de gestão.
--  * Saída acima do saldo é recusada pelo banco.
--  * Financeiro: valores pagos e pendentes continuam separados (status), com
--    data de pagamento, centro de custo e fornecedor.

-- 1. Fornecedores ---------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  document text,
  phone text,
  email text,
  category text,
  notes text,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists suppliers_name_unique on public.suppliers (lower(trim(name)));

-- 2. Estoque geral (materiais e insumos fora de ração e farmácia) ---------------
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  category text not null check (category in ('seringas', 'agulhas', 'materiais_manejo', 'suplementos', 'limpeza', 'equipamentos', 'epi', 'outros')),
  unit text not null check (length(trim(unit)) >= 1),
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  current_stock numeric(12,3) not null default 0 check (current_stock >= 0),
  location text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists stock_items_name_unique on public.stock_items (lower(trim(name)), unit);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.stock_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('entrada', 'saida', 'devolucao', 'transferencia', 'ajuste')),
  quantity numeric(12,3) not null,
  unit_cost numeric(12,4) check (unit_cost is null or unit_cost >= 0),
  lot text,
  expiry_date date,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_number text,
  from_location text,
  to_location text,
  reason text,
  responsible text,
  balance_after numeric(12,3),
  movement_date date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint stock_movements_qty_check check (
    (movement_type = 'ajuste' and quantity <> 0)
    or (movement_type = 'transferencia' and quantity > 0 and length(trim(coalesce(to_location, ''))) >= 1)
    or (movement_type in ('entrada', 'saida', 'devolucao') and quantity > 0)
  ),
  constraint stock_movements_reason_check check (
    movement_type not in ('ajuste', 'devolucao') or length(trim(coalesce(reason, ''))) >= 3
  )
);
create index if not exists stock_movements_item_idx on public.stock_movements (item_id, movement_date desc);

create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public
as $$
declare cur numeric; delta numeric;
begin
  select current_stock into cur from public.stock_items where id = new.item_id for update;
  if not found then raise exception 'Item de estoque não encontrado.'; end if;
  if new.movement_type = 'ajuste' and auth.uid() is not null and not public.can_manage_farm() then
    raise exception 'Ajuste de inventário só pode ser feito por administrador ou gerente.';
  end if;
  delta := case new.movement_type
    when 'entrada' then new.quantity
    when 'devolucao' then new.quantity
    when 'saida' then -new.quantity
    when 'ajuste' then new.quantity
    else 0 end;
  if cur + delta < 0 then
    raise exception 'Estoque insuficiente: saldo atual % . Para corrigir divergência, um administrador ou gerente registra um ajuste de inventário.', cur;
  end if;
  new.balance_after := cur + delta;
  update public.stock_items
    set current_stock = cur + delta,
        location = case when new.movement_type = 'transferencia' then new.to_location else location end
    where id = new.item_id;
  return new;
end $$;
drop trigger if exists apply_stock_movement on public.stock_movements;
create trigger apply_stock_movement before insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- Saldo só muda por movimentação.
create or replace function public.guard_stock_balance()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.current_stock is distinct from old.current_stock and pg_trigger_depth() = 1 then
    raise exception 'O saldo muda somente por movimentação de estoque.';
  end if;
  return new;
end $$;
drop trigger if exists guard_stock_balance on public.stock_items;
create trigger guard_stock_balance before update on public.stock_items
  for each row execute function public.guard_stock_balance();

-- 3. Permissões das tabelas novas -------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['suppliers', 'stock_items', 'stock_movements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('drop policy if exists "membros leem" on public.%I', t);
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('drop policy if exists "perfil insere" on public.%I', t);
    execute format('create policy "perfil insere" on public.%I for insert to authenticated with check (public.can_write())', t);
    execute format('drop policy if exists "perfil altera" on public.%I', t);
    execute format('drop policy if exists "perfil exclui" on public.%I', t);
    execute format('drop trigger if exists audit_log on public.%I', t);
    execute format('create trigger audit_log after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t);
  end loop;
end $$;
grant select, insert, update on table public.suppliers, public.stock_items to authenticated;
grant select, insert on table public.stock_movements to authenticated;
create policy "perfil altera" on public.suppliers for update to authenticated using (public.can_write()) with check (public.can_write());
create policy "perfil altera" on public.stock_items for update to authenticated using (public.can_write()) with check (public.can_write());
-- Para o teste de cobertura da 0015: políticas restritivas no mesmo padrão.
create policy "perfil exclui" on public.suppliers as restrictive for delete to authenticated using (public.can_delete());
create policy "perfil exclui" on public.stock_items as restrictive for delete to authenticated using (public.can_delete());
create policy "perfil exclui" on public.stock_movements as restrictive for delete to authenticated using (public.can_delete());
create policy "perfil altera restrito" on public.stock_movements as restrictive for update to authenticated using (false);

-- 4. Fornecedor, NF e custo nas entradas de ração e farmácia --------------------------
alter table public.feed_movements
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists invoice_number text,
  add column if not exists unit_cost numeric(12,4) check (unit_cost is null or unit_cost >= 0);
alter table public.farm_medication_movements
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists invoice_number text,
  add column if not exists unit_cost numeric(12,4) check (unit_cost is null or unit_cost >= 0);

-- 5. Financeiro -----------------------------------------------------------------------
alter table public.finance_entries
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists cost_center text,
  add column if not exists paid_at date,
  add column if not exists payment_method text,
  add column if not exists document_number text;
alter table public.finance_entries drop constraint if exists finance_cost_center_check;
alter table public.finance_entries add constraint finance_cost_center_check check (
  cost_center is null or cost_center in ('geral', 'reproducao', 'gestacao', 'maternidade', 'creche', 'crescimento', 'terminacao', 'administrativo')
);
alter table public.finance_entries drop constraint if exists finance_paid_at_check;
alter table public.finance_entries add constraint finance_paid_at_check check (status = 'pago' or paid_at is null);
create index if not exists finance_entries_due_idx on public.finance_entries (status, due_date);

-- 6. Descarte: destino e valor de venda ------------------------------------------------
alter table public.sow_events
  add column if not exists destination text,
  add column if not exists sale_value numeric(12,2) check (sale_value is null or sale_value >= 0);
