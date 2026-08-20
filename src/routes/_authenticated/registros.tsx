import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock } from "lucide-react";

import { listRegistrations, registrationBucket } from "@/lib/data/registrations";
import { RegistrationsPanel } from "@/components/RegistrationsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/registros")({
  component: RegistrosPage,
});

function RegistrosPage() {
  const { data: registrations } = useQuery({
    queryKey: ["work_registrations", "all"],
    queryFn: listRegistrations,
  });

  const list = registrations ?? [];
  const summary = [
    { label: "Registros", value: list.length, icon: ClipboardList },
    {
      label: "Completos",
      value: list.filter((r) => registrationBucket(r.status) === "complete").length,
      icon: CheckCircle2,
    },
    {
      label: "Pendientes",
      value: list.filter((r) => registrationBucket(r.status) === "pending").length,
      icon: Clock,
    },
    {
      label: "Con atención",
      value: list.filter((r) => registrationBucket(r.status) === "attention").length,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Registros</h1>
        <p className="text-sm text-muted-foreground">
          Estado de cada obra en sus sistemas externos: PRO, mecánicos y administración editorial.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <RegistrationsPanel />
    </div>
  );
}
