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
          daw?: string;
          project_name?: string;
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find or create work by (user_id, title)
        const { data: existing, error: findErr } = await supabaseAdmin
          .from("works")
          .select("id")
          .eq("user_id", userId)
          .eq("title", projectName)
          .maybeSingle();
        if (findErr) return new Response(findErr.message, { status: 500 });

        let workId = existing?.id ?? null;
        const events: Array<Record<string, unknown>> = [];

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
            payload: { title: projectName, source: "daw-ingest" },
            occurred_at: payload.started_at ?? new Date().toISOString(),
          });
        }

        const startedAt = payload.started_at ?? new Date().toISOString();
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
          payload: { daw: payload.daw ?? null },
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
          const { error: eErr } = await supabaseAdmin.from("mie_events").insert(events);
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