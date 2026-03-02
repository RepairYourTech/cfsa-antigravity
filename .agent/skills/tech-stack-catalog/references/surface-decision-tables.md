# Surface Decision Tables

## Universal decisions (all project types)

| Axis | Decision Needed |
|------|----------------|
| **Primary language(s)** | TypeScript, Rust, Go, Python, Swift, Kotlin, C++, etc. |
| **Database** | ⚠️ **Handled by Persistence Map Interview** in `create-prd-stack.md` — do NOT process as a single axis. Covers primary, vector, graph, cache, and time-series sub-keys. |
| **Auth provider** | Firebase vs Auth0 vs Clerk vs custom vs OS-level keychain |
| **CI/CD** | GitHub Actions vs GitLab CI vs custom |
| **Monitoring** | Sentry vs Datadog vs custom |

## Web surface decisions

| Axis | Decision Needed |
|------|----------------|
| **Frontend framework** | SSR vs SSG vs hybrid, which framework (Next.js, Astro, SvelteKit, etc.) |
| **Backend runtime** | Edge workers vs traditional server vs serverless |
| **Hosting** | Cloudflare vs Vercel vs AWS vs self-hosted |
| **CDN/Assets** | Provider-native vs S3 vs Cloudinary |

## Desktop surface decisions

| Axis | Decision Needed |
|------|----------------|
| **UI framework** | Tauri vs Electron vs native (GTK, Qt, SwiftUI, WPF, WinUI) |
| **Cross-platform strategy** | Single OS, cross-platform with shared UI (Tauri, Electron, Flutter Desktop), or cross-platform with native UI per OS |
| **Local data storage** | SQLite vs LevelDB vs filesystem vs embedded DB (RocksDB, etc.) |
| **Distribution** | Installer type (MSI, DMG, AppImage, Flatpak), auto-updater strategy (Sparkle, squirrel, custom) |
| **OS targets** | Windows, macOS, Linux — which combinations and minimum versions? |

## Mobile surface decisions

| Axis | Decision Needed |
|------|----------------|
| **Framework** | Native per-platform (Swift/Kotlin) vs cross-platform (React Native, Flutter, .NET MAUI, Kotlin Multiplatform) |
| **Cross-platform strategy** | iOS-only, Android-only, or both? Shared codebase or separate? |
| **Local data storage** | SQLite, Realm, Core Data, Room |
| **Distribution** | App Store, Play Store, enterprise sideload, TestFlight/Firebase App Distribution |
| **OS targets** | iOS minimum version, Android minimum API level |

## Desktop + Mobile shared decisions

Some frameworks support building for **both** desktop and mobile from one codebase. If the vision indicates this is desired:

| Axis | Decision Needed |
|------|----------------|
| **Shared framework** | Flutter (desktop + mobile + web), Kotlin Multiplatform, .NET MAUI, Compose Multiplatform |
| **Shared vs platform-specific UI** | Fully shared UI, shared logic with native UI per platform, or hybrid? |
| **Platform-specific features** | What functionality requires native code per platform? (file system, notifications, hardware access) |

## CLI surface decisions

| Axis | Decision Needed |
|------|----------------|
| **Language** | Rust (clap), Go (cobra), Python (click/typer), Node (commander/yargs) |
| **Distribution** | npm, cargo, homebrew, apt, binary releases (goreleaser, cross) |
| **Shell integration** | Tab completions, man pages, config file format (TOML, YAML, JSON) |

## Multi-surface connection decisions (2+ connected surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Shared API protocol** | REST vs gRPC vs GraphQL vs WebSocket between surfaces |
| **Sync strategy** | Real-time (WebSocket/SSE), eventual consistency (message queue), batch (cron), offline-first (CRDT/merge) |
| **Shared contract layer** | How are data shapes shared? Monorepo with shared package? Published npm/crate package? Code generation from OpenAPI/protobuf? |
| **Auth federation** | Shared auth server with SSO? OAuth2 token exchange? Separate auth per surface? |
| **Conflict resolution** | Last-write-wins, operational transform, CRDT, manual resolution, server-authoritative |
| **Offline support** | Which surfaces work offline? What data is cached locally? How are conflicts resolved on reconnect? |
