# Cross-Cut Ledger

> This ledger is accumulated incrementally at every level of ideation.
> It is NOT built in a single pass. Each level adds resolution.
> Never clear entries — this is the audit trail.

## Ledger

### Level 0 — Surface Guesses (from domain map)

_Noted during global domain mapping. Low confidence, not yet validated._

| Domain A | Domain B | Suspected Connection | Status |
|----------|----------|---------------------|--------|
| _Domain 01_ | _Domain 05_ | _Likely share customer entity_ | `pending` |

### Level 1 — Sub-Domain Connections (from breadth sweep)

_Noted during domain breadth mapping. Medium confidence, connection identified at sub-area level._

| Domain A.Sub-Area | Domain B.Sub-Area | Connection | Status |
|-------------------|-------------------|------------|--------|
| _01.Inventory_ | _05.Supplier Catalog_ | _Parts lookup cross-references supplier data_ | `pending` |

### Level 2+ — Evidence-Backed (from vertical drilling)

_Confirmed during vertical drilling with specific evidence. High confidence._

| Domain A.Sub-Area.Feature | Domain B.Sub-Area.Feature | Evidence | Status |
|--------------------------|--------------------------|----------|--------|
| _02.Inventory.Purgatory_ | _01.Payments.PreAuth_ | _Pre-auth clears purgatory on completion_ | `✅ confirmed` |

## Synthesis Outcomes

For each confirmed pair, the five synthesis questions have been asked and answered.

### [Interaction Name]: Domain A × Domain B

**Connection**: _One-sentence description of the interaction._

1. **Shared state conflict**: _Who owns the entity? What's the merge strategy?_
2. **Trigger chain**: _Does A trigger B? Rollback if B fails? Sync or async?_
3. **Permission intersection**: _Does permission in A affect B?_
4. **Notification fan-out**: _Does event in A notify actors in B?_
5. **State transition conflict**: _Can A and B race? Data consistency impact?_

**Outcome**: `✅ confirmed → [Interaction Name]` | `❌ rejected: [reason]`

---

_Repeat Synthesis Outcomes for each confirmed cross-cut pair._

## Rejected Pairs

| Domain A | Domain B | Reason for Rejection |
|----------|----------|---------------------|
| _Domain 03_ | _Domain 07_ | _No shared state, no trigger dependency, independent lifecycles_ |
