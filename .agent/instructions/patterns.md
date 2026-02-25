# Code Patterns & Conventions

<!-- 
  THIS FILE IS A TEMPLATE. 
  The /bootstrap-agents workflow will fill in your project-specific patterns.
  Sections marked with {{PLACEHOLDER}} will be replaced.
-->

## TypeScript → skills: `clean-code`, `typescript-advanced-patterns`
- **Strict mode** everywhere — `strict: true` in tsconfig
- **Explicit types** — No `any`, no implicit returns
- **Zod validation** — All API inputs validated with Zod schemas
- **Self-documenting** — Clear naming over comments
- **Zod inference** — Derive TypeScript types from Zod schemas with `z.infer<typeof schema>`

## File Organization → skill: `clean-code`
- **Max 300 lines** per file — Split when approaching limit
- **Single responsibility** — One component/module per file
- **Named exports** — No default exports for utilities
- **Direct imports** — Import from specific files, avoid barrel files

## Components
<!-- {{FRAMEWORK_PATTERNS}} — Filled by /bootstrap-agents based on chosen frontend framework -->

## API & Data → skill: `rest-api-design`
- **Input validation** — Zod schemas on every endpoint
- **Error format** — Consistent: `{ success: boolean, data?: T, error?: { code, message } }`
- **No magic strings** — Constants and enums for repeated values
- **Rate limiting** — On all public-facing endpoints

## Security → skill: `security-scanning-security-hardening`
- **No secrets in client code** — Server-side only, environment variables
- **CSP headers** — Content Security Policy on all responses
- **Input sanitization** — Prevent XSS, injection attacks
- **CORS configured** — Explicit allowed origins, no wildcards in production

## Naming
- **Files:** kebab-case (`user-profile.tsx`)
- **Components:** PascalCase (`UserProfile`)
- **Functions:** camelCase (`getUserById`)
- **Constants:** SCREAMING_SNAKE (`MAX_RETRY_COUNT`)
- **Types/Interfaces:** PascalCase (`UserSession`)

## What NOT to Do
- No `console.log` in committed code — Use a structured logging utility
- No `// TODO` — Lazy placeholders are banned. If the information you need genuinely doesn't exist yet, use a `// BOUNDARY:` stub (see rule: `boundary-not-placeholder`)
- No `any` type — Ever
- No inline styles — Use CSS classes or scoped styles
- No hardcoded URLs — Use environment config
- No barrel files (`index.ts`) — Import directly from source files

<!-- 
  Add project-specific sections below as your stack evolves:
  ## State & Data
  ## Caching
  ## Observability
  ## Payments
  ## Email
  ## Images
-->
