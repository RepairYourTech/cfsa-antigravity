---
name: tauri
description: Provides comprehensive Tauri 2.0 desktop application development patterns including Rust backend commands, event system, state management, plugin architecture, window management, system tray, file system access, security model, auto-updater, IPC patterns, multi-window communication, deep linking, building and distribution, and testing strategies. Use when building cross-platform desktop apps with Tauri.
version: 1.0.0
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Tauri 2.0 Desktop Application Development Patterns

## Overview

Expert guide for building secure, lightweight, cross-platform desktop applications with Tauri 2.0. Tauri uses the OS webview for the frontend and a Rust backend, producing small binaries with low memory usage. Covers commands, events, state, plugins, security, distribution, and testing.

## When to Use

- Building cross-platform desktop applications (Windows, macOS, Linux)
- When small binary size and low memory usage matter (vs Electron)
- When Rust backend performance is needed for file processing, crypto, or computation
- When security is a priority (capability-based permissions, no Node.js in production)
- Building system utilities, developer tools, or productivity apps
- When you want web frontend skills (React, Vue, Svelte, etc.) for the UI
- When you need deep OS integration (tray, notifications, file system)

## Instructions

1. **Security first**: Define capabilities and permissions before writing commands
2. **Minimize the Rust surface**: Only expose what the frontend needs via commands
3. **Use the event system** for backend-to-frontend communication (not polling)
4. **Manage state properly**: Use `tauri::State` for shared backend state
5. **Scope file access**: Never give blanket file system access
6. **Test commands in isolation**: Rust unit tests for backend logic, E2E for integration
7. **Use plugins**: Prefer official plugins over custom implementations

## Examples

### Project Structure

```
my-app/
  src-tauri/
    src/
      main.rs             # Tauri entry point
      lib.rs              # Command and state definitions
      commands/
        mod.rs            # Command module exports
        file_ops.rs       # File operation commands
        settings.rs       # Settings commands
      state/
        mod.rs            # State module exports
        app_state.rs      # Application state
    capabilities/
      main.json           # Default capability
      admin.json          # Admin capability
    Cargo.toml            # Rust dependencies
    tauri.conf.json       # Tauri configuration
    build.rs              # Build script
  src/                    # Frontend source (React, Vue, etc.)
    App.tsx
    lib/
      tauri.ts            # Typed command wrappers
      events.ts           # Event type definitions
  package.json
```

## Constraints and Warnings

- **Webview differences**: Rendering varies between platforms (WebView2 on Windows, WebKit on macOS/Linux)
- **No Node.js**: The frontend runs in a webview, not Node.js -- no `require()` or `fs` module
- **Rust learning curve**: Backend commands require Rust knowledge
- **Linux webview**: WebKitGTK must be installed; version varies by distro
- **CSP is mandatory**: Content Security Policy is enforced by default
- **Async commands**: Long-running operations must be async to avoid blocking the main thread
- **State is per-process**: Managed state is not shared across multiple app instances
- **Plugin compatibility**: Check plugin compatibility with Tauri 2.0 (many v1 plugins need updates)

## Core Concepts

### Application Entry Point

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    my_app_lib::run();
}
```

```rust
// src-tauri/src/lib.rs
mod commands;
mod state;

use state::app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::file_ops::read_file,
            commands::file_ops::write_file,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Commands (Rust Backend to Frontend IPC)

Commands are Rust functions callable from the frontend via `invoke`:

```rust
// src-tauri/src/commands/file_ops.rs
use serde::{Deserialize, Serialize};
use tauri::command;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub size: u64,
    pub is_directory: bool,
    pub modified: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileError {
    pub message: String,
    pub code: String,
}

// Simple command -- synchronous
#[command]
pub fn read_file(path: String) -> Result<String, FileError> {
    fs::read_to_string(&path).map_err(|e| FileError {
        message: e.to_string(),
        code: "READ_ERROR".to_string(),
    })
}

// Async command -- for I/O operations
#[command]
pub async fn list_directory(path: String) -> Result<Vec<FileInfo>, FileError> {
    let entries = tokio::fs::read_dir(&path)
        .await
        .map_err(|e| FileError {
            message: e.to_string(),
            code: "DIR_ERROR".to_string(),
        })?;

    let mut files = Vec::new();
    let mut entries = entries;

    while let Some(entry) = entries.next_entry().await.map_err(|e| FileError {
        message: e.to_string(),
        code: "ENTRY_ERROR".to_string(),
    })? {
        let metadata = entry.metadata().await.map_err(|e| FileError {
            message: e.to_string(),
            code: "METADATA_ERROR".to_string(),
        })?;

        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            size: metadata.len(),
            is_directory: metadata.is_dir(),
            modified: metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs()),
        });
    }

    Ok(files)
}

// Command with state access
#[command]
pub fn write_file(
    path: String,
    content: String,
    state: tauri::State<'_, crate::state::app_state::AppState>,
) -> Result<(), FileError> {
    // Check if writing is allowed
    if !state.is_write_enabled() {
        return Err(FileError {
            message: "Writing is disabled".to_string(),
            code: "WRITE_DISABLED".to_string(),
        });
    }

    fs::write(&path, &content).map_err(|e| FileError {
        message: e.to_string(),
        code: "WRITE_ERROR".to_string(),
    })
}
```

### Calling Commands from the Frontend

```typescript
// src/lib/tauri.ts
import { invoke } from "@tauri-apps/api/core";

// Type-safe command wrappers
export interface FileInfo {
  name: string;
  size: number;
  is_directory: boolean;
  modified: number | null;
}

export interface FileError {
  message: string;
  code: string;
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function listDirectory(path: string): Promise<FileInfo[]> {
  return invoke<FileInfo[]>("list_directory", { path });
}

export async function writeFile(
  path: string,
  content: string
): Promise<void> {
  return invoke<void>("write_file", { path, content });
}
```

```tsx
// src/App.tsx
import { useState } from "react";
import { listDirectory, type FileInfo } from "./lib/tauri";

function App() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleBrowse() {
    try {
      const result = await listDirectory("/home/user/documents");
      setFiles(result);
      setError(null);
    } catch (err) {
      setError((err as { message: string }).message);
    }
  }

  return (
    <div>
      <button onClick={handleBrowse}>Browse Files</button>
      {error && <p className="error">{error}</p>}
      <ul>
        {files.map((file) => (
          <li key={file.name}>
            {file.is_directory ? "[DIR] " : ""}
            {file.name} ({file.size} bytes)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Event System

Events enable bidirectional communication without request/response:

```rust
// src-tauri/src/commands/file_ops.rs
use tauri::{command, AppHandle, Emitter};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub current: u64,
    pub total: u64,
    pub file_name: String,
}

#[command]
pub async fn process_files(
    paths: Vec<String>,
    app: AppHandle,
) -> Result<(), FileError> {
    let total = paths.len() as u64;

    for (i, path) in paths.iter().enumerate() {
        // Emit progress to frontend
        app.emit("file-progress", ProgressPayload {
            current: i as u64 + 1,
            total,
            file_name: path.clone(),
        }).map_err(|e| FileError {
            message: e.to_string(),
            code: "EMIT_ERROR".to_string(),
        })?;

        // Simulate processing
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    app.emit("processing-complete", ()).unwrap();
    Ok(())
}
```

```typescript
// src/lib/events.ts
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { emit } from "@tauri-apps/api/event";

export interface ProgressPayload {
  current: number;
  total: number;
  file_name: string;
}

export async function onFileProgress(
  callback: (payload: ProgressPayload) => void
): Promise<UnlistenFn> {
  return listen<ProgressPayload>("file-progress", (event) => {
    callback(event.payload);
  });
}

export async function onProcessingComplete(
  callback: () => void
): Promise<UnlistenFn> {
  return listen("processing-complete", () => {
    callback();
  });
}

// Frontend can also emit events to the backend
export async function cancelProcessing(): Promise<void> {
  await emit("cancel-processing");
}
```

```tsx
// Usage in a React component
import { useEffect, useState } from "react";
import { onFileProgress, onProcessingComplete } from "./lib/events";
import { invoke } from "@tauri-apps/api/core";

function FileProcessor() {
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const unlistenProgress = onFileProgress((payload) => {
      setProgress({ current: payload.current, total: payload.total });
    });

    const unlistenComplete = onProcessingComplete(() => {
      setProgress({ current: 0, total: 0 });
    });

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  return (
    <div>
      {progress.total > 0 && (
        <progress value={progress.current} max={progress.total} />
      )}
    </div>
  );
}
```

### State Management (Managed State)

```rust
// src-tauri/src/state/app_state.rs
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub theme: String,
    pub auto_save: bool,
    pub font_size: u32,
    pub recent_files: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            auto_save: true,
            font_size: 14,
            recent_files: Vec::new(),
        }
    }
}

pub struct AppState {
    pub settings: Mutex<Settings>,
    pub write_enabled: Mutex<bool>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(Settings::default()),
            write_enabled: Mutex::new(true),
        }
    }
}

impl AppState {
    pub fn is_write_enabled(&self) -> bool {
        *self.write_enabled.lock().unwrap()
    }
}
```

```rust
// src-tauri/src/commands/settings.rs
use tauri::command;
use crate::state::app_state::{AppState, Settings};

#[command]
pub fn get_settings(state: tauri::State<'_, AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[command]
pub fn update_settings(
    settings: Settings,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut current = state.settings.lock().map_err(|e| e.to_string())?;
    *current = settings;
    Ok(())
}
```

### Security Model: Capabilities and Permissions

```json
// src-tauri/capabilities/main.json
{
  "identifier": "main-capability",
  "description": "Main window permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:allow-open",
    "dialog:allow-save",
    {
      "identifier": "fs:allow-read-text-file",
      "allow": [
        { "path": "$APPDATA/**" },
        { "path": "$HOME/Documents/**" }
      ]
    },
    {
      "identifier": "fs:allow-write-text-file",
      "allow": [
        { "path": "$APPDATA/**" }
      ]
    }
  ]
}
```

```json
// src-tauri/tauri.conf.json (security section)
{
  "app": {
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      "dangerousDisableAssetCspModification": false
    }
  }
}
```

### Window Management

```rust
// Creating and managing windows
use tauri::{command, AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

#[command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if let Some(window) = app.get_webview_window("settings") {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "settings",
        WebviewUrl::App("settings.html".into()),
    )
    .title("Settings")
    .inner_size(600.0, 400.0)
    .resizable(false)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn close_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

### System Tray

```rust
// src-tauri/src/lib.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Plugins

```rust
// Using official plugins
// Cargo.toml
// [dependencies]
// tauri-plugin-fs = "2"
// tauri-plugin-dialog = "2"
// tauri-plugin-shell = "2"
// tauri-plugin-store = "2"
// tauri-plugin-updater = "2"

// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Custom Plugin

```rust
// src-tauri/src/plugins/analytics.rs
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime, Manager,
};
use serde::Serialize;
use std::sync::Mutex;

#[derive(Debug, Default)]
struct AnalyticsState {
    events: Mutex<Vec<AnalyticsEvent>>,
}

#[derive(Debug, Clone, Serialize)]
struct AnalyticsEvent {
    name: String,
    timestamp: u64,
}

#[tauri::command]
async fn track_event(
    name: String,
    state: tauri::State<'_, AnalyticsState>,
) -> Result<(), String> {
    let event = AnalyticsEvent {
        name,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };
    state.events.lock().unwrap().push(event);
    Ok(())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("analytics")
        .setup(|app, _api| {
            app.manage(AnalyticsState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![track_event])
        .build()
}
```

### Auto-Updater

```json
// src-tauri/tauri.conf.json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://releases.myapp.com/{{target}}/{{arch}}/{{current_version}}"
      ]
    }
  }
}
```

```typescript
// src/lib/updater.ts
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdates(): Promise<void> {
  const update = await check();

  if (update) {
    console.log("Update available:", update.version);

    // Download and install
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          console.log("Download started, size:", event.data.contentLength);
          break;
        case "Progress":
          console.log("Downloaded:", event.data.chunkLength);
          break;
        case "Finished":
          console.log("Download complete");
          break;
      }
    });

    // Restart the app
    await relaunch();
  }
}
```

### Multi-Window IPC

```rust
// Send events between windows
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn send_to_window(
    app: AppHandle,
    target_window: String,
    event_name: String,
    payload: serde_json::Value,
) -> Result<(), String> {
    app.emit_to(&target_window, &event_name, payload)
        .map_err(|e| e.to_string())
}
```

```typescript
// Listen in the target window
import { listen } from "@tauri-apps/api/event";

// In the settings window, listen for theme changes from main
const unlisten = await listen<{ theme: string }>(
  "theme-changed",
  (event) => {
    applyTheme(event.payload.theme);
  }
);
```

### Deep Linking

```json
// src-tauri/tauri.conf.json
{
  "plugins": {
    "deep-link": {
      "desktop": {
        "schemes": ["myapp"]
      }
    }
  }
}
```

```rust
// Handle deep links
use tauri_plugin_deep_link::DeepLinkExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            app.deep_link().on_open_url(|event| {
                for url in event.urls() {
                    println!("Deep link received: {}", url);
                    // Route to appropriate handler based on URL
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Building and Distribution

### Build Configuration

```json
// src-tauri/tauri.conf.json
{
  "productName": "My App",
  "version": "1.0.0",
  "identifier": "com.mycompany.myapp",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "wix": {
        "language": "en-US"
      }
    },
    "macOS": {
      "minimumSystemVersion": "10.15",
      "signingIdentity": null,
      "entitlements": null
    },
    "linux": {
      "appimage": {
        "bundleMediaFramework": true
      },
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0"]
      }
    }
  }
}
```

### Build Commands

```bash
# Development
pnpm tauri dev

# Build for current platform
pnpm tauri build

# Build with debug info
pnpm tauri build --debug

# Build specific bundle format
pnpm tauri build --bundles deb
pnpm tauri build --bundles appimage
pnpm tauri build --bundles msi
pnpm tauri build --bundles dmg
```

## Testing

### Rust Unit Tests

```rust
// src-tauri/src/commands/settings.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = Settings::default();
        assert_eq!(settings.theme, "system");
        assert!(settings.auto_save);
        assert_eq!(settings.font_size, 14);
        assert!(settings.recent_files.is_empty());
    }

    #[test]
    fn test_app_state_write_enabled() {
        let state = AppState::default();
        assert!(state.is_write_enabled());

        *state.write_enabled.lock().unwrap() = false;
        assert!(!state.is_write_enabled());
    }
}
```

### Frontend E2E Testing

```typescript
// tests/e2e/app.spec.ts
import { test, expect } from "@playwright/test";

// Tauri provides a WebDriver-compatible interface
test.describe("Application", () => {
  test("should display the main window", async ({ page }) => {
    await page.goto("tauri://localhost");
    await expect(page.locator("h1")).toContainText("My App");
  });

  test("should list files when browse is clicked", async ({ page }) => {
    await page.goto("tauri://localhost");
    await page.click("button:has-text('Browse')");
    await expect(page.locator("ul li")).toHaveCount(5);
  });
});
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Correct Approach |
|--------------|---------------|------------------|
| Blanket file system permissions | Security risk, any file readable | Scope to specific directories |
| Blocking commands (sync I/O) | Freezes the UI thread | Use `async` commands with tokio |
| Storing secrets in frontend | Webview is inspectable | Store in Rust backend, use OS keychain |
| Skipping CSP configuration | XSS vulnerabilities | Define strict CSP in tauri.conf.json |
| Using `unsafe` Rust unnecessarily | Defeats Rust safety guarantees | Use safe abstractions |
| Polling backend from frontend | Wastes resources, laggy | Use event system (emit/listen) |
| Giant monolithic lib.rs | Unmaintainable | Split into modules (commands/, state/) |
| Hardcoded window sizes | Poor UX on different displays | Use responsive layouts, remember position |
| Ignoring platform differences | Broken on some OS | Test on all target platforms |
| `dangerousDisableAssetCspModification: true` | Disables security protections | Configure CSP properly instead |

## Best Practices

1. **Capability-based security**: Define the minimum permissions each window needs
2. **Async all I/O**: Every command doing I/O should be async
3. **Type-safe IPC**: Define shared types and use them on both sides
4. **Error handling**: Return `Result<T, E>` from commands with descriptive errors
5. **State with Mutex**: Always use `Mutex` or `RwLock` for shared state
6. **Event cleanup**: Always call the unlisten function in component cleanup
7. **Scoped file access**: Use path scopes in capabilities, never `$HOME/**`
8. **Official plugins first**: Use tauri-plugin-* before writing custom code
9. **Platform testing**: Test on Windows, macOS, and Linux before release
10. **Small binaries**: Tauri apps should be under 10MB; audit dependencies
11. **Graceful degradation**: Handle missing permissions gracefully in the UI
12. **Update channel**: Set up auto-updater early in development

## References

- Tauri 2.0 Documentation: https://v2.tauri.app
- Tauri GitHub: https://github.com/tauri-apps/tauri
- Tauri Plugins: https://github.com/tauri-apps/plugins-workspace
- Tauri Examples: https://github.com/tauri-apps/tauri/tree/dev/examples
- Rust Book: https://doc.rust-lang.org/book/
- Tauri Security: https://v2.tauri.app/security/
