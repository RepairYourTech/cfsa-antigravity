# Infrastructure Verification Report Template

Use this template when creating the report during `/verify-infrastructure`.

## Initial Report (Step 0.6)

Create at `docs/audits/verify-infrastructure-YYYY-MM-DD-HHMM[-auth].md`:

```markdown
# Infrastructure Verification Report

**Date**: YYYY-MM-DD HH:MM
**Trigger**: [infrastructure slice | auth slice]
**Verdict**: ⏳ in-progress

## Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 0 | Placeholder audit | ⏳ | |
| 1 | CI/CD config | ⏳ | |
| 2 | CI/CD green | ⏳ | |
| 3 | Environment audit | ⏳ | |
| 4 | Migration check | ⏳ | |
| 5 | Staging deployment | ⏳ | |
| 6 | Auth smoke test | ⏳ | |
| 6.5 | Logging gate | ⏳ | |
| 6.6 | Error tracking gate | ⏳ | |

## Failures (if any)

None yet.

## Next Steps

In progress.
```

## Final Report (Step 8)

Update the same file — change the Verdict and fill in results:

```markdown
# Infrastructure Verification Report

**Date**: YYYY-MM-DD
**Trigger**: [infrastructure slice | auth slice]
**Verdict**: [PASS | FAIL]

## Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 0 | Placeholder audit | ✅/❌ | |
| 1 | CI/CD config | ✅/❌ | |
| 2 | CI/CD green | ✅/❌ | |
| 3 | Environment audit | ✅/❌ | |
| 4 | Migration check | ✅/❌ | |
| 5 | Staging deployment | ✅/❌ | |
| 6 | Auth smoke test | ✅/❌/⏭️ | |
| 6.5 | Logging gate | ✅/❌ | |
| 6.6 | Error tracking gate | ✅/❌ | |

## Failures (if any)

[Details of any failing checks]

## Next Steps

[What to do next based on the verdict]
```
