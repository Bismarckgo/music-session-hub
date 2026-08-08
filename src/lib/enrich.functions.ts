import { createServerFn } from "@tanstack/react-start";
import {
  appleSearch,
  deezerByISRC,
  mbByISRC,
  mbByTitle,
  type EnrichCandidate,
} from "./adapters/public-sources";

/**
 * Fase 5 — Enriquecimiento desde fuentes públicas.
 * Combina MusicBrainz + Apple Music + Deezer y devuelve candidatos normalizados.
 * Degrada con gracia: si una fuente falla, se devuelven las demás.
 */
export const enrichWork = createServerFn({ method: "POST" })
  .inputValidator((input: { isrc?: string | null; title?: string | null; artist?: string | null }) => ({
    isrc: (input.isrc ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase(),
    title: (input.title ?? "").trim(),
    artist: (input.artist ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const jobs: Array<Promise<EnrichCandidate[]>> = [];
    if (data.isrc) {
      jobs.push(mbByISRC(data.isrc));
      jobs.push(deezerByISRC(data.isrc));
    }
    if (data.title) {
      jobs.push(mbByTitle(data.title, data.artist || null));
      jobs.push(appleSearch([data.title, data.artist].filter(Boolean).join(" ")));
    }
    if (jobs.length === 0) return { candidates: [] as EnrichCandidate[] };

    const settled = await Promise.allSettled(jobs);
    const candidates = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));

    const suggested = {
      iswc: candidates.find((c) => c.iswc)?.iswc ?? null,
      isrc: candidates.find((c) => c.isrc)?.isrc ?? null,
      genre: candidates.find((c) => c.genre)?.genre ?? null,
      releaseDate: candidates.find((c) => c.releaseDate)?.releaseDate ?? null,
      coverUrl: candidates.find((c) => c.coverUrl)?.coverUrl ?? null,
      durationSec: candidates.find((c) => c.durationSec)?.durationSec ?? null,
      artist: candidates.find((c) => c.artist)?.artist ?? null,
      album: candidates.find((c) => c.album)?.album ?? null,
    };

    return { candidates, suggested };
  });
