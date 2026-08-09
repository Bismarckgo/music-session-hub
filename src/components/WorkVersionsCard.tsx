import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Disc3, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { emit } from "@/lib/mie/events";
import {
  VERSION_TYPES,
  VERSION_TYPE_LABELS,
  formatDuration,
  type WorkVersion,
} from "@/lib/releases";
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

export function WorkVersionsCard({ workId }: { workId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [versionType, setVersionType] = useState<string>("original");
  const [isrc, setIsrc] = useState("");
  const [duration, setDuration] = useState("");

  const { data: versions } = useQuery({
    queryKey: ["work_versions", workId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_versions")
        .select("*")
        .eq("work_id", workId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as WorkVersion[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const secs = duration.includes(":")
        ? duration.split(":").reduce((a, p) => a * 60 + Number(p || 0), 0)
        : Number(duration || 0);
      const { data, error } = await supabase
        .from("work_versions")
        .insert({
          user_id: userData.user.id,
          work_id: workId,
          name: name.trim() || VERSION_TYPE_LABELS[versionType],
          version_type: versionType,
          isrc: isrc.trim() || null,
          duration_sec: secs > 0 ? Math.round(secs) : null,
        })
        .select()
        .single();
      if (error) throw error;
      await emit({
        type: "VersionCreated",
        work_id: workId,
        payload: { version_id: data.id, name: data.name, version_type: data.version_type },
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Versión creada");
      setOpen(false);
      setName("");
      setIsrc("");
      setDuration("");
      setVersionType("original");
      queryClient.invalidateQueries({ queryKey: ["work_versions", workId] });
      queryClient.invalidateQueries({ queryKey: ["mie_events", workId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_versions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_versions", workId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = versions ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Disc3 className="h-4 w-4 text-primary" /> Versiones y masters
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-3.5 w-3.5" /> Versión
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva versión</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Remix de DJ Ana"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={versionType} onValueChange={setVersionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERSION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {VERSION_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>ISRC de esta versión</Label>
                  <Input
                    value={isrc}
                    onChange={(e) => setIsrc(e.target.value.toUpperCase())}
                    placeholder="USABC2500001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duración (mm:ss)</Label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="3:42"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                Crear versión
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Cada versión con ISRC propio se concilia por separado en las regalías.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {v.isrc ?? "sin ISRC"} · {formatDuration(v.duration_sec)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {VERSION_TYPE_LABELS[v.version_type] ?? v.version_type}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove.mutate(v.id)}
                    aria-label="Eliminar versión"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
