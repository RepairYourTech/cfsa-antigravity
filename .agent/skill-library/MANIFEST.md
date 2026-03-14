# Skill Library Manifest

> This file maps tech stack decisions and project surface types to curated skills.
> The `/bootstrap-agents` command reads this manifest to determine which skills to install.

## How It Works

1. A pipeline skill (e.g., `/create-prd`, `/iterate-plan`, `/add-feature`) makes a tech decision
2. It calls `/bootstrap-agents` with the new stack key=value
3. Bootstrap reads this manifest and finds matching skills
4. Matching skills are copied from `.agent/skill-library/` → `.agent/skills/`
5. Any `{{PLACEHOLDER}}`s inside the copied skills are filled with current values

## Stack Triggers

When a stack key matches a value pattern (case-insensitive), install the listed skills.

### Databases

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `DATABASE` | `*surrealdb*` | `stack/databases/surrealdb-expert` | `surrealdb-expert` |
| `DATABASE` | `*postgres*` OR `*pg*` | `stack/databases/postgresql` | `postgresql` |
| `DATABASE` | `*supabase*` | `stack/databases/supabase` | `supabase` |
| `DATABASE` | `*mongo*` | `stack/databases/mongodb` | `mongodb` |
| `DATABASE` | `*redis*` | `stack/databases/redis` | `redis` |
| `DATABASE_PRIMARY` | `*redis*` | `stack/databases/redis` | `redis` |
| `DATABASE` | `*sqlite*` OR `*libsql*` OR `*turso*` | `stack/databases/sqlite` | `sqlite` |
| `DATABASE_PRIMARY` | `*surrealdb*` | `stack/databases/surrealdb-expert` | `surrealdb-expert` |
| `DATABASE_PRIMARY` | `*postgres*` OR `*pg*` | `stack/databases/postgresql` | `postgresql` |
| `DATABASE_PRIMARY` | `*supabase*` | `stack/databases/supabase` | `supabase` |
| `DATABASE_PRIMARY` | `*mongo*` | `stack/databases/mongodb` | `mongodb` |
| `DATABASE_PRIMARY` | `*sqlite*` OR `*libsql*` OR `*turso*` | `stack/databases/sqlite` | `sqlite` |
| `DATABASE_VECTOR` | `*qdrant*` | `stack/databases/qdrant` | `qdrant` |
| `DATABASE_VECTOR` | `*pgvector*` | `stack/databases/pgvector` | `pgvector` |
| `DATABASE_VECTOR` | `*pinecone*` | `stack/databases/pinecone` | `pinecone` |
| `DATABASE_VECTOR` | `*weaviate*` | `stack/databases/weaviate` | `weaviate` |
| `DATABASE_VECTOR` | `*lance*` OR `*lancedb*` | `stack/databases/lancedb` | `lancedb` |
| `DATABASE_GRAPH` | `*neo4j*` | `stack/databases/neo4j` | `neo4j` |
| `DATABASE_CACHE` | `*redis*` | `stack/databases/redis` | `redis` |
| `DATABASE_TIMESERIES` | `*timescale*` | `stack/databases/timescaledb` | `timescaledb` |
| `DATABASE_TIMESERIES` | `*influx*` | `stack/databases/influxdb` | `influxdb` |
| `DATABASE` | `*spacetimedb*` OR `*stdb*` | `stack/databases/spacetimedb` | `spacetimedb` |
| `DATABASE_PRIMARY` | `*spacetimedb*` OR `*stdb*` | `stack/databases/spacetimedb` | `spacetimedb` |
| `DATABASE` | `*clickhouse*` | `stack/databases/clickhouse` | `clickhouse` |
| `DATABASE_ANALYTICS` | `*clickhouse*` | `stack/databases/clickhouse` | `clickhouse` |

> **Note on `DATABASE_CACHE` / Redis**: the existing `DATABASE` + `*redis*` row remains; the `DATABASE_CACHE` row adds a second matching path under the new sub-key. Both fire the same `redis` skill — the idempotency rule in step 7 of provision ensures it is only copied once.


### Frameworks

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `FRONTEND_FRAMEWORK` | `*astro*` | `stack/frameworks/astro-framework` | `astro-framework` |
| `FRONTEND_FRAMEWORK` | `*next*` | `stack/frameworks/nextjs` | `nextjs` |
| `FRONTEND_FRAMEWORK` | `*svelte*` OR `*sveltekit*` | `stack/frameworks/sveltekit` | `sveltekit` |
| `FRONTEND_FRAMEWORK` | `*nuxt*` | `stack/frameworks/nuxt` | `nuxt` |
| `BACKEND_FRAMEWORK` | `*hono*` | `stack/frameworks/hono` | `hono` |
| `BACKEND_FRAMEWORK` | `*fastapi*` | `stack/frameworks/fastapi` | `fastapi` |
| `BACKEND_FRAMEWORK` | `*nest*` | `stack/frameworks/nestjs` | `nestjs` |

> api-error-handling installs with every backend framework (any BACKEND_FRAMEWORK implies an API surface).

| `BACKEND_FRAMEWORK` | `*hono*` | `surface/api/api-error-handling` | `api-error-handling` |
| `BACKEND_FRAMEWORK` | `*fastapi*` | `surface/api/api-error-handling` | `api-error-handling` |
| `BACKEND_FRAMEWORK` | `*nest*` | `surface/api/api-error-handling` | `api-error-handling` |
| `DESKTOP_FRAMEWORK` | `*tauri*` | `stack/frameworks/tauri` | `tauri` |
| `DESKTOP_FRAMEWORK` | `*electron*` | `stack/frameworks/electron` | `electron` |

### API Layer

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `API_LAYER` | `*trpc*` | `stack/api/trpc` | `trpc` |
| `API_LAYER` | `*graphql*` | `stack/api/graphql` | `graphql` |

### ORM / Data Layer

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `ORM` | `*drizzle*` | `stack/orm/drizzle-orm` | `drizzle-orm` |
| `ORM` | `*prisma*` | `stack/orm/prisma` | `prisma` |

### CSS / UI

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `CSS_FRAMEWORK` | `*tailwind*` | `stack/css/tailwind-css-patterns` | `tailwind-css-patterns` |
| `CSS_FRAMEWORK` | `*tailwind*` | `stack/css/tailwind-design-system` | `tailwind-design-system` |
| `CSS_FRAMEWORK` | `*vanilla*` OR `*plain*` OR `*custom*` | `stack/css/vanilla-css` | `vanilla-css` |
| `CSS_FRAMEWORK` | `*sass*` OR `*scss*` | `stack/css/sass-scss` | `sass-scss` |
| `UI_LIBRARY` | `*shadcn*` | `stack/ui/shadcn-ui` | `shadcn-ui` |
| `UI_LIBRARY` | `*react-flow*` OR `*xyflow*` | `stack/ui/react-flow` | `react-flow` |
| `FRONTEND_FRAMEWORK` | `*react*` | `stack/ui/react-best-practices` | `react-best-practices` |
| `FRONTEND_FRAMEWORK` | `*react*` | `stack/ui/react-composition-patterns` | `react-composition-patterns` |
| `DESIGN_DIRECTION` | `*` (any confirmed value) | Fills `{{PLACEHOLDER}}`s in `.agent/skills/brand-guidelines/SKILL.md` in-place | `brand-guidelines` (in-place fill, not copy) |
| `DESIGN_DIRECTION` | `*cinematic*` OR `*immersive*` | `stack/3d/threejs-pro` | `threejs-pro` |

Note: `DESIGN_DIRECTION` does not copy a skill from the library — it fills placeholders in the pre-placed `.agent/skills/brand-guidelines/SKILL.md` template. Exception: when the direction is `Cinematic/Immersive`, `threejs-pro` is also installed as a standard skill copy, since WebGL and Three.js capabilities will be required.

### Authentication

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `AUTH_PROVIDER` | `*firebase*` | `stack/auth/firebase-auth` | `firebase-auth` |
| `AUTH_PROVIDER` | `*authjs*` OR `*next-auth*` OR `*nextauth*` | `stack/auth/authjs` | `authjs` |
| `AUTH_PROVIDER` | `*clerk*` | `stack/auth/clerk` | `clerk` |
| `AUTH_PROVIDER` | `*supabase*` | `stack/auth/supabase-auth` | `supabase-auth` |
| `AUTH_PROVIDER` | `*lucia*` | `stack/auth/lucia` | `lucia` |

### Payments

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `PAYMENTS` | `*stripe*` | `stack/payments/stripe-integration` | `stripe-integration` |
| `PAYMENTS` | `*lemon*` OR `*lemonsqueezy*` | `stack/payments/lemonsqueezy` | `lemonsqueezy` |

### AI / ML

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `AI_SDK` | `*vercel*` OR `*ai-sdk*` | `stack/ai/ai-sdk` | `ai-sdk` |
| `AI_SDK` | `*openai*` | `stack/ai/openai-sdk` | `openai-sdk` |
| `AI_SDK` | `*langchain*` | `stack/ai/langchain` | `langchain` |
| `AI_SDK` | `*ollama*` | `stack/ai/ollama` | `ollama` |

### State Management

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `STATE_MANAGEMENT` | `*tanstack*` OR `*react-query*` | `stack/state/tanstack-query` | `tanstack-query` |
| `STATE_MANAGEMENT` | `*zustand*` | `stack/state/zustand` | `zustand` |

### Testing

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `E2E_TESTING` | `*playwright*` | `stack/testing/playwright` | `playwright` |
| `UNIT_TESTING` | `*vitest*` | `stack/testing/vitest` | `vitest` |
| `UNIT_TESTING` | `*testing-library*` OR `*rtl*` | `stack/testing/testing-library` | `testing-library` |
| `UNIT_TESTING` | `*storybook*` | `stack/testing/storybook` | `storybook` |

### Hosting / Deployment

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `HOSTING` | `*cloudflare*` | `stack/hosting/cloudflare` | `cloudflare` |
| `HOSTING` | `*docker*` | `stack/hosting/docker-expert` | `docker-expert` |
| `HOSTING` | `*vercel*` | `stack/hosting/vercel` | `vercel` |
| `HOSTING` | `*aws*` | `stack/hosting/aws` | `aws` |

### Monitoring / Analytics

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `MONITORING` | `*sentry*` | `stack/monitoring/sentry` | `sentry` |
| `MONITORING` | `*posthog*` | `stack/monitoring/posthog` | `posthog` |
| `ANALYTICS` | `*google*` | `stack/analytics/google-analytics` | `google-analytics` |

### Observability

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `OBSERVABILITY` | `*opentelemetry*` OR `*otel*` | `stack/observability/opentelemetry` | `opentelemetry` |
| `OBSERVABILITY` | `*distributed-tracing*` OR `*jaeger*` OR `*zipkin*` | `stack/observability/distributed-tracing` | `distributed-tracing` |
| `OBSERVABILITY` | `*structured-logging*` OR `*pino*` OR `*winston*` | Pre-installed: `.agent/skills/logging-best-practices` | `logging-best-practices` (pre-installed) |
| `OBSERVABILITY` | `*python*` | `stack/observability/python-observability` | `python-observability` |
| `OBSERVABILITY` | `*datadog*` | `stack/observability/datadog` | `datadog` |
| `OBSERVABILITY` | `*prometheus*` OR `*grafana*` | `stack/observability/prometheus-grafana` | `prometheus-grafana` |

### Email

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `EMAIL` | `*resend*` | `stack/email/resend` | `resend` |

### Queues / Background Jobs

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `QUEUE` | `*inngest*` | `stack/queue/inngest` | `inngest` |
| `QUEUE` | `*bullmq*` OR `*bull*` | `stack/queue/bullmq` | `bullmq` |

### Realtime

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `REALTIME` | `*socket*` OR `*socket.io*` | `stack/realtime/socketio` | `socketio` |

### Search

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `SEARCH` | `*meilisearch*` | `stack/search/meilisearch` | `meilisearch` |
| `SEARCH` | `*elasticsearch*` OR `*elastic*` OR `*opensearch*` | `stack/search/elasticsearch` | `elasticsearch` |
| `SEARCH` | `*algolia*` | `stack/search/algolia` | `algolia` |
| `SEARCH` | `*typesense*` | `stack/search/typesense` | `typesense` |

### CMS

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `CMS` | `*payload*` | `stack/cms/payload-cms` | `payload-cms` |
| `CMS` | `*wordpress*` OR `*wp*` | `stack/cms/wordpress` | `wordpress` |
| `CMS` | `*shopify*` | `stack/cms/shopify` | `shopify` |

### Storage

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `STORAGE` | `*s3*` OR `*aws*` | `stack/storage/aws-s3` | `aws-s3` |
| `STORAGE` | `*r2*` OR `*cloudflare*` | `stack/storage/cloudflare-r2` | `cloudflare-r2` |
| `STORAGE` | `*gcs*` OR `*google cloud storage*` | `stack/storage/gcs` | `gcs` |

### CI/CD

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `CI_CD` | `*github*` | `stack/devops/github-actions` | `github-actions` |
| `CI_CD` | `*terraform*` | `stack/devops/terraform` | `terraform` |

### DevOps / Infrastructure

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `HOSTING` | `*kubernetes*` OR `*k8s*` | `stack/devops/kubernetes` | `kubernetes` |
| `HOSTING` | `*nginx*` | `stack/devops/nginx` | `nginx` |

### Mobile

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `MOBILE_FRAMEWORK` | `*expo*` OR `*react-native*` OR `*react native*` | `stack/mobile/react-native` | `react-native` |
| `MOBILE_FRAMEWORK` | `*flutter*` | `stack/mobile/flutter` | `flutter` |
| `MOBILE_FRAMEWORK` | `*swiftui*` OR `*swift*` | `stack/mobile/swiftui` | `swiftui` |
| `MOBILE_FRAMEWORK` | `*kotlin*` OR `*compose*` OR `*jetpack*` | `stack/mobile/kotlin-compose` | `kotlin-compose` |

### Languages

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `LANGUAGE` | `*typescript*` | `stack/languages/typescript-advanced-patterns` | `typescript-advanced-patterns` |
| `LANGUAGE` | `*python*` | `stack/languages/python` | `python` |
| `LANGUAGE` | `*rust*` | `stack/languages/rust` | `rust` |
| `LANGUAGE` | `*go*` OR `*golang*` | `stack/languages/go` | `go` |
| `LANGUAGE` | `*c++*` OR `*cpp*` OR `*c/c++*` | `stack/languages/c-cpp` | `c-cpp` |
| `LANGUAGE` | `*java*` | `stack/languages/java` | `java` |
| `LANGUAGE` | `*kotlin*` | `stack/languages/kotlin` | `kotlin` |
| `LANGUAGE` | `*javascript*` OR `*vanilla js*` | `stack/languages/vanilla-javascript` | `vanilla-javascript` |
| `LANGUAGE` | `*gdscript*` OR `*godot*` | `stack/languages/gdscript` | `gdscript` |
| `LANGUAGE` | `*bash*` OR `*shell*` | `stack/languages/bash-scripting` | `bash-scripting` |

### 3D

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `3D_FRAMEWORK` | `*three*` OR `*r3f*` | `stack/3d/threejs-pro` | `threejs-pro` |

### Game Engines

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `GAME_ENGINE` | `*godot*` | `stack/gamedev/godot` | `godot` |
| `GAME_ENGINE` | `*unity*` | `stack/gamedev/unity` | `unity` |

### Security

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `SECURITY` | `*owasp*` OR `*web-security*` | `stack/security/owasp-web-security` | `owasp-web-security` |
| `SECURITY` | `*crypto*` OR `*encryption*` | `stack/security/crypto-patterns` | `crypto-patterns` |
| `SECURITY` | `*csp*` OR `*cors*` OR `*headers*` | `stack/security/csp-cors-headers` | `csp-cors-headers` |
| `SECURITY` | `*dependency*` OR `*audit*` OR `*supply-chain*` | `stack/security/dependency-auditing` | `dependency-auditing` |
| `SECURITY` | `*sanitiz*` OR `*validation*` OR `*input*` | `stack/security/input-sanitization` | `input-sanitization` |

### Message Brokers

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `MESSAGE_BROKER` | `*kafka*` | `stack/messaging/kafka` | `kafka` |
| `MESSAGE_BROKER` | `*rabbitmq*` OR `*rabbit*` | `stack/messaging/rabbitmq` | `rabbitmq` |
| `MESSAGE_BROKER` | `*nats*` | `stack/messaging/nats` | `nats` |
| `MESSAGE_BROKER` | `*sqs*` OR `*aws sqs*` | `stack/messaging/sqs` | `sqs` |

### Notifications

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `NOTIFICATIONS` | `*twilio*` | `stack/notifications/twilio` | `twilio` |
| `NOTIFICATIONS` | `*fcm*` OR `*firebase*` OR `*push*` | `stack/notifications/fcm` | `fcm` |
| `NOTIFICATIONS` | `*sendgrid*` | `stack/notifications/sendgrid` | `sendgrid` |

### Extensions

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `BROWSER_EXTENSION` | `*wxt*` | `stack/extensions/wxt` | `wxt` |
| `BROWSER_EXTENSION` | `*plasmo*` | `stack/extensions/plasmo` | `plasmo` |
| `BROWSER_EXTENSION` | `*chrome*` OR `*extension*` OR `*mv3*` | `stack/extensions/chrome-extension` | `chrome-extension` |
| `VSCODE_EXTENSION` | `*vscode*` OR `*vs code*` OR `*vsce*` | `stack/extensions/vscode-extension` | `vscode-extension` |

### Feature Flags

| Stack Key | Value Pattern | Library Path | Installed As |
|-----------|--------------|-------------|-------------|
| `FEATURE_FLAGS` | `*launchdarkly*` | `stack/feature-flags/launchdarkly` | `launchdarkly` |
| `FEATURE_FLAGS` | `*posthog*` | `stack/feature-flags/posthog-flags` | `posthog-flags` |
| `FEATURE_FLAGS` | `*flagsmith*` | `stack/feature-flags/flagsmith` | `flagsmith` |

---

## Surface Triggers

When the project includes a surface type, install the listed skills.

### Web

| Surface Type | Library Path | Installed As |
|-------------|-------------|-------------|
| `web` | `surface/web/frontend-design` | `frontend-design` |
| `web` | `surface/web/seo-audit` | `seo-audit` |
| `web` | `surface/web/ai-seo` | `ai-seo` |
| `web` | `surface/web/schema-markup` | `schema-markup` |
| `web` | `surface/web/programmatic-seo` | `programmatic-seo` |
| `web` | `surface/web/analytics-tracking` | `analytics-tracking` |
| `web` | `surface/web/page-cro` | `page-cro` |
| `web` | `surface/web/web-performance-optimization` | `web-performance-optimization` |
| `web` | `surface/web/i18n-localization` | `i18n-localization` |
| `web` | `surface/web/accessibility-compliance` | `accessibility-compliance` |
| `web` | `surface/web/form-handling-validation` | `form-handling-validation` |
| `web` | `surface/web/authentication-ui-flows` | `authentication-ui-flows` |
| `web` | `surface/web/dark-mode-theming` | `dark-mode-theming` |
| `web` | `surface/web/offline-first-pwa` | `offline-first-pwa` |
| `web` | `surface/web/web-scraping` | `web-scraping` |
| `web` | `stack/security/owasp-web-security` | `owasp-web-security` |
| `web` | `stack/security/csp-cors-headers` | `csp-cors-headers` |
| `web` | `stack/security/input-sanitization` | `input-sanitization` |
| `web` | `surface/web/design-reference-data` | `design-reference-data` |
| `web` | `surface/web/frontend-verification` | `frontend-verification` |

> **Note**: The `frontend-design` skill includes a **Premium Cinematic Tier** with WebGL, custom shaders, and Awwwards-level animation patterns. When `DESIGN_DIRECTION` is `Cinematic/Immersive`, `threejs-pro` is also auto-installed (see CSS/UI triggers above).

### API

| Surface Type | Library Path | Installed As |
|-------------|-------------|-------------|
| `api` | `surface/api/rate-limiting-abuse-protection` | `rate-limiting-abuse-protection` |
| `api` | `surface/api/email-best-practices` | `email-best-practices` |
| `api` | `surface/api/api-error-handling` | `api-error-handling` |
| `api` | `surface/api/api-caching` | `api-caching` |
| `api` | `surface/api/api-documentation-openapi` | `api-documentation-openapi` |
| `api` | `surface/api/webhook-design` | `webhook-design` |
| `api` | Pre-installed: `.agent/skills/api-design-principles` | `api-design-principles` (pre-installed) |
| `api` | `surface/api/api-security-checklist` | `api-security-checklist` |
| `api` | `stack/security/input-sanitization` | `input-sanitization` |

### Mobile

| Surface Type | Library Path | Installed As |
|-------------|-------------|-------------|
| `mobile` | `surface/mobile/mobile-responsive-patterns` | `mobile-responsive-patterns` |
| `mobile` | `surface/mobile/mobile-offline-sync` | `mobile-offline-sync` |
| `mobile` | `surface/mobile/push-notifications` | `push-notifications` |
| `mobile` | `surface/mobile/app-store-submission` | `app-store-submission` |

### Desktop

| Surface Type | Library Path | Installed As |
|-------------|-------------|-------------|
| `desktop` | `surface/desktop/desktop-app-distribution` | `desktop-app-distribution` |
| `desktop` | `surface/desktop/native-os-integration` | `native-os-integration` |
| `desktop` | `surface/desktop/desktop-security-sandboxing` | `desktop-security-sandboxing` |
| `desktop` | `surface/desktop/desktop-ux-conventions` | `desktop-ux-conventions` |

### CLI

| Surface Type | Library Path | Installed As |
|-------------|-------------|-------------|
| `cli` | `surface/cli/cli-ux-design` | `cli-ux-design` |
| `cli` | `surface/cli/cli-configuration-management` | `cli-configuration-management` |
| `cli` | `surface/cli/cli-shell-integration` | `cli-shell-integration` |
| `cli` | `surface/cli/cli-error-diagnostics` | `cli-error-diagnostics` |

### Extension

| Surface Type | Library Path | Installed As |
|-------------|-------------|-------------|
| `extension` | `surface/extension/browser-extension-patterns` | `browser-extension-patterns` |
| `extension` | `surface/extension/plugin-architecture-design` | `plugin-architecture-design` |
| `extension` | `surface/extension/vscode-extension-development` | `vscode-extension-development` |

---

### All surfaces (universal)

| Surface Type | Library Path | Installed As |
|-------------|-------------|-------------|
| `*` (any surface) | `stack/security/dependency-auditing` | `dependency-auditing` |

> **Universal security baseline**: dependency auditing is provisioned for every project. The surface-specific security skills (owasp-web-security, csp-cors-headers, api-security-checklist) are provisioned only when their respective surfaces are confirmed.

## Meta Skills (manual install only)

These skills are NOT auto-installed. Install via `/find-skills` or manually copy from the library.

| Library Path | Description |
|-------------|-------------|
| `meta/mcp-builder` | Building MCP servers |
| `meta/tmux-processes` | Long-lived process management via tmux |
| `meta/using-tmux-for-interactive-commands` | Interactive CLI tools via tmux |
| Pre-installed: `.agent/skills/brand-guidelines` | Brand color and typography application (pre-installed) |
| `meta/product-marketing-context` | Marketing context document generator — run first before any SEO or CRO skill |

---

## Claude Code Skills (manual install only)

These skills are specific to Claude Code's plugin and agent system. Not applicable to Antigravity or other agents.

| Library Path | Description |
|-------------|-------------|
| `meta/claude-code/hook-development` | Claude Code hook system (PreToolUse, PostToolUse, Stop, SessionStart) |
| `meta/claude-code/plugin-structure` | Claude Code plugin architecture (.claude-plugin/plugin.json) |
| `meta/claude-code/agent-development` | Claude Code agent frontmatter (model, color, triggering examples) |

---

## Extending the Library

To add a new skill to the library:

1. Create a directory under the appropriate category: `.agent/skill-library/[category]/[subcategory]/[skill-name]/SKILL.md`
2. Add a row to the appropriate trigger table above
3. Use `{{PLACEHOLDER}}`s for any values that should be filled by bootstrap
4. Test by running `/bootstrap-agents` with a matching stack value

### Stack Key Reference

| Key | Description | Example Values |
|-----|-------------|---------------|
| `DATABASE` | Primary database | PostgreSQL, SurrealDB, Supabase, MongoDB, Redis, SQLite |
| `DATABASE_PRIMARY` | Main relational/document/multi-model store | PostgreSQL, SurrealDB, Supabase, MongoDB, SQLite |
| `DATABASE_VECTOR` | Semantic search, embeddings, similarity | Qdrant, pgvector, Pinecone, Weaviate |
| `DATABASE_GRAPH` | Graph traversal, relationship queries | Neo4j |
| `DATABASE_CACHE` | Caching layer | Redis |
| `DATABASE_TIMESERIES` | Time-ordered data, metrics, IoT | TimescaleDB, InfluxDB |
| `FRONTEND_FRAMEWORK` | Frontend framework | Next.js, Astro, SvelteKit, Nuxt, React |
| `BACKEND_FRAMEWORK` | Backend framework | Hono, FastAPI, NestJS, Express |
| `DESKTOP_FRAMEWORK` | Desktop app framework | Tauri, Electron |
| `API_LAYER` | API layer pattern | tRPC, GraphQL |
| `ORM` | Object-relational mapper | Drizzle, Prisma |
| `CSS_FRAMEWORK` | CSS framework | Tailwind CSS, Vanilla CSS, SASS/SCSS |
| `UI_LIBRARY` | UI component library | shadcn/ui, React Flow |
| `AUTH_PROVIDER` | Authentication provider | Firebase, Auth.js, Clerk |
| `PAYMENTS` | Payment processor | Stripe, Lemon Squeezy |
| `AI_SDK` | AI/ML SDK | Vercel AI SDK, OpenAI, LangChain, Ollama |
| `STATE_MANAGEMENT` | Client state management | TanStack Query, Zustand |
| `E2E_TESTING` | End-to-end test framework | Playwright |
| `UNIT_TESTING` | Unit test framework | Vitest, Testing Library, Storybook |
| `HOSTING` | Hosting platform | Cloudflare, Vercel, AWS, Docker, Kubernetes, Nginx |
| `MONITORING` | Error/analytics monitoring | Sentry, PostHog |
| `OBSERVABILITY` | Observability stack | OpenTelemetry, Distributed Tracing, Structured Logging, Datadog, Prometheus/Grafana |
| `ANALYTICS` | Web analytics | Google Analytics |
| `EMAIL` | Email service | Resend |
| `QUEUE` | Job queue | Inngest, BullMQ |
| `REALTIME` | Realtime communication | Socket.io |
| `SEARCH` | Search engine | Meilisearch |
| `CMS` | Content management | Payload CMS, WordPress, Shopify |
| `STORAGE` | File/object storage | AWS S3 |
| `CI_CD` | CI/CD pipeline | GitHub Actions, Terraform |
| `MOBILE_FRAMEWORK` | Mobile framework | Expo, React Native |
| `LANGUAGE` | Programming language | TypeScript, Python, Rust, Go, C/C++, Java, Kotlin, JavaScript, GDScript, Bash |
| `3D_FRAMEWORK` | 3D rendering | Three.js, React Three Fiber |
| `GAME_ENGINE` | Game engine | Godot, Unity |
| `SECURITY` | Security focus area | OWASP, Crypto, CSP/CORS, Dependency Auditing, Input Sanitization |
| `SECURITY_SKILLS` | Accumulated list of all provisioned security skills (comma-separated, auto-filled by bootstrap) | e.g., `owasp-web-security,csp-cors-headers,input-sanitization,dependency-auditing` |
| `DESIGN_DIRECTION` | Confirmed visual design direction | Minimal/Functional, Editorial, Luxury/Refined, Playful/Expressive, Technical/Brutalist, Cinematic/Immersive, or Hybrid |
