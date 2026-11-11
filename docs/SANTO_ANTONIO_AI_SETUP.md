# Santo Antônio AI — configuração necessária

A interface, o esquema de dados e a função de backend estão no repositório. Para habilitar análises reais, conclua estas etapas no projeto Supabase/Lovable:

1. Conferir a sequência e aplicar as migrations `0001` a `0007` na ordem do journal. A migration `0001_suinocultura_operacao.sql`, que já era referenciada pelo journal mas estava ausente da árvore de arquivos, foi restaurada nesta branch.
2. Fazer deploy da Edge Function `supabase/functions/vet-assistant/index.ts` com o nome `vet-assistant`.
3. Cadastrar `OPENAI_API_KEY` como secret da Edge Function. Nunca colocar essa chave em variável `VITE_*`, no frontend ou no Git.
4. Opcionalmente cadastrar `OPENAI_MODEL`; o padrão é `gpt-4o-mini`.
5. Confirmar que a função recebe JWT de usuário autenticado e que o bucket privado `veterinary-evidence` foi criado pela migration.
6. Testar cadastro de medicamento, entrada/saída de lote, envio de análise e consulta do histórico com uma conta membro.
7. O livro de movimentações é somente de inclusão para preservar auditoria; correções devem ser feitas por novo lançamento de ajuste.
8. Registrar tratamentos somente transcrevendo prescrição veterinária; o sistema acompanha status e datas de carência informadas, sem calcular dose.

## O que está implementado

- Cadastro de medicamentos e informações de bula/uso transcritas.
- Lotes, validade, unidade e quantidade em estoque.
- Entradas e saídas de estoque com bloqueio de saldo insuficiente.
- Upload privado de imagem de ocorrência.
- Assistente sanitário que consulta inventário, histórico sanitário e contexto informado.
- Persistência de análises.
- Registro e acompanhamento de prescrições veterinárias, com datas de início/fim e carência informada.
- Livro de movimentações com trilha de auditoria e validação de unidade/lote.
- Alertas visuais para lotes vencidos e próximos do vencimento.
- Atalhos para registrar rotinas diárias e indicadores de tarefas abertas, de hoje e atrasadas.
- Testes unitários para marcação australiana e calendário automático de ração.
- Workflow GitHub Actions para build, lint e testes.

## Limites deliberados de segurança

A função não prescreve medicamentos, não seleciona tratamento, não calcula ml ou mg/kg e não altera prescrições. A lista de medicamentos é apresentada como inventário para avaliação do veterinário. Não usar o resultado da IA como diagnóstico ou prescrição.

## Validação antes da produção

Executar `bun run build`, `bun run lint` e `bun run test` (o workflow `.github/workflows/ci.yml` automatiza essas verificações em PRs e pushes para `main`). Testar RLS, Storage privado, função sem secret, função com secret, lote vencido e tentativa de saída maior que o saldo.
