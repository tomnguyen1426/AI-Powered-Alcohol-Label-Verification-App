import { ApplicationDataSchema, type ApplicationData } from "./schema";

export const CSV_COLUMNS = [
  "file_name",
  "brand_name",
  "class_type",
  "beverage_type",
  "alcohol_content_percent",
  "net_contents",
  "producer_name_address",
  "country_of_origin",
  "is_import",
] as const;

export interface CsvRow {
  fileName: string;
  data: ApplicationData | null;
  error: string | null;
}

function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      if (text[i - 1] !== "\r" || field.length > 0 || row.length > 0) pushRow();
    } else if (ch === "\r") {
      // skip, handled by \n
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseApplicationsCsv(text: string): CsvRow[] {
  const rows = parseCsvLines(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (col: string) => header.indexOf(col);

  return rows.slice(1).map((cols) => {
    const get = (col: string) => {
      const i = idx(col);
      return i === -1 ? "" : (cols[i] ?? "").trim();
    };

    const fileName = get("file_name");
    const raw = {
      brand_name: get("brand_name"),
      class_type: get("class_type"),
      beverage_type: get("beverage_type") || "distilled_spirits",
      alcohol_content_percent: get("alcohol_content_percent") === "" ? null : get("alcohol_content_percent"),
      net_contents: get("net_contents"),
      producer_name_address: get("producer_name_address"),
      country_of_origin: get("country_of_origin"),
      is_import: ["true", "1", "yes"].includes(get("is_import").toLowerCase()),
    };

    const parsed = ApplicationDataSchema.safeParse(raw);
    return {
      fileName,
      data: parsed.success ? parsed.data : null,
      error: parsed.success ? null : parsed.error.issues.map((i) => i.message).join("; "),
    };
  });
}

export function applicationsCsvTemplate(): string {
  const header = CSV_COLUMNS.join(",");
  const example =
    "old-tom-bourbon.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,distilled_spirits,45,750 mL,\"Bottled by Old Tom Distillery, Bardstown, KY\",,false";
  return `${header}\n${example}\n`;
}
