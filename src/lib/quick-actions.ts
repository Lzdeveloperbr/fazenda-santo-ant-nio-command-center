import type { Role } from "@/lib/access";

export type QuickAction = { to: string; label: string; detail: string };

/** Ações rápidas por perfil: só aparece o que o perfil consegue concluir. */
export function quickActionsFor(role: Role | null): QuickAction[] {
  if (!role) return [];
  const read: QuickAction[] = [
    { to: "/relatorios", label: "Relatórios", detail: "Indicadores do período" },
    { to: "/resumo-do-dia", label: "Resumo do dia", detail: "Para imprimir ou conferir" },
    { to: "/ajuda", label: "Ajuda", detail: "Como usar o sistema" },
  ];
  if (role === "consulta") return read;
  const field: QuickAction[] = [
    { to: "/manejo-guiado", label: "Cobertura, parto ou desmame", detail: "Passo a passo" },
    { to: "/maternidade", label: "Morte ou pesagem de leitão", detail: "Eventos da leitegada" },
    { to: "/vacinas", label: "Mapa de vacinação", detail: "Vacinas, peso e idade das porcas" },
    { to: "/rotina", label: "Passar o turno", detail: "Resumo e pendências" },
    { to: "/agenda", label: "Tarefas de hoje", detail: "Agenda da granja" },
  ];
  if (role === "funcionario") return [...field, read[1]!];
  if (role === "veterinario")
    return [
      { to: "/sanidade", label: "Registrar tratamento", detail: "Saúde e prevenção" },
      { to: "/agenda", label: "Protocolos e agenda", detail: "Calendário sanitário" },
      ...field.slice(0, 2),
      ...read,
    ];
  return [
    ...field,
    { to: "/financeiro", label: "Lançar no financeiro", detail: "Contas e caixa" },
    ...read,
  ];
}
