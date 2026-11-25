# Roadmap — AgroTech Command Center

## Etapa 1 concluída
- [x] Auditar módulos, dados e relatórios já existentes antes de alterar
- [x] Matrizes: edição, coberturas, diagnóstico, retorno ao cio, saídas e ficha individual em PDF
- [x] Maternidade: adoções, mortalidade, pesagens, histórico por leitegada e desmame validado
- [x] Validar regras, fluxo real no celular, 13 testes e build

## Etapa 3D (Smart Pig Farm)
- [x] Plantel 3D: um porco estilizado por matriz, cor pela situação, toque abre resumo e ficha
- [x] Porco 3D girável na ficha individual
- [x] Mutirão de Organização (conferência física, "não sei" vs comprovado)
- [x] Granja 3D com baias clicáveis e ocupação real
- [x] Leitegadas em 3D (quantidade, sem inventar identificações)
- [x] Calendário reprodutivo, central de pendências, previsão de desmames
- [x] Mapa de calor da mortalidade, comparação de leitegadas, avaliação de descarte
- [x] Custo por leitão, financeiro, relatório mensal para o patrão
- [x] Foto da matriz em armazenamento privado (fotos anteriores ficam guardadas ao trocar)
- [ ] Controle de funcionários: mostrar quem fez cada manejo

## Fase 1 do ERP (ver docs/DIAGNOSTICO_ERP.md)
- [x] Perfis Administrador/Gerente/Veterinário/Funcionário/Consulta aplicados no banco (RLS)
- [x] Ativação/desativação de usuários e último acesso
- [x] Trilha de auditoria imutável com valor anterior e novo
- [x] Busca global em matrizes, reprodutores, baias, lotes, medicamentos e tarefas
- [ ] Aplicar migration 0015 em homologação e validar (docs/DIAGNOSTICO_ERP.md, seção 7)

## Fase 2 do ERP
- [x] Prontuário completo da matriz (genealogia, origem, baia, lote, peso, foto, QR Code, linha do tempo)
- [x] Situação atual derivada com 15 estados e motivo
- [x] Arquivamento (exclusão lógica) com motivo, só Administrador/Gerente
- [x] Prazos reprodutivos no banco, iguais para todos os aparelhos
- [ ] Aplicar migration 0016 em homologação e validar

## Próximas etapas
- [ ] Produção e manejo: transferências entre lotes/baias, lotação consolidada e consumo no desempenho
- [ ] Administração: financeiro, funcionários, custos e fluxo de caixa
- [ ] Central de relatórios em PDF e Excel, com os modelos solicitados
- [ ] Revisão mobile e auditoria final de todos os módulos

## Gestação e reprodução
- [x] Ciclos reprodutivos, retorno ao cio, diagnósticos, partos vinculados, perdas, reprodutores, calendário, indicadores, CSV/impressão
- [ ] Anexos/fotos de exames e cobertura; edição de cobertura com recálculo; foto da matriz
