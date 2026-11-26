-- Testes de RLS e auditoria da migration 0015. Executados por tests/db/run.sh.
\set ON_ERROR_STOP 1

-- Usuários: os dois fundadores, um funcionário convidado e um sem convite.
select set_config('request.jwt.claim.sub', '', false);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'adm@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'adm2@example.test');
reset role;
-- Código de convite criado pelo administrador.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.create_farm_access_code('CONVITE2026');
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000c', 'func@example.test', '{"farm_code":"CONVITE2026"}'),
  ('00000000-0000-0000-0000-00000000000d', 'estranho@example.test', '{}');

do $$ begin
  assert (select role from public.user_access where user_id = '00000000-0000-0000-0000-00000000000a') = 'admin', 'fundador 1 deveria ser admin';
  assert (select role from public.user_access where user_id = '00000000-0000-0000-0000-00000000000b') = 'admin', 'fundador 2 deveria ser admin';
  assert (select role from public.user_access where user_id = '00000000-0000-0000-0000-00000000000c') = 'funcionario', 'convidado deveria ser funcionário';
  assert not exists (select 1 from public.user_access where user_id = '00000000-0000-0000-0000-00000000000d'), 'sem convite não entra';
end $$;

-- Funcionário grava, mas não exclui.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
insert into public.sows (id, ear_tag) values ('10000000-0000-0000-0000-000000000001', 'M-001');
update public.sows set notes = 'conferida' where id = '10000000-0000-0000-0000-000000000001';
delete from public.sows where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  assert exists (select 1 from public.sows where id = '10000000-0000-0000-0000-000000000001'), 'funcionário não pode excluir';
  assert not public.can_view_audit(), 'funcionário não lê auditoria';
  assert (select count(*) from public.audit_logs) = 0, 'auditoria invisível ao funcionário';
end $$;
do $$ begin
  perform public.delete_sow('10000000-0000-0000-0000-000000000001');
  raise exception 'delete_sow deveria falhar para funcionário';
exception when others then
  if sqlerrm not like 'Sem permissão%' then raise; end if;
end $$;
do $$ begin
  perform public.set_user_access('00000000-0000-0000-0000-00000000000c', 'admin', true);
  raise exception 'funcionário não pode se promover';
exception when others then
  if sqlerrm not like 'Apenas administradores%' then raise; end if;
end $$;

-- Admin muda o funcionário para consulta: passa a ser somente leitura.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.set_user_access('00000000-0000-0000-0000-00000000000c', 'consulta', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  assert (select count(*) from public.sows) = 1, 'consulta lê dados';
  begin
    insert into public.sows (ear_tag) values ('M-002');
    raise exception 'consulta não deveria inserir';
  exception when insufficient_privilege then null;
  end;
  update public.sows set notes = 'x';
  assert (select notes from public.sows) = 'conferida', 'consulta não altera';
end $$;

-- Desativado não lê nada.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.set_user_access('00000000-0000-0000-0000-00000000000c', 'funcionario', false);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  assert not public.is_member(), 'desativado não é membro';
  assert (select count(*) from public.sows) = 0, 'desativado não lê matrizes';
end $$;

-- Nunca ficar sem administrador ativo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.set_user_access('00000000-0000-0000-0000-00000000000b', 'gerente', true);
do $$ begin
  perform public.set_user_access('00000000-0000-0000-0000-00000000000a', 'gerente', true);
  raise exception 'deveria manter um admin';
exception when others then
  if sqlerrm not like 'A granja precisa%' then raise; end if;
end $$;

-- Admin exclui; auditoria guarda valores anteriores e origem automática.
insert into public.litters (id, sow_id, farrowing_date, born_total, born_alive)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 12, 11);
insert into public.litter_events (litter_id, event_type, quantity) values ('20000000-0000-0000-0000-000000000001', 'morte', 1);
select public.delete_sow('10000000-0000-0000-0000-000000000001');
select public.touch_last_seen();
do $$ begin
  assert (select count(*) from public.sows) = 0, 'admin exclui';
  assert exists (select 1 from public.audit_logs where table_name = 'sows' and action = 'update'
                 and changed_fields = array['notes'] and old_data->>'notes' is null and new_data->>'notes' = 'conferida'
                 and actor_id = '00000000-0000-0000-0000-00000000000c' and origin = 'app'), 'alteração auditada';
  assert exists (select 1 from public.audit_logs where table_name = 'sows' and action = 'delete'
                 and old_data->>'ear_tag' = 'M-001'), 'exclusão guarda valor anterior';
  assert exists (select 1 from public.audit_logs where table_name = 'litters' and action = 'update'
                 and origin = 'automatico' and changed_fields = array['deaths']), 'gatilho de evento marcado como automático';
  assert exists (select 1 from public.audit_logs where table_name = 'user_access' and action = 'update'
                 and new_data->>'role' = 'consulta'), 'mudança de perfil auditada';
  assert not exists (select 1 from public.audit_logs where table_name = 'user_access'
                 and changed_fields = array['last_seen_at']), 'último acesso não polui auditoria';
  assert (select count(*) from public.farm_users()) = 3, 'admin vê a equipe';
end $$;

-- Auditoria é imutável para clientes.
do $$ begin
  delete from public.audit_logs;
  raise exception 'auditoria não pode ser apagada';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update public.audit_logs set origin = 'app';
  raise exception 'auditoria não pode ser alterada';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Toda tabela da granja com RLS tem as políticas de perfil e o gatilho de auditoria.
do $$ declare missing text; begin
  select string_agg(c.relname, ', ') into missing
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname not in ('audit_logs', 'farm_access_codes', 'user_roles', 'user_access', 'profiles')
    and (not c.relrowsecurity
         or not exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'audit_log')
         or (select count(*) from pg_policy p where p.polrelid = c.oid and p.polname like 'perfil %') <> 3);
  assert missing is null, 'tabelas sem proteção: ' || missing;
end $$;
