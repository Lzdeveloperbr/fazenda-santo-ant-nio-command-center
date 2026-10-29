create type public.app_role as enum ('member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(), 'member') $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member() or id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

-- First two accounts become the farm members (the two brothers)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  if (select count(*) from public.user_roles where role = 'member') < 2 then
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table public.sows (
  id uuid primary key default gen_random_uuid(),
  ear_tag text not null,
  name text,
  breed text,
  birth_date date,
  status text not null default 'vazia',
  notes text,
  created_at timestamptz not null default now()
);
create table public.breedings (
  id uuid primary key default gen_random_uuid(),
  sow_id uuid not null references public.sows(id) on delete cascade,
  breeding_date date not null,
  boar text,
  pregnancy_check text not null default 'pendente',
  expected_farrowing date generated always as (breeding_date + 114) stored,
  created_at timestamptz not null default now()
);
create table public.litters (
  id uuid primary key default gen_random_uuid(),
  sow_id uuid not null references public.sows(id) on delete cascade,
  farrowing_date date not null,
  born_total int not null default 0,
  born_alive int not null default 0,
  stillborn int not null default 0,
  deaths int not null default 0,
  transfers_in int not null default 0,
  transfers_out int not null default 0,
  weaned int,
  weaning_date date,
  avg_weight numeric,
  status text not null default 'maternidade',
  created_at timestamptz not null default now()
);
create table public.litter_events (
  id uuid primary key default gen_random_uuid(),
  litter_id uuid not null references public.litters(id) on delete cascade,
  event_type text not null,
  quantity int not null default 0,
  value numeric,
  note text,
  event_date date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  priority text not null default 'media',
  sector text,
  due_date date,
  status text not null default 'pendente',
  completed_at timestamptz,
  assignee_id uuid references public.profiles(id) on delete set null,
  sow_id uuid references public.sows(id) on delete set null,
  litter_id uuid references public.litters(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['sows','breedings','litters','litter_events','tasks'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members all" on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

create or replace function public.apply_litter_event()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.event_type = 'morte' then
    update litters set deaths = deaths + new.quantity where id = new.litter_id;
  elsif new.event_type = 'transferencia_entrada' then
    update litters set transfers_in = transfers_in + new.quantity where id = new.litter_id;
  elsif new.event_type = 'transferencia_saida' then
    update litters set transfers_out = transfers_out + new.quantity where id = new.litter_id;
  elsif new.event_type = 'pesagem' then
    update litters set avg_weight = new.value where id = new.litter_id;
  elsif new.event_type = 'desmame' then
    update litters set weaned = new.quantity, weaning_date = new.event_date, status = 'desmamada' where id = new.litter_id;
  end if;
  return new;
end $$;
create trigger on_litter_event after insert on public.litter_events
for each row execute function public.apply_litter_event();