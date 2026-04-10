---
name: propagate-decision-apply
description: Present and apply contradiction fixes one-by-one, flag assumptions, run consistency checks, and write propagation record
parameters:
  - name: scan_report
    type: string
    required: false
    description: Optional explicit propagation scan report path
---

## Overview


## Step-by-Step

1. Load propagation scan report.
2. Walk explicit contradictions one at a time (apply/skip/edit/stop-and-save).
3. Walk implicit assumptions and flag for ambiguity handling where accepted.
4. Run consistency check on changed documents.
5. Write `docs/audits/propagation-[type]-[date].md`.
6. Present completion summary with next steps.
