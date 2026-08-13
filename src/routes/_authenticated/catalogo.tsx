import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  Music2,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Search,
  Upload,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { emit } from "@/lib/mie/events";
import { WORK_STATUSES, type Collaborator, type StudioSession, type Work } from "@/lib/catalog";
import {
  isWriterRole,
  workFacets,
  type CompositionShareLike,
  type WorkFacets,
} from "@/lib/cst-status";
import { useCoverUrls } from "@/hooks/use-cover-urls";
import { StatusPill } from "@/components/CstStatus";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/catalogo")({
  validateSearch: (search: Record<string, unknown>) => ({
    nueva: search.nueva === true || search.nueva === "true" ? true : undefined,
  }),
  component: Catalogo,
});

type CompositionRow = {
  id: string;
  iswc: string | null;
  composition_shares: CompositionShareLike[];
};

type WorkRow = Work & {
  collaborators: Collaborator[];
  sessions: StudioSession[];
  recordings: { id: string; isrc: string | null; distribution_status: string }[];
  compositions: CompositionRow[];
  work_registrations: { platform: string; status: string }[];
};

type SortKey = "activity" | "title" | "status";

const FILTER_GROUPS = [
  {
    key: "status" as const,
    label: "Estado",
    options: [
      { value: "draft", label: "Borrador" },
      { value: "attention", label: "Atención" },
      { value: "complete", label: "Lista" },
    ],
  },
  {
    key: "type" as const,
    label: "Tipo",
    options: [
      { value: "composition", label: "Composición" },
      { value: "recording", label: "Grabación" },
      { value: "release", label: "Release" },
    ],
  },
  {
    key: "people" as const,
    label: "Personas",
    options: [
      { value: "writer", label: "Compositor" },
      { value: "producer", label: "Productor" },
      { value: "artist", label: "Artista" },
    ],
  },
  {
    key: "registration" as const,
    label: "Registro",
    options: [
      { value: "missing", label: "Faltante" },
      { value: "submitted", label: "Enviado" },
      { value: "complete", label: "Completo" },
    ],
  },
];

type FilterKey = (typeof FILTER_GROUPS)[number]["key"];
type FilterState = Record<FilterKey, string[]>;

const EMPTY_FILTERS: FilterState = {
  status: [],
  type: [],
  people: [],
  registration: [],
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Justo ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  const months = Math.round(days / 30);
  return `Hace ${months} m`;
}

function lastActivity(w: WorkRow): { when: string; label: string } {
  type Ev = { when: string; label: string };
  const events: Ev[] = [{ when: w.updated_at, label: "Metadata editada" }];
  for (const s of w.sessions) events.push({ when: s.started_at, label: "Nueva sesión" });
  for (const c of w.collaborators) events.push({ when: c.created_at, label: "Nuevo colaborador" });
  events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  return events[0];
}

function facetsOf(w: WorkRow): WorkFacets {
  const composition = w.compositions?.[0];
  return workFacets({
    work: w,
    collaborators: w.collaborators,
    shares: composition?.composition_shares ?? [],
    hasComposition: Boolean(composition),
    recordings: w.recordings ?? [],
    registrations: w.work_registrations ?? [],
  });
}

type Draft = {
  title: string;
  genre: string;
  bpm: string;
  musicalKey: string;
  isrc: string;
  iswc: string;
};

const EMPTY_DRAFT: Draft = { title: "", genre: "", bpm: "", musicalKey: "", isrc: "", iswc: "" };

function Catalogo() {
  const { nueva } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(Boolean(nueva));
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("activity");
  const [view, setView] = useState<"table" | "cards">("table");

  const { data: works, isLoading } = useQuery({
    queryKey: ["works", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select(
          "*, collaborators(*), sessions(*), recordings(id, isrc, distribution_status), compositions(id, iswc, composition_shares(*)), work_registrations(platform, status)",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as WorkRow[];
    },
  });

  const { data: coverMap } = useCoverUrls((works ?? []).map((w) => w.cover_path));

  const createWork = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("works")
        .insert({
          user_id: userData.user.id,
          title: draft.title,
          genre: draft.genre || null,
          bpm: draft.bpm ? Number(draft.bpm) : null,
          musical_key: draft.musicalKey || null,
          isrc: draft.isrc || null,
          iswc: draft.iswc || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Work;
    },
    onSuccess: (work) => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      void emit({
        type: "WorkCreated",
        work_id: work.id,
        payload: { title: work.title, source: "catalogo" },
      });
      if (work.isrc || work.iswc) {
        void emit({
          type: "IdentifiersSet",
          work_id: work.id,
          payload: { isrc: work.isrc, iswc: work.iswc },
        });
      }
      toast.success(`Obra creada con CSTID ${work.fingerprint}`);
      setOpen(false);
      setDraft(EMPTY_DRAFT);
      navigate({ to: "/obras/$id", params: { id: work.id } });
    },
    onError: () => toast.error("No se pudo crear la obra"),
  });

  const rows = useMemo(() => {
    const list = (works ?? []).map((w) => {
      const artist = w.collaborators.find((c) => c.role === "Artista principal");
      const activity = lastActivity(w);
      return { work: w, artist, activity, facets: facetsOf(w) };
    });
    const filtered = list.filter(({ work, artist, facets }) => {
      if (filters.status.length && !filters.status.includes(facets.overall.state)) return false;
      if (filters.type.length) {
        const types: string[] = [];
        if (work.compositions?.length || work.iswc) types.push("composition");
        if (work.recordings?.length || work.isrc) types.push("recording");
        if (work.distribution_status !== "sin_distribuir") types.push("release");
        if (!filters.type.some((t) => types.includes(t))) return false;
      }
      if (filters.people.length) {
        const roles = work.collaborators.map((c) => c.role);
        const people: string[] = [];
        if (roles.some(isWriterRole)) people.push("writer");
        if (roles.some((r) => /productor|producer|beatmaker/i.test(r))) people.push("producer");
        if (roles.some((r) => /artista|artist|featuring/i.test(r))) people.push("artist");
        if (!filters.people.some((p) => people.includes(p))) return false;
      }
      if (filters.registration.length) {
        const { state, total, complete } = facets.registration;
        const bucket =
          total === 0
            ? "missing"
            : complete === total && state === "complete"
              ? "complete"
              : "submitted";
        if (!filters.registration.includes(bucket)) return false;
      }
      if (q) {
        const needle = q.toLowerCase();
        const hay = [
          work.title,
          work.fingerprint,
          work.isrc ?? "",
          work.iswc ?? "",
          work.genre ?? "",
          artist?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (sortKey === "title") filtered.sort((a, b) => a.work.title.localeCompare(b.work.title));
    if (sortKey === "status")
      filtered.sort((a, b) => a.facets.overall.state.localeCompare(b.facets.overall.state));
    if (sortKey === "activity")
      filtered.sort(
        (a, b) => new Date(b.activity.when).getTime() - new Date(a.activity.when).getTime(),
      );
    return filtered;
  }, [works, q, filters, sortKey]);

  const activeFilters = Object.values(filters).reduce((a, v) => a + v.length, 0);

  const toggleFilter = (key: FilterKey, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const duplicate = (w: WorkRow) => {
    setDraft({
      title: `${w.title} (copia)`,
      genre: w.genre ?? "",
      bpm: w.bpm != null ? String(w.bpm) : "",
      musicalKey: w.musical_key ?? "",
      isrc: "",
      iswc: "",
    });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
          <p className="text-sm text-muted-foreground">
            Cada obra recibe un CSTID permanente que representa su historia completa.
          </p>
        </div>
        <Button
          onClick={() => {
            setDraft(EMPTY_DRAFT);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Nueva obra
        </Button>
      </div>

      <NuevaObraDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setDraft(EMPTY_DRAFT);
        }}
        draft={draft}
        setDraft={setDraft}
        onSubmit={() => createWork.mutate()}
        pending={createWork.isPending}
      />

      <CSVImport />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar título, creador, ISRC, ISWC…"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-1 h-4 w-4" />
              Filtros
              {activeFilters > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {activeFilters}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(90vw,34rem)]">
            <div className="grid gap-4 sm:grid-cols-4">
              {FILTER_GROUPS.map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  {group.options.map((opt) => {
                    const id = `f-${group.key}-${opt.value}`;
                    return (
                      <div key={opt.value} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={filters[group.key].includes(opt.value)}
                          onCheckedChange={() => toggleFilter(group.key, opt.value)}
                        />
                        <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                          {opt.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {activeFilters > 0 && (
              <>
                <Separator className="my-3" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  Limpiar filtros
                </Button>
              </>
            )}
          </PopoverContent>
        </Popover>

        <div className="w-44">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger>
              <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity">Actividad reciente</SelectItem>
              <SelectItem value="title">Título (A→Z)</SelectItem>
              <SelectItem value="status">Estado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as "table" | "cards")}
          variant="outline"
        >
          <ToggleGroupItem value="table" aria-label="Vista de tabla">
            <Rows3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Vista de tarjetas">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide">Título</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Artista</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Estado</TableHead>
                <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">
                  Composición
                </TableHead>
                <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">
                  Grabación
                </TableHead>
                <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">
                  Splits
                </TableHead>
                <TableHead className="hidden text-xs uppercase tracking-wide md:table-cell">
                  Registro
                </TableHead>
                <TableHead className="hidden text-xs uppercase tracking-wide xl:table-cell">
                  Actualización
                </TableHead>
                <TableHead className="w-[1%] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : rows.length > 0 ? (
                rows.map(({ work: w, artist, activity, facets }) => (
                  <TableRow
                    key={w.id}
                    className="group transition-shadow hover:bg-secondary/40 hover:shadow-sm"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Cover work={w} url={coverMap?.[w.cover_path ?? ""]} />
                        <div>
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
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {artist ? (
                        <span className="text-sm">{artist.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        state={facets.overall.state}
                        label={facets.overall.label}
                        title={facets.overall.detail}
                      />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <StatusPill
                        state={facets.composition.state}
                        label={facets.composition.label}
                        title={facets.composition.detail}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <StatusPill
                        state={facets.recording.state}
                        label={facets.recording.label}
                        title={facets.recording.detail}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusPill
                        state={facets.splits.state}
                        label={facets.splits.label}
                        title={facets.splits.detail}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusPill
                        state={facets.registration.state}
                        label={facets.registration.label}
                        title={facets.registration.detail}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <p className="text-sm">{activity.label}</p>
                      <p className="text-xs text-muted-foreground">{relativeTime(activity.when)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions work={w} onDuplicate={() => duplicate(w)} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    {activeFilters > 0 || q
                      ? "Ninguna obra coincide con los filtros aplicados."
                      : "Tu catálogo está vacío. Crea tu primera obra para generar su CSTID."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : rows.length > 0 ? (
            rows.map(({ work: w, artist, activity, facets }) => (
              <div
                key={w.id}
                className="group space-y-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Cover work={w} url={coverMap?.[w.cover_path ?? ""]} size="lg" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/obras/$id"
                      params={{ id: w.id }}
                      className="block truncate font-medium hover:text-primary"
                    >
                      {w.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {artist?.name ?? "Sin artista principal"}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Hash className="h-3 w-3" /> {w.fingerprint}
                    </p>
                  </div>
                  <RowActions work={w} onDuplicate={() => duplicate(w)} alwaysVisible />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusPill state={facets.overall.state} label={facets.overall.label} size="sm" />
                  <StatusPill
                    state={facets.composition.state}
                    label={`Composición · ${facets.composition.label}`}
                    size="sm"
                  />
                  <StatusPill
                    state={facets.recording.state}
                    label={`Grabación · ${facets.recording.label}`}
                    size="sm"
                  />
                  <StatusPill
                    state={facets.splits.state}
                    label={`Splits · ${facets.splits.label}`}
                    size="sm"
                  />
                  <StatusPill
                    state={facets.registration.state}
                    label={`Registro · ${facets.registration.label}`}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {activity.label} · {relativeTime(activity.when)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {activeFilters > 0 || q
                ? "Ninguna obra coincide con los filtros aplicados."
                : "Tu catálogo está vacío. Crea tu primera obra para generar su CSTID."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Cover({ work, url, size = "md" }: { work: Work; url?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  return (
    <div className={`${box} shrink-0 overflow-hidden rounded-md border bg-secondary`}>
      {url ? (
        <img src={url} alt={`Carátula de ${work.title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function RowActions({
  work,
  onDuplicate,
  alwaysVisible = false,
}: {
  work: WorkRow;
  onDuplicate: () => void;
  alwaysVisible?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-1 transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${
        alwaysVisible ? "" : "opacity-0"
      }`}
    >
      <Button asChild size="sm" variant="secondary">
        <Link to="/obras/$id" params={{ id: work.id }}>
          Abrir
        </Link>
      </Button>
      <Button asChild size="sm" variant="ghost" title="Editar">
        <Link to="/obras/$id" params={{ id: work.id }} hash="composition">
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button size="sm" variant="ghost" title="Duplicar" onClick={onDuplicate}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" title="Más acciones">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(work.fingerprint);
              toast.success("CSTID copiado");
            }}
          >
            <Hash className="mr-2 h-4 w-4" /> Copiar CSTID
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!work.isrc}
            onClick={() => {
              if (!work.isrc) return;
              navigator.clipboard.writeText(work.isrc);
              toast.success("ISRC copiado");
            }}
          >
            <Music2 className="mr-2 h-4 w-4" /> Copiar ISRC
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/registros">
              <ExternalLink className="mr-2 h-4 w-4" /> Ver registros
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NuevaObraDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva obra</DialogTitle>
          <DialogDescription>
            El CSTID se genera automáticamente y acompañará a la obra durante toda su vida.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="w-title">Título *</Label>
            <Input
              id="w-title"
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-genre">Género</Label>
              <Input
                id="w-genre"
                value={draft.genre}
                onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-bpm">BPM</Label>
              <Input
                id="w-bpm"
                type="number"
                min={1}
                value={draft.bpm}
                onChange={(e) => setDraft({ ...draft, bpm: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-key">Tonalidad</Label>
              <Input
                id="w-key"
                placeholder="Ej: Am"
                value={draft.musicalKey}
                onChange={(e) => setDraft({ ...draft, musicalKey: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-isrc">ISRC</Label>
              <Input
                id="w-isrc"
                placeholder="Opcional"
                value={draft.isrc}
                onChange={(e) => setDraft({ ...draft, isrc: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-iswc">ISWC</Label>
              <Input
                id="w-iswc"
                placeholder="Opcional"
                value={draft.iswc}
                onChange={(e) => setDraft({ ...draft, iswc: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando…" : "Crear obra"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQ = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === "," || ch === ";") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

const FIELD_ALIASES: Record<string, string[]> = {
  title: ["title", "titulo", "título", "track", "song", "canción", "cancion", "obra"],
  isrc: ["isrc"],
  iswc: ["iswc"],
  genre: ["genre", "género", "genero"],
  bpm: ["bpm", "tempo"],
  musical_key: ["key", "tonalidad", "musical_key"],
  status: ["status", "estado"],
};

function pick(row: Record<string, string>, field: string): string | null {
  for (const key of FIELD_ALIASES[field] ?? [field]) {
    if (row[key] != null && row[key] !== "") return row[key];
  }
  return null;
}

function CSVImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error("CSV vacío");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const userId = userData.user.id;

      // Fetch existing works to skip duplicates by title (case-insensitive) or ISRC
      const { data: existing } = await supabase.from("works").select("title, isrc");
      const existingTitles = new Set((existing ?? []).map((w) => w.title.toLowerCase()));
      const existingIsrcs = new Set(
        (existing ?? []).map((w) => w.isrc).filter(Boolean) as string[],
      );

      let imported = 0;
      let skipped = 0;
      const toInsert: {
        user_id: string;
        title: string;
        isrc: string | null;
        iswc: string | null;
        genre: string | null;
        bpm: number | null;
        musical_key: string | null;
        status: string;
      }[] = [];

      for (const row of rows) {
        const title = pick(row, "title");
        if (!title) {
          skipped++;
          continue;
        }
        const isrc = pick(row, "isrc");
        if (existingTitles.has(title.toLowerCase()) || (isrc && existingIsrcs.has(isrc))) {
          skipped++;
          continue;
        }
        existingTitles.add(title.toLowerCase());
        if (isrc) existingIsrcs.add(isrc);
        const bpmRaw = pick(row, "bpm");
        const rawStatus = (pick(row, "status") ?? "").toLowerCase().replace(/\s+/g, "_");
        const status = WORK_STATUSES.includes(rawStatus as (typeof WORK_STATUSES)[number])
          ? rawStatus
          : "en_progreso";
        toInsert.push({
          user_id: userId,
          title,
          isrc: isrc || null,
          iswc: pick(row, "iswc"),
          genre: pick(row, "genre"),
          bpm: bpmRaw ? Number(bpmRaw) || null : null,
          musical_key: pick(row, "musical_key"),
          status,
        });
      }

      if (toInsert.length) {
        const { error } = await supabase.from("works").insert(toInsert);
        if (error) throw error;
        imported = toInsert.length;
      }
      return { imported, skipped };
    },
    onSuccess: ({ imported, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(
        `Importadas ${imported} obra${imported === 1 ? "" : "s"}${
          skipped ? ` · ${skipped} omitida${skipped === 1 ? "" : "s"}` : ""
        }`,
      );
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo importar el CSV"),
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Importar catálogo desde CSV</p>
          <p className="text-xs text-muted-foreground">
            Columnas soportadas: title, isrc, iswc, genre, bpm, key, status. Se omiten títulos e
            ISRC duplicados.
          </p>
        </div>
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importMut.mutate(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={importMut.isPending}
        >
          <Upload className="mr-1 h-4 w-4" />
          {importMut.isPending ? "Importando…" : "Subir CSV"}
        </Button>
      </div>
    </div>
  );
}
