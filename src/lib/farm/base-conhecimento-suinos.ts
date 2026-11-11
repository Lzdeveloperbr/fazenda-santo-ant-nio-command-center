export type KnowledgeSource = {
  title: string;
  institution: string;
  url: string;
  note: string;
};

export type KnowledgeTopic = {
  id: string;
  category: string;
  phase: string;
  title: string;
  summary: string;
  practices: string[];
  watch: string[];
  records: string[];
  urgency?: string;
  sourceIds: string[];
};

export const KNOWLEDGE_SOURCES: Record<string, KnowledgeSource> = {
  embrapaProducao: {
    title: "Produção, instalações e manejo de suínos",
    institution: "Embrapa Ater+",
    url: "https://www.atermaisdigital.cnptia.embrapa.br/web/suinos/producao",
    note: "Portal técnico com conteúdos por etapa, publicações e materiais de manejo.",
  },
  embrapaGestacao: {
    title: "Pré-cobrição, cobrição e gestação",
    institution: "Embrapa Ater+",
    url: "https://www.atermaisdigital.cnptia.embrapa.br/web/suinos/producao/manejo-das-porcas-em-pre-cobricao-cobricao-e-gestacao",
    note: "Aborda alojamento, alimentação, cio, cobrição, indicadores, vacinação e descarte.",
  },
  embrapaDoencas: {
    title: "Principais doenças dos suínos",
    institution: "Embrapa Ater+",
    url: "https://www.atermaisdigital.cnptia.embrapa.br/web/suinos/saude-animal/doencas",
    note: "Material de reconhecimento de sinais. A própria Embrapa ressalta que diagnóstico e tratamento cabem ao médico-veterinário.",
  },
  embrapaAgua: {
    title: "Gestão da água e modelos de bebedouros",
    institution: "Embrapa Ater+",
    url: "https://www.atermaisdigital.cnptia.embrapa.br/web/suinos/gestao-da-agua/bebedouros",
    note: "Explica tipos de bebedouros e fatores de funcionamento e desperdício.",
  },
  embrapaMaternidade: {
    title: "Maternidade suína",
    institution: "Embrapa AGEITEC",
    url: "https://www.embrapa.br/web/agencia-de-informacao-tecnologica/criacoes/suinos/producao/manejo-da-producao/maternidade",
    note: "Conteúdo técnico da Embrapa migrado em 2021; recomendações devem ser adaptadas à instalação e ao protocolo atual da granja.",
  },
  embrapaPerguntas: {
    title: "500 perguntas e 500 respostas sobre suínos",
    institution: "Embrapa",
    url: "https://www.atermaisdigital.cnptia.embrapa.br/web/suinos/listagem-perguntas-e-respostas",
    note: "Acervo de perguntas técnicas com parte das respostas identificada como publicada em 1998. Use como referência histórica e didática, não como tabela atual de ração, medicamento ou meta obrigatória.",
  },
  mapaSanidade: {
    title: "Programa Nacional de Sanidade dos Suídeos (PNSS)",
    institution: "Ministério da Agricultura e Pecuária",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/sanidade-suidea/programa-nacional-de-sanidade-suidea-pnss",
    note: "Programa oficial de prevenção, vigilância e controle de doenças de importância sanitária.",
  },
  mapaBoasPraticas: {
    title: "Materiais de boas práticas, bem-estar e transporte",
    institution: "Ministério da Agricultura e Pecuária",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/producao-animal/boas-praticas-de-producao-animal/suinos",
    note: "Página oficial atualizada em 01/10/2026; reúne cartilhas de maternidade, gestação coletiva, transporte e bem-estar.",
  },
  mapaIN113: {
    title: "Instrução Normativa nº 113, de 16 de dezembro de 2020",
    institution: "MAPA · Diário Oficial da União",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/sanidade-suidea/legislacao-suideos/2020IN113de16dedezembroBPMeBEAgranjasdesunoscomerciais.pdf/@@download/file",
    note: "Norma brasileira sobre boas práticas de manejo e bem-estar em granjas comerciais. Consulte o texto oficial para obrigações e prazos.",
  },
  mapaAntimicrobianos: {
    title: "Prevenção e controle da resistência aos antimicrobianos",
    institution: "Ministério da Agricultura e Pecuária",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/alimentacao-animal/prevencao-e-controle-da-resistencia-a-antimicrobianos",
    note: "Página oficial sobre prevenção e uso responsável de antimicrobianos; atualizada em 02/06/2026.",
  },
  mapaUsoResponsavel: {
    title: "Uso responsável e prudente de antimicrobianos",
    institution: "Ministério da Agricultura e Pecuária",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/resistencia-aos-antimicrobianos/uso-responsavel-de-antimicrobianos",
    note: "Explica a importância sanitária e de saúde pública do uso prudente de antimicrobianos.",
  },
  mapaNotificacao: {
    title: "Doenças de notificação obrigatória na suinocultura",
    institution: "Ministério da Agricultura e Pecuária",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/sanidade-suidea/notificacao-de-doencas-relativas-a-suinocultura",
    note: "Lista oficial de doenças com exigência de notificação imediata em caso suspeito ou confirmado, conforme a categoria.",
  },
  mapaPSC: {
    title: "Peste Suína Clássica (PSC)",
    institution: "Ministério da Agricultura e Pecuária",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/sanidade-suidea/peste-suina-classica-psc",
    note: "Página oficial atualizada em 22/07/2026; qualquer caso suspeito de PSC deve ser notificado imediatamente ao Serviço Veterinário Oficial.",
  },
  embrapaBiosseguridade: {
    title: "Biosseguridade na granja de suínos",
    institution: "Embrapa Suínos e Aves",
    url: "https://www.embrapa.br/qualidade-da-carne/carne-suina/producao-de-suinos/biosseguridade",
    note: "Isolamento, controle de visitantes e veículos, limpeza, vazio sanitário, água, ração, vetores e destinação de resíduos.",
  },
  embrapaLeitoa: {
    title: "Manejo da leitoa de reposição",
    institution: "Embrapa Ater+",
    url: "https://www.atermaisdigital.cnptia.embrapa.br/web/suinos/producao/manejo-da-leitoa-de-reposicao",
    note: "Critérios de seleção como aprumos, conformação, tetos funcionais e acompanhamento do desenvolvimento.",
  },
  embrapaBemEstar: {
    title: "Bem-estar de suínos",
    institution: "Embrapa Suínos e Aves",
    url: "https://www.embrapa.br/web/suinos-e-aves/bes",
    note: "Materiais sobre gestação coletiva, produção, embarque e transporte.",
  },
  embrapaCarcacas: {
    title: "Tecnologias para destinação de animais mortos (TEC-DAM)",
    institution: "Embrapa Suínos e Aves",
    url: "https://www.embrapa.br/web/suinos-e-aves/tec-dam",
    note: "Pesquisa alternativas de destinação de carcaças; a escolha deve respeitar normas ambientais e sanitárias locais.",
  },
  mapaNormas: {
    title: "Principais normas sanitárias vigentes para suínos",
    institution: "Ministério da Agricultura e Pecuária",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/sanidade-suidea/legislacao/legislacao-suideos/portugues/principais-normas-sanitarias-vigentes",
    note: "Página oficial atualizada em 06/08/2026 com normas e requisitos sanitários aplicáveis à suinocultura.",
  },
};

export const KNOWLEDGE_CATEGORIES = [
  "Todas",
  "Reprodução",
  "Maternidade",
  "Leitões e creche",
  "Nutrição e água",
  "Instalações e ambiente",
  "Sanidade e biosseguridade",
  "Bem-estar",
  "Gestão e indicadores",
  "Sustentabilidade",
];

export const SWINE_KNOWLEDGE: KnowledgeTopic[] = [
  {
    id: "sistema-producao",
    category: "Gestão e indicadores",
    phase: "Todas as fases",
    title: "Como funciona o sistema de produção",
    summary: "A granja funciona como um sistema: genética, instalações, animais, alimentação, água, pessoas, manejo, sanidade e registros precisam trabalhar juntos. Uma falha em um ponto pode comprometer o resultado de todo o lote.",
    practices: [
      "Organize os animais por fase e fluxo: reposição, reprodução, gestação, maternidade, creche, crescimento e terminação, conforme o sistema da propriedade.",
      "Defina responsáveis, horários, rotinas e procedimentos escritos para as atividades que se repetem.",
      "Evite misturar idades e origens sem planejamento sanitário. Planeje entrada, saída, limpeza e descanso das instalações.",
      "Use os dados registrados para comparar lotes e descobrir onde surgem perdas, em vez de depender apenas da memória.",
    ],
    watch: [
      "Aumento de mortalidade, refugagem, repetição de cio, abortos, diarreia, tosse ou queda de consumo.",
      "Mudanças no consumo de ração ou água, comportamento, temperatura e umidade.",
    ],
    records: [
      "Animais por categoria e baia, entradas e saídas, nascimentos, desmames, mortes, refugos e transferências.",
      "Consumo de ração e água, pesagens, ocorrências sanitárias, tratamentos prescritos, custos e vendas.",
    ],
    sourceIds: ["embrapaProducao", "embrapaPerguntas"],
  },
  {
    id: "biosseguridade",
    category: "Sanidade e biosseguridade",
    phase: "Toda a granja",
    title: "Biosseguridade: impedir a entrada e a circulação de doenças",
    summary: "Biosseguridade é o conjunto de barreiras e hábitos que reduzem a chance de agentes infecciosos entrarem na granja e se espalharem entre setores, baias, pessoas, veículos e animais.",
    practices: [
      "Controle visitantes, prestadores, veículos e equipamentos. Registre quem entrou, quando, motivo e áreas visitadas.",
      "Mantenha cercamento, portões controlados, identificação da propriedade e fluxo de acesso definido.",
      "Use roupas e botas exclusivas da granja ou do setor, com troca e higienização conforme o protocolo.",
      "Separe materiais por sala ou setor. Evite levar pá, vassoura, mangueira e equipamentos de uma baia suspeita para outra sem higienização.",
      "Faça quarentena de animais de reposição em área separada, com avaliação veterinária e período definido pelo responsável técnico.",
      "Controle roedores, moscas, aves, animais domésticos e acesso de javalis. Proteja ração, água e resíduos.",
      "Garanta água potável, armazenamento protegido de ração, descarte correto de cadáveres e manejo adequado de dejetos.",
      "Planeje o fluxo all-in/all-out quando a estrutura permitir: entrada e saída de grupos, limpeza, desinfecção, secagem e vazio sanitário.",
    ],
    watch: [
      "Visita sem registro, animal recém-chegado sem quarentena, equipamento compartilhado sem limpeza, presença de roedores ou falha no cercamento.",
      "Morte súbita, vários animais doentes ao mesmo tempo ou sinais incomuns devem elevar o nível de atenção.",
    ],
    records: [
      "Livro de visitantes, origem e destino de animais, quarentena, limpeza e desinfecção, controle de pragas e manutenção de barreiras.",
    ],
    urgency: "Suspeita de doença de notificação obrigatória ou ocorrência incomum com mortalidade elevada exige contato imediato com o Serviço Veterinário Oficial, seguindo o PNSS. Não transporte animais suspeitos nem tente esconder ou resolver o foco por conta própria.",
    sourceIds: ["embrapaDoencas", "embrapaBiosseguridade", "mapaSanidade", "mapaNotificacao", "mapaPSC", "mapaBoasPraticas", "mapaNormas"],
  },
  {
    id: "reposicao",
    category: "Reprodução",
    phase: "Leitoas e reprodutores",
    title: "Seleção e entrada de animais de reposição",
    summary: "A reposição influencia fertilidade, longevidade, saúde e uniformidade do rebanho. A escolha deve considerar origem sanitária, genética, aprumos, condição corporal e adaptação.",
    practices: [
      "Compre de origem conhecida e solicite documentação e informações sanitárias do fornecedor.",
      "Faça quarentena física e operacional antes de integrar os animais ao plantel, conforme o plano do veterinário.",
      "Observe aprumos, locomoção, pele, condição corporal, conformação, tetos funcionais e histórico de saúde.",
      "Adapte gradualmente a alimentação e o ambiente; evite misturar imediatamente animais desconhecidos.",
      "Avalie reprodutores e sêmen por critérios técnicos. A inseminação artificial exige treinamento, higiene, conservação e manejo correto do material.",
    ],
    watch: [
      "Claudicação, lesões, falta de apetite, sinais respiratórios, alterações reprodutivas e agressões após agrupamento.",
      "Retorno ao cio, falhas de concepção e problemas de qualidade ou conservação do sêmen.",
    ],
    records: [
      "Origem, identificação, raça ou linhagem, data de entrada, documentos, quarentena, avaliação, cobertura e desempenho reprodutivo.",
    ],
    sourceIds: ["embrapaGestacao", "embrapaProducao", "embrapaLeitoa", "mapaSanidade"],
  },
  {
    id: "cio-cobertura",
    category: "Reprodução",
    phase: "Matrizes desmamadas e leitoas",
    title: "Detecção de cio e cobertura",
    summary: "O manejo reprodutivo começa com observação consistente. O registro correto do cio, da cobertura ou inseminação e do retorno ao cio permite avaliar a eficiência reprodutiva.",
    practices: [
      "Observe as fêmeas diariamente, com rotina padronizada e auxílio do macho quando previsto no protocolo.",
      "Registre sinais observados, data e hora, identificação da matriz e decisão de cobertura ou inseminação.",
      "Na inseminação, siga o treinamento e o protocolo do responsável técnico para higiene, armazenamento do sêmen, identificação de doses e momento de uso.",
      "Evite estresse, escorregões, calor excessivo e movimentação brusca durante a detecção de cio e a cobertura.",
      "Confira o retorno ao cio e registre resultados de diagnóstico de gestação.",
    ],
    watch: [
      "Ausência de cio após o desmame, repetição, corrimento, abortamento, infertilidade aparente ou mudança nos testículos do macho.",
    ],
    records: [
      "Data do desmame, cio, cobertura/IA, identificação do macho ou lote de sêmen, diagnóstico de gestação, retorno ao cio e parto.",
    ],
    sourceIds: ["embrapaGestacao", "embrapaPerguntas"],
  },
  {
    id: "gestacao",
    category: "Reprodução",
    phase: "Matrizes gestantes",
    title: "Manejo de matrizes na gestação",
    summary: "Na gestação, o objetivo é manter a matriz saudável, com condição corporal adequada, água e dieta equilibradas e ambiente calmo. A quantidade de ração não deve ser copiada de uma tabela genérica: depende de peso, condição corporal, genética, dieta e fase.",
    practices: [
      "Avalie regularmente condição corporal e evolução da matriz. Ajustes alimentares devem seguir a formulação e orientação do nutricionista ou veterinário.",
      "Mantenha água limpa e disponível continuamente; confira vazão, funcionamento e acesso sem competição.",
      "Evite mudanças bruscas de dieta, brigas, manejo agressivo, pisos escorregadios e superlotação.",
      "Observe retorno ao cio, corrimentos, abortamentos, apetite, locomoção, fezes e comportamento.",
      "Planeje vacinação, exames, agrupamento e transferência para maternidade com o veterinário.",
      "A Embrapa apresenta 114 dias como duração média de gestação em seu acervo de perguntas, identificado como material de 1998. Use apenas para previsão inicial e confirme o histórico individual; não trate como data garantida.",
    ],
    watch: [
      "Abortamento, retorno ao cio, corrimento anormal, febre, falta de apetite, claudicação ou queda acentuada da condição corporal.",
    ],
    records: [
      "Cobertura, diagnóstico, previsão de parto, condição corporal, ração e ajustes, vacinações prescritas, ocorrências e movimentações.",
    ],
    sourceIds: ["embrapaGestacao", "embrapaPerguntas"],
  },
  {
    id: "preparar-maternidade",
    category: "Maternidade",
    phase: "Pré-parto",
    title: "Preparação da maternidade",
    summary: "A maternidade precisa estar limpa, seca, funcional e preparada para atender às necessidades diferentes da matriz e dos leitões: conforto da porca, ambiente protegido e aquecido para os recém-nascidos e acesso seguro à água.",
    practices: [
      "Programe a transferência com antecedência conforme o fluxo e o protocolo da granja. Material da Embrapa sugere transferência cerca de sete dias antes da previsão de parto; adapte à estrutura e à orientação técnica.",
      "Limpe e desinfete sala, baia, comedouro, bebedouro, escamoteador e equipamentos entre lotes, respeitando a secagem e o vazio sanitário definido no protocolo.",
      "Teste água, comedouros, iluminação, ventilação, aquecimento e alarmes antes da chegada da matriz.",
      "Prepare área aquecida para leitões, seca, sem corrente de ar e com acesso fácil. A temperatura da porca e a necessidade térmica dos leitões são diferentes.",
      "Mantenha material limpo para assistência e identificação, e tenha o contato do veterinário acessível.",
      "Conduza a matriz com calma, sem gritos, pancadas ou pressa.",
    ],
    watch: [
      "Piso molhado ou escorregadio, equipamento quebrado, fonte de calor irregular, corrente de ar sobre os leitões ou falta de água.",
    ],
    records: [
      "Data de higienização, produto utilizado conforme rótulo, responsável, início e fim do vazio, conferência dos equipamentos e data de entrada da matriz.",
    ],
    sourceIds: ["embrapaMaternidade", "embrapaProducao", "mapaBoasPraticas", "mapaIN113"],
  },
  {
    id: "parto",
    category: "Maternidade",
    phase: "Parto",
    title: "Acompanhamento do parto",
    summary: "A observação organizada permite identificar cedo a matriz que precisa de ajuda e reduzir riscos para a porca e a leitegada. Intervenções obstétricas devem ser feitas por pessoa treinada, dentro de protocolo veterinário.",
    practices: [
      "Observe a matriz e o andamento do parto, mantendo ambiente tranquilo e água disponível.",
      "Registre horário do primeiro leitão, intervalo entre nascimentos quando possível, total nascido vivo, natimortos, mumificados e término do parto.",
      "Mantenha o ambiente limpo e reduza movimentação e barulho.",
      "Não introduza a mão nem aplique ocitocina, antibióticos ou outros medicamentos por iniciativa própria. A avaliação e a intervenção dependem da causa e da orientação veterinária.",
      "Tenha um plano de contato para parto prolongado, esforço sem nascimento, sangramento intenso, prostração ou suspeita de leitão retido.",
    ],
    watch: [
      "Contrações fortes sem nascimento, intervalo incomum com esforço persistente, sangramento excessivo, matriz muito abatida, febre ou dificuldade respiratória.",
      "Leitão sem respiração adequada, muito fraco, frio ou que não consegue alcançar a teta.",
    ],
    records: [
      "Identificação da matriz, data e duração do parto, nascidos vivos, natimortos, mumificados, intervenções realizadas por profissional, observações e mortalidade.",
    ],
    urgency: "Parto aparentemente obstruído, matriz em sofrimento, hemorragia importante ou leitões sem resposta exigem assistência veterinária imediata.",
    sourceIds: ["embrapaMaternidade", "mapaBoasPraticas"],
  },
  {
    id: "colostro-leitoes",
    category: "Maternidade",
    phase: "Nascimento e primeiras horas",
    title: "Primeiros cuidados com os leitões e colostro",
    summary: "O leitão nasce vulnerável, com pouca reserva energética e dependente do colostro, do calor e de um ambiente seco. A prioridade é garantir que todos consigam mamar o quanto antes.",
    practices: [
      "Seque e aqueça o leitão quando necessário, mantendo a área de descanso limpa e sem corrente de ar.",
      "Garanta acesso precoce ao colostro e observe se os menores conseguem alcançar as tetas e mamar.",
      "Identifique os leitões fracos e acompanhe-os individualmente; não assuma que todos mamaram apenas porque estão próximos da matriz.",
      "Mantenha escamoteador seco e aquecido, com acesso seguro e sem risco de esmagamento ou queimadura.",
      "Faça procedimentos de umbigo, identificação e outros manejos somente conforme protocolo técnico, com material limpo e execução treinada.",
      "Registre peso ao nascimento quando houver balança adequada e acompanhe os leitões de menor peso.",
    ],
    watch: [
      "Leitão frio, isolado, tremendo, sem força para mamar, com respiração anormal, umbigo inflamado ou diarreia.",
      "Disputa excessiva por tetas, leitões ficando para trás e matriz que não permite a mamada.",
    ],
    records: [
      "Peso individual ou médio, identificação, horário de nascimento, mamada/colostro observados, transferências de leitegada, condição dos leitões e perdas.",
    ],
    urgency: "Leitão que não consegue mamar, permanece frio ou prostrado, tem dificuldade respiratória ou piora rapidamente precisa de avaliação imediata.",
    sourceIds: ["embrapaMaternidade", "embrapaPerguntas", "mapaBoasPraticas"],
  },
  {
    id: "lactacao-matriz",
    category: "Maternidade",
    phase: "Lactação",
    title: "Matriz na lactação: ração, água e condição corporal",
    summary: "A lactação exige alto aporte de nutrientes e água. O consumo real varia com tamanho da leitegada, fase da lactação, temperatura, condição corporal, saúde e composição da ração.",
    practices: [
      "Siga a ração específica de lactação e o plano de arraçoamento definido para o lote e para cada matriz.",
      "Observe sobras, apetite, consistência das fezes e velocidade de consumo; aumentos e reduções devem ser graduais e acompanhados.",
      "Divida o fornecimento conforme o protocolo. Em períodos quentes, converse com o responsável técnico sobre horários mais frescos e estratégia de fornecimento.",
      "Garanta água à vontade e bebedouro funcionando; lactação aumenta a necessidade de água.",
      "Avalie úbere e tetas, comportamento maternal, condição corporal e evolução do peso da leitegada.",
      "Não use uma quantidade fixa de kg por porca para todas as matrizes. Número de leitões, genética, dieta e clima alteram a necessidade.",
    ],
    watch: [
      "Matriz que não come, não bebe, apresenta febre, úbere dolorido ou inflamado, corrimento anormal, constipação intensa ou rejeita os leitões.",
      "Leitegada inquieta, leitões chorando com frequência, barriga vazia, perda de peso ou diarreia.",
    ],
    records: [
      "Ração por trato e por dia, sobras, água, número de leitões, condição corporal, sinais observados, pesagens e intervenções prescritas.",
    ],
    sourceIds: ["embrapaMaternidade", "embrapaPerguntas", "embrapaAgua"],
  },
  {
    id: "desmame",
    category: "Leitões e creche",
    phase: "Desmame",
    title: "Desmame com planejamento",
    summary: "O desmame é uma transição estressante: mudam alimentação, ambiente, grupo social e ausência da matriz. O sucesso depende de preparação, consumo de ração, água e redução de estressores.",
    practices: [
      "Defina idade e momento do desmame conforme legislação vigente, sistema de produção, peso e uniformidade dos leitões, saúde da leitegada e orientação técnica.",
      "Não trate datas ou idades citadas em material antigo como autorização para desmamar; confirme os requisitos legais aplicáveis ao sistema.",
      "Prepare a creche antes da transferência: instalação limpa, seca, aquecida conforme a idade, bebedouros e comedouros testados.",
      "Mantenha dieta apropriada para a fase e evite mudanças simultâneas desnecessárias de ração, ambiente e grupo.",
      "Acompanhe especialmente os primeiros dias: consumo, água, fezes, comportamento, temperatura e animais que não se adaptam.",
      "Registre transferências, pesagens e mortalidade; ao misturar leitegadas, reduza agressões e monitore lesões.",
    ],
    watch: [
      "Diarreia, desidratação, leitão que não come ou bebe, perda de peso, agressões, tosse ou mortalidade acima do padrão.",
    ],
    records: [
      "Data, idade, quantidade desmamada, peso médio, matriz de origem, destino, ração inicial, mortalidade e observações dos primeiros dias.",
    ],
    sourceIds: ["embrapaProducao", "embrapaPerguntas", "mapaIN113", "mapaBoasPraticas"],
  },
  {
    id: "creche",
    category: "Leitões e creche",
    phase: "Creche",
    title: "Manejo da creche",
    summary: "Na creche, o leitão precisa aprender a consumir alimento sólido, encontrar água e adaptar-se ao grupo. A uniformidade do lote não deve ser obtida à custa de deixar animais pequenos sem acesso aos recursos.",
    practices: [
      "Confira temperatura, ventilação, cama ou piso, densidade, comedouros e bebedouros todos os dias.",
      "Observe se todos conseguem chegar à água e ao alimento, especialmente animais menores ou dominados.",
      "Forneça a dieta correspondente à fase e faça transição progressiva conforme orientação nutricional.",
      "Evite superlotação, mistura excessiva de origens e mudanças bruscas de ração.",
      "Separe para avaliação os animais doentes ou feridos, em local adequado e com monitoramento.",
      "Acompanhe peso por lote e variação entre os animais para detectar refugagem.",
    ],
    watch: [
      "Diarreia aquosa, desidratação, tosse, espirros, febre percebida, falta de apetite, tremores, descoordenação ou animais deitados e isolados.",
    ],
    records: [
      "Peso de entrada e saída, número de animais, consumo de ração, mortes, refugos, tratamentos prescritos, datas de mudança de dieta e limpeza.",
    ],
    urgency: "Diarreia intensa que se espalha rapidamente, sinais neurológicos, morte súbita ou vários animais abatidos justificam contato veterinário imediato.",
    sourceIds: ["embrapaDoencas", "embrapaProducao", "embrapaPerguntas"],
  },
  {
    id: "crescimento-terminacao",
    category: "Leitões e creche",
    phase: "Crescimento e terminação",
    title: "Crescimento, terminação e preparação de saída",
    summary: "O desempenho depende da saúde, genética, dieta, água, ambiência e espaço. Pesagens regulares e controle de consumo ajudam a identificar o que limita o ganho de peso.",
    practices: [
      "Agrupe por peso e condição, evitando diferenças excessivas que criem competição e animais dominados.",
      "Mantenha comedouros ajustados, sem desperdício nem restrição de acesso; confira o consumo real.",
      "Forneça dieta formulada para a fase e evite substituir ingredientes sem reformulação nutricional.",
      "Pese amostras representativas em intervalos definidos e compare ganho médio diário entre lotes.",
      "Observe locomoção, pele, tosse, fezes, apetite e comportamento de forma sistemática.",
      "Antes da saída, confira identificação, registros, carências de medicamentos, documentação e requisitos de transporte.",
    ],
    watch: [
      "Queda de consumo, baixo ganho de peso, tosse persistente, diarreia, claudicação, lesões de pele, caudas mordidas ou mortalidade.",
    ],
    records: [
      "Peso de entrada e saída, ração consumida, dias de alojamento, mortes, descartes, tratamentos e carência, destino e valor de venda.",
    ],
    sourceIds: ["embrapaProducao", "embrapaDoencas", "mapaBoasPraticas"],
  },
  {
    id: "cachacos",
    category: "Reprodução",
    phase: "Reprodutores",
    title: "Manejo dos cachaços",
    summary: "O macho reprodutor influencia diretamente a eficiência reprodutiva. Saúde, aprumos, condição corporal, comportamento, conforto, higiene e qualidade do sêmen precisam ser acompanhados de forma contínua.",
    practices: [
      "Mantenha identificação individual, histórico sanitário, idade, origem, linhagem e registros de uso reprodutivo.",
      "Observe locomoção, aprumos, cascos, pele, apetite, condição corporal e comportamento. Dor ou dificuldade de caminhar pode comprometer a monta.",
      "Ofereça baia segura, piso não escorregadio, espaço para movimentação e contato visual/olfativo adequado com outros suínos, conforme o projeto e o bem-estar.",
      "Evite calor excessivo, estresse, manejo brusco e excesso de uso. A frequência de monta ou coleta deve seguir plano reprodutivo individual e orientação técnica.",
      "Na coleta e avaliação de sêmen, siga procedimento higiênico e treinamento; registre identificação, data, avaliação de qualidade, conservação e destino.",
      "Planeje avaliação veterinária e nutricional periódica e substituição do reprodutor quando saúde, fertilidade ou desempenho indicarem necessidade.",
    ],
    watch: [
      "Claudicação, lesões, apatia, perda ou excesso de condição corporal, falta de libido, dificuldade de monta ou alteração no sêmen.",
    ],
    records: [
      "Identificação, origem, peso/condição corporal, saúde, vacinações prescritas, coberturas, coletas, resultados de fertilidade e ocorrências.",
    ],
    sourceIds: ["embrapaProducao", "embrapaGestacao", "mapaBoasPraticas", "mapaNormas"],
  },
  {
    id: "nutricao-racao",
    category: "Nutrição e água",
    phase: "Todas as fases",
    title: "Nutrição e manejo de ração",
    summary: "A ração deve atender à categoria, fase, genética, peso, condição corporal e objetivo do lote. Uma fórmula adequada no papel também depende da qualidade dos ingredientes, armazenamento e acesso ao comedouro.",
    practices: [
      "Use ração identificada para a fase correta e respeite a formulação do nutricionista ou fornecedor técnico.",
      "Armazene em local seco, ventilado, protegido de pragas, umidade, calor e contaminação.",
      "Aplique primeiro que vence, primeiro que sai; identifique lote, fabricação, validade e fornecedor.",
      "Observe cheiro, cor, empedramento, mofo, aquecimento e sinais de roedores. Não forneça ração suspeita.",
      "Calibre os comedouros e registre consumo e sobras. Desperdício também é custo e pode alterar o consumo real.",
      "Faça mudança de ração de forma planejada; não altere ingredientes, núcleo, sal ou aditivos por tentativa.",
    ],
    watch: [
      "Queda repentina de consumo, ração mofada, umidade, empedramento, contaminação, erro de entrega ou lote de ração trocado.",
    ],
    records: [
      "Fornecedor, formulação comercial, lote, validade, entrada, estoque, consumo por setor, perdas e custo por kg.",
    ],
    sourceIds: ["embrapaPerguntas", "embrapaProducao"],
  },
  {
    id: "agua-bebedouros",
    category: "Nutrição e água",
    phase: "Todas as fases",
    title: "Água: qualidade, vazão e bebedouros",
    summary: "Água não é apenas um insumo: afeta consumo de ração, crescimento, reprodução e produção de leite. Todas as categorias precisam ter acesso contínuo à água potável e a equipamentos funcionais.",
    practices: [
      "Verifique diariamente se cada bebedouro libera água, está limpo, acessível e sem vazamentos.",
      "Meça e registre vazão de pontos representativos com recipiente graduado e cronômetro, usando o padrão técnico adequado à categoria e ao equipamento instalado.",
      "Observe pressão, altura, posição, número de bebedouros, competição e desperdício.",
      "Proteja reservatórios e linhas contra entrada de sujeira, animais, produtos químicos e aquecimento excessivo.",
      "Faça análise da qualidade da água com frequência definida por profissional e sempre que houver mudança de fonte, odor, cor ou problema sanitário.",
      "Registre consumo do reservatório por setor quando possível; queda ou aumento fora do normal pode indicar problema no lote ou no sistema.",
    ],
    watch: [
      "Bebedouro sem água, vazão diferente entre pontos, água turva ou com odor, vazamento, fila de animais, queda no consumo ou sede excessiva.",
    ],
    records: [
      "Origem da água, análises, limpeza de reservatório, manutenção, vazão medida, consumo diário e ocorrências.",
    ],
    sourceIds: ["embrapaAgua", "embrapaPerguntas"],
  },
  {
    id: "ambiencia",
    category: "Instalações e ambiente",
    phase: "Todas as fases",
    title: "Ambiência, ventilação e conforto térmico",
    summary: "A temperatura de conforto muda conforme idade, peso, categoria, umidade, velocidade do ar e tipo de instalação. A matriz e o leitão recém-nascido têm necessidades diferentes, por isso um único número para todo o galpão não funciona.",
    practices: [
      "Meça temperatura e umidade na altura dos animais, em mais de um ponto, e registre horário e setor.",
      "Observe comportamento: agrupamento e tremores podem indicar frio; ofegação, procura por piso fresco e afastamento podem indicar calor.",
      "Garanta ventilação sem corrente de ar direta sobre leitões pequenos e sem acumular gases e umidade.",
      "Mantenha escamoteador ou área de aquecimento dos leitões controlados separadamente do ambiente da matriz.",
      "Inspecione exaustores, entradas de ar, cortinas, alarmes, sensores e gerador conforme plano de manutenção.",
      "Ajuste ambiência considerando a categoria e as condições reais, com orientação técnica; não use apenas a leitura do controlador.",
    ],
    watch: [
      "Animais ofegantes, amontoados, tremendo, com respiração alterada, mudança de posição incomum ou concentração de umidade e gases.",
    ],
    records: [
      "Temperatura, umidade, horário, local de medição, ajustes de ventilação, alarmes, falhas e comportamento observado.",
    ],
    sourceIds: ["embrapaProducao", "embrapaMaternidade", "mapaBoasPraticas"],
  },
  {
    id: "limpeza-vazio",
    category: "Instalações e ambiente",
    phase: "Entre lotes e diariamente",
    title: "Limpeza, desinfecção e vazio sanitário",
    summary: "Limpeza remove matéria orgânica; desinfecção reduz microrganismos após a limpeza; secagem e vazio sanitário completam o processo. Produto desinfetante não compensa superfície suja.",
    practices: [
      "Remova fezes, sobras de ração, cama úmida e resíduos antes de lavar.",
      "Siga o rótulo e a orientação técnica para diluição, tempo de contato, compatibilidade, equipamentos de proteção e enxágue.",
      "Nunca misture produtos químicos. Não use pessoas ou animais no local durante aplicação quando o rótulo exigir isolamento.",
      "Deixe secar completamente e respeite o período de vazio sanitário definido para o setor e o risco sanitário.",
      "Evite lavagem diária indiscriminada quando a remoção a seco for suficiente; água em excesso aumenta o volume de dejetos.",
      "Use utensílios exclusivos por sala ou baia sempre que possível, sobretudo em áreas com ocorrência de diarreia.",
    ],
    watch: [
      "Entrada de novo lote sem secagem, matéria orgânica remanescente, ralos obstruídos, equipamento contaminado, falha de diluição ou produto vencido.",
    ],
    records: [
      "Setor, data, limpeza realizada, produto e lote, concentração conforme rótulo, tempo de contato, responsável e liberação da sala.",
    ],
    sourceIds: ["embrapaPerguntas", "embrapaDoencas", "mapaSanidade"],
  },
  {
    id: "reconhecer-doenca",
    category: "Sanidade e biosseguridade",
    phase: "Todas as fases",
    title: "Reconhecer sinais de doença sem tentar fechar diagnóstico",
    summary: "O operador deve reconhecer mudanças, registrar os sinais e comunicar cedo. Sinais parecidos podem ter causas diferentes; somente o médico-veterinário pode diagnosticar e escolher tratamento.",
    practices: [
      "Observe apetite, consumo de água, fezes, respiração, locomoção, pele, comportamento, temperatura quando indicada e mortalidade.",
      "Compare o animal com o restante do mesmo lote e com seu próprio comportamento habitual.",
      "Registre quando começou, quantos animais estão afetados, quantos morreram, como evoluiu e se houve mudança de ração, água, clima ou manejo.",
      "Separe ou maneje animais doentes conforme plano de biossegurança, evitando espalhar agentes e sem comprometer o bem-estar.",
      "Guarde fotos e vídeos úteis, sem atrasar o atendimento de urgência.",
      "Não dê medicamentos que sobraram, não misture produtos e não use antibiótico por tentativa.",
    ],
    watch: [
      "Digestivo: diarreia, vômito, fezes com muco ou sangue, desidratação.",
      "Respiratório: tosse, espirros, secreção, respiração difícil ou rápida.",
      "Nervoso: tremores, andar cambaleante, falta de coordenação, convulsão ou pedalagem.",
      "Locomotor e pele: claudicação, articulação inchada, feridas, manchas arroxeadas ou coceira intensa.",
      "Reprodutivo: retorno ao cio, aborto, natimortos acima do padrão, corrimento ou infertilidade aparente.",
    ],
    records: [
      "Data e hora, setor, baia, fase, sinais observados, número total, afetados, mortes, fotos, mudanças recentes e contato veterinário.",
    ],
    urgency: "Morte súbita, vários animais doentes ao mesmo tempo, febre acompanhada de manchas arroxeadas, sinais neurológicos, hemorragias ou suspeita de doença de notificação devem ser tratados como alerta urgente. Acione o veterinário e o Serviço Veterinário Oficial conforme orientação do PNSS.",
    sourceIds: ["embrapaDoencas", "mapaSanidade", "mapaNotificacao", "mapaPSC"],
  },
  {
    id: "doencas-prioritarias",
    category: "Sanidade e biosseguridade",
    phase: "Todas as fases",
    title: "Doenças importantes: o que observar e registrar",
    summary: "Esta lista é um guia de observação, não um guia de diagnóstico. Sinais podem se sobrepor e precisam de avaliação clínica e, quando indicado, exames laboratoriais.",
    practices: [
      "Diarreia no pós-desmame: acompanhe início, velocidade de disseminação, hidratação, consumo e mortes. A Embrapa descreve quadros que podem desidratar rapidamente.",
      "Disenteria: registre diarreia com muco ou sangue, perda de condição e quais baias foram afetadas.",
      "Problemas respiratórios: anote tosse, espirros, secreções, esforço respiratório, temperatura e distribuição por sala.",
      "Problemas reprodutivos: registre repetição de cio, aborto, fetos mumificados, natimortos e infertilidade aparente.",
      "Sarna e ectoparasitas: registre coceira, lesões de pele, animais afetados e progressão.",
      "Amostras e necropsias devem seguir orientação veterinária e regras de biossegurança e laboratório.",
    ],
    watch: [
      "Diarreia com desidratação, fezes com sangue, febre, manchas arroxeadas, sinais nervosos, aborto em série, morte súbita ou rápida disseminação.",
    ],
    records: [
      "Sinais, idade, setor, número de casos, mortes, evolução, histórico sanitário, tratamentos prescritos e resultados laboratoriais.",
    ],
    urgency: "Em suspeita de peste suína clássica ou outra doença de notificação obrigatória, não movimente animais ou produtos e comunique imediatamente o Serviço Veterinário Oficial. A página do MAPA explica as obrigações do PNSS.",
    sourceIds: ["embrapaDoencas", "mapaSanidade"],
  },
  {
    id: "medicamentos-carencia",
    category: "Sanidade e biosseguridade",
    phase: "Todas as fases",
    title: "Medicamentos, prescrição e período de carência",
    summary: "Medicamentos devem ser usados apenas conforme indicação e prescrição do médico-veterinário, observando produto, animal, dose prescrita, via, duração, carência e legislação.",
    practices: [
      "Registre nome comercial e princípio ativo conforme rótulo e prescrição, lote, validade, fornecedor e armazenamento.",
      "Transcreva a orientação veterinária com fidelidade; não altere dose, via, intervalo ou duração por conta própria.",
      "Registre cada administração, responsável, animal ou grupo, data, produto, lote e ocorrência.",
      "Calcule e registre a data de liberação de carne ou leite somente a partir da carência formalmente indicada para aquele produto e uso.",
      "Mantenha produtos vencidos segregados e descarte conforme orientação e legislação; não os use em animais.",
      "Não compartilhe seringas ou agulhas entre animais sem protocolo de biossegurança, nem reutilize materiais descartáveis.",
    ],
    watch: [
      "Produto sem rótulo, validade ilegível, armazenamento incorreto, prescrição incompleta, registro sem lote ou carência desconhecida.",
    ],
    records: [
      "Prescrição, médico-veterinário, produto, lote, validade, via, dose prescrita, datas, responsáveis, evolução e carência.",
    ],
    urgency: "Na dúvida sobre a prescrição, reação adversa, erro de aplicação ou data de carência, suspenda novas decisões por conta própria e contate o médico-veterinário responsável.",
    sourceIds: ["mapaAntimicrobianos", "mapaUsoResponsavel", "mapaSanidade"],
  },
  {
    id: "bem-estar",
    category: "Bem-estar",
    phase: "Todas as fases",
    title: "Bem-estar, comportamento e manejo calmo",
    summary: "Bem-estar exige que os animais tenham acesso a água e alimento, conforto, segurança, possibilidade de expressar comportamentos e proteção contra dor, medo e sofrimento evitáveis.",
    practices: [
      "Conduza os suínos com calma, sem bater, chutar, torcer membros ou usar estímulos dolorosos.",
      "Mantenha pisos em boas condições, áreas de descanso secas e recursos acessíveis a todos.",
      "Observe agressões, mordedura de cauda, feridas, medo, apatia, estereotipias e competição por alimento ou água.",
      "Implemente enriquecimento ambiental seguro, manipulável e adequado à categoria, com manutenção e higiene.",
      "Ajuste lotação, agrupamento e acesso aos recursos para reduzir disputa e lesões.",
      "Treine todos os funcionários sobre manejo, identificação de dor, contenção e resposta a emergências.",
    ],
    watch: [
      "Animal incapaz de levantar, lesão grave, sofrimento prolongado, agressão contínua, mordedura de cauda ou falta de acesso a alimento e água.",
    ],
    records: [
      "Lesões, agressões, intervenções, enriquecimento disponível, treinamento de equipe, mortalidade e medidas corretivas.",
    ],
    sourceIds: ["mapaBoasPraticas", "mapaIN113", "embrapaBemEstar", "embrapaProducao"],
  },
  {
    id: "dejetos",
    category: "Sustentabilidade",
    phase: "Toda a granja",
    title: "Dejetos, resíduos e proteção ambiental",
    summary: "O manejo de dejetos precisa proteger água, solo, animais, trabalhadores e vizinhança. A solução deve considerar volume gerado, estrutura, clima, solo, exigências ambientais e licenças locais.",
    practices: [
      "Separe águas pluviais limpas dos efluentes da granja sempre que a estrutura permitir.",
      "Mantenha canaletas, caixas, esterqueiras, lagoas ou biodigestores em boas condições e com capacidade adequada.",
      "Evite vazamentos, transbordamentos e lançamento em cursos d'água ou solo sem tratamento e autorização.",
      "Planeje aplicação agronômica somente com critérios técnicos, análise, dose, época e área compatíveis.",
      "Destine carcaças, perfurocortantes, embalagens e resíduos de medicamentos por vias apropriadas; não descarte na natureza ou em lixo comum quando houver regra específica.",
      "Reduza desperdício de água e ração, sem comprometer o acesso dos animais.",
    ],
    watch: [
      "Vazamento, odor excessivo, moscas, roedores, transbordamento, contaminação de poço ou drenagem para fora da área controlada.",
    ],
    records: [
      "Volume e destino dos resíduos, manutenção, retirada, tratamento, análises, aplicação em solo e documentos ambientais.",
    ],
    sourceIds: ["embrapaPerguntas", "embrapaCarcacas", "mapaBoasPraticas"],
  },
  {
    id: "indicadores",
    category: "Gestão e indicadores",
    phase: "Todas as fases",
    title: "Indicadores para melhorar o resultado",
    summary: "Indicador bom é aquele calculado sempre da mesma maneira, com dados confiáveis e comparado ao histórico da própria granja e a referências equivalentes.",
    practices: [
      "Acompanhe taxa de parto, repetição de cio, nascidos vivos, natimortos, mortalidade pré-desmame e leitões desmamados por leitegada.",
      "Na creche e terminação, acompanhe peso de entrada e saída, ganho médio diário, consumo, conversão alimentar, mortalidade e refugagem.",
      "Calcule custo de ração por animal e por kg de ganho, custo por leitão desmamado e receita por lote.",
      "Compare lotes com a mesma fase, período, genética, ração e método de pesagem sempre que possível.",
      "Investigue variações grandes; não altere dieta ou protocolo só para corrigir um número sem entender a causa.",
      "Estabeleça metas da propriedade com veterinário, nutricionista e assistência técnica, sem copiar benchmarks de sistemas industriais diferentes.",
    ],
    watch: [
      "Indicadores sem denominador consistente, pesagens feitas em balanças diferentes, mortalidade sem causa registrada ou consumo estimado sem medir estoque.",
    ],
    records: [
      "Nascidos vivos, natimortos, desmamados, mortes, animais alojados, peso, ração consumida, dias de alojamento, custos e receita.",
    ],
    sourceIds: ["embrapaPerguntas", "embrapaProducao"],
  },
];

export const DAILY_CHECKLIST = [
  "Água disponível em todos os setores; verificar bebedouros, vazamentos e vazão anormal.",
  "Ração correta para a fase; conferir consumo, sobras, comedouros e estoque.",
  "Observar todos os lotes: apetite, comportamento, respiração, fezes, locomoção e pele.",
  "Conferir leitões recém-nascidos, mamadas, aquecimento e condição da matriz.",
  "Medir temperatura e umidade em pontos representativos; conferir ventilação e alarmes.",
  "Retirar resíduos e cama molhada quando necessário; manter corredores e baias seguros.",
  "Registrar mortes, nascimentos, transferências, pesagens, tratamentos prescritos e ocorrências.",
];

export const WEEKLY_CHECKLIST = [
  "Revisar consumo de água e ração por setor e comparar com a semana anterior.",
  "Conferir estoque, lotes, validade e condições de armazenamento de ração e medicamentos.",
  "Revisar matrizes previstas para parto, coberturas, retornos ao cio e diagnósticos pendentes.",
  "Inspecionar exaustores, entradas de ar, cortinas, aquecedores, alarmes e gerador.",
  "Avaliar mortalidade, refugagem, diarreia, tosse, lesões e animais isolados.",
  "Revisar limpeza, controle de pragas, registros de visitantes e barreiras sanitárias.",
  "Revisar tarefas atrasadas e definir responsáveis e prazos de correção.",
];

export const BATCH_CHECKLIST = [
  "Planejar entrada e saída de animais e a separação por fase.",
  "Verificar origem, documentação e condição sanitária dos animais recebidos.",
  "Preparar e testar água, ração, comedouros, bebedouros e ambiência.",
  "Executar limpeza, desinfecção, secagem e vazio sanitário definido pelo protocolo.",
  "Registrar quantidade, peso, lote, origem, destino, perdas e consumo.",
  "Revisar resultados do lote e definir ações corretivas com a assistência técnica.",
];
