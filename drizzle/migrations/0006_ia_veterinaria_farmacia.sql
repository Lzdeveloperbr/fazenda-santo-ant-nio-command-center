-- Farmácia da granja e análises assistidas por IA.
create table public.farm_medications (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 active_ingredient text,
 manufacturer text,
 therapeutic_class text,
 presentation text,
 concentration text,
 package_volume text,
 administration_routes text[] not null default '{}',
 indications text,
 contraindications text,
 warnings text,
 interactions text,
 meat_withdrawal_days integer check(meat_withdrawal_days is null or meat_withdrawal_days>=0),
 milk_withdrawal_days integer check(milk_withdrawal_days is null or milk_withdrawal_days>=0),
 requires_veterinary_prescription boolean not null default true,
 label_text text,
 label_file_path text,
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.farm_medication_lots (
 id uuid primary key default gen_random_uuid(),
 medication_id uuid not null references public.farm_medications(id) on delete cascade,
 lot_number text not null,
 expiry_date date,
 quantity numeric(14,3) not null default 0 check(quantity>=0),
 unit text not null default 'ml',
 purchase_date date,
 supplier text,
 storage_location text,
 storage_instructions text,
 created_at timestamptz not null default now(),
 unique(medication_id,lot_number)
);
create table public.farm_medication_movements (
 id uuid primary key default gen_random_uuid(),
 medication_id uuid not null references public.farm_medications(id) on delete restrict,
 lot_id uuid references public.farm_medication_lots(id) on delete restrict,
 movement_type text not null check(movement_type in ('entrada','saida','ajuste')),
 quantity numeric(14,3) not null check(quantity>0),
 unit text not null,
 movement_date timestamptz not null default now(),
 reason text,
 reference_text text,
 responsible text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now()
);
create table public.ai_health_analyses (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid(),
 sector text,
 production_phase text,
 pen_id uuid references public.farm_pens(id) on delete set null,
 animal_category text,
 affected_count integer check(affected_count is null or affected_count>=0),
 animal_count integer check(animal_count is null or animal_count>=0),
 onset_date date,
 severity_reported text,
 description text not null,
 image_path text,
 ai_response jsonb not null,
 model_name text,
 veterinarian_reviewed boolean not null default false,
 veterinarian_name text,
 veterinarian_review_date date,
 linked_health_event_id uuid references public.health_events(id) on delete set null
);
create table public.veterinary_treatment_records (
 id uuid primary key default gen_random_uuid(),
 health_event_id uuid references public.health_events(id) on delete set null,
 medication_id uuid references public.farm_medications(id) on delete set null,
 lot_id uuid references public.farm_medication_lots(id) on delete set null,
 animal_group text,
 pen_id uuid references public.farm_pens(id) on delete set null,
 prescription_reference text not null,
 veterinarian_name text not null,
 prescribed_dose text not null,
 administration_route text,
 frequency text,
 start_date date not null,
 end_date date,
 withdrawal_meat_until date,
 withdrawal_milk_until date,
 animals_treated integer check(animals_treated is null or animals_treated>=0),
 responsible text,
 status text not null default 'prescrito' check(status in ('prescrito','em_andamento','concluido','suspenso_pelo_veterinario')),
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now()
);
create index farm_medication_lots_expiry_idx on public.farm_medication_lots(expiry_date);
create index farm_medication_movements_date_idx on public.farm_medication_movements(movement_date desc);
create index ai_health_analyses_date_idx on public.ai_health_analyses(created_at desc);
create index veterinary_treatment_records_start_idx on public.veterinary_treatment_records(start_date desc);
create or replace function public.apply_medication_movement()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.lot_id is null then raise exception 'Selecione o lote do medicamento para movimentar o estoque.'; end if;
 if new.movement_type='entrada' then
  update public.farm_medication_lots set quantity=quantity+new.quantity where id=new.lot_id and medication_id=new.medication_id;
 elsif new.movement_type='saida' then
  update public.farm_medication_lots set quantity=quantity-new.quantity where id=new.lot_id and medication_id=new.medication_id and quantity>=new.quantity;
  if not found then raise exception 'Estoque insuficiente ou lote não encontrado.'; end if;
 else
  update public.farm_medication_lots set quantity=new.quantity where id=new.lot_id and medication_id=new.medication_id;
 end if;
 if not found then raise exception 'Lote não encontrado para este medicamento.'; end if;
 return new;
end $$;
create trigger farm_medication_movement_apply before insert on public.farm_medication_movements for each row execute function public.apply_medication_movement();
do $$ declare t text; begin
 foreach t in array array['farm_medications','farm_medication_lots','farm_medication_movements','ai_health_analyses','veterinary_treatment_records'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy %I on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())','members all '||t,t);
 end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('veterinary-evidence','veterinary-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy "farm members read veterinary evidence" on storage.objects for select to authenticated using(bucket_id='veterinary-evidence' and public.is_member());
create policy "farm members upload veterinary evidence" on storage.objects for insert to authenticated with check(bucket_id='veterinary-evidence' and public.is_member());
create policy "farm members update veterinary evidence" on storage.objects for update to authenticated using(bucket_id='veterinary-evidence' and public.is_member()) with check(bucket_id='veterinary-evidence' and public.is_member());
