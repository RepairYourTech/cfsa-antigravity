---
name: regex-patterns
description: "Comprehensive regular expressions guide covering character classes, quantifiers, anchors, groups (capturing, non-capturing, named), lookahead/lookbehind, backreferences, common patterns (email, URL, IP, phone, dates, semver), ReDoS prevention, Unicode support, flags, regex in multiple languages (JS, Python, Go, Rust), debugging techniques, and when NOT to use regex. Use when writing, debugging, or optimizing regular expressions."
version: 1.0.0
---

# Regular Expressions Mastery

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

### Custom Character Classes

```
[aeiou]         Vowels
[^aeiou]        Non-vowels (consonants and non-letters)
[\d\s]          Digit or whitespace
[.\-+]          Literal dot, hyphen, or plus (hyphen escaped or at start/end)
[\[\]]          Literal square brackets
[^\n\r]         Any character except newline
```

### Quantifiers

```
*           Zero or more (greedy)
+           One or more (greedy)
?           Zero or one (optional)
{3}         Exactly 3
{2,5}       Between 2 and 5
{3,}        3 or more

*?          Zero or more (lazy -- match as few as possible)
+?          One or more (lazy)
??          Zero or one (lazy)
{2,5}?      Between 2 and 5 (lazy)

*+          Zero or more (possessive -- no backtracking, not in all engines)
++          One or more (possessive)
```

### Greedy vs Lazy

```
Input:   <b>bold</b> and <b>more bold</b>

<b>.*</b>      Greedy:  matches "<b>bold</b> and <b>more bold</b>" (one match)
<b>.*?</b>     Lazy:    matches "<b>bold</b>" and "<b>more bold</b>" (two matches)
```

---

## 2. Anchors and Boundaries

```
^           Start of string (or start of line with /m flag)
$           End of string (or end of line with /m flag)
\b          Word boundary (between \w and \W)
\B          Non-word boundary
\A          Start of string (never affected by /m flag -- Python, Ruby)
\z          End of string (absolute -- Python, Ruby)
\Z          End of string or before final newline (Python, Ruby)
```

### Word Boundary Examples

```
Pattern:    \bcat\b
Matches:    "The cat sat" (matches "cat")
No match:   "concatenate" (cat is inside a word)

Pattern:    \bpre\w+
Matches:    "prefix", "preview", "predict"
No match:   "compress" (pre not at word boundary)
```

---

## 3. Groups

### Capturing Groups

```
(abc)           Capture group -- stores the match for backreference
(\d{4})         Capture the year
(\w+)@(\w+)    Two capture groups: username and domain

# Backreferences (refer to captured group)
(.)\1           Matches repeated character: "aa", "bb", "cc"
(\w+)\s+\1     Matches repeated word: "the the", "is is"
```

### Named Groups

```javascript
// JavaScript
const re = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const match = re.exec('2025-06-15');
// match.groups.year  === '2025'
// match.groups.month === '06'
// match.groups.day   === '15'
```

```python
# Python
import re
pattern = r'(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})'
match = re.match(pattern, '2025-06-15')
# match.group('year')  == '2025'
# match.group('month') == '06'
```

### Non-Capturing Groups

```
(?:abc)         Groups but does NOT capture (no backreference)

# Use non-capturing groups for alternation without capturing
(?:com|org|net)     Matches "com", "org", or "net" without storing

# Performance: non-capturing groups are slightly faster
```

### Alternation

```
cat|dog         Matches "cat" or "dog"
(cat|dog)s      Matches "cats" or "dogs"
(?:Mr|Mrs|Ms)   Matches title without capturing
```

---

## 4. Lookahead and Lookbehind

### Lookahead (Zero-Width Assertion -- Looks Forward)

```
(?=pattern)     Positive lookahead: followed by pattern
(?!pattern)     Negative lookahead: NOT followed by pattern

# Password validation: at least one digit, one uppercase, one lowercase
^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$

# Match "foo" only if followed by "bar"
foo(?=bar)      Matches "foo" in "foobar", not in "foobaz"

# Match a number NOT followed by a percent sign
\d+(?!%)        Matches "42" in "42 items", not in "42%"
```

### Lookbehind (Zero-Width Assertion -- Looks Backward)

```
(?<=pattern)    Positive lookbehind: preceded by pattern
(?<!pattern)    Negative lookbehind: NOT preceded by pattern

# Match digits preceded by a dollar sign
(?<=\$)\d+      Matches "50" in "$50", not in "50 items"

# Match a word NOT preceded by "un"
(?<!un)happy    Matches "happy" but not "unhappy"

# Note: lookbehinds must be fixed-width in most engines
#   (?<=ab|abc)  -- not allowed in some engines (variable-width)
#   JavaScript supports variable-width lookbehind since ES2018
```

### Practical Lookaround Examples

```javascript
// Format number with commas: 1234567 -> 1,234,567
'1234567'.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// Result: "1,234,567"

// Extract values from key=value pairs without capturing the key
const re = /(?<=name=)\w+/g;
'name=Alice age=30'.match(re);
// Result: ["Alice"]

// Match word that is not inside quotes
// \b\w+\b(?=(?:[^"]*"[^"]*")*[^"]*$)
```

---

## 5. Common Patterns

### Email (Simplified, RFC-Compliant Enough for Most Uses)

```
^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$

# Breakdown:
# ^                     Start of string
# [a-zA-Z0-9._%+\-]+   Local part (letters, digits, dots, etc.)
# @                     Literal @
# [a-zA-Z0-9.\-]+       Domain (letters, digits, dots, hyphens)
# \.                    Literal dot
# [a-zA-Z]{2,}          TLD (at least 2 letters)
# $                     End of string

# WARNING: For production, use a library. RFC 5322 email regex is 6,300+ chars.
```

### URL

```
https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)

# For strict validation, use the URL constructor instead:
# new URL(input) -- throws on invalid URL
```

### IPv4 Address

```
\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b

# Breakdown:
# 25[0-5]        250-255
# 2[0-4]\d       200-249
# [01]?\d\d?     0-199
# Repeated 4 times separated by dots
```

### Phone Number (US)

```
^(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$

# Matches:
# (555) 123-4567
# 555-123-4567
# 5551234567
# +1 555 123 4567
```

### Date (YYYY-MM-DD)

```
^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$

# Validates format but NOT calendar correctness (e.g., 2025-02-31 matches).
# For real date validation, parse with Date or a date library.
```

### Semantic Versioning (SemVer)

```
^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[a-zA-Z\-][\da-zA-Z\-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z\-][\da-zA-Z\-]*))*))?(?:\+[\da-zA-Z\-]+(?:\.[\da-zA-Z\-]+)*)?$

# Matches: 1.0.0, 2.1.3-beta.1, 0.0.1+build.123
```

### Hex Color Code

```
^#(?:[0-9a-fA-F]{3}){1,2}$

# Matches: #fff, #FFF, #a1b2c3, #A1B2C3
```

### Slug (URL-Safe String)

```
^[a-z0-9]+(?:-[a-z0-9]+)*$

# Matches: "hello-world", "my-blog-post", "v2"
# No match: "-start", "end-", "double--dash"
```

---

## 6. ReDoS Prevention (Catastrophic Backtracking)

### The Problem

Some regex patterns can take exponential time on certain inputs, causing denial of service.

```
# DANGEROUS patterns -- O(2^n) on adversarial input
(a+)+$                  Nested quantifiers
(a|a)+$                 Overlapping alternation
(\w+\s*)+$             Repeated group with optional separator

# Example attack:
# Pattern: (a+)+$
# Input:   "aaaaaaaaaaaaaaaaaaaaaaaa!"
# The engine backtracks exponentially trying to match
```

### Prevention Rules

```
# 1. NEVER nest quantifiers: (a+)+, (\w+)*, (.*)+
#    Fix: Flatten to a single quantifier

# BAD:  (a+)+
# GOOD: a+

# 2. NEVER use overlapping alternation with quantifiers
# BAD:  (a|a)+
# GOOD: a+

# 3. NEVER use .* inside a repeated group
# BAD:  (.*,)+
# GOOD: ([^,]*,)+

# 4. Use atomic groups or possessive quantifiers when available
# a++b     Possessive: never backtracks into a+ match
# (?>a+)b  Atomic group: same effect

# 5. Use negated character classes instead of lazy quantifiers
# BAD:  ".*?"           (lazy dot-star between quotes)
# GOOD: "[^"]*"         (negated class -- no backtracking needed)

# 6. Set regex timeouts in production
```

### Language-Specific Timeout

```javascript
// JavaScript: no built-in timeout, use a wrapper
function safeMatch(str, pattern, timeoutMs = 1000) {
  // Run in a worker with a timeout, or use a library like re2
  // Node.js: consider the 're2' package (linear-time regex engine)
}
```

```python
# Python: use the 'regex' package with timeout
import regex
try:
    regex.match(r'(a+)+$', input_string, timeout=1.0)
except regex.error:
    pass  # Timed out
```

### Safe Alternatives

```
# Use RE2 (linear-time regex engine, no backtracking)
# - Available as npm 're2', Python 'google-re2', Go 'regexp' (uses RE2 by default)
# - RE2 does NOT support backreferences or lookaround
# - Trade-off: fewer features, guaranteed linear performance
```

---

## 7. Unicode Support

### Unicode Categories (\p{})

```javascript
// Requires /u or /v flag in JavaScript

// Match any letter (any script)
/\p{L}+/u                  // "Hello", "Bonjour", etc.

// Match any number
/\p{N}+/u                  // "123", etc.

// Match any punctuation
/\p{P}/u

// Match emoji (requires /v flag in JS)
/\p{Emoji}/v

// Match specific scripts
/\p{Script=Greek}+/u
/\p{Script=Han}+/u
/\p{Script=Arabic}+/u

// Common categories:
// \p{L}    Letter (any script)
// \p{Lu}   Uppercase letter
// \p{Ll}   Lowercase letter
// \p{N}    Number
// \p{Nd}   Decimal digit
// \p{P}    Punctuation
// \p{S}    Symbol
// \p{Z}    Separator (spaces)
// \p{M}    Mark (combining characters)
```

### Unicode-Aware Patterns

```javascript
// BAD: ASCII-only word matching
/[a-zA-Z]+/

// GOOD: Unicode-aware word matching
/[\p{L}\p{M}]+/u

// BAD: ASCII-only digit matching
/[0-9]+/

// GOOD: Unicode-aware digit matching (includes Arabic-Indic, etc.)
/\p{Nd}+/u

// Match a "word" in any language
/\b\p{L}+\b/gu
```

---

## 8. Flags

```
g       Global: find all matches, not just the first
i       Case-insensitive
m       Multiline: ^ and $ match line boundaries, not just string boundaries
s       DotAll: . matches newline characters
u       Unicode: enables \p{}, correct handling of surrogate pairs
v       UnicodeSets: extended Unicode support (JS, newer)
d       HasIndices: capture group start/end indices (JS)
y       Sticky: match at exact position (lastIndex)
x       Extended/Verbose: ignore whitespace and allow comments (Python, Ruby, PCRE)
```

### Extended Mode (Verbose Regex)

```python
# Python: re.VERBOSE or re.X
import re

pattern = re.compile(r"""
    ^                       # Start of string
    (?P<protocol>https?)    # Protocol (http or https)
    ://                     # Separator
    (?P<domain>             # Domain group
        [a-zA-Z0-9.-]+     #   Domain name
        \.[a-zA-Z]{2,}     #   TLD
    )
    (?P<path>/\S*)?         # Optional path
    $                       # End of string
""", re.VERBOSE)
```

---

## 9. Regex in Different Languages

### JavaScript

```javascript
// Literal syntax
const re = /^hello\s+(\w+)$/i;

// Constructor (for dynamic patterns)
const pattern = 'hello';
const re2 = new RegExp(`^${escapeRegExp(pattern)}$`, 'i');

// Methods
const match = str.match(re);          // Returns match array or null
const allMatches = [...str.matchAll(/\d+/g)];  // Iterator of all matches
const replaced = str.replace(/foo/g, 'bar');
const parts = str.split(/[,;\s]+/);
const isValid = re.test(str);         // Returns boolean

// Named groups
const { groups } = /(?<year>\d{4})-(?<month>\d{2})/.exec('2025-06');
// groups.year === '2025'

// Escape special characters for use in RegExp constructor
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Python

```python
import re

# Compile for reuse
pattern = re.compile(r'^hello\s+(\w+)$', re.IGNORECASE)

# Methods
match = pattern.match(string)          # Match at start
match = pattern.search(string)         # Search anywhere
matches = pattern.findall(string)      # All matches (list of strings/tuples)
matches = pattern.finditer(string)     # Iterator of Match objects
result = pattern.sub(r'bar', string)   # Replace
parts = pattern.split(string)          # Split

# Match object
if match:
    match.group(0)    # Full match
    match.group(1)    # First capture group
    match.group('name')  # Named group
    match.start()     # Start position
    match.end()       # End position

# Raw strings: always use r'...' for regex patterns in Python
# r'\n' is a literal backslash-n, not a newline
```

### Go

```go
package main

import (
    "fmt"
    "regexp"
)

func main() {
    // Compile (returns error if invalid)
    re, err := regexp.Compile(`^hello\s+(\w+)$`)
    if err != nil {
        panic(err)
    }

    // MustCompile panics on invalid pattern (use for constants)
    re = regexp.MustCompile(`\d+`)

    // Methods
    matched := re.MatchString("hello world")           // bool
    result := re.FindString("abc 123 def")              // "123"
    allResults := re.FindAllString("a1 b2 c3", -1)     // ["1", "2", "3"]
    submatch := re.FindStringSubmatch("hello world")    // ["hello world", "world"]
    replaced := re.ReplaceAllString("foo 123", "NUM")   // "foo NUM"

    // Note: Go uses RE2 engine -- no backreferences or lookaround
    fmt.Println(matched, result, allResults, submatch, replaced)
}
```

### Rust

```rust
use regex::Regex;

fn main() {
    // Compile
    let re = Regex::new(r"^hello\s+(\w+)$").unwrap();

    // Methods
    let is_match = re.is_match("hello world");               // bool
    let caps = re.captures("hello world").unwrap();
    let name = &caps[1];                                      // "world"

    // Named captures
    let re = Regex::new(r"(?P<year>\d{4})-(?P<month>\d{2})").unwrap();
    let caps = re.captures("2025-06").unwrap();
    let year = &caps["year"];   // "2025"

    // Find all matches
    let re = Regex::new(r"\d+").unwrap();
    let matches: Vec<&str> = re.find_iter("a1 b2 c3").map(|m| m.as_str()).collect();
    // ["1", "2", "3"]

    // Replace
    let result = re.replace_all("foo 123 bar 456", "NUM");
    // "foo NUM bar NUM"

    // Note: Rust regex crate uses finite automata (like RE2)
    // No backreferences or lookaround by default
    // Use the 'fancy-regex' crate for those features
}
```

---

## 10. Debugging Regex

### Techniques

```
1. Use regex101.com (supports PCRE, Python, JavaScript, Go, Rust)
   - Shows match highlighting in real time
   - Explains each token
   - Shows capture groups
   - Has a debugger that shows backtracking steps

2. Break complex patterns into named pieces:

   JavaScript:
   const year = '(?<year>\\d{4})';
   const month = '(?<month>0[1-9]|1[0-2])';
   const day = '(?<day>0[1-9]|[12]\\d|3[01])';
   const datePattern = new RegExp(`^${year}-${month}-${day}$`);

3. Test incrementally:
   - Start with the simplest subpattern
   - Add one element at a time
   - Test with both matching and non-matching inputs

4. Check edge cases:
   - Empty string
   - Very long string
   - Unicode characters
   - Newlines
   - String with only whitespace

5. Log intermediate results:
   const re = /(\w+)\s+(\w+)/;
   const match = re.exec(input);
   console.log('Full match:', match[0]);
   console.log('Group 1:', match[1]);
   console.log('Group 2:', match[2]);
```

### Common Debugging Mistakes

```
# Forgetting to escape special characters
/file.txt/           # Matches "file_txt" too (dot matches anything)
/file\.txt/          # Correct: matches only "file.txt"

# Forgetting anchors
/\d{3}/              # Matches "123" inside "abc12345def"
/^\d{3}$/            # Matches only strings that are exactly 3 digits

# Greedy matching eating too much
/<.*>/               # On "<a>text</a>", matches the entire string
/<[^>]*>/            # Correct: matches "<a>" and "</a>" separately

# Multiline misunderstanding
/^line$/             # Only matches if entire string is "line"
/^line$/m            # Matches "line" on any line in a multiline string
```

---

## 11. When NOT to Use Regex

### HTML/XML Parsing

```
# NEVER parse HTML with regex. Use a DOM parser.

# BAD:
/<div class="title">(.*?)<\/div>/

# Why it fails:
# - Nested divs
# - Attributes in different orders
# - Self-closing tags
# - Comments containing tags
# - Malformed HTML

# GOOD:
# JavaScript: DOMParser, cheerio
# Python: BeautifulSoup, lxml
```

### Complex Grammars

```
# Regex cannot parse:
# - Nested parentheses of arbitrary depth: ((()))
# - Matching braces in programming languages
# - JSON, YAML, TOML
# - Programming language syntax
# - Mathematical expressions

# Use a parser (PEG, ANTLR, tree-sitter) for these.
```

### Simple String Operations

```
# Do not use regex when simple string methods work:

# BAD:  /^prefix/.test(str)
# GOOD: str.startsWith('prefix')

# BAD:  /suffix$/.test(str)
# GOOD: str.endsWith('suffix')

# BAD:  str.replace(/foo/g, 'bar')  (for literal strings)
# GOOD: str.replaceAll('foo', 'bar')

# BAD:  /^$/.test(str)
# GOOD: str.length === 0

# BAD:  str.split(/,/)
# GOOD: str.split(',')               (for literal delimiters)
```

### URL Parsing

```
# Do not regex URLs. Use the URL API.

# BAD:
const match = url.match(/^(https?):\/\/([^\/]+)(\/.*)?$/);

# GOOD:
const parsed = new URL(url);
// parsed.protocol, parsed.hostname, parsed.pathname, parsed.searchParams
```

### When Regex IS the Right Tool

```
# Regex excels at:
# - Pattern matching in text (log parsing, data extraction)
# - Input validation (format checks)
# - Search and replace with pattern awareness
# - Tokenizing simple grammars (CSV fields, log lines)
# - Text cleanup (normalize whitespace, strip control characters)
# - Splitting on complex delimiters
```

---

## 12. Critical Reminders

### ALWAYS

- Use raw strings (Python: `r'...'`) to avoid double-escaping backslashes
- Anchor patterns with `^` and `$` when validating entire strings
- Use non-capturing groups `(?:...)` when you do not need the captured value
- Prefer negated character classes `[^"]*` over lazy quantifiers `.*?` for performance
- Test with adversarial inputs to check for ReDoS
- Use named groups for readability in complex patterns
- Escape user input before inserting into regex (prevent injection)
- Use the `/u` flag in JavaScript for Unicode correctness
- Comment complex regex patterns (use verbose mode or build from named parts)

### NEVER

- Parse HTML, XML, JSON, or any recursive grammar with regex
- Use nested quantifiers without understanding backtracking: `(a+)+`
- Trust regex for email validation beyond basic format checks (use a library)
- Hardcode regex for international content without Unicode support
- Use `.` when you mean a specific character class (be explicit)
- Use `.*` in a pattern that processes user input without backtracking protection
- Forget that `^` and `$` behave differently with and without the `/m` flag
- Build regex from untrusted user input without escaping special characters
