-- Testes da migration 0021.
\set ON_ERROR_STOP 1
reset role;
truncate public.sows cascade;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false); -- funcionário
insert into public.sows (id, ear_tag) values ('c0000000-0000-0000-0000-000000000001', 'S-1');
insert into public.semen_batches (id, code, doses_received, doses_available, expiry_date, collection_date)
values ('d0000000-0000-0000-0000-000000000001', 'SM-10', 3, 999, current_date + 5, current_date - 1);

do $$ begin
  assert (select doses_available from public.semen_batches) = 3, 'saldo inicial = doses recebidas';
  insert into public.breedings (id, sow_id, breeding_date, semen_batch_id, semen_doses_used) values ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', current_date, 'd0000000-0000-0000-0000-000000000001', 2);
  assert (select doses_available from public.semen_batches) = 1, 'cobertura consome doses';
  begin
    insert into public.breedings (sow_id, breeding_date, semen_batch_id, semen_doses_used) values ('c0000000-0000-0000-0000-000000000001', current_date, 'd0000000-0000-0000-0000-000000000001', 2);
    raise exception 'doses insuficientes deveriam falhar';
  exception when others then if sqlerrm not like 'Lote de sêmen sem doses%' then raise; end if; end;
  update public.breedings set semen_doses_used = 1 where id = 'e0000000-0000-0000-0000-000000000001';
  assert (select doses_available from public.semen_batches) = 2, 'corrigir a cobertura devolve doses';
  begin
    update public.semen_batches set doses_available = 50;
    raise exception 'saldo não muda por edição';
  exception when others then if sqlerrm not like 'As doses do lote%' then raise; end if; end;
  begin
    insert into public.breedings (sow_id, breeding_date, semen_batch_id) values ('c0000000-0000-0000-0000-000000000001', current_date + 10, 'd0000000-0000-0000-0000-000000000001');
    raise exception 'lote vencido deveria falhar';
  exception when others then if sqlerrm not like 'Lote de sêmen vencido%' then raise; end if; end;

  insert into public.heat_detections (sow_id, started_at, ended_at, intensity, signs) values ('c0000000-0000-0000-0000-000000000001', now() - interval '30 hours', now() - interval '2 hours', 'forte', '{reflexo de imobilidade}');
  begin
    insert into public.heat_detections (sow_id, started_at, ended_at) values ('c0000000-0000-0000-0000-000000000001', now() - interval '1 hour', now() - interval '2 hours');
    raise exception 'fim antes do início deveria falhar';
  exception when check_violation then null; end;

  insert into public.sow_condition_records (sow_id, body_condition_score, feed_kg_day) values ('c0000000-0000-0000-0000-000000000001', 3.5, 2.8);
  begin
    insert into public.sow_condition_records (sow_id, body_condition_score) values ('c0000000-0000-0000-0000-000000000001', 3.3);
    raise exception 'escore fora de meio ponto deveria falhar';
  exception when check_violation then null; end;
  begin
    insert into public.sow_condition_records (sow_id) values ('c0000000-0000-0000-0000-000000000001');
    raise exception 'registro vazio deveria falhar';
  exception when check_violation then null; end;

  begin
    insert into public.feed_plans (name, category, kg_per_animal_day) values ('Plano gestação', 'gestacao', 2.5);
    raise exception 'funcionário não cria plano';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false); -- veterinário
insert into public.feed_plans (id, name, category, day_from, day_to, kg_per_animal_day, validated_by_name, validated_at)
values ('f0000000-0000-0000-0000-000000000001', 'Plano gestação', 'gestacao', 0, 84, 2.5, 'Zootecnista Teste CRZ 0000', current_date);
update public.feed_plans set kg_per_animal_day = 2.7 where id = 'f0000000-0000-0000-0000-000000000001';
reset role;
do $$ begin
  assert (select validated_at from public.feed_plans) is null, 'mudança de quantidade exige nova validação';
  assert exists (select 1 from public.audit_logs where table_name = 'semen_batches' and 'doses_available' = any(changed_fields) and origin = 'automatico'), 'consumo de doses auditado como automático';
end $$;
