---
description: Constraint-first discovery and tech stack decisions for the create-prd workflow
parent: create-prd
shard: stack
standalone: true
position: 1
pipeline:
  position: 2.1
  stage: architecture
  predecessors: [ideate]
  successors: [create-prd-architecture]
  skills: [brainstorming, resolve-ambiguity]
  calls-bootstrap: true
---

// turbo-all

# Create PRD — Stack Decisions

Build the decision constraints map from vision.md, then walk through each tech stack axis with the user.

**Prerequisite**: `docs/plans/vision.md` must exist. If it does not, tell the user to run `/ideate` first.

---

## 2.5. Constraint-first discovery

Before any tech stack decision, read `vision.md` constraints and surface classification to build the **decision constraints map**:

1. **Hard constraints** — decisions already locked by compliance, team, or budget:
   - Compliance (COPPA, PCI, HIPAA, etc.) may eliminate certain providers
   - Team size/expertise may rule out unfamiliar stacks
   - Budget may eliminate paid services
   - Existing infrastructure may dictate hosting/provider choices

2. **Surface constraints** — the project surfaces from vision.md constrain framework choices:
   - Desktop surface → eliminates pure-web frameworks, adds distribution decisions
   - Mobile surface → eliminates desktop-only frameworks, adds app store decisions
   - Multi-surface → adds shared contract layer, sync strategy decisions

3. **Soft constraints** — preferences that should bias decisions but aren't hard rules:
   - Performance requirements may favor certain runtimes
   - Developer experience preferences from the user

Present the constraints map to the user before starting tech decisions. Constraints narrow the option space — some decisions may now be obvious or have only one viable option. Skip those decisions with a brief rationale instead of presenting unnecessary choices.

### Constraint question table

For each applicable axis, ask these constraint questions first to filter the option space:

| Axis | Constraint Questions |
|------|---------------------|
| **Hosting** | Is there an existing cloud provider? Budget ceiling per month? Compliance requirements (data residency, SOC2)? Team familiarity? |
| **Database** | Expected data volume? Read/write ratio? Need for graph/document/relational? Existing database expertise? Multi-tenancy requirements? |
| **Auth** | Social login required? SSO/SAML needed? Age verification? Compliance (COPPA, GDPR)? Budget for auth provider? |
| **Frontend framework** | SSR required for SEO? Static site sufficient? Interactive app needs? Team framework experience? |
| **Backend runtime** | Latency requirements? Cold start tolerance? Existing language expertise? Deployment target (edge, server, serverless)? |
| **CI/CD** | Existing CI provider? Monorepo or polyrepo? Deployment frequency? Manual approval gates needed? |

## 3. Tech stack decisions

Read the **Project Surfaces** section from `vision.md` to determine which decision axes apply.

For each applicable axis, filter options using the constraints from Step 2.5, then present up to 5 viable options plus a Hybrid in the following format:

| # | Option | Strengths | Risks | Fit |
|---|--------|-----------|-------|-----|
| 1 | [Option A] | ... | ... | [score /5] |
| 2 | [Option B] | ... | ... | [score /5] |
| 3 | [Option C] | ... | ... | [score /5] |
| 4 | [Option D] | ... | ... | [score /5] |
| 5 | [Option E] | ... | ... | [score /5] |
| H | **Hybrid** | [Combine elements from above] | ... | [score /5] |

> **Recommendation**: Based on constraints [list matched constraints], **Option [N]** scores highest because [rationale]. Confirm or choose differently.

Score Fit from 1–5 based on how well the option matches the constraints map from Step 2.5. If constraints eliminate all but 1-2 options, present only those with a note explaining why others were eliminated.

Always include a Hybrid option where it meaningfully differs from the pure options. Omit it when the Hybrid would be identical to one of the pure options.

**Per-axis flow**:
1. Ask the constraint questions for this axis
2. Filter options based on answers
3. Present the filtered option table with recommendation
4. Wait for user confirmation
5. Fire bootstrap with only that key: read `.agent/workflows/bootstrap-agents.md` and call with `PIPELINE_STAGE=create-prd` + the confirmed key (e.g., `DATABASE=SurrealDB`)
6. Move to next axis

Get explicit user decisions — no "TBD" allowed.

Use the brainstorming skill's approach — one decision at a time, present trade-offs, get confirmation.

### Universal decisions (all project types)

| Axis | Decision Needed |
|------|----------------|
| **Primary language(s)** | TypeScript, Rust, Go, Python, Swift, Kotlin, C++, etc. |
| **Database** | SQL vs NoSQL vs multi-model vs embedded (SQLite), hosted vs self-managed |
| **Auth provider** | Firebase vs Auth0 vs Clerk vs custom vs OS-level keychain |
| **CI/CD** | GitHub Actions vs GitLab CI vs custom |
| **Monitoring** | Sentry vs Datadog vs custom |

### Web surface decisions (if project has web surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Frontend framework** | SSR vs SSG vs hybrid, which framework (Next.js, Astro, SvelteKit, etc.) |
| **Backend runtime** | Edge workers vs traditional server vs serverless |
| **Hosting** | Cloudflare vs Vercel vs AWS vs self-hosted |
| **CDN/Assets** | Provider-native vs S3 vs Cloudinary |

### Desktop surface decisions (if project has desktop surfaces)

| Axis | Decision Needed |
|------|----------------|
| **UI framework** | Tauri vs Electron vs native (GTK, Qt, SwiftUI, WPF, WinUI) |
| **Cross-platform strategy** | Single OS, cross-platform with shared UI (Tauri, Electron, Flutter Desktop), or cross-platform with native UI per OS |
| **Local data storage** | SQLite vs LevelDB vs filesystem vs embedded DB (RocksDB, etc.) |
| **Distribution** | Installer type (MSI, DMG, AppImage, Flatpak), auto-updater strategy (Sparkle, squirrel, custom) |
| **OS targets** | Windows, macOS, Linux — which combinations and minimum versions? |

### Mobile surface decisions (if project has mobile surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Framework** | Native per-platform (Swift/Kotlin) vs cross-platform (React Native, Flutter, .NET MAUI, Kotlin Multiplatform) |
| **Cross-platform strategy** | iOS-only, Android-only, or both? Shared codebase or separate? |
| **Local data storage** | SQLite, Realm, Core Data, Room |
| **Distribution** | App Store, Play Store, enterprise sideload, TestFlight/Firebase App Distribution |
| **OS targets** | iOS minimum version, Android minimum API level |

### Desktop + Mobile shared decisions (if surfaces share a codebase)

Some frameworks support building for **both** desktop and mobile from one codebase. If the vision indicates this is desired:

| Axis | Decision Needed |
|------|----------------|
| **Shared framework** | Flutter (desktop + mobile + web), Kotlin Multiplatform, .NET MAUI, Compose Multiplatform |
| **Shared vs platform-specific UI** | Fully shared UI, shared logic with native UI per platform, or hybrid? |
| **Platform-specific features** | What functionality requires native code per platform? (file system, notifications, hardware access) |

### CLI surface decisions (if project has CLI surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Language** | Rust (clap), Go (cobra), Python (click/typer), Node (commander/yargs) |
| **Distribution** | npm, cargo, homebrew, apt, binary releases (goreleaser, cross) |
| **Shell integration** | Tab completions, man pages, config file format (TOML, YAML, JSON) |

### Multi-surface connection decisions (if project has 2+ connected surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Shared API protocol** | REST vs gRPC vs GraphQL vs WebSocket between surfaces |
| **Sync strategy** | Real-time (WebSocket/SSE), eventual consistency (message queue), batch (cron), offline-first (CRDT/merge) |
| **Shared contract layer** | How are data shapes shared? Monorepo with shared package? Published npm/crate package? Code generation from OpenAPI/protobuf? |
| **Auth federation** | Shared auth server with SSO? OAuth2 token exchange? Separate auth per surface? |
| **Conflict resolution** | Last-write-wins, operational transform, CRDT, manual resolution, server-authoritative |
| **Offline support** | Which surfaces work offline? What data is cached locally? How are conflicts resolved on reconnect? |

### Development tooling

As part of tech stack decisions, also confirm:

| Tool | Question |
|------|----------|
| **Package manager / build system** | pnpm, npm, yarn, bun, cargo, go modules, pip/poetry? |
| **Test runner** | Vitest, Jest, pytest, cargo test, go test, XCTest? |
| **Linter** | ESLint, Biome, Ruff, clippy, golangci-lint? |
| **Type checker** | TypeScript (tsc), mypy, Rust compiler, Go compiler? |
| **Build command** | What builds the project for production? |

Derive the validation command from these answers:
```
{{BUILD_TOOL}} test && {{BUILD_TOOL}} lint && {{BUILD_TOOL}} type-check && {{BUILD_TOOL}} build
```

### After each tech decision

Read each installed skill's SKILL.md before proceeding. At minimum, load:
- API design skill (REST or GraphQL patterns)
- Security skill (if installed)
- Any framework-specific skills (if already known)

### Fill kit templates (progressive bootstrap)

Read `.agent/workflows/bootstrap-agents.md` and call it with `PIPELINE_STAGE=create-prd` plus only the keys just decided. Bootstrap runs after **each confirmed decision**, not in a batch at the end. This means:

- After confirming `DATABASE=SurrealDB`, call bootstrap with just that key
- After confirming `FRONTEND_FRAMEWORK=Astro`, call bootstrap with just that key
- Each invocation fills the relevant placeholders and provisions the matching skills
- At the end of all tech decisions, call bootstrap once more with `ARCHITECTURE_DOC` set to the dated filename
