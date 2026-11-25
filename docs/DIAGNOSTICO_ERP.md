# Diagnóstico e plano de evolução para ERP — Fazenda Santo Antônio

**Data do levantamento:** 25/11/2026 · **Base:** branch `claude/ja-tem-acesso-075ixl`, commit `863bb7a` + Fase 1 deste documento.

Este documento compara o pedido "Projeto Master" (24 seções) com o que **existe e funciona no código hoje**, e define a ordem de entrega. Tela existente não conta como funcionalidade concluída: só está marcado como pronto o que tem gravação real no banco, regra validada e teste.

## 1. Linha de base técnica (antes de qualquer alteração)

| Verificação | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | 0 erros |
| Testes (`vitest`) | 45 testes, 8 arquivos, todos passando |
| Build (`vite build`) | OK |
| Lint (`eslint .`) | ~4.600 avisos pré-existentes, quase todos formatação (prettier) e `any`; não bloqueiam build |
| Migrations 0000–0014 | Aplicadas sem erro em PostgreSQL 16 local com esqueleto do Supabase (`tests/db/run.sh`) |
| Stack | React 19, TypeScript, Tailwind 4, TanStack Start/Router/Query, Supabase, Recharts, three.js — preservada |

**Ponto de atenção de segurança:** existe um `.env` no repositório. O `docs/PLANO_EVOLUCAO_OPERACIONAL.md` já recomenda rotacionar credenciais que tenham sido versionadas; isso continua pendente e deve ser feito no painel do Supabase/Lovable (não por código).

## 2. Modelo de dados atual

38 tabelas, todas com RLS por `is_member()` (granja única compartilhada). Equivalências com a lista proposta na seção 24 — **não criar duplicatas**:

| Proposta | Já existe como |
|---|---|
| sows / animals | `sows` (campos mínimos: brinco, nome, raça, nascimento, situação, observações) |
| boars | `boars` |
| breeding_events / inseminations | `breedings` (ciclo, status, heat_check) + `gestation_events` |
| pregnancy_checks | `pregnancy_diagnoses` |
| farrowings / litters | `litters` (vinculada a `breedings`) + livro `litter_events` |
| piglets | `piglet_identifications` (marcação australiana) |
| weaning_events | evento `desmame` em `litter_events` + `weaning_feed_schedules` |
| pens / buildings / sectors | `farm_pens` (código + setor texto) + `pen_records` |
| health_records / treatments / vaccinations | `health_records`, `health_events`, `veterinary_treatment_records`, `medication_records`, `vaccination_records`, `health_samples` |
| medications / medication_stock | `farm_medications`, `farm_medication_lots`, `farm_medication_movements` |
| feed_types / feed_records / inventory | `feed_products`, `feed_movements`, `batch_feed_products`, `batch_feed_movements` |
| financial_transactions | `finance_entries` (receita/despesa, vencimento, pago/pendente, lote) |
| tasks | `tasks` |
| profiles / roles / permissions / users | `profiles`, `user_roles`, **`user_access` (novo, Fase 1)** |
| audit_logs | **`audit_logs` (novo, Fase 1)** |
| farms / farm_settings | não existe — hoje é uma granja só |
| suppliers, employees, notifications, reports | não existem como tabela |

## 3. Situação por seção do pedido

Legenda: ✅ funciona · 🟡 parcial · ❌ não existe

| # | Seção | Situação | O que existe / o que falta |
|---|---|---|---|
| 1 | Preservar projeto | ✅ | Análise feita; mudanças incrementais e não destrutivas |
| 2 | Dashboard | 🟡 | `/painel` com indicadores reais e filtros de período; `/inteligencia` com pendências. Faltam vários indicadores financeiros/estoque no painel e alertas de ferro/vacina por leitão |
| 3 | Prontuário da matriz | 🟡 | Ficha `/matrizes/$sowId` com histórico, PDF por impressão, 3D. Faltam linhagem, origem, pai/mãe, entrada, baia/lote vinculados, peso, foto, QR Code e as 15 situações (hoje 7) |
| 4 | Reprodução | 🟡 | Ciclos, cio, retorno, reprodutores, calendário, indicadores. Faltam lote/doses de sêmen estruturados, término de cio e parâmetros configuráveis por granja (hoje fixos no código) |
| 5 | Gestação | ✅/🟡 | Diagnósticos, perdas, alertas derivados de datas, linha do tempo. Falta condição corporal e alimentação por matriz |
| 6 | Maternidade | 🟡 | Partos, mortalidade, adoções, pesagens, desmame validado. Faltam hora início/fim, duração, assistência, mumificados/refugos separados, ficha de mortalidade com dia da semana/idade |
| 7 | Leitões | 🟡 | Contagem por leitegada e identificação australiana. Falta prontuário individual completo (sexo, peso, ferro, castração por leitão) |
| 8 | Desmame | 🟡 | `/desmame` com marcação e desmame; faltam destino, sexo, intervalo desmame-cio por matriz |
| 9 | Sanidade | 🟡 | Registros, ocorrências, tratamentos veterinários vinculados a lote de medicamento, carência informada. Falta calendário sanitário com protocolos configuráveis |
| 10 | Estoque e farmácia | 🟡 | Ração e farmácia com lotes, validade e movimentos. Falta estoque geral (seringas, limpeza, equipamentos), fornecedores e NF |
| 11 | Ração e nutrição | 🟡 | Rações, movimentos, consumo por baia/lote. Faltam planos por fase e histórico por matriz |
| 12 | Baias | 🟡 | `/baias` + Granja 3D com ocupação. Falta hierarquia setor › galpão › sala › baia e bloqueio de lotação acima da capacidade em todas as entradas |
| 13 | Descarte e mortalidade | 🟡 | Eventos de descarte/morte, mapa de calor. Faltam destino, valor de venda e relatórios por setor/baia/lote |
| 14 | Indicadores | 🟡 | `/desempenho` com indicadores reais. Faltam comparativos mês×mês, ano×ano e exportação |
| 15 | Financeiro | 🟡 | Receitas/despesas, pendente/pago, custo por leitão, relatório mensal. Faltam contas a pagar/receber completas, fornecedores, centros de custo, fluxo de caixa |
| 16 | Calendário | 🟡 | Calendário reprodutivo e tarefas. Falta agenda geral dia/semana/mês unificada e "quem executou" em todas as tarefas |
| 17 | Santo Antônio AI | 🟡 | Edge Function `vet-assistant` (organiza observações, não prescreve). Falta assistente de perguntas sobre os dados |
| 18 | Relatórios | 🟡 | Impressão/PDF e CSV em alguns módulos. Falta central única, Excel e filtros padronizados |
| 19 | Usuários e permissões | ✅ **Fase 1** | Ver seção 4 |
| 20 | PWA | 🟡 | Manifest, ícones, service worker de cache estático, botão instalar. Falta modo offline com fila de sincronização |
| 21 | Design | 🟡 | Sidebar, tema claro/escuro, cards. Ajustes contínuos por módulo |
| 22 | Busca global | ✅ **Fase 1** | Ctrl+K busca matrizes, reprodutores, baias, lotes, medicamentos e tarefas reais |
| 23 | Auditoria | ✅ **Fase 1** | Ver seção 4 |
| 24 | Banco de dados | 🟡 | Integridade e RLS existentes; isolamento multi-granja não existe (ver decisão pendente) |

## 4. Fase 1 — entregue neste ciclo

**Segurança e rastreabilidade (seções 19, 22 e 23):**

- Migration `0015_perfis_acesso_auditoria.sql` (não destrutiva):
  - Tabela `user_access` com perfis **Administrador, Gerente, Veterinário, Funcionário, Consulta**, ativo/inativo e último acesso.
  - Regras aplicadas **no banco** por políticas RLS restritivas em todas as 35 tabelas da granja: Consulta não grava; só Administrador/Gerente excluem; usuário desativado deixa de ler qualquer dado.
  - `delete_sow` exige Administrador/Gerente; gerar código de convite exige Administrador.
  - Tabela `audit_logs` imutável: usuário, perfil, data/hora, ação, tabela, registro, campos alterados, valor anterior, valor novo e origem (aplicativo, cálculo automático do banco, sistema).
  - Migração dos usuários atuais: os dois primeiros membros viram Administrador; os demais, Funcionário.
- Telas novas: **Equipe e permissões** (`/usuarios`) e **Histórico de alterações** (`/historico`), visíveis só para Administrador/Gerente.
- Aviso de modo somente leitura para o perfil Consulta; botões de excluir matriz ocultos para quem não pode excluir.
- Edge Function `vet-assistant` passou a usar `can_write()` (desativados e Consulta não consomem a IA).
- Busca global com dados reais.
- Testes: 8 novos testes de unidade + teste SQL de RLS/auditoria em PostgreSQL real (`tests/db/run.sh`).

## 5. Próximas fases (ordem recomendada)

Cada fase: migration revisada + teste SQL, telas, testes de unidade, build, e registro neste documento.

1. **Fase 2 — Prontuário da matriz e cadastros base:** novos campos em `sows` (linhagem, origem, pai/mãe, entrada, baia, lote, peso, foto, QR Code), situações ampliadas com mapeamento das atuais, hierarquia de instalações e parâmetros da granja configuráveis (`farm_settings`: dias de diagnóstico, gestação, desmame).
2. **Fase 3 — Maternidade e leitões detalhados:** dados de parto (hora, duração, assistência, mumificados, refugos), ficha de mortalidade completa, prontuário individual de leitão, desmame com destino e sexo.
3. **Fase 4 — Estoque geral, fornecedores e financeiro:** estoque multi-categoria com bloqueio de saída acima do saldo, fornecedores, NF, contas a pagar/receber, centros de custo e fluxo de caixa.
4. **Fase 5 — Agenda unificada, calendário sanitário e relatórios:** agenda dia/semana/mês, protocolos sanitários configuráveis (validados por veterinário), central de relatórios com PDF/Excel/CSV.
5. **Fase 6 — Santo Antônio AI de dados e PWA offline:** perguntas sobre os dados respeitando permissões; fila offline com chave de idempotência e indicação clara de "salvo só no aparelho".

## 6. Decisões que dependem do proprietário

- **Multi-granja (seção 24, "isolamento por granja"):** hoje o sistema é de uma granja só. Isolar por granja exige `farm_id` em todas as tabelas e reescrever todas as políticas. Recomendação: só fazer se houver plano real de atender outras granjas.
- **Restrição de leitura por perfil:** hoje todo perfil ativo lê todos os módulos (Consulta inclusive). Se o Funcionário não deve ver o financeiro, por exemplo, isso precisa ser definido módulo a módulo.
- **Protocolos sanitários, doses e carências:** precisam ser fornecidos e validados pelo médico-veterinário responsável; o sistema não terá valores padrão inventados.

## 7. Como validar a Fase 1 em homologação

1. Backup do banco.
2. Aplicar `0015_perfis_acesso_auditoria.sql` pelo fluxo oficial (Lovable/Supabase).
3. Entrar como um dos fundadores: menu Gestão deve mostrar **Equipe e permissões** e **Histórico de alterações**.
4. Mudar um funcionário de teste para **Consulta** e confirmar que ele vê os dados, vê o aviso e não consegue salvar.
5. Desativar o usuário de teste e confirmar que ele não vê dados.
6. Editar uma matriz e conferir o registro no Histórico com valor anterior e novo.
7. Publicar a Edge Function `vet-assistant` **depois** da migration (ela usa `can_write()`).
