import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Album, Plus, Trash2, Music2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { emit } from "@/lib/mie/events";
import { formatDate, type Work } from "@/lib/catalog";
import {
  RELEASE_STATUSES,
  RELEASE_STATUS_CLASSES,
  RELEASE_STATUS_LABELS,
  RELEASE_TYPES,
  RELEASE_TYPE_LABELS,
  VERSION_TYPE_LABELS,
  type Release,
  type ReleaseTrack,
  type WorkVersion,
} from "@/lib/releases";
import { DISTRIBUTORS } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/releases")({
  head: () => ({
    meta: [
      { title: "Releases y versiones | CST" },
      {
        name: "description",
        content:
          "Organiza singles, EPs y álbumes de tu catálogo con sus versiones, ISRC y UPC en Credit Session Track.",
      },
      { property: "og:title", content: "Releases y versiones | CST" },
      {
        property: "og:description",
        content: "Construye releases desde tu catálogo y mantén cada versión con su ISRC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Releases,
});

function Releases() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: releases, isLoading } = useQuery({
    queryKey: ["releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Release[];
    },
  });

  const { data: works } = useQuery({
    queryKey: ["works", "releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return data as Work[];
    },
  });

  const { data: versions } = useQuery({
    queryKey: ["work_versions", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_versions").select("*");
      if (error) throw error;
      return data as WorkVersion[];
    },
  });

  const { data: tracks } = useQuery({
    queryKey: ["release_tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_tracks")
        .select("*")
        .order("track_no", { ascending: true });
      if (error) throw error;
      return data as ReleaseTrack[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ release, status }: { release: Release; status: string }) => {
      const { error } = await supabase.from("releases").update({ status }).eq("id", release.id);
      if (error) throw error;
      if (status === "released") {
        const rows = (tracks ?? []).filter((t) => t.release_id === release.id);
        for (const t of rows) {
          await emit({
            type: "ReleasePublished",
            work_id: t.work_id,
            payload: { release_id: release.id, title: release.title, upc: release.upc },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      toast.success("Estado actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRelease = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("releases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["release_tracks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = releases ?? [];
  const current = list.find((r) => r.id === selected) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Album className="h-6 w-6 text-primary" /> Releases
          </h1>
          <p className="text-sm text-muted-foreground">
            Agrupa tus obras en singles, EPs y álbumes. Los tracks reutilizan la metadata del
            catálogo: nunca la escribes dos veces.
          </p>
        </div>
        <NewReleaseDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tus releases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : list.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay releases. Crea el primero para preparar tu lanzamiento.
              </p>
            ) : (
              list.map((r) => {
                const count = (tracks ?? []).filter((t) => t.release_id === r.id).length;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent ${
                      selected === r.id ? "border-primary bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{r.title}</span>
                      <Badge className={RELEASE_STATUS_CLASSES[r.status] ?? ""}>
                        {RELEASE_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {RELEASE_TYPE_LABELS[r.release_type] ?? r.release_type} · {count} track
                      {count === 1 ? "" : "s"}
                      {r.release_date ? ` · ${formatDate(r.release_date)}` : ""}
                    </p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {current ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">{current.title}</CardTitle>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {current.upc ? `UPC ${current.upc}` : "sin UPC"}
                  {current.distributor ? ` · ${current.distributor}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={current.status}
                  onValueChange={(v) => setStatus.mutate({ release: current, status: v })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELEASE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {RELEASE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Eliminar release"
                  onClick={() => removeRelease.mutate(current.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <TrackList
                release={current}
                tracks={(tracks ?? []).filter((t) => t.release_id === current.id)}
                works={works ?? []}
                versions={versions ?? []}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex h-full min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">
              Selecciona un release para gestionar su tracklist.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NewReleaseDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("single");
  const [date, setDate] = useState("");
  const [upc, setUpc] = useState("");
  const [distributor, setDistributor] = useState<string>("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      if (!title.trim()) throw new Error("El título es obligatorio");
      const { data, error } = await supabase
        .from("releases")
        .insert({
          user_id: userData.user.id,
          title: title.trim(),
          release_type: type,
          release_date: date || null,
          upc: upc.trim() || null,
          distributor: distributor || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Release;
    },
    onSuccess: () => {
      toast.success("Release creado");
      setOpen(false);
      setTitle("");
      setUpc("");
      setDate("");
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Nuevo release
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo release</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELEASE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {RELEASE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de lanzamiento</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>UPC</Label>
              <Input value={upc} onChange={(e) => setUpc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Distribuidora</Label>
              <Select value={distributor} onValueChange={setDistributor}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRIBUTORS.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrackList({
  release,
  tracks,
  works,
  versions,
}: {
  release: Release;
  tracks: ReleaseTrack[];
  works: Work[];
  versions: WorkVersion[];
}) {
  const queryClient = useQueryClient();
  const [workId, setWorkId] = useState<string>("");
  const [versionId, setVersionId] = useState<string>("none");

  const workVersions = useMemo(
    () => versions.filter((v) => v.work_id === workId),
    [versions, workId],
  );

  const addTrack = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      if (!workId) throw new Error("Elige una obra");
      const work = works.find((w) => w.id === workId);
      const version = versions.find((v) => v.id === versionId);
      const { error } = await supabase.from("release_tracks").insert({
        user_id: userData.user.id,
        release_id: release.id,
        work_id: workId,
        version_id: versionId === "none" ? null : versionId,
        track_no: tracks.length + 1,
        isrc: version?.isrc ?? work?.isrc ?? null,
      });
      if (error) throw error;
      await emit({
        type: "ReleaseTrackAdded",
        work_id: workId,
        payload: { release_id: release.id, release_title: release.title },
      });
    },
    onSuccess: () => {
      setWorkId("");
      setVersionId("none");
      queryClient.invalidateQueries({ queryKey: ["release_tracks"] });
      toast.success("Track agregado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("release_tracks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["release_tracks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {tracks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Este release aún no tiene tracks.
          </p>
        ) : (
          tracks.map((t) => {
            const work = works.find((w) => w.id === t.work_id);
            const version = versions.find((v) => v.id === t.version_id);
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs text-muted-foreground">{t.track_no}</span>
                    {work ? (
                      <Link
                        to="/obras/$id"
                        params={{ id: work.id }}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {work.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Obra eliminada</span>
                    )}
                    {version && (
                      <Badge variant="secondary">
                        {VERSION_TYPE_LABELS[version.version_type] ?? version.version_type}
                      </Badge>
                    )}
                  </div>
                  <p className="pl-7 font-mono text-[11px] text-muted-foreground">
                    {t.isrc ?? "sin ISRC"}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Quitar track"
                  onClick={() => removeTrack.mutate(t.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label>Obra</Label>
          <Select value={workId} onValueChange={setWorkId}>
            <SelectTrigger>
              <SelectValue placeholder="Elegir del catálogo" />
            </SelectTrigger>
            <SelectContent>
              {works.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px] space-y-1.5">
          <Label>Versión</Label>
          <Select value={versionId} onValueChange={setVersionId} disabled={!workId}>
            <SelectTrigger>
              <SelectValue placeholder="Principal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Principal</SelectItem>
              {workVersions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => addTrack.mutate()} disabled={addTrack.isPending}>
          <Music2 className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </div>
    </div>
  );
}
