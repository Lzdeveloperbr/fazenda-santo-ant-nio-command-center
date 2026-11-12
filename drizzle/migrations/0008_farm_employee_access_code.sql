-- Shared access code for Fazenda Santo Antonio employees.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.farm_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.farm_access_codes enable row level security;
grant select on public.farm_access_codes to authenticated;
grant all on public.farm_access_codes to service_role;
create policy "members view farm access codes" on public.farm_access_codes
  for select to authenticated using (public.is_member());

create or replace function public.create_farm_access_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare normalized text := upper(regexp_replace(trim(coalesce(p_code,'')), '[^A-Z0-9]', '', 'g'));
begin
  if auth.uid() is null or not public.is_member() then
    raise exception 'Apenas membros autorizados podem gerar código.';
  end if;
  if length(normalized) < 8 or length(normalized) > 20 then
    raise exception 'Código inválido.';
  end if;
  update public.farm_access_codes set active = false where active;
  insert into public.farm_access_codes(code_hash, created_by)
  values (encode(digest(convert_to(normalized, 'UTF8'), 'sha256'), 'hex'), auth.uid());
end;
$$;
revoke all on function public.create_farm_access_code(text) from public;
grant execute on function public.create_farm_access_code(text) to authenticated;

-- Signup with a valid farm code joins the existing shared farm workspace.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  supplied_code text := upper(regexp_replace(trim(coalesce(new.raw_user_meta_data->>'farm_code','')), '[^A-Z0-9]', '', 'g'));
  invited boolean := false;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));

  if length(supplied_code) >= 8 then
    select exists (
      select 1 from public.farm_access_codes
      where active = true
        and code_hash = encode(digest(convert_to(supplied_code, 'UTF8'), 'sha256'), 'hex')
    ) into invited;
  end if;

  if invited or (select count(*) from public.user_roles where role = 'member') < 2 then
    insert into public.user_roles (user_id, role) values (new.id, 'member')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;
