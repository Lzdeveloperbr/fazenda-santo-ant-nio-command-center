-- Testes da migration 0020.
\set ON_ERROR_STOP 1
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'consulta@example.test');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000c1', 'member');
insert into public.user_access (user_id, role) values ('00000000-0000-0000-0000-0000000000c1', 'consulta');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
insert into public.ai_questions (question, answer, mode) values ('Quantas matrizes estão gestantes?', '3', 'local');
do $$ begin
  assert (select count(*) from public.ai_questions) = 1, 'consulta pode perguntar e ver a própria pergunta';
  begin
    insert into public.ai_questions (question, mode, created_by) values ('x?', 'ia', '00000000-0000-0000-0000-00000000000a');
    raise exception 'não pode registrar em nome de outro';
  exception when insufficient_privilege then null; end;
  begin
    update public.ai_questions set answer = 'alterada';
    raise exception 'registro não pode ser alterado';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false); -- funcionário
do $$ begin
  assert (select count(*) from public.ai_questions) = 0, 'funcionário não vê perguntas de outros';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false); -- admin
do $$ begin
  assert (select count(*) from public.ai_questions) = 1, 'gestão vê todas';
end $$;
reset role;
