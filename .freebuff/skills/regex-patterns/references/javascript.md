# JavaScript Regex Patterns

Language-specific API for the `regex-patterns` skill. Read `SKILL.md` first for universal syntax.

---

## Syntax

```javascript
// Literal
const re = /^hello\s+(\w+)$/i;

// Constructor (dynamic patterns)
const pattern = 'hello';
const re2 = new RegExp(`^${escapeRegExp(pattern)}$`, 'i');

// Escape special characters
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

## Methods

```javascript
str.match(re)                    // Match array or null
[...str.matchAll(/\d+/g)]       // Iterator of all matches
str.replace(/foo/g, 'bar')      // Replace
str.split(/[,;\s]+/)            // Split
re.test(str)                    // Boolean
```

## Named Groups

```javascript
const { groups } = /(?<year>\d{4})-(?<month>\d{2})/.exec('2025-06');
// groups.year === '2025'
```

## Unicode

```javascript
// Requires /u or /v flag
/\p{L}+/u                  // Any letter (any script)
/\p{Nd}+/u                 // Decimal digit (any script)
/[\p{L}\p{M}]+/u           // Unicode-aware word matching
/\p{Script=Greek}+/u       // Script-specific
```

## Number Formatting with Lookaround

```javascript
'1234567'.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// "1,234,567"
```

## ReDoS Prevention

```javascript
// No built-in timeout — use re2 package for linear-time engine
const RE2 = require('re2');
const re = new RE2(/pattern/);
```
