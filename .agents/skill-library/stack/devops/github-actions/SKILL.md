---
name: github-actions
description: Build CI/CD pipelines with GitHub Actions including workflow syntax, triggers, caching, matrix builds, secrets, reusable workflows, and deployment protection. Use when automating testing, building, deploying, or any repository automation with GitHub Actions.
version: 1.0.0
---

# GitHub Actions CI/CD

Build CI/CD pipelines and repository automation with GitHub Actions. GitHub Actions uses YAML workflow files triggered by repository events to run jobs on hosted or self-hosted runners.

## When to Use This Skill

- Automating test suites on pull requests
- Building and deploying applications
- Publishing packages to npm, Docker Hub, or other registries
- Running scheduled maintenance tasks
- Enforcing code quality gates (lint, type-check, coverage)
- Automating release workflows

## Workflow Structure

```
.github/
  workflows/
    ci.yml           # Continuous integration
    deploy.yml       # Deployment pipeline
    release.yml      # Release automation
  actions/
    setup/           # Composite action for shared setup
      action.yml
```

## Workflow Syntax

### Basic CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Cancel in-progress runs for the same branch/PR
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint
      - run: pnpm type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 1
```

## Triggers

### Common Trigger Patterns

```yaml
on:
  # Push to specific branches
  push:
    branches: [main, 'release/**']
    paths-ignore:
      - '**.md'
      - 'docs/**'

  # Pull requests
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

  # Manual trigger with inputs
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [staging, production]
      dry_run:
        description: 'Dry run (no actual deploy)'
        type: boolean
        default: false

  # Scheduled (cron)
  schedule:
    - cron: '0 6 * * 1' # Every Monday at 6:00 AM UTC

  # On release
  release:
    types: [published]

  # Triggered by another workflow
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'
    secrets:
      DEPLOY_KEY:
        required: true
```

### Path Filtering

```yaml
on:
  push:
    branches: [main]
    # Only run when these paths change
    paths:
      - 'src/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - '.github/workflows/ci.yml'
```

## Matrix Strategy

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # Don't cancel other jobs if one fails
      matrix:
        os: [ubuntu-latest, macos-latest]
        node-version: [20, 22]
        # Exclude specific combinations
        exclude:
          - os: macos-latest
            node-version: 20
        # Add specific combinations
        include:
          - os: ubuntu-latest
            node-version: 22
            coverage: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: pnpm test
      - if: matrix.coverage
        run: pnpm test -- --coverage
```

## Caching

### Dependency Caching

```yaml
# Option 1: Built-in cache with setup-node
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'pnpm'  # Automatically caches pnpm store

# Option 2: Manual cache for custom paths
- uses: actions/cache@v4
  id: build-cache
  with:
    path: |
      ~/.cache
      node_modules/.cache
      .next/cache
    key: build-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('src/**') }}
    restore-keys: |
      build-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
      build-${{ runner.os }}-
```

### Turbo Cache

```yaml
- uses: actions/cache@v4
  with:
    path: node_modules/.cache/turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
```

## Secrets Management

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # References a GitHub environment
    steps:
      - run: deploy --token ${{ secrets.DEPLOY_TOKEN }}
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}

      # NEVER echo secrets
      # NEVER use secrets in if conditions (logs may leak)
      # NEVER pass secrets as command-line arguments (visible in process list)
```

### OIDC for Cloud Providers (No Static Secrets)

```yaml
jobs:
  deploy-aws:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # Required for OIDC
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
          aws-region: us-east-1
      # No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY needed
```

## Environment Protection Rules

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: deploy-to-staging.sh

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://app.example.com
    # Environment can require:
    # - Manual approval from specific reviewers
    # - Wait timer (e.g., 15 minutes)
    # - Branch restrictions (only main)
    steps:
      - run: deploy-to-production.sh
```

## Composite Actions

Reusable setup steps shared across workflows.

```yaml
# .github/actions/setup/action.yml
name: 'Project Setup'
description: 'Install dependencies and setup environment'

inputs:
  node-version:
    description: 'Node.js version'
    default: '22'

runs:
  using: 'composite'
  steps:
    - uses: pnpm/action-setup@v4
      with:
        version: 9

    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'pnpm'

    - run: pnpm install --frozen-lockfile
      shell: bash
```

```yaml
# Usage in workflows
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup
    with:
      node-version: '22'
  - run: pnpm test
```

## Reusable Workflows

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      app-url:
        required: true
        type: string
    secrets:
      DEPLOY_KEY:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.environment }}
      url: ${{ inputs.app-url }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: pnpm build
      - run: deploy --env ${{ inputs.environment }}
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

```yaml
# Calling the reusable workflow
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
      app-url: https://staging.example.com
    secrets:
      DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
      app-url: https://app.example.com
    secrets:
      DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}
```

## Concurrency Groups

```yaml
# Prevent concurrent deployments to the same environment
concurrency:
  group: deploy-${{ inputs.environment }}
  cancel-in-progress: false  # Queue, don't cancel

# Cancel superseded CI runs on the same PR
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

## Artifact Handling

```yaml
# Upload
- uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: |
      test-results/
      coverage/
    retention-days: 30
    if-no-files-found: error  # 'warn' or 'ignore'

# Download in another job
- uses: actions/download-artifact@v4
  with:
    name: test-results
    path: ./downloaded-results
```

## Service Containers

```yaml
jobs:
  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
```

## Conditional Execution

```yaml
steps:
  # Run only on main branch
  - if: github.ref == 'refs/heads/main'
    run: pnpm deploy

  # Run only on PRs
  - if: github.event_name == 'pull_request'
    run: pnpm test -- --coverage

  # Run only when specific files changed
  - uses: dorny/paths-filter@v3
    id: changes
    with:
      filters: |
        backend:
          - 'server/**'
        frontend:
          - 'src/**'

  - if: steps.changes.outputs.backend == 'true'
    run: pnpm test:backend

  - if: steps.changes.outputs.frontend == 'true'
    run: pnpm test:frontend

  # Continue on error
  - run: pnpm lint
    continue-on-error: true

  # Run even if previous steps failed
  - if: always()
    run: cleanup.sh

  # Run only on failure
  - if: failure()
    run: notify-slack.sh
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Installing dependencies in every job | Use composite actions or cache restoration |
| Using `actions/checkout@v2` or other old versions | Always use latest major: `@v4` |
| Hardcoding secrets in workflow files | Use `secrets` context and GitHub Secrets |
| Running all tests on every change | Use path filters and matrix to run relevant tests |
| Using `continue-on-error: true` to hide failures | Fix the underlying issue; use it only for non-blocking checks |
| Not setting `concurrency` on deploy workflows | Concurrent deploys cause race conditions |
| Using `pull_request_target` without understanding security | `pull_request_target` runs with write access -- review carefully |
| Not pinning action versions | Pin to SHA or major version: `actions/checkout@v4` minimum |

## Permissions (Least Privilege)

```yaml
# Set minimal permissions at the workflow level
permissions:
  contents: read
  pull-requests: write  # Only if needed (e.g., commenting on PRs)

jobs:
  deploy:
    permissions:
      contents: read
      id-token: write    # For OIDC
      deployments: write # For deployment status
```
