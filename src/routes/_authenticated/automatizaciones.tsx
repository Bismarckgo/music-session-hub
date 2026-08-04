import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Zap, Wand2, CheckCircle2, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Collaborator, Contact, Work } from "@/lib/catalog";
import { emit } from "@/lib/mie/events";
import {
  detectAutomations,
  AUTOMATION_LABELS,
  type Automation,
  type AutomationKind,
} from "@/lib/mie/automations";
import { fetchDeezerCoverByISRC } from "@/lib/deezer.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/automatizaciones")({
  component: AutomatizacionesPage,
  head: () => ({
    meta: [
      { title: "Automatizaciones del MIE — CST" },
      {
        name: "description",
        content:
          "El motor detecta y ejecuta correcciones de metadata: identidades, splits, carátulas y estados.",
      },
      { property: "og:title", content: "Automatizaciones del MIE — CST" },
      {
        property: "og:description",
        content: "Deja que el motor resuelva la metadata inconsistente con un clic.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const KIND_ORDER: AutomationKind[] = [
  "balance_splits",
  "link_contact",
  "fill_identity",
  "sync_identifiers",
  "sync_distribution",
  "fetch_cover",
];

function AutomatizacionesPage() {
  const queryClient = useQueryClient();
  const deezerFn = useServerFn(fetchDeezerCoverByISRC);
  const [running, setRunning] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["mie", "automations"],
    queryFn: async () => {
      const [works, collaborators, contacts, events] = await Promise.all([
        supabase.from("works").select("*"),
        supabase.from("collaborators").select("*"),
        supabase.from("contacts").select("*"),
        supabase.from("mie_events").select("work_id, type"),
      ]);
      if (works.error) throw works.error;
      if (collaborators.error) throw collaborators.error;
      if (contacts.error) throw contacts.error;
      if (events.error) throw events.error;
      return {
        works: works.data as Work[],
        collaborators: collaborators.data as Collaborator[],
        contacts: contacts.data as Contact[],
        events: events.data as { work_id: string | null; type: string }[],
      };
    },
  });

  const automations = useMemo(() => {
    if (!data) return [];
    const list = detectAutomations(data.works, data.collaborators, data.contacts, data.events);
    return [...list].sort(
      (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
    );
  }, [data]);

  const apply = async (a: Automation) => {
    if (a.plan.type === "update_collaborator") {
      const { error } = await supabase
        .from("collaborators")
        .update(a.plan.values)
        .eq("id", a.plan.collaboratorId);
      if (error) throw error;
    } else if (a.plan.type === "set_splits") {
      for (const s of a.plan.splits) {
        const { error } = await supabase
          .from("collaborators")
          .update({ split_percent: s.split_percent })
          .eq("id", s.collaboratorId);
        if (error) throw error;
      }
    } else if (a.plan.type === "fetch_cover") {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const result = await deezerFn({ data: { isrc: a.plan.isrc } });
      const bin = atob(result.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: result.contentType });
      const ext = result.contentType.includes("png") ? "png" : "jpg";
      const path = `${userData.user.id}/${a.workId}-${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("covers")
        .upload(path, blob, { upsert: true, contentType: result.contentType });
      if (up.error) throw up.error;
      const { error } = await supabase
        .from("works")
        .update({ cover_path: path })
        .eq("id", a.workId);
      if (error) throw error;
    }
    await emit({
      type: a.event.type as never,
      work_id: a.workId,
      actor: "engine",
      payload: a.event.payload,
    });
  };

  const single = useMutation({
    mutationFn: async (a: Automation) => {
      setRunning(a.id);
      await apply(a);
    },
    onSuccess: () => {
      toast.success("Automatización aplicada");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo aplicar"),
    onSettled: () => setRunning(null),
  });

  const runAll = async () => {
    setBulk(true);
    let ok = 0;
    let fail = 0;
    for (const a of automations) {
      try {
        setRunning(a.id);
        await apply(a);
        ok++;
      } catch {
        fail++;
      }
    }
    setRunning(null);
    setBulk(false);
    queryClient.invalidateQueries();
    toast.success(`${ok} automatizaciones aplicadas${fail ? ` · ${fail} con error` : ""}`);
  };

  const byKind = KIND_ORDER.map((kind) => ({
    kind,
    items: automations.filter((a) => a.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Zap className="h-5 w-5 text-primary" /> Automatizaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            El motor detecta metadata inconsistente y la corrige por ti. Cada acción queda
            registrada en el timeline de la obra.
          </p>
        </div>
        {automations.length > 0 && (
          <Button onClick={runAll} disabled={bulk}>
            <Wand2 className="mr-1 h-4 w-4" />
            {bulk ? "Aplicando…" : `Aplicar todas (${automations.length})`}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Analizando el catálogo…</p>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">Nada que automatizar</p>
            <p className="text-xs text-muted-foreground">
              El motor no encontró correcciones pendientes en tu catálogo.
            </p>
          </CardContent>
        </Card>
      ) : (
        byKind.map((group) => (
          <Card key={group.kind}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {AUTOMATION_LABELS[group.kind]}
              </CardTitle>
              <Badge variant="secondary">{group.items.length}</Badge>
            </CardHeader>
            <CardContent className="divide-y">
              {group.items.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                    <Link
                      to="/obras/$id"
                      params={{ id: a.workId }}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {a.workTitle} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={running === a.id || bulk}
                    onClick={() => single.mutate(a)}
                  >
                    {running === a.id ? "Aplicando…" : "Aplicar"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}