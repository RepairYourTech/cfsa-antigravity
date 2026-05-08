# RTL Support Reference

Comprehensive reference for right-to-left (RTL) language support in web applications. Covers CSS logical properties, component patterns, testing, and bidirectional text handling.

## RTL Languages

| Language | Code | Script |
|----------|------|--------|
| Arabic | `ar` | Arabic |
| Hebrew | `he` | Hebrew |
| Persian (Farsi) | `fa` | Arabic |
| Urdu | `ur` | Arabic |
| Pashto | `ps` | Arabic |
| Sindhi | `sd` | Arabic |
| Kurdish (Sorani) | `ckb` | Arabic |
| Dhivehi | `dv` | Thaana |

---

## CSS Logical Properties

Replace all physical direction properties with logical equivalents. This is the single most impactful RTL change — logical properties automatically flip for RTL layouts.

### Full Mapping Table

| Physical Property | Logical Property |
|-------------------|-----------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `margin-top` | `margin-block-start` |
| `margin-bottom` | `margin-block-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `padding-top` | `padding-block-start` |
| `padding-bottom` | `padding-block-end` |
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `border-top-left-radius` | `border-start-start-radius` |
| `border-top-right-radius` | `border-start-end-radius` |
| `border-bottom-left-radius` | `border-end-start-radius` |
| `border-bottom-right-radius` | `border-end-end-radius` |
| `left` | `inset-inline-start` |
| `right` | `inset-inline-end` |
| `top` | `inset-block-start` |
| `bottom` | `inset-block-end` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |
| `float: left` | `float: inline-start` |
| `float: right` | `float: inline-end` |
| `width` | `inline-size` |
| `height` | `block-size` |
| `min-width` | `min-inline-size` |
| `max-width` | `max-inline-size` |

### Shorthand Properties

```css
/* Physical (avoid) */
.card {
  margin: 0 16px 0 24px;
  padding: 8px 16px 8px 24px;
}

/* Logical (use) */
.card {
  margin-inline-start: 24px;
  margin-inline-end: 16px;
  padding-inline-start: 24px;
  padding-inline-end: 16px;
  padding-block: 8px;
}
```

---

## Component-Level RTL Patterns

### Icon Mirroring

Icons that imply direction must be mirrored in RTL:

```css
/* Mirror directional icons */
[dir="rtl"] .icon-arrow-forward,
[dir="rtl"] .icon-chevron-right,
[dir="rtl"] .icon-reply,
[dir="rtl"] .icon-undo,
[dir="rtl"] .icon-external-link {
  transform: scaleX(-1);
}
```

**Do NOT mirror**: Icons without directional meaning — checkmarks, stars, hearts, plus signs, media controls (play/pause follow universal convention).

### Progress Bars

```css
.progress-bar {
  /* Use logical properties — no RTL override needed */
  border-start-start-radius: 4px;
  border-end-start-radius: 4px;
}

.progress-fill {
  /* Flex handles direction automatically */
  /* But transform-based progress needs flipping: */
  transform-origin: inline-start;
}

/* If using transform for animation: */
[dir="rtl"] .progress-fill {
  transform-origin: right;
}
```

### Navigation & Sidebars

```css
.sidebar {
  /* Logical placement — auto-flips for RTL */
  inset-inline-start: 0;
  border-inline-end: 1px solid var(--border);
}

.nav-arrow-back {
  /* Back arrow points left in LTR, right in RTL */
  transform: scaleX(1);
}

[dir="rtl"] .nav-arrow-back {
  transform: scaleX(-1);
}
```

### Form Layouts

```css
.form-field {
  text-align: start; /* Not 'left' */
}

.form-label {
  margin-inline-end: 8px; /* Space between label and input */
}

.input-icon-prefix {
  inset-inline-start: 12px; /* Icon inside input, start side */
}

.input-icon-suffix {
  inset-inline-end: 12px; /* Icon inside input, end side */
}
```

### Tables

```css
.table th,
.table td {
  text-align: start;
  padding-inline-start: 16px;
  padding-inline-end: 8px;
}

/* Numeric columns always LTR */
.table .col-number {
  direction: ltr;
  text-align: end;
}
```

---

## `dir` Attribute Usage

### `dir="rtl"` — Explicit Direction

Set on `<html>` for the entire document, or on individual elements for mixed content:

```html
<html lang="ar" dir="rtl">
```

### `dir="auto"` — Browser Detection

Let the browser determine direction from content. Use for user-generated content:

```html
<input type="text" dir="auto" placeholder="Type in any language">
<p dir="auto">{{ userContent }}</p>
```

**When to use `dir="auto"`**:
- User-generated text fields (comments, messages, bios)
- Dynamic content where the language is unknown at render time

**When NOT to use `dir="auto"`**:
- Your own UI text (you know the locale — set it explicitly)
- Document-level `<html>` tag (always explicit)

### Setting Direction from Locale

```ts
function getDirection(locale: string): 'ltr' | 'rtl' {
  const rtlLocales = new Set([
    'ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ckb', 'dv'
  ]);
  const lang = locale.split('-')[0];
  return rtlLocales.has(lang) ? 'rtl' : 'ltr';
}

// Apply to document
document.documentElement.dir = getDirection(currentLocale);
document.documentElement.lang = currentLocale;
```

---

## Bidirectional Text Handling

When LTR and RTL content mix within a single element, Unicode bidirectional algorithm needs hints.

### `<bdi>` — Bidirectional Isolation

Isolates inline content from surrounding direction context. Use for user names, dynamic content in a different script:

```html
<!-- Without bdi: "User مريم sent 3 messages" renders incorrectly -->
<!-- With bdi: each segment maintains its direction -->
<p>User <bdi>مريم</bdi> sent 3 messages</p>
```

### `<bdo>` — Bidirectional Override

Forces a specific direction regardless of content:

```html
<bdo dir="ltr">12345</bdo>  <!-- Forces LTR for this span -->
<bdo dir="rtl">Hello</bdo>  <!-- Forces RTL — renders "olleH" -->
```

Use sparingly — mainly for demonstrating direction effects or code display.

### Unicode Control Characters

For contexts where HTML elements aren't available (plain text, JSON):

| Character | Code Point | Purpose |
|-----------|------------|---------|
| LRM (Left-to-Right Mark) | `\u200E` | Force LTR context |
| RLM (Right-to-Left Mark) | `\u200F` | Force RTL context |
| LRE (LTR Embedding) | `\u202A` | Start LTR embedding |
| RLE (RTL Embedding) | `\u202B` | Start RTL embedding |
| PDF (Pop Direction) | `\u202C` | End embedding |
| LRI (LTR Isolate) | `\u2066` | Start LTR isolation (preferred) |
| RLI (RTL Isolate) | `\u2067` | Start RTL isolation (preferred) |
| PDI (Pop Isolate) | `\u2069` | End isolation |

**Prefer isolates (LRI/RLI/PDI) over embeddings (LRE/RLE/PDF)** — isolates are the modern approach and prevent more rendering issues.

---

## RTL Testing Checklist

### Visual Inspection

- [ ] Layout mirrors correctly — sidebar, nav, content panels swap sides
- [ ] Text alignment: body text is right-aligned, numeric data is LTR
- [ ] Icons: directional icons (arrows, reply, undo) are mirrored
- [ ] Icons: non-directional icons (checkmark, star, play) are NOT mirrored
- [ ] Progress bars fill from right to left
- [ ] Breadcrumbs: separator direction is correct (← instead of →)
- [ ] Form fields: labels and inputs align correctly
- [ ] Scrollbar: appears on the left side

### Functional Testing

- [ ] Keyboard navigation follows RTL flow (Tab moves right-to-left)
- [ ] Swipe gestures are mirrored (swipe right = back in RTL)
- [ ] Drag-and-drop respects RTL axis
- [ ] Tooltips and popovers position correctly (start/end, not left/right)
- [ ] Modal dialogs: close button on start side (left in RTL)
- [ ] Dropdown menus open toward inline-end

### Content Testing

- [ ] Mixed LTR/RTL content renders correctly (usernames, URLs in RTL text)
- [ ] Numbers display correctly within RTL context
- [ ] Phone numbers and email addresses maintain LTR direction
- [ ] Currency symbols position correctly per locale
- [ ] Dates follow locale format (not all RTL locales use RTL date format)

### Browser Testing

- [ ] Chrome: verify with `chrome://settings/languages` direction override
- [ ] Firefox: verify with `layout.css.devtools.enabled` for logical property inspector
- [ ] Safari: verify iOS Safari with RTL system language
- [ ] Quick toggle: add `document.documentElement.dir = 'rtl'` to devtools console
