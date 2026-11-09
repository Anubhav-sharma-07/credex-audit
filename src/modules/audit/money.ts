/**
 * Money utilities enforcing integer minor units (e.g. cents in USD).
 *
 * Rules:
 * 1. Financial amounts must be stored as integers representing minor currency units.
 * 2. Never perform floating-point operations for currency arithmetic.
 * 3. Annualization is strictly 12 * monthly minor units without drift.
 */

export function toMinorUnits(dollars: number): number {
  return Math.round(dollars * 100);
}

export function toMajorUnits(minor: number): number {
  return minor / 100;
}

export function formatMinorToUsd(minor: number): string {
  const isNegative = minor < 0;
  const abs = Math.abs(minor);
  const dollars = Math.floor(abs / 100);
  const cents = abs % 100;
  const sign = isNegative ? "-" : "";
  if (cents === 0) {
    return `${sign}$${dollars.toLocaleString("en-US")}`;
  }
  return `${sign}$${dollars.toLocaleString("en-US")}.${cents.toString().padStart(2, "0")}`;
}

export function sumMinor(amounts: number[]): number {
  return amounts.reduce((acc, curr) => acc + (Number.isInteger(curr) ? curr : Math.round(curr)), 0);
}

export function annualizeMinor(monthlyMinor: number): number {
  return monthlyMinor * 12;
}

