import { Users } from "lucide-react";

import type { Collaborator, Contact } from "@/lib/catalog";
import type { CompositionShare } from "@/lib/data/compositions";
import type { RecordingShare } from "@/lib/data/recordings";
import { isWriterRole, type CstState } from "@/lib/cst-status";
import { StatusLine } from "@/components/CstStatus";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Member = {
  key: string;
  name: string;
  roles: string[];
  ipi: string | null;
  pro: string | null;
  publisher: string | null;
  source: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function buildTeam(
  collaborators: Collaborator[],
  shares: CompositionShare[],
  recordingShares: RecordingShare[],
  contacts: Contact[],
): Member[] {
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const byName = new Map<string, Member>();

  const push = (
    name: string | null,
    role: string,
    source: string,
    extra?: { ipi?: string | null; pro?: string | null; publisher?: string | null },
  ) => {
    if (!name) return;
    const key = name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      if (!existing.roles.includes(role)) existing.roles.push(role);
      existing.ipi = existing.ipi ?? extra?.ipi ?? null;
      existing.pro = existing.pro ?? extra?.pro ?? null;
      existing.publisher = existing.publisher ?? extra?.publisher ?? null;
      if (!existing.source.includes(source)) existing.source += ` · ${source}`;
      return;
    }
    byName.set(key, {
      key,
      name: name.trim(),
      roles: [role],
      ipi: extra?.ipi ?? null,
      pro: extra?.pro ?? null,
      publisher: extra?.publisher ?? null,
      source,
    });
  };

  for (const c of collaborators) {
    push(c.name, c.role, "Créditos", { ipi: c.ipi, pro: c.pro, publisher: c.publisher });
  }
  for (const s of shares.filter((s) => s.is_active)) {
    const contact = s.person_id ? contactById.get(s.person_id) : undefined;
    push(s.name ?? contact?.name ?? null, s.role, "Composición", {
      ipi: contact?.ipi,
      pro: contact?.pro,
      publisher: contact?.publisher,
    });
  }
  for (const s of recordingShares.filter((s) => s.is_active)) {
    const contact = s.person_id ? contactById.get(s.person_id) : undefined;
    push(s.name ?? contact?.name ?? null, s.role, "Grabación", {
      ipi: contact?.ipi,
      pro: contact?.pro,
      publisher: contact?.publisher,
    });
  }
  return [...byName.values()];
}

const isProducerRole = (role: string) => /productor|producer|beatmaker/i.test(role);

export function CreditsTab({
  collaborators,
  shares,
  recordingShares,
  contacts,
}: {
  collaborators: Collaborator[];
  shares: CompositionShare[];
  recordingShares: RecordingShare[];
  contacts: Contact[];
}) {
  const team = buildTeam(collaborators, shares, recordingShares, contacts);
  const songwriters = team.filter((m) => m.roles.some(isWriterRole));
  const producers = team.filter((m) => m.roles.some(isProducerRole));
  const recordingContributors = recordingShares.filter((s) => s.is_active);
  const withoutPublisher = songwriters.filter((m) => !m.publisher);

  const checks: { state: CstState; text: string }[] = [
    {
      state: songwriters.length > 0 ? "complete" : "attention",
      text:
        songwriters.length > 0
          ? `${songwriters.length} compositor${songwriters.length === 1 ? "" : "es"} identificado${songwriters.length === 1 ? "" : "s"}`
          : "Ningún compositor identificado",
    },
    {
      state: recordingContributors.length > 0 ? "complete" : "none",
      text:
        recordingContributors.length > 0
          ? `${recordingContributors.length} participante${recordingContributors.length === 1 ? "" : "s"} de grabación`
          : "Participantes de grabación no disponibles",
    },
    {
      state: producers.length > 0 ? "complete" : "pending",
      text: producers.length > 0 ? `Productor: ${producers[0].name}` : "Productor sin identificar",
    },
    {
      state:
        songwriters.length === 0
          ? "none"
          : withoutPublisher.length === 0
            ? "complete"
            : "attention",
      text:
        songwriters.length === 0
          ? "Cobertura editorial no disponible"
          : withoutPublisher.length === 0
            ? "Todos los compositores tienen publisher"
            : `${withoutPublisher.length} compositor${withoutPublisher.length === 1 ? "" : "es"} sin publisher`,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Equipo creativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {team.map((m) => (
                <li key={m.key} className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.roles.join(" · ")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.pro ?? "PRO —"}
                      {" · "}
                      {m.publisher ?? "Publisher —"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay créditos registrados para esta obra.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completitud de créditos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c) => (
            <StatusLine key={c.text} state={c.state}>
              {c.text}
            </StatusLine>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
