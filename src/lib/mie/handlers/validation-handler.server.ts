import { registerHandler } from "../event-bus.server";
import { validateWorkForPublishing } from "@/lib/publishing";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { EmitInput } from "../events";

// Handler for SplitsUpdated: run validation rules and persist a validation_report
registerHandler("SplitsUpdated", async (event: EmitInput) => {
  try {
    const workId = event.work_id;
    if (!workId) return;

    // Fetch work and collaborators using server client
    const [{ data: workRows }, { data: collRows }] = await Promise.all([
      supabaseAdmin.from("works").select("*").eq("id", workId).limit(1),
      supabaseAdmin.from("collaborators").select("*").eq("work_id", workId),
    ]);
    const work = workRows?.[0] ?? null;
    const collaborators = collRows ?? [];

    if (!work) {
      console.warn("[validation-handler] work not found", workId);
      return;
    }

    // existing publishing.validateWorkForPublishing returns ValidationIssue[] synchronously
    let issues = [] as any[];
    try {
      const res = (validateWorkForPublishing as any)(work, collaborators);
      // res can be Promise or array
      issues = Array.isArray(res) ? res : (await res);
    } catch (err) {
      issues = [
        {
          level: "error",
          code: "validation_internal_error",
          message: `Validation failed: ${(err as Error).message}`,
        },
      ];
    }

    const overall_status = issues.some((i) => i.level === "error") ? "error" : issues.some((i) => i.level === "warning") ? "warning" : "ok";

    // Persist validation_reports
    const { error } = await supabaseAdmin.from("validation_reports").insert({
      entity_id: workId,
      entity_type: "work",
      overall_status,
      issues: issues as unknown,
      created_at: new Date().toISOString(),
    });
    if (error) console.warn("[validation-handler] failed to persist report", error.message);

    // Create attention_items for error-level issues
    if (overall_status === "error") {
      for (const issue of issues.filter((i) => i.level === "error")) {
        try {
          await supabaseAdmin.from("attention_items").insert({
            user_id: (event as any).user_id ?? null,
            work_id: workId,
            severity: "blocker",
            code: issue.code ?? "validation_error",
            message: issue.message ?? "",
            status: "open",
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn("[validation-handler] failed to create attention item", err);
        }
      }
    }
  } catch (err) {
    console.error("[validation-handler] threw", err);
  }
});
