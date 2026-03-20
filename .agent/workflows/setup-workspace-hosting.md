---
description: Hosting platform provisioning, domain configuration, deployment pipeline, and first staging deploy for the setup-workspace workflow
parent: setup-workspace
shard: hosting
standalone: true
position: 3
pipeline:
  position: 8.53
  stage: setup
  predecessors: [setup-workspace-cicd]
  successors: [setup-workspace-data]
  skills: [deployment-procedures, workflow-automation]
  calls-bootstrap: false
---

// turbo-all

# Setup Workspace — Hosting

Provision the hosting platform, configure domains, set up the deployment pipeline, and execute the first staging deploy. Gate: staging URL accessible with HTTP 200.

**Prerequisite**: CI/CD pipeline configured (from `/setup-workspace-cicd`). Surface stack map Hosting cell populated.

---

## 1. Load hosting skill

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md`.

Load the Hosting skill from the cross-cutting section of the surface stack map (`.agent/instructions/tech-stack.md`).

Read the loaded skill's `SKILL.md` (e.g., `.agent/skills/vercel/SKILL.md`, `.agent/skills/aws/SKILL.md`, `.agent/skills/cloudflare/SKILL.md`).

Also read `.agent/skills/deployment-procedures/SKILL.md` for deployment principles.

---

## 2. Determine hosting architecture

Read `docs/plans/*-architecture-design.md` for deployment topology.

| Pattern | Hosting Strategy |
|---------|-----------------|
| **Monolith** | Single deployment target (one app, one URL) |
| **Monorepo** | Per-service deploy targets OR single deployment with routing |
| **Multi-repo** | Each repo deploys independently to its own target |
| **Hub-and-spoke** | Hub service + spoke services with service discovery / API gateway |

For **hub-and-spoke** or **microservices**, determine:
- Which services are public-facing vs internal-only
- Inter-service communication method (HTTP, message queue, gRPC)
- Whether an API gateway / reverse proxy is needed
- Load balancing requirements

---

## 3. Provision hosting platform

Using the Hosting skill's patterns:

### 3a. Create project(s) on the hosting platform

For each deployable service:

1. Create the project/app on the hosting platform (e.g., `vercel project create`, Terraform apply, AWS CDK deploy)
2. Configure the build settings:
   - Build command (from `.agent/instructions/commands.md`)
   - Output directory
   - Install command
   - Runtime version
3. Link to the git repository (for auto-deploy on push, if the platform supports it)

### 3b. Configure environments

Each project needs at minimum:

| Environment | Purpose | Branch |
|-------------|---------|--------|
| **Staging** | Pre-production testing | `main` or `staging` branch |
| **Production** | Live traffic | `main` or release tags |

If the architecture doc specifies additional environments (preview, canary), configure those too.

### 3c. Set environment variables

For each environment on the hosting platform:

1. Read `.env.example` for the full variable list
2. Set non-secret variables directly (e.g., `NODE_ENV=production`, `LOG_LEVEL=info`)
3. For secrets: configure through the platform's secret management (not hardcoded)
4. For database connection strings: these will be set after `/setup-workspace-data` — leave a placeholder comment noting this

> [!IMPORTANT]
> All secrets must go through the hosting platform's secret management system. Never hardcode secrets in build configs, environment files committed to git, or CI/CD pipeline files.

---

## 4. Configure domains and DNS

Read `docs/plans/*-architecture-design.md` for domain requirements.

If custom domains are specified:

1. Configure domain on the hosting platform
2. Set up DNS records (CNAME, A, or AAAA as required)
3. Configure SSL/TLS (automatic via platform, or Let's Encrypt, or custom cert)
4. Verify domain propagation

If no custom domain specified: use the platform's default domain (e.g., `*.vercel.app`, `*.fly.dev`).

For **multi-service**: configure subdomains or path-based routing as specified in the architecture doc.

---

## 5. Create deployment pipeline

Integrate the hosting platform with the CI/CD pipeline created in the previous shard:

1. **Add deploy stage** to the CI/CD config (after build):
   - Staging: auto-deploy on push to main (or staging branch)
   - Production: manual approval gate or tag-based trigger
2. **Configure deploy credentials** in CI/CD secrets
3. **Add health check** post-deploy step:
   - Hit staging URL after deploy
   - Verify HTTP 200 response
   - If health check fails: trigger rollback

Read `.agent/skills/deployment-procedures/SKILL.md` for rollback strategy patterns. Document the rollback procedure in the project's README or deployment docs.

---

## 6. Execute first staging deploy

1. Commit deployment config changes: `chore: configure hosting and deployment pipeline`
2. Push to trigger the CI/CD pipeline + deployment
3. Wait for deployment to complete
4. Verify the staging URL is accessible:
   - HTTP GET to staging URL → expect 200
   - Verify the response is from the scaffolded app (not a platform error page)

**If deployment fails** → **STOP.** Debug using:
1. CI/CD logs (deploy stage)
2. Hosting platform logs
3. Build output
4. Environment variable configuration

Common first-deploy failures:

| Symptom | Likely Cause |
|---------|-------------|
| Build fails on platform | Missing env var, wrong build command, wrong output dir |
| 404 on staging URL | Routing misconfiguration, wrong root directory |
| 500 on staging URL | Missing runtime env var, wrong Node/Python version |
| Deploy timeout | Build too slow, increase timeout or optimize |

---

## 7. Verification gate

**Pass criteria:**

- [ ] Project created on hosting platform
- [ ] Staging environment configured
- [ ] Environment variables set (non-secret)
- [ ] Secret placeholders documented
- [ ] Deployment pipeline integrated with CI/CD
- [ ] First staging deploy succeeded
- [ ] Staging URL returns HTTP 200

> Present result to user: "✅ Hosting configured. Staging at [URL]. Proceeding to database setup." or "❌ Hosting failed: [error]. Fix required."
