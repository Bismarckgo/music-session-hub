import { supabase } from "@/integrations/supabase/client";
import type { MieEventType } from "./types";

export type EmitInput = {
  type: MieEventType;
  work_id?: string | null;
  session_id?: string | null;
  payload?: Record<string, unknown>;
  actor?: string;
  occurred_at?: string;
};

/**
 * Emite un evento al Event Store del MIE.
 * No lanza: los fallos se loguean para no romper el flujo de UI.
 * La UI observa el estado; el motor deriva desde el log.
 */
export async function emit(event: EmitInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("mie_events").insert({
      user_id: userData.user.id,
      work_id: event.work_id ?? null,
      session_id: event.session_id ?? null,
      type: event.type,
      actor: event.actor ?? "user",
      payload: event.payload ?? {},
      occurred_at: event.occurred_at ?? new Date().toISOString(),
    });
    if (error) console.warn("[MIE] emit failed", event.type, error.message);
  } catch (err) {
    console.warn("[MIE] emit threw", err);
  }
}