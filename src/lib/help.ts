/** Manual do sistema: textos de uso (não são dados da granja). */
export type HelpTopic = { id: string; area: string; title: string; steps: string[]; link?: string };

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "primeiro-acesso",
    area: "Começo",
    title: "Primeiro acesso e equipe",
    link: "/usuarios",
    steps: [
      "O administrador cria a conta e entra em Equipe e permissões.",
      "Gere um código de acesso e envie para o funcionário; ele cria a conta com o código e já entra na sua granja.",
      "Escolha o perfil de cada pessoa: administrador, gerente, veterinário, funcionário ou consulta (só leitura).",
      "As permissões valem no banco de dados: esconder um botão não é a única proteção.",
    ],
  },
  {
    id: "parametros",
    area: "Começo",
    title: "Ajustar os parâmetros da granja",
    link: "/configuracoes",
    steps: [
      "Em Configurações da granja › Parâmetros de manejo, informe os dias de gestação, diagnóstico e idade de desmame que a granja usa.",
      "Os lembretes de diagnóstico e desmame só são criados quando esses prazos estão preenchidos.",
    ],
  },
  {
    id: "matriz",
    area: "Rebanho",
    title: "Cadastrar uma matriz",
    link: "/matrizes",
    steps: [
      "Matrizes › Nova matriz. O brinco é obrigatório e não pode repetir entre matrizes ativas.",
      "No prontuário você adiciona foto, imprime o QR Code e vê toda a linha do tempo.",
      "Matriz descartada ou vendida deve ser arquivada (não apagada) para manter o histórico.",
    ],
  },
  {
    id: "cobertura",
    area: "Rebanho",
    title: "Registrar cobertura ou inseminação",
    link: "/manejo-guiado",
    steps: [
      "Manejo guiado › Cobertura / inseminação.",
      "Escolha a matriz (vazia ou coberta), informe o cio, o reprodutor ou o lote de sêmen e as doses.",
      "Ao confirmar, o sistema grava tudo de uma vez, baixa as doses do lote e cria os lembretes de retorno ao cio e diagnóstico.",
    ],
  },
  {
    id: "parto",
    area: "Maternidade",
    title: "Registrar um parto",
    link: "/manejo-guiado",
    steps: [
      "Manejo guiado › Parto. Escolha o ciclo ativo da matriz.",
      "Informe data, horários, intercorrências e os números de nascidos vivos, natimortos e mumificados.",
      "Opcional: crie o prontuário de cada leitão (sexo, peso, colostro, ferro).",
      "Se algo não fechar, o parto não é gravado pela metade: corrija e confirme de novo.",
    ],
  },
  {
    id: "morte-leitao",
    area: "Maternidade",
    title: "Morte ou transferência de leitão",
    link: "/maternidade",
    steps: [
      "Na Maternidade, use Morte ou Transferir na leitegada.",
      "Os totais da leitegada mudam só por esses eventos, então o histórico sempre explica o número atual.",
    ],
  },
  {
    id: "desmame",
    area: "Maternidade",
    title: "Registrar o desmame",
    link: "/manejo-guiado",
    steps: [
      "Manejo guiado › Desmame. Escolha a leitegada.",
      "Informe machos, fêmeas, peso médio ou os pesos individuais e o destino.",
      "A matriz volta para vazia e a tarefa de desmame da agenda é concluída.",
    ],
  },
  {
    id: "agenda",
    area: "Rotina",
    title: "Agenda e lembretes",
    link: "/agenda",
    steps: [
      "A agenda junta tarefas, previsões de parto, diagnósticos e desmames calculados pelas datas registradas.",
      "O sino no topo mostra o que está atrasado ou vence hoje.",
    ],
  },
  {
    id: "turno",
    area: "Rotina",
    title: "Passagem de turno",
    link: "/rotina",
    steps: [
      "Rotina da equipe › Passar turno: escreva o resumo, as pendências e as ocorrências.",
      "Quem assume clica em Confirmar recebimento. Depois disso o registro fica travado.",
    ],
  },
  {
    id: "problema",
    area: "Rotina",
    title: "Relatar um problema no sistema",
    link: "/rotina",
    steps: [
      "Rotina da equipe › Problemas › Relatar problema.",
      "Diga o que fez, o que esperava e o que apareceu. Administrador ou gerente acompanha e marca como resolvido.",
    ],
  },
  {
    id: "offline",
    area: "Rotina",
    title: "Usar sem internet",
    steps: [
      "Instale o app pelo botão de download no topo.",
      "Sem sinal, os lançamentos suportados ficam na fila do aparelho e são enviados sozinhos quando a internet volta.",
      "O indicador no topo mostra quantos lançamentos aguardam envio. Não limpe os dados do navegador com itens pendentes.",
    ],
  },
  {
    id: "saude",
    area: "Saúde",
    title: "Medicamentos e protocolos",
    link: "/sanidade",
    steps: [
      "Registre aplicações com produto, lote, dose prescrita e carência.",
      "Os protocolos sanitários são cadastrados por administrador, gerente ou veterinário.",
      "O assistente de IA não prescreve medicamentos nem substitui o médico-veterinário.",
    ],
  },
  {
    id: "relatorios",
    area: "Gestão",
    title: "Relatórios e exportação",
    link: "/relatorios",
    steps: [
      "Escolha o relatório e o período. Todos os números vêm dos registros da granja.",
      "Exporte em Excel (.xlsx) ou CSV.",
    ],
  },
  {
    id: "backup",
    area: "Gestão",
    title: "Cópia de segurança",
    link: "/configuracoes",
    steps: [
      "Configurações da granja › Cópia de segurança › Gerar e baixar cópia (administrador ou gerente).",
      "Faça ao menos uma vez por semana e guarde fora do celular.",
      "Use Conferir uma cópia para ver se o arquivo está íntegro. A restauração é feita pelo responsável técnico, conforme o manual técnico.",
    ],
  },
];

export function searchHelp(query: string, topics = HELP_TOPICS): HelpTopic[] {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return topics;
  return topics.filter((t) => {
    const text = norm([t.area, t.title, ...t.steps].join(" "));
    return words.every((w) => text.includes(w));
  });
}
