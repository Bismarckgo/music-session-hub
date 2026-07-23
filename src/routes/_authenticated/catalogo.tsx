import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Hash, Search, ArrowUpDown, Upload, Image as ImageIcon, FileSpreadsheet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { emit } from "@/lib/mie/events";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  WORK_STATUSES,
  type Collaborator,
  type StudioSession,
  type Work,
} from "@/lib/catalog";
import { useCoverUrls } from "@/hooks/use-cover-urls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/catalogo")({
  validateSearch: (search: Record<string, unknown>) => ({
    nueva: search.nueva === true || search.nueva === "true" ? true : undefined,
  }),
  component: Catalogo,
});

type WorkRow = Work & {
  collaborators: Collaborator[];
  sessions: StudioSession[];
};

type SortKey = "activity" | "title" | "status";

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
  for (const c of w.collaborators)
    events.push({ when: c.created_at, label: "Nuevo colaborador" });
  events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  return events[0];
}

function formatDuration(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Catalogo() {
  const { nueva } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(Boolean(nueva));
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [isrc, setIsrc] = useState("");
  const [iswc, setIswc] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("__all");
  const [sortKey, setSortKey] = useState<SortKey>("activity");

  const { data: works, isLoading } = useQuery({
    queryKey: ["works", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*, collaborators(*), sessions(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as WorkRow[];
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
          title,
          genre: genre || null,
          bpm: bpm ? Number(bpm) : null,
          musical_key: musicalKey || null,
          isrc: isrc || null,
          iswc: iswc || null,
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
      navigate({ to: "/obras/$id", params: { id: work.id } });
    },
    onError: () => toast.error("No se pudo crear la obra"),
  });

  const rows = useMemo(() => {
    const list = (works ?? []).map((w) => {
      const artist = w.collaborators.find((c) => c.role === "Artista principal");
      const durationMin = w.sessions.reduce(
        (a, s) => a + (s.duration_minutes ?? 0),
        0,
      );
      const activity = lastActivity(w);
      return { work: w, artist, durationMin, activity };
    });
    const filtered = list.filter(({ work, artist }) => {
      if (statusFilter !== "__all" && work.status !== statusFilter) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = [
          work.title,
          work.fingerprint,
          work.isrc ?? "",
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
      filtered.sort((a, b) => (a.work.status ?? "").localeCompare(b.work.status ?? ""));
    if (sortKey === "activity")
      filtered.sort(
        (a, b) =>
          new Date(b.activity.when).getTime() - new Date(a.activity.when).getTime(),
      );
    return filtered;
  }, [works, q, statusFilter, sortKey]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catálogo</h1>
          <p className="text-sm text-muted-foreground">
            Cada obra recibe un CSTID permanente que representa su historia completa.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Nueva obra
            </Button>
          </DialogTrigger>
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
                createWork.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="w-title">Título *</Label>
                <Input id="w-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="w-genre">Género</Label>
                  <Input id="w-genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-bpm">BPM</Label>
                  <Input id="w-bpm" type="number" min={1} value={bpm} onChange={(e) => setBpm(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-key">Tonalidad</Label>
                  <Input id="w-key" placeholder="Ej: Am" value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="w-isrc">ISRC</Label>
                  <Input id="w-isrc" placeholder="Opcional" value={isrc} onChange={(e) => setIsrc(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-iswc">ISWC</Label>
                  <Input id="w-iswc" placeholder="Opcional" value={iswc} onChange={(e) => setIswc(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createWork.isPending}>
                {createWork.isPending ? "Creando…" : "Crear obra"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <CSVImport />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, artista, CSTID o ISRC"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos los estados</SelectItem>
              {WORK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Artista</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>ISRC</TableHead>
              <TableHead className="hidden sm:table-cell">Duración</TableHead>
              <TableHead className="hidden sm:table-cell">Género</TableHead>
              <TableHead className="hidden md:table-cell">Actividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map(({ work: w, artist, durationMin, activity }) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-secondary">
                        {w.cover_path && coverMap?.[w.cover_path] ? (
                          <img
                            src={coverMap[w.cover_path]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
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
                    <Badge className={STATUS_CLASSES[w.status] ?? ""}>
                      {STATUS_LABELS[w.status] ?? w.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {w.isrc ? (
                      <span className="font-mono text-xs">{w.isrc}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendiente</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {formatDuration(durationMin)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {w.genre ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-sm">{activity.label}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(activity.when)}</p>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tu catálogo está vacío. Crea tu primera obra para generar su CSTID.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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
      const { data: existing } = await supabase
        .from("works")
        .select("title, isrc");
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
            Columnas soportadas: title, isrc, iswc, genre, bpm, key, status. Se omiten títulos e ISRC duplicados.
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
