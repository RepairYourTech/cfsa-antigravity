# Constraint Questions

Use these per-axis constraint questions to filter the option space before presenting choices.

| Axis | Constraint Questions |
|------|---------------------|
| **Hosting** | Is there an existing cloud provider? Budget ceiling per month? Compliance requirements (data residency, SOC2)? Team familiarity? |
| **Database** | Expected data volume? Read/write ratio? Need for graph/document/relational? Existing database expertise? Multi-tenancy requirements? |
| **Auth** | Social login required? SSO/SAML needed? Age verification? Compliance (COPPA, GDPR)? Budget for auth provider? |
| **Frontend framework** | SSR required for SEO? Static site sufficient? Interactive app needs? Team framework experience? |
| **Backend runtime** | Latency requirements? Cold start tolerance? Existing language expertise? Deployment target (edge, server, serverless)? |
| **CI/CD** | Existing CI provider? Monorepo or polyrepo? Deployment frequency? Manual approval gates needed? |

## Per-axis flow

1. Ask the constraint questions for this axis
2. Filter options based on answers
3. Present the filtered option table with recommendation
4. Wait for user confirmation
5. Fire bootstrap with only that key: read `.agent/workflows/bootstrap-agents.md` and call with `PIPELINE_STAGE=create-prd` + the confirmed key (e.g., `DATABASE=SurrealDB`)
6. Move to next axis
