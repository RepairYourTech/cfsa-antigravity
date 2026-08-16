# Global Cross-Cuts — {{PROJECT_NAME}}

> **Scope**: Cross-surface interactions for multi-product projects, or cross-domain interactions for single-surface projects.
> **Format**: Index + one-line summary. Detailed synthesis lives in lower-level CX files.

## Cross-Surface Interaction Map

> Each row records that an interaction EXISTS between two surfaces or top-level domains. The Detail column links to the lower-level CX file where the full synthesis questions are answered.

| # | Source Surface/Domain | Target Surface/Domain | Summary | Roles | Detail |
|---|----------------------|----------------------|---------|-------|--------|
| CX-01 | _Web / Consumer Platform_ | _Desktop / Shop Ops_ | _Desktop diagnostic workflow consumes web supplier data via API_ | Tech, Owner | [detail](surfaces/desktop/desktop-cx.md#CX-03) |
| CX-02 | _Web / Device History_ | _Mobile / Device Guardian_ | _Mobile app syncs with web device history for owner verification_ | Consumer | [detail](surfaces/mobile/mobile-cx.md#CX-01) |

> **Rules:**
> - This file is an INDEX with one-line summaries — not the source of truth for cross-cut details
> - Detailed synthesis (5 questions, role scoping) lives in the lower-level CX file linked in the Detail column
> - For single-surface projects, this file covers cross-DOMAIN interactions (same content as would appear in a surface-level CX)
> - For multi-product projects, this file covers cross-SURFACE interactions
> - Use `CX-NN` numbering. This file's entries are distinct from CX entries in lower-level files.
> - When referencing from other files, use `ideation-cx.md#CX-NN`

## Shared Domain Consumption _(multi-product only)_

> Which shared domains are consumed by which spoke surfaces, and through what mechanism.

| Shared Domain | Owner | Consumed By | Mechanism | Detail |
|--------------|-------|-------------|-----------|--------|
| _Device History_ | Web (hub) | Desktop, Mobile | REST API | [web/02-device-history-cx.md](surfaces/web/02-device-history/device-history-cx.md) |
| _Payments_ | Web (hub) | Desktop | REST API | [web/03-payments-cx.md](surfaces/web/03-payments/payments-cx.md) |

## Rejected Cross-Surface Pairs

| # | Surface A | Surface B | Reason for Rejection |
|---|-----------|-----------|---------------------|
| R-01 | _Desktop_ | _Mobile_ | _No direct interaction — both consume web API independently_ |
