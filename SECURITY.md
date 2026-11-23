# Segurança do projeto

## Regra para variáveis de ambiente

- Nunca versionar `.env`, `.env.local`, `.dev.vars`, tokens, senhas, chaves privadas ou dumps com credenciais.
- O arquivo `.env.example` é somente um modelo com marcadores fictícios; copie-o para `.env` local e preencha os valores fora do Git.
- No navegador, usar somente URL do projeto e chave publicável do Supabase. Nunca usar `service_role`, `sb_secret_*`, senha de banco ou chave da OpenAI em código `VITE_*`.
- Segredos da Edge Function devem ser configurados no gerenciador de secrets do Supabase, nunca no bundle frontend.
- Não compartilhar prints de configurações que mostrem valores de chaves.

## Incidente: arquivo de ambiente versionado

Foi identificado um arquivo `.env` no histórico versionado do repositório. A revisão do diff desse arquivo mostrou somente identificador do projeto, URL do Supabase e chave publicável (`publishable`), sem chave `service_role`, senha de banco ou segredo de API nesse conteúdo. Esses dados de configuração não são credenciais secretas; a chave publicável é projetada para uso no cliente. O arquivo foi removido do estado atual nesta branch e as regras do `.gitignore` foram reforçadas. Ainda assim, confira localmente se outros commits, arquivos ou ambientes continham segredos diferentes.

### Ações obrigatórias antes de publicar

1. Conferir localmente o histórico e os ambientes de deploy para garantir que nenhum outro arquivo continha segredos diferentes; não copiar valores para issues, commits ou mensagens.
2. Rotacionar/revogar somente se for encontrado algum segredo real exposto, como chave `service_role`, senha de banco, token privado ou chave de API.
3. Como a configuração identificada contém chave publicável, revisar RLS, grants e policies; a chave publicável não é um segredo, mas nunca substitui autorização no banco.
4. Atualizar os secrets no ambiente de deploy e nas Edge Functions depois da rotação.
5. Verificar logs de autenticação, API, banco e provedor de IA para uso não reconhecido.
6. Fazer um novo commit sem o arquivo e confirmar que `.env` está ignorado.
7. Avaliar com cuidado a limpeza do histórico Git. O projeto é conectado ao Lovable; não reescrever histórico publicado nem fazer force-push sem um plano explícito de migração e backup, pois isso pode quebrar a sincronização e apagar histórico útil.

Apagar um arquivo no commit mais recente não remove cópias dos commits anteriores nem invalida credenciais. A rotação é a medida prioritária.

## Revisão Supabase antes de produção

- A migration `0008_farm_employee_access_code.sql` concede `SELECT` em `farm_access_codes` aos usuários autenticados membros e permite ler `code_hash`. O código de acesso não precisa ser exposto ao frontend para ser validado no trigger de cadastro. Planejar uma migration revisada para remover a leitura direta e, se a interface precisar exibir estado do convite, oferecer somente metadados não sensíveis por função controlada. Não alterar o banco de produção sem backup e validação em homologação.
- A Edge Function `vet-assistant` agora verifica o papel `member` antes de consultar dados da granja ou chamar o provedor de IA. Manter teste explícito para usuário autenticado sem associação.

- Habilitar RLS em todas as tabelas de schemas expostos.
- Revisar cada policy com o modelo real de acesso compartilhado da granja; `TO authenticated` isoladamente não define autorização suficiente.
- Revisar views, funções `SECURITY DEFINER`, triggers e Storage privado.
- Nunca usar `user_metadata` como fonte de autorização.
- Testar conta autorizada, conta sem papel de membro e sessão expirada.
- Fazer backup e testar restauração antes de aplicar migrations.
- Não considerar uma migration implantada apenas por existir no repositório.

Referências: [Supabase Product Security](https://supabase.com/docs/guides/security/product-security), [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) e [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).
