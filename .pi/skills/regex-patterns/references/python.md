# Python Regex Patterns

Language-specific API for the `regex-patterns` skill. Read `SKILL.md` first for universal syntax.

---

## Core API

```python
import re

# Compile for reuse
pattern = re.compile(r'^hello\s+(\w+)$', re.IGNORECASE)

# Methods
match = pattern.match(string)          # Match at start
match = pattern.search(string)         # Search anywhere
matches = pattern.findall(string)      # All matches (list)
matches = pattern.finditer(string)     # Iterator of Match objects
result = pattern.sub(r'bar', string)   # Replace
parts = pattern.split(string)          # Split

# Match object
if match:
    match.group(0)           # Full match
    match.group(1)           # First capture group
    match.group('name')      # Named group
    match.start()            # Start position
    match.end()              # End position

# Raw strings: ALWAYS use r'...' for regex
# r'\n' is literal backslash-n, not a newline
```

## Named Groups

```python
pattern = r'(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})'
match = re.match(pattern, '2025-06-15')
match.group('year')   # '2025'
```

## Verbose Mode

```python
pattern = re.compile(r"""
    ^                       # Start of string
    (?P<protocol>https?)    # Protocol
    ://                     # Separator
    (?P<domain>             # Domain group
        [a-zA-Z0-9.-]+     #   Domain name
        \.[a-zA-Z]{2,}     #   TLD
    )
    (?P<path>/\S*)?         # Optional path
    $                       # End of string
""", re.VERBOSE)
```

## ReDoS Prevention

```python
# Use the 'regex' package with timeout
import regex
try:
    regex.match(r'(a+)+$', input_string, timeout=1.0)
except regex.error:
    pass  # Timed out
```

## Unicode

```python
# Python re does NOT support \p{} syntax
# Use the 'regex' package for Unicode property support:
import regex
regex.findall(r'\p{L}+', text)  # All letters (any script)
```
