import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, Download, Search, FileText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { type Work, type Collaborator } from "@/lib/catalog";
import {
  PUBLISHING_PLATFORMS,
  REGISTRATION_STATUSES,
  STATUS_LABELS,
  STATUS_CLASSES,
  EXPORTERS,
  downloadExport,
  validateWorkForPublishing,
  canExport,
  relevantPlatforms,
  type PublishingProfile,
  type WorkRegistration,
  type RegistrationStatus,
  type PublishingPlatform,
} from "@/lib/publishing";
import { searchMLC } from "@/lib/mlc.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/publishing")({
  component: PublishingPage,
});

type WorkWithCollabs = Work & { collaborators: Collaborator[] };

function PublishingPage() {
  const qc = useQueryClient();
  const mlcFn = useServerFn(searchMLC);

  const { data: profile } = useQuery({
    queryKey: ["publishing_profile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("publishing_profiles" as never)
        .select("*")
        .maybeSingle();
      return (data as PublishingProfile | null) ?? null;
    },
  });

  const { data: works } = useQuery({
    queryKey: ["works", "publishing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*, collaborators(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as WorkWithCollabs[];
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ["work_registrations"],
    queryFn: async () => {
      const { data } = await supabase.from("work_registrations" as never).select("*");
      return (data as WorkRegistration[] | null) ?? [];
    },
  });

  const regMap = useMemo(() => {
    const m = new Map<string, WorkRegistration>();
    for (const r of registrations ?? []) m.set(`${r.work_id}:${r.platform}`, r);
    return m;
  }, [registrations]);

  const platforms = useMemo(
    () => relevantPlatforms(profile?.publishing_type),
    [profile?.publishing_type],
  );

  const [selected, setSelected] = useState<WorkWithCollabs | null>(null);
  const [mlcOpen, setMlcOpen] = useState(false);
  const [mlcResults, setMlcResults] = useState<{ note?: string; results: unknown[] } | null>(null);

  const statusMut = useMutation({
    mutationFn: async (v: { work_id: string; platform: PublishingPlatform; status: RegistrationStatus }) => {
      const existing = regMap.get(`${v.work_id}:${v.platform}`);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No auth");
      if (existing) {
        await supabase
          .from("work_registrations" as never)
          .update({ status: v.status, last_checked: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("work_registrations" as never).insert({
          user_id: u.user.id,
          work_id: v.work_id,
          platform: v.platform,
          status: v.status,
          last_checked: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_registrations"] }),
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-bold">Publishing Hub</h1>
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">
              Antes de usar Publishing Hub, configura tu perfil de publishing en{" "}
              <a href="/configuracion" className="text-primary underline">
                Configuración
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Publishing Hub</h1>
          <p className="text-sm text-muted-foreground">
            Prepara y sigue el registro de tus obras en las principales plataformas de publishing.
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Modo: <span className="font-semibold text-foreground">{profile.publishing_type}</span></p>
          {profile.pro && <p>PRO: {profile.pro}</p>}
          {profile.publisher_name && <p>Publisher: {profile.publisher_name}</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Obras y estado por plataforma</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Obra</th>
                <th className="px-3 py-3 text-left">Validación</th>
                {platforms.map((p) => (
                  <th key={p} className="px-3 py-3 text-left">{p}</th>
                ))}
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(works ?? []).map((w) => {
                const issues = validateWorkForPublishing(w, w.collaborators);
                const errors = issues.filter((i) => i.level === "error");
                const warns = issues.filter((i) => i.level === "warning");
                const ok = canExport(issues);
                return (
                  <tr key={w.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{w.fingerprint}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {ok ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-xs">
                          {errors.length}E · {warns.length}W
                        </span>
                      </div>
                    </td>
                    {platforms.map((p) => {
                      const reg = regMap.get(`${w.id}:${p}`);
                      const status = (reg?.status ?? "no_configurado") as RegistrationStatus;
                      return (
                        <td key={p} className="px-3 py-3">
                          <Select
                            value={status}
                            onValueChange={(v) =>
                              statusMut.mutate({
                                work_id: w.id,
                                platform: p,
                                status: v as RegistrationStatus,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-[130px] text-xs">
                              <Badge className={`${STATUS_CLASSES[status]} font-normal`}>
                                {STATUS_LABELS[status]}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {REGISTRATION_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(w)}>
                        <FileText className="mr-1 h-3 w-3" /> Exportar
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {(works ?? []).length === 0 && (
                <tr>
                  <td colSpan={platforms.length + 3} className="p-8 text-center text-sm text-muted-foreground">
                    No hay obras aún. Crea una desde el Catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportar «{selected?.title}»</DialogTitle>
            <DialogDescription>
              Se valida la obra antes de exportar. Solo se puede exportar sin errores críticos.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <ExportPanel
              work={selected}
              collaborators={selected.collaborators}
              profile={profile}
              onMLC={async () => {
                const res = await mlcFn({ data: { iswc: selected.iswc, title: selected.title } });
                setMlcResults(res as { note?: string; results: unknown[] });
                setMlcOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={mlcOpen} onOpenChange={setMlcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Búsqueda en The MLC</DialogTitle>
          </DialogHeader>
          <div className="text-sm">
            {mlcResults?.results?.length ? (
              <ul className="space-y-2">
                {(mlcResults.results as Array<Record<string, string>>).map((r, i) => (
                  <li key={i} className="rounded border p-2 text-xs">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(r, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Sin resultados. {mlcResults?.note}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMlcOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExportPanel({
  work,
  collaborators,
  profile,
  onMLC,
}: {
  work: Work;
  collaborators: Collaborator[];
  profile: PublishingProfile;
  onMLC: () => Promise<void>;
}) {
  const issues = validateWorkForPublishing(work, collaborators);
  const ok = canExport(issues);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {issues.length === 0 ? (
          <p className="text-xs text-primary">Sin observaciones.</p>
        ) : (
          issues.map((i, k) => (
            <div
              key={k}
              className={`flex items-start gap-2 text-xs ${i.level === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{i.message}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {EXPORTERS.map((ex) => (
          <Button
            key={ex.id}
            size="sm"
            disabled={!ok}
            onClick={() => {
              downloadExport({ work, collaborators, profile }, ex);
              toast.success(`Exportado ${ex.label}`);
            }}
          >
            <Download className="mr-1 h-3 w-3" />
            {ex.label}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={onMLC}>
          <Search className="mr-1 h-3 w-3" /> Buscar en The MLC
        </Button>
      </div>
      {!ok && (
        <p className="text-xs text-destructive">
          Corrige los errores antes de exportar.
        </p>
      )}
    </div>
  );
}

// Silence unused-import linter for Input (kept for future filter UI)
void Input;