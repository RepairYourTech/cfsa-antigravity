---
name: dependency-auditing
description: "Dependency security auditing: npm audit, Snyk, Socket.dev, Dependabot, supply chain attack prevention, lockfile integrity, SBOM generation, CVE monitoring, and CI integration for blocking vulnerable dependencies. Use when auditing project dependencies, setting up automated security scanning, or responding to vulnerability alerts."
version: 1.0.0
---

# Dependency Security Auditing

**Status**: Production Ready
**Last Updated**: 2026-02-17
**Dependencies**: None (standalone skill)

---

## Use This Skill When

- Auditing project dependencies for known vulnerabilities
- Setting up automated dependency security scanning in CI/CD
- Responding to CVE alerts or vulnerability disclosures
- Evaluating new dependencies before adding them to a project
- Implementing supply chain security controls
- Generating Software Bills of Materials (SBOMs)
- Configuring Dependabot, Renovate, or similar update tools

## Do Not Use This Skill When

- You need application-level security patterns (use owasp-web-security skill)
- You need to configure CSP or CORS headers (use csp-cors-headers skill)
- You need cryptographic implementation guidance (use crypto-patterns skill)

---

## npm audit

Built into npm. Checks installed packages against the npm advisory database.

### Running Audits

```bash
# Basic audit -- shows all known vulnerabilities
npm audit

# JSON output for programmatic processing
npm audit --json

# Only show production dependencies (skip devDependencies)
npm audit --omit=dev

# Automatically fix vulnerabilities where possible
npm audit fix

# Force major version bumps if needed (review changes carefully)
npm audit fix --force

# Audit specific severity levels
npm audit --audit-level=high
```

### CI Integration

```yaml
# GitHub Actions -- fail build on high/critical vulnerabilities
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm audit --audit-level=high
```

### Understanding Audit Output

```
# Example output
high    Prototype Pollution in lodash
Package lodash
Patched in >=4.17.21
Dependency of my-app > old-lib > lodash
Path    my-app > old-lib > lodash
More info https://github.com/advisories/GHSA-xxxx
```

Key fields:
- **Severity**: critical, high, moderate, low
- **Patched in**: Version range that includes the fix
- **Path**: The dependency chain that pulls in the vulnerable package
- **More info**: Link to the full advisory

### Handling Audit Results

```typescript
// scripts/audit-check.ts -- custom audit processing
import { execSync } from "child_process";

interface AuditResult {
  vulnerabilities: Record<string, {
    severity: "critical" | "high" | "moderate" | "low";
    via: string[];
    fixAvailable: boolean;
  }>;
}

function checkAudit(): void {
  try {
    execSync("npm audit --json", { encoding: "utf8" });
    console.log("No vulnerabilities found.");
  } catch (error: any) {
    const result: AuditResult = JSON.parse(error.stdout);
    const critical = Object.entries(result.vulnerabilities)
      .filter(([, v]) => v.severity === "critical" || v.severity === "high");

    if (critical.length > 0) {
      console.error(`Found ${critical.length} high/critical vulnerabilities:`);
      for (const [name, info] of critical) {
        console.error(`  - ${name} (${info.severity}), fix available: ${info.fixAvailable}`);
      }
      process.exit(1);
    }

    console.warn("Only moderate/low vulnerabilities found. Proceeding.");
  }
}

checkAudit();
```

---

## Snyk

Commercial vulnerability scanner with a free tier. Provides deeper analysis
than npm audit, including license compliance and fix PRs.

### Setup

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test project for vulnerabilities
snyk test

# Monitor project (creates a snapshot in Snyk dashboard)
snyk monitor

# Test a specific package before installing
snyk test lodash@4.17.20

# Test only production dependencies
snyk test --production

# Output as JSON
snyk test --json

# Set severity threshold
snyk test --severity-threshold=high
```

### CI Integration

```yaml
# GitHub Actions with Snyk
name: Snyk Security
on: [push, pull_request]

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### Snyk Configuration

```yaml
# .snyk file -- policy configuration
version: v1.25.0
ignore:
  SNYK-JS-LODASH-590103:
    - "*":
        reason: "Not exploitable in our usage context"
        expires: "2026-06-01T00:00:00.000Z"
patch: {}
```

---

## Socket.dev

Focuses on supply chain security -- detects malicious packages, typosquatting,
install scripts, and suspicious behavior patterns that traditional vulnerability
scanners miss.

### What Socket Detects

| Threat | Description | Example |
|--------|-------------|---------|
| Typosquatting | Packages with names similar to popular ones | `lodahs` instead of `lodash` |
| Install scripts | Packages that run code during `npm install` | `postinstall` scripts that exfiltrate env vars |
| Obfuscated code | Minified or encoded code in published packages | Base64-encoded payloads |
| Network access | Packages that make HTTP requests | Telemetry or data exfiltration |
| Shell access | Packages that spawn shell commands | `child_process.exec()` calls |
| Environment access | Packages that read environment variables | Stealing API keys from `process.env` |
| Filesystem access | Packages that read/write unexpected files | Reading SSH keys or credentials |

### GitHub Integration

Socket.dev provides a GitHub App that automatically comments on PRs when new
dependencies are added. Install from: https://github.com/apps/socket-security

### Manual Checks

```bash
# Check a specific package on socket.dev
# Visit: https://socket.dev/npm/package/<package-name>

# Review before installing
# Look for:
# - Number of maintainers (single maintainer = higher risk)
# - Recent ownership transfers
# - Install scripts
# - Network/filesystem access patterns
```

---

## GitHub Dependabot

Automated dependency update PRs with vulnerability alerts.

### Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    # Group minor and patch updates together
    groups:
      production-dependencies:
        dependency-type: "production"
        update-types:
          - "minor"
          - "patch"
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
    # Ignore specific packages
    ignore:
      - dependency-name: "aws-sdk"
        update-types: ["version-update:semver-major"]
    # Allow only specific update types
    allow:
      - dependency-type: "direct"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"

  # Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Dependabot Security Updates vs Version Updates

| Feature | Security Updates | Version Updates |
|---------|-----------------|-----------------|
| Triggered by | CVE advisory | Scheduled check |
| Auto-enabled | Yes (for public repos) | No (requires config) |
| Scope | Vulnerable packages only | All outdated packages |
| Priority | Immediate | Scheduled |

---

## Supply Chain Attack Prevention

### Dependency Confusion

Attackers publish public packages with the same name as internal/private packages.
npm resolves the public registry version, pulling in malicious code.

```json
// .npmrc -- prevent dependency confusion
// Scope your private packages and use a private registry
@mycompany:registry=https://npm.mycompany.com/
//npm.mycompany.com/:_authToken=${NPM_TOKEN}

// Disable public fallback for scoped packages
@mycompany:always-auth=true
```

```json
// package.json -- use scoped packages for internal code
{
  "name": "@mycompany/web-app",
  "dependencies": {
    "@mycompany/shared-utils": "^1.0.0",
    "@mycompany/auth-lib": "^2.0.0"
  }
}
```

### Typosquatting Prevention

```bash
# Before installing any package, verify:
# 1. Package name is spelled correctly
# 2. Package has significant download numbers
# 3. Package is maintained by expected author/org
# 4. Package has a public repository linked

# Use npx to check package info before installing
npm info <package-name>

# Check for known typosquats
# Visit: https://socket.dev/npm/package/<package-name>
```

### Lockfile Integrity

```bash
# ALWAYS use npm ci in CI/CD (respects lockfile exactly)
npm ci

# NEVER use npm install in CI/CD (may modify lockfile)
# npm install  <-- DO NOT USE IN CI

# Verify lockfile integrity
npm audit signatures

# Git hook to prevent unlocked dependencies
# .husky/pre-commit
npm ci --ignore-scripts && git diff --exit-code package-lock.json
```

```yaml
# CI pipeline -- verify lockfile has not been tampered with
- name: Verify lockfile integrity
  run: |
    npm ci
    git diff --exit-code package-lock.json || (echo "Lockfile was modified unexpectedly" && exit 1)
```

### Pinning Strategies

| Strategy | Syntax | Pros | Cons |
|----------|--------|------|------|
| Exact pinning | `"lodash": "4.17.21"` | Maximum reproducibility | Manual updates needed |
| Tilde (patch) | `"lodash": "~4.17.21"` | Auto-patch updates | Minor versions skipped |
| Caret (minor) | `"lodash": "^4.17.21"` | Auto-minor+patch updates | More risk than pinning |
| Lockfile-only | `"lodash": "^4.17.21"` + lockfile | Flexibility + reproducibility | Requires `npm ci` discipline |

**Recommendation**: Use caret ranges in `package.json` with strict lockfile
enforcement (`npm ci` in CI). This gives you Dependabot-friendly updates with
reproducible builds.

---

## Software Bill of Materials (SBOM)

An SBOM is a complete inventory of all software components in your application.
Required for supply chain transparency and some compliance frameworks.

### Generating SBOMs

```bash
# CycloneDX format (recommended)
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# SPDX format
npx spdx-sbom-generator -o sbom-spdx.json

# GitHub automatically generates SBOMs
# Settings > Code security and analysis > Dependency graph
```

### SBOM in CI/CD

```yaml
# Generate and upload SBOM as build artifact
- name: Generate SBOM
  run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json

- name: Upload SBOM
  uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.json
    retention-days: 90
```

---

## License Compliance

### SPDX License Identifiers

| License | SPDX ID | Commercial Use | Copyleft |
|---------|---------|----------------|----------|
| MIT | MIT | Yes | No |
| Apache 2.0 | Apache-2.0 | Yes | No |
| BSD 2-Clause | BSD-2-Clause | Yes | No |
| ISC | ISC | Yes | No |
| GPL 3.0 | GPL-3.0-only | Yes (with conditions) | Yes (strong) |
| LGPL 3.0 | LGPL-3.0-only | Yes | Yes (weak) |
| AGPL 3.0 | AGPL-3.0-only | Yes (with conditions) | Yes (network) |
| Unlicense | Unlicense | Yes | No |

### Checking Licenses

```bash
# Check all dependency licenses
npx license-checker --summary

# Check for problematic licenses
npx license-checker --failOn "GPL-3.0-only;AGPL-3.0-only"

# Output as CSV for review
npx license-checker --csv --out licenses.csv

# Check specific production dependencies only
npx license-checker --production --summary
```

```yaml
# CI integration -- block copyleft licenses
- name: License Check
  run: npx license-checker --production --failOn "GPL-3.0-only;AGPL-3.0-only;AGPL-3.0-or-later"
```

---

## CVE Database Monitoring

### Key Databases

| Database | URL | Scope |
|----------|-----|-------|
| NVD (NIST) | https://nvd.nist.gov/ | All software |
| GitHub Advisory Database | https://github.com/advisories | Open source packages |
| npm Advisories | https://www.npmjs.com/advisories | npm packages |
| Snyk Vulnerability DB | https://snyk.io/vuln/ | Multi-ecosystem |
| OSV (Google) | https://osv.dev/ | Open source |

### Monitoring Setup

```yaml
# GitHub Actions -- scheduled vulnerability scan
name: Scheduled Security Scan
on:
  schedule:
    - cron: "0 8 * * 1-5"  # Weekdays at 8 AM UTC
  workflow_dispatch: {}

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm audit --audit-level=high
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Security audit failed. Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Pre-Install Evaluation Checklist

Before adding any new dependency, evaluate:

- [ ] Is the package name spelled correctly? (typosquatting check)
- [ ] Does it have significant weekly downloads? (>1000 for utilities)
- [ ] Is it actively maintained? (commits in last 6 months)
- [ ] Does it have multiple maintainers? (bus factor)
- [ ] Is the license compatible with your project?
- [ ] Does it have install scripts? (check `scripts` in its package.json)
- [ ] What are its transitive dependencies? (`npm info <pkg> dependencies`)
- [ ] Has it had recent security advisories?
- [ ] Is there a lighter alternative? (fewer deps = smaller attack surface)
- [ ] Can you vendor it instead? (copy source for small utilities)

---

## Anti-Patterns

| Anti-Pattern | Risk | Fix |
|-------------|------|-----|
| `npm install` in CI | Non-deterministic builds | Always use `npm ci` |
| Ignoring audit warnings | Known vulnerabilities in production | Fix or explicitly acknowledge with timeline |
| No lockfile in repo | Different installs on different machines | Commit package-lock.json |
| Star (`*`) version ranges | Completely unpinned dependencies | Use caret (`^`) or exact versions |
| No scheduled scans | New CVEs go unnoticed | Weekly automated audits |
| Blind `npm audit fix --force` | May break functionality | Review each fix individually |
| No SBOM generation | No supply chain visibility | Generate and archive SBOMs |
| Ignoring license compliance | Legal liability | Automated license checking in CI |
| Installing from tarballs/URLs | Bypasses registry integrity | Use registry packages only |
| No private registry for internal packages | Dependency confusion risk | Scope and configure private registry |

---

## References

- **npm audit Documentation**: https://docs.npmjs.com/cli/commands/npm-audit
- **Snyk Documentation**: https://docs.snyk.io/
- **Socket.dev**: https://socket.dev/
- **Dependabot Configuration**: https://docs.github.com/en/code-security/dependabot
- **CycloneDX SBOM Specification**: https://cyclonedx.org/
- **SPDX License List**: https://spdx.org/licenses/
- **OpenSSF Scorecard**: https://securityscorecards.dev/

---

**Last verified**: 2026-02-17 | **Skill version**: 1.0.0
