# Santo Antônio AI — configuração necessária

A interface, o esquema de dados e a função de backend estão no repositório. Para habilitar análises reais, conclua estas etapas no projeto Supabase/Lovable:

1. Aplicar a migration `drizzle/migrations/0006_ia_veterinaria_farmacia.sql`.
2. Fazer deploy da Edge Function `supabase/functions/vet-assistant/index.ts` com o nome `vet-assistant`.
3. Cadastrar `OPENAI_API_KEY` como secret da Edge Function. Nunca colocar essa chave em variável `VITE_*`, no frontend ou no Git.
4. Opcionalmente cadastrar `OPENAI_MODEL`; o padrão é `gpt-4o-mini`.
5. Confirmar que a função recebe JWT de usuário autenticado e que o bucket privado `veterinary-evidence` foi criado pela migration.
6. Testar cadastro de medicamento, entrada/saída de lote, envio de análise e consulta do histórico com uma conta membro.

## O que está implementado

- Cadastro de medicamentos e informações de bula/uso transcritas.
- Lotes, validade, unidade e quantidade em estoque.
- Entradas e saídas de estoque com bloqueio de saldo insuficiente.
- Upload privado de imagem de ocorrência.
- Assistente sanitário que consulta inventário, histórico sanitário e contexto informado.
- Persistência de análises.
- Estrutura para registros de tratamento veterinário.

## Limites deliberados de segurança

A função não prescreve medicamentos, não seleciona tratamento, não calcula ml ou mg/kg e não altera prescrições. A lista de medicamentos é apresentada como inventário para avaliação do veterinário. Não usar o resultado da IA como diagnóstico ou prescrição.

## Validação antes da produção

Executar `npm run build`, `npm run lint` e `npm test`. Testar RLS, Storage privado, função sem secret, função com secret, lote vencido e tentativa de saída maior que o saldo.
