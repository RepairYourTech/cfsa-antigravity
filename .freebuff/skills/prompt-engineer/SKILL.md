---
name: prompt-engineer
description: "Transforms user prompts into optimized prompts using established frameworks (RTF, RISEN, Chain of Thought, RODES). Analyzes intent, selects framework, and produces structured, ready-to-use prompts."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# Prompt Engineering

Transform vague or unstructured prompts into highly effective, framework-backed prompts that maximize AI output quality.

## When to Use

- User provides a vague or generic prompt ("help me code Python")
- User has a complex idea but struggles to articulate it clearly
- User asks "create a prompt for..." or "how do I ask AI to..."
- Task requires step-by-step reasoning (debugging, analysis, design)
- User wants to improve an existing prompt's effectiveness

## When NOT to Use

- User's prompt is already clear and specific
- Simple factual questions ("what is X?")
- During pipeline workflows that have their own prompting structure

## Operating Mode

Work silently — no framework jargon in the output. The user gets a polished prompt, not a lecture on prompt engineering theory.

---

## Workflow

### 1. Analyze Intent

Read the raw prompt and detect:

| Dimension | Options |
|-----------|---------|
| **Type** | Coding, writing, analysis, design, learning, planning, creative |
| **Complexity** | Simple (one-step), moderate (multi-step), complex (reasoning needed) |
| **Clarity** | Clear intent vs. ambiguous/vague |
| **Domain** | Technical, business, creative, academic |

Identify implicit requirements:
- Does the user need examples?
- Is the output format specified?
- Are there constraints (time, scope, resources)?
- Is this exploratory or execution-focused?

### 2. Clarify If Needed

- **0 questions** if intent is clear (most cases)
- **1-2 questions max** if critical information is ambiguous
- **Never ask** about framework selection — that's your job

### 3. Select Framework

| Task Type | Framework | Why |
|-----------|-----------|-----|
| Role-based tasks (act as expert) | **RTF** (Role-Task-Format) | Clear role + task + output format |
| Step-by-step reasoning (debugging, analysis) | **Chain of Thought** | Forces explicit reasoning steps |
| Multi-phase projects (systems, deliverables) | **RISEN** (Role, Instructions, Steps, End goal, Narrowing) | Comprehensive structure |
| Complex design/architecture | **RODES** (Role, Objective, Details, Examples, Sense check) | Balances detail with validation |
| Summarization/synthesis | **Chain of Density** | Iterative compression to essentials |
| Communication (reports, presentations) | **RACE** (Role, Audience, Context, Expectation) | Audience-aware messaging |
| Goal-setting (OKRs, planning) | **CLEAR** (Collaborative, Limited, Emotional, Appreciable, Refinable) | Actionable goals |

**Blending**: Combine 2 frameworks when a task spans types. Example: architecture design → RODES + Chain of Thought.

**Selection happens silently** — never explain framework choice to the user.

### 4. Generate Prompt

Build the optimized prompt using the selected framework(s):

**Structure rules:**
- Start with a clear role definition
- State the objective in one sentence
- Break complex tasks into numbered steps
- Include output format specification
- Add a validation/sense-check instruction for complex tasks
- Keep the prompt self-contained (no external context needed)

**Quality checks before presenting:**
- [ ] Prompt is self-contained
- [ ] Task is specific and measurable
- [ ] Output format is clear
- [ ] No ambiguous language
- [ ] Appropriate detail for task complexity
- [ ] Language matches user's language

### 5. Present

Present the optimized prompt in a clean markdown code block. No meta-commentary, no framework explanation.

---

## Examples

### Vague Input → RTF

**User**: "help me write better code"

**Output**:
```
Role: You are a senior software engineer conducting a code review.

Task: Review the code I provide and identify issues across these dimensions:
1. Readability — naming, structure, comments
2. Correctness — logic errors, edge cases, off-by-one errors
3. Performance — unnecessary allocations, O(n²) where O(n) exists
4. Security — injection risks, data exposure, input validation
5. Maintainability — coupling, cohesion, testability

Format: For each issue found, provide:
- Location (file/line if applicable)
- Category (readability/correctness/performance/security/maintainability)
- Current code
- Suggested improvement with explanation
- Severity (critical/warning/suggestion)
```

### Complex Input → RODES + Chain of Thought

**User**: "I need to build a recommendation system using purchase history and user preferences"

**Output**:
```
Role: You are a senior ML engineer specializing in recommendation systems.

Objective: Design a product recommendation system combining user purchase history, stated preferences, and behavioral signals.

Details:
- Input sources: transaction logs, preference surveys, browsing behavior
- Algorithm tradeoffs: collaborative filtering vs. content-based vs. hybrid
- Performance targets: recommendations served in <200ms, updated hourly
- Scale: handle 100K+ users with sparse interaction matrices

Approach this step-by-step:
1. Analyze data sources and their signal quality
2. Propose 2-3 algorithm approaches with tradeoff analysis
3. Design the data pipeline (ingestion → processing → serving)
4. Define evaluation metrics (precision, recall, diversity, novelty)
5. Outline a phased implementation roadmap

Examples: Include pseudocode for the core recommendation logic, a data flow diagram, and sample API response structure.

Sense check: Verify the solution balances personalization with discovery, handles cold-start problems for new users, and scales to production load.

Output: Technical design document with architecture diagrams, algorithm justification, and implementation roadmap.
```

### Debugging → Chain of Thought

**User**: "my code isn't working, needs debugging"

**Output**:
```
You are an expert debugger.

Task: Debug the code I provide using systematic analysis.

Step-by-step approach:
1. Read the code and identify its intended purpose
2. Identify the error or unexpected behavior
3. Trace variable states through execution
4. Locate the root cause
5. Propose a fix with explanation
6. Suggest preventive measures

For each step, show your reasoning:
- What you're checking
- What you found
- Why it matters

Output format:
- **Issue**: [Describe the bug]
- **Root cause**: [Why it's happening]
- **Fix**: [Corrected code with inline comments]
- **Prevention**: [How to avoid this in the future]

Include a minimal working example to verify the fix.
```

---

## Rules

**NEVER:**
- Explain which framework was selected or why
- Generate generic, one-size-fits-all prompts
- Ask more than 2 clarifying questions
- Include meta-commentary ("This prompt uses...", "Note that...")

**ALWAYS:**
- Analyze intent before generating
- Select framework based on task type and complexity
- Include output format specification
- Present in a clean code block
- Match the user's language (English → English, etc.)
