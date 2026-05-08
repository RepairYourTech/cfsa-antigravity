---
name: Technical Writer
description: Create clear, comprehensive technical documentation for any audience
---

# Technical Writer

Create clear, comprehensive technical documentation for any audience.

## When to Use This Skill
- Write user documentation for a feature
- Create a tutorial for setting up a development environment
- Document system architecture
- Write a troubleshooting guide
- Create onboarding documentation for new developers
- Write a README for a project

## Instructions

When a user needs technical documentation:

1. **Identify Documentation Type**:
   - User guide / end-user documentation
   - Developer documentation / API docs
   - System architecture documentation
   - Tutorial / how-to guide
   - Troubleshooting guide
   - README file
   - Release notes / changelog
   - Onboarding documentation
   - Knowledge base article
   - Standard Operating Procedure (SOP)

2. **Determine Audience**:
   - Technical level (beginner, intermediate, expert)
   - Role (end user, developer, admin, stakeholder)
   - Prior knowledge assumptions
   - Context (internal team, external customers, open source community)

3. **Structure Documentation**:

   **User Guide Format**:
   ```markdown
   # [Product/Feature Name]

   ## Overview
   [What it is, what it does, why use it - 2-3 sentences]

   ## Prerequisites
   - [Required knowledge]
   - [Required tools/access]
   - [System requirements]

   ## Getting Started
   [Quick start guide with minimal steps to first success]

   ## Key Concepts
   ### [Concept 1]
   [Explanation with examples]

   ## Common Tasks
   ### How to [Task]
   1. [Step]
   2. [Step]
   3. [Expected result]

   ## Advanced Features
   [Optional advanced functionality]

   ## Troubleshooting
   ### Problem: [Common issue]
   **Symptoms**: [What users see]
   **Solution**: [How to fix]

   ## FAQ
   **Q: [Question]**
   A: [Answer]

   ## Additional Resources
   - [Link to related docs]
   - [Support channels]
   ```

   **Tutorial Format**:
   ```markdown
   # How to [Accomplish Goal]

   **Time required**: [X minutes]
   **Difficulty**: [Beginner/Intermediate/Advanced]

   ## What You'll Learn
   - [Learning objective 1]
   - [Learning objective 2]

   ## Prerequisites
   - [Required knowledge]
   - [Tools needed]

   ## Step-by-Step Instructions

   ### 1. [First Major Step]
   [Explanation of why this step matters]

   ### 2. [Next Major Step]
   [Continue pattern]

   ## Verification
   [How to confirm it worked]

   ## Next Steps
   [What to learn next]

   ## Troubleshooting
   [Common issues]
   ```

   **Architecture Documentation Format**:
   ```markdown
   # [System Name] Architecture

   ## Overview
   [High-level description, purpose, key characteristics]

   ## Architecture Diagram
   [ASCII diagram or description for diagram]

   ## Components
   ### [Component 1]
   **Purpose**: [What it does]
   **Technology**: [Stack/framework]
   **Responsibilities**:
   - [Responsibility 1]
   - [Responsibility 2]

   **Interfaces**:
   - Input: [Data/requests it receives]
   - Output: [Data/responses it produces]

   ## Data Flow
   1. [Step-by-step flow through system]

   ## Technology Stack
   - **Frontend**: [Technologies]
   - **Backend**: [Technologies]
   - **Database**: [Technologies]
   - **Infrastructure**: [Technologies]

   ## Design Decisions
   ### Why [Technology/Pattern]?
   [Rationale, alternatives considered, trade-offs]

   ## Scalability Considerations
   [How system scales, bottlenecks, mitigation strategies]

   ## Security
   [Authentication, authorization, data protection]

   ## Monitoring & Observability
   [Logging, metrics, alerting]
   ```

4. **Apply Technical Writing Best Practices**:

   **Clarity**:
   - Use short sentences (aim for 15-20 words)
   - Avoid jargon or define it when first used
   - Use active voice ("Click the button" not "The button should be clicked")
   - Be specific ("Set timeout to 30 seconds" not "Set a reasonable timeout")

   **Structure**:
   - Use descriptive headings
   - Break content into scannable sections
   - Use numbered lists for sequences
   - Use bullet points for unordered items
   - Add table of contents for long docs

   **Visuals**:
   - Include screenshots with annotations
   - Add code examples with syntax highlighting
   - Use diagrams for complex concepts
   - Show expected outputs
   - Add tables for comparison or reference

   **Code Examples**:
   - Include language identifier
   - Show both good and bad examples
   - Add comments explaining complex parts
   - Use realistic, runnable examples
   - Include error handling

   **User-Focused**:
   - Start with most common use case
   - Include "why" not just "how"
   - Anticipate user questions
   - Address common pitfalls
   - Provide troubleshooting

5. **Special Documentation Types**:

   **README.md**:
   - Project name and description
   - Installation instructions
   - Quick start example
   - Features list
   - Documentation links
   - Contributing guidelines
   - License

   **Release Notes**:
   - Version number and date
   - New features
   - Improvements
   - Bug fixes
   - Breaking changes
   - Migration guide
   - Deprecation notices

   **Troubleshooting Guide**:
   - Symptom-based organization
   - Root cause analysis
   - Step-by-step resolution
   - Prevention tips
   - When to escalate

## Output Quality
Ensure documentation:
- Has clear, descriptive title
- Starts with overview/context
- Lists prerequisites upfront
- Uses consistent formatting
- Includes code examples where appropriate
- Shows expected outputs
- Has troubleshooting section
- Uses appropriate technical level for audience
- Is structured logically (simple to complex)
- Includes visual aids (diagrams, screenshots)
- Has table of contents for long docs
- Links to related documentation
- Is easy to scan
- Uses active voice
- Avoids ambiguity
- Includes examples from user perspective
