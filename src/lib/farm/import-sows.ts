/** Importação de matrizes a partir de CSV (Excel › Salvar como CSV). Valida tudo antes de gravar. */
export type SowImportRow = {
  ear_tag: string;
  name: string | null;
  breed: string | null;
  birth_date: string | null;
  entry_date: string | null;
  origin: string | null;
  lineage: string | null;
  weight_kg: number | null;
  notes: string | null;
};
export type ImportLine = { line: number; row: SowImportRow | null; errors: string[] };

const HEADERS: Record<string, keyof SowImportRow> = {
  brinco: "ear_tag",
  identificacao: "ear_tag",
  "ear tag": "ear_tag",
  nome: "name",
  raca: "breed",
  nascimento: "birth_date",
  "data de nascimento": "birth_date",
  entrada: "entry_date",
  "data de entrada": "entry_date",
  origem: "origin",
  linhagem: "lineage",
  genetica: "lineage",
  peso: "weight_kg",
  "peso (kg)": "weight_kg",
  observacoes: "notes",
  obs: "notes",
};
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();

/** Divide o CSV respeitando aspas; detecta ";" (Excel brasileiro) ou ",". */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\ufeff/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]!;
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Aceita dd/mm/aaaa ou aaaa-mm-dd; devolve ISO ou null; "erro" se inválida. */
export function parseDate(v: string): string | null | "erro" {
  const s = v.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s),
    iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (br) [d, m, y] = [Number(br[1]), Number(br[2]), Number(br[3])];
  else if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return "erro";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d)
    return "erro";
  return dt.toISOString().slice(0, 10);
}

export function validateSowImport(
  rows: string[][],
  existingTags: string[],
  today: string,
): { lines: ImportLine[]; missing: string | null } {
  const [header, ...body] = rows;
  if (!header) return { lines: [], missing: "Arquivo vazio." };
  const cols = header.map((h) => HEADERS[norm(h)] ?? null);
  if (!cols.includes("ear_tag")) return { lines: [], missing: "Falta a coluna Brinco." };
  const existing = new Set(existingTags.map((t) => t.trim().toLowerCase()));
  const seen = new Set<string>();
  const blank = (cells: string[]) => cells.every((c) => c.trim() === "");
  const lines = body.map((cells, i): ImportLine | null => {
    if (blank(cells)) return null;
    const errors: string[] = [];
    const raw: Partial<Record<keyof SowImportRow, string>> = {};
    cols.forEach((k, j) => {
      if (k) raw[k] = (cells[j] ?? "").trim();
    });
    const text = (k: keyof SowImportRow) => (raw[k] ? raw[k]!.slice(0, 200) : null);
    const tag = (raw.ear_tag ?? "").trim();
    if (!tag) errors.push("brinco vazio");
    else if (existing.has(tag.toLowerCase())) errors.push("brinco já cadastrado");
    else if (seen.has(tag.toLowerCase())) errors.push("brinco repetido no arquivo");
    seen.add(tag.toLowerCase());
    if (/^[=+\-@]/.test(tag)) errors.push("brinco não pode começar com = + - @");
    const birth = parseDate(raw.birth_date ?? ""),
      entry = parseDate(raw.entry_date ?? "");
    if (birth === "erro") errors.push("nascimento inválido");
    if (entry === "erro") errors.push("entrada inválida");
    if (typeof birth === "string" && birth !== "erro" && birth > today)
      errors.push("nascimento no futuro");
    if (typeof entry === "string" && entry !== "erro" && entry > today)
      errors.push("entrada no futuro");
    if (
      typeof birth === "string" &&
      typeof entry === "string" &&
      birth !== "erro" &&
      entry !== "erro" &&
      entry < birth
    )
      errors.push("entrada antes do nascimento");
    let weight: number | null = null;
    if (raw.weight_kg) {
      weight = Number(raw.weight_kg.replace(",", "."));
      if (!(weight > 0 && weight < 500)) errors.push("peso inválido");
    }
    if (errors.length) return { line: i + 2, row: null, errors };
    return {
      line: i + 2,
      errors,
      row: {
        ear_tag: tag,
        name: text("name"),
        breed: text("breed"),
        birth_date: birth as string | null,
        entry_date: entry as string | null,
        origin: text("origin"),
        lineage: text("lineage"),
        weight_kg: weight,
        notes: text("notes"),
      },
    };
  });
  return { lines: lines.filter((l): l is ImportLine => l !== null), missing: null };
}

export const SOW_IMPORT_TEMPLATE =
  "Brinco;Nome;Raça;Nascimento;Entrada;Origem;Linhagem;Peso;Observações\n";
