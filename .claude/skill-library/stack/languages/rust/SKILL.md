---
name: rust
description: Rust development patterns for safe, performant systems code. Covers ownership/borrowing/lifetimes, error handling, traits, async with tokio, cargo workspaces, unsafe boundaries, serde, testing, and concurrency primitives.
version: 1.0.0
---

# Rust Development Patterns

Expert guidance for writing safe, performant Rust code. Covers the ownership model, error handling idioms, trait-based abstractions, async programming with tokio, cargo workspace patterns, and the discipline required to write correct concurrent systems.

## When to Use This Skill

- Building performance-critical systems (network services, CLI tools, game engines)
- Writing memory-safe code without garbage collection
- Implementing concurrent or parallel systems
- Creating libraries with strong API guarantees
- Integrating with C/C++ code via FFI
- Building WebAssembly modules

## Core Concepts

### 1. Ownership, Borrowing, and Lifetimes

The foundation of Rust's memory safety guarantees.

```rust
// Ownership: each value has exactly one owner
fn take_ownership(s: String) {
    println!("{s}");
} // s is dropped here

// Borrowing: references without taking ownership
fn borrow(s: &str) {
    println!("{s}");
} // s is NOT dropped -- caller still owns it

// Mutable borrowing: only ONE mutable reference at a time
fn modify(s: &mut String) {
    s.push_str(" world");
}

// Lifetimes: compiler tracks how long references are valid
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// Lifetime elision rules handle most cases automatically.
// Only annotate when the compiler asks you to.

// Struct with lifetime
struct Excerpt<'a> {
    text: &'a str,
}

impl<'a> Excerpt<'a> {
    fn level(&self) -> i32 {
        3
    }

    // Return type lifetime tied to self
    fn announce(&self, announcement: &str) -> &'a str {
        println!("Attention: {announcement}");
        self.text
    }
}
```

**Rules to internalize:**

| Rule | Implication |
|------|-------------|
| One owner at a time | Move semantics by default for non-Copy types |
| Multiple `&T` OR one `&mut T` | No data races at compile time |
| References must not outlive data | Lifetimes enforce this statically |
| `Copy` types are stack-duplicated | Integers, floats, bools, chars, tuples of Copy types |

### 2. Error Handling: Result, Option, thiserror, anyhow

```rust
use std::fs;
use std::io;

// Result for recoverable errors
fn read_config(path: &str) -> Result<String, io::Error> {
    fs::read_to_string(path)
}

// The ? operator for propagation
fn parse_config(path: &str) -> Result<Config, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    let config: Config = serde_json::from_str(&content)?;
    Ok(config)
}

// thiserror for library error types (structured, typed)
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("configuration file not found: {path}")]
    ConfigNotFound { path: String },

    #[error("invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("IO error")]
    Io(#[from] io::Error),
}

// anyhow for application-level error handling (convenience)
use anyhow::{Context, Result};

fn setup() -> Result<()> {
    let config = fs::read_to_string("config.toml")
        .context("Failed to read config file")?;
    let parsed: Config = toml::from_str(&config)
        .context("Failed to parse config TOML")?;
    Ok(())
}

// Option for values that may or may not exist
fn find_user(id: u64) -> Option<User> {
    users.iter().find(|u| u.id == id).cloned()
}

// Combining Option and Result
fn get_user_email(id: u64) -> Result<String> {
    let user = find_user(id)
        .ok_or_else(|| anyhow::anyhow!("User {id} not found"))?;
    Ok(user.email.clone())
}
```

**Decision matrix:**

| Context | Use |
|---------|-----|
| Library crate | `thiserror` with custom enum |
| Application binary | `anyhow` for convenience |
| Value might not exist | `Option<T>` |
| Operation can fail | `Result<T, E>` |
| Unrecoverable bug | `panic!` (only for programmer errors) |

### 3. Traits and Generics

```rust
// Define a trait
trait Summary {
    fn summarize(&self) -> String;

    // Default implementation
    fn preview(&self) -> String {
        format!("{}...", &self.summarize()[..20.min(self.summarize().len())])
    }
}

// Implement for a type
struct Article {
    title: String,
    content: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{}: {}", self.title, &self.content[..100.min(self.content.len())])
    }
}

// Generic function with trait bound
fn print_summary(item: &impl Summary) {
    println!("{}", item.summarize());
}

// Multiple bounds with where clause
fn process<T>(item: &T) -> String
where
    T: Summary + std::fmt::Display + Clone,
{
    let cloned = item.clone();
    format!("{cloned}: {}", item.summarize())
}

// Trait objects for dynamic dispatch
fn get_summaries(items: &[Box<dyn Summary>]) -> Vec<String> {
    items.iter().map(|item| item.summarize()).collect()
}

// Associated types
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}

// Supertraits
trait PrettyPrint: std::fmt::Display + std::fmt::Debug {
    fn pretty(&self) -> String {
        format!("{self:#?}")
    }
}
```

### 4. Async with Tokio

```rust
use tokio::time::{sleep, Duration};
use tokio::sync::{mpsc, Mutex};
use std::sync::Arc;

// Basic async function
async fn fetch_url(url: &str) -> Result<String, reqwest::Error> {
    let response = reqwest::get(url).await?;
    response.text().await
}

// Spawning tasks
async fn process_urls(urls: Vec<String>) -> Vec<String> {
    let mut handles = Vec::new();

    for url in urls {
        let handle = tokio::spawn(async move {
            fetch_url(&url).await.unwrap_or_default()
        });
        handles.push(handle);
    }

    let mut results = Vec::new();
    for handle in handles {
        if let Ok(result) = handle.await {
            results.push(result);
        }
    }
    results
}

// Shared state with Arc<Mutex<T>>
async fn shared_counter() {
    let counter = Arc::new(Mutex::new(0u64));
    let mut handles = Vec::new();

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(tokio::spawn(async move {
            let mut lock = counter.lock().await;
            *lock += 1;
        }));
    }

    for handle in handles {
        handle.await.unwrap();
    }
    println!("Counter: {}", *counter.lock().await);
}

// Channels for message passing
async fn producer_consumer() {
    let (tx, mut rx) = mpsc::channel::<String>(100);

    let producer = tokio::spawn(async move {
        for i in 0..10 {
            tx.send(format!("message {i}")).await.unwrap();
            sleep(Duration::from_millis(100)).await;
        }
    });

    let consumer = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            println!("Received: {msg}");
        }
    });

    producer.await.unwrap();
    consumer.await.unwrap();
}

// Tokio main entry point
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    producer_consumer().await;
    Ok(())
}
```

### 5. Cargo Workspace Patterns

```toml
# Root Cargo.toml
[workspace]
members = [
    "crates/core",
    "crates/api",
    "crates/cli",
]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"

[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
```

```toml
# crates/core/Cargo.toml
[package]
name = "my-core"
version.workspace = true
edition.workspace = true

[dependencies]
serde.workspace = true
anyhow.workspace = true
```

**Workspace layout:**

```
my-project/
  Cargo.toml          # Workspace root
  crates/
    core/             # Shared types, business logic
      Cargo.toml
      src/lib.rs
    api/              # HTTP server
      Cargo.toml
      src/main.rs
    cli/              # CLI binary
      Cargo.toml
      src/main.rs
```

### 6. Unsafe Code Boundaries

```rust
// Keep unsafe blocks as small as possible
// Wrap unsafe in safe abstractions

// WRONG -- large unsafe block
unsafe {
    let ptr = allocate(size);
    initialize(ptr, data);
    validate(ptr);  // This does not need to be unsafe
    process(ptr);   // Neither does this
}

// RIGHT -- minimal unsafe surface
let ptr = unsafe { allocate(size) };
unsafe { initialize(ptr, data) };
validate(ptr);  // Safe code outside unsafe block
process(ptr);

// Safe wrapper around unsafe FFI
pub fn get_system_time() -> u64 {
    // SAFETY: libc::time is safe to call with a null pointer,
    // which tells it to only return the value without writing to memory.
    unsafe { libc::time(std::ptr::null_mut()) as u64 }
}

// Document SAFETY invariants for every unsafe block
```

### 7. Serde Serialization

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub user_id: u64,
    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
    #[serde(default)]
    pub is_active: bool,
    #[serde(rename = "type")]
    pub account_type: AccountType,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "kind", content = "data")]
pub enum AccountType {
    Standard,
    Premium { expires_at: String },
    Admin { permissions: Vec<String> },
}

// Custom deserialization
use serde::de::{self, Visitor};

struct DurationVisitor;

impl<'de> Visitor<'de> for DurationVisitor {
    type Value = std::time::Duration;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        formatter.write_str("a duration in seconds as a number")
    }

    fn visit_u64<E: de::Error>(self, v: u64) -> Result<Self::Value, E> {
        Ok(std::time::Duration::from_secs(v))
    }
}
```

### 8. Pattern Matching

```rust
// Match on enums
enum Command {
    Quit,
    Echo(String),
    Move { x: i32, y: i32 },
    Color(u8, u8, u8),
}

fn handle(cmd: Command) {
    match cmd {
        Command::Quit => println!("Quitting"),
        Command::Echo(msg) => println!("{msg}"),
        Command::Move { x, y } => println!("Moving to ({x}, {y})"),
        Command::Color(r, g, b) => println!("Color: rgb({r}, {g}, {b})"),
    }
}

// Guards and bindings
fn classify(x: i32) -> &'static str {
    match x {
        0 => "zero",
        n if n < 0 => "negative",
        1..=10 => "small positive",
        n @ 11..=100 => {
            println!("medium: {n}");
            "medium positive"
        }
        _ => "large positive",
    }
}

// if let for single-pattern matching
if let Some(value) = optional_value {
    println!("Got: {value}");
}

// let-else (Rust 1.65+) for early returns
let Some(user) = find_user(id) else {
    return Err(anyhow::anyhow!("user not found"));
};
```

### 9. Smart Pointers

```rust
use std::rc::Rc;
use std::sync::Arc;
use std::cell::RefCell;

// Box<T> -- heap allocation, single owner
let boxed: Box<dyn Summary> = Box::new(article);

// Rc<T> -- reference counting, single thread
let shared = Rc::new(String::from("shared data"));
let clone1 = Rc::clone(&shared);
let clone2 = Rc::clone(&shared);
println!("Reference count: {}", Rc::strong_count(&shared)); // 3

// Arc<T> -- atomic reference counting, multi-thread safe
let shared = Arc::new(vec![1, 2, 3]);
let handle = {
    let shared = Arc::clone(&shared);
    std::thread::spawn(move || {
        println!("{:?}", shared);
    })
};
handle.join().unwrap();

// RefCell<T> -- interior mutability (runtime borrow checking)
let data = RefCell::new(vec![1, 2, 3]);
data.borrow_mut().push(4);
println!("{:?}", data.borrow());

// Common combo: Rc<RefCell<T>> for shared mutable state (single thread)
// Arc<Mutex<T>> for shared mutable state (multi-thread)
```

### 10. Iterators

```rust
// Iterator adaptors are lazy -- nothing happens until consumed
let result: Vec<i32> = (0..100)
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .take(10)
    .collect();

// Implementing Iterator for custom types
struct Counter {
    count: u32,
    max: u32,
}

impl Counter {
    fn new(max: u32) -> Self {
        Counter { count: 0, max }
    }
}

impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

// Useful iterator methods
let sum: u32 = Counter::new(10).sum();
let product: u32 = Counter::new(5).product();
let found = Counter::new(100).find(|&x| x > 50);
let any_even = Counter::new(10).any(|x| x % 2 == 0);
let all_positive = Counter::new(10).all(|x| x > 0);

// Chaining iterators
let combined: Vec<u32> = Counter::new(5)
    .chain(Counter::new(3))
    .collect(); // [1, 2, 3, 4, 5, 1, 2, 3]

// zip for parallel iteration
let pairs: Vec<(u32, u32)> = Counter::new(3)
    .zip(Counter::new(3))
    .collect(); // [(1,1), (2,2), (3,3)]
```

### 11. Testing Patterns

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_functionality() {
        let result = add(2, 3);
        assert_eq!(result, 5);
    }

    #[test]
    fn test_with_descriptive_name() {
        let user = User::new("alice", "alice@example.com");
        assert_eq!(user.name(), "alice");
        assert!(user.is_valid());
    }

    #[test]
    #[should_panic(expected = "index out of bounds")]
    fn test_panic_case() {
        let v = vec![1, 2, 3];
        let _ = v[99];
    }

    #[test]
    fn test_result_based() -> Result<(), Box<dyn std::error::Error>> {
        let config = parse_config("test.toml")?;
        assert_eq!(config.port, 8080);
        Ok(())
    }

    // Property-based testing with proptest
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn test_string_roundtrip(s in "\\PC*") {
            let encoded = encode(&s);
            let decoded = decode(&encoded)?;
            prop_assert_eq!(s, decoded);
        }
    }
}

// Integration tests go in tests/ directory
// tests/integration_test.rs
use my_crate::public_api;

#[test]
fn test_full_workflow() {
    let result = public_api::process("input");
    assert!(result.is_ok());
}
```

### 12. Concurrency: Send and Sync

```rust
// Send: safe to transfer ownership between threads
// Sync: safe to share references between threads
//
// Most types are Send + Sync automatically.
// Rc<T> is neither Send nor Sync -- use Arc<T> instead.
// Cell<T> and RefCell<T> are Send but not Sync.
// MutexGuard is Sync but not Send.

use std::sync::{Mutex, RwLock};

// RwLock for read-heavy workloads
let config = Arc::new(RwLock::new(Config::default()));

// Multiple readers
let reader = config.read().unwrap();
println!("{:?}", *reader);
drop(reader);

// Single writer
let mut writer = config.write().unwrap();
writer.debug = true;
drop(writer);

// Rayon for data parallelism
use rayon::prelude::*;

let sum: i64 = (0..1_000_000i64)
    .into_par_iter()
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .sum();
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| `.unwrap()` in production code | Panics on None/Err | Use `?`, `unwrap_or`, `unwrap_or_else` |
| `.clone()` to avoid borrow issues | Hides ownership problems | Fix the ownership structure |
| Large `unsafe` blocks | Hard to audit safety | Minimize unsafe surface, document invariants |
| `String` everywhere | Unnecessary allocations | Use `&str` for borrowed strings |
| Ignoring clippy warnings | Misses common bugs | Run `cargo clippy -- -D warnings` |
| `Box<dyn Error>` in libraries | Callers cannot match on error types | Use `thiserror` enum |
| Blocking in async context | Starves the executor | Use `tokio::task::spawn_blocking` |

## Common Commands

```bash
cargo build                     # Debug build
cargo build --release           # Optimized build
cargo test                      # Run all tests
cargo test -- --nocapture       # Show println output in tests
cargo clippy -- -D warnings     # Lint with warnings as errors
cargo fmt                       # Format code
cargo doc --open                # Generate and open documentation
cargo bench                     # Run benchmarks
cargo audit                     # Check for security vulnerabilities
```

## Resources

- **The Rust Book**: https://doc.rust-lang.org/book/
- **Rust by Example**: https://doc.rust-lang.org/rust-by-example/
- **Rustlings**: https://github.com/rust-lang/rustlings
- **Tokio Tutorial**: https://tokio.rs/tokio/tutorial
- **Serde Guide**: https://serde.rs/
- **Clippy Lints**: https://rust-lang.github.io/rust-clippy/
- **Rust API Guidelines**: https://rust-lang.github.io/api-guidelines/
