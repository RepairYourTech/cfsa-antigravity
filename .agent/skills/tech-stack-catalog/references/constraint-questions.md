# Constraint Questions

Per-axis constraint questions with mandatory ideation grounding. Every axis has two tiers of questions and a citation gate.

## How to Use This File

For **each** tech stack axis:

1. **Tier 1 — Self-answer from ideation**: Answer these questions by reading the ideation files listed in the **Required Reads** column. Do NOT ask the user these questions — you already have the answers in the ideation output. Write a 3-5 bullet **Ideation Synthesis** summarizing what you found.
2. **Cite-or-Stop Gate**: Your Ideation Synthesis must contain ≥ 2 project-specific findings with file citations (e.g., "From `diagnostics/diagnostics-index.md`: multi-agent orchestration requires persistent task queues"). If you cannot produce 2 citations → you have not read deeply enough → **STOP** and read the deep dives and CX files before continuing.
3. **Tier 2 — Ask the user**: Only after passing the citation gate, ask these questions to the user. These are things only the user can answer (budget, team expertise, preferences).
4. **Present options**: Combine ideation synthesis + user answers to filter and score options. Your recommendation MUST cite ideation findings as supporting evidence.

> ❌ **Anti-pattern**: Presenting generic strengths/risks like "Good ecosystem support" or "Scalable" without tying them to a specific ideation finding. Every strength/risk in the option table must reference a concrete project requirement from the ideation output.

---

## Hosting

### Required Reads

| File Pattern | What to Extract |
|---|---|
| `meta/constraints.md` → `## Project Surfaces` | Which surfaces need hosting (web, API, desktop distribution, mobile distribution) |
| `meta/constraints.md` → compliance section | Data residency, regulatory requirements that constrain hosting region/provider |
| Every domain `{domain}-index.md` | Features requiring edge compute, real-time, WebSocket, or heavy compute |
| CX files (`ideation-cx.md` + domain CX) | Cross-surface data flow that affects deployment topology |
| Deep dives with latency or performance mentions | P95 requirements, geographic distribution needs |

### Tier 1 — Self-answer from ideation

- What surfaces need hosting and what type of hosting each requires (static, SSR, API, worker)?
- Are there latency-sensitive features that require edge deployment?
- Are there compliance or data residency constraints that limit hosting geography?
- Do any features require persistent connections (WebSocket, SSE) that affect hosting choice?
- What is the deployment topology implied by the architecture (monolith, microservices, serverless)?

### Tier 2 — Ask the user

- Is there an existing cloud provider or hosting preference?
- What is the monthly hosting budget ceiling?
- How much operational complexity is acceptable (managed vs self-hosted)?

---

## Database / Persistence

### Required Reads

| File Pattern | What to Extract |
|---|---|
| Every domain `{domain}-index.md` | Entity types, relationship complexity, data cardinality |
| Deep dives with data model mentions | Graph relationships, hierarchical data, polymorphic entities |
| Deep dives with search/query mentions | Full-text search, faceted search, complex query patterns |
| Deep dives with sync/real-time mentions | Offline-first, CRDT, conflict resolution, real-time subscriptions |
| CX files | Cross-domain entity ownership, shared entities, data flow direction |
| `meta/constraints.md` | PII fields, compliance (HIPAA/PCI/GDPR) affecting data placement |

### Tier 1 — Self-answer from ideation

- What are the primary entity types and their relationships (flat, hierarchical, graph)?
- Are there features requiring graph traversal (e.g., dependency chains, social connections, multi-hop queries)?
- Are there features requiring full-text search, vector similarity, or faceted filtering?
- What are the read/write patterns implied by the feature workflows (read-heavy dashboards, write-heavy logging, balanced CRUD)?
- Are there real-time or offline-first requirements that affect database choice?
- Do any entities require time-series storage (metrics, audit logs, sensor data)?
- What PII fields exist and what isolation boundaries are required?

### Tier 2 — Ask the user

- Is there existing database expertise or infrastructure to leverage?
- Are there multi-tenancy requirements the ideation didn't capture?
- Budget constraints for managed database services?

> **Note**: Database is handled by the Persistence Map Interview in `create-prd-stack.md`. These questions feed into that interview — they do not replace it.

---

## Auth Provider

### Required Reads

| File Pattern | What to Extract |
|---|---|
| Every domain `{domain}-index.md` → Role Matrix | All roles, permission levels (Full/Config/Read-only/None), per-domain access |
| `meta/constraints.md` → compliance section | COPPA, GDPR, age restrictions, SSO requirements |
| Domain deep dives with access control mentions | Multi-tenant isolation, resource ownership, escalation paths |
| CX files | Trust boundaries across domains, cross-domain permission handoff |

### Tier 1 — Self-answer from ideation

- How many distinct roles exist and what are their permission boundaries?
- Is there a multi-tenant model (org-level isolation, workspace-level, etc.)?
- Are there age restrictions or minor-handling requirements (COPPA)?
- Do any features require granular resource-level permissions (ABAC) vs role-based (RBAC)?
- Are there third-party integration points that need OAuth/API key authentication?
- Does the app need social login, SSO/SAML, or enterprise federation?

### Tier 2 — Ask the user

- Is social login (Google, GitHub, Apple, etc.) required? Which providers?
- Is SSO/SAML needed for enterprise customers?
- Budget for auth provider (free tier vs paid)?
- Team experience with specific auth providers?

---

## Frontend Framework

### Required Reads

| File Pattern | What to Extract |
|---|---|
| `meta/constraints.md` → `## Project Surfaces` | Web surface type (app, content site, hybrid), SEO requirements |
| Every domain `{domain}-index.md` | UI complexity per domain — forms, dashboards, real-time views, interactive editors |
| Deep dives with UI/interaction mentions | Complex interaction patterns (drag-drop, canvas, WYSIWYG, collaborative editing) |
| Deep dives with real-time mentions | Live updates, WebSocket-driven UI, optimistic updates |
| CX files | Cross-domain navigation patterns, shared UI state requirements |

### Tier 1 — Self-answer from ideation

- Is SSR required for SEO or first-paint performance, or is this a pure SPA?
- How complex are the interactive patterns (simple forms vs complex editors vs canvas-based)?
- Are there real-time UI requirements (live dashboards, collaborative editing)?
- What is the page count / route complexity implied by the feature inventory?
- Are there offline-first or PWA requirements that affect framework choice?
- Does the app need to share code with other surfaces (mobile, desktop)?

### Tier 2 — Ask the user

- Team framework experience or preference?
- Is there an existing frontend codebase to integrate with?
- Performance priority: bundle size vs DX vs ecosystem maturity?

---

## Backend Framework / Runtime

### Required Reads

| File Pattern | What to Extract |
|---|---|
| `meta/constraints.md` → `## Project Surfaces` | Backend surface type (API-only, BFF, monolith) |
| Every domain `{domain}-index.md` | Feature complexity — CRUD-heavy vs computation-heavy vs orchestration-heavy |
| Deep dives with AI/ML mentions | AI orchestration, model serving, agent coordination |
| Deep dives with integration mentions | External API calls, webhook handling, queue processing |
| CX files | Cross-domain business logic, shared middleware requirements |

### Tier 1 — Self-answer from ideation

- What type of backend logic dominates — simple CRUD, complex business rules, AI orchestration, or data pipelines?
- Are there features requiring long-running processes (agents, batch jobs, async workflows)?
- What are the latency requirements (P95 targets from deep dives)?
- Is there a need for background job processing or event-driven architecture?
- Does the backend need to serve multiple surfaces with different protocols (REST for web, gRPC for internal)?
- Are there cold-start sensitivity constraints (serverless viability)?

### Tier 2 — Ask the user

- Team language/framework expertise?
- Deployment target preference (traditional server, serverless, edge)?
- Is there an existing backend to extend vs greenfield?

---

## API Layer

### Required Reads

| File Pattern | What to Extract |
|---|---|
| Every domain `{domain}-index.md` | Query complexity per domain — simple lookups vs complex filtered/nested queries |
| Deep dives with data fetching mentions | Over-fetching risks, real-time subscription needs, batch query patterns |
| CX files | Cross-domain data aggregation, BFF patterns, gateway needs |
| `meta/constraints.md` → `## Project Surfaces` | Number of consuming surfaces (affects API style choice) |

### Tier 1 — Self-answer from ideation

- How varied are the data fetching patterns (uniform CRUD vs highly variable query shapes)?
- Are there features requiring real-time subscriptions?
- How many surfaces consume the API (affects REST vs GraphQL vs tRPC calculus)?
- Is there a need for API-to-API communication (microservice internal APIs)?
- Are there complex nested data requirements that would benefit from flexible query languages?

### Tier 2 — Ask the user

- Is the API public-facing (needs REST + OpenAPI) or internal-only (tRPC viable)?
- Team experience with GraphQL vs REST vs tRPC?
- Is API versioning a concern (breaking change frequency)?

---

## CI/CD

### Required Reads

| File Pattern | What to Extract |
|---|---|
| `meta/constraints.md` → `## Project Surfaces` | Number of deployable surfaces (affects pipeline complexity) |
| `meta/constraints.md` → compliance section | Audit requirements, approval gates, compliance-mandated scanning |

### Tier 1 — Self-answer from ideation

- How many independently deployable artifacts exist?
- Are there compliance requirements mandating specific CI/CD gates (security scanning, approval workflows)?
- Is the project monorepo or polyrepo (affects CI/CD tooling)?

### Tier 2 — Ask the user

- Is there an existing CI/CD provider?
- Deployment frequency expectations (continuous vs scheduled)?
- Are manual approval gates needed for production deploys?

---

## Monitoring / Observability

### Required Reads

| File Pattern | What to Extract |
|---|---|
| Deep dives with performance/SLA mentions | Which features have SLA requirements driving alert thresholds |
| `meta/constraints.md` → compliance section | Audit logging requirements, log retention mandates |
| Every domain `{domain}-index.md` | Features with error-sensitive flows (payments, auth, data sync) |

### Tier 1 — Self-answer from ideation

- Which features are error-critical (payment flows, auth, data integrity)?
- Are there SLA or uptime requirements from the ideation?
- What audit logging is mandated by compliance?
- Are there features requiring distributed tracing (multi-service request paths)?

### Tier 2 — Ask the user

- Is there an existing monitoring stack?
- Budget for monitoring services?
- On-call expectations (who gets alerted)?
