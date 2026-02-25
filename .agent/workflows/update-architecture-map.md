---
description: Analyzes the codebase and generates or updates a living architecture document.
pipeline:
  position: 8.5
  stage: verification
  predecessors: [validate-phase]
  successors: [plan-phase]
  loop: true
  skills: [architecture-mapping]
  calls-bootstrap: false
---

# Update Architecture Map

This workflow scans the current state of the repository and produces a "living" map of its architecture. It should be run periodically or at the end of a major phase to ensure `docs/ARCHITECTURE.md` accurately reflects the codebase.

---

## 0. Load architecture mapping skill

Read the skill before proceeding:
1. `.agent/skills/architecture-mapping/SKILL.md` — Defines how to perform the mapping.

---

## 1. File Reconnaissance & Deep Reading

Analyze the project structure using file exploration tools. Do not just stop at finding directories; you must read the source code.
1. Identify core directories (`src/`, `lib/`, `api/`, etc.)
2. Use `view_file` to read the exact contents of entry points (e.g., `src/api/worker.ts`, `src/pages/index.astro`).
3. Locate and read configuration files (`package.json`, `astro.config.mjs`, `wrangler.toml`).

## 2. Component & Schema Analysis

Group files logically into components, but extract their exact contracts:
- Use `grep_search` to find `z.object` or `interface` definitions.
- Document exact schema names, required environment variables, and binding names (e.g., KV namespaces, R2 buckets).

## 3. Map Explicit Data Flow and Relationships

Trace exactly how data moves through the system.
- Read database clients or query files to see exactly how state is managed (e.g., SurrealDB queries, Firebase Auth hooks).
- Document exact API routes, rate limiting logic, and CORS constraints present in the code.

## 4. Extract Key Patterns with Evidence

Identify recurring architectural patterns used in the codebase (e.g., CFPA, React Islands, utility-first CSS). 
- Provide exact file paths that prove these patterns are in use (e.g., "React Islands are used in `src/components/Header.tsx` via the `client:load` directive").

## 5. Write/Update Document

Create or update `docs/ARCHITECTURE.md`.
- If it doesn't exist, create it using the structure outlined in the `architecture-mapping` skill.
- If it exists, integrate your new findings holistically. Do not just append to the end. Update the "Last Updated" timestamp.

Ensure the document is human-readable, well-structured, and focuses on high-level system interactions rather than low-level functional documentation.

## 6. Present Results and Next Steps

Use `notify_user` to present a summary of the architecture map updates.

### Proposed next steps

"Architecture map updated. Next: Run `/plan-phase` for the next phase, or if all phases are complete, the project is ready for deployment — refer to your CI/CD pipeline configuration and the deployment procedures documented in `docs/plans/ENGINEERING-STANDARDS.md`."
