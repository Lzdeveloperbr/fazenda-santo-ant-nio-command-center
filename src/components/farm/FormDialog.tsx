import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Dialog wrapping a form; children receives a close() callback. */
export function FormDialog({
  trigger, title, children,
}: { trigger: ReactNode; title: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

export function SubmitRow({ busy, label = "Salvar" }: { busy?: boolean; label?: string }) {
  return <Button type="submit" disabled={busy} className="h-11 w-full">{busy ? "Salvando…" : label}</Button>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm">{label}</span>
      {children}
    </label>
  );
}

export const selectCls = "h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm";
