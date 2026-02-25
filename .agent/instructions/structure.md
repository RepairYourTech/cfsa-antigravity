# Project Structure

<!-- 
  THIS FILE IS A TEMPLATE.
  The /bootstrap-agents workflow will fill in your project-specific structure.
-->

## Current Layout

```
{{PROJECT_STRUCTURE}}
```

## Architecture Separation

| Concern | Location | Runtime |
|---------|----------|---------|
| {{ARCHITECTURE_TABLE}} |

## Protected Files (Do Not Modify Without Approval)
- `AGENTS.md` — Project agent config
- `docs/plans/ENGINEERING-STANDARDS.md` — Quality bar
- `.agent/instructions/*` — Agent rules
- `package.json` — Dependencies (add carefully)
- `tsconfig.json` — TypeScript config

## Notes
- All agent config lives in `.agent/` (canonical for all agents)
- Frontend and API may be separately deployed depending on architecture
