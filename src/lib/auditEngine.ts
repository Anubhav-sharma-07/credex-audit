import type { ToolEntry, AuditResult, UseCase } from "@/types";
import { runLegacyAudit } from "@/modules/audit";

/**
 * Legacy audit interface maintained for backward compatibility with the public free audit wedge.
 * Delegates entirely to the pure, deterministic `src/modules/audit` engine.
 */
export function runAudit(tools: ToolEntry[], teamSize: number, useCase: UseCase): AuditResult {
  return runLegacyAudit(tools, teamSize, useCase);
}
