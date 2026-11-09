# ADR-002: Money Representation — Integer Minor Units (Cents) Everywhere

## Status
Accepted

## Context
Floating-point arithmetic (e.g. `0.1 + 0.2 === 0.30000000000000004`) is fundamentally unacceptable in financial software. Rounding drift compounds over multi-seat subscriptions, annualized projections, and multi-currency reconciliations, creating discrepancy between entered spend and catalog list prices.

## Decision
All financial values across SpendLens—in database columns, domain entities, calculation rules, and API payloads—are represented exclusively as **64-bit integer minor units (cents)** using `MoneyMinor = bigint | number`.

### Rationale
- **Zero Rounding Drift**: An annual contract is guaranteed to equal exactly $12 \times \text{monthly}$ in minor units with zero fraction residue.
- **Defensive API Contracts**: The rules engine rejects undefined or zero default spend values, requiring explicit amounts or marking spend as `"unknown"`.
- **Presentation Decoupling**: Currency conversion to display strings occurs strictly at the edge UI layer using [`formatCurrencyMinor()`](file:///C:/Users/Anubhav07/.gemini/antigravity/worktrees/Automation/spendlens_workspace_init/project/credex-audit-main/src/lib/formatters.ts) with `Intl.NumberFormat` and CSS `tabular-nums`.

## Consequences
- Requires explicit parsing of user inputs (multiplying dollar floats by 100 with `Math.round(x * 100)`).
- Enforced by table-driven and Fast-Check property-based tests verifying zero drift across millions of randomized inputs.

