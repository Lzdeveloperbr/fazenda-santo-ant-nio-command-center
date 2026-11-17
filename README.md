# Fazenda Santo Antônio — Command Center

Sistema web de gestão operacional e zootécnica para uma granja de suínos, desenvolvido com React, TypeScript, TanStack Start/Router, Tailwind CSS e Supabase.

O objetivo é concentrar a rotina da granja em um único lugar: cadastro e histórico das matrizes, reprodução, maternidade, leitegadas, lotes, sanidade, alimentação, estoque, tarefas, indicadores e gestão financeira.

## Módulos

- **Painel:** indicadores da operação, partos previstos, tarefas prioritárias e fechamento mensal das leitegadas.
- **Matrizes e reprodução:** ficha individual, coberturas, diagnóstico gestacional, partos e histórico.
- **Maternidade e desmame:** leitegadas, nascidos vivos, natimortos, mortalidade, adoções, transferências, pesagens e desmame.
- **Lotes e desempenho:** alojamento por fase, movimentações, pesagens, GMD e consumo de ração.
- **Baias e caderno:** estrutura, manejo, ração e equipe.
- **Sanidade:** ocorrências, monitoramento, vacinação, medicamentos, biossegurança e referências técnicas.
- **Estoque e financeiro:** entradas/saídas, saldos, mínimos, receitas, despesas e relatórios.
- **Inteligência e calculadoras:** previsões, indicadores e ferramentas de apoio.
- **Mutirão e auditoria:** recuperação do histórico real, conferência física e identificação de dados incompletos/inconsistentes.
- **Visualização 3D:** representações ilustrativas do plantel e das instalações.

## Princípios de confiabilidade

1. Não transformar informação desconhecida em zero, negativa ou fato confirmado.
2. Não inventar histórico de coberturas, partos, tratamentos, vacinação ou mortalidade.
3. Diferenciar registro informado, conferido e comprovado.
4. Previsões são estimativas calculadas a partir dos registros disponíveis.
5. Medicamentos, doses, vias, intervalos, carências e protocolos sanitários devem seguir a bula vigente e o médico-veterinário responsável.
6. As visualizações 3D são ilustrativas, salvo quando houver imagem real cadastrada.
7. Não remover nem sobrescrever registros históricos sem confirmação e trilha de auditoria.

## Desenvolvimento

Requisitos: Node.js compatível com o lockfile e npm.

```bash
npm install
npm run dev
```

Verificações locais:

```bash
npm run lint
npm run test
npm run build
```

## Supabase

O cliente utiliza:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

No ambiente de servidor também podem ser usados `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Nunca exponha `service_role` ou chaves secretas no frontend.

As migrations do projeto ficam em `drizzle/migrations`. Antes de publicar, confira a sequência aplicada no banco, valide RLS em todas as tabelas expostas e faça backup. Não considere uma migration aplicada apenas porque o arquivo existe no GitHub.

## Lançamento

Consulte [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md) para o roteiro de homologação, testes por módulo, segurança, backup e preparação dos dados reais.

## Referências de produto e manejo

O desenho funcional foi comparado com conceitos públicos de sistemas de gestão suinícola como PigCHAMP, Suinotec e MeuSuíno, além de conteúdos técnicos da Embrapa. O projeto é independente e não reproduz código ou marca desses produtos.
