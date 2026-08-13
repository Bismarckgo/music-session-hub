import type { MieEventType } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type EmitInput = {
  type: MieEventType;
  work_id?: string | null;
  session_id?: string | null;
  payload?: Record<string, unknown>;
  actor?: string;
  occurred_at?: string;
};

/**
 * Emite un evento al Event Store del MIE usando el cliente con sesión (frontend/server auth).
 * Además intenta notificar al bus server-side para ejecutar handlers si está disponible.
 */
export async function emit(event: EmitInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const insert = {
      user_id: userData.user.id,
      work_id: event.work_id ?? null,
      session_id: event.session_id ?? null,
      type: event.type,
      actor: event.actor ?? "user",
      payload: (event.payload ?? {}) as never,
      occurred_at: event.occurred_at ?? new Date().toISOString(),
    };

    const { error } = await supabase.from("mie_events").insert(insert);
    if (error) console.warn("[MIE] emit failed", event.type, error.message);

    // Try to trigger server-side processing of this event (best-effort). This uses a dynamic
    // import so bundlers don't include server-only code in client bundles. If the import fails
    // (running on client) we silently ignore it.
    try {
      // event-bus.server exports `emitServer` which will insert+run handlers server-side.
      const mod = await import("./event-bus.server");
      if (mod?.emitServer) {
        // map to server-side shape
        await mod.emitServer({ ...insert, payload: insert.payload, occurred_at: insert.occurred_at });
      }
    } catch (err) {
      // likely running in browser or bundler prevented dynamic import; that's fine —
      // the server worker/cron can process mie_events later.
    }
  } catch (err) {
    console.warn("[MIE] emit threw", err);
  }
}
