/** Exportação de tabelas. Funções de montagem são puras e testadas. */
export type Cell = string | number | null | undefined;

/** Evita que planilhas executem conteúdo começando com =, +, -, @ (injeção de fórmula). */
export function safeCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? String(v).replace(".", ",") : String(v);
  return typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function buildCsv(
  title: string,
  header: string[],
  rows: Cell[][],
  generatedAt = new Date(),
) {
  const esc = (v: Cell) => `"${safeCell(v).replace(/"/g, '""')}"`;
  return [
    `"Fazenda Santo Antônio — ${title.replace(/"/g, '""')}"`,
    `"Gerado em ${generatedAt.toLocaleString("pt-BR")}"`,
    "",
    header.map(esc).join(";"),
    ...rows.map((r) => r.map(esc).join(";")),
  ].join("\r\n");
}

export function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function download(filename: string, content: BlobPart, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadCsv(title: string, header: string[], rows: Cell[][]) {
  download(
    `${slug(title)}-${new Date().toISOString().slice(0, 10)}.csv`,
    "\ufeff" + buildCsv(title, header, rows),
    "text/csv;charset=utf-8",
  );
}
