import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Library, Disc3, Users, Plus, Fingerprint } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { STATUS_CLASSES, STATUS_LABELS, formatDate, type Work } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [works, sessions, collabs] = await Promise.all([
        supabase.from("works").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase.from("collaborators").select("*", { count: "exact", head: true }),
      ]);
      return {
        works: works.count ?? 0,
        sessions: sessions.count ?? 0,
        collaborators: collabs.count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["works", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Work[];
    },
  });

  const cards = [
    { label: "Obras en catálogo", value: stats?.works ?? 0, icon: Library },
    { label: "Sesiones registradas", value: stats?.sessions ?? 0, icon: Disc3 },
    { label: "Colaboradores", value: stats?.collaborators ?? 0, icon: Users },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu catálogo y actividad</p>
        </div>
        <Button asChild>
          <Link to="/catalogo" search={{ nueva: true }}>
            <Plus className="mr-1 h-4 w-4" /> Nueva obra
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recent && recent.length > 0 ? (
            <ul className="divide-y">
              {recent.map((w) => (
                <li key={w.id}>
                  <Link
                    to="/obras/$id"
                    params={{ id: w.id }}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{w.title}</p>
                      <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Fingerprint className="h-3 w-3" /> {w.fingerprint}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_CLASSES[w.status] ?? ""}>{STATUS_LABELS[w.status] ?? w.status}</Badge>
                      <span className="hidden text-xs text-muted-foreground sm:block">{formatDate(w.updated_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no tienes obras. Crea la primera desde el catálogo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}