import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { EmitInput } from "./events";

// Handler type
export type Handler = (event: EmitInput) => Promise<void> | void;

const handlersByType: Map<string, Handler[]> = new Map();
const handlersByEntity: Map<string, Handler[]> = new Map();

// auto-register built-in handlers
async function warmupHandlers() {
  try {
    // Import built-in handlers to ensure they register themselves.
    await import("./handlers/index.server");
  } catch (err) {
    console.warn("[event-bus] failed warming handlers", err);
  }
}

// call once to load handlers
void warmupHandlers();

export function registerHandler(eventType: string, handler: Handler) {
  const arr = handlersByType.get(eventType) ?? [];
  arr.push(handler);
  handlersByType.set(eventType, arr);
}

export function onEntity(entityType: string, entityId: string, handler: Handler) {
  const key = `${entityType}:${entityId}`;
  const arr = handlersByEntity.get(key) ?? [];
  arr.push(handler);
  handlersByEntity.set(key, arr);
}

export async function emitServer(event: EmitInput): Promise<void> {
  try {
    // Insert to event store with service role
    const { error } = await supabaseAdmin.from("mie_events").insert({
      user_id: (event as any).user_id ?? null,
      work_id: event.work_id ?? null,
      session_id: event.session_id ?? null,
      type: event.type,
      actor: event.actor ?? "system",
      payload: (event.payload ?? {}) as never,
      occurred_at: event.occurred_at ?? new Date().toISOString(),
    });
    if (error) console.warn("[event-bus] insert failed", error.message);

    // Execute handlers registered for this type
    const typed = handlersByType.get(event.type) ?? [];
    for (const h of typed) {
      try {
        await h(event);
      } catch (err) {
        console.error("[event-bus] handler error", event.type, err);
      }
    }

    // Execute entity-specific handlers (work)
    if (event.work_id) {
      const key = `work:${event.work_id}`;
      const entityHandlers = handlersByEntity.get(key) ?? [];
      for (const h of entityHandlers) {
        try {
          await h(event);
        } catch (err) {
          console.error("[event-bus] entity handler error", key, err);
        }
      }
    }
  } catch (err) {
    console.error("[event-bus] emitServer threw", err);
  }
}

export async function getHistory(entityType: string, entityId: string) {
  // Simple history fetch. Use service role to avoid RLS issues.
  const { data, error } = await supabaseAdmin
    .from("mie_events")
    .select("*")
    .eq(`${entityType}_id`, entityId)
    .order("occurred_at", { ascending: true });
  if (error) {
    console.warn("[event-bus] history fetch failed", error.message);
    return [];
  }
  return data ?? [];
}
