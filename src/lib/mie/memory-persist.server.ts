import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { learnFacts } from "./memory";
import type { Work, Collaborator, Contact, StudioSession } from "@/lib/catalog";

export async function persistFacts(userId: string, works?: Work[], collaborators?: Collaborator[], contacts?: Contact[], sessions?: StudioSession[]) {
  // If collections not provided, fetch from DB
  if (!works || !collaborators || !contacts) {
    const [wRes, cRes, ctRes, sRes] = await Promise.all([
      supabaseAdmin.from("works").select("*").eq("user_id", userId),
      supabaseAdmin.from("collaborators").select("*").eq("user_id", userId),
      supabaseAdmin.from("contacts").select("*").eq("user_id", userId),
      supabaseAdmin.from("sessions").select("*").eq("user_id", userId),
    ]);
    works = works ?? (wRes.data ?? []);
    collaborators = collaborators ?? (cRes.data ?? []);
    contacts = contacts ?? (ctRes.data ?? []);
    sessions = sessions ?? (sRes.data ?? []);
  }

  const facts = learnFacts(works as Work[], collaborators as Collaborator[], contacts as Contact[], sessions as StudioSession[]);

  // Upsert each fact into mie_memory. Use upsert on user_id+scope+key
  // Prepare payloads
  const payloads = facts.map((f) => ({
    user_id: userId,
    scope: f.scope,
    key: f.key,
    value: f.value,
    observations: f.observations,
    confidence: f.confidence,
    updated_at: new Date().toISOString(),
  }));

  if (payloads.length === 0) return;

  const { error } = await supabaseAdmin.from("mie_memory").upsert(payloads, { onConflict: ["user_id", "scope", "key"] });
  if (error) console.warn("[mie.memory-persist] upsert failed", error.message);
}
