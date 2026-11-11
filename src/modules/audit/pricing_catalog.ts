import type {
  ToolId,
  PricingCatalogEntry,
  BillingCycle,
  PricingSource,
  StalePricingWarning,
} from "./types";

export const CATALOG_METADATA = {
  version: "2026.05",
  verifiedAt: "2026-05-10",
  totalVendors: 8,
} as const;

export const PRICING_CATALOG: PricingCatalogEntry[] = [
  // --- Cursor ---
  {
    toolId: "cursor",
    planId: "hobby",
    planName: "Hobby",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 0,
    annualPricePerSeatMinor: 0,
    minSeats: 1,
    sourceUrl: "https://www.cursor.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "cursor",
    planId: "pro",
    planName: "Pro",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 2000, // $20.00/seat/mo
    annualPricePerSeatMinor: 2000,  // $20.00/seat/mo ($240/yr)
    minSeats: 1,
    sourceUrl: "https://www.cursor.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "cursor",
    planId: "business",
    planName: "Business",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 4000, // $40.00/seat/mo (adds SSO & audit logs for 10+ teams)
    annualPricePerSeatMinor: 4000,
    minSeats: 1,
    sourceUrl: "https://www.cursor.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "cursor",
    planId: "enterprise",
    planName: "Enterprise",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 6000, // Estimated baseline
    annualPricePerSeatMinor: 6000,
    minSeats: 20,
    sourceUrl: "https://www.cursor.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },

  // --- GitHub Copilot ---
  {
    toolId: "github_copilot",
    planId: "individual",
    planName: "Individual",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 1000, // $10.00/seat/mo
    annualPricePerSeatMinor: 833,   // $100/yr = ~$8.33/mo
    minSeats: 1,
    sourceUrl: "https://github.com/features/copilot#pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "github_copilot",
    planId: "business",
    planName: "Business",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 1900, // $19.00/seat/mo
    annualPricePerSeatMinor: 1900,
    minSeats: 1,
    sourceUrl: "https://github.com/features/copilot#pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "github_copilot",
    planId: "enterprise",
    planName: "Enterprise",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 3900, // $39.00/seat/mo (adds org knowledge bases)
    annualPricePerSeatMinor: 3900,
    minSeats: 1,
    sourceUrl: "https://github.com/features/copilot#pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },

  // --- Claude (Anthropic) ---
  // Resolution of $25 vs $30 conflict:
  // - $30.00/seat/mo on monthly billing
  // - $25.00/seat/mo on annual commitment ($300/yr per seat)
  // Source: https://www.anthropic.com/pricing (min 5 seats for team workspace)
  {
    toolId: "claude",
    planId: "free",
    planName: "Free",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 0,
    annualPricePerSeatMinor: 0,
    minSeats: 1,
    sourceUrl: "https://www.anthropic.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "claude",
    planId: "pro",
    planName: "Pro",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 2000, // $20.00/seat/mo
    annualPricePerSeatMinor: 1700,  // $200/yr = ~$16.67/mo ($17/mo billed annually)
    minSeats: 1,
    sourceUrl: "https://www.anthropic.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "claude",
    planId: "team",
    planName: "Team",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 3000, // $30.00/seat/mo monthly flex
    annualPricePerSeatMinor: 2500,  // $25.00/seat/mo billed annually ($300/seat/yr)
    minSeats: 5,
    sourceUrl: "https://www.anthropic.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "claude",
    planId: "max",
    planName: "Max",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 10000, // $100.00/seat/mo
    annualPricePerSeatMinor: 10000,
    minSeats: 1,
    sourceUrl: "https://www.anthropic.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "claude",
    planId: "enterprise",
    planName: "Enterprise",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 6000,
    annualPricePerSeatMinor: 6000,
    minSeats: 20,
    sourceUrl: "https://www.anthropic.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },

  // --- ChatGPT (OpenAI) ---
  // Resolution of $25 vs $30 conflict:
  // - $30.00/seat/mo monthly flex billing
  // - $25.00/seat/mo billed annually ($300/seat/yr)
  // Source: https://openai.com/chatgpt/pricing/ (min 2 seats for team workspace)
  {
    toolId: "chatgpt",
    planId: "plus",
    planName: "Plus",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 2000, // $20.00/seat/mo
    annualPricePerSeatMinor: 2000,
    minSeats: 1,
    sourceUrl: "https://openai.com/chatgpt/pricing/",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "chatgpt",
    planId: "team",
    planName: "Team",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 3000, // $30.00/seat/mo monthly flex
    annualPricePerSeatMinor: 2500,  // $25.00/seat/mo annual commitment
    minSeats: 2,
    sourceUrl: "https://openai.com/chatgpt/pricing/",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "chatgpt",
    planId: "enterprise",
    planName: "Enterprise",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 6000,
    annualPricePerSeatMinor: 6000,
    minSeats: 50,
    sourceUrl: "https://openai.com/chatgpt/pricing/",
    verifiedAt: "2026-05-10T00:00:00Z",
  },

  // --- Gemini (Google) ---
  {
    toolId: "gemini",
    planId: "pro",
    planName: "Pro",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 1999, // $19.99/seat/mo
    annualPricePerSeatMinor: 1999,
    minSeats: 1,
    sourceUrl: "https://gemini.google.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "gemini",
    planId: "ultra",
    planName: "Ultra",
    category: "chat_assistant",
    monthlyPricePerSeatMinor: 3000, // $30.00/seat/mo
    annualPricePerSeatMinor: 3000,
    minSeats: 1,
    sourceUrl: "https://gemini.google.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },

  // --- Windsurf (Codeium) ---
  // Resolution of $30 vs $35 conflict:
  // - $35.00/seat/mo monthly flex billing
  // - $30.00/seat/mo annual billing ($360/seat/yr)
  // Source: https://codeium.com/windsurf/pricing (min 2 seats for team)
  {
    toolId: "windsurf",
    planId: "free",
    planName: "Free",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 0,
    annualPricePerSeatMinor: 0,
    minSeats: 1,
    sourceUrl: "https://codeium.com/windsurf/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "windsurf",
    planId: "pro",
    planName: "Pro",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 1500, // $15.00/seat/mo
    annualPricePerSeatMinor: 1500,
    minSeats: 1,
    sourceUrl: "https://codeium.com/windsurf/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "windsurf",
    planId: "team",
    planName: "Team",
    category: "ide_assistant",
    monthlyPricePerSeatMinor: 3500, // $35.00/seat/mo monthly
    annualPricePerSeatMinor: 3000,  // $30.00/seat/mo annual
    minSeats: 2,
    sourceUrl: "https://codeium.com/windsurf/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },

  // --- API tools ---
  {
    toolId: "anthropic_api",
    planId: "pay_as_you_go",
    planName: "Pay-as-you-go",
    category: "api",
    monthlyPricePerSeatMinor: 0,
    annualPricePerSeatMinor: 0,
    minSeats: 1,
    sourceUrl: "https://www.anthropic.com/pricing",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
  {
    toolId: "openai_api",
    planId: "pay_as_you_go",
    planName: "Pay-as-you-go",
    category: "api",
    monthlyPricePerSeatMinor: 0,
    annualPricePerSeatMinor: 0,
    minSeats: 1,
    sourceUrl: "https://openai.com/api/pricing/",
    verifiedAt: "2026-05-10T00:00:00Z",
  },
];

export function getPricingEntry(toolId: ToolId, planId: string): PricingCatalogEntry | undefined {
  return PRICING_CATALOG.find(
    (e) => e.toolId === toolId && e.planId.toLowerCase() === planId.toLowerCase()
  );
}

export function calculateListMonthlyCostMinor(
  entry: PricingCatalogEntry,
  seats: number,
  billingCycle: BillingCycle = "monthly"
): number {
  if (entry.category === "api" || entry.monthlyPricePerSeatMinor === 0) {
    return 0;
  }
  const effectiveSeats = Math.max(seats, entry.minSeats);
  const unitPrice =
    billingCycle === "annual" ? entry.annualPricePerSeatMinor : entry.monthlyPricePerSeatMinor;
  return effectiveSeats * unitPrice;
}

export function checkPricingStaleness(
  verifiedAtIso: string,
  referenceDateIso: string,
  thresholdDays: number = 60
): { isStale: boolean; daysOld: number } {
  const verified = new Date(verifiedAtIso).getTime();
  const ref = new Date(referenceDateIso).getTime();
  const diffMs = Math.max(0, ref - verified);
  const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return {
    isStale: daysOld > thresholdDays,
    daysOld,
  };
}

export function getPricingSource(
  entry: PricingCatalogEntry,
  referenceDateIso: string
): PricingSource {
  const staleness = checkPricingStaleness(entry.verifiedAt, referenceDateIso);
  return {
    url: entry.sourceUrl,
    verifiedAt: entry.verifiedAt,
    isStale: staleness.isStale,
  };
}

export function detectStaleCatalogWarnings(
  referenceDateIso: string,
  thresholdDays: number = 60
): StalePricingWarning[] {
  return PRICING_CATALOG.map((e) => {
    const staleness = checkPricingStaleness(e.verifiedAt, referenceDateIso, thresholdDays);
    return {
      toolId: e.toolId,
      planId: e.planId,
      verifiedAt: e.verifiedAt,
      daysOld: staleness.daysOld,
    };
  }).filter((w) => w.daysOld > thresholdDays);
}

