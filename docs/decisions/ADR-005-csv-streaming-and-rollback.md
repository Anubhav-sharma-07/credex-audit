# ADR-005: CSV Import Streaming, Duplicate Detection & Rollback Ledger

## Status
Accepted

## Context
Finance teams frequently import thousands of subscription rows via vendor billing exports or bank statements. These files often contain malformed currency symbols, non-numeric seat counts, missing headers, or duplicate rows for already-tracked subscriptions. A failed or mistaken import must not corrupt the workspace database.

## Decision
We implemented a **Chunk-Validated Streaming Import Engine with Instantaneous Rollback**:
1. **Pre-Validation**: Validates headers, parses currency strings into minor units, flags non-numeric rows, and detects duplicate subscriptions (matching vendor and plan) before committing.
2. **Preview & Confirm**: Users review valid rows, warning counts, and potential duplicates in a preview state before final confirmation.
3. **Rollback Ledger**: Each completed import batch is recorded in `csv_imports` with a unique `batchId` and the array of created `subscriptionIds`.
4. **One-Click Rollback**: Reverting an import executes an atomic database transaction that removes all subscriptions associated with the batch and marks the import record as `rolled_back`.

### Rationale
- **Zero Data Corruption**: Imports succeed atomically or fail cleanly without leaving orphaned half-imported records.
- **Operator Confidence**: Users can safely test imports knowing that a mistake can be undone with a single click.
- **Streaming Guard**: Request bodies are capped at 5MB with stream-level byte counters to prevent memory denial-of-service.

## Consequences
- Requires tracking `importBatchId` metadata on subscription rows.
- Validated via automated import parsing, error aggregation, and rollback tests.

