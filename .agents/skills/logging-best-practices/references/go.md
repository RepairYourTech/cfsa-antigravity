# Go Logging Patterns

Language-specific patterns for the `logging-best-practices` skill. Read `SKILL.md` first for universal methodology.

---

## Libraries

| Library | Use Case |
|---------|----------|
| **zap** | High-performance structured logging |
| **zerolog** | Zero-allocation JSON logger |

## zap Setup

```go
package main

import "go.uber.org/zap"

func main() {
    // Production config (JSON output)
    logger, _ := zap.NewProduction()
    defer logger.Sync()

    // Development config (human-readable)
    // logger, _ := zap.NewDevelopment()

    logger.Info("User created",
        zap.String("userId", user.ID),
        zap.String("email", user.Email),
        zap.String("requestId", req.ID),
    )

    logger.Error("Payment processing failed",
        zap.Error(err),
        zap.String("orderId", order.ID),
        zap.Float64("amount", order.Total),
        zap.String("userId", user.ID),
    )

    // Sugared logger for convenience (slightly slower)
    sugar := logger.Sugar()
    sugar.Infow("User login",
        "userId", user.ID,
        "ip", req.IP,
    )
}
```
