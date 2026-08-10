import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { NotebookPen, Wand2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/lib/catalog";
import { parseSessionNotes } from "@/lib/mie/nlp.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type ParsedCredit = {
  name: string;
  role: string;
  confidence: number;
  matched_contact_id?: string | null;
  matched_name?: string | null;
};

export function SessionNotesCard() {
  const [notes, setNotes] = useState("");
  const [credits, setCredits] = useState<ParsedCredit[] | null>(null);
  const [meta, setMeta] = useState<{ bpm: number | null; key: string | null; source: string } | null>(
    null,
  );
  const parse = useServerFn(parseSessionNotes);

  const { data: contacts } = useQuery({
    queryKey: ["contacts", "nlp"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name");
      if (error) throw error;
      return data as Pick<Contact, "id" | "name">[];
    },
  });

  const run = useMutation({
    mutationFn: async () => {
      return parse({ data: { notes, contacts: contacts ?? [] } });
    },
    onSuccess: (res) => {
      setCredits(res.credits);
      setMeta({ bpm: res.bpm, key: res.musical_key, source: res.source });
      if (res.credits.length === 0) toast.info("No se detectaron créditos en las notas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="h-4 w-4 text-primary" /> Notas de sesión → créditos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pega las notas de la sesión en texto libre. El motor extrae personas, roles y metadata, y
          las cruza con tus contactos existentes.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={"Ej. Sesión del martes en el estudio, 92 bpm, tono Am.\nProdujo Luis Vega, letra de Ana Ruiz y mezcló Carlos M."}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {meta ? `Fuente: ${meta.source === "model" ? "modelo" : "heurística local"}` : " "}
          </p>
          <Button
            size="sm"
            onClick={() => run.mutate()}
            disabled={run.isPending || notes.trim().length < 5}
          >
            <Wand2 className="mr-1 h-3.5 w-3.5" /> Extraer créditos
          </Button>
        </div>

        {meta && (meta.bpm || meta.key) ? (
          <div className="flex gap-2">
            {meta.bpm ? <Badge variant="outline">{meta.bpm} BPM</Badge> : null}
            {meta.key ? <Badge variant="outline">Tono {meta.key}</Badge> : null}
          </div>
        ) : null}

        {credits && credits.length > 0 ? (
          <ul className="space-y-2">
            {credits.map((c, i) => (
              <li
                key={`${c.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.role}
                    {c.matched_name ? ` · coincide con ${c.matched_name}` : " · contacto nuevo"}
                  </p>
                </div>
                <Badge variant={c.confidence >= 0.7 ? "secondary" : "outline"}>
                  {Math.round(c.confidence * 100)}%
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}