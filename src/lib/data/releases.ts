import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Recording } from "./recordings";

export type Release = Tables<"releases">;
export type ReleaseTrack = Tables<"release_tracks">;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sin sesión");
  return data.user.id;
}

export async function listReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from("releases")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRelease(id: string): Promise<Release | null> {
  const { data, error } = await supabase.from("releases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createRelease(
  input: Omit<TablesInsert<"releases">, "user_id">,
): Promise<Release> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from("releases")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRelease(
  id: string,
  patch: TablesUpdate<"releases">,
): Promise<Release> {
  const { data, error } = await supabase
    .from("releases")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRelease(id: string): Promise<void> {
  const { error } = await supabase.from("releases").delete().eq("id", id);
  if (error) throw error;
}

// ─── Tracks ────────────────────────────────────────────────────────────────
export async function listReleaseTracks(releaseId: string): Promise<ReleaseTrack[]> {
  const { data, error } = await supabase
    .from("release_tracks")
    .select("*")
    .eq("release_id", releaseId)
    .order("track_no", { ascending: true });
  if (error) throw error;
  return data;
}

export type ReleaseTrackWithRecording = ReleaseTrack & { recording: Recording | null };

/** Tracklist resuelta contra `recordings` (la grabación es la fuente del ISRC). */
export async function listReleaseTracksWithRecordings(
  releaseId: string,
): Promise<ReleaseTrackWithRecording[]> {
  const tracks = await listReleaseTracks(releaseId);
  const workIds = [...new Set(tracks.map((t) => t.work_id).filter(Boolean))];
  if (workIds.length === 0) return tracks.map((t) => ({ ...t, recording: null }));
  const { data, error } = await supabase.from("recordings").select("*").in("work_id", workIds);
  if (error) throw error;
  const byWork = new Map((data ?? []).map((r) => [r.work_id, r]));
  return tracks.map((t) => ({ ...t, recording: byWork.get(t.work_id) ?? null }));
}

export async function addReleaseTrack(
  input: Omit<TablesInsert<"release_tracks">, "user_id">,
): Promise<ReleaseTrack> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from("release_tracks")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReleaseTrack(
  id: string,
  patch: TablesUpdate<"release_tracks">,
): Promise<ReleaseTrack> {
  const { data, error } = await supabase
    .from("release_tracks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReleaseTrack(id: string): Promise<void> {
  const { error } = await supabase.from("release_tracks").delete().eq("id", id);
  if (error) throw error;
}

/** Recorridos ISRC faltantes en la tracklist (para validación previa a entrega). */
export function tracksMissingIsrc(tracks: ReleaseTrackWithRecording[]): ReleaseTrackWithRecording[] {
  return tracks.filter((t) => !t.isrc && !t.recording?.isrc);
}