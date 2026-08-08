import type { Work, Collaborator } from "./catalog";
import { buildERN } from "./ddex";

export const PUBLISHING_PLATFORMS = [
  "ASCAP",
  "BMI",
  "SESAC",
  "The MLC",
  "Songtrust",
  "Sentric",
] as const;

export type PublishingPlatform = (typeof PUBLISHING_PLATFORMS)[number];

export const REGISTRATION_STATUSES = [
  "no_configurado",
  "pendiente",
  "preparado",
  "registrado",
  "sincronizado",
  "error",
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  no_configurado: "No configurado",
  pendiente: "Pendiente",
  preparado: "Preparado",
  registrado: "Registrado",
  sincronizado: "Sincronizado",
  error: "Error",
};

export const STATUS_CLASSES: Record<RegistrationStatus, string> = {
  no_configurado: "bg-secondary text-muted-foreground",
  pendiente: "bg-secondary text-secondary-foreground",
  preparado: "bg-accent text-accent-foreground",
  registrado: "bg-primary/80 text-primary-foreground",
  sincronizado: "bg-primary text-primary-foreground",
  error: "bg-destructive text-destructive-foreground",
};

export const PUBLISHING_TYPES = ["SelfAdmin", "Songtrust", "Sentric", "Other"] as const;
export type PublishingType = (typeof PUBLISHING_TYPES)[number];

export const PUBLISHING_TYPE_LABELS: Record<PublishingType, string> = {
  SelfAdmin: "Yo mismo",
  Songtrust: "Songtrust",
  Sentric: "Sentric",
  Other: "Otro",
};

export type PublishingProfile = {
  id: string;
  user_id: string;
  publishing_type: PublishingType;
  pro: string | null;
  publisher_name: string | null;
  publisher_ipi: string | null;
  writer_ipi: string | null;
  external_identifiers: Record<string, string>;
  last_sync: string | null;
};

export type WorkRegistration = {
  id: string;
  user_id: string;
  work_id: string;
  platform: PublishingPlatform;
  status: RegistrationStatus;
  registration_date: string | null;
  external_id: string | null;
  notes: string | null;
  last_checked: string | null;
};

/**
 * Platforms relevant to a given publishing setup.
 * If the user delegates to Songtrust/Sentric, CST should not attempt to
 * re-register works in The MLC and PROs — those are handled by the admin.
 */
export function relevantPlatforms(
  type: PublishingType | null | undefined,
): PublishingPlatform[] {
  if (type === "Songtrust") return ["Songtrust"];
  if (type === "Sentric") return ["Sentric"];
  return ["ASCAP", "BMI", "SESAC", "The MLC"];
}

// ─── Validation ────────────────────────────────────────────────────────────
export type ValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export function validateWorkForPublishing(
  work: Work,
  collaborators: Collaborator[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sum = collaborators.reduce((a, c) => a + Number(c.split_percent), 0);
  const rounded = Math.round(sum * 100) / 100;

  if (collaborators.length === 0) {
    issues.push({ level: "error", code: "no_collabs", message: "Sin colaboradores registrados." });
  } else if (rounded !== 100) {
    issues.push({
      level: "error",
      code: "splits_sum",
      message: `Los splits suman ${rounded}% (debe ser 100%).`,
    });
  }

  const writers = collaborators.filter((c) =>
    /compositor|writer|autor/i.test(c.role),
  );
  if (writers.length === 0) {
    issues.push({
      level: "error",
      code: "no_writer",
      message: "Debe haber al menos un compositor.",
    });
  }

  const publishers = collaborators.filter((c) => c.publisher && c.publisher.trim() !== "");
  if (publishers.length === 0) {
    issues.push({
      level: "warning",
      code: "no_publisher",
      message: "Ningún colaborador tiene publisher asignado.",
    });
  }

  for (const c of collaborators) {
    if (c.ipi && !/^\d{9,11}$/.test(c.ipi.replace(/\s|-/g, ""))) {
      issues.push({
        level: "warning",
        code: "invalid_ipi",
        message: `IPI/CAE inválido para ${c.name} (9–11 dígitos).`,
      });
    }
  }

  if (work.isrc && !/^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(work.isrc.replace(/-/g, ""))) {
    issues.push({
      level: "warning",
      code: "invalid_isrc",
      message: "Formato de ISRC no estándar.",
    });
  }
  if (work.iswc && !/^T-?\d{3}\.?\d{3}\.?\d{3}\.?-?\d$/i.test(work.iswc)) {
    issues.push({
      level: "warning",
      code: "invalid_iswc",
      message: "Formato de ISWC no estándar.",
    });
  }

  if (!work.iswc) {
    issues.push({ level: "warning", code: "missing_iswc", message: "Sin ISWC asignado." });
  }
  if (!work.genre) {
    issues.push({ level: "warning", code: "missing_genre", message: "Sin género." });
  }

  return issues;
}

export function canExport(issues: ValidationIssue[]): boolean {
  return !issues.some((i) => i.level === "error");
}

// ─── Exporters (adapter pattern) ───────────────────────────────────────────
export type ExportContext = {
  work: Work;
  collaborators: Collaborator[];
  profile: PublishingProfile | null;
};

export interface Exporter {
  id: string;
  label: string;
  extension: string;
  mime: string;
  build(ctx: ExportContext): string;
}

function csvEsc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const ExportCSV: Exporter = {
  id: "csv",
  label: "CSV",
  extension: "csv",
  mime: "text/csv;charset=utf-8",
  build({ work, collaborators }) {
    const header = [
      "Title",
      "CSTID",
      "ISRC",
      "ISWC",
      "Genre",
      "BPM",
      "Key",
      "CollaboratorName",
      "Role",
      "SplitPercent",
      "IPI",
      "PRO",
      "Publisher",
    ];
    const rows = collaborators.length
      ? collaborators.map((c) => [
          work.title,
          work.fingerprint,
          work.isrc ?? "",
          work.iswc ?? "",
          work.genre ?? "",
          work.bpm ?? "",
          work.musical_key ?? "",
          c.name,
          c.role,
          Number(c.split_percent),
          c.ipi ?? "",
          c.pro ?? "",
          c.publisher ?? "",
        ])
      : [[work.title, work.fingerprint, work.isrc ?? "", work.iswc ?? "", work.genre ?? "", work.bpm ?? "", work.musical_key ?? "", "", "", "", "", "", ""]];
    return [header, ...rows].map((r) => r.map(csvEsc).join(",")).join("\n");
  },
};

export const ExportJSON: Exporter = {
  id: "json",
  label: "JSON",
  extension: "json",
  mime: "application/json;charset=utf-8",
  build({ work, collaborators, profile }) {
    return JSON.stringify(
      {
        cstid: work.fingerprint,
        title: work.title,
        isrc: work.isrc,
        iswc: work.iswc,
        genre: work.genre,
        bpm: work.bpm,
        musical_key: work.musical_key,
        publisher: profile
          ? {
              name: profile.publisher_name,
              ipi: profile.publisher_ipi,
              pro: profile.pro,
            }
          : null,
        collaborators: collaborators.map((c) => ({
          name: c.name,
          role: c.role,
          split_percent: Number(c.split_percent),
          ipi: c.ipi,
          pro: c.pro,
          publisher: c.publisher,
        })),
      },
      null,
      2,
    );
  },
};

/**
 * CWR (Common Works Registration) exporter — CISAC standard.
 * This is an extensible skeleton that emits the record types needed for a
 * minimal NWR (New Work Registration) transmission. Full CWR compliance
 * (character encoding, exact field widths, transaction sequencing) is left
 * to future adapters per platform.
 */
function pad(s: string | number | null | undefined, len: number, char = " ", right = true): string {
  const str = (s ?? "").toString().slice(0, len);
  return right ? str.padEnd(len, char) : str.padStart(len, char);
}

export const ExportCWR: Exporter = {
  id: "cwr",
  label: "CWR (CISAC)",
  extension: "cwr",
  mime: "text/plain;charset=utf-8",
  build({ work, collaborators, profile }) {
    const sender = profile?.publisher_name ?? "CST";
    const senderIpi = profile?.publisher_ipi ?? "";
    const today = new Date();
    const yyyymmdd =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");
    const hhmmss =
      String(today.getHours()).padStart(2, "0") +
      String(today.getMinutes()).padStart(2, "0") +
      String(today.getSeconds()).padStart(2, "0");

    const lines: string[] = [];
    // HDR — Transmission Header
    lines.push(
      `HDR${pad("PB", 2)}${pad(senderIpi, 11, "0", false)}${pad(sender, 45)}01.10${yyyymmdd}${hhmmss}${yyyymmdd}`,
    );
    // GRP — Group Header
    lines.push(`GRH${pad("NWR", 3)}${pad("00001", 5, "0", false)}02.10`);

    // NWR — New Work Registration
    lines.push(
      `NWR${pad("0000000001", 8, "0", false)}${pad("00000000", 8, "0", false)}${pad(work.title, 60)}${pad("", 2)}${pad(work.fingerprint, 14)}${pad(work.iswc?.replace(/[^A-Z0-9]/gi, "") ?? "", 11)}`,
    );

    let seq = 2;
    const writers = collaborators.filter((c) => /compositor|writer|autor/i.test(c.role));
    for (const w of writers) {
      lines.push(
        `SWR${pad(String(seq++).padStart(8, "0"), 8)}${pad("00000000", 8)}${pad((w.ipi ?? "").replace(/\D/g, ""), 11, "0", false)}${pad(w.name, 45)}${pad("", 30)}${pad("CA", 2)}${pad("", 1)}${pad(String(Math.round(Number(w.split_percent) * 100)), 5, "0", false)}${pad(w.pro ?? "", 11)}`,
      );
    }

    const publishers = collaborators.filter((c) => c.publisher);
    for (const p of publishers) {
      lines.push(
        `SPU${pad(String(seq++).padStart(8, "0"), 8)}${pad("00000000", 8)}${pad("01", 2)}${pad((p.ipi ?? "").replace(/\D/g, ""), 11, "0", false)}${pad(p.publisher ?? "", 45)}${pad("E", 1)}${pad(String(Math.round(Number(p.split_percent) * 100)), 5, "0", false)}${pad(p.pro ?? "", 11)}`,
      );
    }

    // GRT / TRL
    lines.push(`GRT${pad("00001", 5, "0", false)}${pad(String(lines.length).padStart(8, "0"), 8)}${pad(String(lines.length + 2).padStart(8, "0"), 8)}`);
    lines.push(`TRL${pad("00001", 5, "0", false)}${pad("00000001", 8)}${pad(String(lines.length + 1).padStart(8, "0"), 8)}`);

    return lines.join("\n");
  },
};

export const ExportDDEX: Exporter = {
  id: "ddex",
  label: "DDEX ERN 4.3",
  extension: "xml",
  mime: "application/xml;charset=utf-8",
  build({ work, collaborators, profile }) {
    return buildERN({
      work,
      collaborators,
      labelName: profile?.publisher_name ?? null,
      labelId: profile?.publisher_ipi ?? null,
    });
  },
};

export const EXPORTERS: Exporter[] = [ExportCSV, ExportJSON, ExportCWR, ExportDDEX];

export function downloadExport(ctx: ExportContext, exporter: Exporter) {
  const content = exporter.build(ctx);
  const blob = new Blob([content], { type: exporter.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ctx.work.fingerprint}.${exporter.extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Platform adapters (registry) ──────────────────────────────────────────
/**
 * A PlatformAdapter is the extension point that will let future official
 * APIs plug in without changing the core. Today most adapters only expose
 * `preparePayload`; when a platform ships a public register endpoint we
 * implement `register()` there and the rest of CST stays untouched.
 */
export interface PlatformAdapter {
  platform: PublishingPlatform;
  supportsSearch: boolean;
  supportsRegister: boolean;
  preparePayload(ctx: ExportContext): unknown;
}

const basePayload = (ctx: ExportContext) => ({
  cstid: ctx.work.fingerprint,
  title: ctx.work.title,
  isrc: ctx.work.isrc,
  iswc: ctx.work.iswc,
  writers: ctx.collaborators
    .filter((c) => /compositor|writer|autor/i.test(c.role))
    .map((c) => ({ name: c.name, ipi: c.ipi, pro: c.pro, split: Number(c.split_percent) })),
  publishers: ctx.collaborators
    .filter((c) => c.publisher)
    .map((c) => ({ name: c.publisher, ipi: c.ipi, split: Number(c.split_percent) })),
});

export const PLATFORM_ADAPTERS: Record<PublishingPlatform, PlatformAdapter> = {
  ASCAP: { platform: "ASCAP", supportsSearch: false, supportsRegister: false, preparePayload: basePayload },
  BMI: { platform: "BMI", supportsSearch: false, supportsRegister: false, preparePayload: basePayload },
  SESAC: { platform: "SESAC", supportsSearch: false, supportsRegister: false, preparePayload: basePayload },
  "The MLC": { platform: "The MLC", supportsSearch: true, supportsRegister: false, preparePayload: basePayload },
  Songtrust: { platform: "Songtrust", supportsSearch: false, supportsRegister: false, preparePayload: basePayload },
  Sentric: { platform: "Sentric", supportsSearch: false, supportsRegister: false, preparePayload: basePayload },
};