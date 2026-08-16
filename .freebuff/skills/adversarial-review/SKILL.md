---
name: adversarial-review
description: Structured methodology for adversarial thinking — generating attack scenarios, abuse cases, race conditions, and security edge cases against specs and implementations. Produces spec-level gap items, not code-level fixes.
---

# Adversarial Review

This skill is invoked during spec deepening passes, ambiguity audits, and security review gates, and its output is always spec-level gap items — never code-level fixes.

## When to Use

- During `write-architecture-spec-deepen` Pass 3
- During `audit-ambiguity-execute` Step 3c devil's advocate pass
- During `remediate-pipeline-execute` adversarial consistency check
- During `validate-phase` Step 8 security review
- Before any spec layer audit gate

## Instructions

### 1. Attack Surface Enumeration

Systematically enumerate each of the following categories for every feature or endpoint under review. For each category, apply the listed triggering question:

- **Authentication bypass**: "What happens if the request arrives with no token, an expired token, or a token for a different service?"
- **Privilege escalation**: "What happens if a user with role X calls an endpoint intended only for role Y — does the guard exist at the API layer, or only the UI layer?"
- **Insecure direct object reference (IDOR)**: "What happens if an authenticated user sends a request substituting another user's resource ID?"
- **Data exfiltration**: "Does any response field expose data about resources the caller did not request?"
- **Denial-of-service**: "Is this endpoint bounded — are there rate limits, payload size limits, and query result limits specified in the spec?"
- **Injection points**: "Is every user-supplied string that reaches a query, command, template, or file path validated and sanitized in the spec?"

For every category where the spec does not provide an explicit answer, write a `SPEC GAP` item (see Step 5).

### 2. Abuse Scenario Generation Framework

For each feature or endpoint, generate all four scenario paths:

- **Happy path**: The intended use by a legitimate, competent user.
- **Malicious actor path**: A deliberate attempt to cause unauthorized access, data corruption, or system disruption.
- **Incompetent actor path**: An accidental misuse — duplicate submissions, wrong resource IDs, malformed payloads — and whether the spec handles the resulting state gracefully.
- **Concurrent execution path**: Two or more users executing the same operation simultaneously — does the spec describe the expected outcome, or does it silently assume serial execution?

Document the expected behavior for each path. Any path for which the spec does not define expected behavior is a `SPEC GAP`.

### 3. Race Condition and Concurrency Identification

For every write operation in the spec, ask "what if two requests arrive simultaneously?" Specifically identify:

- Shared mutable state that is read then written in non-atomic operations.
- Read-modify-write sequences that do not specify a locking or optimistic-concurrency strategy.
- Time-of-check-to-time-of-use (TOCTOU) windows (e.g., permission check followed by action, not wrapped atomically).
- Distributed transaction boundaries where partial success is possible and the spec does not define a rollback or compensation behavior.

Each identified pattern that is not addressed in the spec is a `SPEC GAP`.

### 4. Boundary Condition Stress-Testing

For every input in the spec, verify the spec defines behavior at:

- **Empty string / empty collection** (where at least one item is assumed by downstream logic).
- **Null and undefined** (for every optional field — what does the system do when the field is absent?).
- **Maximum field length** (what happens when a string hits the character limit?).
- **Integer overflow and underflow boundaries**.
- **Negative numbers** where only positives are semantically valid.
- **Unicode edge cases**: right-to-left characters, zero-width characters, emoji in identifiers.

Any boundary for which the spec does not define behavior is a `SPEC GAP`.

### 5. Documenting Findings as Spec-Level Gap Items

All findings from Steps 1–4 must be written using this exact format:

```
SPEC GAP: [layer] § [section] — [what is underspecified] — [attack scenario or failure mode] — [proposed resolution or question for user]
```

- The **layer** field is one of: `IA`, `BE`, `FE`.
- The **section** field quotes the heading of the spec section under review.
- The **proposed resolution** is either a concrete suggestion (if the answer is determinable from `ideation-index.md` or `architecture-design.md`) or a question for the user (if it is a product decision).

**Never** write the finding as a code change, a PR comment, or an implementation task.

## Anti-Patterns

- **Implementation TODOs instead of spec gaps** — Documenting findings as implementation TODOs rather than spec gap items. The output of this skill is always a spec amendment, never a code fix.
- **Skipping the concurrent execution path** — Skipping the concurrent execution path because "the feature seems simple." Concurrency issues emerge precisely in features that appear trivial.
- **Stopping at the happy path** — The malicious, incompetent, and concurrent paths are not optional. All four scenario paths must be generated for every feature and endpoint.

## Related Skills

- **`security-scanning-security-hardening`** — Use when transitioning from spec-level gap analysis to implementation-level security hardening. This skill identifies *what is underspecified* at the spec layer; `security-scanning-security-hardening` coordinates *multi-layer scanning and hardening* of the actual codebase and infrastructure after implementation.
