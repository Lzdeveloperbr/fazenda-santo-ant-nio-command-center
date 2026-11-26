-- Testes da migration 0019.
\set ON_ERROR_STOP 1
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'vet@example.test');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000f1', 'member');
insert into public.user_access (user_id, role) values ('00000000-0000-0000-0000-0000000000f1', 'veterinario');

set role authenticated;
-- Funcionário conclui tarefa: fica registrado quem executou.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
insert into public.tasks (id, title) values ('a0000000-0000-0000-0000-000000000001', 'Conferir bebedouros');
update public.tasks set status = 'concluida' where id = 'a0000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select completed_by from public.tasks where id = 'a0000000-0000-0000-0000-000000000001') = '00000000-0000-0000-0000-0000000000e1', 'quem concluiu';
  assert (select completed_at from public.tasks where id = 'a0000000-0000-0000-0000-000000000001') is not null, 'quando concluiu';
  assert (select created_by from public.tasks where id = 'a0000000-0000-0000-0000-000000000001') = '00000000-0000-0000-0000-0000000000e1', 'quem criou';
  -- Funcionário não cria protocolo sanitário.
  begin
    insert into public.health_protocols (name, kind, target, anchor, offset_days) values ('Vacina X', 'vacina', 'matriz', 'parto', -14);
    raise exception 'funcionário não deveria criar protocolo';
  exception when insufficient_privilege then null; end;
end $$;
update public.tasks set status = 'pendente' where id = 'a0000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select completed_by from public.tasks where id = 'a0000000-0000-0000-0000-000000000001') is null, 'reabrir limpa a conclusão';
end $$;

-- Veterinário cria e valida; alteração de conteúdo derruba a validação.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
insert into public.health_protocols (id, name, kind, target, anchor, offset_days, product, dose_instructions, validated_by_name, validated_at)
values ('b0000000-0000-0000-0000-000000000001', 'Protocolo teste', 'vacina', 'matriz', 'parto', -14, 'Produto definido pelo vet', 'Conforme bula', 'Dra. Teste CRMV 0000', current_date);
do $$ begin
  assert (select validated_by from public.health_protocols) = '00000000-0000-0000-0000-0000000000f1', 'registra quem validou';
  begin
    insert into public.health_protocols (name, kind, target, anchor, offset_days, validated_at) values ('Sem nome de quem validou', 'outro', 'matriz', 'parto', 0, current_date);
    raise exception 'validação sem responsável deveria falhar';
  exception when check_violation then null; end;
  update public.health_protocols set offset_days = -10 where id = 'b0000000-0000-0000-0000-000000000001';
  assert (select validated_at from public.health_protocols where id = 'b0000000-0000-0000-0000-000000000001') is null, 'mudança exige nova validação';
  update public.health_protocols set notes = 'só observação' where id = 'b0000000-0000-0000-0000-000000000001';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from public.audit_logs where table_name = 'health_protocols' and 'validated_at' = any(changed_fields)), 'validação auditada';
end $$;
