-- 0024: quem pode mudar um problema relatado.
-- Antes qualquer membro podia alterar status/resolução de qualquer relato.
-- Agora: o autor (para corrigir o próprio texto enquanto aberto) ou administrador/gerente
-- (triagem e resolução). Não apaga nem altera dados.

drop policy if exists "membros atualizam problemas" on public.issue_reports;
create policy "membros atualizam problemas" on public.issue_reports for update to authenticated
  using (public.is_member() and (public.can_delete() or created_by = auth.uid()))
  with check (public.is_member() and (public.can_delete() or created_by = auth.uid()));

create or replace function public.guard_issue_report()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.created_by is distinct from old.created_by then raise exception 'O autor do relato não pode ser trocado.'; end if;
  if (new.status, new.resolution) is distinct from (old.status, old.resolution) and not public.can_delete() then
    raise exception 'Somente administrador ou gerente muda a situação do relato.';
  end if;
  if (new.title, new.description, new.category) is distinct from (old.title, old.description, old.category)
     and (old.created_by is distinct from auth.uid() or old.status <> 'aberto') then
    raise exception 'Só o autor edita o relato, e apenas enquanto está aberto.';
  end if;
  new.resolved_at := case when new.status in ('resolvido', 'descartado') then coalesce(old.resolved_at, now()) else null end;
  return new;
end $$;
drop trigger if exists guard_issue_report on public.issue_reports;
create trigger guard_issue_report before update on public.issue_reports for each row execute function public.guard_issue_report();
