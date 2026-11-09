/**
 * Finance-grade Internationalization & Currency Formatters.
 * Strictly uses integer minor units (cents / paise) to prevent floating-point drift.
 * Explicitly supports USD ($) and INR (₹) with locale and timezone awareness.
 */

export type SupportedCurrency = "USD" | "INR";

export interface FormatCurrencyOptions {
  currency?: SupportedCurrency;
  locale?: string;
  hideCentsIfZero?: boolean;
}

/**
 * Formats integer minor units (USD cents or INR paise) into a localized currency string.
 *
 * @param minorAmount - Integer minor units (e.g. 16000 for $160.00 or 1500000 for ₹15,000.00)
 * @param options - Currency, locale, and fraction options
 */
export function formatCurrency(
  minorAmount: number,
  options: FormatCurrencyOptions | SupportedCurrency = {}
): string {
  const opts: FormatCurrencyOptions = typeof options === "string" ? { currency: options } : options;
  const { currency = "USD", locale = currency === "INR" ? "en-IN" : "en-US", hideCentsIfZero = false } = opts;

  const majorAmount = minorAmount / 100;
  const isWhole = majorAmount % 1 === 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: hideCentsIfZero && isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(majorAmount);
  } catch {
    // Resilient fallback
    const symbol = currency === "INR" ? "₹" : "$";
    return `${symbol}${majorAmount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Formats ISO date string into standard institutional date format (e.g., "Jun 1, 2026").
 * Respects workspace timezone and locale.
 */
export function formatDate(
  isoDateString: string | null | undefined,
  locale: string = "en-US",
  timeZone?: string
): string {
  if (!isoDateString) return "—";

  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return isoDateString;

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timeZone || "UTC",
    }).format(date);
  } catch {
    return isoDateString;
  }
}

/**
 * Formats relative renewal countdown in institutional phrasing (e.g., "in 14 days", "today", "overdue by 3 days").
 */
export function formatRelativeDays(renewalDateString: string | null | undefined): string {
  if (!renewalDateString) return "Date TBD";

  try {
    const renewalTime = new Date(renewalDateString).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.ceil((renewalTime - nowTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Renews today";
    if (diffDays === 1) return "Renews tomorrow";
    if (diffDays > 1) return `in ${diffDays} days`;
    if (diffDays === -1) return "1 day overdue";
    return `${Math.abs(diffDays)} days overdue`;
  } catch {
    return renewalDateString;
  }
}

/**
 * Formats compact numbers for finance tables (e.g., 14.5k, 1.2M).
 */
export function formatCompactNumber(n: number, locale: string = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(n);
}
