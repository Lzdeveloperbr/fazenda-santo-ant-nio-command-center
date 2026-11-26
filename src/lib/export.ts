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

const xmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

function colName(i: number) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Planilha .xlsx mínima (uma aba), com título da fazenda e cabeçalho em negrito. */
export async function buildXlsx(title: string, header: string[], rows: Cell[][], generatedAt = new Date()): Promise<Uint8Array> {
  const { zipSync, strToU8 } = await import("fflate");
  const all: { cells: Cell[]; style: number }[] = [
    { cells: [`Fazenda Santo Antônio — ${title}`], style: 1 },
    { cells: [`Gerado em ${generatedAt.toLocaleString("pt-BR")}`], style: 0 },
    { cells: [], style: 0 },
    { cells: header, style: 1 },
    ...rows.map((r) => ({ cells: r, style: 0 })),
  ];
  const sheetRows = all.map((r, ri) => {
    const cells = r.cells.map((v, ci) => {
      const ref = `${colName(ci)}${ri + 1}`;
      const st = r.style ? ` s="${r.style}"` : "";
      if (v === null || v === undefined || v === "") return "";
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      // Texto sempre como texto (nunca fórmula).
      return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`;
    }).join("");
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  const sheetName = xmlEsc(title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Relatório");
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" xfId="0"/><xf fontId="1" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    "xl/worksheets/sheet1.xml": sheet,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

export async function downloadXlsx(title: string, header: string[], rows: Cell[][]) {
  const data = await buildXlsx(title, header, rows);
  download(`${slug(title)}-${new Date().toISOString().slice(0, 10)}.xlsx`, data as BlobPart, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
