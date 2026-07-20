import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Hash, Plus, Trash2, Users, Disc3, FileText, FileDown, Upload, Image as ImageIcon, ExternalLink, Radio, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { fetchDeezerCoverByISRC } from "@/lib/deezer.functions";

import { supabase } from "@/integrations/supabase/client";
import {
  CHANNELS,
  CHANNEL_URL_PATTERNS,
  DAWS,
  DISTRIBUTORS,
  DIST_STATUSES,
  DIST_STATUS_LABELS,
  PROS,
  ROLES,
  STATUS_LABELS,
  WORK_STATUSES,
  formatDate,
  type Collaborator,
  type Contact,
  type StudioSession,
  type Work,
} from "@/lib/catalog";
import { useCoverUrl } from "@/hooks/use-cover-urls";
import { downloadSplitCSV, openCreditsPDF } from "@/lib/exports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/obras/$id")({
  component: ObraDetail,
});

function ObraDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: work, isLoading } = useQuery({
    queryKey: ["works", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("works").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Work;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("work_id", id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as StudioSession[];
    },
  });

  const { data: collaborators } = useQuery({
    queryKey: ["collaborators", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborators")
        .select("*")
        .eq("work_id", id)
        .order("created_at");
      if (error) throw error;
      return data as Collaborator[];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const updateWork = useMutation({
    mutationFn: async (patch: Partial<Work>) => {
      const { error } = await supabase.from("works").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
    },
    onError: () => toast.error("No se pudo actualizar la obra"),
  });

  const copyCstid = () => {
    if (!work) return;
    navigator.clipboard.writeText(work.fingerprint);
    toast.success("CSTID copiado");
  };

  if (isLoading || !work) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando obra…</div>;
  }

  const totalSplit = (collaborators ?? []).reduce((acc, c) => acc + Number(c.split_percent), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link to="/catalogo" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <CoverThumb work={work} onUpdate={(patch) => updateWork.mutate(patch)} />
          <div>
            <h1 className="text-2xl font-bold">{work.title}</h1>
            <button
              onClick={copyCstid}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 font-mono text-xs transition-colors hover:bg-accent"
            >
              <Hash className="h-3.5 w-3.5 text-primary" />
              {work.fingerprint}
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSplitCSV(work, collaborators ?? [])}
          >
            <FileDown className="mr-1 h-4 w-4" /> Split sheet CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openCreditsPDF(work, collaborators ?? [])}
          >
            <FileText className="mr-1 h-4 w-4" /> Crédito PDF
          </Button>
          <div className="w-44">
          <Select
            value={work.status}
            onValueChange={(v) => updateWork.mutate({ status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MetadataCard work={work} onUpdate={(patch) => updateWork.mutate(patch)} />

        <ChannelsCard work={work} onUpdate={(patch) => updateWork.mutate(patch)} />

        <DistributionCard work={work} onUpdate={(patch) => updateWork.mutate(patch)} />

        <CollaboratorsCard
          workId={id}
          collaborators={collaborators ?? []}
          contacts={contacts ?? []}
          totalSplit={totalSplit}
        />
        <SessionsCard workId={id} sessions={sessions ?? []} />
      </div>
    </div>
  );
}

function CoverThumb({
  work,
  onUpdate,
}: {
  work: Work;
  onUpdate: (patch: Partial<Work>) => void;
}) {
  const url = useCoverUrl(work.cover_path);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const deezerFn = useServerFn(fetchDeezerCoverByISRC);
  const autoTriedRef = useRef<string | null>(null);

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userData.user.id}/${work.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      if (work.cover_path) {
        await supabase.storage.from("covers").remove([work.cover_path]);
      }
      onUpdate({ cover_path: path });
      queryClient.invalidateQueries({ queryKey: ["cover-urls"] });
      toast.success("Carátula actualizada");
    } catch (e) {
      toast.error("No se pudo subir la carátula");
    } finally {
      setUploading(false);
    }
  };

  const fetchFromDeezer = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!work.isrc) {
      if (!silent) toast.error("Añade el ISRC primero para buscar el cover art");
      return;
    }
    setFetching(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const result = await deezerFn({ data: { isrc: work.isrc } });
      const bin = atob(result.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: result.contentType });
      const ext = result.contentType.includes("png") ? "png" : "jpg";
      const path = `${userData.user.id}/${work.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, blob, { upsert: true, contentType: result.contentType });
      if (error) throw error;
      if (work.cover_path) {
        await supabase.storage.from("covers").remove([work.cover_path]);
      }
      onUpdate({ cover_path: path });
      queryClient.invalidateQueries({ queryKey: ["cover-urls"] });
      toast.success(
        result.artist && result.album
          ? `Cover art encontrado: ${result.artist} — ${result.album}`
          : "Cover art importado",
      );
    } catch (e) {
      if (!silent) {
        toast.error(e instanceof Error ? e.message : "No se pudo obtener el cover art");
      }
    } finally {
      setFetching(false);
    }
  };

  // Búsqueda automática al detectar un ISRC sin carátula todavía.
  useEffect(() => {
    if (!work.isrc) return;
    if (work.cover_path) return;
    if (fetching) return;
    if (autoTriedRef.current === work.isrc) return;
    autoTriedRef.current = work.isrc;
    fetchFromDeezer({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work.isrc, work.cover_path]);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-20 w-20 overflow-hidden rounded-lg border bg-secondary"
        title="Cambiar carátula"
      >
        {url ? (
          <img src={url} alt={`Carátula de ${work.title}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? (
            <span className="text-[10px] font-medium text-white">Subiendo…</span>
          ) : (
            <Upload className="h-5 w-5 text-white" />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => fetchFromDeezer()}
        disabled={fetching || !work.isrc}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        title={work.isrc ? "Buscar cover art por ISRC" : "Añade el ISRC primero"}
      >
        <Sparkles className="h-3 w-3" />
        {fetching ? "Buscando…" : "Buscar cover art"}
      </button>
    </div>
  );
}

function ChannelsCard({
  work,
  onUpdate,
}: {
  work: Work;
  onUpdate: (patch: Partial<Work>) => void;
}) {
  const links = (work.channel_links ?? {}) as Record<string, string>;
  const [drafts, setDrafts] = useState<Record<string, string>>(links);

  const commit = (ch: string, value: string) => {
    const next = { ...links };
    if (value.trim()) next[ch] = value.trim();
    else delete next[ch];
    if ((links[ch] ?? "") !== (next[ch] ?? "")) onUpdate({ channel_links: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visibilidad en canales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHANNELS.map((ch) => {
          const active = work.channels.includes(ch);
          const url = drafts[ch] ?? "";
          return (
            <div key={ch} className="space-y-1.5 rounded-lg border px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{ch}</span>
                <div className="flex items-center gap-2">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      title="Abrir"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Switch
                    checked={active}
                    onCheckedChange={(checked) =>
                      onUpdate({
                        channels: checked
                          ? [...work.channels, ch]
                          : work.channels.filter((c) => c !== ch),
                      })
                    }
                  />
                </div>
              </div>
              <Input
                value={url}
                placeholder={CHANNEL_URL_PATTERNS[ch] ?? "https://…"}
                onChange={(e) => setDrafts({ ...drafts, [ch]: e.target.value })}
                onBlur={(e) => commit(ch, e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DistributionCard({
  work,
  onUpdate,
}: {
  work: Work;
  onUpdate: (patch: Partial<Work>) => void;
}) {
  const [distUrl, setDistUrl] = useState(work.distributor_url ?? "");
  const distName = work.distributor_name ?? "";
  const preset = DISTRIBUTORS.find((d) => d.name === distName);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="h-4 w-4 text-primary" /> Distribución
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Distribuidora</Label>
            <Select
              value={distName || "__none"}
              onValueChange={(v) =>
                onUpdate({ distributor_name: v === "__none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {DISTRIBUTORS.map((d) => (
                  <SelectItem key={d.name} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <Select
              value={work.distribution_status}
              onValueChange={(v) => onUpdate({ distribution_status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DIST_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Link del release</Label>
          <div className="flex gap-2">
            <Input
              value={distUrl}
              placeholder="https://…"
              onChange={(e) => setDistUrl(e.target.value)}
              onBlur={() => {
                if ((work.distributor_url ?? "") !== distUrl)
                  onUpdate({ distributor_url: distUrl || null });
              }}
            />
            {distUrl && (
              <Button variant="outline" size="icon" asChild>
                <a href={distUrl} target="_blank" rel="noreferrer" aria-label="Abrir">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
        {preset?.url && (
          <a
            href={preset.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Abrir {preset.name} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function MetadataCard({
  work,
  onUpdate,
}: {
  work: Work;
  onUpdate: (patch: Partial<Work>) => void;
}) {
  const [isrc, setIsrc] = useState(work.isrc ?? "");
  const [iswc, setIswc] = useState(work.iswc ?? "");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <MetaField label="Género" value={work.genre ?? "—"} />
          <MetaField label="BPM" value={work.bpm != null ? String(work.bpm) : "—"} />
          <MetaField label="Tonalidad" value={work.musical_key ?? "—"} />
          <MetaField label="Creada" value={formatDate(work.created_at)} />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-isrc" className="text-xs">ISRC</Label>
            <Input
              id="m-isrc"
              value={isrc}
              placeholder="Opcional"
              onChange={(e) => setIsrc(e.target.value)}
              onBlur={() => {
                if ((work.isrc ?? "") !== isrc) onUpdate({ isrc: isrc || null });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-iswc" className="text-xs">ISWC</Label>
            <Input
              id="m-iswc"
              value={iswc}
              placeholder="Opcional"
              onChange={(e) => setIswc(e.target.value)}
              onBlur={() => {
                if ((work.iswc ?? "") !== iswc) onUpdate({ iswc: iswc || null });
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CollaboratorsCard({
  workId,
  collaborators,
  contacts,
  totalSplit,
}: {
  workId: string;
  collaborators: Collaborator[];
  contacts: Contact[];
  totalSplit: number;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>("__new");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(ROLES[0]);
  const [split, setSplit] = useState("");
  const [ipi, setIpi] = useState("");
  const [pro, setPro] = useState("");
  const [publisher, setPublisher] = useState("");

  const pickContact = (id: string) => {
    setContactId(id);
    if (id === "__new") {
      setName("");
      setIpi("");
      setPro("");
      setPublisher("");
      return;
    }
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    setName(c.name);
    if (c.default_role) setRole(c.default_role);
    setIpi(c.ipi ?? "");
    setPro(c.pro ?? "");
    setPublisher(c.publisher ?? "");
  };

  const reset = () => {
    setContactId("__new");
    setName("");
    setSplit("");
    setIpi("");
    setPro("");
    setPublisher("");
  };

  const addCollaborator = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");

      let resolvedContactId: string | null =
        contactId !== "__new" ? contactId : null;

      // Create a reusable contact when the user types a new name
      if (contactId === "__new" && name.trim()) {
        const { data: newContact, error: cErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userData.user.id,
            name: name.trim(),
            default_role: role,
            ipi: ipi || null,
            pro: pro || null,
            publisher: publisher || null,
          })
          .select()
          .single();
        if (cErr) throw cErr;
        resolvedContactId = newContact.id;
      }

      const { error } = await supabase.from("collaborators").insert({
        work_id: workId,
        user_id: userData.user.id,
        contact_id: resolvedContactId,
        name,
        role,
        split_percent: split ? Number(split) : 0,
        ipi: ipi || null,
        pro: pro || null,
        publisher: publisher || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", workId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setOpen(false);
      reset();
      toast.success("Colaborador agregado");
    },
    onError: () => toast.error("No se pudo agregar el colaborador"),
  });

  const removeCollaborator = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from("collaborators").delete().eq("id", cid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", workId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" /> Créditos y splits
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar crédito</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addCollaborator.mutate();
              }}
            >
              {contacts.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Contacto</Label>
                  <Select value={contactId} onValueChange={pickContact}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new">+ Nuevo contacto</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.default_role ? ` · ${c.default_role}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Nombre *</Label>
                <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-split">Split (%)</Label>
                  <Input
                    id="c-split"
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={split}
                    onChange={(e) => setSplit(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-ipi">IPI</Label>
                  <Input id="c-ipi" value={ipi} onChange={(e) => setIpi(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>PRO</Label>
                  <Select value={pro} onValueChange={setPro}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-publisher">Publisher</Label>
                <Input
                  id="c-publisher"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={addCollaborator.isPending}>
                Agregar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {collaborators.length > 0 ? (
          <>
            <ul className="space-y-2">
              {collaborators.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.role}
                      {c.pro ? ` · ${c.pro}` : ""}
                      {c.publisher ? ` · ${c.publisher}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{Number(c.split_percent)}%</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCollaborator.mutate(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total de splits</span>
                <span className={totalSplit === 100 ? "font-medium text-primary" : "font-medium text-destructive"}>
                  {totalSplit}%
                </span>
              </div>
              <Progress value={Math.min(totalSplit, 100)} />
              {totalSplit !== 100 && (
                <p className="text-xs text-destructive">Los splits deberían sumar 100%</p>
              )}
            </div>
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Registra quiénes participan y su porcentaje desde el inicio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsCard({ workId, sessions }: { workId: string; sessions: StudioSession[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [daw, setDaw] = useState<string>(DAWS[0]);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const addSession = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const { error } = await supabase.from("sessions").insert({
        work_id: workId,
        user_id: userData.user.id,
        daw,
        duration_minutes: duration ? Number(duration) : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", workId] });
      queryClient.invalidateQueries({ queryKey: ["sessions", "all"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setOpen(false);
      setDuration("");
      setNotes("");
      toast.success("Sesión registrada");
    },
    onError: () => toast.error("No se pudo registrar la sesión"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Disc3 className="h-4 w-4 text-primary" /> Sesiones de estudio
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar sesión</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addSession.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>DAW</Label>
                  <Select value={daw} onValueChange={setDaw}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAWS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-duration">Duración (min)</Label>
                  <Input
                    id="s-duration"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-notes">Notas</Label>
                <Textarea
                  id="s-notes"
                  rows={3}
                  placeholder="Qué se trabajó en esta sesión…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={addSession.isPending}>
                Registrar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sessions.length > 0 ? (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.daw ?? "Sesión"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.started_at)}
                    {s.duration_minutes != null && ` · ${s.duration_minutes} min`}
                  </span>
                </div>
                {s.notes && <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no hay sesiones registradas para esta obra.
          </p>
        )}
      </CardContent>
    </Card>
  );
}