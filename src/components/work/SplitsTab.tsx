import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { z } from "zod";

import { updateCompositionShare, type CompositionShare } from "@/lib/data/compositions";
import { artistShareTotal, type RecordingShare } from "@/lib/data/recordings";
import { round2, shareTotal } from "@/lib/cst-status";
import { StatusPill } from "@/components/CstStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const shareSchema = z.object({
  writer_share: z.coerce
    .number({ invalid_type_error: "Introduce un número" })
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
});

type ShareForm = z.infer<typeof shareSchema>;

export function SplitsTab({
  workId,
  compositionId,
  shares,
  recordingShares,
}: {
  workId: string;
  compositionId: string | null;
  shares: CompositionShare[];
  recordingShares: RecordingShare[];
}) {
  const active = shares.filter((s) => s.is_active);
  const assigned = shareTotal(active);
  const remaining = round2(100 - assigned);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Splits de composición</CardTitle>
          <StatusPill
            state={assigned === 100 ? "complete" : active.length === 0 ? "none" : "attention"}
            label={active.length === 0 ? "Sin datos" : `${assigned}% asignado`}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Asignado</span>
              <span className="font-mono font-medium">{assigned}%</span>
            </div>
            <Progress value={Math.min(assigned, 100)} />
            <p
              className={
                assigned === 100
                  ? "text-xs text-muted-foreground"
                  : "text-xs font-medium text-destructive"
              }
            >
              {active.length === 0
                ? "Todavía no hay participantes con porcentaje asignado."
                : assigned === 100
                  ? "Los splits suman 100%."
                  : remaining > 0
                    ? `Restante ${remaining}% por asignar.`
                    : `Exceso de ${round2(-remaining)}%: los splits superan el 100%.`}
            </p>
          </div>

          {active.length > 0 ? (
            <ul className="space-y-3">
              {active.map((s) => (
                <ShareRow key={s.id} share={s} workId={workId} compositionId={compositionId} />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Esta obra no tiene shares de composición registrados.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Splits de grabación</CardTitle>
          {recordingShares.length > 0 && (
            <StatusPill
              state={round2(artistShareTotal(recordingShares)) === 100 ? "complete" : "attention"}
              label={`${round2(artistShareTotal(recordingShares))}% asignado`}
            />
          )}
        </CardHeader>
        <CardContent>
          {recordingShares.length > 0 ? (
            <ul className="space-y-3">
              {recordingShares
                .filter((s) => s.is_active)
                .map((s) => (
                  <li key={s.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.name ?? "—"}</span>
                      <span className="font-mono">{round2(Number(s.artist_share ?? 0))}%</span>
                    </div>
                    <Progress value={Math.min(Number(s.artist_share ?? 0), 100)} />
                    <p className="text-xs text-muted-foreground">
                      {s.role}
                      {Number(s.producer_points ?? 0) > 0
                        ? ` · ${round2(Number(s.producer_points))} puntos de productor`
                        : ""}
                    </p>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay splits de grabación registrados para esta obra.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ShareRow({
  share,
  workId,
  compositionId,
}: {
  share: CompositionShare;
  workId: string;
  compositionId: string | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const form = useForm<ShareForm>({
    resolver: zodResolver(shareSchema),
    mode: "onChange",
    defaultValues: { writer_share: Number(share.writer_share ?? 0) },
  });

  const save = useMutation({
    mutationFn: (values: ShareForm) =>
      updateCompositionShare(share.id, { writer_share: values.writer_share }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composition_shares", compositionId] });
      queryClient.invalidateQueries({ queryKey: ["works", workId] });
      queryClient.invalidateQueries({ queryKey: ["works", "catalog"] });
      setEditing(false);
      toast.success("Split actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el split"),
  });

  const value = Number(share.writer_share ?? 0);
  const error = form.formState.errors.writer_share?.message;

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{share.name ?? "—"}</span>
        {editing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
          >
            <Input
              type="number"
              step="0.01"
              min={0}
              max={100}
              className="h-8 w-24 font-mono"
              autoFocus
              aria-label={`Split de ${share.name ?? "participante"}`}
              {...form.register("writer_share")}
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={save.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                form.reset({ writer_share: value });
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono transition-colors hover:bg-secondary"
            title="Editar porcentaje"
          >
            {round2(value)}%
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      <Progress value={Math.min(value, 100)} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {share.role}
          {share.territory ? ` · ${share.territory}` : ""}
        </p>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    </li>
  );
}
