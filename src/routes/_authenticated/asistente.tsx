import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, AlertTriangle, CircleAlert, Info, Check, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Collaborator, Work } from "@/lib/catalog";
import type { MieEvent } from "@/lib/mie/types";
import { suggestForWork, stateLabel, type Suggestion } from "@/lib/mie/assistant";
import {
  rankSuggestions,
  type MieFeedback,
  type MieMemory,
  type RankedSuggestion,
} from "@/lib/mie/memory";
import { MieMemoryCard } from "@/components/MieMemoryCard";
import { SessionNotesCard } from "@/components/SessionNotesCard";
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
  const queryClient = useQueryClient();

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

  const { data: feedback } = useQuery({
    queryKey: ["mie_feedback"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mie_feedback").select("*");
      if (error) throw error;
      return data as MieFeedback[];
    },
  });

  const { data: memories } = useQuery({
    queryKey: ["mie_memory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mie_memory").select("*");
      if (error) throw error;
      return data as MieMemory[];
    },
  });

  const decide = useMutation({
    mutationFn: async (input: { workId: string; code: string; decision: "accepted" | "dismissed" }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const { error } = await supabase.from("mie_feedback").upsert(
        {
          user_id: userData.user.id,
          work_id: input.workId,
          code: input.code,
          decision: input.decision,
        },
        { onConflict: "user_id,work_id,code" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, input) => {
      toast.success(
        input.decision === "dismissed" ? "No volveré a sugerirlo aquí" : "Aprendido: lo priorizaré",
      );
      queryClient.invalidateQueries({ queryKey: ["mie_feedback"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eventsByWork = new Map<string, MieEvent[]>();
  for (const e of events ?? []) {
    if (!e.work_id) continue;
    const list = eventsByWork.get(e.work_id) ?? [];
    list.push(e);
    eventsByWork.set(e.work_id, list);
  }

  const analyses = (works ?? []).map((w) => {
    const base = suggestForWork(w, w.collaborators, eventsByWork.get(w.id) ?? []);
    const recent = eventsByWork.get(w.id) ?? [];
    const lastEvent = recent[recent.length - 1];
    const daysSince = lastEvent
      ? (Date.now() - new Date(lastEvent.occurred_at).getTime()) / 86_400_000
      : 999;
    return {
      work: w,
      ...base,
      suggestions: rankSuggestions(base.suggestions, {
        workId: w.id,
        feedback: feedback ?? [],
        memories: memories ?? [],
        recentActivityBoost: daysSince < 7 ? 12 : 0,
      }),
    };
  });

  const inbox = analyses
    .filter((a) => a.suggestions.length > 0)
    .sort(
      (a, b) =>
        Math.max(...b.suggestions.map((s) => s.score)) -
        Math.max(...a.suggestions.map((s) => s.score)),
    );

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
                          <div>
                            <span className="text-sm">{s.message}</span>
                            <p className="text-[11px] text-muted-foreground">
                              Prioridad {Math.round(s.confidence * 100)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {s.action ? (
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                decide.mutate({
                                  workId: work.id,
                                  code: s.code,
                                  decision: "accepted",
                                })
                              }
                            >
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
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Marcar como resuelto"
                              onClick={() =>
                                decide.mutate({
                                  workId: work.id,
                                  code: s.code,
                                  decision: "accepted",
                                })
                              }
                            >
                              <Check className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Descartar sugerencia"
                            onClick={() =>
                              decide.mutate({
                                workId: work.id,
                                code: s.code,
                                decision: "dismissed",
                              })
                            }
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <MieMemoryCard />
        <SessionNotesCard />
      </div>
    </div>
  );
}