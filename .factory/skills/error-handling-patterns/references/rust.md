# Rust Error Handling Patterns

Language-specific patterns for the `error-handling-patterns` skill. Read `SKILL.md` first for universal methodology.

---

## Result and Option Types

```rust
use std::fs::File;
use std::io::{self, Read};

// Result type for operations that can fail
fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;  // ? operator propagates errors
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

// Custom error types
#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(std::num::ParseIntError),
    NotFound(String),
    Validation(String),
}

impl From<io::Error> for AppError {
    fn from(error: io::Error) -> Self {
        AppError::Io(error)
    }
}

// Using custom error type
fn read_number_from_file(path: &str) -> Result<i32, AppError> {
    let contents = read_file(path)?;  // Auto-converts io::Error
    let number = contents.trim().parse()
        .map_err(AppError::Parse)?;   // Explicitly convert ParseIntError
    Ok(number)
}

// Option for nullable values
fn find_user(id: &str) -> Option<User> {
    users.iter().find(|u| u.id == id).cloned()
}

// Combining Option and Result
fn get_user_age(id: &str) -> Result<u32, AppError> {
    find_user(id)
        .ok_or_else(|| AppError::NotFound(id.to_string()))
        .map(|user| user.age)
}
```

## Error Crate Patterns

For production Rust applications, consider using error crates:

- **`thiserror`** — derive macro for custom error types with automatic `Display` and `From` implementations
- **`anyhow`** — flexible error type for applications (not libraries) with context chaining
- **`eyre`** — enhanced error reporting with `color-eyre` for human-readable error output

```rust
// With thiserror
use thiserror::Error;

#[derive(Error, Debug)]
enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Parse error: {0}")]
    Parse(#[from] std::num::ParseIntError),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Validation failed: {0}")]
    Validation(String),
}

// With anyhow (application code)
use anyhow::{Context, Result};

fn process_config(path: &str) -> Result<Config> {
    let contents = std::fs::read_to_string(path)
        .context("Failed to read config file")?;
    let config: Config = serde_json::from_str(&contents)
        .context("Failed to parse config JSON")?;
    Ok(config)
}
```

## Panic vs Result

```rust
// Use Result for expected, recoverable errors
fn parse_input(s: &str) -> Result<i32, ParseIntError> {
    s.parse()
}

// Use panic for programming bugs / invariant violations
fn get_element(v: &[i32], index: usize) -> i32 {
    // This is a bug if index is out of bounds — crash is correct
    v[index]
}

// Use .expect() with a message for "should never fail" cases
let config = load_config().expect("Config file must exist at startup");
```
