import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Coins, Upload, Link2, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { emit } from "@/lib/mie/events";
import { formatDate, type Work } from "@/lib/catalog";
import {
  MATCH_METHOD_LABELS,
  ROYALTY_SOURCES,
  buildMatchIndex,
  formatMoney,
  matchLine,
  parseRoyaltyCSV,
  type RoyaltyLine,
  type RoyaltyReport,
  type WorkVersion,
} from "@/lib/releases";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/regalias")({
  head: () => ({
    meta: [
      { title: "Regalías conciliadas por ISRC | CST" },
      {
        name: "description",
        content:
          "Sube reportes de regalías en CSV y CST los concilia con tu catálogo por ISRC, versión o título para ver ingresos por obra.",
      },
      { property: "og:title", content: "Regalías conciliadas por ISRC | CST" },
      {
        property: "og:description",
        content: "Importa reportes de tu distribuidora y ve cuánto genera cada obra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Regalias,
});

function Regalias() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string>("DistroKid");

  const { data: works } = useQuery({
    queryKey: ["works", "regalias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("works").select("*");
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

  const { data: reports } = useQuery({
    queryKey: ["royalty_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("royalty_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RoyaltyReport[];
    },
  });

  const { data: lines } = useQuery({
    queryKey: ["royalty_lines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("royalty_lines")
        .select("*")
        .order("amount", { ascending: false });
      if (error) throw error;
      return data as RoyaltyLine[];
    },
  });

  const importReport = useMutation({
    mutationFn: async (file: File) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const userId = userData.user.id;

      const parsed = parseRoyaltyCSV(await file.text());
      if (!parsed.length) throw new Error("No se encontraron filas con ISRC o título");

      const index = buildMatchIndex(works ?? [], versions ?? []);
      const matched = parsed.map((l) => ({ line: l, match: matchLine(l, index) }));
      const total = parsed.reduce((a, l) => a + l.amount, 0);
      const matchedCount = matched.filter((m) => m.match.work_id).length;
      const currency = parsed[0].currency || "USD";

      const { data: report, error: repErr } = await supabase
        .from("royalty_reports")
        .insert({
          user_id: userId,
          source,
          currency,
          file_name: file.name,
          total_amount: Math.round(total * 100) / 100,
          line_count: parsed.length,
          matched_count: matchedCount,
        })
        .select()
        .single();
      if (repErr) throw repErr;

      const rows = matched.map((m) => ({
        user_id: userId,
        report_id: report.id,
        work_id: m.match.work_id,
        version_id: m.match.version_id,
        isrc: m.line.isrc,
        title: m.line.title,
        artist: m.line.artist,
        platform: m.line.platform,
        territory: m.line.territory,
        units: m.line.units,
        amount: m.line.amount,
        currency: m.line.currency,
        match_method: m.match.match_method,
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("royalty_lines").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }

      const workIds = [...new Set(matched.map((m) => m.match.work_id).filter(Boolean))] as string[];
      for (const wid of workIds) {
        const sum = matched
          .filter((m) => m.match.work_id === wid)
          .reduce((a, m) => a + m.line.amount, 0);
        await emit({
          type: "RoyaltyImported",
          work_id: wid,
          actor: "mie",
          payload: {
            report_id: report.id,
            source,
            amount: Math.round(sum * 100) / 100,
            currency,
          },
        });
      }

      return { total: parsed.length, matchedCount };
    },
    onSuccess: (r) => {
      toast.success(`${r.matchedCount} de ${r.total} líneas conciliadas`);
      queryClient.invalidateQueries({ queryKey: ["royalty_reports"] });
      queryClient.invalidateQueries({ queryKey: ["royalty_lines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: async ({ line, workId }: { line: RoyaltyLine; workId: string }) => {
      const { error } = await supabase
        .from("royalty_lines")
        .update({ work_id: workId, match_method: "manual" })
        .eq("id", line.id);
      if (error) throw error;
      await emit({
        type: "RoyaltyMatched",
        work_id: workId,
        payload: { isrc: line.isrc, amount: Number(line.amount), currency: line.currency },
      });
    },
    onSuccess: () => {
      toast.success("Línea conciliada");
      queryClient.invalidateQueries({ queryKey: ["royalty_lines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("royalty_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["royalty_reports"] });
      queryClient.invalidateQueries({ queryKey: ["royalty_lines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allLines = lines ?? [];
  const currency = allLines[0]?.currency ?? "USD";

  const perWork = useMemo(() => {
    const map = new Map<string, { amount: number; units: number }>();
    for (const l of allLines) {
      if (!l.work_id) continue;
      const prev = map.get(l.work_id) ?? { amount: 0, units: 0 };
      map.set(l.work_id, {
        amount: prev.amount + Number(l.amount),
        units: prev.units + Number(l.units),
      });
    }
    return [...map.entries()]
      .map(([workId, v]) => ({
        work: (works ?? []).find((w) => w.id === workId),
        ...v,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [allLines, works]);

  const unmatched = allLines.filter((l) => !l.work_id);
  const totalAmount = allLines.reduce((a, l) => a + Number(l.amount), 0);
  const unmatchedAmount = unmatched.reduce((a, l) => a + Number(l.amount), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Coins className="h-6 w-6 text-primary" /> Regalías
          </h1>
          <p className="text-sm text-muted-foreground">
            Sube el CSV de tu distribuidora o PRO. El motor concilia cada línea con tu catálogo por
            ISRC de obra, ISRC de versión o título.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROYALTY_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importReport.mutate(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={importReport.isPending}>
            <Upload className="mr-1 h-4 w-4" />
            {importReport.isPending ? "Procesando…" : "Importar CSV"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos importados" value={formatMoney(totalAmount, currency)} />
        <StatCard label="Obras con ingresos" value={String(perWork.length)} />
        <StatCard
          label="Sin conciliar"
          value={`${unmatched.length} · ${formatMoney(unmatchedAmount, currency)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingresos por obra</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perWork.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    Todavía no hay regalías importadas.
                  </TableCell>
                </TableRow>
              ) : (
                perWork.map((r) => (
                  <TableRow key={r.work?.id ?? Math.random()}>
                    <TableCell>
                      {r.work ? (
                        <Link
                          to="/obras/$id"
                          params={{ id: r.work.id }}
                          className="font-medium hover:text-primary"
                        >
                          {r.work.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Obra eliminada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {Math.round(r.units).toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatMoney(r.amount, currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {unmatched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Líneas sin conciliar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unmatched.slice(0, 30).map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.title ?? "Sin título"}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {l.isrc ?? "sin ISRC"} · {l.platform ?? "—"} ·{" "}
                    {formatMoney(Number(l.amount), l.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select onValueChange={(v) => assign.mutate({ line: l, workId: v })}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Vincular a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {(works ?? []).map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {unmatched.length > 30 && (
              <p className="text-xs text-muted-foreground">
                Mostrando 30 de {unmatched.length} líneas sin conciliar.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reportes importados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(reports ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin reportes todavía. Acepta CSV de DistroKid, TuneCore, The MLC y similares.
            </p>
          ) : (
            (reports ?? []).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.source} · {r.file_name ?? "CSV"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(r.created_at)} · {r.line_count} líneas ·{" "}
                    {formatMoney(Number(r.total_amount), r.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {r.matched_count}/{r.line_count} conciliadas
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Eliminar reporte"
                    onClick={() => removeReport.mutate(r.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))
          )}
          <p className="pt-1 text-xs text-muted-foreground">
            Métodos de conciliación: {Object.values(MATCH_METHOD_LABELS).join(", ")}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
