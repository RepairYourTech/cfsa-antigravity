# Rust Regex Patterns

Language-specific API for the `regex-patterns` skill. Read `SKILL.md` first for universal syntax.

---

## Core API

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
}
```

## Important: Engine Limitations

The `regex` crate uses finite automata (like RE2):
- ✅ Guaranteed linear-time — immune to ReDoS
- ❌ No backreferences by default
- ❌ No lookahead/lookbehind by default
- Use the **`fancy-regex`** crate for those features (trades ReDoS safety for feature completeness)
