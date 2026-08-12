import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Recording = Tables<"recordings">;
export type RecordingShare = Tables<"recording_shares">;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sin sesión");
  return data.user.id;
}

export async function listRecordings(): Promise<Recording[]> {
  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRecording(id: string): Promise<Recording | null> {
  const { data, error } = await supabase.from("recordings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listRecordingsByWork(workId: string): Promise<Recording[]> {
  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("work_id", workId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getRecordingByIsrc(isrc: string): Promise<Recording | null> {
  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("isrc", isrc)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createRecording(
  input: Omit<TablesInsert<"recordings">, "user_id">,
): Promise<Recording> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from("recordings")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecording(
  id: string,
  patch: TablesUpdate<"recordings">,
): Promise<Recording> {
  const { data, error } = await supabase
    .from("recordings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecording(id: string): Promise<void> {
  const { error } = await supabase.from("recordings").delete().eq("id", id);
  if (error) throw error;
}

// ─── Shares ────────────────────────────────────────────────────────────────
export async function listRecordingShares(recordingId: string): Promise<RecordingShare[]> {
  const { data, error } = await supabase
    .from("recording_shares")
    .select("*")
    .eq("recording_id", recordingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addRecordingShare(
  input: Omit<TablesInsert<"recording_shares">, "user_id">,
): Promise<RecordingShare> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from("recording_shares")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecordingShare(
  id: string,
  patch: TablesUpdate<"recording_shares">,
): Promise<RecordingShare> {
  const { data, error } = await supabase
    .from("recording_shares")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecordingShare(id: string): Promise<void> {
  const { error } = await supabase.from("recording_shares").delete().eq("id", id);
  if (error) throw error;
}

export function artistShareTotal(shares: RecordingShare[]): number {
  return shares
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.artist_share ?? 0), 0);
}

export function producerPointsTotal(shares: RecordingShare[]): number {
  return shares
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.producer_points ?? 0), 0);
}