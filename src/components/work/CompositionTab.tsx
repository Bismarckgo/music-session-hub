import { Music4 } from "lucide-react";

import type { Work, Contact } from "@/lib/catalog";
import type { Composition, CompositionShare } from "@/lib/data/compositions";
import {
  compositionStatus,
  isWriterRole,
  round2,
  shareTotal,
  type CstState,
} from "@/lib/cst-status";
import { StatusLine, StatusPill } from "@/components/CstStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EMPTY = <span className="text-muted-foreground">—</span>;

export function CompositionTab({
  work,
  composition,
  shares,
  contacts,
}: {
  work: Work;
  composition: Composition | null;
  shares: CompositionShare[];
  contacts: Contact[];
}) {
  const active = shares.filter((s) => s.is_active);
  const writers = active.filter((s) => isWriterRole(s.role));
  const total = shareTotal(active);
  const iswc = composition?.iswc ?? work.iswc;
  const status = compositionStatus({
    iswc,
    hasComposition: Boolean(composition),
    shares: active,
    writers: writers.length,
  });
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const withoutPublisher = active.filter((s) => {
    const contact = s.person_id ? contactById.get(s.person_id) : undefined;
    return Number(s.publisher_share ?? 0) === 0 && !contact?.publisher;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Music4 className="h-4 w-4 text-primary" /> Identidad de la obra
          </CardTitle>
          <StatusPill state={status.state} label={status.label} title={status.detail} />
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Field label="Título" value={composition?.title ?? work.title} />
          <Field label="Títulos alternativos" value={null} fallback="No disponible" />
          <Field
            label="ISWC"
            value={iswc}
            fallback="Pendiente"
            hint={iswc ? "Sin verificar contra la sociedad" : undefined}
          />
          <Field label="Género" value={composition?.genre ?? work.genre} />
          <Field label="Tonalidad" value={composition?.musical_key ?? work.musical_key} />
          <Field
            label="BPM"
            value={
              composition?.bpm != null
                ? String(composition.bpm)
                : work.bpm != null
                  ? String(work.bpm)
                  : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <StatusLine state={writers.length > 0 ? "complete" : "attention"}>
            {writers.length > 0
              ? `${writers.length} autor${writers.length === 1 ? "" : "es"} identificado${writers.length === 1 ? "" : "s"}`
              : "Ningún autor identificado"}
          </StatusLine>
          <StatusLine state={active.length > 0 && total === 100 ? "complete" : "attention"}>
            {active.length === 0
              ? "Sin shares de autor registrados"
              : total === 100
                ? "Los shares de autor suman 100%"
                : `Los shares de autor suman ${total}% (faltan ${round2(100 - total)}%)`}
          </StatusLine>
          <StatusLine state={iswc ? "complete" : "pending"}>
            {iswc ? `ISWC ${iswc}` : "ISWC pendiente de asignación"}
          </StatusLine>
          <StatusLine
            state={
              active.length === 0
                ? "none"
                : withoutPublisher.length === 0
                  ? "complete"
                  : "attention"
            }
          >
            {active.length === 0
              ? "Cobertura editorial no disponible"
              : withoutPublisher.length === 0
                ? "Todos los participantes tienen publisher"
                : `${withoutPublisher.length} participante${withoutPublisher.length === 1 ? "" : "s"} sin publisher`}
          </StatusLine>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Autores y editores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide">Nombre</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Rol</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">
                    IPI
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Share</TableHead>
                  <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">
                    Publisher
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.length > 0 ? (
                  active.map((s) => {
                    const contact = s.person_id ? contactById.get(s.person_id) : undefined;
                    const publisher = contact?.publisher ?? null;
                    const rowState: CstState =
                      Number(s.writer_share ?? 0) === 0
                        ? "attention"
                        : contact?.ipi
                          ? "complete"
                          : "pending";
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.name ?? contact?.name ?? EMPTY}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.role}</TableCell>
                        <TableCell className="hidden font-mono text-xs md:table-cell">
                          {contact?.ipi ?? EMPTY}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {round2(Number(s.writer_share ?? 0))}%
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {publisher ??
                            (Number(s.publisher_share ?? 0) > 0
                              ? `${round2(Number(s.publisher_share))}% editorial`
                              : EMPTY)}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            state={rowState}
                            size="sm"
                            label={
                              rowState === "complete"
                                ? "Identificado"
                                : rowState === "pending"
                                  ? "Sin IPI"
                                  : "Sin share"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {composition
                        ? "La composición todavía no tiene autores registrados."
                        : "Esta obra aún no tiene una composición asociada."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  fallback = "—",
  hint,
}: {
  label: string;
  value?: string | null;
  fallback?: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={value ? "font-medium" : "font-medium text-muted-foreground"}>
        {value || fallback}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
