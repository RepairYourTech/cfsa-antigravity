---
name: parallel-feature-development
description: Prevent tool call conflicts when making concurrent edits across a codebase. Establishes strict file ownership, interface contracts, and merge strategies. Use with parallel-agents when executing concurrent `replace_file_content` calls.
---

# Concurrent Feature Development

## Overview

When making concurrent code edits (e.g. implementing the frontend and backend of a slice simultaneously), the #1 risk is **file hash conflicts** — trying to execute multiple `replace_file_content` calls on the same file, which causes the operation to fail. This skill prevents that with strict file ownership, typed interface contracts, and batched execution.

**Core principle:** One concurrent stream per file, always. No exceptions. If two streams need the same file, they're not independent — restructure the decomposition.

## When to Use

- Implementing multiple surfaces (e.g. `BE` and `FE`) in the same turn
- A phase plan has slices that can be implemented concurrently
- Multiple features touching different subsystems simultaneously
- Any time `parallel-agents` is used for implementation (not analysis)

## When NOT to Use

- Single agent doing sequential work
- Agents only analyzing/reviewing (no code changes)
- All changes are in the same file or module

## The Cardinal Rule

```
ONE OWNER PER FILE. NO EXCEPTIONS.
```

If Stream A owns `src/auth/login.ts`, no other stream may modify that file — not even to add an import.

## The Protocol

### 1. Ownership Declaration

Before writing code concurrently, create an explicit mental or written ownership manifest:

```markdown
## File Ownership Manifest

| Stream | Owned Files | Interface Files |
|--------|-------------|-----------------|
| Stream 1 (Auth) | `src/auth/*`, `src/middleware/auth.ts` | `src/types/auth.ts` |
| Stream 2 (API) | `src/api/*`, `src/middleware/api.ts` | `src/types/api.ts` |
| Stream 3 (UI) | `src/components/*`, `src/pages/*` | `src/types/ui.ts` |

### Shared Files (Frozen)
- `src/types/shared.ts` — modify only in synthesis step
- `src/config.ts` — frozen during parallel work
- `package.json` — frozen during parallel work
```

**Rules:**
- Every source file to be edited appears in exactly ONE workstream
- Shared files are **frozen** — do not mutate them concurrently
- If a stream needs a change to a shared file, document it as a `// BOUNDARY:` stub
- Interface files define the contract between streams

### 2. Interface Contracts

Before generating concurrent edits, define the typed interfaces they'll communicate through:

```typescript
// src/types/auth.ts — Stream 1 PRODUCES this, Stream 2 CONSUMES it
export interface AuthResult {
  userId: string;
  roles: string[];
  token: string;
}

// src/types/api.ts — Stream 2 PRODUCES this, Stream 3 CONSUMES it
export interface UserResponse {
  id: string;
  name: string;
  email: string;
}
```

**Contract rules:**
- Interfaces are strictly defined BEFORE generating logic
- Do NOT change interface files during the concurrent implementation phase
- Each interface has exactly one PRODUCER and one or more CONSUMERS
- Develop against the interface, not assumptions

### 3. Batched Tool Execution

When generating concurrent tool calls in the same turn:

```markdown
## Stream: [Role]

### Your Owned Files
[Explicit list — you may ONLY create/modify these files]

### Frozen Files (DO NOT MODIFY)
[List of shared files — read but never write]

### Interface Contract
[The interfaces you produce and consume]

### Boundary Protocol
If you need something from another stream's domain:
1. Import the interface type (read-only)
2. Code against the interface, not the implementation
3. Add a `// BOUNDARY:` comment if you need a shared file change
```

### 4. Merge Protocol

Always execute edits that don't overlap in a single batched `multi_replace_file_content` call, but conceptually process dependencies:

```
1. Interface files (already defined, verify no changes)
2. Stream with fewest dependencies first
3. Stream with most dependencies last
4. Shared file modifications (from BOUNDARY stubs)
```

**Execution checklist:**
- [ ] No file appears in multiple streams' edits
- [ ] All interface contracts satisfied (types compile)
- [ ] Shared file BOUNDARY stubs resolved in a sequential commit
- [ ] Full test suite passes after the batched edit

### 5. Conflict Resolution

If despite everything, a conflict is detected:

| Conflict Type | Resolution |
|---------------|-----------|
| **Same file modified** | `replace_file_content` block. Separate edits into sequential tool calls. |
| **Interface mismatch** | Producer's implementation doesn't match contract → fix producer |
| **Missing dependency** | Assumed something exists that doesn't → add BOUNDARY stub |
| **Mutual dependency** | A needs B's output AND B needs A's output → can't go concurrent, code sequentially |

## Integration with Kit

- **With `session-continuity` Protocol 9 (Parallel Claim):** When tasks in progress files have surface tags (`BE`, `FE`, `QA`) and claim markers (`[!]`), the `files:` blocks under claimed tasks serve as your live ownership manifest. By analyzing these blocks, you can safely batch `replace_file_content` calls for both `FE` and `BE` tasks simultaneously.
- **With `boundary-not-placeholder`:** Use `// BOUNDARY:` stubs for cross-stream dependencies you can't resolve concurrently. Resolve them sequentially afterward.
- **With `implement-slice`:** When a slice enters parallel mode (step 1.5), claim all tags concurrently. The synthesis step (6.5) resolves BOUNDARY stubs on frozen files.

## Example: Concurrent Vertical Slice

**Slice:** "User can view their profile"

| Stream | Surface | Owned Files | Produces | Consumes |
|--------|---------|-------------|----------|----------|
| DB Stream | Schema | `migrations/003-profile.sql`, `src/db/profile.ts` | `ProfileRecord` type | — |
| API Stream | Endpoint | `src/api/profile.ts`, `src/api/profile.test.ts` | `GET /api/profile` | `ProfileRecord` |
| UI Stream | Component | `src/components/Profile.tsx`, `src/pages/profile.astro` | Rendered page | `GET /api/profile` |

**Merge order:** DB → API → UI (dependency chain)

**Frozen files:** `src/types/shared.ts`, `astro.config.mjs`, `package.json`

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Two sub-tasks mutate the same file | Tool call conflict, lost edits | ONE STREAM PER FILE. NO EXCEPTIONS. |
| No interface contracts | Mismatched assumptions | Define types BEFORE editing |
| Skipping integration tests | Interfaces match but behavior doesn't | Full suite after batch edits |
| Parallelizing tightly coupled code | Constant blocking, BOUNDARY stubs everywhere | Code sequentially |
