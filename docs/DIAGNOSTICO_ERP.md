# Diagnóstico e plano de evolução para ERP — Fazenda Santo Antônio

**Data do levantamento:** 25/11/2026 (atualizado em 26/11/2026 com as Fases 1 a 6) · **Base:** branch `claude/ja-tem-acesso-075ixl`.

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
| 2 | Dashboard | ✅ **Fase 5** | Painel com filtros de período, situação do plantel (15 estados), taxas de parto/concepção, estoque, consumo diário de ração, financeiro, gráficos de 12 meses e alertas inteligentes |
| 3 | Prontuário da matriz | ✅ **Fase 2** | Ver seção 4.1. Falta histórico de mudanças de baia como evento próprio (hoje aparece no Histórico de alterações) |
| 4 | Reprodução | ✅ **Fase 7** | Ciclos, retorno, reprodutores, calendário, indicadores, prazos no banco; observação de cio com início/fim, intensidade e sinais; lotes de sêmen com controle de doses e validade |
| 5 | Gestação | ✅ **Fase 7** | Diagnósticos, perdas, alertas, linha do tempo; condição corporal (escore, toucinho) e alimentação por matriz |
| 6 | Maternidade | ✅ **Fase 3** | Parto com início/fim, responsável, intercorrências, mumificados, refugos e baia; ficha de mortalidade completa; indicadores com denominadores |
| 7 | Leitões | ✅ **Fase 3** | Prontuário individual (sexo, peso, condição, colostragem, ferro, cauda, castração, baia, morte, desmame), pendências, visão por leitegada e adoções |
| 8 | Desmame | ✅ **Fases 3 e 5** | Desmame com machos/fêmeas, peso, destino e baia; idade, peso, mortalidade pré-desmame e intervalo desmame-cio calculados |
| 9 | Sanidade | ✅ **Fase 5** | Protocolos sanitários configuráveis (sem nenhum valor pronto), que só geram lembretes depois de validados por veterinário/gestão; alteração exige nova validação |
| 10 | Estoque e farmácia | ✅ **Fase 4** | Estoque geral (`/almoxarifado`) com entrada, saída, devolução, transferência e ajuste de inventário (só gestão), lote, validade, NF, custo, fornecedor; saldo só por movimentação; saída acima do saldo recusada; alertas consolidados de materiais, ração e farmácia |
| 11 | Ração e nutrição | ✅ **Fase 7** | Rações, consumo por baia/lote, histórico por matriz; planos por fase que só ficam vigentes depois de validados pelo responsável técnico |
| 12 | Baias | ✅ **Fase 7** | Galpão/sala, lotação controlada, mapa 2D interativo por setor › galpão › sala com cores de ocupação e atenção, detalhe da baia (animais, lote, histórico) |
| 13 | Descarte e mortalidade | ✅ **Fases 3–4** | `/mortalidade` com leitões, matrizes e lotes; descarte com destino, valor de venda e lançamento opcional da receita |
| 14 | Indicadores | ✅ **Fase 5** | Relatório de indicadores com período atual × anterior × ano anterior e base de cálculo; matriz × média do plantel; GMD e conversão por lote quando há dados; exportação |
| 15 | Financeiro | ✅ **Fase 4** | Contas a pagar/receber com baixa e atraso, fluxo de caixa com realizado e previsto separados, centros de custo, custo por lote, fornecedores, documento/NF |
| 16 | Calendário | ✅ **Fase 5** | `/agenda` dia/semana/mês com previsões marcadas, protocolos, vacinas, tratamentos, desmames, contas, validades e tarefas; conclusão registra quem executou; sino de lembretes no topo |
| 17 | Santo Antônio AI | ✅ **Fase 6** | `/assistente`: perguntas frequentes calculadas direto dos registros; perguntas livres pela IA (Edge Function `farm-assistant`) usando só o resumo dos dados que o usuário pode ver; resumo do dia, tendências e possíveis falhas de registro; perguntas registradas |
| 18 | Relatórios | ✅ **Fase 5** | `/relatorios` com os 18 relatórios, filtros de período/matriz/lote/usuário, PDF com identidade da fazenda, Excel (.xlsx), CSV e impressão |
| 19 | Usuários e permissões | ✅ **Fase 1** | Ver seção 4 |
| 20 | PWA | ✅ **Fase 6** | Manifest "Fazenda Santo Antônio" com ícones PNG (Android, maskable, iPhone) e atalhos; service worker com páginas offline; fila de registros sem conexão com idempotência, indicador de sincronização e revisão de recusas |
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

## 4.1 Fase 2 — entregue

**Prontuário da matriz e parâmetros da granja (seções 3 e 4):**

- Migration `0016_prontuario_matriz_parametros.sql` (não destrutiva, só adiciona):
  - Novos campos opcionais em `sows`: linhagem, origem, pai, mãe, entrada na granja, baia (vínculo com `farm_pens`), lote/grupo, peso com data, categoria (leitoa / em preparação / matriz), condição sanitária (observação / tratamento / recuperação), foto e arquivamento com motivo.
  - Regras no banco: entrada não antes do nascimento, peso entre 0 e 500 kg sempre com data, valores de categoria/condição válidos, arquivar exige motivo e perfil Administrador/Gerente (registra quem arquivou).
  - `farm_settings` (linha única): prazos reprodutivos da granja. Antes ficavam no `localStorage` de cada aparelho, então cada celular podia mostrar alertas diferentes. Diagnóstico, transferência para maternidade e idade de desmame ficam **vazios até o responsável técnico configurar**.
  - Bucket privado `sow-photos` (até 5 MB, JPG/PNG/WebP).
- **Situação atual com 15 estados derivados dos registros** (leitoa, em preparação, cio identificado, inseminada, gestante, vazia, transferida, pré-parto, em maternidade, em lactação, desmamada, descartada, morta + condição em tratamento/recuperação/observação), sempre com o motivo exibido. A coluna `status` continua sendo mantida pelos gatilhos existentes, sem conflito.
- Ficha da matriz: foto (câmera no celular), **QR Code que abre a ficha**, todos os campos novos, idade, ordem de parto, editar, arquivar/reativar e **linha do tempo completa** com filtros (coberturas, diagnósticos, ocorrências de gestação, partos, eventos de leitegada, desmames, vacinas, medicamentos e ocorrências).
- Formulário único de cadastro/edição com validação igual à do banco.
- Lista de matrizes: filtro "Cadastros arquivados". Arquivados saem das listas e indicadores, mas a ficha continua acessível.
- Gestação › Configurações grava no banco para toda a granja; só Administrador/Gerente edita.
- Testes: 15 novos de unidade + teste SQL da 0016. Telas conferidas no navegador com dados simulados.

## 4.2 Fase 3 — entregue

- Migration `0017_maternidade_leitoes_instalacoes.sql` (só adiciona): refugos e baia no parto; motivo, peso, responsável, leitão, sexo, destino e vínculo entre leitegadas nos eventos; manejo individual do leitão; galpão/sala nas baias; função `transfer_piglets` (adoção em uma única operação); bloqueio de lotação de matrizes acima da capacidade, exceto Administrador/Gerente.
- O saldo da leitegada continua vindo só do livro de eventos; os novos campos apenas detalham.
- Maternidade: morte exige motivo observado (lista fixa, com aviso de que não é diagnóstico), desmame com sexo/peso/destino, botão "Adoção entre matrizes".
- Telas novas: **Leitões** e **Mortalidade e descarte**.
- Exportação CSV padronizada (protegida contra fórmulas) e seletor de período reutilizável.

## 4.3 Fase 4 — entregue

- Migration `0018_estoque_fornecedores_financeiro.sql`: `suppliers`, `stock_items`, `stock_movements` (imutáveis: sem alteração nem exclusão; correção por ajuste com motivo, só Administrador/Gerente); fornecedor, NF e custo nas entradas de ração e farmácia; centro de custo, data e forma de pagamento e documento no financeiro (pendente não pode ter data de pagamento); destino e valor de venda no descarte.
- Telas: **Estoque geral e fornecedores** e abas novas no Financeiro (contas, fluxo de caixa, custos).
- Pendências conhecidas: o saldo bancário inicial não existe no sistema (o fluxo acumulado começa em zero); ração e medicamentos só entram no custo do lote se tiverem lançamento financeiro.

## 4.4 Fase 5 — entregue

- Migration `0019_agenda_protocolos_sanitarios.sql`: `tasks.created_by/completed_by/notes` (preenchidos pelo banco), `health_protocols` com validação obrigatória (nome e registro de quem validou), perfil Veterinário pode gerenciar protocolos.
- Telas: **Agenda da granja**, **Central de relatórios** e complemento do **Painel**; sino de lembretes.
- Excel gerado no próprio navegador (`fflate`), validado com leitor de planilhas; texto nunca vira fórmula.

## 4.5 Fase 6 — entregue

- Migration `0020_assistente_perguntas.sql`: registro das perguntas (quem, quando, resposta local ou IA); qualquer membro ativo pergunta, ninguém altera.
- Edge Function `farm-assistant` (mesma chave `OPENAI_API_KEY` da `vet-assistant`; sem a chave, só as respostas calculadas funcionam). Limite de 30 perguntas por hora por usuário.
- Offline: funcionam sem conexão (com o app aberto) os eventos da Maternidade (morte, pesagem, adoção de entrada/saída, observação) e o Caderno de baia. Desmame exige conexão. Cada registro recebe um id no aparelho; reenvio não duplica. Recusas do servidor ficam para revisão, nunca são apagadas sozinhas.

## 4.6 Fase 7 — entregue

- Migration `0021_cio_semen_condicao_nutricao.sql`: `heat_detections`, `semen_batches` (doses consumidas pela cobertura; lote vencido ou sem doses recusado; corrigir a cobertura devolve doses), `breedings.semen_batch_id/semen_doses_used`, `sow_condition_records`, `feed_plans` (criação/alteração só por Administrador, Gerente ou Veterinário; mudar conteúdo derruba a validação).
- Telas: abas **Cio (início/fim)** e **Sêmen** em Gestação; lote de sêmen na nova cobertura; **Condição corporal e alimentação** na ficha; **Planos de alimentação** no Estoque de ração; aba **Mapa** em Baias.

## 5. Limitações conhecidas (honestas)

- **Abrir o app do zero sem internet** mostra o aviso de sem conexão: o aparelho não guarda cópia do banco (decisão de privacidade). A fila offline serve para quedas de conexão com o app já aberto.
- **Telas autenticadas não foram testadas contra o banco real**: foram conferidas no navegador com dados simulados, e as regras do banco foram testadas num PostgreSQL local com as mesmas migrations. É preciso aplicar as migrations 0015–0020 em homologação e seguir a seção 7.
- **Lint completo** ainda acusa os avisos de formatação/`any` que já existiam; os arquivos novos passam no lint, salvo divergências de formatação entre o prettier e o plugin do eslint.
- **Taxa anual de mortalidade/descarte de matrizes** depende do plantel médio histórico, que o sistema ainda não guarda; aparecem as contagens.
- **Multi-granja** não implementado (ver decisão abaixo).

## 6. Decisões que dependem do proprietário

- **Multi-granja (seção 24, "isolamento por granja"):** hoje o sistema é de uma granja só. Isolar por granja exige `farm_id` em todas as tabelas e reescrever todas as políticas. Recomendação: só fazer se houver plano real de atender outras granjas.
- **Restrição de leitura por perfil:** hoje todo perfil ativo lê todos os módulos (Consulta inclusive). Se o Funcionário não deve ver o financeiro, por exemplo, isso precisa ser definido módulo a módulo.
- **Protocolos sanitários, doses e carências:** precisam ser fornecidos e validados pelo médico-veterinário responsável; o sistema não terá valores padrão inventados.

## 7. Como validar a Fase 1 em homologação

1. Backup do banco.
2. Aplicar, em ordem, `0015` a `0021` pelo fluxo oficial (Lovable/Supabase). Antes, rodar `tests/db/run.sh` num PostgreSQL local descartável.
3. Entrar como um dos fundadores: menu Gestão deve mostrar **Equipe e permissões** e **Histórico de alterações**.
4. Mudar um funcionário de teste para **Consulta** e confirmar que ele vê os dados, vê o aviso e não consegue salvar.
5. Desativar o usuário de teste e confirmar que ele não vê dados.
6. Editar uma matriz e conferir o registro no Histórico com valor anterior e novo.
7. Publicar as Edge Functions `vet-assistant` e `farm-assistant` **depois** das migrations (usam `can_write()` / `access_role()`).
8. Aplicar `0016_prontuario_matriz_parametros.sql`. Em Gestação › Configurações, conferir os prazos e preencher diagnóstico, transferência e desmame se o responsável técnico definir. Atenção: prazos que alguém tenha mudado antes no próprio aparelho não são copiados automaticamente; confira e salve uma vez.
9. Abrir uma matriz, editar os novos campos, enviar uma foto pelo celular e ler o QR Code com a câmera.
