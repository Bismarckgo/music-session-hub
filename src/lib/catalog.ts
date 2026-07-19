import type { Tables } from "@/integrations/supabase/types";

export type Work = Tables<"works">;
export type StudioSession = Tables<"sessions">;
export type Collaborator = Tables<"collaborators">;
export type Contact = Tables<"contacts">;

export const WORK_STATUSES = ["en_progreso", "mezcla", "master", "publicado"] as const;

export const STATUS_LABELS: Record<string, string> = {
  en_progreso: "En progreso",
  mezcla: "Mezcla",
  master: "Master",
  publicado: "Publicado",
};

export const STATUS_CLASSES: Record<string, string> = {
  en_progreso: "bg-secondary text-secondary-foreground",
  mezcla: "bg-accent text-accent-foreground",
  master: "bg-accent text-accent-foreground",
  publicado: "bg-primary text-primary-foreground",
};

export const CHANNELS = [
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Deezer",
  "Tidal",
  "Amazon Music",
] as const;

export const CHANNEL_URL_PATTERNS: Record<string, string> = {
  Spotify: "https://open.spotify.com/track/…",
  "Apple Music": "https://music.apple.com/…",
  "YouTube Music": "https://music.youtube.com/watch?v=…",
  Deezer: "https://www.deezer.com/track/…",
  Tidal: "https://tidal.com/browse/track/…",
  "Amazon Music": "https://music.amazon.com/albums/…",
};

export const DISTRIBUTORS = [
  { name: "DistroKid", url: "https://distrokid.com/" },
  { name: "TuneCore", url: "https://www.tunecore.com/" },
  { name: "CD Baby", url: "https://cdbaby.com/" },
  { name: "Amuse", url: "https://amuse.io/" },
  { name: "Ditto Music", url: "https://dittomusic.com/" },
  { name: "ONErpm", url: "https://onerpm.com/" },
  { name: "Symphonic", url: "https://symphonic.com/" },
  { name: "United Masters", url: "https://unitedmasters.com/" },
  { name: "Otra", url: "" },
];

export const DIST_STATUSES = [
  "sin_distribuir",
  "borrador",
  "enviado",
  "publicado",
] as const;

export const DIST_STATUS_LABELS: Record<string, string> = {
  sin_distribuir: "Sin distribuir",
  borrador: "Borrador",
  enviado: "Enviado",
  publicado: "Publicado",
};

export const DIST_STATUS_CLASSES: Record<string, string> = {
  sin_distribuir: "bg-secondary text-secondary-foreground",
  borrador: "bg-secondary text-secondary-foreground",
  enviado: "bg-accent text-accent-foreground",
  publicado: "bg-primary text-primary-foreground",
};

export const ROLES = [
  "Artista principal",
  "Featuring",
  "Compositor",
  "Productor",
  "Beatmaker",
  "Ingeniero de mezcla",
  "Ingeniero de master",
  "Publisher",
  "Músico de sesión",
] as const;

export const PROS = [
  "ASCAP",
  "BMI",
  "SESAC",
  "SGAE",
  "SACM",
  "SADAIC",
  "SOCAN",
  "PRS",
  "GEMA",
  "SUISA",
  "Otra",
] as const;

export const DAWS = [
  "Ableton Live",
  "FL Studio",
  "Logic Pro",
  "Pro Tools",
  "Cubase",
  "Studio One",
  "Reaper",
  "Otro",
] as const;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}