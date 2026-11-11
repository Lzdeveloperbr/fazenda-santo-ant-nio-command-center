create table public.piglet_identifications (
 id uuid primary key default gen_random_uuid(),
 litter_id uuid not null references public.litters(id) on delete cascade,
 piglet_number integer not null check(piglet_number>0),
 australian_number integer not null unique check(australian_number between 1 and 1599),
 birth_date date, marked_date date not null default current_date,
 sex text check(sex in ('macho','femea','nao_informado')),
 birth_weight_kg numeric(8,3) check(birth_weight_kg is null or birth_weight_kg>0),
 notes text, created_by uuid default auth.uid(), created_at timestamptz not null default now(),
 unique(litter_id,piglet_number)
);
create table public.weaning_feed_schedules (
 id uuid primary key default gen_random_uuid(),
 litter_id uuid not null unique references public.litters(id) on delete cascade,
 weaning_date date not null,
 ration_1_name text not null default 'Ração 1', ration_1_days integer not null default 0 check(ration_1_days>=0),
 ration_2_name text not null default 'Ração 2', ration_2_days integer not null default 0 check(ration_2_days>=0),
 ration_3_name text not null default 'Ração 3', ration_3_days integer not null default 0 check(ration_3_days>=0),
 ration_4_name text not null default 'Ração 4', ration_4_days integer not null default 0 check(ration_4_days>=0),
 ration_5_name text not null default 'Ração 5', ration_5_days integer not null default 0 check(ration_5_days>=0),
 ration_6_name text not null default 'Ração 6', ration_6_days integer not null default 0 check(ration_6_days>=0),
 ration_7_name text not null default 'Ração 7', ration_7_days integer not null default 0 check(ration_7_days>=0),
 notes text, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index piglet_identifications_litter_idx on public.piglet_identifications(litter_id,piglet_number);
alter table public.piglet_identifications enable row level security;
alter table public.weaning_feed_schedules enable row level security;
grant select,insert,update,delete on public.piglet_identifications to authenticated;
grant all on public.piglet_identifications to service_role;
grant select,insert,update,delete on public.weaning_feed_schedules to authenticated;
grant all on public.weaning_feed_schedules to service_role;
create policy "members all piglet identifications" on public.piglet_identifications for all to authenticated using(public.is_member()) with check(public.is_member());
create policy "members all weaning feed schedules" on public.weaning_feed_schedules for all to authenticated using(public.is_member()) with check(public.is_member());
