# Tests

## Test Framework
Vitest — fast unit testing framework compatible with Next.js and TypeScript.

## Running Tests
```bash
npm test
```

## Test Results
- Test Files: 1 passed
- Tests: 5 passed
- Duration: ~540ms

## What Is Tested

### 1. Total Monthly Spend Calculation
Verifies that `runAudit()` correctly adds up monthly spend across all tools.
- Input: Cursor ($40) + Claude ($20) = $60
- Expected: `totalMonthlySpend === 60`

### 2. Tool Results Array
Verifies that `runAudit()` returns one result per tool submitted.
- Input: 1 tool (Cursor)
- Expected: `toolResults.length === 1` and `toolResults[0].tool === "cursor"`

### 3. Savings Non-Negative
Verifies that monthly savings are never negative.
- Expected: `totalMonthlySavings >= 0`

### 4. UseCase and TeamSize Passthrough
Verifies that `useCase` and `teamSize` are correctly passed through to the result.
- Input: teamSize=3, useCase="writing"
- Expected: `result.useCase === "writing"` and `result.teamSize === 3`

### 5. Annual Savings Calculation
Verifies that annual savings = monthly savings × 12.
- Expected: `totalAnnualSavings === totalMonthlySavings * 12`

## What Is Not Tested (Future)
- API routes (integration tests)
- Supabase insert/select (database tests)
- UI components (React Testing Library)
- Form validation
- Shareable URL generation