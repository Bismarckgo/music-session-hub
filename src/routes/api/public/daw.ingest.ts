import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * DAW → CST ingest endpoint (Fase 0 del MIE).
 *
 * Firma HMAC-SHA256 sobre el body raw con DAW_INGEST_SECRET.
 * Header: `x-cst-signature: <hex>`
 * Header: `x-cst-user-id: <uuid del usuario dueño>`
 *
 * Payload mínimo:
 *   {
 *     "daw": "Ableton Live",
 *     "project_name": "Mi Track",
 *     "started_at": "2026-07-23T18:00:00Z",
 *     "duration_minutes"?: number,
 *     "collaborators"?: [{ "name": "...", "role": "..." }]
 *   }
 *
 * Efecto: encuentra/crea la obra por (user_id, project_name), crea sesión,
 * y emite WorkCreated / SessionStarted / CollaboratorDetected en mie_events.
 */
export const Route = createFileRoute("/api/public/daw/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.DAW_INGEST_SECRET;
        if (!secret) return new Response("Server misconfigured", { status: 500 });

        const signature = request.headers.get("x-cst-signature") ?? "";
        const userId = request.headers.get("x-cst-user-id") ?? "";
        const body = await request.text();

        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const sigBuf = Buffer.from(signature, "hex");
        const expBuf = Buffer.from(expected, "hex");
        if (
          sigBuf.length !== expBuf.length ||
          !timingSafeEqual(sigBuf, expBuf)
        ) {
          return new Response("Invalid signature", { status: 401 });
        }
        if (!/^[0-9a-f-]{36}$/i.test(userId)) {
          return new Response("Missing user id", { status: 400 });
        }

        let payload: {
          event?: string;
          daw?: string;
          project_name?: string;
          project_path?: string;
          bounce_count?: number;
          client_event_id?: string;
          started_at?: string;
          duration_minutes?: number;
          collaborators?: { name?: string; role?: string }[];
        };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const projectName = payload.project_name?.trim();
        if (!projectName) return new Response("project_name required", { status: 400 });

        const kind = (payload.event ?? "session_started").toLowerCase();
        if (!["session_started", "project_detected", "session_saved", "bounce_exported"].includes(kind)) {
          return new Response("unknown event", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotencia: el watcher puede reintentar el mismo evento tras un fallo de red.
        if (payload.client_event_id) {
          const { data: dupe } = await supabaseAdmin
            .from("mie_events")
            .select("id")
            .eq("user_id", userId)
            .filter("payload->>client_event_id", "eq", payload.client_event_id)
            .maybeSingle();
          if (dupe) return Response.json({ ok: true, duplicate: true });
        }

        // Find or create work by (user_id, title)
        const { data: existing, error: findErr } = await supabaseAdmin
          .from("works")
          .select("id")
          .eq("user_id", userId)
          .eq("title", projectName)
          .maybeSingle();
        if (findErr) return new Response(findErr.message, { status: 500 });

        let workId = existing?.id ?? null;
        const events: Array<{
          user_id: string;
          work_id: string;
          session_id?: string;
          type: string;
          actor: string;
          payload: Record<string, unknown>;
          occurred_at: string;
        }> = [];

        const meta = {
          source: "daw-ingest",
          ...(payload.project_path ? { project_path: payload.project_path } : {}),
          ...(payload.client_event_id ? { client_event_id: payload.client_event_id } : {}),
        };

        if (!workId) {
          const { data: created, error: cErr } = await supabaseAdmin
            .from("works")
            .insert({ user_id: userId, title: projectName })
            .select("id")
            .single();
          if (cErr) return new Response(cErr.message, { status: 500 });
          workId = created.id;
          events.push({
            user_id: userId,
            work_id: workId,
            type: "WorkCreated",
            actor: "daw",
            payload: { title: projectName, ...meta },
            occurred_at: payload.started_at ?? new Date().toISOString(),
          });
        }

        const startedAt = payload.started_at ?? new Date().toISOString();

        // Fase 4 — eventos del DAW Watcher: no crean sesión nueva, solo enriquecen el log.
        if (kind === "project_detected" || kind === "session_saved" || kind === "bounce_exported") {
          const type =
            kind === "project_detected"
              ? "ProjectDetected"
              : kind === "session_saved"
                ? "SessionSaved"
                : "BounceExported";
          const { error: wErr } = await supabaseAdmin.from("mie_events").insert([
            ...events,
            {
              user_id: userId,
              work_id: workId!,
              type,
              actor: "daw-watcher",
              payload: {
                daw: payload.daw ?? null,
                ...(payload.bounce_count != null ? { bounce_count: payload.bounce_count } : {}),
                ...meta,
              },
              occurred_at: startedAt,
            },
          ] as never);
          if (wErr) return new Response(wErr.message, { status: 500 });
          return Response.json({ ok: true, work_id: workId, event: type });
        }

        const { data: session, error: sErr } = await supabaseAdmin
          .from("sessions")
          .insert({
            user_id: userId,
            work_id: workId!,
            daw: payload.daw ?? null,
            duration_minutes: payload.duration_minutes ?? null,
            started_at: startedAt,
          })
          .select("id")
          .single();
        if (sErr) return new Response(sErr.message, { status: 500 });

        events.push({
          user_id: userId,
          work_id: workId,
          session_id: session.id,
          type: "SessionStarted",
          actor: "daw",
          payload: { daw: payload.daw ?? null, ...meta },
          occurred_at: startedAt,
        });

        for (const c of payload.collaborators ?? []) {
          if (!c?.name) continue;
          events.push({
            user_id: userId,
            work_id: workId,
            session_id: session.id,
            type: "CollaboratorAdded",
            actor: "daw",
            payload: { name: c.name, role: c.role ?? "unknown", source: "daw-ingest" },
            occurred_at: startedAt,
          });
        }

        if (events.length) {
          const { error: eErr } = await supabaseAdmin
            .from("mie_events")
            .insert(events as never);
          if (eErr) return new Response(eErr.message, { status: 500 });
        }

        return Response.json({
          ok: true,
          work_id: workId,
          session_id: session.id,
          events: events.length,
        });
      },
    },
  },
});