import type { MieEvent, WorkState } from "./types";
import { WORK_STATE_ORDER } from "./types";

/**
 * Deriva el estado más avanzado alcanzado por una obra a partir del log de eventos.
 * Fase 0: reglas mínimas y monotónicas. No retrocede.
 */
export function deriveWorkState(events: MieEvent[]): WorkState {
  let state: WorkState = "draft";
  const ordered = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );
  for (const e of ordered) {
    const next = nextStateFor(e, state);
    if (rank(next) > rank(state)) state = next;
  }
  return state;
}

function nextStateFor(e: MieEvent, current: WorkState): WorkState {
  switch (e.type) {
    case "WorkCreated":
      return "draft";
    case "SessionStarted":
      return "in_session";
    case "SessionEnded": {
      const mins = Number((e.payload as { duration_minutes?: number })?.duration_minutes ?? 0);
      return mins > 0 ? "tracked" : current;
    }
    case "IdentifiersSet": {
      const p = e.payload as { isrc?: string | null; iswc?: string | null };
      return p?.isrc && p?.iswc ? "metadata_ready" : current;
    }
    case "RegistrationSubmitted":
      return "registered";
    case "DistributionPublished":
      return "distributed";
    default:
      return current;
  }
}

function rank(s: WorkState): number {
  return WORK_STATE_ORDER.indexOf(s);
}