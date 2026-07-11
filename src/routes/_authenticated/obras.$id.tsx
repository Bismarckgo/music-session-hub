import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Fingerprint, Plus, Trash2, Users, Disc3 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  CHANNELS,
  DAWS,
  ROLES,
  STATUS_LABELS,
  WORK_STATUSES,
  formatDate,
  type Collaborator,
  type StudioSession,
  type Work,
} from "@/lib/catalog";
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

  const copyFingerprint = () => {
    if (!work) return;
    navigator.clipboard.writeText(work.fingerprint);
    toast.success("Fingerprint copiado");
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
        <div>
          <h1 className="text-2xl font-bold">{work.title}</h1>
          <button
            onClick={copyFingerprint}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 font-mono text-xs transition-colors hover:bg-accent"
          >
            <Fingerprint className="h-3.5 w-3.5 text-primary" />
            {work.fingerprint}
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <MetaField label="Género" value={work.genre ?? "—"} />
            <MetaField label="BPM" value={work.bpm != null ? String(work.bpm) : "—"} />
            <MetaField label="Tonalidad" value={work.musical_key ?? "—"} />
            <MetaField label="Creada" value={formatDate(work.created_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visibilidad en canales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {CHANNELS.map((ch) => {
              const active = work.channels.includes(ch);
              return (
                <div key={ch} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm">{ch}</span>
                  <Switch
                    checked={active}
                    onCheckedChange={(checked) =>
                      updateWork.mutate({
                        channels: checked
                          ? [...work.channels, ch]
                          : work.channels.filter((c) => c !== ch),
                      })
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <CollaboratorsCard workId={id} collaborators={collaborators ?? []} totalSplit={totalSplit} />
        <SessionsCard workId={id} sessions={sessions ?? []} />
      </div>
    </div>
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

function CollaboratorsCard({
  workId,
  collaborators,
  totalSplit,
}: {
  workId: string;
  collaborators: Collaborator[];
  totalSplit: number;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(ROLES[0]);
  const [split, setSplit] = useState("");

  const addCollaborator = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const { error } = await supabase.from("collaborators").insert({
        work_id: workId,
        user_id: userData.user.id,
        name,
        role,
        split_percent: split ? Number(split) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", workId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setOpen(false);
      setName("");
      setSplit("");
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
          <Users className="h-4 w-4 text-primary" /> Colaboradores y splits
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar colaborador</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addCollaborator.mutate();
              }}
            >
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
                    <p className="text-xs text-muted-foreground">{c.role}</p>
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