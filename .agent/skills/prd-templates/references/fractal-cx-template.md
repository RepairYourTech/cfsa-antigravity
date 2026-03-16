# {Node Name} — Cross-Cuts

> **Level**: {surface | domain | sub-domain}
> **Scope**: Connections between children of [{parent}](../{parent}-index.md)

## Cross-Cut Map

| # | Source | Target | Relationship | Roles Affected | Confidence | Evidence |
|---|--------|--------|--------------|----------------|------------|----------|
| CX-01 | [child-A](./path) | [child-B](./path) | _what the interaction is_ | Tech, Owner | High | _specific evidence from exploration_ |
| CX-02 | [child-C](./path) | [{external-node}](../../path) | _cross-level interaction_ | Tech | Medium | _evidence_ |

> **Confidence levels:** High (confirmed with evidence), Medium (strong signal, needs validation), Low (hypothesis)
>
> **Cross-level references:** When a cross-cut spans levels (e.g., a feature in one surface touches a domain in another), record it here at the HIGHER level with a link path to the specific lower-level item. The detail of HOW they interact lives in the LOWER-level CX file.
>
> **Cross-references:** When referencing a CX entry from another file, use format `{filename}#CX-NN` (e.g., `ai-assistant-cx.md#CX-03`)

---

## Cross-Cut Details

### CX-01: {Source} ↔ {Target}

**Relationship**: _Detailed description of how these two children interact. What data flows between them? What triggers what?_

**Role scoping**:
- **{Role 1}**: _what this role experiences at this intersection_
- **{Role 2}**: _what this role experiences_
- **{Role 3}**: _not affected / no visibility_

**Synthesis questions answered**:
1. **Shared state conflict**: _Who owns the entity? What's the merge strategy if both sides modify it?_
2. **Trigger chain**: _Does A trigger B? What happens if B fails — rollback? Compensating action? Is it sync or async?_
3. **Permission intersection**: _Does a permission in A affect what you can do in B?_
4. **Notification fan-out**: _Does an event in A notify actors in B?_
5. **State transition conflict**: _Can A and B race? What's the consistency impact?_

---

_Repeat the Cross-Cut Details section for each CX entry in the map._

---

## Rejected Pairs

| # | Source | Target | Reason for Rejection |
|---|--------|--------|---------------------|
| R-01 | _{child-A}_ | _{child-B}_ | _No shared state, no trigger dependency, independent lifecycles_ |

> **Notes for agents:**
> - This template is used at EVERY folder level in the fractal structure
> - CX files ONLY connect children at their own level — a surface CX connects domains, a domain CX connects sub-domains, a sub-domain CX connects features
> - CX entries use sequential `CX-NN` numbering within each file, starting at CX-01
> - Always include role scoping — every cross-cut affects specific roles, not all roles equally
> - Rejected pairs are valuable — they show the agent considered the interaction and dismissed it with reasoning
> - The 5 synthesis questions should be answered for EVERY confirmed cross-cut (CX entries with High confidence)
> - For Medium/Low confidence entries, the synthesis questions can be deferred to later drilling passes
