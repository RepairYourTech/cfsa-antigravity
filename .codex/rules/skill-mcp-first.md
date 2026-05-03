---
description: Check skills and MCPs before reasoning on your own — leverage existing knowledge first
trigger: always_on
---

# Skill and MCP First

> Before doing anything yourself, check if a skill or MCP already knows how to do it.

## The Rule

**When you receive any task, BEFORE reasoning about how to do it:**

1. **Scan skills.** Read through the skill names and descriptions already loaded in your context. If a skill matches the task or a sub-task, read its `SKILL.md` and follow it.

2. **Scan MCPs.** Check if any connected MCP server provides tools relevant to the task. If so, use the MCP tool instead of inventing your own approach.

3. **Only then think.** If no skill or MCP covers the task, proceed with your own reasoning.

## Why

| Without this rule | With this rule |
|---|---|
| You reinvent patterns already documented in skills | You leverage tested, refined procedures |
| You ignore MCP tools and use workarounds | You use the right tool for the job |
| Every session starts from scratch | Skills accumulate institutional knowledge |
| Quality varies by conversation | Skills enforce consistent quality |

## What Counts as a Match

- **Exact match**: Skill name/description directly describes the task → read and follow it
- **Partial match**: Skill covers a sub-task or related concern → read it for relevant sections
- **MCP match**: An MCP server has tools that handle part of the task → use them
- **No match**: No skill or MCP is relevant → proceed with your own reasoning and note it

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| Writing a test strategy without checking `Testing Strategist` skill | ❌ Rejected. |
| Debugging without checking `systematic-debugging` skill | ❌ Rejected. |
| Designing an API without checking `api-design-principles` skill | ❌ Rejected. |
| Reading skill → following its methodology → executing | ✅ Correct. |
| No relevant skill found → proceeding with own reasoning | ✅ Correct. |
| Using MCP tool instead of manual workaround | ✅ Correct. |
