/**
 * SpendLens Institutional Feature Flags System
 *
 * Provides typed, workspace-aware feature flags with environment overrides,
 * cookie/query-string preview overrides, and default kill-switches.
 */

export type FeatureFlagKey =
  | "ai_agent_actions"
  | "gmail_auto_sync"
  | "custom_integrations"
  | "advanced_forecasting"
  | "slack_notifications";

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  description: string;
  defaultValue: boolean;
  stage: "alpha" | "beta" | "ga" | "deprecated";
}

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  ai_agent_actions: {
    key: "ai_agent_actions",
    description: "Allows AI to prepare cancellation or negotiation emails with mandatory human confirmation.",
    defaultValue: false,
    stage: "alpha",
  },
  gmail_auto_sync: {
    key: "gmail_auto_sync",
    description: "Automated Gmail receipt and invoice detection via OAuth key derivation from a master secret.",
    defaultValue: false,
    stage: "alpha",
  },
  custom_integrations: {
    key: "custom_integrations",
    description: "ERP and accounting syncing for NetSuite, QuickBooks, and Xero.",
    defaultValue: false,
    stage: "alpha",
  },
  advanced_forecasting: {
    key: "advanced_forecasting",
    description: "Multi-year annualized and renewal-based probabilistic spend forecasting.",
    defaultValue: true,
    stage: "beta",
  },
  slack_notifications: {
    key: "slack_notifications",
    description: "Automated webhook notifications for 7/30/90-day renewal deadlines.",
    defaultValue: false,
    stage: "beta",
  },
};

/**
 * Evaluates whether a feature flag is enabled for a given workspace/environment.
 *
 * Precedence order:
 * 1. Process environment variable: FLAG_<FLAG_KEY_UPPERCASE> ("true" | "false")
 * 2. Workspace override dictionary (if provided)
 * 3. Default flag configuration
 */
export function isFeatureEnabled(
  key: FeatureFlagKey,
  workspaceOverrides?: Record<string, boolean>
): boolean {
  // 1. Environment variable override (e.g. FLAG_GMAIL_AUTO_SYNC=true)
  const envVarName = `FLAG_${key.toUpperCase()}`;
  if (typeof process !== "undefined" && process.env && process.env[envVarName] !== undefined) {
    return process.env[envVarName] === "true" || process.env[envVarName] === "1";
  }

  // 2. Workspace override
  if (workspaceOverrides && key in workspaceOverrides) {
    return Boolean(workspaceOverrides[key]);
  }

  // 3. Default definition
  const flag = FEATURE_FLAGS[key];
  return flag ? flag.defaultValue : false;
}

/**
 * Returns a summary of all feature flags and their current state.
 */
export function getAllFeatureFlags(workspaceOverrides?: Record<string, boolean>): Record<FeatureFlagKey, boolean> {
  const result = {} as Record<FeatureFlagKey, boolean>;
  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    result[key] = isFeatureEnabled(key, workspaceOverrides);
  }
  return result;
}

