import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Composition = Tables<"compositions">;
export type CompositionShare = Tables<"composition_shares">;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sin sesión");
  return data.user.id;
}

export async function listCompositions(): Promise<Composition[]> {
  const { data, error } = await supabase
    .from("compositions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getComposition(id: string): Promise<Composition | null> {
  const { data, error } = await supabase
    .from("compositions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCompositionByWork(workId: string): Promise<Composition | null> {
  const { data, error } = await supabase
    .from("compositions")
    .select("*")
    .eq("work_id", workId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createComposition(
  input: Omit<TablesInsert<"compositions">, "user_id">,
): Promise<Composition> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from("compositions")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateComposition(
  id: string,
  patch: TablesUpdate<"compositions">,
): Promise<Composition> {
  const { data, error } = await supabase
    .from("compositions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComposition(id: string): Promise<void> {
  const { error } = await supabase.from("compositions").delete().eq("id", id);
  if (error) throw error;
}

// ─── Shares ────────────────────────────────────────────────────────────────
export async function listCompositionShares(compositionId: string): Promise<CompositionShare[]> {
  const { data, error } = await supabase
    .from("composition_shares")
    .select("*")
    .eq("composition_id", compositionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addCompositionShare(
  input: Omit<TablesInsert<"composition_shares">, "user_id">,
): Promise<CompositionShare> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from("composition_shares")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompositionShare(
  id: string,
  patch: TablesUpdate<"composition_shares">,
): Promise<CompositionShare> {
  const { data, error } = await supabase
    .from("composition_shares")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompositionShare(id: string): Promise<void> {
  const { error } = await supabase.from("composition_shares").delete().eq("id", id);
  if (error) throw error;
}

export function writerShareTotal(shares: CompositionShare[]): number {
  return shares
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.writer_share ?? 0), 0);
}

export function publisherShareTotal(shares: CompositionShare[]): number {
  return shares
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.publisher_share ?? 0), 0);
}