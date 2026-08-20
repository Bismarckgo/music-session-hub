/**
 * Sistema de estados visual de CST.
 *
 * Un único vocabulario de estados compartido por Catálogo, Work Detail y sus
 * pestañas (Composición, Grabación, Créditos, Splits, Registros). El estado
 * nunca se comunica sólo con color: siempre lleva icono + texto.
 */
import type { Collaborator, Work } from "./catalog";
import type { RegistrationStatus } from "./publishing";

export type CstState = "complete" | "attention" | "blocked" | "pending" | "draft" | "none";

export const CST_STATE_LABELS: Record<CstState, string> = {
  complete: "Completo",
  attention: "Atención",
  blocked: "Bloqueado",
  pending: "Pendiente",
  draft: "Borrador",
  none: "No disponible",
};

const STATE_WEIGHT: Record<CstState, number> = {
  blocked: 5,
  attention: 4,
  pending: 3,
  draft: 2,
  none: 1,
  complete: 0,
};

/** Estado agregado: gana el más urgente. */
export function worstState(states: CstState[]): CstState {
  return states.reduce<CstState>(
    (acc, s) => (STATE_WEIGHT[s] > STATE_WEIGHT[acc] ? s : acc),
    "complete",
  );
}

export type FacetStatus = {
  state: CstState;
  /** Texto corto que acompaña al icono en tablas y resúmenes. */
  label: string;
  /** Explicación de una línea para el usuario. */
  detail?: string;
};

export type CompositionShareLike = {
  writer_share: number | string;
  publisher_share: number | string;
  is_active: boolean;
  name: string | null;
  role: string;
};

export type RecordingLike = {
  isrc: string | null;
  distribution_status: string;
};

export type RegistrationLike = {
  platform: string;
  status: string;
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function shareTotal(shares: CompositionShareLike[]): number {
  return round2(
    shares.filter((s) => s.is_active).reduce((sum, s) => sum + Number(s.writer_share ?? 0), 0),
  );
}

export function isWriterRole(role: string): boolean {
  return /compositor|writer|autor|letrista/i.test(role);
}

/**
 * Composición: necesita ISWC y autores identificados con shares que sumen 100%.
 */
export function compositionStatus(input: {
  iswc: string | null;
  hasComposition: boolean;
  shares: CompositionShareLike[];
  writers: number;
}): FacetStatus {
  const { iswc, hasComposition, shares, writers } = input;
  if (!hasComposition && !iswc && writers === 0) {
    return { state: "none", label: "Sin datos", detail: "Aún no hay composición registrada." };
  }
  const total = shareTotal(shares);
  if (writers === 0) {
    return { state: "attention", label: "Sin autores", detail: "Falta identificar a los autores." };
  }
  if (shares.length > 0 && total !== 100) {
    return {
      state: "attention",
      label: `${total}%`,
      detail: `Los shares de autor suman ${total}% (deben sumar 100%).`,
    };
  }
  if (!iswc) {
    return { state: "pending", label: "Sin ISWC", detail: "La obra todavía no tiene ISWC." };
  }
  return { state: "complete", label: "Completo" };
}

/** Grabación: necesita al menos un master identificado con ISRC. */
export function recordingStatus(input: {
  isrc: string | null;
  recordings: RecordingLike[];
}): FacetStatus {
  const { isrc, recordings } = input;
  if (recordings.length === 0 && !isrc) {
    return { state: "none", label: "Sin datos", detail: "Aún no hay grabación asociada." };
  }
  const withIsrc = recordings.filter((r) => r.isrc);
  if (recordings.length > 0 && withIsrc.length === 0 && !isrc) {
    return { state: "attention", label: "Sin ISRC", detail: "La grabación no tiene ISRC." };
  }
  if (recordings.length > withIsrc.length && !isrc) {
    return {
      state: "attention",
      label: "ISRC incompleto",
      detail: "Hay grabaciones sin ISRC asignado.",
    };
  }
  return { state: "complete", label: "Completo" };
}

/** Splits de composición, calculados siempre desde `composition_shares`. */
export function splitsStatus(input: {
  shares: CompositionShareLike[];
}): FacetStatus & { assigned: number } {
  const active = input.shares.filter((s) => s.is_active);
  if (active.length === 0) {
    return {
      state: "none",
      label: "—",
      assigned: 0,
      detail: "Todavía no hay participantes con porcentaje.",
    };
  }
  return splitsFromTotal(shareTotal(active));
}

function splitsFromTotal(total: number): FacetStatus & { assigned: number } {
  if (total === 100) return { state: "complete", label: "100%", assigned: total };
  if (total === 0) {
    return {
      state: "attention",
      label: "0%",
      assigned: 0,
      detail: "Ningún porcentaje asignado.",
    };
  }
  return {
    state: "attention",
    label: `${total}%`,
    assigned: total,
    detail:
      total > 100
        ? `Los splits suman ${total}%: hay ${round2(total - 100)}% de más.`
        : `Falta asignar ${round2(100 - total)}% de la composición.`,
  };
}

export const REGISTRATION_COMPLETE: RegistrationStatus[] = ["registrado", "sincronizado"];
export const REGISTRATION_PENDING: RegistrationStatus[] = [
  "pendiente",
  "preparado",
  "no_configurado",
];

/** Registros externos: PRO/CMO, mecánicos, copyright, grabación. */
export function registrationStatus(registrations: RegistrationLike[]): FacetStatus & {
  complete: number;
  total: number;
} {
  const total = registrations.length;
  const complete = registrations.filter((r) =>
    REGISTRATION_COMPLETE.includes(r.status as RegistrationStatus),
  ).length;
  if (total === 0) {
    return {
      state: "none",
      label: "—",
      complete: 0,
      total: 0,
      detail: "La obra no tiene registros externos todavía.",
    };
  }
  const withError = registrations.filter((r) => r.status === "error").length;
  if (withError > 0) {
    return {
      state: "attention",
      label: `${complete}/${total}`,
      complete,
      total,
      detail: `${withError} registro${withError === 1 ? "" : "s"} con error.`,
    };
  }
  if (complete < total) {
    return {
      state: "pending",
      label: `${complete}/${total}`,
      complete,
      total,
      detail: `${total - complete} registro${total - complete === 1 ? "" : "s"} sin completar.`,
    };
  }
  return { state: "complete", label: `${complete}/${total}`, complete, total };
}

export type WorkFacets = {
  composition: FacetStatus;
  recording: FacetStatus;
  splits: FacetStatus & { assigned: number };
  registration: FacetStatus & { complete: number; total: number };
  overall: FacetStatus;
};

export function workFacets(input: {
  work: Work;
  collaborators: Collaborator[];
  shares: CompositionShareLike[];
  hasComposition: boolean;
  recordings: RecordingLike[];
  registrations: RegistrationLike[];
}): WorkFacets {
  const { work, collaborators, shares, hasComposition, recordings, registrations } = input;
  const writers =
    shares.filter((s) => s.is_active && isWriterRole(s.role)).length ||
    collaborators.filter((c) => isWriterRole(c.role)).length;

  const composition = compositionStatus({
    iswc: work.iswc,
    hasComposition,
    shares,
    writers,
  });
  const recording = recordingStatus({ isrc: work.isrc, recordings });
  const splits = splitsStatus({ shares });
  const registration = registrationStatus(registrations);

  const facets = [composition, recording, splits, registration];
  const everythingEmpty = facets.every((f) => f.state === "none");
  const state = everythingEmpty
    ? "draft"
    : worstState(facets.map((f) => (f.state === "none" ? "draft" : f.state)));

  return {
    composition,
    recording,
    splits,
    registration,
    overall: {
      state,
      label: state === "complete" ? "Lista" : CST_STATE_LABELS[state],
      detail: facets.find((f) => f.state === state)?.detail,
    },
  };
}

/** Próxima acción sugerida para la obra, derivada de sus facetas. */
export function nextAction(facets: WorkFacets): { state: CstState; message: string } | null {
  const candidates: Array<FacetStatus> = [
    facets.splits,
    facets.composition,
    facets.recording,
    facets.registration,
  ];
  const issue = candidates.find(
    (f) => (f.state === "attention" || f.state === "blocked") && f.detail,
  );
  if (issue) return { state: issue.state, message: issue.detail as string };
  const pending = candidates.find((f) => f.state === "pending" && f.detail);
  if (pending) return { state: pending.state, message: pending.detail as string };
  const missing = candidates.find((f) => f.state === "none" && f.detail);
  if (missing) return { state: missing.state, message: missing.detail as string };
  return null;
}
