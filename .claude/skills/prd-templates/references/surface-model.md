# Surface Model Reference

This document defines two distinct models used throughout the kit. Understanding the distinction prevents confusion between surface types (what kind of thing you're building) and implementation layers (what a complete feature requires).

---

## Surface Type Model

Used by: stack decisions, bootstrap key `SURFACES`, decomposition, `/plan-phase` Step 0.5

The surface type describes the *kind of deployment target* for the project.

| Surface Type | Description | Examples |
|---|---|---|
| `web` | Browser-based application | SaaS dashboard, marketing site, web app |
| `mobile` | Native or hybrid mobile app | iOS/Android app, React Native, Expo |
| `desktop` | Native desktop application | Electron, Tauri, native macOS/Windows |
| `cli` | Command-line interface | Developer tool, automation script, npm package |
| `api` | Headless API without a user-facing interface | REST API, GraphQL service, microservice |
| `extension` | Browser extension or plugin | Chrome extension, VS Code plugin |

---

## Implementation Layer Model

Used by: `vertical-slices.md` completeness rule, phase planning, slice acceptance criteria

The implementation layer describes *what a complete vertical feature slice requires* — regardless of surface type.

| Layer | What It Is | Required For |
|---|---|---|
| **Data layer** | Schema, migrations, seed data, storage config | Every feature that persists state |
| **API layer** | Endpoints, validation, middleware, business logic | Every feature with server-side behavior |
| **User-facing layer** | The interface for the primary user of this feature | Every feature (form adapts to surface type) |
| **Admin layer** | Management interface for operators or privileged users | Every feature that needs operator control |

---

## Reconciliation: Layers Are Always Present, Form Adapts

Every surface type has all four implementation layers — but the *form* of each layer adapts to the surface type.

| Surface Type | Data Layer | API Layer | User-Facing Layer | Admin Layer |
|---|---|---|---|---|
| `web` | DB schema + migrations | REST/GraphQL/tRPC endpoints | Browser UI (pages, components) | Admin dashboard or management UI |
| `mobile` | Local storage + remote sync | Mobile API endpoints | Native screens | Admin API or web admin |
| `desktop` | Local DB or file system | Internal IPC or local server | Native window UI | Settings/configuration panel |
| `cli` | Config files, local state | Internal command router | Command output, prompts, `--help` | Privileged commands, admin mode |
| `api` | DB schema | API endpoints | Response format (the interface for API consumers) | Admin endpoints or management API |
| `extension` | Extension storage | Background service worker | Popup or sidebar UI | Extension settings page |

**Key insight**: A CLI project has no "admin panel" in the web sense — but it has privileged commands and a management mode that fulfill the admin layer role. The layers are never absent; they just look different.

---

## Related Rules and Workflows

- `vertical-slices.md` — uses the Implementation Layer Model to define feature completeness
- `/plan-phase` Step 0.5 — uses the Surface Type Model to condition completeness checks
- `bootstrap-agents-fill.md` — fills `{{SURFACES}}` with confirmed Surface Type values
- `decompose-architecture.md` — uses surface types to determine which skills to load
