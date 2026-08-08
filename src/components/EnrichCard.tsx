import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, RefreshCw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { enrichWork } from "@/lib/enrich.functions";
import { emit } from "@/lib/mie/events";
import type { Work } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Candidate = {
  source: string;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  isrc?: string | null;
  iswc?: string | null;
  genre?: string | null;
  releaseDate?: string | null;
  coverUrl?: string | null;
  url?: string | null;
  durationSec?: number | null;
};

type Suggested = {
  iswc: string | null;
  isrc: string | null;
  genre: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  durationSec: number | null;
  artist: string | null;
  album: string | null;
};

export function EnrichCard({
  work,
  onUpdate,
}: {
  work: Work;
  onUpdate: (patch: Partial<Work>) => void;
}) {
  const enrichFn = useServerFn(enrichWork);
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [suggested, setSuggested] = useState<Suggested | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await enrichFn({
        data: { isrc: work.isrc, title: work.title, artist: null },
      });
      setCandidates((res.candidates ?? []) as Candidate[]);
      setSuggested((res.suggested ?? null) as Suggested | null);
      if (!res.candidates?.length) toast.info("Sin coincidencias en fuentes públicas");
    } catch {
      toast.error("No se pudo consultar las fuentes públicas");
    } finally {
      setLoading(false);
    }
  };

  const applyIswc = async (iswc: string) => {
    onUpdate({ iswc });
    await emit({
      type: "IdentifiersSet",
      work_id: work.id,
      actor: "mie",
      payload: { isrc: work.isrc, iswc, source: "public_adapters" },
    });
    qc.invalidateQueries({ queryKey: ["mie_events", work.id] });
    toast.success("ISWC aplicado desde fuentes públicas");
  };

  const applyCover = async (url: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const res = await fetch(url);
      if (!res.ok) throw new Error("descarga");
      const blob = await res.blob();
      const path = `${userData.user.id}/${work.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
      if (error) throw error;
      onUpdate({ cover_path: path });
      await emit({ type: "CoverAttached", work_id: work.id, actor: "mie", payload: { source: "public_adapters" } });
      qc.invalidateQueries({ queryKey: ["cover-urls"] });
      toast.success("Carátula importada");
    } catch {
      toast.error("No se pudo importar la carátula");
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-primary" /> Fuentes públicas
        </CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Consultando…" : "Enriquecer metadata"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Cruza el ISRC y el título contra MusicBrainz, Apple Music y Deezer para completar
          identificadores, género, fecha de lanzamiento y carátula.
        </p>

        {suggested ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <SuggestionRow
              label="ISWC"
              value={suggested.iswc}
              current={work.iswc}
              onApply={suggested.iswc ? () => applyIswc(suggested.iswc!) : undefined}
            />
            <SuggestionRow
              label="Género"
              value={suggested.genre}
              current={work.genre}
              onApply={suggested.genre ? () => onUpdate({ genre: suggested.genre! }) : undefined}
            />
            <SuggestionRow label="Artista" value={suggested.artist} current={null} />
            <SuggestionRow label="Álbum" value={suggested.album} current={null} />
            <SuggestionRow label="Lanzamiento" value={suggested.releaseDate} current={null} />
            <SuggestionRow
              label="Duración"
              value={suggested.durationSec ? `${Math.floor(suggested.durationSec / 60)}:${String(suggested.durationSec % 60).padStart(2, "0")}` : null}
              current={null}
            />
            {suggested.coverUrl && !work.cover_path ? (
              <div className="sm:col-span-2">
                <Button size="sm" variant="secondary" onClick={() => applyCover(suggested.coverUrl!)}>
                  Importar carátula encontrada
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {candidates?.length ? (
          <div className="space-y-2">
            {candidates.map((c, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.title ?? "—"}</span>
                  <Badge variant="secondary">{c.source}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[c.artist, c.album, c.iswc ? `ISWC ${c.iswc}` : null, c.isrc ? `ISRC ${c.isrc}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Ver fuente
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SuggestionRow({
  label,
  value,
  current,
  onApply,
}: {
  label: string;
  value: string | null;
  current?: string | null;
  onApply?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-secondary/50 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate">{value ?? "—"}</p>
      </div>
      {value && onApply ? (
        current === value ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <Button size="sm" variant="ghost" onClick={onApply}>
            Aplicar
          </Button>
        )
      ) : null}
    </div>
  );
}
