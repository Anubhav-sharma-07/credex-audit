import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatRelativeDays,
  formatCompactNumber,
} from "../formatters";

describe("Formatters Module", () => {
  describe("formatCurrency", () => {
    it("formats USD cents with standard grouping and decimals", () => {
      expect(formatCurrency(16000, { currency: "USD" })).toBe("$160.00");
      expect(formatCurrency(2550, { currency: "USD" })).toBe("$25.50");
      expect(formatCurrency(0, { currency: "USD" })).toBe("$0.00");
    });

    it("formats INR minor units (paise) with correct Indian lakh grouping", () => {
      const formattedInr = formatCurrency(1500000, { currency: "INR" });
      // ₹15,000.00
      expect(formattedInr).toContain("15,000.00");
      expect(formattedInr).toMatch(/₹|INR/);
    });

    it("respects hideCentsIfZero option for whole dollar figures", () => {
      expect(formatCurrency(16000, { currency: "USD", hideCentsIfZero: true })).toBe("$160");
      expect(formatCurrency(16050, { currency: "USD", hideCentsIfZero: true })).toBe("$160.50");
    });
  });

  describe("formatDate", () => {
    it("formats standard ISO dates consistently", () => {
      const formatted = formatDate("2026-06-15T00:00:00Z");
      expect(formatted).toBe("Jun 15, 2026");
    });

    it("handles null or missing dates with institutional dash", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
    });
  });

  describe("formatRelativeDays", () => {
    it("handles undefined renewal date safely", () => {
      expect(formatRelativeDays(undefined)).toBe("Date TBD");
      expect(formatRelativeDays(null)).toBe("Date TBD");
    });
  });

  describe("formatCompactNumber", () => {
    it("formats compact thousands and millions", () => {
      expect(formatCompactNumber(12500)).toBe("12.5K");
      expect(formatCompactNumber(1200000)).toBe("1.2M");
    });
  });
});

