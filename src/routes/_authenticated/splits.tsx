import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Percent } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { type Collaborator, type Work } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/splits")({
  component: SplitsPage,
});

type WorkWithCollabs = Work & { collaborators: Collaborator[] };

function SplitsPage() {
  const { data: works } = useQuery({
    queryKey: ["works", "splits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*, collaborators(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as WorkWithCollabs[];
    },
  });

  const rows = (works ?? []).map((w) => {
    const sum = w.collaborators.reduce((a, c) => a + Number(c.split_percent), 0);
    const rounded = Math.round(sum * 100) / 100;
    const ok = rounded === 100;
    const empty = w.collaborators.length === 0;
    return { work: w, sum: rounded, ok, empty };
  });

  const validCount = rows.filter((r) => r.ok).length;
  const conflictCount = rows.filter((r) => !r.ok && !r.empty).length;
  const emptyCount = rows.filter((r) => r.empty).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Splits</h1>
        <p className="text-sm text-muted-foreground">
          Validación automática de porcentajes de participación. Toda obra debe sumar 100%.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Splits válidos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{validCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conflictos
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{conflictCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sin colaboradores
            </CardTitle>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{emptyCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado por obra</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <ul className="divide-y">
              {rows.map(({ work, sum, ok, empty }) => (
                <li key={work.id}>
                  <Link
                    to="/obras/$id"
                    params={{ id: work.id }}
                    className="grid gap-2 py-3 transition-colors hover:bg-secondary/60 sm:grid-cols-[1fr_120px_180px] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{work.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {work.collaborators.length} colaborador
                        {work.collaborators.length === 1 ? "" : "es"}
                      </p>
                    </div>
                    <div className="text-sm">
                      <span
                        className={
                          ok
                            ? "text-primary"
                            : empty
                              ? "text-muted-foreground"
                              : "text-destructive"
                        }
                      >
                        {sum}%
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {ok ? "Aprobado" : empty ? "Vacío" : "Conflicto"}
                      </span>
                    </div>
                    <Progress value={Math.min(sum, 100)} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay obras para validar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
