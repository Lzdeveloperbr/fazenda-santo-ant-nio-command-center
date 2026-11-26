-- Testes da migration 0016. Executados por tests/db/run.sh (depois do 0015).
\set ON_ERROR_STOP 1
reset role;
truncate public.sows cascade;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'func2@example.test');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000e1', 'member');
insert into public.user_access (user_id, role) values ('00000000-0000-0000-0000-0000000000e1', 'funcionario');

-- Funcionário cadastra o prontuário completo.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into public.sows (id, ear_tag, birth_date, entry_date, lineage, origin, sire, dam, weight_kg, weight_date, category, condition)
values ('30000000-0000-0000-0000-000000000001', 'M-100', '2025-01-10', '2025-06-01', 'L1', 'Granja X', 'R-7', 'M-3', 180.5, '2026-11-01', 'leitoa', 'em_observacao');

do $$ begin
  -- Regras de integridade.
  begin
    insert into public.sows (ear_tag, birth_date, entry_date) values ('M-101', '2025-06-01', '2025-01-01');
    raise exception 'entrada antes do nascimento deveria falhar';
  exception when check_violation then null; end;
  begin
    insert into public.sows (ear_tag, weight_kg) values ('M-102', 150);
    raise exception 'peso sem data deveria falhar';
  exception when check_violation then null; end;
  begin
    insert into public.sows (ear_tag, condition) values ('M-103', 'doente');
    raise exception 'condição inválida deveria falhar';
  exception when check_violation then null; end;
  -- Funcionário não arquiva.
  begin
    update public.sows set archived_at = now(), archived_reason = 'duplicada' where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'funcionário não deveria arquivar';
  exception when others then
    if sqlerrm not like 'Apenas administrador ou gerente%' then raise; end if;
  end;
  -- Funcionário não altera parâmetros (sem erro, mas 0 linhas).
  update public.farm_settings set gestation_days = 115;
  assert (select gestation_days from public.farm_settings) = 114, 'funcionário não altera parâmetros';
  assert (select diagnosis_day from public.farm_settings) is null, 'prazo de diagnóstico não é inventado';
end $$;

-- Administrador arquiva com motivo; sem motivo falha; parâmetros respeitam a ordem.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  begin
    update public.sows set archived_at = now() where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'arquivar sem motivo deveria falhar';
  exception when check_violation then null; end;
  update public.sows set archived_at = now(), archived_reason = 'Cadastro duplicado' where id = '30000000-0000-0000-0000-000000000001';
  assert (select archived_by from public.sows where id = '30000000-0000-0000-0000-000000000001') = '00000000-0000-0000-0000-00000000000a', 'registra quem arquivou';
  update public.sows set archived_at = null where id = '30000000-0000-0000-0000-000000000001';
  assert (select archived_reason from public.sows where id = '30000000-0000-0000-0000-000000000001') is null, 'reativar limpa o motivo';

  update public.farm_settings set diagnosis_day = 28, weaning_age_days = 21, maternity_transfer_day = 110;
  assert (select updated_by from public.farm_settings) = '00000000-0000-0000-0000-00000000000a', 'registra quem alterou';
  begin
    update public.farm_settings set heat_start_day = 120;
    raise exception 'ordem inválida deveria falhar';
  exception when check_violation then null; end;
  assert exists (select 1 from public.audit_logs where table_name = 'farm_settings' and 'diagnosis_day' = any(changed_fields)), 'parâmetros auditados';
  assert exists (select 1 from public.audit_logs where table_name = 'sows' and 'archived_at' = any(changed_fields)), 'arquivamento auditado';
end $$;
reset role;

do $$ begin
  assert (select count(*) from public.farm_settings) = 1, 'uma única linha de parâmetros';
  begin
    insert into public.farm_settings (id) values (false);
    raise exception 'segunda linha deveria falhar';
  exception when check_violation or unique_violation then null; end; -- 0022: uma linha por granja
  assert exists (select 1 from storage.buckets where id = 'sow-photos' and public = false), 'bucket privado de fotos';
end $$;
