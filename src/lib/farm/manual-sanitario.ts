/**
 * Guia operacional desenvolvido a partir da estrutura temática e das rotinas
 * descritas em "Doenças dos Suínos", 2ª edição (2012), Sobestiansky e Barcellos.
 * Resumos originais e checklists práticos; não substituem o texto da obra nem
 * a avaliação do médico-veterinário responsável.
 */
export const BOOK_SOURCE = {
  title: "Doenças dos Suínos",
  edition: "2ª edição",
  year: 2012,
  editors: "Juri Sobestiansky e David Barcellos",
};

export const DISEASE_DOMAINS = [
  { id: "bacterioses", title: "Bacterioses", practice: "Registre sinais, idade/fase, quantidade de animais, evolução, mortes e resposta após a avaliação veterinária. Quando houver suspeita, registre a coleta, conservação, laboratório e resultado dos exames." },
  { id: "viroses", title: "Viroses", practice: "Registre a distribuição por baias e fases, velocidade de disseminação, sinais respiratórios/reprodutivos/digestivos e histórico de vacinação. Surtos suspeitos exigem contato veterinário e avaliação sanitária oficial quando aplicável." },
  { id: "ectoparasitoses", title: "Ectoparasitoses", practice: "Anote coceira, lesões de pele, localização, animais afetados e evolução. Registre inspeção, exame e plano definido pelo veterinário." },
  { id: "endoparasitoses", title: "Endoparasitoses", practice: "Registre condição corporal, fezes, desempenho, histórico de manejo e exames laboratoriais orientados pelo veterinário." },
  { id: "pele", title: "Doenças da pele", practice: "Fotografe quando possível, localize as lesões e registre extensão, intensidade, animais afetados e evolução." },
  { id: "locomotor", title: "Aparelho locomotor", practice: "Registre claudicação, dificuldade de levantar, articulações alteradas, lesões e impacto no acesso à água e ração." },
  { id: "intoxicacoes", title: "Intoxicações por minerais, químicos, plantas e gases", practice: "Registre produto ou possível exposição, lote, horário, alimento/água envolvidos, ambiente e animais expostos. Preserve embalagens e rótulos para o veterinário." },
  { id: "micotoxinas", title: "Micotoxinas e suas interações", practice: "Vincule ocorrências ao lote de ração, fornecedor, data de fabricação, armazenamento, consumo e mudanças de desempenho. Guarde amostra identificada quando orientado." },
  { id: "nutricao", title: "Deficiências nutricionais", practice: "Compare fase, formulação informada pelo fornecedor/nutricionista, consumo, ganho de peso, condição corporal e uniformidade do lote." },
  { id: "malformacoes", title: "Malformações", practice: "Registre matriz, leitegada, número de nascidos, tipo de alteração, recorrência e histórico reprodutivo." },
  { id: "reproducao", title: "Falhas reprodutivas", practice: "Relacione coberturas, retornos ao cio, diagnóstico de gestação, abortos, natimortos, tamanho da leitegada e identificação da matriz." },
  { id: "comportamento", title: "Formas anormais de comportamento", practice: "Registre comportamento observado, frequência, baia, composição do grupo, ambiente, lesões e mudanças de manejo." },
  { id: "diversas", title: "Condições diversas", practice: "Use a ficha de ocorrência para qualquer alteração não classificada e mantenha os registros por data, setor e lote." },
];

export const MONITORING_TYPES = [
  { id: "sanitario", title: "Sanitário", description: "Acompanhar continuamente a situação de saúde do rebanho e a ocorrência de doenças." },
  { id: "clinico", title: "Clínico", description: "Observar sinais e quantificar ocorrências com o mesmo método, horário e critério sempre que possível." },
  { id: "patologico", title: "Patológico", description: "Registrar achados de necropsia e lesões, relacionando-os ao lote, fase e histórico clínico." },
  { id: "laboratorial", title: "Laboratorial", description: "Controlar coleta, identificação, conservação, envio, exame solicitado, resultado e interpretação veterinária." },
  { id: "abate", title: "Abate", description: "Registrar lesões e achados de frigorífico por lote para relacionar saúde, desempenho e qualidade da carcaça." },
];

export const CLINICAL_INDICATORS = [
  { id: "diarreia", title: "Diarreia", unit: "animais com alteração fecal", note: "O livro descreve avaliação de frequência e consistência das fezes; registre a categoria observada: normal, pastosa, cremosa, líquida, hemorrágica ou melena." },
  { id: "tosse", title: "Tosse", unit: "episódios observados", note: "Faça observações padronizadas no lote, registrando horário, duração, animais observados e contagem." },
  { id: "espirros", title: "Espirros", unit: "episódios observados", note: "Use o mesmo método de observação nas comparações do lote." },
  { id: "claudicacao", title: "Claudicação", unit: "animais com alteração locomotora", note: "Registre intensidade, membros afetados e dificuldade de acesso a comedouro e bebedouro." },
  { id: "onfalite", title: "Infecção umbilical", unit: "leitões observados", note: "Acompanhe a ocorrência na maternidade e a evolução dos animais identificados." },
  { id: "sarna", title: "Lesões sugestivas de sarna", unit: "animais observados", note: "Registre localização e extensão das lesões; confirmação depende de avaliação adequada." },
  { id: "mortalidade", title: "Mortalidade", unit: "animais", note: "Registre data, fase, baia, total alojado, mortes e causa somente quando confirmada." },
  { id: "condicao_corporal", title: "Condição corporal", unit: "animais avaliados", note: "Use sempre o mesmo critério e anote a escala utilizada." },
  { id: "outro", title: "Outro indicador", unit: "conforme anotação", note: "Descreva claramente o método para permitir comparação futura." },
];

export const HERD_VISIT_AREAS = [
  { title: "Registros e resultados", items: ["Mortalidade e morbidade por fase", "Desempenho, pesagens e uniformidade", "Reprodução, coberturas, retornos e partos", "Vacinação, medicações e exames recentes"] },
  { title: "Instalações e ambiente", items: ["Ventilação, temperatura e umidade", "Densidade e distribuição dos animais", "Piso, drenagem, limpeza e desinfecção", "Água: vazão, qualidade, acesso e consumo", "Comedouros, bebedouros e distribuição de ração"] },
  { title: "Gestação e reprodução", items: ["Identificação e condição corporal das matrizes", "Registros de cobertura e diagnóstico gestacional", "Retornos ao cio, abortos e descartes", "Condição e manejo dos reprodutores"] },
  { title: "Maternidade e leitões", items: ["Partos, nascidos vivos, natimortos e mumificados", "Acesso ao colostro nas primeiras 24 horas", "Mortalidade, diarreia e alterações umbilicais", "Transferências, pesagens e desmame"] },
  { title: "Creche e terminação", items: ["Consumo de ração e água", "Diarreia, tosse, espirros e claudicação", "Temperatura, conforto e densidade", "Peso, conversão, mortalidade e lesões"] },
  { title: "Biossegurança", items: ["Controle de entrada de pessoas e veículos", "Quarentena e isolamento de animais", "Fluxo de animais, equipamentos e materiais", "Controle de pragas, resíduos e carcaças", "Programa de limpeza e desinfecção"] },
];

export const SAMPLE_WORKFLOW = [
  "Identifique o animal, baia, lote, fase e data antes da coleta.",
  "Registre o tipo e a origem da amostra e quem realizou a coleta.",
  "Confirme com o laboratório/veterinário o recipiente e a conservação exigidos para aquele exame.",
  "Registre transporte, laboratório, exame solicitado e data de envio.",
  "Anexe ou transcreva o resultado e registre quem fez a interpretação veterinária.",
];

export const BOOK_REFERENCES = [
  { section: "Exame de rebanho e estabelecimento de diagnóstico", pages: "21–67" },
  { section: "Coleta e remessa de materiais para exames laboratoriais", pages: "76–97" },
  { section: "Classificação das doenças", pages: "13–20" },
  { section: "Uso de antimicrobianos", pages: "837–884" },
  { section: "Monitoramentos sanitários e clínicos", pages: "885–932" },
  { section: "Imunidade e vacinações de suínos", pages: "933–954" },
];
