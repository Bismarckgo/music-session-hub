import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Music, Users, Disc3 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatDate, type Collaborator, type StudioSession, type Work } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/actividad")({
  component: ActividadPage,
});

type WorkRow = Work & { collaborators: Collaborator[] };

type Event = {
  id: string;
  when: string;
  icon: typeof Activity;
  text: string;
  workId?: string;
};

function ActividadPage() {
  const { data: works } = useQuery({
    queryKey: ["works", "activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*, collaborators(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as WorkRow[];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions", "activity"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("*");
      if (error) throw error;
      return data as StudioSession[];
    },
  });

  const events: Event[] = [];
  const workById = new Map((works ?? []).map((w) => [w.id, w]));
  for (const w of works ?? []) {
    events.push({
      id: `w-${w.id}`,
      when: w.created_at,
      icon: Music,
      text: `Obra "${w.title}" creada`,
      workId: w.id,
    });
    for (const c of w.collaborators) {
      events.push({
        id: `c-${c.id}`,
        when: c.created_at,
        icon: Users,
        text: `${c.name} agregado como ${c.role} en "${w.title}"`,
        workId: w.id,
      });
    }
  }
  for (const s of sessions ?? []) {
    const t = workById.get(s.work_id)?.title ?? "una obra";
    events.push({
      id: `s-${s.id}`,
      when: s.started_at,
      icon: Disc3,
      text: `Nueva sesión${s.daw ? ` en ${s.daw}` : ""} detectada en "${t}"`,
      workId: s.work_id,
    });
  }
  events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Actividad</h1>
        <p className="text-sm text-muted-foreground">
          Historial completo del sistema en lenguaje humano.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos los eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <ul className="space-y-3">
              {events.map((e) => {
                const Icon = e.icon;
                const content = (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">{e.text}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.when)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={e.id}>
                    {e.workId ? (
                      <Link
                        to="/obras/$id"
                        params={{ id: e.workId }}
                        className="block rounded-lg p-2 transition-colors hover:bg-secondary/60"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="p-2">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay actividad registrada.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
