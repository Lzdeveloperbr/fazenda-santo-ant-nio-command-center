/** Primeiros passos da granja, conferidos pelos registros (não por cliques). */
export type OnboardingInput = {
  farmFilled: boolean;
  settingsFilled: boolean;
  pens: number;
  sows: number;
  members: number;
  breedings: number;
};
export type Step = { id: string; title: string; detail: string; to: string; done: boolean };

export function onboardingSteps(i: OnboardingInput): Step[] {
  return [
    {
      id: "granja",
      title: "Dados da granja",
      detail: "Cidade, UF e documento",
      to: "/configuracoes",
      done: i.farmFilled,
    },
    {
      id: "parametros",
      title: "Prazos de manejo",
      detail: "Diagnóstico e idade de desmame",
      to: "/configuracoes",
      done: i.settingsFilled,
    },
    {
      id: "baias",
      title: "Baias cadastradas",
      detail: "Numere as baias por setor",
      to: "/baias",
      done: i.pens > 0,
    },
    {
      id: "matrizes",
      title: "Matrizes cadastradas",
      detail: "Uma a uma ou por planilha",
      to: "/importar-matrizes",
      done: i.sows > 0,
    },
    {
      id: "equipe",
      title: "Equipe com acesso",
      detail: "Gere o código para os funcionários",
      to: "/usuarios",
      done: i.members > 1,
    },
    {
      id: "cobertura",
      title: "Primeira cobertura",
      detail: "Pelo Manejo guiado",
      to: "/manejo-guiado",
      done: i.breedings > 0,
    },
  ];
}

export function progress(steps: Step[]) {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, pct: Math.round((done / steps.length) * 100) };
}
