import type { Tables } from "@/integrations/supabase/types";
import type { Collaborator, Contact, StudioSession, Work } from "@/lib/catalog";
import type { Suggestion } from "./assistant";

export type MieMemory = Tables<"mie_memory">;
export type MieFeedback = Tables<"mie_feedback">;

/** Umbral a partir del cual el motor usa un patrón como valor por defecto. */
export const CONFIDENCE_APPLY = 0.6;
/** Umbral mínimo para mostrar un patrón como observación. */
export const CONFIDENCE_SHOW = 0.25;

export type MemoryScope =
  | "pro"
  | "publisher"
  | "genre"
  | "collaborator"
  | "collaborator_role"
  | "split_pattern"
  | "daw"
  | "distributor";

export const SCOPE_LABELS: Record<string, string> = {
  pro: "PRO habitual",
  publisher: "Publisher habitual",
  genre: "Género frecuente",
  collaborator: "Colaborador frecuente",
  collaborator_role: "Rol habitual de una persona",
  split_pattern: "Patrón de splits",
  daw: "DAW habitual",
  distributor: "Distribuidora habitual",
};

export type MemoryFact = {
  scope: MemoryScope;
  key: string;
  value: Record<string, unknown>;
  observations: number;
  confidence: number;
};

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function tally(map: Map<string, { count: number; value: Record<string, unknown> }>, key: string, value: Record<string, unknown>) {
  if (!key) return;
  const cur = map.get(key);
  if (cur) {
    cur.count += 1;
    cur.value = { ...cur.value, ...value };
  } else {
    map.set(key, { count: 1, value });
  }
}

function toFacts(
  scope: MemoryScope,
  map: Map<string, { count: number; value: Record<string, unknown> }>,
  total: number,
): MemoryFact[] {
  if (total <= 0) return [];
  return [...map.entries()]
    .map(([key, { count, value }]) => ({
      scope,
      key,
      value,
      observations: count,
      confidence: Math.min(1, count / total),
    }))
    .filter((f) => f.confidence >= CONFIDENCE_SHOW || f.observations >= 3)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * MIE Fase 7 — Context Memory.
 * Aprende patrones del usuario a partir de su propio catálogo: PRO y publisher
 * habituales, colaboradores frecuentes con su rol, géneros, DAW y patrones de split.
 * Todo es heurístico y auditado con `observations` + `confidence`.
 */
export function learnFacts(
  works: Work[],
  collaborators: Collaborator[],
  contacts: Contact[],
  sessions: StudioSession[] = [],
): MemoryFact[] {
  const facts: MemoryFact[] = [];

  // Género / distribuidora por obra
  const genres = new Map<string, { count: number; value: Record<string, unknown> }>();
  const distributors = new Map<string, { count: number; value: Record<string, unknown> }>();
  for (const w of works) {
    if (w.genre) tally(genres, norm(w.genre), { genre: w.genre });
    if (w.distributor_name)
      tally(distributors, norm(w.distributor_name), {
        distributor_name: w.distributor_name,
        distributor_url: w.distributor_url,
      });
  }
  facts.push(...toFacts("genre", genres, works.length));
  facts.push(...toFacts("distributor", distributors, works.length));

  // DAW por sesión
  const daws = new Map<string, { count: number; value: Record<string, unknown> }>();
  for (const s of sessions) if (s.daw) tally(daws, norm(s.daw), { daw: s.daw });
  facts.push(...toFacts("daw", daws, sessions.length));

  // PRO / publisher desde participaciones + contactos
  const pros = new Map<string, { count: number; value: Record<string, unknown> }>();
  const publishers = new Map<string, { count: number; value: Record<string, unknown> }>();
  const identitySources: { pro: string | null; publisher: string | null }[] = [
    ...collaborators.map((c) => ({ pro: c.pro, publisher: c.publisher })),
    ...contacts.map((c) => ({ pro: c.pro, publisher: c.publisher })),
  ];
  for (const s of identitySources) {
    if (s.pro) tally(pros, norm(s.pro), { pro: s.pro });
    if (s.publisher) tally(publishers, norm(s.publisher), { publisher: s.publisher });
  }
  facts.push(...toFacts("pro", pros, identitySources.length));
  facts.push(...toFacts("publisher", publishers, identitySources.length));

  // Colaboradores frecuentes y su rol habitual
  const people = new Map<string, { count: number; value: Record<string, unknown> }>();
  const roleByPerson = new Map<string, Map<string, number>>();
  for (const c of collaborators) {
    const key = norm(c.name);
    if (!key) continue;
    tally(people, key, {
      name: c.name,
      contact_id: c.contact_id,
      ipi: c.ipi,
      pro: c.pro,
      publisher: c.publisher,
    });
    const roles = roleByPerson.get(key) ?? new Map<string, number>();
    roles.set(c.role, (roles.get(c.role) ?? 0) + 1);
    roleByPerson.set(key, roles);
  }
  const worksWithCollabs = new Set(collaborators.map((c) => c.work_id)).size || 1;
  facts.push(...toFacts("collaborator", people, worksWithCollabs));

  for (const [key, roles] of roleByPerson) {
    const total = [...roles.values()].reduce((a, b) => a + b, 0);
    const [role, count] = [...roles.entries()].sort((a, b) => b[1] - a[1])[0];
    const person = people.get(key);
    facts.push({
      scope: "collaborator_role",
      key,
      value: { name: person?.value["name"] ?? key, role },
      observations: count,
      confidence: Math.min(1, count / total),
    });
  }

  // Patrones de splits por número de participantes
  const patterns = new Map<string, { count: number; value: Record<string, unknown> }>();
  const byWork = new Map<string, Collaborator[]>();
  for (const c of collaborators) {
    const list = byWork.get(c.work_id) ?? [];
    list.push(c);
    byWork.set(c.work_id, list);
  }
  for (const list of byWork.values()) {
    if (list.length === 0) continue;
    const shares = list
      .map((c) => Math.round(Number(c.split_percent)))
      .sort((a, b) => b - a);
    const key = `${list.length}:${shares.join("-")}`;
    tally(patterns, key, { participants: list.length, shares });
  }
  facts.push(...toFacts("split_pattern", patterns, byWork.size));

  return facts.filter((f) => f.key.length > 0);
}

export function bestFact(memories: MieMemory[], scope: MemoryScope): MieMemory | null {
  const list = memories
    .filter((m) => m.scope === scope && Number(m.confidence) >= CONFIDENCE_APPLY)
    .sort((a, b) => Number(b.confidence) - Number(a.confidence));
  return list[0] ?? null;
}

export function factValue(memory: MieMemory | null, field: string): string | null {
  if (!memory) return null;
  const v = (memory.value as Record<string, unknown> | null)?.[field];
  return typeof v === "string" && v.trim() ? v : null;
}

// ─── Sugerencias ranked ────────────────────────────────────────────────────
export type RankedSuggestion = Suggestion & { score: number; confidence: number };

const LEVEL_WEIGHT: Record<Suggestion["level"], number> = {
  error: 60,
  warning: 35,
  info: 15,
};

/** Impacto económico/legal estimado por tipo de problema. */
const CODE_WEIGHT: Record<string, number> = {
  splits_sum: 30,
  no_writer: 25,
  no_collabs: 20,
  missing_isrc: 18,
  missing_iswc: 10,
  missing_ipi: 12,
  ready_to_register: 8,
  missing_cover: 4,
};

/**
 * Ordena sugerencias por impacto y por lo que el motor sabe del usuario,
 * descartando lo que ya rechazó y subiendo lo que suele aceptar.
 */
export function rankSuggestions(
  suggestions: Suggestion[],
  opts: {
    workId: string;
    feedback: MieFeedback[];
    memories?: MieMemory[];
    recentActivityBoost?: number;
  },
): RankedSuggestion[] {
  const dismissed = new Set(
    opts.feedback
      .filter((f) => f.decision === "dismissed" && (f.work_id === opts.workId || f.work_id === null))
      .map((f) => f.code),
  );
  const acceptedCount = new Map<string, number>();
  for (const f of opts.feedback) {
    if (f.decision !== "accepted") continue;
    acceptedCount.set(f.code, (acceptedCount.get(f.code) ?? 0) + 1);
  }

  const totalDecisions = opts.feedback.length || 1;

  return suggestions
    .filter((s) => !dismissed.has(s.code))
    .map((s) => {
      const accepted = acceptedCount.get(s.code) ?? 0;
      const learned = Math.min(1, accepted / totalDecisions);
      const score =
        LEVEL_WEIGHT[s.level] +
        (CODE_WEIGHT[s.code] ?? 5) +
        learned * 20 +
        (opts.recentActivityBoost ?? 0);
      return { ...s, score, confidence: Math.min(1, score / 110) };
    })
    .sort((a, b) => b.score - a.score);
}