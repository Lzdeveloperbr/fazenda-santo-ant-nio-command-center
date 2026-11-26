-- Testes da migration 0022: isolamento por granja.
\set ON_ERROR_STOP 1
reset role;
truncate public.sows cascade;
-- Granja B com seu administrador (criada pelo servidor).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'adminb@example.test');
select public.create_farm_with_owner('Granja Vizinha', '00000000-0000-0000-0000-0000000000b1');

set role authenticated;
-- Admin da granja A cria dados.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into public.sows (id, ear_tag) values ('a1000000-0000-0000-0000-000000000001', 'M-001');
insert into public.farm_pens (id, code, sector, capacity) values ('a2000000-0000-0000-0000-000000000001', 'G-001', 'Gestação', 2);
do $$ begin
  begin
    insert into public.sows (ear_tag) values (' m-001 ');
    raise exception 'brinco repetido na mesma granja deveria falhar';
  exception when unique_violation then null; end;
  begin
    insert into public.sows (ear_tag, farm_id) values ('M-777', (select id from public.farms where name = 'Granja Vizinha'));
    raise exception 'não pode gravar em outra granja';
  exception when insufficient_privilege then null; end;
end $$;

-- Admin da granja B não vê nada da A e pode reutilizar o mesmo brinco e código de baia.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
do $$ declare b_farm uuid := public.current_farm_id(); begin
  assert (select count(*) from public.sows) = 0, 'granja B não vê matrizes da A';
  assert (select count(*) from public.farm_pens) = 0, 'granja B não vê baias da A';
  assert (select count(*) from public.farms) = 1 and (select name from public.farms) = 'Granja Vizinha', 'vê só a própria granja';
  assert (select count(*) from public.farm_settings) = 1, 'parâmetros próprios da granja B';
  assert (select count(*) from public.audit_logs) >= 0;
  assert not exists (select 1 from public.audit_logs where table_name = 'sows'), 'auditoria da A invisível para B';
  assert (select count(*) from public.farm_users()) = 1, 'equipe só da granja B';
  insert into public.sows (id, ear_tag) values ('b1000000-0000-0000-0000-000000000001', 'M-001');
  insert into public.farm_pens (code, sector, capacity) values ('G-001', 'Gestação', 2);
  assert (select farm_id from public.sows where id = 'b1000000-0000-0000-0000-000000000001') = b_farm, 'farm_id preenchido automaticamente';
  -- Vincular leitegada a matriz da outra granja é recusado (mesmo sabendo o id).
  begin
    insert into public.litters (sow_id, farrowing_date, born_total, born_alive) values ('a1000000-0000-0000-0000-000000000001', current_date, 10, 10);
    raise exception 'vínculo com matriz de outra granja deveria falhar';
  exception when foreign_key_violation then null; end;
  update public.sows set notes = 'invadido' where id = 'a1000000-0000-0000-0000-000000000001';
  begin
    perform public.set_user_access('00000000-0000-0000-0000-00000000000a', 'consulta', true);
    raise exception 'admin de B não altera usuário de A';
  exception when others then if sqlerrm not like 'Usuário não pertence%' then raise; end if; end;
  update public.farm_settings set gestation_days = 115;
end $$;

-- Granja A continua intacta.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select notes from public.sows where id = 'a1000000-0000-0000-0000-000000000001') is null, 'B não alterou dados da A';
  assert (select count(*) from public.sows) = 1, 'A vê só a própria matriz';
  assert (select gestation_days from public.farm_settings) = 114, 'parâmetros da A não mudaram';
  assert exists (select 1 from public.audit_logs where table_name = 'sows'), 'A vê a própria auditoria';
end $$;

-- Convite gerado na granja B leva o novo usuário para a B.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
select public.create_farm_access_code('VIZINHA2026');
reset role;
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000b2', 'funcb@example.test', '{"farm_code":"VIZINHA2026"}');
do $$ begin
  assert (select f.name from public.user_access a join public.farms f on f.id = a.farm_id where a.user_id = '00000000-0000-0000-0000-0000000000b2') = 'Granja Vizinha', 'convite leva para a granja certa';
  assert (select role from public.user_access where user_id = '00000000-0000-0000-0000-0000000000b2') = 'funcionario', 'convidado entra como funcionário';
end $$;

-- Toda tabela com farm_id tem a política de isolamento (exceto auditoria e códigos de convite).
do $$ declare missing text; begin
  select string_agg(c.table_name, ', ') into missing
  from information_schema.columns c
  where c.table_schema = 'public' and c.column_name = 'farm_id'
    and c.table_name not in ('audit_logs', 'farm_access_codes', 'user_access')
    and not exists (select 1 from pg_policy p join pg_class t on t.oid = p.polrelid where t.relname = c.table_name and p.polname = 'granja isolada');
  assert missing is null, 'tabelas sem isolamento: ' || missing;
end $$;
