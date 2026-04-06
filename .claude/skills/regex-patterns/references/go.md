# Go Regex Patterns

Language-specific API for the `regex-patterns` skill. Read `SKILL.md` first for universal syntax.

---

## Core API

```go
package main

import (
    "fmt"
    "regexp"
)

func main() {
    // Compile (returns error)
    re, err := regexp.Compile(`^hello\s+(\w+)$`)
    if err != nil {
        panic(err)
    }

    // MustCompile panics on invalid pattern (for constants)
    re = regexp.MustCompile(`\d+`)

    // Methods
    matched := re.MatchString("hello world")           // bool
    result := re.FindString("abc 123 def")              // "123"
    allResults := re.FindAllString("a1 b2 c3", -1)     // ["1", "2", "3"]
    submatch := re.FindStringSubmatch("hello world")    // ["hello world", "world"]
    replaced := re.ReplaceAllString("foo 123", "NUM")   // "foo NUM"

    fmt.Println(matched, result, allResults, submatch, replaced)
}
```

## Important: RE2 Engine

Go uses the **RE2 engine** which guarantees linear-time execution (no ReDoS). Trade-off:
- ✅ No backtracking — immune to ReDoS
- ❌ No backreferences (`\1`)
- ❌ No lookahead/lookbehind
- ✅ Supports `\p{L}` Unicode properties
