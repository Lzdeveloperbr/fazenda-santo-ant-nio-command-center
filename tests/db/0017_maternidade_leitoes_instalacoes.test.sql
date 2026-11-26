-- Testes da migration 0017. Executados por tests/db/run.sh (depois de 0015 e 0016).
\set ON_ERROR_STOP 1
reset role;
truncate public.sows cascade;
truncate public.farm_pens cascade;
insert into public.farm_pens (id, code, sector, capacity) values ('40000000-0000-0000-0000-000000000001', 'G-1', 'Gestação', 1);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false); -- funcionário
insert into public.sows (id, ear_tag, pen_id) values ('50000000-0000-0000-0000-000000000001', 'A1', '40000000-0000-0000-0000-000000000001');
insert into public.sows (id, ear_tag) values ('50000000-0000-0000-0000-000000000002', 'A2');
do $$ begin
  begin
    update public.sows set pen_id = '40000000-0000-0000-0000-000000000001' where id = '50000000-0000-0000-0000-000000000002';
    raise exception 'funcionário não deveria lotar a baia';
  exception when others then
    if sqlerrm not like 'Baia lotada%' then raise; end if;
  end;
end $$;

insert into public.litters (id, sow_id, farrowing_date, born_total, born_alive, runts)
values ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', current_date - 10, 12, 11, 1),
       ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', current_date - 9, 10, 9, null);
insert into public.piglet_identifications (id, litter_id, piglet_number, australian_number, sex, birth_weight_kg)
values ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 1, 101, 'macho', 1.4),
       ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 2, 102, 'femea', 1.2);

do $$ begin
  begin
    insert into public.litters (sow_id, farrowing_date, born_total, born_alive, runts) values ('50000000-0000-0000-0000-000000000002', current_date, 5, 4, 6);
    raise exception 'refugos acima dos vivos deveria falhar';
  exception when check_violation then null; end;

  -- Morte de leitão identificado com motivo e peso.
  insert into public.litter_events (litter_id, event_type, quantity, event_date, cause, weight_kg, piglet_id, responsible)
  values ('60000000-0000-0000-0000-000000000001', 'morte', 1, current_date - 3, 'Esmagamento', 1.6, '70000000-0000-0000-0000-000000000001', 'João');
  assert (select status from public.piglet_identifications where id = '70000000-0000-0000-0000-000000000001') = 'morto', 'leitão marcado como morto';
  assert (select deaths from public.litters where id = '60000000-0000-0000-0000-000000000001') = 1, 'saldo continua pelo livro';

  -- Adoção atômica.
  perform public.transfer_piglets('60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 2, current_date - 2, 'Equalização', 'Maria');
  assert (select transfers_out from public.litters where id = '60000000-0000-0000-0000-000000000001') = 2, 'saída registrada';
  assert (select transfers_in from public.litters where id = '60000000-0000-0000-0000-000000000002') = 2, 'entrada registrada';
  assert (select count(*) from public.litter_events where related_litter_id is not null) = 2, 'eventos vinculados';
  begin
    perform public.transfer_piglets('60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 50, current_date, null, null);
    raise exception 'adoção acima do saldo deveria falhar';
  exception when others then
    if sqlerrm like 'adoção acima%' then raise; end if;
  end;
  assert (select transfers_in from public.litters where id = '60000000-0000-0000-0000-000000000002') = 2, 'falha não deixa metade gravada';

  -- Desmame com sexo e destino; machos + fêmeas não passam da quantidade.
  begin
    insert into public.litter_events (litter_id, event_type, quantity, males, females) values ('60000000-0000-0000-0000-000000000001', 'desmame', 8, 5, 5);
    raise exception 'sexos acima da quantidade deveria falhar';
  exception when check_violation then null; end;
  insert into public.litter_events (litter_id, event_type, quantity, males, females, destination, destination_pen_id, event_date)
  values ('60000000-0000-0000-0000-000000000001', 'desmame', 8, 4, 4, 'Creche', '40000000-0000-0000-0000-000000000001', current_date);
  assert (select status from public.piglet_identifications where id = '70000000-0000-0000-0000-000000000002') = 'desmamado', 'leitão vivo desmamado';
  assert (select status from public.piglet_identifications where id = '70000000-0000-0000-0000-000000000001') = 'morto', 'leitão morto continua morto';
end $$;

-- Gerente pode autorizar lotação acima da capacidade (fica auditado).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false); -- gerente (definido no teste 0015)
update public.sows set pen_id = '40000000-0000-0000-0000-000000000001' where id = '50000000-0000-0000-0000-000000000002';
reset role;
do $$ begin
  assert (select count(*) from public.sows where pen_id = '40000000-0000-0000-0000-000000000001') = 2, 'gestão autoriza';
  assert exists (select 1 from public.audit_logs where table_name = 'sows' and 'pen_id' = any(changed_fields)), 'mudança de baia auditada';
end $$;
