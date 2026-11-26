-- 0020 — Registro das perguntas ao Santo Antônio AI
--
-- Não destrutiva. Cada pergunta e resposta fica registrada (quem perguntou,
-- quando, se a resposta veio do cálculo local ou da IA). Qualquer membro ativo
-- pode perguntar, inclusive o perfil Consulta; ninguém altera o registro.

create table if not exists public.ai_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(trim(question)) between 2 and 1000),
  answer text,
  mode text not null check (mode in ('local', 'ia', 'erro')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_questions_user_idx on public.ai_questions (created_by, created_at desc);

alter table public.ai_questions enable row level security;
revoke all on table public.ai_questions from public, anon, authenticated;
grant select, insert on table public.ai_questions to authenticated;
grant all on table public.ai_questions to service_role;
drop policy if exists "proprias ou gestao leem" on public.ai_questions;
create policy "proprias ou gestao leem" on public.ai_questions
  for select to authenticated using (public.is_member() and (created_by = auth.uid() or public.can_view_audit()));
drop policy if exists "membro pergunta" on public.ai_questions;
create policy "membro pergunta" on public.ai_questions
  for insert to authenticated with check (public.is_member() and created_by = auth.uid());
drop policy if exists "perfil insere" on public.ai_questions;
drop policy if exists "perfil altera" on public.ai_questions;
drop policy if exists "perfil exclui" on public.ai_questions;
-- Mesmo padrão das demais tabelas; aqui inserir exige só ser membro ativo.
create policy "perfil insere" on public.ai_questions as restrictive for insert to authenticated with check (public.is_member());
create policy "perfil altera" on public.ai_questions as restrictive for update to authenticated using (false);
create policy "perfil exclui" on public.ai_questions as restrictive for delete to authenticated using (public.can_delete());
drop trigger if exists audit_log on public.ai_questions;
create trigger audit_log after insert or update or delete on public.ai_questions
  for each row execute function public.write_audit_log();
