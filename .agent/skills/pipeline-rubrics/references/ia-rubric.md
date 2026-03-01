# IA Rubric (8 dimensions)

| # | Dimension | ✅ (must meet ALL criteria) | ⚠️ | ❌ |
|---|---|---|---|---|
| 1 | Feature Enumeration | Every feature from the vision's Must Have list appears in at least one shard. Every feature has a clear scope boundary (what's in, what's out). | Some features vague or scope unclear | Major Must Have features missing |
| 2 | Access Model | Every role has: a named role + an exhaustive list of what it CAN do + an exhaustive list of what it CANNOT do + escalation path. No role uses "standard access" without defining it. | Some roles defined but missing permission or restriction lists | No access model |
| 3 | Data Model | Every entity has: named fields + field types + constraints + relationships with cardinality. No field uses "standard" or "typical" without defining it. | Structure present but field types or constraints missing | Absent |
| 4 | User Flows | Every user flow has: trigger + step-by-step actions + system responses + error paths. No flow ends at "success" without defining what success looks like. | Happy path only, or flows missing error paths | None |
| 5 | Cross-Shard Contracts | Every cross-shard reference is bidirectional and cites the specific section in the referenced shard. No reference uses "see shard N" without a section name. | One-way references or missing section citations | None |
| 6 | Edge Cases | Every feature has ≥3 edge cases covering: concurrent access, invalid input, and deletion/cascade. No edge case uses "handle gracefully" without defining the handling. | Some edge cases listed but fewer than 3 per feature, or vague handling | None |
| 7 | Deep Dive Coverage | Every referenced deep dive file exists and contains exhaustive subsystem detail (technology choice + rationale + phasing + failure modes + integration contracts). No deep dive is a skeleton. | Some deep dives exist but are partial or skeleton | Referenced deep dives missing or empty |
| 8 | Testability | Every feature has ≥1 acceptance criterion in Given/When/Then format. No criterion uses "should work" or "should be fast" without a measurable threshold. | Some criteria present but not in Given/When/Then or missing thresholds | Mostly subjective |

> **Deep Dive audit note**: When auditing dimension 7, read each deep dive file directly — do not infer its completeness from the parent shard's reference to it. A parent shard that links to a deep dive scores ⚠️ (not ✅) if the deep dive file itself is still a skeleton. Score ✅ only when the deep dive file contains exhaustive subsystem detail that an implementer could work from without asking questions.
