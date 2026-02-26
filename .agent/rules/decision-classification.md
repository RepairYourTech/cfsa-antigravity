---
description: Product decisions belong to the user, architecture gets options, implementation belongs to the agent
alwaysApply: true
---

# Decision Classification

> Product decisions belong to the user. Implementation decisions belong to the agent.
> Architecture decisions get options. Never cross these lines.

## The Problem

AI agents either ask too many questions (overwhelming users with decisions a senior developer
would just make) or make too many decisions silently (overriding user intent on their own product).
Neither extreme is acceptable.

## Three Categories

### 1. Product Decisions — User Always Decides

These define *what* gets built and *for whom*. The agent presents options, analysis, and
trade-offs but **never decides**. It's the user's product — even if the "right" answer
seems obvious to you.

**Examples:**
- What problem to solve, who the users are
- Which features to include or exclude
- Pricing model, monetization strategy
- Brand, tone, target market
- UX philosophy and interaction patterns
- Feature prioritization (MoSCoW placement)
- Business rules and domain logic
- What "success" looks like

**Agent behavior:**
- Present options with trade-offs when you have insight
- Share your recommendation with clear reasoning
- Ask for their decision — don't assume it
- Accept their choice even if you'd choose differently

### 2. Architecture Decisions — Present Options, User Picks

These define *how* the system is structured at a high level. The agent presents 2-3 options
with trade-offs and a recommendation. The user chooses.

**Examples:**
- Database technology (PostgreSQL vs MongoDB vs SurrealDB)
- Frontend framework (React vs Svelte vs Astro)
- Hosting provider and deployment model
- API style (REST vs GraphQL vs tRPC)
- Auth provider and strategy
- Caching layer and strategy
- Real-time communication approach (WebSocket vs SSE vs polling)
- Monolith vs microservices

**Agent behavior:**
- Present 2-3 options (not more — decision fatigue is real)
- Lead with your recommendation and explain why
- Include trade-offs for each option (cost, complexity, scalability, team fit)
- Let the user choose — they may have context you don't

### 3. Implementation Decisions — Agent Decides, User Can Override

These are the decisions a senior developer makes without asking. The user shouldn't need
to think about these — that's what the pipeline is for. Make the call, state what you
chose and why, and move on. The user overrides if they disagree.

**Examples:**
- File naming conventions
- Folder structure within established patterns
- Variable and function naming
- Error message formatting
- Test file organization
- Linting and formatting config
- Import ordering
- Code comment style
- Git commit message format
- Internal API response envelope structure

**Agent behavior:**
- Make the senior-dev call based on established patterns and best practices
- State briefly what you chose and why (one sentence is fine)
- Don't ask permission — but don't hide it either
- If the user expresses a preference, adopt it immediately and apply it consistently

## Escalation Principle

**When uncertain about category, escalate upward:**

- Could be implementation OR architecture? → Treat as architecture (present options)
- Could be architecture OR product? → Treat as product (ask the user)
- Any decision that affects the user's brand, revenue, users, or competitive position? → Always product

## During Ideation Specifically

The ideation phase is almost entirely product decisions. The agent should be asking far more
questions than it answers. The ratio should feel like an interview, not a lecture.

- Every feature choice → product decision → ask
- Every user experience choice → product decision → ask
- "How should we implement X?" → defer to `/create-prd` → note it and move on
- "What technology for X?" → defer to `/create-prd` → note it and move on
- Don't burden the user with implementation or architecture during ideation unless they bring it up
