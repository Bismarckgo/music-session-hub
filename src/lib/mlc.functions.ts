import { createServerFn } from "@tanstack/react-start";
import { mbWorkSearch } from "./adapters/public-sources";

/**
 * Búsqueda de composiciones para conciliar con The MLC.
 * The MLC no publica una API JSON estable para terceros, así que la
 * resolución se hace contra MusicBrainz (base pública de obras con ISWC)
 * y se devuelve además el enlace directo al portal público de The MLC.
 * Cuando exista API oficial, solo cambia este archivo.
 */
export const searchMLC = createServerFn({ method: "POST" })
  .inputValidator((input: { iswc?: string | null; title?: string | null }) => input)
  .handler(async ({ data }) => {
    const iswc = (data.iswc ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const title = (data.title ?? "").trim();
    if (!iswc && !title) return { results: [], portalUrl: null, note: null };

    const works = await mbWorkSearch(iswc ? { iswc } : { title });
    const portalUrl = `https://portal.themlc.com/search?searchTerm=${encodeURIComponent(iswc || title)}`;

    return {
      results: works.map((w) => ({
        title: w.title,
        iswc: w.iswc ?? undefined,
        writers: w.writers.join(", ") || undefined,
        url: w.url,
        source: "MusicBrainz",
      })),
      portalUrl,
      queried: { iswc, title },
      note: works.length
        ? "Coincidencias en la base pública de obras. Verifica en el portal de The MLC."
        : "Sin coincidencias públicas. Abre el portal de The MLC para confirmar manualmente.",
    };
  });
