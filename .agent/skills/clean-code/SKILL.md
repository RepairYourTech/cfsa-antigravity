---
name: clean-code
description: "Applies battle-tested clean code principles to writing, reviewing, and refactoring code. Covers naming, functions, comments, error handling, class design, and the critical difference between clever code and clear code."
version: 2.0.0
---

# Clean Code

Code is read 10x more than it's written. Every naming choice, every function boundary, every abstraction layer either helps or hurts the next person who reads it — including future you.

## When to Use

- Writing any new code
- Reviewing pull requests
- Refactoring existing code
- When code "works but feels wrong"

## Stack-Specific References

The principles below are language-agnostic. For idiomatic patterns and syntax, read the reference matching your surface's Languages column:

| Language | Reference |
|----------|-----------|
| TypeScript / JavaScript | `references/typescript.md` |
| Python | `references/python.md` |
| Go | `references/go.md` |
| Rust | `references/rust.md` |

## Core Principles

### 1. Names Are Documentation

Names should reveal intent. If a name requires a comment to explain it, the name is wrong.

| Bad | Good | Why |
|-----|------|-----|
| `d` | `elapsedDays` | What is `d`? |
| `list` | `activeUsers` | What kind of list? |
| `processData()` | `validateAndSaveOrder()` | What processing? |
| `temp` | `filteredResults` | Temporary what? |
| `flag` | `isEligibleForDiscount` | What flag? |
| `doStuff()` | `sendWelcomeEmail()` | What stuff? |
| `Manager` | `OrderProcessor` | Manager of what? |
| `Utils` | `StringFormatter` | Util for what? |

**Rules:**
- Classes/types → nouns (`UserRepository`, `PaymentGateway`)
- Functions → verbs (`calculateTotal`, `sendNotification`)
- Booleans → questions (`isActive`, `hasPermission`, `canEdit`)
- Constants → screaming snake with context (`MAX_RETRY_ATTEMPTS`, not `MAX`)
- No abbreviations unless universally understood (`id`, `url`, `api` are fine; `usr`, `mgr`, `proc` are not)

### 2. Functions Should Do One Thing

A function that does one thing well is easy to name, test, and reuse. A function that does three things is hard to name, impossible to test independently, and couples three responsibilities.

**The test:** Can you describe the function without using "and"? If not, split it.

```
❌ processOrder(order)
   — validates order
   — calculates total with tax
   — saves to database
   — sends confirmation email

✅ validateOrder(order)        → throws if invalid
   calculateOrderTotal(items) → returns numeric total
   submitOrder(order)         → orchestrates the above
```

**Function size limits:**
- **Ideal**: 5-15 lines
- **Acceptable**: up to 30 lines
- **Needs splitting**: 30+ lines
- **Unacceptable**: 50+ lines (split immediately)

### 3. Parameters

- **0-2 parameters**: ideal
- **3 parameters**: acceptable with named/destructured args
- **4+ parameters**: use an options object/struct/dataclass
- **Boolean parameters**: almost always a code smell — split into two functions

```
❌ createUser(name, isAdmin)
✅ createUser(name)  /  createAdmin(name)

❌ sendEmail(to, from, subject, body, cc)
✅ sendEmail(options)   ← options is a structured type
```

### 4. Comments: Why, Not What

Good code doesn't need comments to explain WHAT it does. Comments should explain WHY — the non-obvious reasoning, business rules, or constraints.

```
❌ // Increment counter by one
   counter += 1

❌ // Check if user is admin
   if user.role == "admin"

✅ // Stripe requires amount in cents, not dollars
   amountInCents = round(price * 100)

✅ // FDA regulation 21 CFR Part 11 requires audit trail
   auditLog.record(changeEvent)

✅ // WARNING: This query locks the orders table — avoid during peak hours
   db.execute(batchUpdateQuery)
```

**Delete these comments immediately:**
- `// TODO: fix this later` — fix it now or create a tracked issue
- `// This is a hack` — then don't commit the hack
- `// I don't know why this works` — figure it out before shipping
- Commented-out code — delete it; version control has your history

### 5. Error Handling

Errors are not edge cases — they're expected behavior. Handle them explicitly.

```
❌ try { save(order) } catch { log("error") }
   → What error? What happens to the order?

❌ try { processPayment(order) } catch { throw Error("Something went wrong") }
   → Useless to the caller

✅ try {
     processPayment(order)
   } catch InsufficientFundsError:
     return { success: false, code: "INSUFFICIENT_FUNDS", retry: false }
   catch PaymentGatewayError:
     logger.error("Payment gateway failure", { orderId: order.id })
     return { success: false, code: "GATEWAY_ERROR", retry: true }
   catch unknown:
     rethrow  → Unknown errors bubble up
```

### 6. Don't Repeat Yourself (DRY) — But Don't Over-Abstract

**DRY violation** — same logic copy-pasted in 3+ places:
```
tax1 = price1 * 0.08
tax2 = price2 * 0.08
tax3 = price3 * 0.08
→ Extract: calculateTax(price)
```

**Over-abstraction** — premature DRY that couples unrelated things:
```
❌ handleEntity(type, action, data)  → "universal" handler for everything
```

**Rule of Three**: Duplicate once is acceptable. Duplicate twice means extract.

### 7. Code Organization

```
                        High-level policy (business logic)
                               │
                               ▼
                     ┌─────────────────────┐
                     │   Domain Layer       │  Pure logic, no I/O
                     │   (models, rules)    │
                     └─────────────────────┘
                               │
                     ┌─────────────────────┐
                     │   Application Layer  │  Orchestrates domain objects
                     │   (use cases)        │
                     └─────────────────────┘
                               │
                     ┌─────────────────────┐
                     │   Infrastructure     │  I/O, databases, APIs
                     │   (adapters)         │
                     └─────────────────────┘
                               │
                        Low-level detail (frameworks, drivers)
```

- Dependencies point inward (infrastructure depends on domain, not reverse)
- Business logic never imports from infrastructure
- Test domain logic without databases, APIs, or frameworks

## Quick Refactoring Checklist

Before committing code, check:

- [ ] Can I understand every function in <10 seconds?
- [ ] Are there any functions >30 lines?
- [ ] Are there any files >200 lines (components) or >300 lines (utilities)?
- [ ] Do all names reveal intent without needing comments?
- [ ] Is there any copy-pasted logic (3+ occurrences)?
- [ ] Are errors handled specifically, not swallowed or genericized?
- [ ] Would a new team member understand this without asking me?
