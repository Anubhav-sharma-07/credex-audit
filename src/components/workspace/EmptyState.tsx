import { LucideIcon, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  teachingNote?: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionOnClick?: () => void;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function EmptyState({
  icon: Icon = Layers,
  title,
  description,
  teachingNote,
  actionLabel,
  actionHref,
  actionOnClick,
  secondaryActionLabel,
  secondaryActionHref,
  secondaryActionOnClick,
  primaryAction: primaryActionProp,
  secondaryAction: secondaryActionProp,
}: EmptyStateProps) {
  const primaryAction = primaryActionProp || (actionLabel ? { label: actionLabel, href: actionHref, onClick: actionOnClick } : undefined);
  const secondaryAction = secondaryActionProp || (secondaryActionLabel ? { label: secondaryActionLabel, href: secondaryActionHref, onClick: secondaryActionOnClick } : undefined);

  return (
    <div className="bg-surface border border-dashed border-border rounded-sm p-8 text-center space-y-4 max-w-xl mx-auto my-6">
      <div className="w-10 h-10 rounded-sm bg-canvas-subtle border border-border text-ink-muted flex items-center justify-center mx-auto">
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>

      <div className="space-y-1">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <p className="text-xs text-ink-muted leading-relaxed max-w-sm mx-auto">{description}</p>
      </div>

      {teachingNote && (
        <div className="p-3 bg-canvas-subtle border border-border-subtle rounded-xs text-[11px] text-ink-muted text-left max-w-md mx-auto">
          <strong className="text-ink">Next step:</strong> {teachingNote}
        </div>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          {primaryAction && (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-action-fill text-action-fill-foreground text-xs font-semibold rounded-xs hover:bg-action-fill-hover transition-standard min-h-[44px] shadow-xs cursor-pointer"
              >
                <span>{primaryAction.label}</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-action-fill text-action-fill-foreground text-xs font-semibold rounded-xs hover:bg-action-fill-hover transition-standard min-h-[44px] shadow-xs cursor-pointer"
              >
                <span>{primaryAction.label}</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border text-xs font-semibold text-ink hover:bg-surface-hover rounded-xs transition-standard min-h-[44px]"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border text-xs font-semibold text-ink hover:bg-surface-hover rounded-xs transition-standard min-h-[44px] cursor-pointer"
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
