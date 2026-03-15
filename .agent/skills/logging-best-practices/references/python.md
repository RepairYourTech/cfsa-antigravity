# Python Logging Patterns

Language-specific patterns for the `logging-best-practices` skill. Read `SKILL.md` first for universal methodology.

---

## Libraries

| Library | Use Case |
|---------|----------|
| **structlog** | Structured logging with processors |
| **logging** | Standard library (structlog wraps it) |

## structlog Setup

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Usage
logger.info("user_created",
    user_id=user.id,
    email=user.email,
    request_id=request.id
)

logger.error("payment_failed",
    error=str(error),
    order_id=order.id,
    amount=order.total,
    user_id=user.id
)
```
