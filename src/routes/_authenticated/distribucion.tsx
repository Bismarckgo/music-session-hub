import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Radio, Hash } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  DISTRIBUTORS,
  DIST_STATUS_CLASSES,
  DIST_STATUS_LABELS,
  type Work,
} from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/distribucion")({
  component: Distribucion,
});

function Distribucion() {
  const { data: works, isLoading } = useQuery({
    queryKey: ["works", "distribucion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Work[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="h-6 w-6 text-primary" /> Distribución
        </h1>
        <p className="text-sm text-muted-foreground">
          Accesos rápidos a las distribuidoras y estado de cada obra. DistroKid, TuneCore y otros no ofrecen API pública, así que el envío se hace en su plataforma y aquí guardamos el link del release.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuidoras</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DISTRIBUTORS.filter((d) => d.url).map((d) => (
            <a
              key={d.name}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <span className="font-medium">{d.name}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obra</TableHead>
              <TableHead>Distribuidora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Release</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : works && works.length > 0 ? (
              works.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <Link
                      to="/obras/$id"
                      params={{ id: w.id }}
                      className="font-medium hover:text-primary"
                    >
                      {w.title}
                    </Link>
                    <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Hash className="h-3 w-3" /> {w.fingerprint}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {w.distributor_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={DIST_STATUS_CLASSES[w.distribution_status] ?? ""}>
                      {DIST_STATUS_LABELS[w.distribution_status] ?? w.distribution_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {w.distributor_url ? (
                      <a
                        href={w.distributor_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Abrir <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin link</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Aún no hay obras. Crea tu primera obra para gestionar su distribución.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}