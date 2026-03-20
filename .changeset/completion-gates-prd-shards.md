---
"cfsa-antigravity": patch
---

fix: add Completion Gate enforcement to 4 create-prd shard workflows

Added mandatory Completion Gate sections to `create-prd-stack`, `create-prd-design-system`, `create-prd-architecture`, and `create-prd-security` workflows. When invoked standalone, these shards now enforce memory capture (patterns, decisions, blockers), progress tracking, and session logging before reporting completion. This ensures high-impact decisions (tech stack, design system, architecture, security model) are never silently dropped from memory.
