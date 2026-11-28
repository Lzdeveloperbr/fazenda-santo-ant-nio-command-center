-- Testes da migration 0025: histórico de pesagens das matrizes.
\set ON_ERROR_STOP 1
reset role;
truncate public.sows cascade;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false); -- funcionário
insert into public.sows (id, ear_tag, status, weight_kg, weight_date) values ('a2500000-0000-0000-0000-000000000001', 'PESO-1', 'vazia', 180, current_date - 60);

do $$
declare sid uuid := 'a2500000-0000-0000-0000-000000000001';
begin
  assert (select count(*) from public.sow_weighings where sow_id = sid) = 1, 'peso do cadastro entra no histórico';
  insert into public.sow_weighings (sow_id, weighed_on, weight_kg) values (sid, current_date - 10, 195.5);
  assert (select weight_kg from public.sows where id = sid) = 195.5, 'último peso atualizado na matriz';
  assert (select weight_date from public.sows where id = sid) = current_date - 10, 'data do último peso';
  -- pesagem antiga não troca o último peso
  insert into public.sow_weighings (sow_id, weighed_on, weight_kg) values (sid, current_date - 30, 188);
  assert (select weight_kg from public.sows where id = sid) = 195.5, 'pesagem antiga não sobrescreve';
  -- edição direta na ficha vira pesagem
  update public.sows set weight_kg = 201, weight_date = current_date where id = sid;
  assert (select count(*) from public.sow_weighings where sow_id = sid) = 4, 'edição na ficha registrada';
  -- validações
  begin
    insert into public.sow_weighings (sow_id, weighed_on, weight_kg) values (sid, current_date + 1, 200);
    raise exception 'data futura deveria falhar';
  exception when others then if sqlerrm not like 'A data da pesagem%' then raise; end if; end;
  begin
    insert into public.sow_weighings (sow_id, weighed_on, weight_kg) values (sid, current_date - 2, 900);
    raise exception 'peso absurdo deveria falhar';
  exception when check_violation then null; end;
  begin
    insert into public.sow_weighings (sow_id, weighed_on, weight_kg) values (sid, current_date - 10, 196);
    raise exception 'duas pesagens no mesmo dia deveriam falhar';
  exception when unique_violation then null; end;
end $$;

-- funcionário não apaga pesagem; administrador apaga e o último peso volta ao anterior
do $$
begin
  delete from public.sow_weighings where sow_id = 'a2500000-0000-0000-0000-000000000001' and weighed_on = current_date;
  assert (select count(*) from public.sow_weighings where sow_id = 'a2500000-0000-0000-0000-000000000001' and weighed_on = current_date) = 1, 'funcionário não exclui';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false); -- admin
do $$
begin
  delete from public.sow_weighings where sow_id = 'a2500000-0000-0000-0000-000000000001' and weighed_on = current_date;
  assert (select weight_kg from public.sows where id = 'a2500000-0000-0000-0000-000000000001') = 195.5, 'último peso volta ao anterior';
  assert (select count(*) from public.audit_logs where table_name = 'sow_weighings') >= 3, 'pesagens auditadas';
end $$;

-- consulta não grava
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c5', 'consulta25@example.test') on conflict do nothing;
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000c5', 'member') on conflict do nothing;
insert into public.user_access (user_id, role) values ('00000000-0000-0000-0000-0000000000c5', 'consulta') on conflict (user_id) do update set role = 'consulta';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c5', false);
do $$
begin
  insert into public.sow_weighings (sow_id, weighed_on, weight_kg) values ('a2500000-0000-0000-0000-000000000001', current_date - 3, 199);
  raise exception 'consulta não deveria gravar';
exception when insufficient_privilege then null;
end $$;
reset role;
