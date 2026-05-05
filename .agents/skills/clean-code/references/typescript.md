# TypeScript Clean Code Patterns

Language-specific patterns for the `clean-code` skill. Read `SKILL.md` first for universal principles.

---

## Single Responsibility

```typescript
// ❌ Does three things
function processOrder(order: Order): void {
  if (!order.items.length) throw new Error("Empty order");
  if (!order.customer) throw new Error("No customer");

  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
    if (item.taxable) total += item.price * 0.08;
  }

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

## Options Objects Over Positional Args

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

## Error Handling

```typescript
// ❌ Swallowing errors
try {
  await saveOrder(order);
} catch (e) {
  console.log("error");
}

// ❌ Generic catch-all
try {
  await processPayment(order);
} catch (e) {
  throw new Error("Something went wrong");
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

## Comments

```typescript
// ❌ Redundant
// Increment counter by one
counter += 1;

// ❌ Obvious
// Check if user is admin
if (user.role === "admin") { ... }

// ✅ Explains WHY
// Stripe requires amount in cents, not dollars
const amountInCents = Math.round(price * 100);

// ✅ Business rule
// FDA regulation 21 CFR Part 11 requires audit trail for all changes
await auditLog.record(changeEvent);

// ✅ Non-obvious consequence
// WARNING: This query locks the orders table — avoid running during peak hours
await db.execute(batchUpdateQuery);
```
