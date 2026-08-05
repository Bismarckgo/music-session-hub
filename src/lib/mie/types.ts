// Music Intelligence Engine — Fase 0
// Event Store types + Work state machine

export type MieEventType =
  | "WorkCreated"
  | "ProjectDetected"
  | "SessionStarted"
  | "SessionSaved"
  | "SessionEnded"
  | "BounceExported"
  | "CollaboratorAdded"
  | "CoverAttached"
  | "IdentifiersSet"
  | "SplitsBalanced"
  | "IdentityLinked"
  | "RegistrationSubmitted"
  | "DistributionPublished";

export type MieEvent = {
  id: string;
  user_id: string;
  work_id: string | null;
  session_id: string | null;
  type: MieEventType | string;
  actor: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
};

export type WorkState =
  | "draft"
  | "in_session"
  | "tracked"
  | "mixed"
  | "mastered"
  | "metadata_ready"
  | "registered"
  | "distributed";

export const WORK_STATE_ORDER: WorkState[] = [
  "draft",
  "in_session",
  "tracked",
  "mixed",
  "mastered",
  "metadata_ready",
  "registered",
  "distributed",
];

export const WORK_STATE_LABELS: Record<WorkState, string> = {
  draft: "Borrador",
  in_session: "En sesión",
  tracked: "Grabada",
  mixed: "Mezclada",
  mastered: "Masterizada",
  metadata_ready: "Metadata lista",
  registered: "Registrada",
  distributed: "Distribuida",
};