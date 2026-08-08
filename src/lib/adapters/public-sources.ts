// Fase 5 — Adaptadores de fuentes públicas (server-only helpers).
// Solo lectura, sin claves privadas: MusicBrainz, Apple/iTunes, Deezer.

const UA = "CST-CreditSessionTrack/1.0 ( https://creditsessiontrack.app )";

export type EnrichCandidate = {
  source: "MusicBrainz" | "Apple Music" | "Deezer" | "Discogs";
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  isrc?: string | null;
  iswc?: string | null;
  writers?: string[];
  genre?: string | null;
  releaseDate?: string | null;
  coverUrl?: string | null;
  url?: string | null;
  durationSec?: number | null;
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── MusicBrainz ────────────────────────────────────────────────────────────
type MbRecording = {
  id: string;
  title?: string;
  length?: number;
  "artist-credit"?: Array<{ name?: string }>;
  releases?: Array<{ title?: string; date?: string; id?: string }>;
  relations?: Array<{ work?: { id?: string; title?: string; iswcs?: string[] } }>;
};

export async function mbByISRC(isrc: string): Promise<EnrichCandidate[]> {
  const data = await getJson<{ recordings?: MbRecording[] }>(
    `https://musicbrainz.org/ws/2/recording?query=isrc:${encodeURIComponent(isrc)}&inc=artist-credits+releases+work-rels&fmt=json&limit=5`,
  );
  return (data?.recordings ?? []).map((r) => toCandidate(r, isrc));
}

export async function mbByTitle(title: string, artist?: string | null): Promise<EnrichCandidate[]> {
  const q = artist ? `recording:"${title}" AND artist:"${artist}"` : `recording:"${title}"`;
  const data = await getJson<{ recordings?: MbRecording[] }>(
    `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(q)}&inc=artist-credits+releases&fmt=json&limit=5`,
  );
  return (data?.recordings ?? []).map((r) => toCandidate(r, null));
}

function toCandidate(r: MbRecording, isrc: string | null): EnrichCandidate {
  const work = r.relations?.find((rel) => rel.work)?.work;
  return {
    source: "MusicBrainz",
    title: r.title ?? null,
    artist: r["artist-credit"]?.map((a) => a.name).filter(Boolean).join(", ") || null,
    album: r.releases?.[0]?.title ?? null,
    releaseDate: r.releases?.[0]?.date ?? null,
    isrc,
    iswc: work?.iswcs?.[0] ?? null,
    durationSec: r.length ? Math.round(r.length / 1000) : null,
    url: `https://musicbrainz.org/recording/${r.id}`,
  };
}

export type MbWorkResult = {
  id: string;
  title: string;
  iswc: string | null;
  writers: string[];
  url: string;
};

/** Búsqueda de obras (composiciones) por ISWC o título — base para el matching MLC. */
export async function mbWorkSearch(opts: { iswc?: string; title?: string }): Promise<MbWorkResult[]> {
  const q = opts.iswc ? `iswc:${opts.iswc}` : `work:"${opts.title ?? ""}"`;
  const data = await getJson<{
    works?: Array<{
      id: string;
      title?: string;
      iswcs?: string[];
      relations?: Array<{ type?: string; artist?: { name?: string } }>;
    }>;
  }>(
    `https://musicbrainz.org/ws/2/work?query=${encodeURIComponent(q)}&inc=artist-rels&fmt=json&limit=10`,
  );
  return (data?.works ?? []).map((w) => ({
    id: w.id,
    title: w.title ?? "",
    iswc: w.iswcs?.[0] ?? null,
    writers: (w.relations ?? [])
      .filter((r) => /compos|lyric|writer/i.test(r.type ?? ""))
      .map((r) => r.artist?.name ?? "")
      .filter(Boolean),
    url: `https://musicbrainz.org/work/${w.id}`,
  }));
}

// ── Apple Music / iTunes Search (público) ──────────────────────────────────
export async function appleSearch(term: string): Promise<EnrichCandidate[]> {
  const data = await getJson<{
    results?: Array<{
      trackName?: string;
      artistName?: string;
      collectionName?: string;
      primaryGenreName?: string;
      releaseDate?: string;
      artworkUrl100?: string;
      trackViewUrl?: string;
      trackTimeMillis?: number;
    }>;
  }>(`https://itunes.apple.com/search?media=music&entity=song&limit=5&term=${encodeURIComponent(term)}`);
  return (data?.results ?? []).map((t) => ({
    source: "Apple Music" as const,
    title: t.trackName ?? null,
    artist: t.artistName ?? null,
    album: t.collectionName ?? null,
    genre: t.primaryGenreName ?? null,
    releaseDate: t.releaseDate ? t.releaseDate.slice(0, 10) : null,
    coverUrl: t.artworkUrl100 ? t.artworkUrl100.replace("100x100", "1200x1200") : null,
    url: t.trackViewUrl ?? null,
    durationSec: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
  }));
}

// ── Deezer (público) ───────────────────────────────────────────────────────
export async function deezerByISRC(isrc: string): Promise<EnrichCandidate[]> {
  const t = await getJson<{
    error?: unknown;
    title?: string;
    link?: string;
    duration?: number;
    release_date?: string;
    artist?: { name?: string };
    album?: { title?: string; cover_xl?: string };
  }>(`https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`);
  if (!t || t.error) return [];
  return [
    {
      source: "Deezer",
      title: t.title ?? null,
      artist: t.artist?.name ?? null,
      album: t.album?.title ?? null,
      isrc,
      coverUrl: t.album?.cover_xl ?? null,
      url: t.link ?? null,
      releaseDate: t.release_date ?? null,
      durationSec: t.duration ?? null,
    },
  ];
}
