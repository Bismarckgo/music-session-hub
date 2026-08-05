import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, BookOpen, HardDriveDownload, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  PUBLISHING_TYPES,
  PUBLISHING_TYPE_LABELS,
  type PublishingProfile,
  type PublishingType,
} from "@/lib/publishing";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: ConfiguracionPage,
});

const PROS = ["ASCAP", "BMI", "SESAC", "Ninguno"] as const;

const sb = supabase as unknown as {
  from: (t: string) => {
    select: (q?: string) => { maybeSingle: () => Promise<{ data: unknown }> };
    upsert: (v: unknown, o?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

function ConfiguracionPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setUserId(data.user?.id ?? "");
    });
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["publishing_profile"],
    queryFn: async () => {
      const { data } = await sb.from("publishing_profiles").select("*").maybeSingle();
      return (data as PublishingProfile | null) ?? null;
    },
  });

  const [form, setForm] = useState<Partial<PublishingProfile>>({});
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No auth");
      const payload = {
        user_id: u.user.id,
        publishing_type: form.publishing_type ?? "SelfAdmin",
        pro: form.pro || null,
        publisher_name: form.publisher_name || null,
        publisher_ipi: form.publisher_ipi || null,
        writer_ipi: form.writer_ipi || null,
      };
      const { error } = await sb
        .from("publishing_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Perfil de publishing guardado");
      qc.invalidateQueries({ queryKey: ["publishing_profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes de tu cuenta y preferencias del sistema.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-medium">{email || "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Perfil de Publishing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>¿Quién administra tu publishing?</Label>
            <Select
              value={form.publishing_type ?? "SelfAdmin"}
              onValueChange={(v) => setForm((f) => ({ ...f, publishing_type: v as PublishingType }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PUBLISHING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{PUBLISHING_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>¿Ya perteneces a un PRO?</Label>
            <Select
              value={form.pro ?? "Ninguno"}
              onValueChange={(v) => setForm((f) => ({ ...f, pro: v === "Ninguno" ? null : v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Nombre del Publisher</Label>
              <Input
                value={form.publisher_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, publisher_name: e.target.value }))}
                placeholder="Ej. My Publishing LLC"
              />
            </div>
            <div className="grid gap-2">
              <Label>IPI del Publisher</Label>
              <Input
                value={form.publisher_ipi ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, publisher_ipi: e.target.value }))}
                placeholder="9–11 dígitos"
              />
            </div>
            <div className="grid gap-2 col-span-2">
              <Label>IPI del escritor (opcional)</Label>
              <Input
                value={form.writer_ipi ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, writer_ipi: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>

          {form.publishing_type === "Songtrust" || form.publishing_type === "Sentric" ? (
            <p className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">
              CST no intentará registrar tus obras en The MLC ni en PROs — {form.publishing_type} las administra.
              Solo se mantendrá el estado interno sincronizado.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre CSTID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            El CSTID es el identificador permanente de una Obra Musical. Nace en el primer archivo
            creado en el DAW y acompaña a la obra durante todo su ciclo de vida.
          </p>
          <p>
            El título, colaboradores, splits y metadata pueden cambiar. El CSTID nunca cambia.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <HardDriveDownload className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">DAW Watcher (app de escritorio)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            La app de escritorio observa tus carpetas de proyectos (Ableton, Logic, FL Studio, Pro
            Tools, Cubase, Reaper, Studio One, Bitwig) y registra automáticamente cuándo se detecta
            un proyecto, se guarda una sesión o se exporta un bounce. Si no hay internet, los
            eventos se guardan en disco y se sincronizan al reconectar.
          </p>
          <div className="grid gap-2">
            <Label>Tu ID de usuario (para el watcher)</Label>
            <div className="flex gap-2">
              <Input readOnly value={userId} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(userId);
                  toast.success("ID copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Cómo activarlo</p>
            <p>
              1. Abre la app de escritorio una vez. Se crea el archivo{" "}
              <code className="font-mono">cst-watcher.json</code> en la carpeta de datos de CST.
            </p>
            <p>
              2. Pega ahí tu <code className="font-mono">userId</code> y el secreto de ingesta, y
              ajusta la lista <code className="font-mono">folders</code> con tus carpetas de
              proyectos.
            </p>
            <p>3. Reinicia la app: los eventos aparecerán en Actividad y en el timeline de cada obra.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}