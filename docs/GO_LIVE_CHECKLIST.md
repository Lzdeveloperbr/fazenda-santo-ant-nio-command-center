# Checklist de homologação e lançamento

Este roteiro deve ser concluído no ambiente real antes de divulgar o sistema como pronto para produção. O código no GitHub, por si só, não comprova que migrations foram aplicadas, permissões estão corretas ou que o deploy está funcionando.

## 1. Banco de dados e segurança

- [ ] Fazer backup verificável do banco antes de qualquer migration.
- [ ] Conferir a sequência de migrations no repositório e no banco; não aplicar duas vezes nem pular versões.
- [ ] Aplicar migrations pendentes pelo fluxo oficial do projeto.
- [ ] Confirmar que todas as tabelas expostas têm RLS habilitado.
- [ ] Para tabelas novas no schema `public`, confirmar exposição explícita na Data API e os grants mínimos necessários; a exposição automática mudou em 30/10/2026. RLS e grants são controles complementares.
- [ ] Testar acesso com usuário autorizado e usuário sem papel de membro.
- [ ] Confirmar que dados da granja não ficam acessíveis a usuários não autorizados.
- [ ] Aplicar em homologação a migration `0013_restringe_codigo_acesso_granja.sql`; confirmar que authenticated não consegue ler `farm_access_codes` e que o cadastro com código válido/inválido continua funcionando.
- [ ] Confirmar que a Edge Function `vet-assistant` rejeita usuário autenticado sem papel `member` antes de consultar dados ou consumir a API de IA.
- [ ] Aplicar `0015_perfis_acesso_auditoria.sql` e seguir a validação da seção 7 de `docs/DIAGNOSTICO_ERP.md` (perfis, desativação, auditoria). Publicar a Edge Function `vet-assistant` só depois dela.
- [ ] Rodar `tests/db/run.sh` contra um PostgreSQL local descartável antes de cada migration nova.
- [ ] Revisar `farm_access_codes`: hashes de códigos de acesso não devem ser legíveis por usuários comuns; validar a correção em homologação antes de aplicar migration.
- [ ] Confirmar que o frontend usa somente a chave publicável; nunca colocar `service_role` ou segredo no navegador.
- [ ] Verificar regras de exclusão e vínculos antes de remover matrizes, leitegadas, lotes ou registros.
- [ ] Validar o fluxo de recuperação de senha, login, logout e expiração de sessão.

## 2. Dados reais e organização inicial

- [ ] Cadastrar as matrizes com identificação física conferida.
- [ ] Conferir cada matriz na baia e registrar a situação observada.
- [ ] Marcar como não confirmados os dados que ainda não têm comprovação.
- [ ] Não inventar data de nascimento, cobertura, parto, diagnóstico, vacina, medicamento ou mortalidade.
- [ ] Cadastrar as leitegadas atuais com números conferidos.
- [ ] Conferir baias, setores, capacidade e localização.
- [ ] Cadastrar os lotes ativos, origem, fase, data de entrada e quantidade atual.
- [ ] Cadastrar rações e saldos físicos de estoque.
- [ ] Registrar usuários e responsáveis da equipe.
- [ ] Definir quais informações serão obrigatórias na rotina diária.

## 3. Testes de aceitação por módulo

### Matrizes e reprodução
- [ ] Criar uma matriz de teste, editar e consultar sua ficha.
- [ ] Registrar cobertura, reprodutor/sêmen e diagnóstico.
- [ ] Conferir cálculo e exibição da previsão de parto.
- [ ] Registrar retorno ao cio, transferência, descarte e observações.
- [ ] Confirmar que históricos de outras matrizes não aparecem na ficha.

### Maternidade e desmame
- [ ] Registrar parto com nascidos totais, vivos, natimortos e mumificados quando aplicável.
- [ ] Registrar mortalidade, adoção e transferência de entrada/saída.
- [ ] Conferir saldo vivo da leitegada após cada evento.
- [ ] Registrar pesagem e desmame.
- [ ] Arquivar um cadastro de teste e confirmar que motivo, leitegada e eventos continuam na ficha histórica e deixam de compor os indicadores ativos.
- [ ] Conferir se a ficha da matriz mostra somente suas leitegadas.

### Sanidade
- [ ] Registrar ocorrência e acompanhamento.
- [ ] Conferir vacinação e medicamentos no escopo correto (grupo, matriz, leitegada ou leitão).
- [ ] Confirmar lote, validade, responsável, veterinário, prescrição e carência quando aplicáveis.
- [ ] Não usar a biblioteca como prescrição automática.
- [ ] Testar alertas de retorno e datas sem marcar aplicação como realizada automaticamente.

### Lotes, baias, ração e desempenho
- [ ] Criar lote de teste, registrar entrada, movimentação, mortalidade e saída.
- [ ] Conferir se o saldo de cabeças nunca fica negativo.
- [ ] Registrar entrada e consumo de ração; conferir saldo e estoque mínimo.
- [ ] Registrar duas pesagens e conferir GMD e datas.
- [ ] Conferir que unidades (kg, sacos, litros) não são somadas incorretamente.

### Tarefas, relatórios e financeiro
- [ ] Criar, atribuir, concluir, cancelar e filtrar tarefas; confirmar que canceladas permanecem no histórico.
- [ ] Estornar um lançamento financeiro de teste e confirmar que o original permanece, o lançamento compensatório aparece e os totais são neutralizados.
- [ ] Conferir datas vencidas e fuso horário local.
- [ ] Registrar receita e despesa de teste e validar o relatório mensal.
- [ ] Exportar CSV e abrir no Excel/Google Sheets.
- [ ] Imprimir ficha de matriz e relatório financeiro.

### Auditoria e Mutirão
- [ ] Conferir matriz sem auditoria física.
- [ ] Conferir registro não confirmado e registro antigo.
- [ ] Validar alertas de status sem histórico compatível.
- [ ] Exportar pendências e confirmar que a auditoria não altera os dados originais.

## 4. Testes de uso real

- [ ] Testar em Android, no navegador usado dentro do galpão.
- [ ] Testar telas pequenas, teclado numérico, datas e formulários longos.
- [ ] Testar conexão instável e mensagens de erro; não repetir lançamentos sem verificar se o primeiro salvou.
- [ ] Testar duas pessoas registrando eventos ao mesmo tempo.
- [ ] Confirmar que os botões de salvar, editar, excluir, exportar e imprimir fazem o que prometem.
- [ ] Verificar carregamento, estados vazios, erros e atualização dos indicadores.
- [ ] Testar com dados de demonstração e removê-los antes do uso oficial, sem apagar dados reais.

## 5. Build e publicação

- [ ] Executar `npm run lint`.
- [ ] Executar `npm run test`.
- [ ] Executar `npm run build`.
- [ ] Revisar avisos e erros do console.
- [ ] Confirmar variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente de produção.
- [ ] Confirmar domínio, HTTPS, favicon, título e descrição.
- [ ] Fazer deploy e testar login e operações no endereço publicado.
- [ ] Confirmar backup automático e testar restauração em ambiente separado.
- [ ] Guardar versão/tag do lançamento e plano de reversão.

## 6. Pendência sanitária individual

A funcionalidade de prontuário sanitário por matriz/leitegada/leitão foi integrada à branch principal pelo PR #11. A migration `0011_rastreabilidade_sanitaria_individual.sql` ainda precisa ser aplicada e verificada no Supabase de produção antes de considerar o recurso disponível.

PR integrado: https://github.com/Lzdeveloperbr/fazenda-santo-ant-nio-command-center/pull/11

Não cadastrar dados individuais nessa funcionalidade antes de confirmar que a migration está aplicada no banco.

## 7. Fontes de referência para evolução do produto

- PigCHAMP — reprodução, maternidade, dados móveis, relatórios e rastreabilidade: https://www.pigchamp.com/
- Suinotec — gestão da granja, lotes, matrizes, maternidade, estoque e desempenho: https://www.suinotec.com.br/
- MeuSuíno — indicadores zootécnicos, fichas de matrizes, reprodutores e lotes: https://sossuinos.com.br/Sistema%20MeuSuino.html
- Embrapa — produção, instalações, manejo e publicações técnicas: https://www.atermaisdigital.cnptia.embrapa.br/web/suinos/producao
- MAPA — Programa Nacional de Sanidade dos Suídeos: https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/sanidade-suidea/programa-nacional-de-sanidade-suidea-pnss

As referências servem para orientar a evolução do sistema. Metas produtivas, calendário sanitário, protocolos e procedimentos precisam ser adequados à genética, à realidade da granja, à legislação vigente e ao médico-veterinário responsável.
