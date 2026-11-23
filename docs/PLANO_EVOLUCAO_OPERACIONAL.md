# Plano de evolução operacional — Fazenda Santo Antônio

**Status:** plano de trabalho; itens marcados como propostos ainda não estão implementados.

## Direção do produto

Construir um centro de comando confiável para a rotina real da granja: poucos toques para registrar o manejo, histórico rastreável por matriz/leitegada/lote, alertas explicáveis e indicadores calculados exclusivamente com dados confirmados.

## O que já existe no repositório

- Matrizes, ficha individual, reprodução, coberturas, diagnósticos e previsão de parto.
- Maternidade, leitegadas, eventos de mortalidade/transferência, pesagens e desmame.
- Lotes, baias, ração, estoque, sanidade, farmácia e registros sanitários.
- Tarefas, financeiro, auditoria/mutirão, calculadoras, biblioteca técnica e visualização 3D.
- Testes unitários para regras reprodutivas, eventos de leitegada e indicadores.

Não duplicar esses módulos. Melhorar sua integração, confiabilidade, experiência móvel e trilha de auditoria.

## Prioridade 0 — segurança e lançamento

- [ ] Rotacionar credenciais reais que possam ter sido incluídas no `.env` versionado; a remoção do arquivo não limpa o histórico.
- [ ] Conferir RLS, policies, views, funções privilegiadas e buckets privados no Supabase real.
- [ ] Conferir migrations aplicadas no banco versus journal do repositório.
- [ ] Fazer backup verificável e testar restauração.
- [ ] Rodar lint, testes e build no ambiente de CI; registrar falhas reais em vez de ignorá-las.
- [ ] Validar fluxo de login, convite, acesso de funcionário, logout e recuperação de senha.

## Prioridade 1 — rotina diária rápida

- [ ] Transformar rotinas por setor em checklists reutilizáveis: gestação, maternidade, leitões, água/ração, ambiência, limpeza e biosseguridade.
- [ ] Permitir adicionar uma rotina inteira ao dia sem criar tarefas duplicadas.
- [ ] Facilitar o registro no celular com botões grandes, campos numéricos, data local e poucos campos obrigatórios.
- [ ] Criar fechamento de turno com pendências, mortalidade, partos, transferências, consumo e ocorrências; nunca preencher valores ausentes com zero.
- [ ] Mostrar claramente quem registrou, quando registrou e quem conferiu.

## Prioridade 2 — maternidade e leitões

- [ ] Painel de leitegadas com saldo vivo calculado a partir do evento de origem e do livro de eventos.
- [ ] Linha do tempo por leitegada: parto, adoções, transferências, mortalidade, pesagens e desmame.
- [ ] Alertas de dados inconsistentes: soma de nascidos, saldo negativo, evento repetido e datas incompatíveis.
- [ ] Ficha de acompanhamento por matriz com histórico de partos e observações.
- [ ] Impressão/exportação de ficha diária de maternidade e mortalidade.

## Prioridade 3 — reprodução e planejamento

- [ ] Calendário de coberturas, retornos, diagnósticos e partos previstos com filtros por setor e status.
- [ ] Diferenciar claramente previsão, observação informada, exame e confirmação.
- [ ] Alertas de retorno ao cio e diagnóstico pendente sem fechar ciclos automaticamente.
- [ ] Indicadores reprodutivos com denominadores documentados e exclusão de ciclos sem desfecho.

## Prioridade 4 — sanidade e biosseguridade

- [ ] Checklist de entrada de visitantes/veículos, limpeza, desinfecção, controle de acesso e fluxo entre setores.
- [ ] Registro de ocorrência com setor, animais afetados, início, evolução, mortalidade, fotos e responsável.
- [ ] Livro de vacinação/medicação com escopo, lote, validade, prescrição, executor e carência informada.
- [ ] Alertas de vencimento e estoque sem sugerir medicamento ou tratamento.
- [ ] Encaminhamento de sinais de urgência ao veterinário e orientação de notificação oficial quando aplicável.

## Prioridade 5 — estoque, alimentação e desempenho

- [ ] Consumo de ração por setor/lote e conciliação entre estoque físico e movimentações.
- [ ] Alertas de estoque mínimo e divergência entre unidade, embalagem e quantidade.
- [ ] Histórico de pesagens por lote, GMD e conversão alimentar apenas quando houver dados suficientes.
- [ ] Custo por leitão desmamado com período e despesas incluídas explicitamente descritos.
- [ ] Relatório de perdas e desempenho por lote, sem comparar lotes com bases incompletas.

## Prioridade 6 — equipe e confiabilidade

- [ ] Cadastro de funções e responsáveis com permissões mínimas necessárias.
- [ ] Auditoria de alterações e correções por lançamento compensatório, preservando histórico.
- [ ] Sincronização resiliente para conexão instável, com fila local, prevenção de duplicidade e confirmação explícita do servidor.
- [ ] Exportação periódica de dados e anexos, com teste de restauração.
- [ ] Monitoramento de erros e métricas de desempenho sem registrar dados sensíveis em logs.

## Critérios técnicos obrigatórios

1. Não inventar números, metas, datas, tratamentos ou eventos.
2. Não converter ausência de informação em zero.
3. Previsões devem ser identificadas como estimativas e mostrar a regra usada.
4. Registros históricos não devem ser apagados ou sobrescritos silenciosamente.
5. Eventos que alteram saldo de leitões devem continuar usando o livro de eventos e seus gatilhos existentes.
6. Mudanças de banco precisam de migration revisada, backup, teste de RLS e verificação no ambiente de homologação.
7. Não colocar credenciais em código, commits, screenshots ou dados de demonstração.
8. Toda regra zootécnica deve ter fonte, data de revisão e validação do responsável técnico da granja.
9. IA é apoio à organização de observações, não diagnóstico, prescrição ou substituto do médico-veterinário.

## Referências técnicas consultadas

- [Embrapa — Biosseguridade em granjas de suínos](https://www.embrapa.br/qualidade-da-carne/carne-suina/producao-de-suinos/biosseguridade): isolamento, controle de acesso, limpeza/sanitização, vazio sanitário, água e fluxo de animais.
- [MAPA — Boas práticas de produção animal: suínos](https://www.gov.br/agricultura/pt-br/assuntos/producao-animal/boas-praticas-de-producao-animal/suinos): bem-estar, alojamento, enriquecimento ambiental e resistência aos antimicrobianos.
- [MAPA — Instrução Normativa nº 113/2020](https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/resistencia-aos-antimicrobianos/publicacoes/INM00000113.pdf): referência normativa de boas práticas de manejo e bem-estar na criação comercial.
- [MAPA — normas sanitárias vigentes para suínos](https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/sanidade-suidea/legislacao/legislacao-suideos/portugues/principais-normas-sanitarias-vigentes): verificar atualizações regulatórias antes de implementar fluxos sanitários.
- [ABPA — Procedimentos de Biosseguridade para Suínos (2025)](https://abpa-br.org/wp-content/uploads/2025/11/Revisao-Biosseguridade-SUINOS-Revisado.pdf): referência orientativa para padronização de biosseguridade.
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): políticas de acesso no banco.

**Limite:** este plano não define doses, protocolos de vacinação, metas de produção ou tratamento. Esses pontos dependem de bula vigente, legislação, instalações, genética, dados reais e médico-veterinário/zootecnista responsável.
