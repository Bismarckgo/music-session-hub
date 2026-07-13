import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { type Collaborator, type Work } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/registros")({
  component: RegistrosPage,
});

type WorkRow = Work & { collaborators: Collaborator[] };

type Registry = "ISRC" | "ISWC" | "PRO" | "Publisher" | "Distribución";

function RegistrosPage() {
  const { data: works } = useQuery({
    queryKey: ["works", "registros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*, collaborators(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as WorkRow[];
    },
  });

  const list = works ?? [];

  const status = (w: WorkRow, r: Registry): "listo" | "pendiente" => {
    if (r === "ISRC") return w.isrc ? "listo" : "pendiente";
    if (r === "ISWC") return w.iswc ? "listo" : "pendiente";
    if (r === "PRO")
      return w.collaborators.length > 0 && w.collaborators.every((c) => c.pro)
        ? "listo"
        : "pendiente";
    if (r === "Publisher")
      return w.collaborators.length > 0 && w.collaborators.every((c) => c.publisher)
        ? "listo"
        : "pendiente";
    return w.channels.length > 0 ? "listo" : "pendiente";
  };

  const registries: Registry[] = ["ISRC", "ISWC", "PRO", "Publisher", "Distribución"];

  const totals = registries.map((r) => ({
    r,
    listo: list.filter((w) => status(w, r) === "listo").length,
    pendiente: list.filter((w) => status(w, r) === "pendiente").length,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Registros</h1>
        <p className="text-sm text-muted-foreground">
          Estado de registros externos: PRO, copyright, publishing, distribución y exportaciones.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map((t) => (
          <Card key={t.r}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.r}</CardTitle>
              <ClipboardList className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{t.listo}</p>
              <p className="text-xs text-muted-foreground">
                {t.pendiente} pendiente{t.pendiente === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por obra</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length > 0 ? (
            <ul className="divide-y">
              {list.map((w) => (
                <li key={w.id}>
                  <Link
                    to="/obras/$id"
                    params={{ id: w.id }}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-secondary/60"
                  >
                    <p className="text-sm font-medium">{w.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {registries.map((r) => {
                        const s = status(w, r);
                        return (
                          <Badge
                            key={r}
                            variant="outline"
                            className={
                              s === "listo"
                                ? "border-primary/40 text-primary"
                                : "text-muted-foreground"
                            }
                          >
                            {s === "listo" ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {r}
                          </Badge>
                        );
                      })}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay obras para registrar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
