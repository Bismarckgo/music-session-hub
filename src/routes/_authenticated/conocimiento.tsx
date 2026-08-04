import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Network, CircleAlert, AlertTriangle, Info, Wand2, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Collaborator, Contact, Work } from "@/lib/catalog";
import { buildKnowledgeGraph, type GraphIssue } from "@/lib/mie/graph";
import { emit } from "@/lib/mie/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/conocimiento")({
  component: ConocimientoPage,
  head: () => ({
    meta: [
      { title: "Grafo de conocimiento — CST" },
      {
        name: "description",
        content:
          "Relaciones entre personas, obras y créditos: identidades unificadas y metadata sin conflictos.",
      },
      { property: "og:title", content: "Grafo de conocimiento — CST" },
      {
        property: "og:description",
        content:
          "El MIE conecta cada persona con sus obras y corrige identificadores en conflicto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const LEVEL_ICON = { error: CircleAlert, warning: AlertTriangle, info: Info } as const;
const LEVEL_CLASS: Record<GraphIssue["level"], string> = {
  error: "text-destructive",
  warning: "text-amber-600",
  info: "text-primary",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function ConocimientoPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mie", "graph"],
    queryFn: async () => {
      const [works, collaborators, contacts] = await Promise.all([
        supabase.from("works").select("*"),
        supabase.from("collaborators").select("*"),
        supabase.from("contacts").select("*"),
      ]);
      if (works.error) throw works.error;
      if (collaborators.error) throw collaborators.error;
      if (contacts.error) throw contacts.error;
      return {
        works: works.data as Work[],
        collaborators: collaborators.data as Collaborator[],
        contacts: contacts.data as Contact[],
      };
    },
  });

  const graph = useMemo(
    () =>
      data
        ? buildKnowledgeGraph(data.works, data.collaborators, data.contacts)
        : null,
    [data],
  );

  const resolve = useMutation({
    mutationFn: async (issue: GraphIssue) => {
      if (!issue.fix || !data) throw new Error("Sin corrección disponible");
      const contact = data.contacts.find((c) => c.id === issue.fix!.contact_id);
      if (!contact) throw new Error("Contacto no encontrado");
      const targets = data.collaborators.filter(
        (c) => c.contact_id === contact.id || norm(c.name) === norm(contact.name),
      );
      for (const col of targets) {
        const { error } = await supabase
          .from("collaborators")
          .update({
            contact_id: contact.id,
            name: contact.name,
            ipi: contact.ipi,
            pro: contact.pro,
            publisher: contact.publisher,
          })
          .eq("id", col.id);
        if (error) throw error;
        await emit({
          type: "IdentityLinked",
          work_id: col.work_id,
          actor: "mie",
          payload: { contact_id: contact.id, name: contact.name, issue: issue.code },
        });
      }
      return targets.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["mie", "graph"] });
      queryClient.invalidateQueries({ queryKey: ["works"] });
      toast.success(`Identidad unificada en ${n} participación(es)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const people = (graph?.people ?? []).filter((p) =>
    q ? norm(p.name).includes(norm(q)) : true,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Network className="h-5 w-5 text-primary" /> Grafo de conocimiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Persona → Obra → Créditos. El motor unifica identidades para que nunca
            escribas la misma información dos veces.
          </p>
        </div>
        <Input
          placeholder="Buscar persona…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:w-64"
        />
      </header>

      {graph && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Personas", value: graph.stats.people },
            { label: "Obras", value: graph.stats.works },
            { label: "Vínculos", value: graph.stats.links },
            { label: "Sin vincular", value: graph.stats.orphanLinks },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="font-display text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inconsistencias detectadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando grafo…</p>}
          {graph && graph.issues.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              El grafo está limpio: todas las identidades están unificadas.
            </p>
          )}
          {graph?.issues.map((issue, i) => {
            const Icon = LEVEL_ICON[issue.level];
            return (
              <div
                key={`${issue.code}-${issue.personKey}-${i}`}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${LEVEL_CLASS[issue.level]}`} />
                  <div>
                    <p className="text-sm font-medium">{issue.personName}</p>
                    <p className="text-sm text-muted-foreground">{issue.message}</p>
                  </div>
                </div>
                {issue.fix ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate(issue)}
                  >
                    <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Unificar
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/colaboradores">Editar</Link>
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Personas y sus obras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {people.length === 0 && !isLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin personas en el grafo todavía.
            </p>
          )}
          {people.map((p) => (
            <div key={p.key} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.roles.join(" · ") || "Sin rol"}
                    {p.ipi ? ` · IPI ${p.ipi}` : " · sin IPI"}
                    {p.pro ? ` · ${p.pro}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!p.contact_id && <Badge variant="outline">No es contacto</Badge>}
                  <Badge variant="secondary">{p.works.length} obra(s)</Badge>
                </div>
              </div>
              {p.works.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.works.map((w, idx) => (
                    <Link
                      key={`${w.id}-${idx}`}
                      to="/obras/$id"
                      params={{ id: w.id }}
                      className="rounded-full border px-2 py-0.5 text-xs hover:bg-accent"
                    >
                      {w.title} · {w.role} · {w.split_percent}%
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
