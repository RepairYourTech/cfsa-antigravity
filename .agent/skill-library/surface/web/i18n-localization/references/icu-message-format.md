# ICU MessageFormat Reference

Comprehensive ICU MessageFormat patterns for translation strings. Used by react-i18next, next-intl, FormatJS, and most mature i18n libraries.

## Key Naming Conventions

### Semantic Nesting

Keys use `feature.element.action` convention with dot-separated namespaces:

```
auth.login.title          → "Sign In"
auth.login.submit         → "Sign In"
auth.login.error.invalid  → "Invalid credentials"
auth.register.title       → "Create Account"
dashboard.stats.revenue   → "Total Revenue"
settings.profile.save     → "Save Changes"
```

### Namespace Boundaries

| Scope | Namespace | Purpose |
|-------|-----------|---------|
| Shared | `common.*` | Buttons, labels, status words used across features |
| Feature | `feature.*` | Feature-specific strings (`auth.*`, `billing.*`) |
| Errors | `errors.*` | Error messages (or nest under feature: `auth.errors.*`) |
| Validation | `validation.*` | Form validation messages |

### Rules

- **Max depth**: 4 levels (`feature.section.element.state`)
- **Use camelCase** for multi-word segments: `auth.forgotPassword.title`
- **Never use positional keys**: `item1`, `item2` — use semantic names
- **Never embed content in keys**: `auth.signInToYourAccount` — use `auth.login.title`
- **Shared strings go in `common`**: "Cancel", "Save", "Delete", "Loading..."

---

## Plural Patterns

### Cardinal Plurals

```
{count, plural,
  =0 {No items}
  one {# item}
  other {# items}
}
```

Usage in JSON locale file:

```json
{
  "cart.itemCount": "{count, plural, =0 {Your cart is empty} one {# item in cart} other {# items in cart}}"
}
```

### CLDR Plural Categories

Not all languages use `one` and `other`. The full CLDR set:

| Category | Used By | Example |
|----------|---------|---------|
| `zero` | Arabic, Latvian | 0 items |
| `one` | English, German, French | 1 item |
| `two` | Arabic, Hebrew, Slovenian | 2 items |
| `few` | Czech, Polish, Russian | 2–4 items |
| `many` | Arabic, Polish, Russian | 5–20 items |
| `other` | All languages (required) | Fallback |

**Always include `other`** — it's the required fallback for every language.

### Language-Aware Example (Polish)

```
{count, plural,
  one {# plik}
  few {# pliki}
  many {# plików}
  other {# pliku}
}
```

---

## Select Patterns

### Gender Select

```
{gender, select,
  male {He liked your post}
  female {She liked your post}
  other {They liked your post}
}
```

### Arbitrary Select

```
{status, select,
  pending {Order is being processed}
  shipped {Order has been shipped}
  delivered {Order was delivered}
  other {Unknown status}
}
```

### Role-Based Select

```
{role, select,
  admin {You have full access}
  editor {You can edit content}
  viewer {You have read-only access}
  other {Contact admin for access}
}
```

---

## Ordinal Patterns

```
{n, selectordinal,
  one {#st}
  two {#nd}
  few {#rd}
  other {#th}
}
```

Usage: "You finished in {n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} place"

---

## Nested Patterns

### Plural + Variable

```
{count, plural,
  =0 {No notifications}
  one {{name} sent you a message}
  other {{name} and # others sent you messages}
}
```

### Select + Plural

```
{gender, select,
  male {{count, plural,
    one {He has # new message}
    other {He has # new messages}
  }}
  female {{count, plural,
    one {She has # new message}
    other {She has # new messages}
  }}
  other {{count, plural,
    one {They have # new message}
    other {They have # new messages}
  }}
}
```

> **Nesting limit**: Keep nesting to 2 levels maximum. Beyond that, split into separate keys or use programmatic composition.

---

## Rich Text / Tags

Some libraries (react-i18next, FormatJS) support inline tags:

```
"terms.agree": "I agree to the <link>Terms of Service</link>"
```

```tsx
// react-i18next
t('terms.agree', {
  link: (chunks) => <a href="/terms">{chunks}</a>
})
```

---

## Number and Date in Messages

### Embedded Number Format

```
"price.display": "Total: {amount, number, currency}"
```

### Embedded Date Format

```
"event.date": "Event on {date, date, medium}"
```

### Available Styles

| Type | Styles |
|------|--------|
| `number` | `integer`, `currency`, `percent` |
| `date` | `short`, `medium`, `long`, `full` |
| `time` | `short`, `medium`, `long`, `full` |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| String concatenation: `t('hello') + name` | Use interpolation: `t('hello', { name })` |
| Hardcoded plural: `count + ' items'` | Use `{count, plural, ...}` pattern |
| Missing `other` in plural/select | Always include `other` as fallback |
| Splitting sentences across keys | Keep full sentences in one key |
| Embedding HTML in translation values | Use rich text / tag patterns |
| Pluralizing with ternary: `count === 1 ? ... : ...` | Use ICU plural — CLDR handles all languages |
