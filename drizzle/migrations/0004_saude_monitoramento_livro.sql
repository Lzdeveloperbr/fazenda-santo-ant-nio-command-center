-- Rotina sanitária e monitoramento aplicados a partir do livro "Doenças dos Suínos".
-- Registros operacionais: nenhuma tabela prescreve tratamento ou diagnóstico automaticamente.

create table public.health_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null default current_date,
  onset_date date,
  sector text not null,
  pen_id uuid references public.farm_pens(id) on delete set null,
  production_phase text,
  sign_group text not null,
  clinical_signs text not null,
  severity text not null default 'observacao' check (severity in ('observacao','moderada','grave','emergencia')),
  animal_count integer not null default 0 check (animal_count >= 0),
  affected_count integer not null default 0 check (affected_count >= 0),
  death_count integer not null default 0 check (death_count >= 0),
  suspected_condition text,
  feed_change boolean not null default false,
  water_change boolean not null default false,
  isolation_started boolean not null default false,
  veterinarian_notified boolean not null default false,
  veterinarian_name text,
  status text not null default 'aberto' check (status in ('aberto','em_avaliacao','aguardando_exame','em_acompanhamento','encerrado')),
  action_taken text,
  follow_up_date date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.health_samples (
  id uuid primary key default gen_random_uuid(),
  health_event_id uuid references public.health_events(id) on delete set null,
  sample_date date not null default current_date,
  sample_type text not null,
  sample_origin text,
  collected_by text,
  storage_condition text,
  laboratory text,
  requested_tests text,
  result_status text not null default 'pendente' check (result_status in ('pendente','em_analise','concluido','inconclusivo')),
  result_summary text,
  reviewed_by_vet text,
  reviewed_at date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.vaccination_records (
  id uuid primary key default gen_random_uuid(),
  vaccine_name text not null,
  target_group text not null,
  pen_id uuid references public.farm_pens(id) on delete set null,
  vaccination_date date not null default current_date,
  next_due_date date,
  animals_planned integer not null default 0 check (animals_planned >= 0),
  animals_vaccinated integer not null default 0 check (animals_vaccinated >= 0),
  manufacturer text,
  batch text,
  expiry_date date,
  route text,
  protocol_reference text,
  veterinarian text,
  responsible text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.medication_records (
  id uuid primary key default gen_random_uuid(),
  health_event_id uuid references public.health_events(id) on delete set null,
  product_name text not null,
  active_ingredient text,
  therapeutic_class text,
  is_antimicrobial boolean not null default false,
  prescription_reference text,
  veterinarian text,
  batch text,
  animals_treated integer not null default 0 check (animals_treated >= 0),
  dose_as_prescribed text,
  route text,
  frequency text,
  administration_start date not null default current_date,
  administration_end date,
  withdrawal_days integer not null default 0 check (withdrawal_days >= 0),
  feed_amount_kg numeric(12,2) check (feed_amount_kg is null or feed_amount_kg >= 0),
  water_amount_liters numeric(12,2) check (water_amount_liters is null or water_amount_liters >= 0),
  responsible text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint antimicrobial_requires_vet_record check (
    not is_antimicrobial or
    (nullif(trim(coalesce(prescription_reference,'')), '') is not null and nullif(trim(coalesce(veterinarian,'')), '') is not null)
  )
);

create table public.monitoring_records (
  id uuid primary key default gen_random_uuid(),
  monitoring_date date not null default current_date,
  monitoring_type text not null check (monitoring_type in ('sanitario','clinico','patologico','laboratorial','abate')),
  indicator text not null,
  production_phase text,
  pen_id uuid references public.farm_pens(id) on delete set null,
  animals_observed integer not null default 0 check (animals_observed >= 0),
  animals_affected integer not null default 0 check (animals_affected >= 0),
  deaths integer not null default 0 check (deaths >= 0),
  score text,
  duration_days numeric(8,2) check (duration_days is null or duration_days >= 0),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.biosecurity_checks (
  id uuid primary key default gen_random_uuid(),
  check_date date not null default current_date,
  sector text,
  check_point text not null,
  result text not null check (result in ('conforme','nao_conforme','nao_aplicavel')),
  responsible text,
  corrective_action text,
  due_date date,
  verified_at date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.farm_visit_reports (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null default current_date,
  visitor_name text not null,
  visitor_role text,
  sectors_reviewed text,
  records_reviewed text,
  findings text,
  recommendations text,
  return_date date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index health_events_date_status_idx on public.health_events(event_date desc, status);
create index health_events_pen_idx on public.health_events(pen_id, event_date desc);
create index health_samples_event_idx on public.health_samples(health_event_id, sample_date desc);
create index vaccination_due_idx on public.vaccination_records(next_due_date);
create index medication_end_idx on public.medication_records(administration_end);
create index monitoring_date_idx on public.monitoring_records(monitoring_date desc, monitoring_type);
create index biosecurity_date_idx on public.biosecurity_checks(check_date desc, result);
create index farm_visit_date_idx on public.farm_visit_reports(visit_date desc);

do $$
declare t text;
begin
  foreach t in array array[
    'health_events','health_samples','vaccination_records','medication_records',
    'monitoring_records','biosecurity_checks','farm_visit_reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', 'members all ' || t, t);
  end loop;
end $$;
