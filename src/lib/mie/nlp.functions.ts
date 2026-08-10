import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ParsedCredit = {
  name: string;
  role: string;
  confidence: number;
  matched_contact_id?: string | null;
  matched_name?: string | null;
};

type ParseResult = {
  credits: ParsedCredit[];
  summary: string | null;
  bpm: number | null;
  musical_key: string | null;
  genre: string | null;
};

const ROLE_HINTS: Record<string, string[]> = {
  compositor: ["compos", "letra", "escrib", "songwriter", "topline"],
  productor: ["produc", "beat", "prod."],
  beatmaker: ["beatmaker", "beat maker", "instrumental"],
  ingeniero: ["ingenier", "mezcl", "mix", "master", "grab", "record"],
  interprete: ["cant", "voz", "vocal", "feat", "interpret", "guitarr", "bajo", "bater"],
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distancia de edición normalizada para matching difuso de nombres. */
function similarity(a: string, b: string): number {
  const s = normalize(a);
  const t = normalize(b);
  if (!s || !t) return 0;
  if (s === t) return 1;
  if (s.includes(t) || t.includes(s)) return 0.85;
  const m = s.length;
  const n = t.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1),
      );
    }
  }
  return Math.max(0, 1 - dp[m][n] / Math.max(m, n));
}

/** Heurística local: funciona incluso sin modelo disponible. */
function heuristicParse(notes: string): ParseResult {
  const credits: ParsedCredit[] = [];
  const lines = notes.split(/[\n;•]+/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[:\-–]/);
    const left = parts.length > 1 ? parts[0] : "";
    const right = parts.length > 1 ? parts.slice(1).join(" ") : line;
    const hay = normalize(line);
    let role: string | null = null;
    for (const [r, hints] of Object.entries(ROLE_HINTS)) {
      if (hints.some((h) => hay.includes(h))) {
        role = r;
        break;
      }
    }
    if (!role) continue;
    const namePart = normalize(left).length > 0 && !/[a-z]{3,}\s(de|por)\s/.test(hay) ? right : left;
    for (const candidate of namePart.split(/,| y | & /)) {
      const name = candidate.replace(/\(.*?\)/g, "").trim();
      if (name.length < 2 || name.length > 60) continue;
      if (Object.values(ROLE_HINTS).flat().some((h) => normalize(name).startsWith(h))) continue;
      credits.push({ name, role, confidence: 0.5 });
    }
  }
  const bpm = Number(notes.match(/(\d{2,3})\s?bpm/i)?.[1] ?? 0) || null;
  const key = notes.match(/\b(?:key|tono|tonalidad)\s*[:=]?\s*([A-G][#b]?m?)/i)?.[1] ?? null;
  return { credits, summary: null, bpm, musical_key: key, genre: null };
}

/**
 * MIE Fase 7 — NLP de notas de sesión.
 * Usa un modelo ligero para extraer créditos y metadata de texto libre y
 * hace matching difuso contra los contactos existentes. Degrada a heurística.
 */
export const parseSessionNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { notes: string; contacts?: { id: string; name: string }[] }) => ({
    notes: (input.notes ?? "").slice(0, 4000),
    contacts: (input.contacts ?? []).slice(0, 300),
  }))
  .handler(async ({ data }): Promise<ParseResult & { source: "model" | "heuristic" }> => {
    let result: ParseResult = heuristicParse(data.notes);
    let source: "model" | "heuristic" = "heuristic";

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey && data.notes.trim().length > 0) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "Extraes créditos musicales de notas de sesión en español o inglés. Responde SOLO JSON válido con la forma {\"credits\":[{\"name\":string,\"role\":\"compositor\"|\"productor\"|\"beatmaker\"|\"ingeniero\"|\"interprete\"|\"publisher\",\"confidence\":number}],\"summary\":string,\"bpm\":number|null,\"musical_key\":string|null,\"genre\":string|null}. No inventes personas que no aparezcan en el texto.",
              },
              { role: "user", content: data.notes },
            ],
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const text = json.choices?.[0]?.message?.content ?? "";
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]) as Partial<ParseResult>;
            if (Array.isArray(parsed.credits)) {
              result = {
                credits: parsed.credits
                  .filter((c) => c && typeof c.name === "string" && c.name.trim())
                  .map((c) => ({
                    name: c.name.trim(),
                    role: c.role || "interprete",
                    confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0.7)),
                  })),
                summary: parsed.summary ?? null,
                bpm: parsed.bpm ?? result.bpm,
                musical_key: parsed.musical_key ?? result.musical_key,
                genre: parsed.genre ?? null,
              };
              source = "model";
            }
          }
        }
      } catch {
        // se mantiene la heurística
      }
    }

    // Matching difuso contra contactos conocidos
    const credits = result.credits.map((c) => {
      let best: { id: string; name: string; score: number } | null = null;
      for (const contact of data.contacts) {
        const score = similarity(c.name, contact.name);
        if (score >= 0.72 && (!best || score > best.score)) {
          best = { id: contact.id, name: contact.name, score };
        }
      }
      return {
        ...c,
        matched_contact_id: best?.id ?? null,
        matched_name: best?.name ?? null,
        confidence: best ? Math.min(1, c.confidence + 0.2) : c.confidence,
      };
    });

    return { ...result, credits, source };
  });