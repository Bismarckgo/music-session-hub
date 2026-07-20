import { createServerFn } from "@tanstack/react-start";

/**
 * Public MLC search stub. The MLC exposes a public work-search endpoint on
 * their portal (portal.themlc.com) but not a stable public JSON API for
 * third parties. This adapter is intentionally simple: it returns whatever
 * matches we can heuristically fetch and gracefully degrades to no results.
 * When an official API becomes available, only this file changes.
 */
export const searchMLC = createServerFn({ method: "POST" })
  .inputValidator((input: { iswc?: string | null; title?: string | null }) => input)
  .handler(async ({ data }) => {
    const iswc = (data.iswc ?? "").replace(/[^A-Z0-9]/gi, "");
    const title = (data.title ?? "").trim();
    if (!iswc && !title) return { results: [] as Array<Record<string, string>> };

    // Placeholder implementation — returns an empty list. Kept as a real
    // async fn so the UI wires up cleanly and future implementations can
    // add a fetch() call here without any UI changes.
    return {
      results: [] as Array<{ title: string; iswc?: string; writers?: string; source: string }>,
      queried: { iswc, title },
      note: "Búsqueda en The MLC pendiente de API oficial. La arquitectura está lista para conectar.",
    };
  });