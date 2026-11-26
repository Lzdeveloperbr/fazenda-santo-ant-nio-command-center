-- Testes da migration 0023: fluxos completos de manejo (cobertura → parto → desmame) e extras.
\set ON_ERROR_STOP 1
reset role;
truncate public.sows cascade;
truncate public.tasks cascade;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false); -- admin granja A
update public.farm_settings set diagnosis_day = 28, weaning_age_days = 21, gestation_days = 114;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false); -- funcionário
insert into public.sows (id, ear_tag, status) values ('f1000000-0000-0000-0000-000000000001', 'FL-1', 'vazia');

do $$
declare r jsonb; bid uuid; lid uuid; pig uuid;
begin
  -- Cobertura: valida, cria ciclo, lembretes e muda a situação.
  begin
    perform public.flow_register_breeding('f1000000-0000-0000-0000-000000000001', current_date + 1, null, 'inseminacao', null, 'R-1', null, null, 'Ana', null, null);
    raise exception 'data futura deveria falhar';
  exception when others then if sqlerrm not like 'Data da cobertura%' then raise; end if; end;
  r := public.flow_register_breeding('f1000000-0000-0000-0000-000000000001', current_date - 120, '08:00', 'inseminacao', null, 'R-1', null, null, 'Ana', now() - interval '121 days', 'ok');
  bid := (r ->> 'breeding_id')::uuid;
  assert (r ->> 'farrowing')::date = current_date - 6, 'previsão de parto pelos parâmetros da granja';
  assert (select status from public.sows where id = 'f1000000-0000-0000-0000-000000000001') = 'coberta', 'matriz coberta';
  assert (select count(*) from public.tasks where sow_id = 'f1000000-0000-0000-0000-000000000001') = 2, 'lembretes de cio e diagnóstico';
  assert (select count(*) from public.heat_detections) >= 1, 'cio registrado no fluxo';

  -- Parto: tudo ou nada.
  begin
    perform public.flow_register_farrowing(bid, current_date - 5, null, null, null, 2, 0, 0, 0, 0, null, null, null,
      '[{"sex":"macho"},{"sex":"femea"},{"sex":"macho"}]'::jsonb);
    raise exception 'mais leitões que vivos deveria falhar';
  exception when others then if sqlerrm not like 'Mais leitões%' then raise; end if; end;
  assert not exists (select 1 from public.litters where breeding_id = bid), 'falha não deixa leitegada pela metade';
  r := public.flow_register_farrowing(bid, current_date - 5, '06:00', '09:30', 'Ana', 11, 1, 1, 1, 1, null, array['Parto normal'], null,
    '[{"sex":"macho","birth_weight_kg":1.4,"iron_date":null},{"sex":"femea","birth_weight_kg":1.2,"australian_number":321}]'::jsonb);
  lid := (r ->> 'litter_id')::uuid;
  assert (select born_total from public.litters where id = lid) = 13, 'total = vivos + natimortos + mumificados';
  assert (select deaths from public.litters where id = lid) = 1, 'morte após nascimento pelo livro de eventos';
  assert (select cycle_status from public.breedings where id = bid) = 'parido', 'ciclo encerrado pelo parto';
  assert (select status from public.sows where id = 'f1000000-0000-0000-0000-000000000001') = 'lactante', 'matriz lactante';
  assert (select count(*) from public.piglet_identifications where litter_id = lid) = 2, 'prontuário dos leitões criado';
  assert (select count(*) from public.piglet_identifications where litter_id = lid and australian_number is null) = 1, 'numeração australiana opcional';
  assert exists (select 1 from public.tasks where litter_id = lid and title like 'Desmame previsto%' and due_date = current_date + 16), 'desmame programado';
  begin
    perform public.flow_register_farrowing(bid, current_date - 5, null, null, null, 10, 0, 0, 0, 0, null, null, null, null);
    raise exception 'parto duplicado deveria falhar';
  exception when others then if sqlerrm not like 'Este ciclo não está ativo%' then raise; end if; end;

  -- Desmame com pesos individuais.
  select id into pig from public.piglet_identifications where litter_id = lid and sex = 'macho';
  begin
    perform public.flow_register_weaning(lid, current_date, 6, 6, null, null, null, null, null, null);
    raise exception 'sexo acima dos vivos deveria falhar';
  exception when others then if sqlerrm not like 'Machos + fêmeas%' then raise; end if; end;
  r := public.flow_register_weaning(lid, current_date, 5, 5, null, jsonb_build_array(jsonb_build_object('piglet_id', pig, 'weight', 6.2)), 'Creche da granja', null, 'Ana', null);
  assert (r ->> 'weaned')::int = 10, 'desmama todos os vivos (11 - 1 morte)';
  assert (r ->> 'avg_weight')::numeric = 6.2, 'peso médio dos pesos individuais';
  assert (r ->> 'age_days')::int = 5, 'idade ao desmame';
  assert (select status from public.litters where id = lid) = 'desmamada', 'leitegada encerrada';
  assert (select status from public.piglet_identifications where id = pig) = 'desmamado', 'leitão desmamado';
  assert (select status from public.sows where id = 'f1000000-0000-0000-0000-000000000001') = 'vazia', 'matriz vazia';
  assert (select status from public.tasks where litter_id = lid and title like 'Desmame previsto%') = 'concluida', 'lembrete de desmame concluído';
end $$;

-- Passagem de turno: quem passa não confirma; quem recebe fica registrado; recebida não muda.
insert into public.shift_handovers (id, shift, summary, pending) values ('f2000000-0000-0000-0000-000000000001', 'manha', 'Tudo tranquilo na maternidade.', 'Pesar leitegada da M-1');
do $$ begin
  begin
    update public.shift_handovers set received_at = now();
    raise exception 'quem passa não deveria confirmar';
  exception when others then if sqlerrm not like 'Quem passa o turno%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.shift_handovers set received_at = now();
do $$ begin
  assert (select received_by from public.shift_handovers) = '00000000-0000-0000-0000-00000000000a', 'quem recebeu';
  begin
    update public.shift_handovers set summary = 'alterado depois de recebido';
    raise exception 'turno recebido não deveria mudar';
  exception when others then if sqlerrm not like 'Passagem de turno já recebida%' then raise; end if; end;
end $$;

-- Problemas: consulta relata; só gestão muda situação.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false); -- consulta
insert into public.issue_reports (id, title, description, category, page) values ('f3000000-0000-0000-0000-000000000001', 'Botão não salva', 'Ao salvar a pesagem aparece erro.', 'erro', '/maternidade');
do $$ begin
  begin
    update public.issue_reports set status = 'resolvido';
    raise exception 'consulta não resolve';
  exception when others then if sqlerrm not like 'Somente administrador%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.issue_reports set status = 'resolvido', resolution = 'Corrigido';
do $$ begin assert (select resolved_at from public.issue_reports) is not null, 'data de resolução'; end $$;

-- Favoritos: só do próprio usuário.
insert into public.user_favorites (kind, ref, label) values ('pagina', '/maternidade', 'Maternidade');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
do $$ begin assert (select count(*) from public.user_favorites) = 0, 'favoritos são pessoais'; end $$;
reset role;
