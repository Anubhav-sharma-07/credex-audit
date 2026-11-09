import { ShieldAlert, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

interface PermissionDeniedProps {
  requiredRole?: string;
  approverEmail?: string;
  approverName?: string;
  featureName?: string;
}

export default function PermissionDenied({
  requiredRole = "Workspace Admin or Owner",
  approverEmail = "cto@company.com",
  approverName = "Chief Technology Officer",
  featureName = "this resource",
}: PermissionDeniedProps) {
  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center">
      <div className="bg-surface border border-border rounded-sm shadow-sm p-8 space-y-4">
        <div className="w-10 h-10 rounded-sm bg-danger-surface border border-danger-border text-danger flex items-center justify-center mx-auto">
          <ShieldAlert className="w-5 h-5" strokeWidth={1.75} />
        </div>

        <div>
          <h2 className="text-base font-bold text-ink">Access Restricted</h2>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            You do not have permission to modify or access {featureName}. This section requires{" "}
            <span className="font-semibold text-ink">{requiredRole}</span> privileges.
          </p>
        </div>

        <div className="bg-canvas-subtle border border-border rounded-xs p-3 text-left space-y-1 text-xs">
          <p className="text-[11px] font-semibold text-ink uppercase tracking-wider">Designated Approver</p>
          <p className="font-semibold text-ink">{approverName}</p>
          <a
            href={`mailto:${approverEmail}?subject=Access%20Request%20for%20SpendLens%20${encodeURIComponent(featureName)}`}
            className="inline-flex items-center gap-1.5 text-action-text hover:underline font-mono text-[11px]"
          >
            <Mail className="w-3 h-3" strokeWidth={1.75} />
            {approverEmail}
          </a>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/overview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-canvas border border-border text-xs font-semibold text-ink hover:bg-canvas-subtle rounded-xs transition-standard min-h-[44px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            Back to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

