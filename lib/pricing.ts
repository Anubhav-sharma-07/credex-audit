import type { ToolName, PlanName } from "@/types";

export interface PricingEntry {
  tool: ToolName;
  plan: PlanName;
  pricePerSeat: number;
  minSeats?: number;
  notes?: string;
}

export const PRICING: PricingEntry[] = [
  // Cursor — https://cursor.sh/pricing
  { tool: "cursor", plan: "hobby",      pricePerSeat: 0  },
  { tool: "cursor", plan: "pro",        pricePerSeat: 20 },
  { tool: "cursor", plan: "business",   pricePerSeat: 40 },
  { tool: "cursor", plan: "enterprise", pricePerSeat: 0  },

  // GitHub Copilot — https://github.com/features/copilot
  { tool: "github_copilot", plan: "individual", pricePerSeat: 10 },
  { tool: "github_copilot", plan: "business",   pricePerSeat: 19 },
  { tool: "github_copilot", plan: "enterprise", pricePerSeat: 39 },

  // Claude — https://claude.ai/upgrade
  { tool: "claude", plan: "free",       pricePerSeat: 0   },
  { tool: "claude", plan: "pro",        pricePerSeat: 20  },
  { tool: "claude", plan: "max",        pricePerSeat: 100 },
  { tool: "claude", plan: "team",       pricePerSeat: 30, minSeats: 5 },
  { tool: "claude", plan: "enterprise", pricePerSeat: 0   },
  { tool: "claude", plan: "api",        pricePerSeat: 0   },

  // ChatGPT — https://openai.com/chatgpt/pricing
  { tool: "chatgpt", plan: "plus",       pricePerSeat: 20 },
  { tool: "chatgpt", plan: "team",       pricePerSeat: 30, minSeats: 2 },
  { tool: "chatgpt", plan: "enterprise", pricePerSeat: 0  },
  { tool: "chatgpt", plan: "api",        pricePerSeat: 0  },

  // Anthropic API — https://www.anthropic.com/pricing
  { tool: "anthropic_api", plan: "pay_as_you_go", pricePerSeat: 0 },

  // OpenAI API — https://openai.com/api/pricing
  { tool: "openai_api", plan: "pay_as_you_go", pricePerSeat: 0 },

  // Gemini — https://one.google.com/about/plans
  { tool: "gemini", plan: "pro",   pricePerSeat: 19.99 },
  { tool: "gemini", plan: "ultra", pricePerSeat: 0     },
  { tool: "gemini", plan: "api",   pricePerSeat: 0     },

  // Windsurf — https://codeium.com/windsurf/pricing
  { tool: "windsurf", plan: "free", pricePerSeat: 0  },
  { tool: "windsurf", plan: "pro",  pricePerSeat: 15 },
  { tool: "windsurf", plan: "team", pricePerSeat: 35 },
];

export function getPricing(tool: ToolName, plan: PlanName): PricingEntry | undefined {
  return PRICING.find((p) => p.tool === tool && p.plan === plan);
}

export function calcMonthlyCost(entry: PricingEntry, seats: number): number {
  if (entry.pricePerSeat === 0) return 0;
  const seatCount = Math.max(seats, entry.minSeats ?? 1);
  return entry.pricePerSeat * seatCount;
}

export const TOOL_LABELS: Record<ToolName, string> = {
  cursor:         "Cursor",
  github_copilot: "GitHub Copilot",
  claude:         "Claude",
  chatgpt:        "ChatGPT",
  anthropic_api:  "Anthropic API",
  openai_api:     "OpenAI API",
  gemini:         "Gemini",
  windsurf:       "Windsurf",
};

export const PLAN_LABELS: Record<string, string> = {
  hobby:         "Hobby",
  pro:           "Pro",
  business:      "Business",
  enterprise:    "Enterprise",
  individual:    "Individual",
  free:          "Free",
  max:           "Max",
  team:          "Team",
  api:           "API Direct",
  plus:          "Plus",
  ultra:         "Ultra",
  pay_as_you_go: "Pay-as-you-go",
};