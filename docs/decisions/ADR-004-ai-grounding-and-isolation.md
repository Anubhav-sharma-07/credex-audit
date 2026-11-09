# ADR-004: AI Grounding, Input Isolation & Post-Validation

## Status
Accepted

## Context
LLMs frequently hallucinate plausible-sounding financial metrics, invent non-existent vendor pricing, or fail to follow negative constraints under prompt injection. In finance-grade SaaS spend management, displaying an unverified savings estimate or hallucinated vendor discount destroys executive trust.

## Decision
We enforce strict **AI Input Isolation, Zod-Typed Tools, and Automated Post-Validation**:
1. **Input Isolation**: The model never receives raw database rows, free-text user prompts, or email bodies. It receives only deterministic `StructuredFindingInput` objects produced by the rules engine.
2. **Read-Only Zod Tools**: The AI answers questions exclusively through five workspace-scoped read-only tool functions with Zod argument schemas. Zero arbitrary SQL execution is permitted.
3. **Citation Enforcement**: Every sentence in an AI answer must cite a finding ID (e.g. `[f_cursor_01]`).
4. **Numeric Post-Check**: An automated post-validator parses every number in the LLM's response. If any number is detected that was not explicitly present in the input findings, the response is discarded and replaced with the deterministic template output.

### Rationale
- **Zero Hallucination Guarantee**: Unverified figures cannot reach the UI.
- **Prompt Injection Defense**: Adversarial payloads embedded in vendor names or notes cannot instruct the model to dump unauthorized data or alter outputs.
- **Fail-Safe Operation**: Rate limits, upstream LLM timeouts, and validation rejections automatically degrade to deterministic markdown templates.

## Consequences
- Requires a two-pass architecture (LLM generation followed by regex/numeric post-validation).
- Tested via a dedicated suite of 38+ AI eval fixtures covering injection attempts, missing citations, and hallucinated numbers.

