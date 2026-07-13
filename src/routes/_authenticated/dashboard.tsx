import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Library,
  Disc3,
  Users,
  Plus,
  Hash,
  AlertCircle,
  ArrowRight,
  Activity,
  Percent,
  ClipboardList,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  formatDate,
  type Work,
  type Collaborator,
  type StudioSession,
} from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type WorkWithCollabs = Work & { collaborators: Collaborator[] };

function computeIntegrity(w: WorkWithCollabs, lastSession: StudioSession | undefined) {
  const checks = [
    Boolean(w.title),
    Boolean(w.genre),
    Boolean(w.bpm),
    Boolean(w.musical_key),
    Boolean(w.isrc),
    Boolean(w.iswc),
    w.collaborators.some((c) => c.role === "Artista principal"),
    w.collaborators.length > 0,
    Math.round(
      w.collaborators.reduce((a, c) => a + Number(c.split_percent), 0),
    ) === 100,
    Boolean(lastSession),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function pendingReasons(w: WorkWithCollabs) {
  const reasons: string[] = [];
  const hasArtist = w.collaborators.some((c) => c.role === "Artista principal");
  if (!hasArtist) reasons.push("Artista principal faltante");
  const sum = w.collaborators.reduce((a, c) => a + Number(c.split_percent), 0);
  if (w.collaborators.length === 0) reasons.push("Sin colaboradores");
  else if (Math.round(sum) !== 100) reasons.push(`Split ${sum}% (debe ser 100%)`);
  if (!w.isrc) reasons.push("ISRC pendiente");
  if (!w.iswc) reasons.push("ISWC pendiente");
  const noPub = w.collaborators.some((c) => !c.publisher);
  if (w.collaborators.length > 0 && noPub) reasons.push("Publisher faltante");
  return reasons;
}

function Dashboard() {
  const { data: works } = useQuery({
    queryKey: ["works", "with-collabs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*, collaborators(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as WorkWithCollabs[];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as StudioSession[];
    },
  });

  const lastSessionByWork = new Map<string, StudioSession>();
  for (const s of sessions ?? []) {
    if (!lastSessionByWork.has(s.work_id)) lastSessionByWork.set(s.work_id, s);
  }

  const worksList = works ?? [];
  const featured = worksList[0];
  const featuredArtist = featured?.collaborators.find((c) => c.role === "Artista principal");
  const featuredIntegrity = featured
    ? computeIntegrity(featured, lastSessionByWork.get(featured.id))
    : 0;

  const attention = worksList
    .map((w) => ({ work: w, reasons: pendingReasons(w) }))
    .filter((x) => x.reasons.length > 0)
    .slice(0, 5);

  const recent = worksList.slice(0, 6);

  const totalPending = worksList.reduce((a, w) => a + (pendingReasons(w).length > 0 ? 1 : 0), 0);
  const activeWorks = worksList.filter(
    (w) => w.status !== "publicado",
  ).length;
  const sessionsCount = sessions?.length ?? 0;
  const releasesReady = worksList.filter((w) => w.status === "master" || w.status === "publicado").length;

  const quickIndicators = [
    { label: "Obras activas", value: activeWorks, to: "/catalogo", icon: Library },
    { label: "Pendientes", value: totalPending, to: "/catalogo", icon: AlertCircle },
    { label: "Sesiones registradas", value: sessionsCount, to: "/sesiones", icon: Disc3 },
    { label: "Registros listos", value: releasesReady, to: "/registros", icon: ClipboardList },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel</h1>
          <p className="text-sm text-muted-foreground">
            ¿Qué toca ahora? Continúa donde lo dejaste o resuelve un pendiente.
          </p>
        </div>
        <Button asChild>
          <Link to="/catalogo" search={{ nueva: true }}>
            <Plus className="mr-1 h-4 w-4" /> Nueva obra
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Continuar obra
            </CardTitle>
          </CardHeader>
          <CardContent>
            {featured ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xl font-bold">{featured.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {featuredArtist?.name ?? "Artista principal pendiente"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_CLASSES[featured.status] ?? ""}>
                        {STATUS_LABELS[featured.status] ?? featured.status}
                      </Badge>
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-mono text-xs">
                        <Hash className="h-3 w-3 text-primary" /> {featured.fingerprint}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Última sesión ·{" "}
                        {lastSessionByWork.get(featured.id)
                          ? formatDate(lastSessionByWork.get(featured.id)!.started_at)
                          : "Sin sesiones"}
                      </span>
                    </div>
                  </div>
                  <Button asChild>
                    <Link to="/obras/$id" params={{ id: featured.id }}>
                      Continuar obra <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Integridad</span>
                    <span>{featuredIntegrity}%</span>
                  </div>
                  <Progress value={featuredIntegrity} />
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Aún no hay obras. Crea la primera para comenzar a documentar su historia.
                </p>
                <Button asChild className="mt-3">
                  <Link to="/catalogo" search={{ nueva: true }}>
                    <Plus className="mr-1 h-4 w-4" /> Nueva obra
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Requiere tu atención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attention.length > 0 ? (
              attention.map(({ work, reasons }) => (
                <Link
                  key={work.id}
                  to="/obras/$id"
                  params={{ id: work.id }}
                  className="block rounded-lg border px-3 py-2 transition-colors hover:bg-secondary/60"
                >
                  <p className="truncate text-sm font-medium">{work.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {reasons[0]}
                    {reasons.length > 1 ? ` · +${reasons.length - 1}` : ""}
                  </p>
                </Link>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Todo al día. Nada requiere tu atención ahora.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickIndicators.map((q) => (
          <Link key={q.label} to={q.to}>
            <Card className="transition-colors hover:bg-secondary/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {q.label}
                </CardTitle>
                <q.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{q.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Obras recientes
            </CardTitle>
            <Link to="/catalogo" className="text-xs text-primary hover:underline">
              Ver catálogo
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length > 0 ? (
              <ul className="divide-y">
                {recent.map((w) => (
                  <li key={w.id}>
                    <Link
                      to="/obras/$id"
                      params={{ id: w.id }}
                      className="flex items-center justify-between gap-3 py-2 transition-colors hover:bg-secondary/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{w.title}</p>
                        <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <Hash className="h-3 w-3" /> {w.fingerprint}
                        </p>
                      </div>
                      <Badge className={STATUS_CLASSES[w.status] ?? ""}>
                        {STATUS_LABELS[w.status] ?? w.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Aún no hay obras registradas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actividad reciente
            </CardTitle>
            <Link to="/actividad" className="text-xs text-primary hover:underline">
              Ver actividad
            </Link>
          </CardHeader>
          <CardContent>
            <RecentActivity works={worksList} sessions={sessions ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type Event = { id: string; when: string; text: string };

function RecentActivity({
  works,
  sessions,
}: {
  works: WorkWithCollabs[];
  sessions: StudioSession[];
}) {
  const events: Event[] = [];
  const workById = new Map(works.map((w) => [w.id, w]));
  for (const w of works) {
    events.push({ id: `w-${w.id}`, when: w.created_at, text: `Obra "${w.title}" creada` });
    for (const c of w.collaborators) {
      events.push({
        id: `c-${c.id}`,
        when: c.created_at,
        text: `${c.name} agregado como ${c.role} en "${w.title}"`,
      });
    }
  }
  for (const s of sessions) {
    const t = workById.get(s.work_id)?.title ?? "una obra";
    events.push({
      id: `s-${s.id}`,
      when: s.started_at,
      text: `Nueva sesión ${s.daw ? `(${s.daw}) ` : ""}en "${t}"`,
    });
  }
  events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  const top = events.slice(0, 6);
  if (top.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">Sin actividad todavía.</p>;
  }
  return (
    <ul className="space-y-2">
      {top.map((e) => (
        <li key={e.id} className="flex items-start gap-2 text-sm">
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate">{e.text}</p>
            <p className="text-xs text-muted-foreground">{formatDate(e.when)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
