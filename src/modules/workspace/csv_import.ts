import type { SubscriptionCategory, BillingFrequency } from "./types";
import { createSubscription, deleteSubscription } from "./subscriptions";

export interface CSVRowParsed {
  vendorName: string;
  planName: string;
  category: SubscriptionCategory;
  seats: number;
  monthlyCostUsd: number;
  billingFrequency: BillingFrequency;
  renewalDate?: string;
  ownerEmail?: string;
  notes?: string;
}

export interface CSVValidationError {
  row: number;
  column: string;
  message: string;
}

export interface CSVPreviewResult {
  validRows: CSVRowParsed[];
  errors: CSVValidationError[];
  potentialDuplicates: Array<{
    row: number;
    vendorName: string;
    planName: string;
    existingSubscriptionId: string;
  }>;
}

const VALID_CATEGORIES: SubscriptionCategory[] = [
  "ide_assistant",
  "chat_assistant",
  "api",
  "general",
];

export function parseAndValidateCSV(
  csvContent: string,
  existingSubscriptions: Array<{ id: string; vendorName: string; planName: string }>
): CSVPreviewResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: [{ row: 1, column: "file", message: "CSV file is empty or missing data rows." }],
      potentialDuplicates: [],
    };
  }

  const rawHeaders = lines[0].split(",").map((h) => h.replace(/["\s]/g, "").toLowerCase());
  const headerMap: Record<string, number> = {};

  rawHeaders.forEach((h, idx) => {
    if (h.includes("vendor") || h.includes("tool") || h.includes("name")) headerMap.vendor = idx;
    if (h.includes("plan")) headerMap.plan = idx;
    if (h.includes("category")) headerMap.category = idx;
    if (h.includes("seat")) headerMap.seats = idx;
    if (h.includes("cost") || h.includes("spend") || h.includes("price") || h.includes("amount")) headerMap.cost = idx;
    if (h.includes("freq") || h.includes("cycle") || h.includes("billing")) headerMap.billing = idx;
    if (h.includes("renew")) headerMap.renewal = idx;
    if (h.includes("owner") || h.includes("email")) headerMap.owner = idx;
  });

  const validRows: CSVRowParsed[] = [];
  const errors: CSVValidationError[] = [];
  const potentialDuplicates: CSVPreviewResult["potentialDuplicates"] = [];

  for (let r = 1; r < lines.length; r++) {
    const rowNum = r + 1;
    const cols = lines[r].split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());

    const vendor = headerMap.vendor !== undefined ? cols[headerMap.vendor] : cols[0];
    const plan = headerMap.plan !== undefined ? cols[headerMap.plan] : cols[1];
    const rawCategory = headerMap.category !== undefined ? cols[headerMap.category]?.toLowerCase() : "general";
    const rawSeats = headerMap.seats !== undefined ? cols[headerMap.seats] : cols[2];
    const rawCost = headerMap.cost !== undefined ? cols[headerMap.cost] : cols[3];
    const rawBilling = headerMap.billing !== undefined ? cols[headerMap.billing]?.toLowerCase() : "monthly";
    const rawRenewal = headerMap.renewal !== undefined ? cols[headerMap.renewal] : undefined;
    const rawOwner = headerMap.owner !== undefined ? cols[headerMap.owner] : undefined;

    if (!vendor) {
      errors.push({ row: rowNum, column: "vendor", message: "Vendor name is required." });
      continue;
    }

    const seats = parseInt(rawSeats, 10);
    if (isNaN(seats) || seats < 1) {
      errors.push({ row: rowNum, column: "seats", message: "Seats must be an integer >= 1." });
      continue;
    }

    const cleanedCost = rawCost?.replace(/[^0-9.]/g, "");
    if (!cleanedCost || isNaN(parseFloat(cleanedCost)) || parseFloat(cleanedCost) < 0) {
      errors.push({ row: rowNum, column: "cost", message: "Monthly cost must be a valid non-negative number." });
      continue;
    }
    const costUsd = parseFloat(cleanedCost);

    const category: SubscriptionCategory = VALID_CATEGORIES.includes(rawCategory as SubscriptionCategory)
      ? (rawCategory as SubscriptionCategory)
      : "general";

    const billingFrequency: BillingFrequency = rawBilling.includes("ann") ? "annual" : "monthly";

    // Duplicate detection against existing subscriptions
    const existingDup = existingSubscriptions.find(
      (e) =>
        e.vendorName.toLowerCase() === vendor.toLowerCase() &&
        e.planName.toLowerCase() === (plan || "").toLowerCase()
    );

    if (existingDup) {
      potentialDuplicates.push({
        row: rowNum,
        vendorName: vendor,
        planName: plan || "Default",
        existingSubscriptionId: existingDup.id,
      });
    }

    validRows.push({
      vendorName: vendor,
      planName: plan || "Pro",
      category,
      seats,
      monthlyCostUsd: costUsd,
      billingFrequency,
      renewalDate: rawRenewal,
      ownerEmail: rawOwner,
    });
  }

  return {
    validRows,
    errors,
    potentialDuplicates,
  };
}

export async function executeCSVImport(
  workspaceId: string,
  rows: CSVRowParsed[]
): Promise<{ importedIds: string[] }> {
  const importedIds: string[] = [];

  for (const r of rows) {
    const sub = await createSubscription(workspaceId, {
      vendorName: r.vendorName,
      planName: r.planName,
      category: r.category,
      seats: r.seats,
      costMinor: Math.round(r.monthlyCostUsd * 100),
      billingFrequency: r.billingFrequency,
      renewalDate: r.renewalDate,
      ownerEmail: r.ownerEmail,
      notes: "Imported via CSV",
    });
    importedIds.push(sub.id);
  }

  return { importedIds };
}

export async function rollbackCSVImport(
  workspaceId: string,
  importedSubscriptionIds: string[]
): Promise<number> {
  let count = 0;
  for (const id of importedSubscriptionIds) {
    const success = await deleteSubscription(workspaceId, id);
    if (success) count++;
  }
  return count;
}
