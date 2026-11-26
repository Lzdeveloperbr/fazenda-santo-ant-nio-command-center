-- Testes da migration 0018.
\set ON_ERROR_STOP 1
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false); -- funcionário
insert into public.suppliers (id, name) values ('80000000-0000-0000-0000-000000000001', 'Agro Insumos');
insert into public.stock_items (id, name, category, unit, minimum_stock) values ('90000000-0000-0000-0000-000000000001', 'Seringa 10 mL', 'seringas', 'un', 50);
insert into public.stock_movements (item_id, movement_type, quantity, unit_cost, lot, expiry_date, supplier_id, invoice_number)
values ('90000000-0000-0000-0000-000000000001', 'entrada', 100, 0.8, 'L1', current_date + 400, '80000000-0000-0000-0000-000000000001', 'NF 123');
insert into public.stock_movements (item_id, movement_type, quantity) values ('90000000-0000-0000-0000-000000000001', 'saida', 30);

do $$ begin
  assert (select current_stock from public.stock_items where id = '90000000-0000-0000-0000-000000000001') = 70, 'saldo por movimentação';
  assert (select balance_after from public.stock_movements where movement_type = 'saida') = 70, 'saldo após a saída';
  begin
    insert into public.stock_movements (item_id, movement_type, quantity) values ('90000000-0000-0000-0000-000000000001', 'saida', 71);
    raise exception 'saída acima do saldo deveria falhar';
  exception when others then if sqlerrm not like 'Estoque insuficiente%' then raise; end if; end;
  begin
    insert into public.stock_movements (item_id, movement_type, quantity, reason) values ('90000000-0000-0000-0000-000000000001', 'ajuste', -5, 'contagem');
    raise exception 'funcionário não ajusta inventário';
  exception when others then if sqlerrm not like 'Ajuste de inventário%' then raise; end if; end;
  begin
    update public.stock_items set current_stock = 999 where id = '90000000-0000-0000-0000-000000000001';
    raise exception 'saldo não muda por edição';
  exception when others then if sqlerrm not like 'O saldo muda somente%' then raise; end if; end;
  begin
    update public.stock_movements set quantity = 1;
    raise exception 'movimentação deveria ser imutável';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.stock_movements (item_id, movement_type, quantity) values ('90000000-0000-0000-0000-000000000001', 'devolucao', 2);
    raise exception 'devolução sem motivo deveria falhar';
  exception when check_violation then null; end;
  insert into public.stock_movements (item_id, movement_type, quantity, to_location) values ('90000000-0000-0000-0000-000000000001', 'transferencia', 10, 'Farmácia');
  assert (select location from public.stock_items where id = '90000000-0000-0000-0000-000000000001') = 'Farmácia', 'transferência muda local';
  assert (select current_stock from public.stock_items where id = '90000000-0000-0000-0000-000000000001') = 70, 'transferência não muda saldo';

  insert into public.finance_entries (entry_type, category, amount, status, due_date, cost_center, supplier_id)
  values ('despesa', 'Ração', 1500, 'pendente', current_date + 10, 'gestacao', '80000000-0000-0000-0000-000000000001');
  begin
    insert into public.finance_entries (entry_type, category, amount, status, paid_at) values ('despesa', 'Água', 10, 'pendente', current_date);
    raise exception 'pendente com data de pagamento deveria falhar';
  exception when check_violation then null; end;
  begin
    insert into public.finance_entries (entry_type, category, amount, cost_center) values ('despesa', 'Água', 10, 'piscina');
    raise exception 'centro de custo inválido deveria falhar';
  exception when check_violation then null; end;
  update public.finance_entries set status = 'pago', paid_at = current_date where category = 'Ração';
end $$;

-- Gerente ajusta inventário com motivo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.stock_movements (item_id, movement_type, quantity, reason) values ('90000000-0000-0000-0000-000000000001', 'ajuste', -4, 'Contagem física');
reset role;
do $$ begin
  assert (select current_stock from public.stock_items where id = '90000000-0000-0000-0000-000000000001') = 66, 'ajuste aplicado';
  assert exists (select 1 from public.audit_logs where table_name = 'stock_movements' and new_data->>'movement_type' = 'ajuste'), 'ajuste auditado';
  assert exists (select 1 from public.audit_logs where table_name = 'finance_entries' and 'paid_at' = any(changed_fields)), 'pagamento auditado';
end $$;
