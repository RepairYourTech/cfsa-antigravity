# Placeholder → Workflow Mapping

Maps tech stack placeholders to the source keys and consuming workflows.

| Placeholder | Source Key | Workflows |
|---|---|---|
| `{{DATABASE_SKILLS}}` | `DATABASE_*` (accumulated) | create-prd, write-architecture-spec, write-be-spec-classify |
| `{{AUTH_SKILL}}` | `AUTH_PROVIDER` | create-prd, write-be-spec-classify |
| `{{BACKEND_FRAMEWORK_SKILL}}` | `BACKEND_FRAMEWORK` / `API_LAYER` | write-be-spec-classify |
| `{{API_DESIGN_SKILL}}` | `API_LAYER` (default: `api-design-principles`) | create-prd, create-prd-architecture, write-architecture-spec-design, write-be-spec-classify |
| `{{FRONTEND_FRAMEWORK_SKILL}}` | `FRONTEND_FRAMEWORK` | write-fe-spec-classify |
| `{{FRONTEND_DESIGN_SKILL}}` | `CSS_FRAMEWORK` / `UI_LIBRARY` | write-fe-spec-classify |
| `{{ACCESSIBILITY_SKILL}}` | surface: `accessibility-compliance` | write-fe-spec-classify, write-fe-spec-write, write-architecture-spec-design, validate-phase |
| `{{LANGUAGE_SKILL}}` | `LANGUAGE` | implement-slice-setup, implement-slice-tdd, write-be-spec-classify, write-fe-spec-classify, evolve-contract |
| `{{CI_CD_SKILL}}` | `CI_CD` | create-prd-compile, decompose-architecture-structure, plan-phase, verify-infrastructure, validate-phase |
| `{{HOSTING_SKILL}}` | `HOSTING` | create-prd-architecture, decompose-architecture-structure, plan-phase, verify-infrastructure, validate-phase |
| `{{ORM_SKILL}}` | `ORM` | create-prd-architecture, write-be-spec-classify, implement-slice-setup, verify-infrastructure, validate-phase |
| `{{UNIT_TESTING_SKILL}}` | `UNIT_TESTING` | create-prd-compile, implement-slice-setup, implement-slice-tdd, write-be-spec-classify, evolve-contract |
| `{{E2E_TESTING_SKILL}}` | `E2E_TESTING` | create-prd-compile, implement-slice-tdd, validate-phase |
| `{{STATE_MANAGEMENT_SKILL}}` | `STATE_MANAGEMENT` | write-fe-spec-classify, implement-slice-setup |
| `{{SECURITY_SKILLS}}` | `SECURITY` + surface triggers (accumulated) | create-prd-security, write-architecture-spec-design, validate-phase |
