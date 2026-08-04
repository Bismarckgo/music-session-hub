import type { Collaborator, Contact, Work } from "@/lib/catalog";

export type PersonNode = {
  key: string;
  contact_id: string | null;
  name: string;
  ipi: string | null;
  pro: string | null;
  publisher: string | null;
  roles: string[];
  works: { id: string; title: string; role: string; split_percent: number }[];
  totalSplit: number;
};

export type GraphIssue = {
  code:
    | "unlinked_person"
    | "conflicting_ipi"
    | "conflicting_pro"
    | "conflicting_publisher"
    | "missing_ipi"
    | "duplicate_person";
  level: "warning" | "error" | "info";
  personKey: string;
  personName: string;
  message: string;
  /** Datos canónicos sugeridos por el motor (desde el contacto). */
  fix?: { contact_id: string; ipi?: string | null; pro?: string | null; publisher?: string | null };
};

export type KnowledgeGraph = {
  people: PersonNode[];
  issues: GraphIssue[];
  edges: { from: string; to: string; label: string }[];
  stats: { people: number; works: number; links: number; orphanLinks: number };
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * MIE Fase 2 — Knowledge Graph.
 * Une Persona (contacto) → Composición (obra) a través de las participaciones,
 * y detecta identidades sin vincular o metadata en conflicto entre obras.
 */
export function buildKnowledgeGraph(
  works: Work[],
  collaborators: Collaborator[],
  contacts: Contact[],
): KnowledgeGraph {
  const workById = new Map(works.map((w) => [w.id, w]));
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const contactByName = new Map(contacts.map((c) => [norm(c.name), c]));

  const people = new Map<string, PersonNode>();
  const edges: KnowledgeGraph["edges"] = [];
  const issues: GraphIssue[] = [];
  let orphanLinks = 0;

  // Personas base: todos los contactos existen en el grafo aunque no tengan obras.
  for (const c of contacts) {
    people.set(`contact:${c.id}`, {
      key: `contact:${c.id}`,
      contact_id: c.id,
      name: c.name,
      ipi: c.ipi,
      pro: c.pro,
      publisher: c.publisher,
      roles: c.default_role ? [c.default_role] : [],
      works: [],
      totalSplit: 0,
    });
  }

  const seenConflict = new Set<string>();

  for (const col of collaborators) {
    const work = workById.get(col.work_id);
    if (!work) continue;
    const contact = col.contact_id
      ? contactById.get(col.contact_id)
      : contactByName.get(norm(col.name));
    const key = contact ? `contact:${contact.id}` : `name:${norm(col.name)}`;

    let node = people.get(key);
    if (!node) {
      node = {
        key,
        contact_id: contact?.id ?? null,
        name: contact?.name ?? col.name,
        ipi: contact?.ipi ?? col.ipi,
        pro: contact?.pro ?? col.pro,
        publisher: contact?.publisher ?? col.publisher,
        roles: [],
        works: [],
        totalSplit: 0,
      };
      people.set(key, node);
    }

    node.works.push({
      id: work.id,
      title: work.title,
      role: col.role,
      split_percent: Number(col.split_percent ?? 0),
    });
    node.totalSplit += Number(col.split_percent ?? 0);
    if (!node.roles.includes(col.role)) node.roles.push(col.role);
    edges.push({ from: node.key, to: `work:${work.id}`, label: col.role });

    // 1. Participación sin contacto vinculado
    if (!col.contact_id) {
      orphanLinks += 1;
      const dedupe = `unlinked:${key}`;
      if (!seenConflict.has(dedupe)) {
        seenConflict.add(dedupe);
        issues.push({
          code: contact ? "duplicate_person" : "unlinked_person",
          level: contact ? "warning" : "info",
          personKey: key,
          personName: node.name,
          message: contact
            ? `“${col.name}” aparece en obras sin estar vinculado al contacto existente. Vincúlalo para no duplicar datos.`
            : `“${col.name}” no existe como contacto reutilizable. Créalo una vez y reúsalo en todas las obras.`,
          ...(contact
            ? {
                fix: {
                  contact_id: contact.id,
                  ipi: contact.ipi,
                  pro: contact.pro,
                  publisher: contact.publisher,
                },
              }
            : {}),
        });
      }
    }

    // 2. Conflictos de identificadores contra el contacto canónico
    if (contact) {
      const checks: [GraphIssue["code"], keyof Contact, string][] = [
        ["conflicting_ipi", "ipi", "IPI"],
        ["conflicting_pro", "pro", "PRO"],
        ["conflicting_publisher", "publisher", "Publisher"],
      ];
      for (const [code, field, label] of checks) {
        const canonical = (contact[field] as string | null) ?? null;
        const local = (col[field as "ipi" | "pro" | "publisher"] ?? null) as string | null;
        if (canonical && local && norm(canonical) !== norm(local)) {
          const dedupe = `${code}:${key}:${work.id}`;
          if (seenConflict.has(dedupe)) continue;
          seenConflict.add(dedupe);
          issues.push({
            code,
            level: "error",
            personKey: key,
            personName: node.name,
            message: `${label} en conflicto en “${work.title}”: ${local} vs ${canonical} del contacto.`,
            fix: {
              contact_id: contact.id,
              ipi: contact.ipi,
              pro: contact.pro,
              publisher: contact.publisher,
            },
          });
        }
      }
    }
  }

  // 3. Escritores sin IPI (bloquea registro en PRO)
  for (const node of people.values()) {
    const isWriter = node.roles.some((r) => /compositor|beatmaker|productor/i.test(r));
    if (isWriter && !node.ipi && node.works.length > 0) {
      issues.push({
        code: "missing_ipi",
        level: "warning",
        personKey: node.key,
        personName: node.name,
        message: `${node.name} participa como autor pero no tiene IPI. Sin IPI el registro en PRO se rechaza.`,
      });
    }
  }

  const list = [...people.values()].sort(
    (a, b) => b.works.length - a.works.length || a.name.localeCompare(b.name),
  );

  return {
    people: list,
    issues,
    edges,
    stats: {
      people: list.length,
      works: works.length,
      links: edges.length,
      orphanLinks,
    },
  };
}
