import { useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type WizardStep = {
  title: string;
  content: ReactNode;
  /** Mensagem de erro quando o passo não pode avançar; null = válido. */
  validate?: () => string | null;
};

/**
 * Assistente passo a passo: só avança com o passo válido e só grava no fim,
 * numa única operação no servidor (a função do banco é atômica).
 */
export function Wizard({
  steps,
  onFinish,
  finishLabel,
  busy,
  error,
}: {
  steps: WizardStep[];
  onFinish: () => void;
  finishLabel: string;
  busy: boolean;
  error: string | null;
}) {
  const [i, setI] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  function next() {
    const e = step.validate?.() ?? null;
    setStepError(e);
    if (e) return;
    if (last) onFinish();
    else setI(i + 1);
  }
  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2" aria-label="Etapas">
        {steps.map((s, n) => (
          <li
            key={s.title}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${n === i ? "bg-primary text-primary-foreground" : n < i ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-background/20">
              {n < i ? <Check className="h-3 w-3" /> : n + 1}
            </span>
            {s.title}
          </li>
        ))}
      </ol>
      <div className="panel p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{step.title}</h2>
        {step.content}
        {(stepError || (last && error)) && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {stepError ?? error}
          </p>
        )}
      </div>
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          className="h-12"
          disabled={i === 0 || busy}
          onClick={() => {
            setStepError(null);
            setI(i - 1);
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button className="h-12 min-w-40" disabled={busy} onClick={next}>
          {busy ? (
            "Gravando…"
          ) : last ? (
            finishLabel
          ) : (
            <>
              Continuar
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
