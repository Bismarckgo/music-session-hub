import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Disc3, Fingerprint } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/catalog";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/sesiones")({
  component: Sesiones,
});

type SessionRow = {
  id: string;
  daw: string | null;
  notes: string | null;
  started_at: string;
  duration_minutes: number | null;
  work_id: string;
  works: { title: string; fingerprint: string } | null;
};

function Sesiones() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, daw, notes, started_at, duration_minutes, work_id, works(title, fingerprint)")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SessionRow[];
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Sesiones de estudio</h1>
        <p className="text-sm text-muted-foreground">
          Historial de sesiones capturadas por obra, desde que se abre el DAW
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <Disc3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Link
                      to="/obras/$id"
                      params={{ id: s.work_id }}
                      className="font-medium hover:text-primary"
                    >
                      {s.works?.title ?? "Obra"}
                    </Link>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Fingerprint className="h-3 w-3" /> {s.works?.fingerprint}
                      </span>
                      {s.daw && <span>· {s.daw}</span>}
                    </p>
                    {s.notes && <p className="mt-1 text-sm text-muted-foreground">{s.notes}</p>}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{formatDate(s.started_at)}</p>
                  {s.duration_minutes != null && <p className="text-xs">{s.duration_minutes} min</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground">
          Aún no hay sesiones. Regístralas desde la página de cada obra.
        </p>
      )}
    </div>
  );
}