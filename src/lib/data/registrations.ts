import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { CstState } from "@/lib/cst-status";
import { STATUS_LABELS, type RegistrationStatus } from "@/lib/publishing";

export type WorkRegistrationRow = Tables<"work_registrations">;

export type RegistrationWithWork = WorkRegistrationRow & {
  works: { id: string; title: string; fingerprint: string } | null;
};

const SELECT_WITH_WORK = "*, works(id, title, fingerprint)";

export async function listRegistrations(): Promise<RegistrationWithWork[]> {
  const { data, error } = await supabase
    .from("work_registrations")
    .select(SELECT_WITH_WORK)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as unknown as RegistrationWithWork[];
}

export async function listRegistrationsByWork(workId: string): Promise<RegistrationWithWork[]> {
  const { data, error } = await supabase
    .from("work_registrations")
    .select(SELECT_WITH_WORK)
    .eq("work_id", workId)
    .order("platform");
  if (error) throw error;
  return data as unknown as RegistrationWithWork[];
}

/** Bucket de filtro del wireframe: Todos / Atención / Pendiente / Completo. */
export type RegistrationBucket = "attention" | "pending" | "complete";

export function registrationBucket(status: string): RegistrationBucket {
  if (status === "error") return "attention";
  if (status === "registrado" || status === "sincronizado") return "complete";
  return "pending";
}

export function registrationState(status: string): CstState {
  if (status === "error") return "attention";
  if (status === "registrado" || status === "sincronizado") return "complete";
  if (status === "no_configurado") return "none";
  return "pending";
}

export function registrationLabel(status: string): string {
  return STATUS_LABELS[status as RegistrationStatus] ?? status;
}
