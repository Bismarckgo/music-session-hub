import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, CircleAlert, Info } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Collaborator, Work } from "@/lib/catalog";
import type { MieEvent } from "@/lib/mie/types";
import { suggestForWork, stateLabel, type Suggestion } from "@/lib/mie/assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/asistente")({
  component: AsistentePage,
  head: () => ({
    meta: [
      { title: "Asistente MIE — CST" },
      {
        name: "description",
        content:
          "Bandeja del Music Intelligence Engine: próximas acciones y errores de metadata por obra.",
      },
      { property: "og:title", content: "Asistente MIE — CST" },
      {
        property: "og:description",
        content:
          "Sugerencias proactivas del motor MIE para mantener tu metadata consistente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type WorkRow = Work & { collaborators: Collaborator[] };

const LEVEL_ICON = {
  error: CircleAlert,
  warning: AlertTriangle,
  info: Info,
} as const;

const LEVEL_CLASS: Record<Suggestion["level"], string> = {
  error: "text-destructive",
  warning: "text-amber-600",
  info: "text-primary",
};

function AsistentePage() {
  const { data: works, isLoading } = useQuery({
    queryKey: ["works", "assistant"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*, collaborators(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as WorkRow[];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["mie_events", "assistant"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mie_events")
        .select("*")
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return data as MieEvent[];
    },
  });

  const eventsByWork = new Map<string, MieEvent[]>();
  for (const e of events ?? []) {
    if (!e.work_id) continue;
    const list = eventsByWork.get(e.work_id) ?? [];
    list.push(e);
    eventsByWork.set(e.work_id, list);
  }

  const analyses = (works ?? []).map((w) => ({
    work: w,
    ...suggestForWork(w, w.collaborators, eventsByWork.get(w.id) ?? []),
  }));

  const inbox = analyses
    .filter((a) => a.suggestions.length > 0)
    .sort((a, b) => {
      const rank = (level: Suggestion["level"]) =>
        level === "error" ? 0 : level === "warning" ? 1 : 2;
      const aTop = Math.min(...a.suggestions.map((s) => rank(s.level)));
      const bTop = Math.min(...b.suggestions.map((s) => rank(s.level)));
      return aTop - bTop;
    });

  const totalErrors = analyses.reduce(
    (n, a) => n + a.suggestions.filter((s) => s.level === "error").length,
    0,
  );
  const totalWarnings = analyses.reduce(
    (n, a) => n + a.suggestions.filter((s) => s.level === "warning").length,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-primary" />
            Asistente MIE
          </h1>
          <p className="text-sm text-muted-foreground">
            Próximas acciones y problemas de metadata detectados por el motor.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive">{totalErrors} errores</Badge>
          <Badge variant="secondary">{totalWarnings} avisos</Badge>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : inbox.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todo tu catálogo está consistente. Nada requiere tu atención.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inbox.map(({ work, state, suggestions }) => (
            <Card key={work.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    <Link
                      to="/obras/$id"
                      params={{ id: work.id }}
                      className="hover:underline"
                    >
                      {work.title}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">CSTID {work.fingerprint}</p>
                </div>
                <Badge variant="outline">{stateLabel(state)}</Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => {
                    const Icon = LEVEL_ICON[s.level];
                    return (
                      <li
                        key={`${s.code}-${i}`}
                        className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${LEVEL_CLASS[s.level]}`} />
                          <span className="text-sm">{s.message}</span>
                        </div>
                        {s.action ? (
                          <Button asChild size="sm" variant="ghost">
                            {s.action.params ? (
                              <Link
                                to={s.action.to}
                                params={s.action.params as { id: string }}
                              >
                                {s.action.label}
                              </Link>
                            ) : (
                              <Link to={s.action.to}>{s.action.label}</Link>
                            )}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}