import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, History, Paperclip } from "lucide-react";

import { formatDate } from "@/lib/catalog";
import {
  listRegistrations,
  listRegistrationsByWork,
  registrationBucket,
  registrationLabel,
  registrationState,
  type RegistrationBucket,
  type RegistrationWithWork,
} from "@/lib/data/registrations";
import { StatusPill } from "@/components/CstStatus";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Tipo de registro derivado de la plataforma; nunca se inventa un valor. */
const PLATFORM_TYPES: Record<string, string> = {
  ASCAP: "PRO",
  BMI: "PRO",
  SESAC: "PRO",
  "The MLC": "Mecánico",
  Songtrust: "Administración editorial",
  Sentric: "Administración editorial",
};

const FILTERS: { value: "all" | RegistrationBucket; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "attention", label: "Atención" },
  { value: "pending", label: "Pendiente" },
  { value: "complete", label: "Completo" },
];

function isUrl(value: string | null): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

export function RegistrationsPanel({ workId }: { workId?: string }) {
  const [filter, setFilter] = useState<"all" | RegistrationBucket>("all");

  const {
    data: registrations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: workId ? ["work_registrations", workId] : ["work_registrations", "all"],
    queryFn: () => (workId ? listRegistrationsByWork(workId) : listRegistrations()),
  });

  const rows = useMemo(() => {
    const list = registrations ?? [];
    if (filter === "all") return list;
    return list.filter((r) => registrationBucket(r.status) === filter);
  }, [registrations, filter]);

  const counts = useMemo(() => {
    const list = registrations ?? [];
    return {
      all: list.length,
      attention: list.filter((r) => registrationBucket(r.status) === "attention").length,
      pending: list.filter((r) => registrationBucket(r.status) === "pending").length,
      complete: list.filter((r) => registrationBucket(r.status) === "complete").length,
    };
  }, [registrations]);

  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        No se pudieron cargar los registros.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              <span className="ml-1.5 text-xs text-muted-foreground">{counts[f.value]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {!workId && <TableHead className="text-xs uppercase tracking-wide">Obra</TableHead>}
              <TableHead className="text-xs uppercase tracking-wide">Sistema</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">
                Tipo
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Estado</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">
                ID externo
              </TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">
                Fecha
              </TableHead>
              <TableHead className="w-[1%] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={workId ? 6 : 7}
                  className="py-8 text-center text-muted-foreground"
                >
                  Cargando registros…
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map((r) => <RegistrationRow key={r.id} registration={r} showWork={!workId} />)
            ) : (
              <TableRow>
                <TableCell
                  colSpan={workId ? 6 : 7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {counts.all === 0
                    ? workId
                      ? "Esta obra todavía no tiene registros externos."
                      : "Aún no hay registros externos creados."
                    : "Ningún registro coincide con este filtro."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RegistrationRow({
  registration: r,
  showWork,
}: {
  registration: RegistrationWithWork;
  showWork: boolean;
}) {
  const state = registrationState(r.status);
  return (
    <TableRow className="group transition-shadow hover:bg-secondary/40 hover:shadow-sm">
      {showWork && (
        <TableCell>
          {r.works ? (
            <Link
              to="/obras/$id"
              params={{ id: r.works.id }}
              className="font-medium hover:text-primary"
            >
              {r.works.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
      <TableCell className="text-sm font-medium">{r.platform}</TableCell>
      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
        {PLATFORM_TYPES[r.platform] ?? "No disponible"}
      </TableCell>
      <TableCell>
        <StatusPill state={state} label={registrationLabel(r.status)} />
      </TableCell>
      <TableCell className="hidden font-mono text-xs lg:table-cell">
        {r.external_id ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="hidden text-sm lg:table-cell">
        {r.registration_date ? (
          formatDate(r.registration_date)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {isUrl(r.external_id) ? (
            <Button asChild size="sm" variant="ghost" title="Abrir registro">
              <a href={r.external_id} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled title="Sin enlace externo disponible">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled
            title="Adjuntar documento: no disponible todavía"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" title="Ver historial">
                <History className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2 text-sm">
              <p className="font-medium">Historial de {r.platform}</p>
              <HistoryLine label="Creado" value={formatDate(r.created_at)} />
              <HistoryLine label="Actualizado" value={formatDate(r.updated_at)} />
              <HistoryLine
                label="Última verificación"
                value={r.last_checked ? formatDate(r.last_checked) : "—"}
              />
              <HistoryLine label="Notas" value={r.notes ?? "—"} />
            </PopoverContent>
          </Popover>
        </div>
      </TableCell>
    </TableRow>
  );
}

function HistoryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
