---
name: regex-patterns
description: "Comprehensive regular expressions guide covering character classes, quantifiers, anchors, groups, lookahead/lookbehind, common patterns (email, URL, IP, phone, dates, semver), ReDoS prevention, Unicode support, flags, debugging, and when NOT to use regex."
version: 2.0.0
---

# Regular Expressions Mastery

## Stack-Specific References

Regex syntax is mostly universal but API usage differs by language. After reading the patterns below, read the reference for your language:

| Language | Reference | Engine Notes |
|----------|-----------|-------------|
| JavaScript | `references/javascript.md` | V8/SpiderMonkey — full PCRE-like features |
| Python | `references/python.md` | `re` module — PCRE-like, supports verbose mode |
| Go | `references/go.md` | RE2 — no backreferences or lookaround |
| Rust | `references/rust.md` | regex crate — RE2-like; `fancy-regex` for lookaround |

---

## 1. Fundamentals

### Character Classes

```
.           Any character except newline (unless /s flag)
\d          Digit [0-9]
\D          Non-digit [^0-9]
\w          Word character [a-zA-Z0-9_]
\W          Non-word character [^a-zA-Z0-9_]
\s          Whitespace [ \t\n\r\f\v]
\S          Non-whitespace
[abc]       Any of a, b, or c
[^abc]      Not a, b, or c
[a-z]       Range: a through z
[a-zA-Z]    Any letter
[0-9a-fA-F] Hexadecimal digit
```

### Quantifiers

```
*           Zero or more (greedy)
+           One or more (greedy)
?           Zero or one (optional)
{3}         Exactly 3
{2,5}       Between 2 and 5
{3,}        3 or more

*?          Zero or more (lazy)
+?          One or more (lazy)
{2,5}?      Between 2 and 5 (lazy)

*+          Zero or more (possessive — not in all engines)
++          One or more (possessive)
```

### Greedy vs Lazy

```
Input:   <b>bold</b> and <b>more bold</b>

<b>.*</b>      Greedy:  matches entire string (one match)
<b>.*?</b>     Lazy:    matches "<b>bold</b>" and "<b>more bold</b>" (two matches)
```

---

## 2. Anchors and Boundaries

```
^           Start of string (or line with multiline flag)
$           End of string (or line with multiline flag)
\b          Word boundary (between \w and \W)
\B          Non-word boundary
\A          Start of string (never affected by multiline — Python, Ruby)
\z          End of string (absolute — Python, Ruby)
```

### Word Boundary Examples

```
\bcat\b     Matches "cat" in "The cat sat" — not in "concatenate"
\bpre\w+    Matches "prefix", "preview" — not "compress"
```

---

## 3. Groups

### Capturing Groups

```
(abc)           Capture group — stores match for backreference
(\d{4})         Capture the year
(\w+)@(\w+)    Two capture groups: username and domain

# Backreferences
(.)\1           Matches repeated character: "aa", "bb"
(\w+)\s+\1     Matches repeated word: "the the"
```

### Named Groups

Named group syntax varies by language:
- JavaScript: `(?<name>pattern)`
- Python: `(?P<name>pattern)`
- Go: `(?P<name>pattern)` (RE2 syntax)

### Non-Capturing Groups

```
(?:abc)         Groups but does NOT capture (no backreference)
(?:com|org|net) Matches without storing
```

### Alternation

```
cat|dog         Matches "cat" or "dog"
(cat|dog)s      Matches "cats" or "dogs"
(?:Mr|Mrs|Ms)   Matches title without capturing
```

---

## 4. Lookahead and Lookbehind

### Lookahead

```
(?=pattern)     Positive: followed by pattern
(?!pattern)     Negative: NOT followed by pattern

# Password: at least one digit, one uppercase, one lowercase
^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$

# Match "foo" only if followed by "bar"
foo(?=bar)      Matches "foo" in "foobar", not in "foobaz"

# Match number NOT followed by percent
\d+(?!%)        Matches "42" in "42 items", not in "42%"
```

### Lookbehind

```
(?<=pattern)    Positive: preceded by pattern
(?<!pattern)    Negative: NOT preceded by pattern

(?<=\$)\d+      Matches "50" in "$50", not in "50 items"
(?<!un)happy    Matches "happy" but not "unhappy"

# Note: lookbehinds must be fixed-width in most engines
# Go RE2 does NOT support lookaround at all
```

---

## 5. Common Patterns

### Email (Simplified)
```
^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$
# WARNING: For production, use a library. RFC 5322 regex is 6,300+ chars.
```

### URL
```
https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)
# For strict validation, use the URL parser in your language instead.
```

### IPv4
```
\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b
```

### Phone (US)
```
^(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$
```

### Date (YYYY-MM-DD)
```
^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$
# Validates format, NOT calendar correctness.
```

### Semantic Versioning
```
^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[a-zA-Z\-][\da-zA-Z\-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z\-][\da-zA-Z\-]*))*))?(?:\+[\da-zA-Z\-]+(?:\.[\da-zA-Z\-]+)*)?$
```

### Hex Color
```
^#(?:[0-9a-fA-F]{3}){1,2}$
```

### Slug
```
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

---

## 6. ReDoS Prevention

### Dangerous Patterns — O(2^n)

```
(a+)+$                  Nested quantifiers
(a|a)+$                 Overlapping alternation
(\w+\s*)+$             Repeated group with optional separator
```

### Prevention Rules

1. NEVER nest quantifiers: `(a+)+` → flatten to `a+`
2. NEVER use overlapping alternation with quantifiers
3. NEVER use `.*` inside a repeated group — use `([^,]*,)+` instead
4. Use atomic groups or possessive quantifiers when available
5. Use negated character classes `[^"]*` over lazy `.*?`
6. Set regex timeouts in production
7. Consider RE2 (linear-time, no backtracking) for user inputs

---

## 7. Unicode Support

### Unicode Categories (\p{})

```
\p{L}    Letter (any script)
\p{Lu}   Uppercase letter
\p{Ll}   Lowercase letter
\p{N}    Number
\p{Nd}   Decimal digit
\p{P}    Punctuation
\p{S}    Symbol
\p{Z}    Separator (spaces)
\p{M}    Mark (combining characters)

# Script-specific
\p{Script=Greek}
\p{Script=Han}
\p{Script=Arabic}
```

> **Note:** Unicode property support varies by engine. JavaScript requires `/u` flag. Go RE2 supports `\p{L}` etc. Python `re` does NOT support `\p{}`—use the `regex` package.

---

## 8. Flags

```
g       Global: find all matches
i       Case-insensitive
m       Multiline: ^ and $ match line boundaries
s       DotAll: . matches newline characters
u       Unicode: enables \p{}, correct surrogate pair handling
x       Extended/Verbose: ignore whitespace, allow comments (Python, Ruby, PCRE)
y       Sticky: match at exact position (JavaScript)
```

---

## 9. Debugging

1. Use [regex101.com](https://regex101.com) — supports multiple engines
2. Break complex patterns into named pieces and compose them
3. Test incrementally — start simple, add one element at a time
4. Test edge cases: empty string, very long string, Unicode, newlines
5. Log intermediate results (capture groups)

### Common Mistakes

```
/file.txt/           # Dot matches anything — matches "file_txt"
/file\.txt/          # Correct: escaped dot

/\d{3}/              # Matches "123" inside "abc12345def"
/^\d{3}$/            # Correct: anchored to exact 3 digits

/<.*>/               # Greedy: matches entire "<a>text</a>"
/<[^>]*>/            # Correct: negated class
```

---

## 10. When NOT to Use Regex

### Use a Parser Instead
- HTML/XML — use DOM parser (cheerio, BeautifulSoup, lxml)
- JSON, YAML, TOML — use a parser
- Nested structures — regex cannot handle arbitrary depth
- Programming language syntax — use tree-sitter, ANTLR

### Use String Methods Instead
```
# Prefer:
startsWith('prefix')    over    /^prefix/.test(str)
endsWith('suffix')      over    /suffix$/.test(str)
includes('text')        over    /text/.test(str)
split(',')              over    split(/,/)
```

### When Regex IS Right
- Pattern matching in text (log parsing, data extraction)
- Input validation (format checks)
- Search and replace with pattern awareness
- Tokenizing simple grammars (CSV, log lines)
- Text cleanup (normalize whitespace, strip control characters)

---

## 11. Critical Reminders

### ALWAYS
- Anchor with `^` and `$` when validating entire strings
- Use non-capturing groups `(?:...)` when you don't need the value
- Prefer negated character classes `[^"]*` over lazy `.*?`
- Test with adversarial inputs for ReDoS
- Escape user input before inserting into regex
- Use Unicode flag for international content

### NEVER
- Parse HTML/XML/JSON with regex
- Use nested quantifiers without understanding backtracking
- Trust regex for email validation beyond basic format
- Use `.` when you mean a specific character class
- Build regex from untrusted input without escaping
