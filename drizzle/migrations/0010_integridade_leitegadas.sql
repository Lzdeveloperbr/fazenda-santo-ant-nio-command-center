-- Validate litter movements against the current live piglet balance.
-- This runs before the existing apply_litter_event trigger updates counters.
create or replace function public.validate_litter_event_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_live integer;
  current_status text;
begin
  if new.event_type in ('morte','transferencia_saida','transferencia_entrada','desmame')
     and new.quantity <= 0 then
    raise exception 'Informe uma quantidade maior que zero para este evento.';
  end if;

  select greatest(0, born_alive - deaths + transfers_in - transfers_out),
         status
    into current_live, current_status
    from public.litters
   where id = new.litter_id
   for update;

  if not found then
    raise exception 'Leitegada não encontrada.';
  end if;

  if current_status = 'desmamada' then
    raise exception 'Esta leitegada já foi desmamada; não é possível lançar novos movimentos.';
  end if;

  if new.event_type in ('morte','transferencia_saida','desmame')
     and new.quantity > current_live then
    raise exception 'Quantidade informada (%) maior que o saldo atual de leitões vivos (%).',
      new.quantity, current_live;
  end if;

  return new;
end;
$$;

create trigger litter_event_balance_guard
before insert on public.litter_events
for each row execute function public.validate_litter_event_balance();

-- Preserve historical records: only prevent impossible future entries.
