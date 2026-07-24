import type { Work, Collaborator } from "@/lib/catalog";
import type { MieEvent, WorkState } from "./types";
import { WORK_STATE_LABELS } from "./types";
import { deriveWorkState } from "./reducer";
import { validateWorkForPublishing, type ValidationIssue } from "@/lib/publishing";

export type Suggestion = {
  code: string;
  level: "info" | "warning" | "error";
  message: string;
  action?: { label: string; to: string; params?: Record<string, string> };
};

/**
 * MIE Fase 1 — motor de sugerencias.
 * Deriva próximas acciones a partir del estado + eventos + validaciones.
 */
export function suggestForWork(
  work: Work,
  collaborators: Collaborator[],
  events: MieEvent[],
): { state: WorkState; issues: ValidationIssue[]; suggestions: Suggestion[] } {
  const state = deriveWorkState(events);
  const issues = validateWorkForPublishing(work, collaborators);
  const suggestions: Suggestion[] = [];

  // Cover art
  if (!work.cover_path) {
    suggestions.push({
      code: "missing_cover",
      level: "info",
      message: work.isrc
        ? "Busca la carátula automáticamente desde el ISRC."
        : "Sube o busca la carátula.",
      action: { label: "Abrir obra", to: "/obras/$id", params: { id: work.id } },
    });
  }

  // ISRC / ISWC
  if (!work.isrc) {
    suggestions.push({
      code: "missing_isrc",
      level: "warning",
      message: "Falta ISRC. Sin ISRC no hay tracking de master ni royalties DSP.",
      action: { label: "Añadir ISRC", to: "/obras/$id", params: { id: work.id } },
    });
  }

  // Splits & writers vienen de validateWorkForPublishing
  for (const issue of issues) {
    suggestions.push({
      code: issue.code,
      level: issue.level,
      message: issue.message,
      action:
        issue.code === "splits_sum" || issue.code === "no_writer" || issue.code === "no_collabs"
          ? { label: "Ajustar splits", to: "/splits" }
          : { label: "Abrir obra", to: "/obras/$id", params: { id: work.id } },
    });
  }

  // Estado sugerido de avance
  if (state === "metadata_ready" && work.distribution_status === "sin_distribuir") {
    suggestions.push({
      code: "ready_to_register",
      level: "info",
      message: "Metadata lista. Puedes registrar en tu PRO / MLC o enviar a distribución.",
      action: { label: "Ir a Publishing", to: "/publishing" },
    });
  }

  return { state, issues, suggestions };
}

export function stateLabel(state: WorkState): string {
  return WORK_STATE_LABELS[state];
}