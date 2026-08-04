import type { Collaborator, Contact, Work } from "@/lib/catalog";

export type AutomationKind =
  | "link_contact"
  | "fill_identity"
  | "fetch_cover"
  | "balance_splits"
  | "sync_identifiers"
  | "sync_distribution";

export type Automation = {
  id: string;
  kind: AutomationKind;
  workId: string;
  workTitle: string;
  title: string;
  detail: string;
  /** Cambios concretos que el motor aplicará. */
  plan:
    | { type: "update_collaborator"; collaboratorId: string; values: Partial<Collaborator> }
    | { type: "set_splits"; splits: { collaboratorId: string; split_percent: number }[] }
    | { type: "fetch_cover"; isrc: string }
    | { type: "emit_only" };
  event: { type: string; payload: Record<string, unknown> };
};

export const AUTOMATION_LABELS: Record<AutomationKind, string> = {
  link_contact: "Vincular identidad",
  fill_identity: "Completar identificadores",
  fetch_cover: "Importar carátula",
  balance_splits: "Equilibrar splits",
  sync_identifiers: "Registrar identificadores",
  sync_distribution: "Sincronizar distribución",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * MIE Fase 3 — motor de automatizaciones.
 * Detección pura: dado el estado actual del catálogo, devuelve las acciones
 * que el motor puede ejecutar por sí mismo (con confirmación del usuario).
 */
export function detectAutomations(
  works: Work[],
  collaborators: Collaborator[],
  contacts: Contact[],
  events: { work_id: string | null; type: string }[],
): Automation[] {
  const out: Automation[] = [];
  const contactByName = new Map(contacts.map((c) => [norm(c.name), c]));
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const eventTypesByWork = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.work_id) continue;
    if (!eventTypesByWork.has(e.work_id)) eventTypesByWork.set(e.work_id, new Set());
    eventTypesByWork.get(e.work_id)!.add(e.type);
  }

  for (const work of works) {
    const cols = collaborators.filter((c) => c.work_id === work.id);
    const seen = eventTypesByWork.get(work.id) ?? new Set<string>();

    // 1. Colaborador sin contacto vinculado, pero el nombre coincide con un contacto.
    for (const col of cols) {
      if (col.contact_id) continue;
      const contact = contactByName.get(norm(col.name));
      if (!contact) continue;
      out.push({
        id: `link_contact:${col.id}`,
        kind: "link_contact",
        workId: work.id,
        workTitle: work.title,
        title: `Vincular a ${contact.name}`,
        detail: `La participación "${col.role}" en "${work.title}" coincide con un contacto existente. El motor la vincula y copia IPI, PRO y publisher.`,
        plan: {
          type: "update_collaborator",
          collaboratorId: col.id,
          values: {
            contact_id: contact.id,
            ipi: col.ipi ?? contact.ipi,
            pro: col.pro ?? contact.pro,
            publisher: col.publisher ?? contact.publisher,
          },
        },
        event: {
          type: "IdentityLinked",
          payload: { collaborator_id: col.id, contact_id: contact.id, source: "automation" },
        },
      });
    }

    // 2. Colaborador vinculado pero con identificadores vacíos que el contacto sí tiene.
    for (const col of cols) {
      if (!col.contact_id) continue;
      const contact = contactById.get(col.contact_id);
      if (!contact) continue;
      const values: Partial<Collaborator> = {};
      if (!col.ipi && contact.ipi) values.ipi = contact.ipi;
      if (!col.pro && contact.pro) values.pro = contact.pro;
      if (!col.publisher && contact.publisher) values.publisher = contact.publisher;
      if (Object.keys(values).length === 0) continue;
      out.push({
        id: `fill_identity:${col.id}`,
        kind: "fill_identity",
        workId: work.id,
        workTitle: work.title,
        title: `Completar datos de ${col.name}`,
        detail: `Faltan ${Object.keys(values)
          .map((k) => k.toUpperCase())
          .join(", ")} en "${work.title}". El contacto ya los tiene: el motor los propaga.`,
        plan: { type: "update_collaborator", collaboratorId: col.id, values },
        event: {
          type: "IdentityLinked",
          payload: { collaborator_id: col.id, filled: Object.keys(values), source: "automation" },
        },
      });
    }

    // 3. Carátula ausente con ISRC disponible.
    if (!work.cover_path && work.isrc) {
      out.push({
        id: `fetch_cover:${work.id}`,
        kind: "fetch_cover",
        workId: work.id,
        workTitle: work.title,
        title: "Importar carátula desde el ISRC",
        detail: `"${work.title}" tiene ISRC ${work.isrc} pero no carátula. El motor la busca y la guarda.`,
        plan: { type: "fetch_cover", isrc: work.isrc },
        event: { type: "CoverAttached", payload: { source: "automation" } },
      });
    }

    // 4. Splits que no suman 100%.
    if (cols.length > 0) {
      const sum = cols.reduce((a, c) => a + Number(c.split_percent), 0);
      if (Math.round(sum) !== 100) {
        const splits = proportionalSplits(cols);
        out.push({
          id: `balance_splits:${work.id}`,
          kind: "balance_splits",
          workId: work.id,
          workTitle: work.title,
          title: "Equilibrar splits al 100%",
          detail:
            sum > 0
              ? `Los splits de "${work.title}" suman ${round2(sum)}%. El motor los reescala proporcionalmente a 100%.`
              : `"${work.title}" no tiene splits asignados. El motor los reparte en partes iguales entre ${cols.length} participantes.`,
          plan: { type: "set_splits", splits },
          event: {
            type: "SplitsBalanced",
            payload: { from: round2(sum), to: 100, source: "automation" },
          },
        });
      }
    }

    // 5. ISRC + ISWC presentes pero sin evento IdentifiersSet en el log.
    if (work.isrc && work.iswc && !seen.has("IdentifiersSet")) {
      out.push({
        id: `sync_identifiers:${work.id}`,
        kind: "sync_identifiers",
        workId: work.id,
        workTitle: work.title,
        title: "Registrar identificadores en el log",
        detail: `"${work.title}" ya tiene ISRC e ISWC, pero el timeline no lo refleja. El motor emite el evento para avanzar el estado.`,
        plan: { type: "emit_only" },
        event: {
          type: "IdentifiersSet",
          payload: { isrc: work.isrc, iswc: work.iswc, source: "automation" },
        },
      });
    }

    // 6. Distribución publicada sin evento correspondiente.
    if (work.distribution_status === "publicado" && !seen.has("DistributionPublished")) {
      out.push({
        id: `sync_distribution:${work.id}`,
        kind: "sync_distribution",
        workId: work.id,
        workTitle: work.title,
        title: "Sincronizar publicación",
        detail: `"${work.title}" está marcada como publicada en distribución. El motor lo registra en el timeline.`,
        plan: { type: "emit_only" },
        event: {
          type: "DistributionPublished",
          payload: {
            distributor: work.distributor_name,
            channels: Object.keys(
              (work.channel_links ?? {}) as Record<string, unknown>,
            ),
            source: "automation",
          },
        },
      });
    }
  }

  return out;
}

/** Reescala proporcionalmente a 100% (o reparte igual si todo está en 0). */
export function proportionalSplits(
  cols: Collaborator[],
): { collaboratorId: string; split_percent: number }[] {
  const sum = cols.reduce((a, c) => a + Number(c.split_percent), 0);
  const raw = cols.map((c) => ({
    collaboratorId: c.id,
    split_percent: sum > 0 ? (Number(c.split_percent) / sum) * 100 : 100 / cols.length,
  }));
  const rounded = raw.map((r) => ({ ...r, split_percent: round2(r.split_percent) }));
  // Ajusta el residuo de redondeo en el participante mayor.
  const total = rounded.reduce((a, r) => a + r.split_percent, 0);
  const diff = round2(100 - total);
  if (diff !== 0 && rounded.length > 0) {
    let idx = 0;
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i]!.split_percent > rounded[idx]!.split_percent) idx = i;
    }
    rounded[idx]!.split_percent = round2(rounded[idx]!.split_percent + diff);
  }
  return rounded;
}