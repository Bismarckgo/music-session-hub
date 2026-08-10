import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brain, RefreshCw, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Collaborator, Contact, StudioSession, Work } from "@/lib/catalog";
import {
  CONFIDENCE_APPLY,
  SCOPE_LABELS,
  learnFacts,
  type MieMemory,
} from "@/lib/mie/memory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function describe(m: MieMemory): string {
  const v = (m.value ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : null);
  switch (m.scope) {
    case "collaborator_role":
      return `${str("name") ?? m.key} suele participar como ${str("role") ?? "—"}`;
    case "collaborator":
      return `${str("name") ?? m.key}${str("pro") ? ` · ${str("pro")}` : ""}`;
    case "split_pattern": {
      const shares = Array.isArray(v["shares"]) ? (v["shares"] as number[]) : [];
      return `${v["participants"] ?? "?"} participantes · ${shares.join(" / ")}%`;
    }
    default:
      return str("genre") ?? str("pro") ?? str("publisher") ?? str("daw") ?? str("distributor_name") ?? m.key;
  }
}

export function MieMemoryCard() {
  const queryClient = useQueryClient();

  const { data: memories, isLoading } = useQuery({
    queryKey: ["mie_memory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mie_memory")
        .select("*")
        .order("confidence", { ascending: false });
      if (error) throw error;
      return data as MieMemory[];
    },
  });

  const learn = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const [works, collabs, contacts, sessions] = await Promise.all([
        supabase.from("works").select("*"),
        supabase.from("collaborators").select("*"),
        supabase.from("contacts").select("*"),
        supabase.from("sessions").select("*"),
      ]);
      const facts = learnFacts(
        (works.data ?? []) as Work[],
        (collabs.data ?? []) as Collaborator[],
        (contacts.data ?? []) as Contact[],
        (sessions.data ?? []) as StudioSession[],
      );
      if (facts.length === 0) return 0;
      const { error } = await supabase.from("mie_memory").upsert(
        facts.map((f) => ({
          user_id: userData.user!.id,
          scope: f.scope,
          key: f.key,
          value: f.value as never,
          observations: f.observations,
          confidence: Number(f.confidence.toFixed(3)),
          last_seen: new Date().toISOString(),
        })),
        { onConflict: "user_id,scope,key" },
      );
      if (error) throw error;
      return facts.length;
    },
    onSuccess: (n) => {
      toast.success(n === 0 ? "Aún no hay patrones suficientes" : `${n} patrones aprendidos`);
      queryClient.invalidateQueries({ queryKey: ["mie_memory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const forget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mie_memory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mie_memory"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = memories ?? [];
  const grouped = new Map<string, MieMemory[]>();
  for (const m of list) {
    const g = grouped.get(m.scope) ?? [];
    g.push(m);
    grouped.set(m.scope, g);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" /> Memoria del motor
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Patrones aprendidos de tu propio catálogo. Con confianza ≥{" "}
            {Math.round(CONFIDENCE_APPLY * 100)}% el motor los usa como valor por defecto.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => learn.mutate()} disabled={learn.isPending}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${learn.isPending ? "animate-spin" : ""}`} />
          Aprender
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin memoria todavía. Pulsa «Aprender» para que el motor observe tu catálogo.
          </p>
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([scope, items]) => (
              <div key={scope} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {SCOPE_LABELS[scope] ?? scope}
                </p>
                <ul className="space-y-2">
                  {items.slice(0, 6).map((m) => {
                    const pct = Math.round(Number(m.confidence) * 100);
                    return (
                      <li key={m.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{describe(m)}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 w-24" />
                            <span className="text-[11px] text-muted-foreground">
                              {pct}% · {m.observations} obs.
                            </span>
                          </div>
                        </div>
                        {pct >= CONFIDENCE_APPLY * 100 ? (
                          <Badge variant="secondary">se aplica</Badge>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Olvidar patrón"
                          onClick={() => forget.mutate(m.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}