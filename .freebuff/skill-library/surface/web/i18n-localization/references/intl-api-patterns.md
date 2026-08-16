# Intl API Patterns Reference

Complete reference for all 7 JavaScript `Intl` formatters with locale-aware usage patterns.

## 1. Intl.DateTimeFormat

Format dates and times according to locale conventions.

```ts
// Basic
new Intl.DateTimeFormat('en-US').format(date)
// → "3/21/2026"

new Intl.DateTimeFormat('de-DE').format(date)
// → "21.3.2026"

// With options
new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'short',
}).format(date)
// → "Saturday, March 21, 2026 at 3:01 PM"

// Specific parts
new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(date)
// → "Saturday, March 21, 2026"

// Time zone aware
new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  timeStyle: 'long',
}).format(date)
// → "4:01:22 AM JST"
```

### Key Options

| Option | Values |
|--------|--------|
| `dateStyle` | `full`, `long`, `medium`, `short` |
| `timeStyle` | `full`, `long`, `medium`, `short` |
| `weekday` | `long`, `short`, `narrow` |
| `month` | `numeric`, `2-digit`, `long`, `short`, `narrow` |
| `hour12` | `true`, `false` |
| `timeZone` | IANA timezone string |

---

## 2. Intl.NumberFormat

Format numbers, currencies, percentages, and units.

```ts
// Currency
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(1234.56)
// → "$1,234.56"

new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
}).format(1234)
// → "￥1,234"

// Percentage
new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
}).format(0.867)
// → "86.7%"

// Unit
new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'kilometer-per-hour',
  unitDisplay: 'short',
}).format(120)
// → "120 km/h"

// Compact notation
new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
}).format(1500000)
// → "1.5M"

// Accounting (negative in parentheses)
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencySign: 'accounting',
}).format(-1234)
// → "($1,234.00)"
```

### Common Units

`acre`, `byte`, `celsius`, `centimeter`, `day`, `degree`, `fahrenheit`, `foot`, `gallon`, `gigabyte`, `gram`, `hectare`, `hour`, `inch`, `kilobyte`, `kilogram`, `kilometer`, `kilometer-per-hour`, `liter`, `megabyte`, `meter`, `mile`, `mile-per-hour`, `minute`, `month`, `ounce`, `percent`, `pound`, `second`, `terabyte`, `week`, `yard`, `year`

---

## 3. Intl.RelativeTimeFormat

Format relative time expressions ("2 days ago", "in 3 hours").

```ts
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day')      // → "yesterday"
rtf.format(-2, 'day')      // → "2 days ago"
rtf.format(1, 'hour')      // → "in 1 hour"
rtf.format(0, 'day')       // → "today"

// With numeric: 'always'
const rtfAlways = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
rtfAlways.format(-1, 'day')  // → "1 day ago" (not "yesterday")
```

### Style Options

| Option | `long` | `short` | `narrow` |
|--------|--------|---------|----------|
| `-1 day` | "1 day ago" | "1 day ago" | "1d ago" |
| `3 month` | "in 3 months" | "in 3 mo." | "in 3mo." |

### Valid Units

`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`

### Helper: Auto-Select Unit

```ts
function getRelativeTime(date: Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  if (Math.abs(diffHr) < 24)  return rtf.format(diffHr, 'hour');
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
  return rtf.format(Math.round(diffDay / 30), 'month');
}
```

---

## 4. Intl.ListFormat

Format lists with locale-aware conjunctions and disjunctions.

```ts
// Conjunction (and)
new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })
  .format(['Alice', 'Bob', 'Charlie'])
// → "Alice, Bob, and Charlie"

// Disjunction (or)
new Intl.ListFormat('en', { style: 'long', type: 'disjunction' })
  .format(['Red', 'Blue', 'Green'])
// → "Red, Blue, or Green"

// Unit (no conjunction)
new Intl.ListFormat('en', { style: 'narrow', type: 'unit' })
  .format(['6 lb', '4 oz'])
// → "6 lb 4 oz"

// Other locales
new Intl.ListFormat('ja', { style: 'long', type: 'conjunction' })
  .format(['東京', '大阪', '名古屋'])
// → "東京、大阪、名古屋"
```

---

## 5. Intl.PluralRules

Determine the plural category for a number in a given locale.

```ts
// Cardinal (counting)
const pr = new Intl.PluralRules('en');
pr.select(0)   // → "other"
pr.select(1)   // → "one"
pr.select(2)   // → "other"

// Ordinal (ranking)
const prOrd = new Intl.PluralRules('en', { type: 'ordinal' });
prOrd.select(1)   // → "one"     → 1st
prOrd.select(2)   // → "two"     → 2nd
prOrd.select(3)   // → "few"     → 3rd
prOrd.select(4)   // → "other"   → 4th

// Arabic — demonstrates zero, one, two, few, many, other
const prAr = new Intl.PluralRules('ar');
prAr.select(0)    // → "zero"
prAr.select(1)    // → "one"
prAr.select(2)    // → "two"
prAr.select(5)    // → "few"
prAr.select(11)   // → "many"
prAr.select(100)  // → "other"
```

### Use Case: Building Suffix Maps

```ts
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const pr = new Intl.PluralRules('en', { type: 'ordinal' });

function ordinal(n: number): string {
  return `${n}${suffixes.get(pr.select(n))}`;
}

ordinal(1)   // → "1st"
ordinal(22)  // → "22nd"
ordinal(43)  // → "43rd"
```

---

## 6. Intl.DisplayNames

Get locale-aware display names for regions, languages, scripts, and currencies.

```ts
// Region names
const regionNames = new Intl.DisplayNames('en', { type: 'region' });
regionNames.of('US')  // → "United States"
regionNames.of('JP')  // → "Japan"
regionNames.of('DE')  // → "Germany"

// In German
new Intl.DisplayNames('de', { type: 'region' }).of('US')
// → "Vereinigte Staaten"

// Language names
const langNames = new Intl.DisplayNames('en', { type: 'language' });
langNames.of('fr')     // → "French"
langNames.of('zh-Hans') // → "Simplified Chinese"

// Currency names
const currNames = new Intl.DisplayNames('en', { type: 'currency' });
currNames.of('EUR')  // → "Euro"
currNames.of('JPY')  // → "Japanese Yen"

// Script names
const scriptNames = new Intl.DisplayNames('en', { type: 'script' });
scriptNames.of('Latn')  // → "Latin"
scriptNames.of('Arab')  // → "Arabic"
```

### Types

| Type | Input | Example |
|------|-------|---------|
| `region` | ISO 3166 code | `of('US')` → "United States" |
| `language` | BCP 47 tag | `of('fr')` → "French" |
| `currency` | ISO 4217 code | `of('EUR')` → "Euro" |
| `script` | ISO 15924 code | `of('Latn')` → "Latin" |

---

## 7. Intl.Segmenter

Segment text into words, sentences, or graphemes. Critical for CJK languages and complex scripts that lack whitespace word boundaries.

```ts
// Word segmentation (English)
const wordSeg = new Intl.Segmenter('en', { granularity: 'word' });
const words = [...wordSeg.segment('Hello, world!')].filter(s => s.isWordLike);
// → [{ segment: "Hello", ... }, { segment: "world", ... }]

// Word segmentation (Japanese — no spaces)
const jpSeg = new Intl.Segmenter('ja', { granularity: 'word' });
const jpWords = [...jpSeg.segment('すべての人間は')].filter(s => s.isWordLike);
// → [{ segment: "すべて" }, { segment: "の" }, { segment: "人間" }, { segment: "は" }]

// Grapheme segmentation (emoji clusters)
const graphSeg = new Intl.Segmenter('en', { granularity: 'grapheme' });
const graphemes = [...graphSeg.segment('👨‍👩‍👧‍👦 Hello')].map(s => s.segment);
// → ["👨‍👩‍👧‍👦", " ", "H", "e", "l", "l", "o"]

// Sentence segmentation
const sentSeg = new Intl.Segmenter('en', { granularity: 'sentence' });
const sentences = [...sentSeg.segment('Hello! How are you? Fine.')].map(s => s.segment);
// → ["Hello! ", "How are you? ", "Fine."]
```

### Granularity Options

| Granularity | Use Case |
|-------------|----------|
| `grapheme` | Character counting (handles emoji, diacritics, CJK) |
| `word` | Word counting, search indexing, CJK tokenization |
| `sentence` | Sentence-level processing, text summarization |

### Why Not `String.split()`?

- `'👨‍👩‍👧‍👦'.length` → **11** (JS string length counts UTF-16 code units)
- `[...'👨‍👩‍👧‍👦']` → **7** (spread counts code points, not graphemes)
- `Intl.Segmenter` → **1** grapheme (correct visual character count)

---

## General Rules

1. **Always pass the user's locale** — never hardcode `'en-US'`
2. **Cache formatter instances** — creating `new Intl.*Format()` is expensive; reuse across renders
3. **Use `resolvedOptions()`** to inspect what the formatter actually resolved
4. **Server-side rendering**: Node.js has full ICU data since v13; Deno and Bun also support all Intl APIs
5. **Polyfill strategy**: `@formatjs/intl-*` packages for older environments
