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