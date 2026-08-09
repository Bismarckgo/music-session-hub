import type { Tables } from "@/integrations/supabase/types";

export type WorkVersion = Tables<"work_versions">;
export type Release = Tables<"releases">;
export type ReleaseTrack = Tables<"release_tracks">;
export type RoyaltyReport = Tables<"royalty_reports">;
export type RoyaltyLine = Tables<"royalty_lines">;

export const VERSION_TYPES = [
  "original",
  "radio_edit",
  "extended",
  "remix",
  "live",
  "acoustic",
  "instrumental",
  "a_cappella",
  "demo",
] as const;

export const VERSION_TYPE_LABELS: Record<string, string> = {
  original: "Original",
  radio_edit: "Radio edit",
  extended: "Extended",
  remix: "Remix",
  live: "En vivo",
  acoustic: "Acústica",
  instrumental: "Instrumental",
  a_cappella: "A cappella",
  demo: "Demo",
};

export const RELEASE_TYPES = ["single", "ep", "album", "compilation"] as const;

export const RELEASE_TYPE_LABELS: Record<string, string> = {
  single: "Single",
  ep: "EP",
  album: "Álbum",
  compilation: "Compilado",
};

export const RELEASE_STATUSES = ["planned", "delivered", "released", "takedown"] as const;

export const RELEASE_STATUS_LABELS: Record<string, string> = {
  planned: "Planeado",
  delivered: "Entregado",
  released: "Publicado",
  takedown: "Retirado",
};

export const RELEASE_STATUS_CLASSES: Record<string, string> = {
  planned: "bg-secondary text-secondary-foreground",
  delivered: "bg-accent text-accent-foreground",
  released: "bg-primary text-primary-foreground",
  takedown: "bg-destructive text-destructive-foreground",
};

export const ROYALTY_SOURCES = [
  "DistroKid",
  "TuneCore",
  "CD Baby",
  "ONErpm",
  "Symphonic",
  "The MLC",
  "ASCAP",
  "BMI",
  "Songtrust",
  "Otra",
] as const;

export const MATCH_METHOD_LABELS: Record<string, string> = {
  isrc_work: "ISRC de la obra",
  isrc_version: "ISRC de una versión",
  title: "Título",
  manual: "Manual",
  unmatched: "Sin conciliar",
};

export function normalizeIsrc(v: string | null | undefined): string {
  return (v ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

export function normalizeTitle(v: string | null | undefined): string {
  return (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── CSV ───────────────────────────────────────────────────────────────────
export function parseCSVRows(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQ = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === "," || ch === ";" || ch === "\t") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

const ROYALTY_ALIASES: Record<string, string[]> = {
  isrc: ["isrc", "isrc code", "codigo isrc", "código isrc"],
  title: ["title", "song title", "titulo", "título", "track", "track title", "song", "work title"],
  artist: ["artist", "artista", "artist name", "performer"],
  platform: ["platform", "store", "tienda", "dsp", "service", "source", "retailer"],
  territory: ["territory", "country", "pais", "país", "territorio"],
  units: ["units", "quantity", "streams", "plays", "cantidad", "unidades"],
  amount: [
    "amount",
    "earnings",
    "revenue",
    "net revenue",
    "payable",
    "royalty",
    "royalties",
    "total",
    "importe",
    "monto",
    "ingresos",
  ],
  currency: ["currency", "moneda"],
};

function pickField(row: Record<string, string>, field: string): string | null {
  const aliases = ROYALTY_ALIASES[field] ?? [field];
  for (const a of aliases) {
    if (row[a] != null && row[a] !== "") return row[a];
  }
  // fuzzy contains
  for (const [k, v] of Object.entries(row)) {
    if (!v) continue;
    if (aliases.some((a) => k.includes(a))) return v;
  }
  return null;
}

function toNumber(v: string | null): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export type ParsedRoyaltyLine = {
  isrc: string | null;
  title: string | null;
  artist: string | null;
  platform: string | null;
  territory: string | null;
  units: number;
  amount: number;
  currency: string;
};

export function parseRoyaltyCSV(text: string, fallbackCurrency = "USD"): ParsedRoyaltyLine[] {
  return parseCSVRows(text)
    .map((row) => {
      const isrc = normalizeIsrc(pickField(row, "isrc"));
      return {
        isrc: isrc || null,
        title: pickField(row, "title"),
        artist: pickField(row, "artist"),
        platform: pickField(row, "platform"),
        territory: pickField(row, "territory"),
        units: toNumber(pickField(row, "units")),
        amount: toNumber(pickField(row, "amount")),
        currency: (pickField(row, "currency") || fallbackCurrency).toUpperCase().slice(0, 3),
      };
    })
    .filter((l) => l.isrc || l.title);
}

// ─── Reconciliación ────────────────────────────────────────────────────────
export type MatchIndex = {
  byWorkIsrc: Map<string, string>;
  byVersionIsrc: Map<string, { workId: string; versionId: string }>;
  byTitle: Map<string, string>;
};

export function buildMatchIndex(
  works: { id: string; title: string; isrc: string | null }[],
  versions: { id: string; work_id: string; isrc: string | null }[],
): MatchIndex {
  const byWorkIsrc = new Map<string, string>();
  const byTitle = new Map<string, string>();
  for (const w of works) {
    const isrc = normalizeIsrc(w.isrc);
    if (isrc) byWorkIsrc.set(isrc, w.id);
    const t = normalizeTitle(w.title);
    if (t && !byTitle.has(t)) byTitle.set(t, w.id);
  }
  const byVersionIsrc = new Map<string, { workId: string; versionId: string }>();
  for (const v of versions) {
    const isrc = normalizeIsrc(v.isrc);
    if (isrc) byVersionIsrc.set(isrc, { workId: v.work_id, versionId: v.id });
  }
  return { byWorkIsrc, byVersionIsrc, byTitle };
}

export type MatchResult = {
  work_id: string | null;
  version_id: string | null;
  match_method: keyof typeof MATCH_METHOD_LABELS;
};

export function matchLine(line: ParsedRoyaltyLine, index: MatchIndex): MatchResult {
  if (line.isrc) {
    const w = index.byWorkIsrc.get(line.isrc);
    if (w) return { work_id: w, version_id: null, match_method: "isrc_work" };
    const v = index.byVersionIsrc.get(line.isrc);
    if (v) return { work_id: v.workId, version_id: v.versionId, match_method: "isrc_version" };
  }
  const t = normalizeTitle(line.title);
  if (t) {
    const w = index.byTitle.get(t);
    if (w) return { work_id: w, version_id: null, match_method: "title" };
  }
  return { work_id: null, version_id: null, match_method: "unmatched" };
}
