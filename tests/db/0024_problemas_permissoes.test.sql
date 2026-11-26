-- Testes da migration 0024: permissões sobre relatos de problemas.
\set ON_ERROR_STOP 1
reset role;
truncate public.issue_reports;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false); -- funcionário
insert into public.issue_reports (id, title, description, category) values ('e1550000-0000-0000-0000-000000000001', 'Erro no parto', 'O total não fecha na tela.', 'erro');

do $$
begin
  update public.issue_reports set description = 'O total de nascidos não fecha.' where id = 'e1550000-0000-0000-0000-000000000001';
  assert (select description from public.issue_reports where id = 'e1550000-0000-0000-0000-000000000001') like '%nascidos%', 'autor edita enquanto aberto';
  begin
    update public.issue_reports set status = 'resolvido' where id = 'e1550000-0000-0000-0000-000000000001';
    raise exception 'funcionário não deveria resolver';
  exception when others then if sqlerrm not like 'Somente administrador%' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false); -- admin
do $$
begin
  begin
    update public.issue_reports set title = 'Outro título' where id = 'e1550000-0000-0000-0000-000000000001';
    raise exception 'admin não deveria reescrever o relato de outro';
  exception when others then if sqlerrm not like 'Só o autor%' then raise; end if; end;
  update public.issue_reports set status = 'resolvido', resolution = 'Corrigido.' where id = 'e1550000-0000-0000-0000-000000000001';
  assert (select resolved_at is not null from public.issue_reports where id = 'e1550000-0000-0000-0000-000000000001'), 'data de resolução';
  update public.issue_reports set status = 'aberto' where id = 'e1550000-0000-0000-0000-000000000001';
  assert (select resolved_at is null from public.issue_reports where id = 'e1550000-0000-0000-0000-000000000001'), 'reaberto limpa a data';
end $$;
reset role;
