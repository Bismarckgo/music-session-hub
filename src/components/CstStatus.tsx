import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  Check,
  Circle,
  CircleDashed,
  Minus,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CST_STATE_LABELS, type CstState } from "@/lib/cst-status";

const STATE_ICONS: Record<CstState, LucideIcon> = {
  complete: Check,
  attention: AlertTriangle,
  blocked: OctagonAlert,
  pending: CircleDashed,
  draft: Circle,
  none: Minus,
};

const statusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      state: {
        complete: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        attention: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        blocked: "border-destructive/30 bg-destructive/10 text-destructive",
        pending: "border-border bg-secondary text-secondary-foreground",
        draft: "border-border bg-secondary text-muted-foreground",
        none: "border-dashed border-border bg-transparent text-muted-foreground",
      },
      size: {
        sm: "px-1.5 py-0 text-[11px]",
        md: "",
      },
    },
    defaultVariants: { state: "none", size: "md" },
  },
);

export type StatusPillProps = VariantProps<typeof statusVariants> & {
  state: CstState;
  label?: string;
  className?: string;
  title?: string;
};

/** Estado con icono + texto (nunca sólo color). */
export function StatusPill({ state, label, size, className, title }: StatusPillProps) {
  const Icon = STATE_ICONS[state];
  return (
    <span className={cn(statusVariants({ state, size }), className)} title={title}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label ?? CST_STATE_LABELS[state]}
    </span>
  );
}

const iconColor: Record<CstState, string> = {
  complete: "text-emerald-600 dark:text-emerald-400",
  attention: "text-amber-600 dark:text-amber-400",
  blocked: "text-destructive",
  pending: "text-muted-foreground",
  draft: "text-muted-foreground",
  none: "text-muted-foreground",
};

/** Línea de checklist: icono de estado + texto explicativo. */
export function StatusLine({
  state,
  children,
  className,
}: {
  state: CstState;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = STATE_ICONS[state];
  return (
    <div className={cn("flex items-start gap-2 text-sm", className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor[state])} aria-hidden />
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

/** Fila etiqueta → estado, usada en el resumen de la obra. */
export function StatusRow({
  label,
  state,
  value,
  onClick,
}: {
  label: string;
  state: CstState;
  value?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-sm">{label}</span>
      <StatusPill state={state} label={value} />
    </>
  );
  if (!onClick) {
    return <div className="flex items-center justify-between gap-3 py-1.5">{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md py-1.5 text-left transition-colors hover:bg-secondary/60"
    >
      {content}
    </button>
  );
}
