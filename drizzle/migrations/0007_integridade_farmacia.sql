-- Hardening do livro de estoque e integridade das prescrições.
create or replace function public.apply_medication_movement()
returns trigger language plpgsql security definer set search_path=public as $$
declare lot_unit text; lot_expiry date;
begin
 if new.lot_id is null then raise exception 'Selecione o lote do medicamento para movimentar o estoque.'; end if;
 select unit, expiry_date into lot_unit, lot_expiry from public.farm_medication_lots
  where id=new.lot_id and medication_id=new.medication_id for update;
 if not found then raise exception 'O lote selecionado não pertence a este medicamento.'; end if;
 if lot_unit <> new.unit then raise exception 'A unidade da movimentação deve ser igual à unidade cadastrada no lote (%).',lot_unit; end if;
 if new.movement_type='entrada' then
  update public.farm_medication_lots set quantity=quantity+new.quantity where id=new.lot_id;
 elsif new.movement_type='saida' then
  if lot_expiry is not null and lot_expiry < current_date and lower(coalesce(new.reason,'')) not like '%descarte%' then
   raise exception 'Lote vencido: não utilizar nos animais. Registre saída somente para descarte identificado.';
  end if;
  update public.farm_medication_lots set quantity=quantity-new.quantity where id=new.lot_id and quantity>=new.quantity;
  if not found then raise exception 'Estoque insuficiente para esta saída.'; end if;
 else
  update public.farm_medication_lots set quantity=new.quantity where id=new.lot_id;
 end if;
 return new;
end $$;

create or replace function public.validate_veterinary_treatment_lot()
returns trigger language plpgsql set search_path=public as $$
declare lot_medication uuid;
begin
 if new.end_date is not null and new.end_date < new.start_date then
  raise exception 'A data final do tratamento não pode ser anterior à data inicial.';
 end if;
 if new.lot_id is not null then
  select medication_id into lot_medication from public.farm_medication_lots where id=new.lot_id;
  if not found then raise exception 'Lote informado não encontrado.'; end if;
  if new.medication_id is null then
   new.medication_id := lot_medication;
  elsif new.medication_id <> lot_medication then
   raise exception 'O lote selecionado não pertence ao medicamento informado.';
  end if;
 end if;
 return new;
end $$;
create trigger veterinary_treatment_validate before insert or update on public.veterinary_treatment_records
for each row execute function public.validate_veterinary_treatment_lot();

-- O livro de movimentações é append-only para preservar a trilha de auditoria.
revoke update, delete on public.farm_medication_movements from authenticated;

-- Uma revisão marcada exige nome do profissional e data do registro.
alter table public.ai_health_analyses
 add constraint ai_health_review_fields check (
  not veterinarian_reviewed or
  (nullif(trim(coalesce(veterinarian_name,'')),'') is not null and veterinarian_review_date is not null)
 );

-- Prevent closing an active production batch while animals remain assigned to it.
create or replace function public.prevent_closing_batch_with_animals()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.status='encerrado' and old.status<>'encerrado' and new.current_headcount>0 then
  raise exception 'Não é possível encerrar lote com animais restantes. Registre saída ou transferência primeiro.';
 end if;
 return new;
end $$;
create trigger production_batch_close_guard
before update of status on public.production_batches
for each row execute function public.prevent_closing_batch_with_animals();

-- Keep occurrence counts coherent when the total is known.
alter table public.health_events
 add constraint health_event_affected_not_above_total
 check (animal_count=0 or affected_count<=animal_count);
