import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/catalog";
import { deriveWorkState } from "@/lib/mie/reducer";
import { WORK_STATE_LABELS, type MieEvent } from "@/lib/mie/types";

const EVENT_LABELS: Record<string, string> = {
  WorkCreated: "Obra creada",
  SessionStarted: "Sesión iniciada",
  SessionEnded: "Sesión finalizada",
  CollaboratorAdded: "Colaborador agregado",
  CoverAttached: "Carátula adjuntada",
  IdentifiersSet: "Identificadores actualizados",
  RegistrationSubmitted: "Registro enviado",
  DistributionPublished: "Distribución publicada",
};

export function MieTimelineCard({ workId }: { workId: string }) {
  const { data: events } = useQuery({
    queryKey: ["mie_events", workId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mie_events")
        .select("*")
        .eq("work_id", workId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data as unknown as MieEvent[];
    },
  });

  const list = events ?? [];
  const state = deriveWorkState(list);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" /> Timeline MIE
        </CardTitle>
        <Badge variant="secondary">Estado: {WORK_STATE_LABELS[state]}</Badge>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            El motor todavía no ha registrado eventos para esta obra.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l pl-4">
            {list.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">
                    {EVENT_LABELS[e.type] ?? e.type}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(e.occurred_at)}
                  </span>
                </div>
                {e.actor !== "user" && (
                  <p className="text-xs text-muted-foreground">actor: {e.actor}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}