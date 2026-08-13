import { Disc, ExternalLink } from "lucide-react";

import { DIST_STATUS_LABELS, formatDate, type Work } from "@/lib/catalog";
import type { Recording, RecordingShare } from "@/lib/data/recordings";
import { round2 } from "@/lib/cst-status";
import { StatusPill } from "@/components/CstStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function duration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RecordingsCard({
  work,
  recordings,
  sharesByRecording,
}: {
  work: Work;
  recordings: Recording[];
  sharesByRecording: Record<string, RecordingShare[]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Disc className="h-4 w-4 text-primary" /> Grabaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recordings.length > 0 ? (
          recordings.map((r) => {
            const shares = (sharesByRecording[r.id] ?? []).filter((s) => s.is_active);
            return (
              <div key={r.id} className="space-y-2 rounded-lg border px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.title}</p>
                  <StatusPill
                    state={r.isrc ? "complete" : "attention"}
                    size="sm"
                    label={r.isrc ?? "Sin ISRC"}
                  />
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Duración: {duration(r.duration_sec)}</span>
                  <span>
                    Distribución:{" "}
                    {DIST_STATUS_LABELS[r.distribution_status] ?? r.distribution_status}
                  </span>
                  <span>Distribuidora: {r.distributor_name ?? "—"}</span>
                </div>
                {shares.length > 0 ? (
                  <ul className="space-y-1 text-xs">
                    {shares.map((s) => (
                      <li key={s.id} className="flex justify-between">
                        <span>
                          {s.name ?? "—"} <span className="text-muted-foreground">· {s.role}</span>
                        </span>
                        <span className="font-mono">{round2(Number(s.artist_share ?? 0))}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Participantes de la grabación: no disponible.
                  </p>
                )}
                {r.distributor_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={r.distributor_url} target="_blank" rel="noreferrer">
                      Abrir release <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <div className="space-y-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
            <p>Esta obra no tiene grabaciones registradas en la tabla de recordings.</p>
            <p className="text-xs">
              Identificador de la obra: ISRC {work.isrc ?? "—"} · Última actualización{" "}
              {formatDate(work.updated_at)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
