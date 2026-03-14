---
name: clean-code
description: "Applies battle-tested clean code principles to writing, reviewing, and refactoring code. Covers naming, functions, comments, error handling, class design, and the critical difference between clever code and clear code."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# Clean Code

Code is read 10x more than it's written. Every naming choice, every function boundary, every abstraction layer either helps or hurts the next person who reads it — including future you.

## When to Use

- Writing any new code
- Reviewing pull requests
- Refactoring existing code
- When code "works but feels wrong"

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
- Classes → nouns (`UserRepository`, `PaymentGateway`)
- Functions → verbs (`calculateTotal`, `sendNotification`)
- Booleans → questions (`isActive`, `hasPermission`, `canEdit`)
- Constants → screaming snake with context (`MAX_RETRY_ATTEMPTS`, not `MAX`)
- No abbreviations unless universally understood (`id`, `url`, `api` are fine; `usr`, `mgr`, `proc` are not)

### 2. Functions Should Do One Thing

A function that does one thing well is easy to name, test, and reuse. A function that does three things is hard to name, impossible to test independently, and couples three responsibilities.

**The test:** Can you describe the function without using "and"? If not, split it.

```typescript
// ❌ Does three things
function processOrder(order: Order): void {
  // Validate
  if (!order.items.length) throw new Error("Empty order");
  if (!order.customer) throw new Error("No customer");

  // Calculate
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
    if (item.taxable) total += item.price * 0.08;
  }

  // Save
  db.orders.insert({ ...order, total, status: "pending" });
  emailService.send(order.customer.email, "Order confirmed");
}

// ✅ Each function does one thing
function validateOrder(order: Order): void {
  if (!order.items.length) throw new InvalidOrderError("Empty order");
  if (!order.customer) throw new InvalidOrderError("No customer");
}

function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((total, item) => {
    const subtotal = item.price * item.quantity;
    const tax = item.taxable ? item.price * TAX_RATE : 0;
    return total + subtotal + tax;
  }, 0);
}

function submitOrder(order: Order): OrderConfirmation {
  validateOrder(order);
  const total = calculateOrderTotal(order.items);
  const saved = db.orders.insert({ ...order, total, status: "pending" });
  emailService.send(order.customer.email, "Order confirmed");
  return { orderId: saved.id, total };
}
```

**Function size limits:**
- **Ideal**: 5-15 lines
- **Acceptable**: up to 30 lines
- **Needs splitting**: 30+ lines
- **Unacceptable**: 50+ lines (split immediately)

### 3. Parameters

- **0-2 parameters**: ideal
- **3 parameters**: acceptable with named/destructured args
- **4+ parameters**: use an options object
- **Boolean parameters**: almost always a code smell — split into two functions

```typescript
// ❌ Boolean flag parameter
function createUser(name: string, isAdmin: boolean): User { ... }

// ✅ Two clear functions
function createUser(name: string): User { ... }
function createAdmin(name: string): User { ... }

// ❌ Too many positional args
function sendEmail(to: string, from: string, subject: string, body: string, cc?: string): void { ... }

// ✅ Options object
interface SendEmailOptions {
  to: string;
  from: string;
  subject: string;
  body: string;
  cc?: string;
}
function sendEmail(options: SendEmailOptions): void { ... }
```

### 4. Comments: Why, Not What

Good code doesn't need comments to explain WHAT it does. Comments should explain WHY — the non-obvious reasoning, business rules, or constraints.

```typescript
// ❌ Comment explains what (redundant)
// Increment counter by one
counter += 1;

// ❌ Comment explains obvious logic
// Check if user is admin
if (user.role === "admin") { ... }

// ✅ Comment explains WHY
// Stripe requires amount in cents, not dollars
const amountInCents = Math.round(price * 100);

// ✅ Comment explains business rule
// FDA regulation 21 CFR Part 11 requires audit trail for all changes
await auditLog.record(changeEvent);

// ✅ Comment warns about non-obvious consequence
// WARNING: This query locks the orders table — avoid running during peak hours
await db.execute(batchUpdateQuery);
```

**Delete these comments immediately:**
- `// TODO: fix this later` — fix it now or create a tracked issue
- `// This is a hack` — then don't commit the hack
- `// I don't know why this works` — figure it out before shipping
- Commented-out code — delete it; git has your history

### 5. Error Handling

Errors are not edge cases — they're expected behavior. Handle them explicitly.

```typescript
// ❌ Swallowing errors
try {
  await saveOrder(order);
} catch (e) {
  console.log("error"); // What error? What happens to the order?
}

// ❌ Generic catch-all
try {
  await processPayment(order);
} catch (e) {
  throw new Error("Something went wrong"); // Useless to the caller
}

// ✅ Specific, actionable error handling
try {
  await processPayment(order);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    return { success: false, code: "INSUFFICIENT_FUNDS", retry: false };
  }
  if (error instanceof PaymentGatewayError) {
    logger.error("Payment gateway failure", { orderId: order.id, error });
    return { success: false, code: "GATEWAY_ERROR", retry: true };
  }
  throw error; // Unknown errors bubble up
}
```

### 6. Don't Repeat Yourself (DRY) — But Don't Over-Abstract

**DRY violation** — same logic copy-pasted in 3+ places:
```typescript
// If you change the tax rate, you need to find and update all copies
const tax1 = price1 * 0.08;
const tax2 = price2 * 0.08;
const tax3 = price3 * 0.08;
```

**Over-abstraction** — premature DRY that couples unrelated things:
```typescript
// ❌ "Universal" handler that handles everything poorly
function handleEntity(type: "user" | "order" | "product", action: "create" | "update" | "delete", data: unknown) { ... }
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
