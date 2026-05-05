---
name: i18n-localization
description: "Internationalization and localization — structured workflow for extracting hardcoded strings, managing translations, ICU MessageFormat, Intl API, RTL support, and audit capabilities."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-21"
---

# i18n & Localization

Production-grade internationalization skill. Covers string extraction, translation management, ICU MessageFormat, all Intl APIs, RTL support, and i18n codebase auditing.

## When to Use

- Extracting hardcoded strings from an existing codebase
- Setting up i18n infrastructure for a new project
- Auditing i18n coverage and completeness
- Adding RTL language support
- Formatting dates, numbers, currencies, or relative times for multiple locales
- Writing or reviewing translation strings with plural/gender/select patterns

## When NOT to Use

- Framework-specific i18n routing (e.g., Astro, Next.js locale routing — use the framework skill)
- Content management / CMS translation workflows — that's a product concern
- Machine translation quality review — out of scope

---

## Core Concepts

| Term | Meaning |
|------|---------|
| **i18n** | Internationalization — making the app translatable |
| **L10n** | Localization — actual translations for a target locale |
| **Locale** | Language + Region code (en-US, tr-TR, ar-SA) |
| **RTL** | Right-to-left scripts (Arabic, Hebrew, Persian, Urdu) |
| **ICU** | International Components for Unicode — standard message format |

---

## Structured Workflow: SCAN → EXTRACT → VERIFY → PRESENT

### Phase 1: SCAN

Assess current state before touching any code.

1. **Detect i18n library in use** — search for `react-i18next`, `next-intl`, `vue-i18n`, `@angular/localize`, `gettext`, or native `Intl` usage
2. **Identify hardcoded user-facing strings** — grep for string literals in UI components and templates:
   - JSX text content: `<h1>Welcome</h1>`, `<p>Loading...</p>`
   - Attribute strings: `placeholder="Search"`, `aria-label="Close"`
   - Alert/confirm/error messages: `alert('Error occurred')`
   - Template literals with user-facing text in renderables
3. **Assess current coverage** — count: already-translated strings vs hardcoded strings, namespaces in use, supported locales
4. **Check for string concatenation** — find patterns like `"Hello, " + name` or `` `Order #${id}` `` in UI layer — these break translation

**Output**: Coverage report with string counts, namespaces, and problem patterns.

### Phase 2: EXTRACT

Wrap strings and generate translation files.

1. **Choose key convention** — use `feature.element.action` (see [ICU reference](references/icu-message-format.md) for full naming rules):
   ```
   auth.login.title          → "Sign In"
   common.buttons.save       → "Save"
   dashboard.stats.revenue   → "Total Revenue"
   ```
2. **Wrap strings** — replace hardcoded text with `t()` calls:
   ```tsx
   // Before
   <h1>Welcome back</h1>
   
   // After
   <h1>{t('dashboard.welcome.title')}</h1>
   ```
3. **Generate/update locale JSON** — create namespace files per feature:
   ```
   locales/en/auth.json
   locales/en/common.json
   locales/en/dashboard.json
   ```
4. **Handle interpolation** — convert concatenation to ICU interpolation:
   ```json
   { "greeting": "Welcome back, {name}" }
   ```
5. **Handle plurals** — use ICU MessageFormat (see [ICU reference](references/icu-message-format.md)):
   ```json
   { "cart.count": "{count, plural, =0 {Cart empty} one {# item} other {# items}}" }
   ```

### Phase 3: VERIFY

Validate correctness before presenting results.

1. **Intl API audit** — verify all locale-sensitive formatting uses `Intl` (see [Intl reference](references/intl-api-patterns.md)):
   - Dates → `Intl.DateTimeFormat` (not `toLocaleDateString` without options)
   - Numbers/currency → `Intl.NumberFormat`
   - Relative time → `Intl.RelativeTimeFormat` (not manual "X days ago")
   - Lists → `Intl.ListFormat` (not `.join(', ')`)
2. **String concatenation check** — confirm zero string concatenation for translated content
3. **RTL compatibility** — if RTL locales are in scope, run the [RTL checklist](references/rtl-support.md)
4. **Missing translations** — verify every key in the default locale exists in all target locales
5. **Unused keys** — check for translation keys that no longer appear in code

### Phase 4: PRESENT

Deliver structured output.

Every i18n task must produce these deliverables:

| Deliverable | Content |
|-------------|---------|
| **Extraction count** | Strings extracted or modified (e.g., "42 strings extracted") |
| **Namespace map** | Key structure and file organization |
| **Translation file changes** | JSON diffs or new files created |
| **Scope summary** | Component / feature / app-wide scope declaration |
| **Problem patterns** | Concatenation, missing Intl usage, RTL issues found |
| **Next steps** | Remaining work — new locales, RTL testing, translator handoff |

---

## Scope Management

| Scope | String Count | Approach |
|-------|-------------|----------|
| **Component** | < 50 strings | Single PR, one namespace |
| **Feature** | < 200 strings | Plan first, single PR, 2-3 namespaces |
| **App-wide** | 200+ strings | Phased plan with progress tracking per namespace |

For app-wide extraction, create a tracking document:

```markdown
## i18n Extraction Progress
- [x] common (32/32 strings)
- [x] auth (18/18 strings)
- [/] dashboard (24/41 strings)
- [ ] settings (0/36 strings)
- [ ] billing (0/28 strings)
```

---

## Implementation Patterns

### React (react-i18next)

```tsx
import { useTranslation } from 'react-i18next';

function Welcome() {
  const { t } = useTranslation('dashboard');
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.subtitle', { name: user.name })}</p>
      <p>{t('stats.itemCount', { count: items.length })}</p>
    </div>
  );
}
```

### Next.js (next-intl)

```tsx
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('Home');
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description', { count: 5 })}</p>
    </div>
  );
}
```

### Python (gettext)

```python
from gettext import gettext as _
from gettext import ngettext

print(_("Welcome to our app"))
print(ngettext("%(count)d item", "%(count)d items", count) % {"count": count})
```

### Vue (vue-i18n)

```vue
<template>
  <h1>{{ $t('dashboard.title') }}</h1>
  <p>{{ $t('dashboard.greeting', { name: user.name }) }}</p>
</template>
```

---

## File Structure

```
locales/
├── en/                    # Default / source locale
│   ├── common.json        # Shared: buttons, labels, status
│   ├── auth.json          # Auth feature strings
│   ├── dashboard.json     # Dashboard feature strings
│   ├── errors.json        # Error messages
│   └── validation.json    # Form validation messages
├── de/                    # German (30% longer text — test wrapping)
│   └── ...
├── ar/                    # Arabic (RTL)
│   └── ...
└── ja/                    # Japanese (CJK — test Segmenter)
    └── ...
```

Namespace rules:
- One JSON file per feature domain
- `common.json` for cross-feature strings (buttons, labels, status words)
- Never exceed 200 keys per file — split by sub-feature if needed

---

## Translator Context

### When to Add Context Comments

Add context when a string is **ambiguous without seeing the UI**:

| Situation | Example |
|-----------|---------|
| **Homonyms** | "Save" — button label? saving to disk? sports save? |
| **Character limits** | Button has 15-char max width |
| **Placeholder context** | What `{name}` refers to (user name? product name?) |
| **Tone** | Formal vs casual for same meaning |
| **UI position** | Same word used as heading vs inline text |

### Context Format

In JSON locale files, use a parallel `_context` key:

```json
{
  "common.save": "Save",
  "common.save_context": "Button label for saving form data. Max 10 characters.",

  "billing.charge": "Charge",
  "billing.charge_context": "Verb — action button to charge customer's payment method.",

  "dashboard.lead": "Lead",
  "dashboard.lead_context": "Noun — a sales lead / prospective customer, not the verb."
}
```

Or in ARB format (Flutter/Dart convention, also used by some JS tools):

```json
{
  "save": "Save",
  "@save": {
    "description": "Button label for saving form data",
    "context": "Appears on all edit forms",
    "maxLength": 10
  }
}
```

### Glossary Management

For domain-specific terminology, maintain a glossary file:

```
locales/glossary.json
```

```json
{
  "terms": {
    "lead": "A prospective customer in the sales pipeline",
    "sprint": "A 2-week development iteration",
    "tenant": "An organization account in the multi-tenant system"
  }
}
```

Share this glossary with translators to ensure consistent terminology across locales.

---

## Reference Material

Detailed reference docs are in the `references/` directory:

| Reference | Content |
|-----------|---------|
| [ICU MessageFormat](references/icu-message-format.md) | Plural, select, ordinal, nested patterns. Key naming conventions. Common mistakes. |
| [Intl API Patterns](references/intl-api-patterns.md) | All 7 `Intl` formatters with usage examples: DateTimeFormat, NumberFormat, RelativeTimeFormat, ListFormat, PluralRules, DisplayNames, Segmenter. |
| [RTL Support](references/rtl-support.md) | CSS logical properties table, component-level patterns, `dir` attribute usage, bidirectional text, testing checklist. |

---

## Pre-Ship Checklist

- [ ] All user-facing strings use translation keys (`t()` / `$t()` / `_()`)
- [ ] Zero string concatenation for translated content
- [ ] Locale files exist for all supported languages
- [ ] All keys in default locale exist in every target locale
- [ ] ICU MessageFormat used for plurals, gender, select (no ternary hacks)
- [ ] Dates use `Intl.DateTimeFormat` — not `.toLocaleDateString()` without options
- [ ] Numbers/currency use `Intl.NumberFormat`
- [ ] Relative times use `Intl.RelativeTimeFormat`
- [ ] Lists use `Intl.ListFormat` — not `.join(', ')`
- [ ] RTL tested (if RTL locales in scope) — run [RTL checklist](references/rtl-support.md)
- [ ] Translator context provided for ambiguous strings
- [ ] Fallback language configured
- [ ] Text doesn't overflow containers (test with German — 30% expansion)

---

## Anti-Patterns

| Pattern | Why It's Wrong | Fix |
|---------|---------------|-----|
| `"Hello, " + name` | Breaks translation word order | `t('greeting', { name })` |
| `count === 1 ? 'item' : 'items'` | Fails for Polish, Arabic, etc. | ICU `{count, plural, ...}` |
| `new Date().toLocaleDateString()` | Inconsistent without explicit options | `Intl.DateTimeFormat(locale, opts)` |
| `list.join(', ')` | Wrong separator for Japanese, Arabic | `Intl.ListFormat(locale)` |
| `margin-left: 1rem` in CSS | Breaks RTL layout | `margin-inline-start: 1rem` |
| `t('btn1')`, `t('btn2')` | Non-semantic keys are unmaintainable | `t('common.buttons.save')` |
| Splitting sentences across keys | Translators can't reorder words | One full sentence per key |
