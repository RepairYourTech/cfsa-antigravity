# RepairYour.Tech — Ideation Document

> Source: Verbal description provided in-chat
> Input Type: Verbal / one-liner → Interview Mode
> Created: 2026-03-13

---

## Problem Statement

[PARTIAL] RepairYour.Tech solves three interconnected problems:

1. **Consumer trust gap** — Consumers don't understand who they can trust with their electronics repairs. There's no universal signal for quality or reliability in the independent repair market.
2. **Technician knowledge gap** — Repair technicians and shops can't access the high-quality repair data they need to learn new skills, perform more accurate diagnostics, and execute more efficient repairs. Knowledge is fragmented, tribal, and siloed.
3. **Industry credibility gap** — There is no trusted "badge of honor" that shops and technicians can proudly display to differentiate themselves from low-quality competitors. No certification or platform endorsement carries real weight with consumers.

---

## Initial Domain Map

The following domains were identified from the user's initial description. Each needs deep exploration.

### 1. Consumer Web Platform
[PARTIAL] — Major detail dump received. Gaps remain (see Open Questions).

**Purpose**: Main advertising and entry point for the entire ecosystem. The public-facing information hub for both consumers and techs/shops.

**Hosting**: Cloudflare Pages

#### Consumer Account Tiers

| Tier | Price | Description |
|------|-------|-------------|
| Single / Free | Free | One user, device profiles, repair tracking, shop discovery, X free device history searches/month |
| Premium Single | Paid (TBD) | Everything in Free + advanced AI tech support (BYOK), priority features TBD |
| Family | Paid (TBD) | Parent(s) manage family members' devices. Multiple authorized managers (e.g., both mom AND dad can authorize repairs/payments for kids). Accrued family discounts for repeated platform usage. Cap on members to prevent abuse. |
| Premium Family | Paid (TBD) | Family tier + advanced AI tech support, extended search quota, priority features TBD |
| Friends & Extended Family | Via Family (TBD) | Add people outside the household (e.g., Bob manages his elderly non-tech-savvy mom's devices remotely). Same member cap applies. |
| School | B2B (TBD) | Institutional accounts for schools managing student/staff devices |
| Business | B2B (TBD) | Company accounts managing fleet of business devices |
| Government | B2G (varies) | See breakdown below — pricing depends on department type |

**Government Account Pricing:**
- **First responders & public servants** (police, fire, EMS) — **FREE personal accounts** as a thank you
- **Law enforcement / emergency departments / schools** — **discounted** institutional accounts
- **Courts, city hall, other government offices** — **full price** (they have budgets for this)

#### Shop / Business Account Tiers

| Tier | Price | Seats | Description |
|------|-------|-------|-------------|
| Solo Tech | Very low (TBD) | 1 user, 2 machine installs | One person does everything. Install on 1 intake machine + 1 repair machine, or 1 do-it-all. |
| Shop | Higher (TBD) | 4 seats (1 owner + 3 delegatable) | Owner always gets a seat. The 3 remaining seats are assigned to any combo of Tech / CSR roles (e.g., 2 techs + 1 rep, or 1 tech + 2 reps). |
| Additional Seats | Per-seat add-on (TBD) | +1 per purchase | Shops that need more than 4 seats buy more at a per-seat rate. |
| Multi-Location | Per-location license (TBD) | 4 seats per location | Each location is a new license, tied to the same owner. Separate IP/machine enforcement per location. |

**Seat delegation model**:
- Owner seat is **always** assigned (can't be delegated away)
- The other 3 seats are **role-flexible** — owner assigns them as Tech or CSR roles
- Owner decides the combo: 2 techs + 1 CSR, 1 tech + 2 CSRs, 3 techs, etc.
- Solo tech gets everything collapsed into one role

**Location & anti-sharing enforcement**:
- License is tied to **public IP + machine ID**
- One account cannot be used across multiple locations
- Multi-location owners get separate licenses per location, all tied to the same owner account
- **IP change handling**: Grace period for IP changes — can't shut a shop down for that
  - 99% of legit businesses have static IPs
  - Work-from-home solo techs with dynamic IPs → must set up **DDNS** to resolve
  - Shops with static IPs can ALSO set up DDNS as an emergency fallback to prevent unexpected IP changes from taking them offline

**🔌 Offline Fallback Mode (CRITICAL)**:
- Software **MUST** accept cash payments and work entirely offline
- If internet goes down, software enters **fallback mode**:
  - All core functions work: intake, tickets, POS (cash), inventory, diagnostics tracking
  - Platform connection and AI features are unavailable
  - All transactions and changes are queued locally in embedded SurrealDB
  - When internet returns, **automatic resync** with cloud
- Real-world need: shops lose internet for whole days sometimes — they can't just stop doing business
- No handwritten receipts, no "sorry we can't process that" — the software handles it

**Multi-location / Franchise management**:
- Business owners with multiple locations manage them under one owner account
- Each location has its own seats, inventory, staff, and data
- Centralized reporting across all locations for the owner
- **Cross-location inventory sharing**: YES, but with strict rules:
  - Owner controls who can even leverage cross-location inventory
  - Can't randomly pull from another location's stock — requires explicit request + approval
  - Physical logistics must be considered (someone has to physically move the part)
  - Must not destroy individual location's inventory management
  - Think of it as: "Location B can SEE that Location A has Part X, and REQUEST a transfer" — not auto-deduct

**White labeling / Branding**:
- Shops can customize the software with their own branding (logo, colors, business name)
- RepairYour.Tech does NOT dominate the shop's branding, especially on customer-facing screens and receipts
- **NO custom domains** — RepairYour.Tech is a platform, not the shop's website. We funnel repairs to them and provide the software.
- **MANDATORY RYT watermark** — shops can NEVER completely remove RepairYour.Tech's small brand stamp from any customer-facing surface:
  - Receipts, intake screens, customer-facing displays — all carry a small RYT watermark/stamp of approval
  - It won't intrude, but it MUST be visible
  - **Anti-fraud protection**: If a customer asks "are you on RepairYour.Tech?" and the shop says yes, the watermark proves it
  - **Prevents removed shops from lying**: If a shop is removed from the platform, their software stops showing the RYT stamp — they can't claim membership
  - This is a **trust mechanism**, not a branding power play

**Family Tier Specifics:**
- Dad is the "family techy" — manages everything
- Mom can ALSO authorize repairs and payments (e.g., for little Jenny's iPhone)
- Kids don't have money — parents manage and pay for their repairs
- Accrued discounts for loyalty (X repairs = discount on next)
- Can add friends and family who don't live together (Bob + his elderly mom)
- Member cap to prevent abuse (exact number TBD)

**AI Chat Support (BYOK Model):**
- Users who want AI-powered tech support can bring their own API keys (OpenAI / Gemini / Anthropic)
- This is an alternative to paying for live human support
- RepairYour.Tech does NOT handle inference costs and does NOT middleman API calls
- Rationale: protects platform margins AND supports the claim that users own their own data and usage
- Same BYOK model applies to shops and techs — they bring their own keys for the AI diagnostic assistant

#### Device Profiles

- User adds devices: smart TV, phone, tablet, laptop, etc.
- Well-built interface: choose manufacturer, model, and more
- **Profiles go as deep as makes sense** — but field sets vary by device type

#### Device Addition Flow (consumer friction reduction)

**Adding the phone they're holding (frictionless)**:
1. User installs the RYT app
2. App asks: "Want to add this device to your account?"
3. User taps **Yes** → auto-detect fills brand, model, storage, OS, carrier, battery health instantly (zero typing)
4. App prompts: "For full device history features, add your IMEI (optional)"
   - "Find it in Settings → About Phone"
   - "Dial `*#06#` and copy it"
   - "Skip for now"
5. Device added. The phone they're holding is the **easiest device to add**.

**What the app CAN auto-detect** (no user input):
- Brand / manufacturer, model name, OS version
- Storage capacity, carrier (current SIM), screen resolution
- Battery health (iOS 11.3+, Android)

**What the app CANNOT auto-detect** (privacy restrictions):
- IMEI: blocked on Android 10+ and iOS — requires manual entry from Settings → About
- Serial number: restricted on both platforms
- Purchase date: manual entry

**Adding other devices (phone as scanner)**:
- User's phone becomes a **universal scanner** for their entire household
- Camera scans barcodes, QR codes, serial number labels on TVs, laptops, consoles, etc.
- Scanned data auto-looks up device info via TAC database
- Manual entry always available as fallback

#### Two-Tier Device Lookup System

| Lookup Type | What It Checks | Cost | Source |
|-------------|---------------|------|--------|
| **Platform Lookup** (free) | Brand/model (TAC), internal lost/stolen flags, RYT device history | **Free** | Osmocom TAC DB (self-hosted) + RYT's own growing database |
| **Official Lookup** (credits) | External blacklist, carrier status, iCloud status, warranty | **Credits** | SICKW API (pennies per check) |

- Users and shops maintain a **credit balance** for official lookups
- Platform lookup is always free — covers 90% of needs
- Official lookup for when you need carrier/blacklist verification (buying a used device, etc.)
- **Growth strategy**: Start with free TAC database at launch. As devices flow through the platform, RYT's internal database grows organically. SICKW for paid official checks from day one.

**Universal fields** (all device types):
- Manufacturer, model
- Serial number
- Purchase date
- Current condition notes / photos
- Custom tags or categories

**Device-type-specific fields**:
| Device Type | Additional Fields |
|-------------|-------------------|
| Phone / Tablet | IMEI, carrier, storage capacity, unlock pattern/PIN/passcode |
| Laptop / Desktop | Service tag, RAM, storage, OS |
| Television | Screen size, panel type, smart TV platform |
| Game Console | Online account linked, storage capacity |
| Wearable | Paired device, band size |
| *Others TBD* | *Fields determined per category as we build out* |

**Consumer-facing fields** (less relevant to shops):
- Insurance info
- Warranty expiration
- Receipt / proof of purchase upload

**Sensitive credential storage**: pin codes, passcodes, screen unlock patterns
  - Not just for user's own recollection
  - User can **authorize a specific shop/tech** to view login details during an active repair
  - Authorization is scoped: per-shop, per-repair engagement
  - Revocable after repair is complete

#### Multi-Tenancy & Repair History Privacy Model

- **Consumer sees**: ALL of their own repair history across ALL shops, including WHICH shop performed each repair — this is their transactional data
- **Shop working on a device sees**: Sanitized repair history for that device — what was diagnosed, what was recommended, what was accepted/declined — but **NOT which shop** performed previous work
- **Shop sees in their own account**: Their complete repair history for any customer they've served (within their own shop software)
- **Critical scenario**: Tech B needs to know that Tech A (at a different shop) told Bob he needs a new battery and Bob declined. Tech B gets the diagnostic info and decision, but NOT the identity of Tech A's shop. This prevents hamstringing while respecting competitive boundaries.

**Ownership transfer privacy (marketplace / device sales)**:
- When a device changes hands (sold via marketplace, gifted, etc.), repair history data splits:
  - **"What" transfers**: New owner sees full history of what was repaired, what was diagnosed, what parts were used
  - **"Who" does NOT transfer**: New owner does NOT see which shops performed previous repairs — that was the previous owner's transactional data
  - **New owner's "who" starts fresh**: From ownership transfer onward, the new owner sees which shops they personally use
- Previous owner retains their full "who" history in their account for their records

#### Shop Directory

- Website serves as a searchable directory of all registered shops on the platform
- **→ See Domain #13 (Shop Trust & Reputation)** for filtering, ratings, reviews, geographic search, verification badges

#### Payments

**Stripe Connect** — hybrid model using Direct Charges (repairs) and Destination Charges (marketplace).

**How shops get paid for repairs (Direct Charges)**:
- Each shop onboards their own Stripe account via Stripe Connect
- Charges hit the shop's Stripe account directly — shop owns the customer relationship
- Stripe fees come out of the shop's transaction — full transparency on their dashboard
- **RYT takes $0 platform fee on repair payments** — subscription revenue covers this

**Shop Service Catalog (POS system in RYT software)**:
- Shops pre-configure their services with prices: "Screen Replacement - iPhone 15 = $129"
- Categories: Hardware, Software, Maintenance, Accessories, Custom
- At checkout, tech selects services performed → software auto-totals
- Tech can adjust (discounts, added labor, loyalty pricing)
- Custom line items for one-off work: "Data recovery — $200" (typed on the spot)
- Variable pricing supported: "Starting at $X" with final price at checkout
- Accessories/retail items (cases, screen protectors, chargers) ring up alongside repairs
- Single Stripe Payment Intent for the total — Stripe only sees one transaction, line-item detail lives in RYT

**Payment methods**:
- **In-store POS**: Stripe Terminal reader (tap/dip/swipe) — 2.6% + $0.10
- **Remote**: Payment link via text/email — 2.9% + $0.30
- **In-app**: Customer pays from their RYT app — 2.9% + $0.30
- **ACH bank transfer**: 0.8%, capped at $5

**Stripe fee summary**:

| Transaction Type | Stripe Fee | RYT Platform Fee | Charge Type |
|-----------------|-----------|------------------|-------------|
| Repair payment (POS) | 2.6% + $0.10 → shop pays | **$0** | Direct Charge |
| Repair payment (remote/app) | 2.9% + $0.30 → shop pays | **$0** | Direct Charge |
| Marketplace device sale | 2.9% + $0.30 → built into price | **TBD %** | Destination Charge |
| Marketplace parts (Wanted/ISO) | 2.9% + $0.30 → built into price | **TBD %** | Destination Charge |
| Shop subscriptions (to RYT) | 2.9% + $0.30 → RYT absorbs | N/A | Standard |
| Connect active account | $2/mo per shop with payouts | N/A | RYT absorbs |

**Dispute handling**: RYT mediates (Decision #19-21). Stripe's built-in dispute resolution handles chargebacks. RYT does not take liability.

**All repair payments are Payment Intents (Direct Charges):**
- Stripe doesn't care if the customer is at the counter or on a cruise — same charge type
- The only difference is the input method (card reader vs remote vs saved card)

**Card on file (saved payment methods):**
- Stripe saves payment methods to a Customer object (with customer consent)
- First visit: customer enters card → saved to their Stripe profile
- Future visits: "Use card on file?" → one-tap payment, no re-entry
- Pre-authorized: "Charge my card when it's done" → shop creates Payment Intent with saved method on repair completion
- Returning customers get frictionless payments across ANY RYT shop (Stripe handles the customer object)

### 1b. Device History System (working name: ~~"DeviceCarFax"~~ — NEEDS REAL NAME)
[DEEP] — **NON-NEGOTIABLE** — This is core platform TOS, not a feature. **Deep dive needed during drilling.**

**Concept**: Like CarFax but for electronics. Every device on the platform has a permanent, immutable history tied to its SN/IMEI.

**Rules (TOS-enforced, all users):**
- All repair history stays with the device SN/IMEI **forever** — it can NEVER be removed
- Not a manual process — every repair through the platform requires a ticket + resolution → automatically updates the device's permanent record
- This is a **Terms of Service** requirement for ALL users (consumers, shops, techs) — non-negotiable

**Consumer Protection:**
- Users can report a device as **lost or stolen** on the platform
- If that device ends up being sold to a shop, the shop can search SN/IMEI and see the lost/stolen status + full repair history
- Protects consumers from having stolen devices resold

**Smart Buying:**
- Consumers can search device history before buying from strangers (e.g., Facebook Marketplace)
- Free tier gets X searches/month from their account
- Helps consumers make informed purchase decisions

**Tiered API Access** (revenue stream):

| Tier | Access | Price |
|------|--------|-------|
| Consumer (Free) | X device history searches/month from their account | Free |
| Shop (Included) | Unlimited device history searches — comes with shop license | Included in shop subscription |
| Insurance Provider API | Bulk API access to verified repair histories by SN/IMEI | Paid API subscription (TBD) |
| Other B2B API | Manufacturers, trade-in services, recyclers, etc. | Paid API subscription (TBD) |

**Insurance provider partnerships** (Asurion, SquareTrade, AppleCare third-party, etc.):
- Insurance companies sign up for API access to verified, platform-backed repair histories
- They can verify: what was fixed, when, by whom, at what certification level
- Valuable for claims adjudication, fraud detection, device valuation
- Another clean revenue stream — they pay for data access, we provide verified truth

**Private Transaction Facilitation:**
- Shops on the platform can opt in as **safe places for private transactions**
- If both buyer and seller agree, the shop facilitates the sale
- Shop receives either a commission or points/reputation on the platform
- Shop can verify device history, check lost/stolen status on the spot

**What gets recorded on a device's permanent history:**
- Every repair ticket + resolution (platform-verified)
- Every diagnostic report (platform-verified)
- **Parts used in each repair** — auto-populated from shop inventory (see below)
- Lost/stolen reports
- Ownership changes (when tracked)
- Device status changes (active, parted out, rebuilt, destroyed, sold)
- **User self-reported off-platform repairs** (marked as "unverified" — see below)

**Parts tracking (auto-populated from inventory)**:
- When a shop uses RYT inventory management, parts are **auto-linked to the repair record** when pulled from stock
- Zero extra data entry for the tech — the inventory system handles it
- Each part records: type (OEM / aftermarket / refurbished), supplier source, part number
- **Transparency is the differentiator**: buyers can see the quality of parts used in every repair
  - Shop uses OEM parts? That shows. Shop uses cheap aftermarket? That shows too.
  - Shops can let customers **choose their parts quality** — stock multiple tiers for the same repair
  - Shops that only stock the cheapest parts will earn the reputation they deserve
- Platform educates consumers on what OEM vs aftermarket vs refurbished means — no jargon, clear language
- Parts quality feeds into **shop reputation** and **manufacturer grading** (which devices break most often)

**Parts Quality Tier System:**

This is a **critical data asset** that must be manually curated — no API or database exists for this. RYT staff (and eventually community/tech contributions) will build this out device-by-device, part-by-part.

**Example: iPhone 12 Pro Max Screen Quality Tiers**:

| Tier | Part Type | Quality | Trade-offs |
|------|-----------|---------|-----------|
| 1 (Worst) | **Incell / LCD** | ❌ Poor | Uses more battery, runs hot, lower image quality — it's an LCD with a backlight on a phone designed for OLED. Steals power from the touch rail. |
| 2 | **Hard OLED** | ⚠️ Fragile | OLED quality image but physically fragile — cough on it and it shatters |
| 3 | **Soft OLED** | ✅ Good | Far more durable than hard OLED, good image quality, solid mid-range choice |
| 4 | **Premium OEM Refurb** | ✅✅ Great | Near-OEM quality, refurbished original manufacturer screens |
| 5 (Best) | **OEM** | ✅✅✅ Best | Original manufacturer part, highest quality and durability |

**Why this matters**:
- Consumers have NO idea these tiers exist — most shops never explain it
- A shop that only stocks Tier 1 Incell screens is giving customers a worse product without telling them
- RYT educates consumers AND lets them see what tier was used in every repair
- Shops that stock multiple tiers and let customers choose will build better reputations
- This data is a **moat** — once built, it's an authoritative reference no competitor has

**Data creation plan**:
- RYT staff (user + AI) manually curate quality tiers for the most common devices/parts first
- Start with: iPhone screens, Samsung screens, common batteries, charging ports
- Expand over time as the platform grows
- Eventually: tech/community contributions with platform review (similar to Device Guardian blacklist model)

**Off-platform repair gap handling:**
- Device history only covers on-platform repairs — same model as CarFax (only participating shops)
- Transparency: "This report reflects repairs performed through RepairYour.Tech. Off-platform repairs are not tracked unless self-reported."
- **Self-reported entries**: Users can manually add off-platform repairs with notes/receipts
  - Marked as **"user-reported, unverified"** vs **"platform-verified"** — visually distinct
  - User enters shop details (name, location, what was done)
- **🎯 Ghost shop lead generation**: When a user self-reports, the platform detects the shop name/location
  - Creates an **internal record for that shop** if it doesn't exist
  - Tracks how many user-reported repairs that shop has performed
  - RYT staff can then **contact the shop** to pitch onboarding
  - High-volume ghost shops = high-priority sales leads
- The gap itself is a **selling point**: "Want your device's full history tracked? Use an RYT shop."

**Repair Record Disputes:**
- Records are **immutable** — they are NEVER removed, even if disputed
- User can **flag a record as "disputed"** → visible annotation: "⚠️ Owner disputes this entry"
- The dispute does NOT remove or hide the record — it adds context
- **Subsequent tech verification**: The next tech who works on the device can verify or contradict the dispute
  - Example: User claims shop never replaced the charging port. Next tech opens the device and sees an aftermarket part → evidence that the replacement DID happen → tech can annotate: "Aftermarket charging port confirmed present"
  - This creates a self-correcting audit trail over time
- **Internal pattern flagging**: Users who repeatedly file disputes that get contradicted by physical evidence get flagged internally
  - Flag is **platform-side ONLY** — NOT visible to shops or other users
  - Not punitive unless it's blatantly a scam attempt or act of retribution
  - Helps platform identify "cries wolf" patterns for trust & safety

**📋 Device History Report (platform-generated)**:
- **Platform generates the report** — users do NOT share raw data or links with IMEIs
- Report shows a **summary** with a **"✅ Verified by RepairYour.Tech" badge**
- The report is 100% platform-controlled and tamper-proof

**What the report SHOWS:**
- Device make, model (NOT IMEI/serial — redacted for privacy)
- Total repair count (platform-verified vs user-reported)
- Lifecycle state (active, rebuilt, etc.)
- Repair summary: what was done, when, at what certification level
- Any dispute flags and their resolution status
- Lost/stolen status
- Time on platform (how long the device has been tracked)

**What the report HIDES:**
- IMEI / serial number (never exposed to third parties)
- Owner identity (anonymized)
- Which shops performed work (privacy model)

**Access model:**
- **Owners**: Generate a report for their own device for free — used to show buyers
- **Buyers (non-owners)**: Can request a report by entering details at the shop or on the platform — credit-based (smart buying feature)
- Shops can pull reports for any device they're working on (included in subscription)

**Device Lifecycle States**:

| State | Meaning | Who Can Set It |
|-------|---------|---------------|
| **Active** | Device is in use and operational | Auto (default) |
| **Parted Out** | Device has been gutted for parts by a shop | Shop/tech via software |
| **Rebuilt** | Previously parted-out device rebuilt by a certified tech — forever marked as "rebuilt", NOT refurbished or used | Certified tech/shop only |
| **Destroyed** | Device is physically destroyed / e-waste | Owner (with reason) |
| **Sold** | Owner transferred ownership to another person | Owner (with reason) |
| **Lost** | Owner reports device as lost | Owner |
| **Stolen** | Owner reports device as stolen | Owner |

**Parted Out → Rebuilt lifecycle**:
- It's very common for cell phones to be gutted for parts by shops
- Once a SN/IMEI is marked **parted out**, it can ONLY re-enter the system as **"rebuilt"**
- Rebuilding requires:
  - A **certified tech/shop** performs the rebuild
  - Tech **certifies the device** and details exactly what was replaced to bring it back to usable
  - Previous history **stays attached** — clear audit trail
  - Device is forever marked as "rebuilt" — distinct from "refurbished" or "used"

**Device Removal / Number Changes**:
- If a user removes a device or changes the number associated with it (e.g., phone gets a new SIM), they must **answer questions about why**:
  - Selling it? → status = Sold
  - Destroyed? → status = Destroyed
  - New number/SIM? → update tracked, history continues
  - The platform reflects the status in the device history

**🚨 Duplicate Device Detection**:
- If someone tries to add a device that's **already on someone else's account** → FLAG for review
- **Original owner gets notification/email** asking about the device
- If no response → platform or a certified shop may **contact the original owner directly** to verify
- **Privacy protection**: the NEW user does NOT see the original owner's information. Only the platform / authorized shop can see it and act accordingly.

**🔒 Lost/Stolen Device Handling (Two-Tier System)**:

**Tier 1: "Reported Stolen" (unverified — no police report)**:
- User flags the device as stolen on the platform
- Platform encourages them to file a police report: "To fully protect your device across the ecosystem, upload your police report."
- Device gets an **internal flag** — shops are **informed** but have **full discretion**
- Marketplace listings blocked as a precaution
- Advisory to shops: "This device was reported stolen by the registered owner. No police report on file. Use your discretion."

**Tier 2: "Verified Stolen" (police report uploaded)**:
- User uploads a police report (photo/PDF) with a case number
- Device status = **Verified Stolen** ✅
- **System-level block**: The device CANNOT be processed in the shop software. Full stop.
- Shop is advised to **hold the device and report it to local police**
- Marketplace listings blocked, ecosystem-wide alert
- This is legally defensible — there's an actual police report backing it

**RYT Member Shop TOS**: Shops on the platform are **NOT allowed** to service or buy verified stolen devices. Only exception: law enforcement purposes (forensics, etc.). This is a TOS requirement — violation = platform removal.

**🛡️ Shop Staff Safety Provisions**:
- **No law requires a private citizen or business to physically confront or detain someone**
- If a shop employee feels **physically unsafe** (menacing person, threatening behavior), they are NEVER required to hold the device
- Safe options when staff feel threatened:
  1. **Decline service** — "Sorry, we can't help with this device right now"
  2. **Let the person leave with the device** — don't escalate
  3. **Note details after the fact** — description of the person, any info they provided
  4. **Call police after the person leaves** — report the flagged device encounter
- The platform advisory explicitly states: **"Your safety comes first. You are never required to hold a device if you feel unsafe."**
- The encounter is logged in the system regardless of the shop's action

**Legal Framework** (RESOLVED):
- Stolen property laws are **primarily state-based** in the US
- Repair shops are NOT treated the same as pawn shops/secondhand dealers (less strict requirements)
- BUT knowingly handling stolen property = criminal liability everywhere
- Pawn/secondhand dealer laws (relevant when shops buy/sell devices) include:
  - Record-keeping (seller ID, serial numbers)
  - Holding periods (7-30 days depending on state, up to 120 in WA for suspected stolen)
  - Reporting serial numbers to law enforcement (many states)

**Platform's role**: We provide the DATA and TOOLS. Shops handle compliance with their local/state laws. We do NOT make legal decisions for them.

#### Shop-Side Flagged Device Workflow

When a shop scans/enters a SN/IMEI and a flag exists, the workflow depends on the flag type:

**Verified Stolen (police report on file)**:
- 🚫 **System blocks processing** — device CANNOT be added to a ticket, bought, or serviced
- Alert is shown **to shop staff ONLY** (CSR/tech) — NOT visible to the customer
- The alert reads:

> **🚫 STOLEN DEVICE — CANNOT PROCESS**
>
> This device is reported stolen with a police report on file.
> 📄 [View Police Report #XXXX]
>
> RepairYour.Tech cannot process this device for the customer.
>
> **Only if you feel safe to do so**, you may:
> 1. Take the device and inform the customer why
> 2. Call the police after the customer leaves
>
> **You are NOT legally obligated to do any of this.** You can simply refuse service:
> *"I'm sorry but our system reports an issue with this device. We cannot provide service for this today."*
>
> **Your safety comes first. ALWAYS.**

- No "Continue" option — system enforces the block regardless of what the shop chooses to do about the person

**What happens when a verified stolen device surfaces:**
- **Platform alerts the original owner immediately** — notification includes WHERE the device surfaced (shop name/location)
- **Platform does NOT report to police** — that is the shop's and/or owner's responsibility
- **Shop is advised to call police after the person leaves** (per the alert guidance above)
- The encounter is logged in the device history permanently

**Flag clearance:**
- **ONLY** the original owner or law enforcement can clear the "Verified Stolen" flag from the system
- Original owner can clear it: "I recovered my device" or "I was mistaken"
- Law enforcement can clear it: official request through the platform
- Shops CANNOT clear it. Platform staff CANNOT clear it unilaterally. The flag is iron-clad.

**Reported Stolen (unverified — no police report)**:
- ⚠️ Shop is shown: "This device was reported stolen. No police report on file."
- Shop has **full discretion**:

| Action | What It Does | When To Use |
|--------|-------------|-------------|
| **Decline Service** | Refuse to service the device. Log the encounter. | Shop doesn't want the risk. |
| **Hold & Alert Platform** | Shop commits to holding the device. Platform contacts original owner. | Shop has the device, wants to help. |
| **Continue with Warning** | Proceed with the repair. Flag stays on record. | Shop has reason to believe the current person is legitimate. |

**Lost (not stolen)**:
- ℹ️ Shop is shown: "This device is reported lost by the registered owner."
- Shop has discretion — can help reunite the device with the owner through the platform
- No hold advisory — lost ≠ stolen

**Duplicate Ownership (not flagged as lost or stolen)**:
- ℹ️ Shop is shown: "This device is registered to another account."
- Shop proceeds normally — this is an account issue, not a criminal matter
- Platform handles the 7-day registration resolution separately

**Step 3b: Dual Ownership Resolution**

When a device is already on another account and someone tries to register it:
- **Reality check**: This is almost always one of these scenarios:
  1. **Theft** — someone stole the device and is trying to register it
  2. **Innocent finder** — someone found a lost device and is trying to keep/use it
  3. **Legitimate transfer** — previous owner forgot to remove it (rare but possible)
- In scenarios 1 & 2, the device is likely **FRP/iCloud locked** anyway if it was reset — so the platform can potentially **reunite the owner with their device**
- Unlocked/unprotected devices are exceedingly rare but we still handle the edge case

- **Block new registration** until resolution — device CANNOT be added to a new account while it's on someone else's
- **7-day time-boxed resolution process** with escalating contact:
  1. Original owner is notified immediately (push notification): "Someone is trying to register your device. Did you sell/give it away?"
  2. Day 2: Follow-up email if no response
  3. Day 4: SMS if phone number is on file
  4. If original owner confirms transfer → device released, original owner's account updated, new user can register
  5. If original owner says "No, that's mine" → flag escalated as likely theft/found property, platform supports resolution
  6. If **no response within 7 days** → platform reviews and may release the device after reasonable effort. History note: "Ownership transferred after unresponsive original owner (7-day timeout)"

- **Device reunification pathway**: If an innocent finder is trying to register a locked device, the platform can facilitate returning it to the original owner — connecting them through the platform without exposing PII
- Users are **warned via TOS** that they are responsible for removing devices from their accounts when selling or giving them away
- Platform makes this easy with **in-app device transfer and removal flows**

**Step 4: Jurisdiction-Aware Advisory**
- Software displays a **state-specific advisory** based on the shop's registered location:
  - "In [State], secondhand dealers must hold suspected stolen property for [X] days."
  - "Contact local law enforcement if you suspect this device is stolen."
- This is **advisory only** — we provide the information, the shop decides how to act
- Shops agree via TOS to comply with their local laws

#### In-Platform Device Transfers

Make it **easy** for users to properly transfer devices so dual-ownership issues happen less:

- **Device Transfer**: Owner can initiate a transfer to another RYT user — "I'm giving/selling this device to [user]"
  - Receiving user accepts → ownership transfers, history stays attached
  - Clean handoff, no dual-ownership mess
- **Shop-facilitated trades**: Already captured in Private Transaction Facilitation (shops as safe spaces)
- This reduces the dual-ownership problem by giving users a smooth, incentivized path to do it right

*(Full marketplace features → see Domain #15: Device Marketplace)*

---

### 15. Device Marketplace
[DEEP] — Natural extension of verified device histories. No other marketplace can offer this.

**The differentiator**: Every device listed on the RYT marketplace has a **verified, immutable repair history**. Buyers know exactly what they're getting — no more guessing on Facebook Marketplace or Craigslist.

**Role-based marketplace layers (Decision #54)**:

The marketplace is NOT one flat listing — what you see depends on who you are:

#### Layer 1: Consumer Marketplace (visible to everyone)

| Transaction | Seller | Buyer | How It Works |
|-------------|--------|-------|-------------|
| **User → User** | Consumer | Consumer | P2P sale with full device history visible. Platform facilitates ownership transfer. |
| **Shop → User** | Shop | Consumer | Shop sells refurbished/rebuilt devices with full, verified repair history. Certification level visible. |
| **User → Shop** | Consumer | Shop | Consumer sells/trades their device to a shop. Shop can verify history before buying. |

Consumers see: **whole devices only** — phones, laptops, tablets, watches, etc. No loose components, no tools.

#### Layer 2: Shop/Tech B2B Marketplace (visible to verified shops/techs only)

| Category | Examples | Why B2B Only |
|----------|---------|--------------|
| **Refurbished components** | Refurbished screens, tested motherboards, working camera modules | Consumers don't know how to evaluate component quality |
| **Used parts** | Pulled parts from donor devices, untested salvage | Professional risk assessment required |
| **Tools & equipment** | Hot air stations, NAND programmers, microscopes, jigs | B2B market — shops buying/selling shop equipment |
| **Supplies** | Adhesive sheets, solder, flux, ESD equipment in bulk | Professional supplies, not consumer-relevant |

This is a B2B market for the repair industry — screen refurbishment specialists sell refurbished screens to other shops, shops offload equipment they no longer need, etc.

#### Layer 3: Parts Reseller Account (NEW account type — Decision #55)

**The loophole**: Some operators buy broken devices specifically to gut them and resell parts. They're not repair shops (they don't service customers), and they're not traditional suppliers (they don't manufacture or distribute new parts). They're **parts resellers** — a distinct role.

- **New account type**: Parts Reseller — different from Shop, different from Supplier
- **What they can do**: List used/salvaged parts on the B2B marketplace layer
- **Restrictions**: Must be vetted (same principle as supplier vetting), subject to quality standards
- **What they CANNOT do**: Sell directly to consumers, list whole devices as "refurbished" without certification
- **Revenue for RYT**: Transaction fees on sales, possible listing fees
- *(Open: exact vetting criteria, listing limits, quality standards for salvaged parts — deferred to /create-prd)*

**Trust advantages over competitors**:
- Facebook Marketplace, Craigslist, OfferUp → no repair history, no verification, high scam risk
- eBay → seller descriptions only, no immutable platform-verified data
- **RYT Marketplace** → every device has a platform-verified history that can't be faked or hidden

**Marketplace features**:
- Device listings with full history + photos + condition
- Price suggestions based on device history, condition, and market data
- In-platform messaging between buyer and seller
- Ownership automatically transfers on completed sale
- Rebuilt devices clearly labeled with rebuild certification details

**Safety-first transaction model (Decision #56)**:

Core principle: **RYT never discloses user addresses. Period.**

*Local transactions (same area):*
- All meetups happen at **approved safe locations only**:
  - **RYT Hub Shops** — shops that opt in as marketplace meetup locations (earn foot traffic + small hosting fee)
  - **Police stations** — traditionally offer their lobbies as safe transaction spaces
- No private addresses, no parking lots, no "meet me at Starbucks" — safe locations only
- Marketing angle: *"The only marketplace where every transaction happens at a verified safe location"*

*RYT Hub Shop program (Decision #57):*
- **Opt-in only** — shops volunteer, never forced
- Benefits for hub shops: foot traffic, upsell opportunities, brand exposure, small per-transaction hosting fee
- Minimal burden: shop provides the location, not escrow or storage
- Meetups only during shop business hours
- Liability boundary: shop is a meeting place, not a party to the transaction
- Think Amazon delivery hub program — same model, applied to device transactions

*Shipped transactions (long distance) — buyer's choice (Decision #58):*

| Option | How It Works | Address Exposure |
|--------|-------------|-----------------|
| **Ship to my address** | Pre-paid label generated by platform. Seller sees label, not address in app. | Seller sees label only (industry standard — same as eBay/Mercari) |
| **Ship to carrier location** | Buyer selects UPS Store, FedEx, etc. near them for pickup | Seller never sees buyer's address |
| **Ship to RYT Hub Shop** | Ship to nearest hub shop, buyer picks up there | Seller never sees buyer's address |

- Platform generates pre-paid shipping labels (via shipping API — EasyPost, ShipStation, or similar)
- Address sharing in messaging auto-detected and blocked
- Buyer chooses their preference — platform never forces home delivery

**Buyer protection — hybrid escrow (Decision #59)**:

| Transaction Type | Payment Model | Why |
|-----------------|--------------|-----|
| **User → User** (P2P) | **Escrow hold** — RYT holds payment until buyer confirms receipt + inspects device | Higher risk — unvetted sellers, average item $200-$800 |
| **Shop → User** | **Immediate payout** — shop receives payment on transaction | Lower risk — shops are vetted, reputation system, certified inventory |
| **User → Shop** | **Immediate payout** — shop receives device, pays agreed price | Shop inspects device in-person or on receipt |
| **B2B** (shop↔shop, reseller) | **Escrow hold** — same as P2P, professional courtesy | Component values can be high, trust varies |

- P2P escrow: buyer has inspection window (e.g., 3 days) to confirm device matches listing
- If dispute → RYT mediates based on listing photos, device history, and buyer's report
- *(Open: exact escrow hold period, dispute resolution process details — deferred to /create-prd)*

**Wanted / ISO (In Search Of) listings**:
- Shops can post "Wanted" ads for specific used/broken devices they need for parts
  - "Looking for iPhone 12 Pro boards, any condition" — consumers see this and can sell their old junk drawer devices
  - "ISO Galaxy S21 screens, cracked OK" — parts sourcing directly from consumers
- Consumers get notified if they own a matching device: "A shop near you is looking for your [device] — interested in selling?"
- Connects shops with a parts pipeline they'd otherwise have to hunt for on eBay/wholesale
- **Note**: This is for USED parts from consumers. NEW parts come from the Supplier Integration (Domain 5).

**Revenue streams**:
- Transaction fees (percentage of sale price via Stripe Connect) — all layers
- Featured listing fees (sellers pay for visibility)
- Shop listing fees for refurbished/rebuilt device inventory
- Wanted/ISO listing fees for shops
- Parts Reseller account fees (if applicable)

---

### 16. Right to Repair Advocacy & Manufacturer Accountability
[DEEP] — RYT champions Right to Repair. This is a core brand pillar, not a nice-to-have.

#### RTR Legislation Database

- **Wiki-style, up-to-date database** of state and federal Right to Repair legislation
- Track the status of RTR bills in every state: introduced, in committee, passed, vetoed, enacted
- Federal RTR initiatives tracked separately
- Easy to understand for consumers: "What does Right to Repair mean for YOU in [State]?"
- Educates consumers on WHY this matters for their wallet and their devices

#### Manufacturer Grading System

**Grade every major manufacturer on their repair-friendliness:**

| Grade | Criteria | Example |
|-------|---------|---------|
| **A** | Published repair manuals, parts available, supports 3rd party repair, embraces open ecosystems | Motorola (published manuals, officially embracing GrapheneOS — MASSIVE!) |
| **B** | Some repair support, parts partially available, mixed signals | Some Android OEMs |
| **C** | Minimal support, parts hard to get, paywalled schematics | Many laptop manufacturers |
| **D** | Actively hostile to independent repair, parts serialization, software locks | Apple (parts pairing), Samsung |
| **F** | Sues repairers, lobbies against RTR legislation, designs devices to be unrepairable | *(rare, but they exist)* |

- Grades updated regularly based on manufacturer behavior
- Consumers can see at a glance which brands support their right to fix their own stuff
- Celebrates companies doing it right (Motorola) as loudly as it calls out companies doing it wrong

#### Anti-Restrictive Program Stance

**RYT will NOT participate in or promote Apple's IRP (Independent Repair Provider) or Samsung's equivalent programs.**

Why:
- These programs are **backhanded ways to restrict shops** from doing advanced repairs not on an approved list
- They require shops to agree to restrictions that limit their capabilities
- They funnel repair revenue back to the manufacturer under the guise of "authorization"
- RYT's certification is INDEPENDENT — earned by skill, not by signing a manufacturer's contract

**RYT's position**: We certify techs based on their ABILITY, not based on which manufacturers have blessed them.

### 17. Analytics & Insights
[DEEP] — Three tiers: shop-level, industry-wide, internal platform.

#### Tier 1: Shop Analytics (in shop software)
- Revenue per tech, per day/week/month
- Average repair turnaround time
- Most common repairs by device type
- Inventory turnover rates
- Customer satisfaction trends (from reviews)
- Repeat customer rate
- Revenue by repair type / device category

#### Tier 2: Industry Insights (public-facing / premium)
- Most common repairs by device model (anonymized, aggregated)
- Failure rates by manufacturer — feeds directly into **Manufacturer Grading System**
- Regional repair trends
- Seasonal patterns (screen repairs spike in summer, battery replacements in winter, etc.)
- Average repair costs by device type and repair level
- *(Need to explore: is this free content for SEO, or premium data sold to analysts/manufacturers?)*

#### Tier 3: Internal Platform Analytics (staff only)
- Platform growth metrics (users, shops, repairs, marketplace transactions)
- Revenue by stream (subscriptions, transaction fees, API access, marketplace, supplier commissions)
- Trust & safety metrics (disputes, fraud cases, bans)
- Content engagement (article views, SEO performance)
- Certification pipeline (applications, approvals, rejections)
- Shop churn and retention
- Customer acquisition channels

### 18. In-Platform Messaging
[DEEP] — Real-time messaging with RBAC-aware routing. Respects shop workflow.

**Core principle**: Customers should NOT be bothering techs all day in a busy shop. That's what CSRs are for.

**Message routing by shop role**:

| Shop Setup | Incoming Consumer Messages Route To |
|-----------|-----------------------------------|
| Full shop (owner + techs + CSRs) | **CSR first** — CSR handles it or forwards to tech if appropriate |
| Shop with owner + techs (no CSR) | **Owner** — acts as CSR, routes to tech as needed |
| Solo proprietor | **Tech directly** — they wear all hats |

**Tech direct messaging (session-based)**:
- When a tech is actively working on a customer's device, they can **enable direct messaging** with that customer
- Tech initiates the direct channel — customer can't force it
- Direct channel is scoped to the **duration of the active repair session**
- Once the session closes, messaging returns to normal routing (through CSR/owner)
- Use case: "Hey, I found additional water damage under the shield. Here's a photo. Want me to proceed with the repair?" — real-time, photo-supported, no phone tag

**Consumer → Shop messaging**:
- Pre-booking inquiries: "How much for an iPhone 15 screen replacement?"
- Repair status questions beyond what notifications cover
- Marketplace negotiations (buyer/seller on device listings)

**Shop → Consumer messaging**:
- Repair updates with photos
- Authorization requests for additional work
- Follow-up post-repair

### 19. Support Provider Ecosystem (NEW — from deep dive)
[DEEP] — Remote tech support gig economy with two-way referral network.

**What it is**: A new account type for tech-savvy people who aren't repair professionals but want to offer remote tech support through the platform.

**Who they are**:
- Stay-at-home parents, retired IT workers, college students, hobbyists
- The "family tech person" who already does this for free
- People with affinity for tech and patience for helping non-technical users

**What they handle (remote-only, no physical repairs)**:
- Grandma can't FaceTime → walk her through it live
- Bob can't set up his access point in the garage → guide him step by step
- Kid's parental controls are messed up → fix settings remotely
- Email won't sync, printer won't connect, smart home device setup, etc.
- Everyday tech problems that don't require opening a device

**Support methods (Decision #42)**:
- **In-platform chat** — text messaging between support pro and consumer (built into RYT)
- **Video/screen-share: external tools only** — support pros use established services (Google Meet for basic screen share, LogMeIn for actual remote support, etc.)
- RYT does NOT build or embed video/screen-share — too expensive in compute
- Support pros bring their own tooling for remote sessions — RYT just handles booking, payment, and chat
- Platform tracks session start/end for billing purposes (support pro marks session as started/completed)
- AI assistant available (BYOK) for support pros — support-tier knowledge base

**Consumer → Support Pro session flow (Decision #43)**:

Three entry paths:
1. **Browse directory** — consumer browses support pro profiles (ratings, specialties, availability, pricing) and picks one
2. **"Get help now" auto-match** — consumer describes their problem → platform matches to an available support pro based on specialty and availability
3. **Shop referral** — consumer's preferred shop refers them to the shop's preferred support partner(s)

Session types:
- **On-demand** — next available support pro takes the request
- **Scheduled** — book a time slot (e.g., "3pm tomorrow with Sarah")
- Both available — consumer chooses

Relationship building:
- Once a consumer finds support pros they like → **saved to their profile** as favorites
- Easy re-engagement: "Book again with Sarah" one-tap
- Support pros build a client base of returning consumers
- Shop referral connections persist — "Your shop recommended these support pros" stays visible

**The Two-Way Referral Ecosystem**:

This is NOT just a shop recommendation system — it's a **symbiotic growth network**:

**Shop → Support Pro referrals**:
- Shops are innundated with simple support calls they'd rather not handle
- "Your PlayStation is all fixed! If you need help with any other tech issues, feel free to contact me or one of these support pros I recommend"
- Shops outsource the tedious support (helping a 75-year-old who can't text "the Googler") to preferred support specialists
- Shops can maintain a list of **preferred support pros** they recommend to their customers

**Support Pro → Shop referrals**:
- When a support pro encounters a hardware issue they can't remotely fix:
- "Your laptop is shutting down due to overheating — this needs physical repair. Would you like me to create an issue summary and submit it to one of these shops in your area?"
- Support pro generates a **pre-filled intake summary** with symptoms, diagnostics performed, and findings → sends to shop
- Shop gets a warm lead with context already captured — saves intake time
- Customer gets a seamless handoff — no re-explaining the problem

**Revenue model — Hybrid Tier Pricing (Decision #41)**:
- **RYT defines support tiers** with price ranges (e.g., "Basic: $10–$20/session", "Advanced: $20–$40/session", "Premium: $40–$75/session")
- **Support pros set their own price** within each tier they qualify for
- Support pros choose which tiers they offer — don't have to offer all
- RYT takes a **platform application fee** per session (Stripe Connect, same flow as shop payments)
- Payment processed via Stripe Connect — support pro is a connected account, RYT takes application fee
- *(Open: exact tier definitions, price ranges, and platform cut percentage — deferred to /create-prd)*
- **Free to join** — support pros pay NOTHING to be on the platform. RYT earns exclusively from per-session application fee (Decision #47)
- Optional paid tier may be added later ONLY if high-value features are introduced that cost RYT money (e.g., premium AI quota, promoted placement)
- Low barrier to entry = fast supply growth on the platform

**Trust, Onboarding & Quality (Decision #44)**:

Onboarding flow:
1. **Application** — support pro submits proven track record (e.g., military cyber background, former repair tech with established social media / business listings, IT certifications, relevant work history)
2. **Self-declared expertise** — support pro chooses their fields of expertise and comfort level per category
   - Categories are **CMS-style, admin-managed** — NOT hardcoded. New categories added via admin/dev UI anytime.
   - Comfort levels per category: Beginner / Intermediate / Advanced
   - **Launch categories** (starting set, expanded over time): Mobile Devices, Computers, Networking, Smart Home, Printers & Peripherals, Email & Accounts, Streaming & Entertainment, Parental Controls & Family Safety, Accessibility
   - *(Platform-wide principle: treat all taxonomy/categories as admin-managed CMS content, not code — applies to device types, repair categories, support specialties, etc.)*
3. **Basic competency test** — platform-administered screening to verify baseline knowledge in claimed specialties
4. **RYT staff interview** — live call with RYT staff to onboard, verify identity, and assess communication skills / patience / professionalism
5. **Activation** — approved support pros go live on the platform

Quality enforcement:
- Support pros are rated by consumers (same review system as shops)
- Two-way rating: support pros can rate consumers too (problem clients get flagged)
- **Downgrade**: if ratings drop below threshold → removed from higher tiers, restricted to lower-tier sessions
- **Disqualification**: persistent bad track record or serious complaints → deactivated from platform entirely
- Platform monitors: session completion rate, consumer satisfaction, complaint frequency

**Support Pro Public Profile**:
- Photo, name, bio
- Declared specialties with expertise level (e.g., "Apple Devices — Advanced", "Smart Home — Intermediate")
- Verified credentials / background highlights (e.g., "Former IT support, 8 years experience", "Cyber — U.S. Marines")
- Ratings and review excerpts
- Availability status (online / offline / booked)
- Tiers offered and pricing per tier
- Shop endorsements — which shops recommend this support pro
- Session count / success rate

**Support Pro Dashboard — Self-Employment Management Hub**:
- **Incoming requests** — on-demand session queue with problem descriptions, consumer info, estimated complexity
- **Schedule management** — booking calendar for scheduled sessions
- **Calendar sync** — integrate with Google Calendar, Apple Calendar, Outlook etc. so sessions appear alongside personal schedule
- **Task manager** — track follow-ups, notes per client, pending items ("Bob needs router config file, follow up Tuesday")
- **Earnings tracker** — total earned, pending payouts, payout history, per-session breakdown
- **Client list** — repeat customers, favorites, session history per client
- **Ratings & reviews** — see feedback, respond to reviews
- **Referral connections** — which shops recommend them, referral activity, warm leads from shops
- **AI assistant** — support-tier AI (BYOK) for looking up guides, troubleshooting steps during sessions

**Scope Boundaries & Escalation Rules (Decision #45)**:

Escalation (support pro → shop):
- Support pro CAN escalate a consumer to a specific shop with a pre-filled intake summary
- **First-time referrals require shop acceptance** — shop must opt-in to receive the consumer
- Once the **trifecta relationship** is established (consumer ↔ support pro ↔ shop), the flow becomes more fluid — no acceptance gate needed
- Some shops may offer **in-house support** as part of their service, bypassing support pros entirely

Division of labor (natural, not enforced):
- 99% of repair shops don't offer tech support for unrelated issues — it's a natural split
- Shop handles: physical repairs, diagnostics, hardware
- Support pro handles: remote troubleshooting, setup, software, connectivity, "how do I use this"
- Shop can forward non-repair support requests to their preferred support pro(s) through the platform

**Data wall — absolute**:
- Support pros see **ZERO** shop data — no inventory, no repair status, no shop internals
- Support pros only see: consumer-facing info, their own session data, support-tier knowledge base
- Shops see support pro profiles and referral history, but not support pro session details with consumers

**Why this matters**:
- Fills the gap between "Google it yourself" and "bring it to a repair shop"
- Most tech problems don't need a physical repair — they need a patient, knowledgeable person
- Creates a sustainable referral pipeline that benefits shops, support pros, AND consumers
- Shops grow their customer base through support pro referrals
- Support pros grow their client base through shop referrals
- Consumers get help at the right level for their problem

### 2. Shop Software ("Thin Client")
[DEEP] — Major detail dump received.

**Shop Types Supported:**
- **Full shop**: Owner + Technicians + Customer Service / Front Desk (or any combo)
- **Solo tech**: One self-employed technician who wears all hats
- Software has **modes** to accommodate both configurations

#### Shop Owner Mode

The owner has **utmost control** over all other roles in a multi-person shop environment:

- **Full access to all Counter and Tech features**
- **Staff management** — add/remove employees, assign roles (Counter, Tech, Manager)
- **Permission control** — set what each role can see and do
- **Financial oversight** — full visibility into all transactions, revenue, payouts
- **Reporting & analytics** — shop performance, tech productivity, repair turnaround times
- **Settings & configuration** — shop profile, hours, services offered, pricing
- **Inventory management controls** — set low-stock thresholds, manage suppliers, approve orders
- **AI configuration** — manage the shop's BYOK API keys, control AI access for staff
- **Solo tech mode** — when a solo operator, all modes collapse into one unified interface

#### Multi-Location Management

- **One account, multiple locations** — shop owner has a single RYT account that manages all locations
- Each location has its own: staff roster, inventory, service catalog, Stripe Connect account, customer base
- **Dashboard rolls up** — owner sees aggregate analytics across all locations + drill down per location
- **Staff can be shared or location-specific** — a tech could float between locations or be tied to one
- **Cross-location inventory** — visible and requestable between locations, NOT auto-deductible (already decided)
- **Pricing**: Per-location add-on — base subscription covers one location, each additional location is a flat monthly fee (standard SaaS model: Square, Shopify POS, etc.)

#### Front End / Counter Mode (non-tech staff)

Designed for the front desk / customer service rep who interacts with walk-in customers:

- **Customer intake** — greet, capture problem description, look up existing customer profile
- **CRM** — customer management, contact info, notes, communication history
- **POS** — process payments (Stripe Connect), handle deposits, close out repair tickets on payment
- **Shipment intake for inventory** — receive parts shipments, log into inventory system
- **Repair ticket creation** — create tickets from intake, attach customer notes, device info, problem description
- **Ticket assignment** — assign to a queue OR directly to a specific tech
- **Ticket closure on payment** — close the ticket when customer picks up device and pays
- **Messaging** — send messages to techs (internal), contact customers

#### Tech Mode

Designed for the repair technician doing the hands-on work:

- **Access to most front-end features** (CRM, POS, messaging, etc.)
- **Open tickets to begin repairs** — tech starts the actual repair process
- **Full intake context** — sees everything from intake: problem description, front rep notes, customer's own notes, device history (sanitized from platform)
- **Diagnostic tracking** — intelligent system for tracking diagnostics and repair progress step-by-step
- **Status management** — set statuses like "Waiting for Part", "In Progress", "Diagnostics Complete", "Ready for Pickup", etc.

#### Inventory System with Purgatory Model

- **Part visibility per repair** — tech can see what parts are in stock for the specific device AND the specific repair it needs
- **Part selection → Purgatory** — when tech selects a part for a repair, it enters "purgatory" (reserved but not yet consumed)
- **Purgatory → Permanent subtraction** — part is permanently subtracted from inventory ONLY when customer picks up the repaired device AND pays
- **Low inventory alerts** — shops set thresholds, get alerts when stock drops below threshold so they know what to order and when

**Purgatory timeout / abandoned devices:**
- **Shop's choice** — configurable timer OR manual release, whichever the shop prefers
- Shops that want automation: set a timeout (30/60/90 days, shop-configurable, default 90)
  - When timer expires, shop gets notification: "Repair ticket #XYZ has been unclaimed for 90 days. Release parts back to inventory?"
  - Parts auto-return to stock, ticket moves to "Abandoned" status
- Shops that prefer control: handle it manually, no automation
- Abandoned devices become shop property per TOS (shop's policy + state abandoned property laws apply)
- Platform provides a **state-specific advisory** on abandoned property holding periods (same pattern as stolen device advisories)

**Purgatory visibility in inventory:**
- Inventory counts show: **Available** | **In Purgatory** | **Total**
- Each purgatory item shows **how long it's been tied up**: "Screen - iPhone 15: reserved 12 days ago for Ticket #1234"
- Shop owners/managers can see all purgatory items at a glance — identifies stuck repairs and tied-up capital

**Customer pickup reminders:**
- Shops configure **periodic automated reminders** sent through the platform
- Tracked attempts: "Reminder 1 sent (Day 7) — no response. Reminder 2 sent (Day 14) — no response. Reminder 3 sent (Day 30) — no response."
- Creates a documented trail of shop's good-faith effort to reach the customer (legal protection for abandoned property)

**Pre-authorized billing:**
- Customers can **pre-authorize payment** when dropping off a device
- Use cases:
  - Customer trusts the shop and doesn't want to make a second trip
  - Device is being shipped back to the customer
  - Customer will be out of town (vacation, cruise, work travel)
  - Customer simply prefers to pay upfront
- When repair is complete: shop charges the pre-authorized amount, ships or holds for pickup
- Prevents shops from having capital tied up waiting for an unreachable customer
- Pre-auth clears purgatory immediately on repair completion — parts auto-subtracted, ticket closed

#### Dual-Track Diagnostic System

**Track 1: Structured Diagnostic Workflows (no AI needed)**
- Built on if/then/else logic — guided troubleshooting decision trees
- Tech selects symptom(s) → system presents ordered diagnostic steps → each result unlocks/eliminates pathways
- Example: "Device overheating + shutting down" → 5 possible causes → perform these tests in this order → narrow to root cause
- Powered by graph data in SurrealDB (symptom → cause → solution → parts needed)
- **Works entirely from database queries** — no LLM call, no API key, no internet needed
- Can work **fully offline** with cached local diagnostic data
- **We manually craft these paths** — this is proprietary content and a major platform moat

**Track 2: AI Conversational Assistant (the "second brain")**
- GraphRAG powered — SurrealDB vectors + graph traversal + BYOK LLM
- Tech can ask for help at **ANY point** during a Track 1 workflow
- AI sees what the tech has done so far (reads local embedded SurrealDB context)
- AI can suggest alternative approaches, explain WHY, reference similar past cases
- **Requires internet** for the BYOK LLM API call
- **Inventory-aware**: AI knows what parts the shop has in stock
  - "This repair needs Part A and Part B. You have Part A but appear to be out of Part B."

**How the two tracks work together:**
1. Tech selects symptoms → Track 1 guides through structured diagnostic steps
2. At any point, tech hits "Ask AI" → Track 2 reads local SurrealDB → sees what Track 1 has done so far
3. AI provides contextual advice based on: current diagnostic state + global knowledge base + device history + inventory
4. Tech continues through Track 1 with AI insights, or follows AI's alternative suggestion

**Feedback loop (how the platform gets smarter):**
- **Repair succeeds** → automatically reinforces the existing diagnostic path (no action needed)
- **Tech submits feedback** → "System got close but actual fix was X" → stored locally → propagates to platform for staff + AI review
- **Knowledge becomes outdated** → (e.g., iOS 17 changed 3rd-party OEM parts policy for FaceID) → staff/AI reviews feedback → updates guides
- **System was way off** (rare) → flagged for priority review, graph paths corrected

#### Communication & Access

- Tech can message or contact the customer directly if needed
- Tech can **see or request access** to device passwords/credentials (via the platform's authorization system — consumer must grant access)

#### Board View / Schematics Viewer (RYT Board Viewer — based on OpenBoardView, inspired by FlexBV5)

**Legal reality**: ~90% of schematics and boardview files in the repair community are leaked/stolen proprietary data. RYT **CANNOT** provide these files — distributing stolen IP would undermine the platform's trust and legal standing.

**Policy: Bring Your Own Files (BYOF)**
- RYT provides the **tool** — a full Rust port and rebrand of OpenBoardView's core, elevated to FlexBV5-level features and beyond
- RYT does **NOT** provide schematics or boardview files
- Techs bring their own files from wherever they source them — that's their business
- Using the tool to VIEW files is perfectly legal regardless of file origin
- **Exception**: if RYT obtains official manufacturer permission, those schematics can be bundled as official packages

**Implementation approach: Full Rust port**
- OBV is C++ (ImGui + SDL). We are **porting to pure Rust** — not wrapping via FFI
- Rust rendering via `egui` or `wgpu` (native to Tauri)
- Binary format parsers via `nom` or `binrw` crates — safer, no buffer overflows
- Full test corpus available locally for all major formats (comprehensive collection across all supported format types)
- `/create-prd` decision: which Rust rendering framework (egui vs wgpu vs hybrid)

**Supported boardview formats (ported from OBV + FBV):**
- XZZPCB (.xzz) — the most common format in the repair community
- Landrex/Testlink BRD (.brd)
- GenCAD (.cad)
- TeboView (.tvw)
- ASUS FZ (.fz)
- BVRaw (.bvr)
- IPC365 (.ipc)
- OrCAD ASCII Export (.obd)
- Altium/Protel ASCII Export
- Hyperlynx (.hyp)
- Fabmaster (.fab)
- GR, ASC, CST, MDJSON, CAE, Sprint Layout 6 (.lay6)

**Features adopted from FlexBV5:**

| Feature | Description | RYT Enhancement |
|---------|-------------|-----------------|
| **Schematic viewer** | PDF schematic viewing alongside boardview | Integrated into shop software UI |
| **Cross-search (BV ↔ Schematic)** | Click component on board → schematic jumps to it (and vice versa) | + AI: "What does this component do?" |
| **Butterfly mode** | Concurrent split view — top AND bottom of board simultaneously | Standard for multi-layer work |
| **Netweb** | Visual network rendering showing pin connections across components | Essential for diagnostic tracing |
| **MiniMap** | Overview window showing full board with current viewport highlighted | Standard UX for navigation |
| **Library/Cache** | Index folders of boardview files, instant search across thousands | Integrated into BYOF file management |
| **Board annotations** | Add notes to specific board locations | **Annotations persist on repair tickets** |
| **Part hiding** | Filter out heatsinks, shields, GND/NC-only components | Declutters complex boards |
| **Zoom Ring** | Visual indicator highlighting located components | Great UX for jumping to parts |
| **Customizable themes** | Multiple visual themes | Integrated with RYT design system |
| **Ghostmark/cursor** | Secondary cursor for referencing two points | Useful for measurement/comparison |
| **Meta Central** | Centralized board metadata storage | **Stored in local embedded SurrealDB** — feeds AI context |

**Features BEYOND FlexBV5 (unique to RYT):**

1. **Trace selection and inner-layer tracing**
   - Select actual PCB traces on the board view
   - Trace signals through inner layers when CAD/BRD files contain layer data
   - Visualize the full signal path from source to destination across all layers
   - Unique capability — neither OBV nor FBV can do this
   - Test files with layer data available for development

2. **AI integration**
   - Click a component → AI knows which component you're looking at
   - "What does this IC do? What are common failure modes for this part on this device?"
   - AI can reference board locations when suggesting diagnostic steps
   - Board context feeds into the Track 2 AI assistant via embedded SurrealDB

3. **Annotation → Ticket binding**
   - Board annotations persist on repair tickets, not just on boardview files
   - Tech annotates "suspected bad cap here" → visible to any tech who opens the ticket later
   - Creates a visual repair trail

4. **OpenBoardData integration**
   - Community diagnostic resources per board (if legal/compatible)
   - Could feed into the platform's knowledge base over time

**Skipped from FlexBV5:**
- Jobs system (SQLite) — **replaced by our ticket system in Supabase**
- Per-seat licensing model — **replaced by shop subscription**

#### Shop Software Local Data Architecture

The shop software has **two embedded databases** serving completely different purposes:

**1. Local Postgres-Compatible DB (offline operational data)**
- Stores: tickets, inventory, customers, transactions, shop settings — everything that's operational
- **Schema-compatible with Supabase's cloud Postgres** — same tables, same types
- Works fully offline — syncs with cloud Supabase when connectivity returns
- Handles: new ticket creation, inventory updates, POS transactions, customer intake — all offline
- Conflict resolution: local changes win (shop was there, cloud wasn't), conflicts logged for review
- Sync is **event-driven** — changes sync when they happen, not on a timer
- `/create-prd` tech options: PGlite (Postgres-in-WASM, 1:1 compatibility) or PowerSync (purpose-built Supabase offline sync)

**2. Embedded SurrealDB (local AI context only)**
- **NOT for operational data** — that's the local Postgres DB's job
- Stores: current repair session context, diagnostic workflow state, what the tech has tried, symptom→cause→solution graph traversals
- Purpose: gives the AI (Track 2) **local context** about the current repair when tech asks for help
- Can cache diagnostic packages from cloud SurrealDB for **cost savings** (reduces cloud compute + egress)
- Cached packages also enable **Track 1 structured workflows to work fully offline**
- Graph + vector capabilities that Postgres can't do — hybrid GraphRAG queries

**What syncs WHERE:**

| Data | Local DB | Cloud Destination | Sync Direction |
|------|----------|-------------------|---------------|
| Tickets, inventory, customers | Local Postgres | Supabase (cloud) | Bidirectional |
| POS transactions | Local Postgres | Supabase + Stripe | Up only |
| Device history records | Local Postgres | Supabase (cloud) | Up only (feeds DeviceCarFax) |
| Customer-facing repair status | Local Postgres | Supabase (cloud) | Up only |
| Repair feedback (new knowledge) | Local SurrealDB | Cloud SurrealDB | Up only (reviewed by staff/AI) |
| Diagnostic packages (cached) | Cloud SurrealDB | Local SurrealDB | Down only |
| Current repair session context | Local SurrealDB | Nowhere | Local only (ephemeral) |
| Internal shop notes | Local Postgres | Nowhere | Local only (shop-private) |

### 3. AI Repair Diagnostic Assistant ("The Brain")
[DEEP] — Core product differentiator. Multi-faceted system.

#### What The AI Does

**For Shops/Techs (via Shop Software):**
- Full dual-track diagnostic system (see Domain 2: Track 1 structured workflows + Track 2 AI conversational)
- One-click sends full repair context as payload → AI gathers more data from tech → offers diagnostic/repair advice
- **Inventory-aware**: AI knows what parts the shop has in stock
  - Can proactively tell tech: "This repair needs Part A and Part B. You have Part A in stock but appear to be out of Part B."
  - This is the "intelligent" differentiator — it's not just a chatbot, it reasons about the shop's real-world state
- Adapts to individual device repair needs, progress, and responds to tech feedback (iterative)
- Searches the SurrealDB knowledge base for repair guides, known issues, schematics
- Access to: Full professional diagnostic knowledge base

**For Support Pros (via Website — not native app):**
- AI focused on **consumer device support** — user guides, manuals, troubleshooting, setup walkthroughs
- NO repair diagnostics, NO board-level data, NO inventory awareness
- Different knowledge base subset: consumer-facing guides, not professional repair data
- Support pros can use Track 1 workflows (consumer + intermediate level paths)
- AI helps support pros help consumers — not for doing repairs

**For Consumers (via Web/Mobile App):**
- **Self-help assistant only** — NOT a repair tool
- Account-related support: "What's the status of my repair?" / "Show me my device history"
- Basic entry-level troubleshooting using simplified Track 1 paths
- Links to guides on the platform (Consumer Education content hub)
- **Funnel**: When the task becomes involved or service-oriented → "Would you like to connect with a support pro?" or "This looks like it needs a repair shop — here are shops near you"
- Access to: Consumer-level knowledge base subset only (simple troubleshooting, NOT professional repair data)

#### Three-Tier AI Access Model

| Feature | Consumer | Support Pro | Shop/Tech |
|---------|----------|-------------|-----------|
| **Track 1 (structured workflows)** | Consumer-simplified paths | Full consumer + intermediate paths | Full professional diagnostic paths |
| **Track 2 (AI chat)** | Self-help only, funnel to humans | Full support context | Full repair context + session state |
| **Board viewer** | ❌ No | ❌ No | ✅ Yes |
| **Inventory awareness** | ❌ No | ❌ No | ✅ Yes |
| **Knowledge base access** | Consumer subset (guides, basic troubleshooting) | Support subset (user manuals, setup, troubleshooting) | Full professional (repair data, diagnostics, schematics) |
| **Platform** | Web/Mobile app | Website (no native app) | Shop software (Tauri) |

#### AI Cost Model

| Account Tier | AI Access | Who Pays for Inference |
|-------------|-----------|----------------------|
| **Free consumer** | BYOK only — supports **Gemini, Anthropic, and OpenAI** (user picks provider + model). Guided walkthrough for free Gemini key via Google AI Studio (2-min setup) | User (free via Google AI Studio, or paid via own Anthropic/OpenAI key) |
| **Premium consumer** | Monthly AI quota **included** in subscription + optional BYOK for additional credits or model preference | RYT absorbs quota cost. **Quota consumed first**, then BYOK kicks in if configured |
| **Support pro** | BYOK mandatory (any of the 3 providers) | Support pro (business expense) |
| **Shop/Tech** | BYOK mandatory (any of the 3 providers) | Shop (business expense) |

- **Multi-provider BYOK**: All users can bring keys from Gemini, Anthropic, or OpenAI — choose your model
- **Premium quota-first ordering**: Premium accounts consume their included monthly quota first; BYOK credits only used after quota is exhausted (or if user explicitly selects a BYOK model preference)
- Premium AI quota is a **subscription selling point**: "Upgrade to Premium: AI support included, unlimited device history reports, priority shop matching"

#### Multi-Data-Source Architecture (CORRECTED)

**Critical boundary**: Supabase and SurrealDB serve completely different purposes. They are NOT interchangeable.

| Source | Location | What It Stores | Role |
|--------|----------|---------------|------|
| **Supabase (Postgres)** | Cloud | ALL operational data — users, shops, tickets, inventory, payments, device profiles, device history, certs, reviews, messaging | **The business platform** — auth, RLS, CRUD, relational queries |
| **SurrealDB (Cloud)** | BuyVM slice | Proprietary repair guides, diagnostic graphs, vectorized knowledge, parts compatibility, symptom→cause→solution relationships | **The AI knowledge base** — GraphRAG, vectors, graph traversal |
| **Local Postgres** | Shop software | Offline copy of shop's operational data (tickets, inventory, customers) | **Offline ops** — works without internet, syncs to Supabase |
| **SurrealDB (Embedded)** | Shop software | Current repair session context, cached diagnostic packages, local diagnostic state | **Local AI context** — what the tech has tried, current diagnostic state |

**AI query flow (when tech hits "Ask AI"):**
1. **Embedded SurrealDB** → "What has the tech tried? What symptoms? Current diagnostic state?"
2. **Cloud SurrealDB** → "What does the global knowledge base say about these symptoms?" (GraphRAG)
3. **Supabase** → "What device is this? What's its history? What parts are in stock?"
4. All three contexts → structured payload → **BYOK LLM call** (user's API key)

- *(Architecture question for /create-prd: How do these three sources interconnect for a single AI query? API gateway? Aggregation layer? Direct queries from the shop software?)*

#### SurrealDB 3.0 Capabilities (Research Findings)

SurrealDB 3.0 (released Feb 2026) is an exceptional fit for the AI brain:

- **Native HNSW vector search** — 8x faster than previous versions. Perfect for semantic similarity search across repair guides and diagnostic data.
- **Advanced graph traversal** — 8-24x faster graph queries with bidirectional record references. Perfect for modeling device → problem → solution → part relationships.
- **Agent memory infrastructure** — Built-in support for storing vector embeddings + structured data + graph context in one place. Designed explicitly for AI agent workflows.
- **Surrealism WASM extensions** — Run custom logic and AI models directly within the database.
- **Native file storage** — Store, access, and transform files directly via SurrealQL (schematics, board views, repair photos).
- **Hybrid queries** — Combine vector similarity + graph traversal + SQL predicates in a single query. This is the killer feature for "find me similar repairs on this device model that involved this symptom and were resolved successfully."
- **Embedded mode** — Can be embedded directly in Rust applications (Tauri shop software). Shop data stays local.
- **Custom API endpoints (DEFINE API)** — Can expose custom endpoints directly from the database.

#### Open Architecture Questions (Deferred to /create-prd)

- Consumer-facing AI agents: TypeScript? (web/mobile platform)
- Shop software AI agents: What Rust-native AI agent framework? (Tauri app)
- How to build agents into the Tauri app so shops can use AI on their own data + proprietary guides
- Federated query pattern across Supabase + cloud SurrealDB + local SurrealDB
- n8n Enterprise as orchestration layer vs custom-built agent framework

### 4. Data Architecture (CORRECTED — see Decision #33-35)
[DEEP] — Data boundaries fully established during Domain 2 deep dive.

**Four-Database Architecture:**

| Database | Location | Stores | Purpose |
|----------|----------|--------|---------|
| **Supabase (Postgres)** | Cloud | ALL operational data — users, shops, tickets, inventory, payments, device profiles, device history, certs, reviews, messaging | **The business platform** — auth, RLS, CRUD, relational |
| **SurrealDB 3.0 (Cloud)** | BuyVM slice | Repair guides, diagnostic graphs, vectors, parts compatibility, symptom→cause→solution relationships | **AI knowledge base** — GraphRAG, vectors, graph traversal |
| **Local Postgres-Compatible** | Shop software | Offline copy of shop's operational data | **Offline ops** — works without internet, syncs to Supabase |
| **SurrealDB 3.0 (Embedded)** | Shop software | Repair session context, cached diagnostic packages, local diagnostic state | **Local AI context** — ephemeral session data + cached knowledge |

**Key decisions locked:**
- Supabase and SurrealDB serve **completely different purposes** — NOT interchangeable (Decision #33)
- Shop software has **two embedded databases** (Decision #35)
- Sync details documented in Shop Software → Local Data Architecture section

**PII & Credentials:**
- PII isolation and compliance via Supabase RLS
- Sensitive credential storage (device passcodes etc.) — E2E encryption, access control (Decision #29)
- API keys stored encrypted, never logged, decrypted only at request time

### 4b. Tech Stack Preferences (Noted for /create-prd)

| Surface | Proposed Stack | Status |
|---------|---------------|--------|
| Website | Astro + React + Tailwind + Vanilla CSS | User preference — confirmed |
| Shop Software | Rust / Tauri (SurrealDB embed is native Rust) | User preference — confirmed |
| Mobile App | React Native? Expo? | User needs help deciding — architecture decision for /create-prd |
| Auth & Account DB | Supabase | User preference — confirmed |
| AI Repair Data DB | SurrealDB 3.0 (cloud + embedded) | User preference — confirmed |
| Payments | Stripe Connect | User preference — confirmed |
| AI Inference | BYOK — user-provided API keys | User preference — confirmed |
| Hosting (web) | Cloudflare Pages | User preference — confirmed |
| Hosting (SurrealDB + n8n) | BuyVM slice | User preference — confirmed |

### 5. User Onboarding & Network Effects
[DEEP] — Platform economics strategy defined.

**Revenue Model**: Bread and butter is **shops paying** for the platform. Consumer accounts drive adoption pressure.

#### Multi-Facet Squeeze Strategy (Flywheel)

Both consumers AND shops grow the platform organically, creating a self-reinforcing cycle:

```
Consumer Trust in Brand
        ↓
Consumers insist shops use RepairYour.Tech
        ↓
Shops can't afford NOT to be on the platform
        ↓
More shops = better directory for consumers
        ↓
More consumers = more pressure on holdout shops
        ↓
(repeat)
```

**Goal**: Make it a financial hamstring for any shop's bankroll if they DON'T use the platform. Go heavy on establishing consumer trust in the brand.

#### All Onboarding Channels (no reason to exclude any)

**Shop → Consumer onboarding** (natural):
- Shops that use the platform naturally onboard customers during intake
- Customer gets invited to create an account to track their repair

**Consumer → Shop onboarding** (the invisible pull):
- Consumer searches for a shop, doesn't find theirs → "Suggest a shop" → platform reaches out to invite
- ~~Consumer creates ghost/unclaimed shop profile~~ → **REJECTED**: Can't let shops become publicly searchable without claiming AND paying. Handing shops free business the platform doesn't benefit from.
- Consumer asks their shop to join → word-of-mouth pressure
- Consumer can privately tag a shop name on their own repair records (for personal tracking only — NOT public)

**Platform → Shop onboarding** (sales/marketing):
- Direct outreach to shops in underserved areas
- "Your shop has been searched X times by consumers" notifications
- Free-tier shop access to CRM + tickets + inventory (even without AI/POS) to lower the barrier

**Modular adoption for shops**:
- Shops don't have to use everything — even just CRM + tickets + inventory is enough to be on the platform
- AI and POS are premium features — shops grow into them
- This lowers the barrier to entry dramatically

### 6. Native Mobile Apps
[DEEP] — Consumer + Shop companion. Android-specific protection feature is a key differentiator.

**Platforms**: Native app — iOS and Android (cross-platform framework TBD in /create-prd, e.g., React Native / Expo)
- **Android-first launch** — user has no iOS test device or Apple Developer account yet
- iOS will be built simultaneously but won't be officially supported/published at launch
- Both platforms get the same features where OS allows (Device Guardian is Android-only)

#### Consumer App Features

- **Full account access** — device profiles, repair history, shop directory, payments, DeviceCarFax searches
- **Push notifications** — real-time repair status updates ("Your phone is ready for pickup"), payment confirmations, shop messages, purgatory reminders
- **Device auto-detection** — the app is ON one of the user's devices, so it can auto-populate device profile fields (model, OS, storage)
- **Camera integration** — snap photos of damage, scan barcodes/QR codes for device lookup
- **Biometric auth** — Face ID / fingerprint for fast login and credential vault access
- **Offline access** — view device profiles and repair history without connectivity
- **Location-based shop discovery** — GPS-driven "shops near me" with map view
- **AI self-help assistant** — consumer-tier AI (Track 1 simplified paths, BYOK/premium quota chat) — funnels to support pros or shops when task gets involved
- **Support pro connection** — connect with support professionals for hands-on troubleshooting
- **Marketplace** — buy/sell devices with verified history (see Domain 15)
- **Pre-auth payments / card on file** — pay for repairs through the app (Payment Intent via Stripe)

#### 📍 Device Locator (Premium)

**Third-party Find My Phone — built into the RYT app.**

| Feature | Android | iOS |
|---------|---------|-----|
| Real-time location tracking | ✅ Background service | ⚠️ Last known location only (Apple restricts background tracking) |
| Remote ring | ✅ | ❌ Apple reserves for Find My |
| Remote lock | ✅ (Device Admin) | ❌ |
| Last known location | ✅ | ✅ (when app is active) |
| **Mark as Lost/Stolen** | ✅ → flags across entire RYT ecosystem | ✅ → flags across entire RYT ecosystem |

**Cross-device ping**:
- Users logged in on ANY device can ping ANY other device on their account
- Lost your phone? Log in from the web or a tablet → ping it
- **Family tier**: Parents can see all family devices on a family dashboard → locate any child's device
- This makes the Family Premium plan a **parental control powerhouse**

**The RYT differentiator**: No other locator app can flag a device across an entire repair ecosystem. One tap "Mark as Lost/Stolen" → every shop on the platform is alerted, marketplace listings blocked, device history updated.

#### Shop Staff Companion (Mobile)

- **Ticket notifications** — tech gets push notifications when assigned a new ticket
- **Revenue dashboard** — shop owner checks daily revenue from their phone
- **Customer messages** — respond to customer inquiries on the go
- **Quick status updates** — mark tickets as "Ready for Pickup" etc. from phone
- **Inventory alerts** — low stock notifications on the go

#### 🛡️ Android App Protection ("Device Guardian")

**Origin**: Techs constantly have to remove junk apps (home screen hijackers, fake cleaners, scam "optimizers") from customers' Android devices. These apps inevitably make phones unusable. This feature solves that AND drives consumer app adoption.

**How it drives adoption**: Techs install the RepairYour.Tech app on every customer's phone as a value-add: "I installed this to help protect your phone from bad apps." This organically onboards consumers through the shop.

**Technical approach (no root required)**:
- **App install monitoring** — listen for PACKAGE_ADDED broadcasts to detect newly installed apps
- **Blacklist matching** — maintain a server-side curated list of known junk/malicious apps
- **Screen overlay warning** — when a bad app is detected, display a warning overlay explaining why this app is harmful and recommending removal
- **One-tap guided uninstall** — launch the system's ACTION_DELETE intent directly
- **Existing app scan** — audit already-installed apps on first run
- **Opt-in feature** — consumer must enable this; it's not forced
- **Apple not needed** — iOS's App Store curation handles this; this is Android-only

**Community-driven blacklist management**:
- **Server-side blacklist** — centralized, pushed to all Device Guardian installs
- **Tech/shop submissions** — shops and techs can submit apps for blacklist consideration
- **Community voting** — newly submitted apps appear on a voting board for other techs to vote on
- **Emergency blacklisting** — if enough techs vote an app as harmful, it gets temporarily blacklisted before official platform review
- **Official review** — Blacklist Manager reviews submissions and votes, makes final determination
- **Feedback loop** — techs on the front lines see new junk apps first, platform benefits from their collective expertise
- *(Need to explore: Google Play policy compliance for overlays/accessibility services. Voting thresholds for emergency blacklisting. False positive handling.)*

**Value proposition for techs**: "I just cleaned your phone. This app will warn you before you install another junk app that'll bring you back here in a month."

#### 🔐 Device Hardening Service (Android Enterprise)

**Tier 2 escalation** — for users who still manage to mess up their phones despite Device Guardian warnings. Both methods coexist:

| Tier | Method | Who It's For |
|------|--------|-------------|
| **Tier 1: Device Guardian** (default) | Accessibility Service — passive warnings, post-install detection | Everyone — opt-in, no setup needed |
| **Tier 2: Device Hardening** (tech-delivered) | Android Enterprise Device Owner — active app blocking | Users who blow past warnings, kids, elderly, repeat offenders |

**What Android Enterprise Device Owner mode enables:**
- **App allowlisting/blocklisting** — only approved apps can be installed, period
- **Sideloading completely blocked** — no APK installs from unknown sources
- **Google Play restrictions** — limit what categories of apps are available
- **Remote policy management** — RYT platform can push policy updates
- **App auto-removal** — flagged apps force-uninstalled automatically

**Why techs deliver this (not self-service):**
- Requires factory reset → tech handles this during a repair visit or as a standalone service
- Tech backs up user data → factory reset → sets up Device Owner with RYT → restores data
- User walks out with a **hardened phone** they can't accidentally destroy
- This is a **billable service** through the shop software: "Device Hardening" service category

**Who wants this:**
- **Parents** setting up a kid's phone (HUGE market)
- **Elderly users** who install every popup they see
- **Repeat offenders** — customer comes in for the 3rd malware cleanup
- **Business owners** putting phones in employee hands

**Management after setup:**
- Shop can manage policies remotely if user has a premium plan
- Parent can adjust permissions from their own RYT account (family tier)
- User can request unlock by visiting a shop or through the platform

---

### 7. Platform Staff & Roles
[DEEP] — RBAC from the start across ALL surfaces.

**Principle**: Proper RBAC everywhere — platform staff, family accounts, AND shop software. No shortcuts.

| Role | Responsibilities |
|------|------------------|
| **Super Admin** | Full platform access. System configuration. Can do everything. |
| **Content Manager** | Manages the AI repair knowledge base — curates guides, reviews data, maintains the SurrealDB corpus. Builds research/chunking/vectorizing tools. |
| **Support Agent** | Handles consumer and shop support tickets. Moderates disputes. Manages refund requests. |
| **Partner / Shop Relations** | Manages shop onboarding, outreach to new shops, handles shop account issues, the "sales" team |
| **Finance / Billing** | Manages Stripe payouts, platform fees, billing disputes, revenue reporting |
| **Community / Trust** | Manages shop verification badges, reviews/ratings moderation, lost/stolen device reports, DeviceCarFax disputes |
| **Blacklist Manager** | Maintains the Device Guardian junk-app blacklist. Centralized list of known offenders. Reviews community reports. |
| **DevOps / Engineering** | Internal — system health, deployments, database management |

### 8. Supplier / Parts & Tools Provider Integration
[DEEP] — API-driven fulfillment integration + revenue stream.

**What this is NOT**: It's not a parts marketplace. Shops don't browse a marketplace. This is a **programmatic fulfillment integration** — suppliers connect their catalogs via API, and the RYT platform surfaces the right parts and tools at the right time during the repair workflow.

**Supplier accounts**:
- Companies like **MobileSentrix**, **Injured Gadgets**, and other parts/tools providers sign up for a **Supplier Account**
- **RYT provides the API endpoints** — suppliers build their own integration using their own developers (Decision #50)
- RYT defines the standardized catalog schema; suppliers push their data into it
- API keeps pricing and availability **up to date in real time** — no stale catalog data
- Suppliers pay RYT for this integration (see Revenue model below)

**Catalog taxonomy depth** (reference: MobileSentrix catalog structure):

The API schema must support deep hierarchical catalogs. Reference depth from established suppliers:

| Level | Example |
|-------|---------|
| Manufacturer | Apple, Samsung, Motorola, Google, Game Console |
| Product Line | iPhone, iPad, Watch, AirPods, MacBook Pro |
| Model | iPhone 17 Pro Max, iPhone 16e, iPad Pro 13" 7th Gen (2024) |
| Part Category | Screens, Batteries, Board Components, Flex Cables, ICs/Chips |
| Individual Part | Specific SKU with quality tier (OEM / Aftermarket / Refurbished), pricing, availability |

Additional top-level categories beyond device-specific parts:
- **Tools & Supplies** — soldering equipment, adhesives, opening tools, ESD protection
- **Board Components** — individual ICs, capacitors, resistors, connectors (board-level repair)
- **Accessories** — cases, chargers, cables
- **Refurbishing** — housings, cosmetic parts, refurb kits

RYT's schema should **match or improve on** this level of depth. The API must be flexible enough to handle any supplier's catalog structure mapped into this taxonomy.

**Part compatibility data**:
- **Primary source**: suppliers tag their parts with device compatibility in their API catalog
- **Secondary**: repair history reinforces compatibility — "Part X was used successfully in Device Y 47 times"
- **Tertiary**: tech-submitted corrections — "this battery also fits iPhone 12 AND 12 Pro" (community expansion)
- All three sources feed the AI knowledge base for smarter recommendations

**How it integrates with the repair workflow (AI-driven)**:

The AI diagnostic assistant becomes **parts AND tools aware** in real time:

1. **During diagnostics**: "Here is the tool list for this diagnostic process: 1, 2, 3, 4. You don't have 5 or 6, but Supplier X sells these — [link/order]"
2. **During repair**: "This repair needs Part A and Part B. You have Part A in stock. MobileSentrix has Part B (OEM) for $12.50, Injured Gadgets has it (Aftermarket) for $8.00. Want to order?"
3. **Real-time updates**: "I'll update this list in real time with tools, supplies, and parts as the diagnostic and repair process evolves"
4. **Low stock alerts**: "You're down to 2 iPhone 15 screens. Your preferred supplier has them at $X. Reorder?"

**Shop tool cataloging (NEW)**:
- Shops catalog their **tooling inventory** — not just parts
- System knows what tools/equipment the shop owns
- AI can recommend: "This board-level diagnostic requires a hot air station and multimeter. You have both."
- Or: "This repair requires a NAND programmer. You don't have one — Supplier Y sells the [model] for $X"
- Helps shops identify equipment gaps and plan purchases

**Shop ↔ Supplier relationship**:
- Shops set **preferred suppliers** — their go-to vendors
- Shops can set preferred **quality tiers** per part type (e.g., "always show OEM first for screens, aftermarket is fine for batteries")
- AI respects these preferences when making recommendations
- Shops can order directly through the platform (programmatic fulfillment via supplier API)

**Order fulfillment flow (Decision #51)** — industry standard pass-through:

| Step | What Happens | Who Handles |
|------|-------------|-------------|
| 1. Shop clicks "Order" (or AI suggests → tech confirms) | Order placed in RYT | RYT platform |
| 2. Payment captured | Stripe processes payment | RYT via Stripe Connect |
| 3. Order transmitted | API call sends order details to supplier's fulfillment system | Supplier's integration |
| 4. Supplier ships | Direct to shop address | Supplier |
| 5. RYT takes cut | Application fee deducted before supplier payout | Stripe Connect (automatic) |

- Same **Stripe Connect** pattern used across entire platform: shop payments, support pro sessions, and now supplier orders
- Suppliers are connected accounts on Stripe, same as shops and support pros
- RYT never touches inventory or shipping — pure platform play

**Order lifecycle management (Decision #52)**:

Tracking (in-platform):
- Suppliers push tracking info back through API (carrier, tracking number, ETA)
- Shop sees order status in their RYT shop software — no need to check supplier websites separately
- **Delivery acceptance → auto-add to inventory**: when shop confirms delivery, parts automatically flow into shop's inventory system
- This is a killer integration — most platforms can't do this because they don't control the shop's inventory. RYT does.

Disputes/returns (passed to supplier):
- RYT does NOT mediate part quality disputes — suppliers have their own return policies and customer service
- RYT provides the contact path and order history for reference
- If a supplier consistently generates complaints, RYT can downgrade or revoke their vetted status

*(Revisit: inventory system deep dive — how delivery acceptance, stock levels, and auto-reorder interact)*

**Revenue model for RYT (Decision #48)**:
- **Hybrid pricing**: base API access fee (monthly/annual) + transaction commission on orders placed through the platform
- Premium placement / featured supplier status (optional paid add-on)
- This is a B2B revenue stream — charged to suppliers, not shops
- *(Open: exact fee tiers and commission percentage — deferred to /create-prd)*

**Supplier vetting (Decision #49)**:
- Suppliers are **curated, not open** — RYT vets suppliers before they can list
- Quality check: product quality, fulfillment reliability, return policies, industry reputation
- Protects shop trust — shops know that any supplier on the platform has been vetted by RYT
- *(Open: exact vetting criteria and process — deferred to /create-prd)*

**Data placement**:
- Supplier catalogs: cached in platform (Supabase or edge cache for fast lookup)
- Order history: shop's Supabase data (operational — syncs with cloud)
- Tool/equipment inventory: shop's local DB (same as parts inventory)

**Supplier experience — API + Dashboard (Decision #53)**:

Clean separation of concerns — API for machines, dashboard for humans:

*API (supplier's developers manage):*
- Catalog push — products, pricing, availability, compatibility, quality tiers
- Order receipt — incoming orders from shops
- Tracking updates — push shipping status back to RYT
- Inventory sync — real-time stock levels

*Dashboard (supplier's account managers use):*
- **Order queue** — incoming orders, fulfillment status overview
- **Analytics** — top-selling parts, shop demand trends, revenue by period
- **Shop relationships** — which shops have them as preferred, order volume per shop
- **Billing** — RYT subscription fees, transaction history, Stripe payouts
- **Account settings** — API key management, webhook configuration, team access

### 9. Data Provider Accounts
[DEEP] — Community-driven knowledge growth.

**Concept**: Organizations like **iFixit** and other repair data providers can sign up to contribute guides, teardowns, and repair data. They get referred to techs as high-quality data sources.

**Rules**:
- Data providers are **NEVER charged** for contributing — this is a valuable contribution to the repair community
- They get visibility and referrals in return
- Their data goes through the content management pipeline (review, chunk, vectorize, graph)

### 10. Content / Knowledge Management
[DEEP] — The initial data is the hardest part.

**Initial data creation**:
- Built manually by the founding team (user + AI assistance)
- Covers EVERY manufacturer, device types, models and variants, parts, suppliers
- Requires: data aggregation, review, chunking, vectorizing, graph creation
- This is **not a small task** — it's the core IP of the platform

**Content management tooling** (built into the platform Content Manager role):
- Tools to ingest new data sources
- Search, review, and curate existing knowledge
- Chunking and vectorizing pipelines
- Graph relationship management (device → problem → solution → part)

**Passive data collection from shop software**:
- As techs use the software and close repairs, aggregate data silently
- Only collect the **absolute necessary details** — not verbose
- Quality control is critical — low-quality data must not pollute the knowledge base
- Collection happens naturally through normal software use

**Certified tech contributions** (proactive, high-integrity):
- Higher-skilled, certified techs can **opt in** to contribute more proactively
- Their data is **weighted with more integrity** in the knowledge base
- Example: Jesse Cruz from VCC Board Repair tracks a world-first NAND replacement on the latest iPhone — that data is gold
- Certification levels TBD — *(Need to explore: how do techs get certified? Platform verification? Peer review? Repair count thresholds?)*

**Data quality strategy**:
- Tiered trust levels for data sources:
  1. Platform-curated (highest trust) — manually reviewed by Content Manager
  2. Certified tech contributions (high trust) — weighted, verified contributors
  3. Data provider contributions (high trust) — iFixit, etc.
  4. Passive collection from repairs (medium trust) — aggregated, patterns only
  5. Community submissions (lowest trust) — requires review before inclusion

---

### 14. Consumer Education & SEO Content Hub
[DEEP] — Organic onboarding through content.

**Concept**: The website hosts a content section with articles, guides, and advice for consumers. Drives SEO, builds brand authority as THE trusted voice in electronics repair.

**Content types**:
- "How to protect your phone screen"
- "What to do when your laptop won't turn on"
- "Signs your repair shop might be scamming you"
- "Is it worth repairing vs replacing your [device]?"
- Device care tips, troubleshooting guides, buyer's guides

**Medium-style content gates**:
- Articles are **partially visible** to non-members — enough for SEO crawlers and AI search to index and recommend
- Users must **create a free account** to read the full article
- This is an **organic onboarding channel** — search → find article → sign up (free) → now they're on the platform
- No paywall — the gate is signup, not money

**SEO & AI search strategy**:
- Content structured for Google search AND AI-powered search (ChatGPT, Perplexity, etc.)
- Rich snippets, schema markup, proper heading structure
- Positions RepairYour.Tech as the authority consumers find first

---

### 11. Certification & Verification System
[DEEP] — Core trust mechanism. Tiered both horizontally and vertically.

#### The Certification Matrix

Certifications are a **2D matrix**: device categories (horizontal) × skill levels (vertical).

**Horizontal axis — Device Categories** (not all shops do all categories):

| Category | Examples |
|----------|---------|
| Smartphones | iPhone, Samsung Galaxy, Pixel, etc. |
| Tablets | iPad, Galaxy Tab, Surface, etc. |
| Laptops / Notebooks | MacBook, ThinkPad, Dell XPS, etc. |
| Desktops | Custom builds, iMac, business PCs |
| Gaming Consoles | PlayStation, Xbox, Nintendo Switch |
| Televisions / Displays | Smart TVs, monitors |
| Wearables | Apple Watch, Fitbit, etc. |
| Other | Drones, IoT, networking gear, etc. |

**Vertical axis — Skill Levels** (within each device category):

| Level | Description | Example Work |
|-------|-------------|-------------|
| **Level 1** | Entry to mid-level diagnostics and repairs | Screen replacements, battery swaps, parts that unscrew or unplug. Software troubleshooting. |
| **Level 2** | Complex diagnostics and advanced repairs | Component-level soldering — capacitors, fuses, HDMI ports. Reliable diagnosis of deeper issues. |
| **Level 3** | Top tier — specialist work | Advanced microsoldering, CPU/NAND swaps, splitting iPhone logic board sandwiches, clean room data recovery. |

**CRITICAL INSIGHT**: Just because you can replace screens (L1) does NOT mean you belong touching a soldering iron (L2). And being good at soldering capacitors (L2) does NOT mean you belong doing CPU swaps or clean room data recovery (L3).

#### Certifications Are Tied to INDIVIDUALS, Not Shops

This is a **fundamental design principle**:

- A **shop's capabilities** come from the **techs who work there**
- Example: User's old shop could do Level 3 only because HE worked there. The owner was just a Boost Mobile owner with no repair skills.
- If that Level 3 tech leaves, the shop LOSES Level 3 certification in that tech's categories — unless another Level 3 tech is on staff
- This is honest and protects consumers from shops that over-promise

**How a shop's advertised capabilities work**:
- Shop's profile shows the HIGHEST certification level available per device category, based on currently employed certified techs
- If certified tech leaves → shop's profile automatically updates to reflect actual capability
- If certified tech joins → shop immediately gains that level in that tech's categories (if shop is set up for it)

#### Verification Process

**For well-known techs** (easy):
- Jesse Cruz, Louis Rossmann, etc. — instant Level 3 in their respective categories, no second thought
- Most people in this field have ample online presence

**For lesser-known but skilled techs** (standard):
- Submit links to reviews, online profiles, YouTube/content, social media
- Portfolio of work (before/after photos, board-level repair documentation)
- Platform team reviews and certifies

**For techs with no online proof** (assessment):
- Questionnaire / assessment per device category and level
- *(Need to explore: what does the assessment look like? Written? Video submission of a repair? Peer review by certified techs?)*

#### Training (Organic, Not Formal)

- **No formal training courses** — the platform is NOT a training provider
- BUT any tech using the software has access to ALL repair guides + the AI assistant
- This is inherently a **learning tool** — techs learn by doing with AI guidance
- Valuable for **shop owners** who can't spend all day looking over a new hire's shoulder — the software + AI becomes the trainer
- Certification is about **verifying existing skill**, not teaching from scratch

#### Non-Blocking Certification Philosophy

**We do NOT stop shops from doing uncertified repairs.** The platform's approach:

- Shops CAN perform any repair they want — we don't block anything
- We just **don't advertise, vouch for, or offer platform coverage** for uncertified work
- Consumer sees: "⚠️ This shop is not certified for this repair. That doesn't mean they can't do it — it only means they haven't passed our certifications for it. Proceed at your own risk."
- This protects RepairYour.Tech legally while not hamstringing shops

### 12. Hiring & Talent Marketplace
[DEEP] — Natural extension of individual-bound certifications.

**Concept**: Since certifications are tied to INDIVIDUALS, there's a natural marketplace for talent.

**For shop owners**:
- Post job listings on the platform
- Search for certified techs by level + device category + location
- "I need a Level 2 Smartphone tech in Dallas" → browse available candidates

**For techs**:
- Maintain a platform resume / profile with certifications, specialties, and work history
- Advertise availability for hire
- A certified Level 3 tech joining a shop instantly grants that shop Level 3 in their device categories

**Dynamic capability advertising**:
- When a certified tech is hired → shop's profile immediately shows those capabilities
- When a certified tech leaves → shop's profile automatically drops those capabilities (unless other techs cover them)
- Platform advertises the shop's CURRENT capabilities based on actual staff — always honest

**Revenue potential**:
- Hiring fees / recruiter commission for successful placements
- Premium job listing visibility
- *(Need to explore: is this a standalone feature or integrated into the shop owner's dashboard?)*

### 13. Shop Trust & Reputation System
[DEEP] — "BBB meets Yellow Pages meets Google Places" for electronics repair.

#### The BBB Layer — Accreditation & Trust Score

- **Platform accreditation** — shops earn a RepairYour.Tech trust badge by meeting standards:
  - Active certification(s) for at least one device category
  - Minimum customer rating threshold
  - Dispute resolution responsiveness
  - Platform TOS compliance (including DeviceCarFax participation)
- **Trust score** — calculated from multiple signals:
  - Customer reviews and ratings
  - Certification levels and breadth
  - Repair volume and success rate
  - Dispute resolution history
  - Platform tenure
- **Complaint system** — consumers can file formal complaints (BBB-style):
  - Shop must respond within a timeframe
  - Platform mediates if unresolved
  - Pattern of complaints affects trust score
  - Severe/repeated violations → shop can lose accreditation
- **Platform coverage tiers** — accredited shops may qualify for:
  - Platform-backed repair warranty (if shop agrees to terms)
  - Priority listing in search results
  - "RepairYour.Tech Certified" badge on their profile

#### The Yellow Pages Layer — Categorized Directory

- **Business profiles** — complete shop listing:
  - Name, address, hours, contact info, photos
  - Device categories and certification levels (auto-populated from tech certifications)
  - Services offered, specialties
  - Accepted payment methods
  - **Warranty information** — shops can advertise their own warranties (RYT does NOT provide warranties)
- **Category browsing** — browse shops by device type, repair type, specialization
- **Business hours, holiday schedules**
- **Service area** — walk-in only? Mail-in? Mobile repair (they come to you)?

#### The Google Places Layer — Reviews, Maps & Discovery

- **Star ratings** — consumer rates the shop after each repair
- **Written reviews** — detailed feedback
- **Shop responses** — shops CAN respond to reviews publicly
- **Review moderation** — Community / Trust team moderates:
  - Fake reviews (both positive and negative) flagged and removed
  - Review bombing prevention
  - Shops can flag suspicious reviews for platform review
- **Photo uploads** — consumers can attach photos (before/after of repair)
- **Map integration** — "shops near me" with GPS, map view, distance filters
- **Search filters** — by device type, certification level, rating, distance, price range, services offered
- **Q&A section** — consumers can ask questions, shop can answer publicly

#### Dispute Resolution & Accountability

**Platform does NOT offer or sell device insurance.** Mediation is as far as it goes.

**The dispute flow**:
1. Consumer files complaint OR shop reports customer
2. Other party responds with their side + evidence (photos, diagnostic logs from software, device history)
3. Platform evaluates based on evidence from both sides

**If shop is found liable for damages**:
- Shop is held accountable for **remediation** (fix the damage, refund, etc.)
- If customer accepts the remediation → problem resolved, goes away
- If customer rejects remediation → platform evaluates WHY:
  - **Customer is unreasonable?** → Customer is warned. Repeat offenses → penalties up to removal from the platform.
  - **Shop not honoring its remediation?** → Shop is penalized. Repeat offenses → loss of accreditation → removal.

**Zero-tolerance fraud policy**:
- "That's not repairable, you need a new one" when it IS repairable = **GONE**
- Lying to customers about repair necessity or scope = immediate credibility damage, potential removal
- Scamming, price gouging, upselling unnecessary repairs with dishonest justification = zero tolerance

**Two-way accountability** — shops can report customers too:
- Abusive customers, false complaints, scam attempts
- Same evaluation process applies in reverse
- Both sides can face penalties up to platform removal if behavior is egregious enough

**No free passes for ANYONE** — the platform holds both shops AND consumers to a standard of honesty

**⚖️ Platform Liability Position**:
- **RYT is a FACILITATOR** — we are NOT the party responsible for repairs
- Like Yelp, like Stripe — you wouldn't hold them accountable for a shop's behavior or a client's behavior
- We CAN and WILL restrict platform usage and capabilities **without refunds** for shops that misbehave or abuse the system
- This is a terms-of-service enforcement action, not a warranty claim

**🔒 Data Ownership on Departure/Ban**:
- Shops that get too many bad reviews **cannot run away and hide** — they can leave or be banned, but:
  - **Ratings and reviews are OWNED BY THE PLATFORM** — they cannot be removed by the shop
  - Shop's historical record persists even after departure or ban
  - This prevents reputation laundering (leave, re-register, start clean)
- Consumers can see that a shop was previously on the platform and left/was removed

## Identified Personas (Preliminary)

| Persona | Description | Status |
|---------|-------------|--------|
| Consumer (Single) | Individual who owns electronics and needs repair | [PARTIAL] |
| Consumer (Family Manager) | Parent/family techy who manages devices for household + extended family | [PARTIAL] |
| Consumer (Family Member) | Family member whose devices are managed (kids, elderly parents, etc.) | [SURFACE] |
| Consumer (Buyer) | Person using DeviceCarFax to check device history before buying used | [SURFACE] |
| Repair Technician | Shop employee who diagnoses and fixes devices | [PARTIAL] |
| Certified Repair Technician | Verified high-skill tech who opts in to contribute repair data | [SURFACE] |
| Shop Owner / Manager | Runs the repair business, manages staff and finances | [PARTIAL] |
| Platform Staff (multiple roles) | Super Admin, Content, Support, Partners, Finance, Trust, Blacklist, DevOps | [DEEP] |
| School IT Admin | Manages student/staff devices at institutional level | [SURFACE] |
| Business IT Admin | Manages company device fleet | [SURFACE] |
| Government IT Admin | Manages municipal/state device fleet — police, fire, city hall, courts, libraries | [SURFACE] |
| Parts Supplier | Companies like MobileSentrix / Injured Gadgets providing parts catalog via API | [DEEP] |
| Data Provider | Organizations like iFixit contributing repair guides and data | [DEEP] |
| Job-Seeking Tech | Certified tech looking for hire, advertising availability via platform resume | [SURFACE] |
| Franchise Owner | Multi-location shop owner managing multiple licenses under one account | [SURFACE] |

---

## Cross-cutting Candidates

*(Maintained throughout ideation. Never cleared — this is the audit trail.)*

- [Consumer Platform] × [Shop Software]: How does repair status flow from shop to consumer in real time?
- [AI Diagnostic] × [Shop Software]: How does the AI integrate into the ticket workflow?
- [Data Architecture] × [Consumer Platform]: How does global data sync with what the consumer sees?
- [User Onboarding] × [Shop Software]: What does "invisible onboarding" look like from the shop's perspective?
- [Data Architecture] × [Shop Software]: How does shop-local data reconcile with global platform data?
- [Consumer Platform] × [Data Architecture]: How are device credentials encrypted and access-controlled for authorized shop viewing?
- [Consumer Platform] × [Shop Software]: How does the repair history privacy/sanitization model work technically?
- [Payments] × [Shop Software]: How does Stripe Connect integrate with the shop POS experience?
- [Consumer Platform] × [Payments]: What does the consumer payment flow look like from their account?
- [DeviceCarFax] × [Shop Software]: How does ticket resolution automatically update the device's permanent record?
- [DeviceCarFax] × [Consumer Platform]: How does lost/stolen reporting work? Who can flag? Who can unflag?
- [DeviceCarFax] × [Payments]: Shop commission for facilitating private transactions
- [BYOK AI] × [AI Diagnostic]: How do user-provided API keys integrate with the proprietary repair knowledge base?
- [BYOK AI] × [Data Architecture]: Where are user API keys stored? Encryption? Never logged?
- [Family Tier] × [Payments]: How do family accrued discounts work? Automatic? Per-device or per-account?
- [DeviceCarFax] × [User Onboarding]: Does device history make the platform "sticky" and drive adoption?
- [Shop Software] × [Inventory]: Parts purgatory → payment → permanent inventory subtraction → device history update (multi-system cascade)
- [Shop Software] × [Data Architecture]: Embedded SurrealDB sync with cloud SurrealDB — what syncs, what stays local?
- [Shop Software] × [Consumer Platform]: Tech requesting device credential access triggers consumer-side authorization flow
- [OpenBoardView] × [AI Diagnostic]: Can the AI reference schematics/board views during diagnostic conversation?
- [Shop Software Modes] × [Permissions]: Counter mode vs Tech mode vs Owner mode — RBAC within shop software
- [Supplier Accounts] × [Inventory]: Supplier catalogs integrated into shop inventory + AI recommendations
- [Supplier Accounts] × [AI Diagnostic]: AI recommends parts from specific suppliers with prices and quality tiers
- [Supplier Accounts] × [Payments]: Supplier order payments through Stripe Connect?
- [Data Providers] × [Content Management]: How does external data flow through the ingestion pipeline?
- [Passive Collection] × [Data Architecture]: What data is collected silently from repair tickets? How is quality scored?
- [Certified Techs] × [Content Management]: How does opted-in tech data get weighted and integrated?
- [Device Guardian] × [Content Management]: App blacklist maintenance — how is the list updated and distributed?
- [RBAC] × [All Surfaces]: Unified RBAC model across platform staff, family accounts, and shop software
- [Certification] × [Shop Software]: Tech's certification level determines what the shop's profile advertises
- [Certification] × [Hiring]: Tech joins/leaves a shop → shop's advertised capabilities dynamically update
- [Certification] × [Consumer Platform]: Consumer sees certification warnings for uncertified repairs
- [Certification] × [AI Diagnostic]: Can AI adapt its guidance based on the tech's certification level?
- [Certification] × [Content Management]: Certified tech contributions weighted by certification level?
- [Hiring] × [Payments]: Hiring fees / recruiter commission through Stripe Connect?

---

## Expansion Mode

- Type: full
- Targets: all domains
- Cross-cut Detection: always-on

---

## Decision Log

| # | Decision | Alternatives Considered | Rationale |
|---|----------|------------------------|-----------|
| 1 | Input classified as Verbal → Interview Mode | Extraction, Expansion | No file provided; idea described verbally in chat |
| 2 | Cloudflare Pages for web hosting | Vercel, Netlify, self-hosted | User decision — already chosen |
| 3 | Supabase for auth + account data + general DB | Firebase, Auth0 + separate DB | User decision — already chosen |
| 4 | SurrealDB 3.0 for AI repair data (vectors + graph) | PostgreSQL + pgvector, Neo4j | User decision — SurrealQL + vectors + graph ideal for repair knowledge |
| 5 | BuyVM slice for SurrealDB + potentially n8n | Cloud-hosted DB services | User decision — already provisioned |
| 6 | Stripe Connect for multi-vendor payments | Square, PayPal Commerce | User decision — marketplace model needed |
| 7 | Repair history shared across shops but shop identity anonymized | Full transparency, full isolation | User decision — balances tech needs vs competitive privacy |
| 8 | BYOK API keys for AI — platform does NOT handle inference costs | Platform-provided API, bundled pricing | User decision — protects margins + data ownership claims |
| 9 | DeviceCarFax is non-negotiable TOS — all repair history permanent | Optional history, user-deletable | User decision — core platform value proposition |
| 10 | Family tier allows adding friends/extended family (with cap) | Household-only restriction | User decision — flexibility for real-world family dynamics |
| 11 | **No ghost/unclaimed shop profiles** — shops must claim and pay to be publicly listed | Yelp-style unclaimed listings | User decision — platform shouldn't give shops free business |
| 12 | Shop Owner mode has utmost control over all other roles | Flat permissions | User decision — owner is the admin in multi-person shops |
| 13 | **Offline fallback mode** — shop software MUST work without internet (cash POS, tickets, inventory, resync on reconnect) | Cloud-only, no offline | User decision — real-world need, shops lose internet for days |
| 14 | **Mandatory RYT watermark** on all customer-facing surfaces — shops can't fully remove it | Optional branding, full white-label | User decision — anti-fraud + trust verification + prevents removed shops from lying |
| 15 | **Cross-location inventory**: visible + requestable, NOT auto-deductible | Fully shared pool, no sharing | User decision — physical logistics make auto-deduct impossible |
| 16 | **First responders get free personal accounts**; law/emergency/schools discounted; courts/city hall full price | Uniform government pricing | User decision — support public servants without giving free rides |
| 17 | **Certifications are individual-bound**, not shop-bound. Shop capabilities reflect current staff. | Shop-level certification only | User decision — honest, protects consumers from over-promising shops |
| 18 | **Non-blocking certification** — shops CAN do uncertified repairs, platform just won't advertise/vouch/cover them | Block uncertified repairs entirely | User decision — protects platform legally without hamstringing shops |
| 19 | **No device insurance** — platform mediates disputes but does NOT offer/sell insurance or financial protection | Platform-backed warranty fund, escrow | User decision — mediation is the ceiling, shops are held accountable for remediation |
| 20 | **Zero-tolerance fraud + two-way accountability** — shops AND consumers can be penalized/removed for dishonesty or abuse | One-sided consumer protection only | User decision — honesty is the platform standard for BOTH sides |
| 21 | **RYT is a facilitator**, not liable for repairs. Platform restricts/bans without refunds for TOS violations. | Platform takes liability for repairs | User decision — like Yelp/Stripe, the platform is not the repair provider |
| 22 | **Reviews/ratings are platform-owned** — shops cannot delete them on departure or ban. No reputation laundering. | User-deletable data | User decision — prevents shops from escaping bad track records |
| 23 | **Warranties are shop-offered** — shops can advertise their own warranties on the platform. RYT does NOT provide warranties. | Platform-backed warranties | User decision — consistent with facilitator position |
| 24 | **RYT champions Right to Repair** — RTR legislation database (wiki-style), manufacturer grading (A-F), public advocacy | Neutral / stay out of politics | User decision — core brand pillar, not optional. Celebrates Motorola-style companies, calls out anti-repair behavior |
| 25 | **No participation in Apple IRP or Samsung restrictive programs** — RYT certifications are independent, earned by skill | Join manufacturer programs for legitimacy | User decision — those programs are backhanded restrictions, RYT stays independent |
| 26 | **PII is deletable; device history is permanent.** On account deletion, PII removed but device records stay anonymized (tied to SN/IMEI, not person). Like CarFax. | Delete everything on request | User decision — legally defensible, future-proof, compliant with CCPA/state laws while preserving community data |
| 27 | **Passive data collection is TOS-agreed**, not opt-in. No PII in aggregated repair data. Directory listings are RYT property. Standard directory procedure. | Opt-in per shop | User decision — no personal data stored in aggregated data, transparent and respectful but not opt-in |
| 28 | **Shop customer databases are shop-owned** — RYT does not claim ownership of a shop's customer data | Platform owns all data | User decision — respects shop privacy, builds trust, shops won't fear data lock-in |
| 29 | **E2E encryption for sensitive credentials** — PIN codes, passcodes, unlock patterns stored with end-to-end encryption. Platform can NEVER see them, only user and authorized shop during active repair. | Server-side encryption (platform can access) | User decision — consistent with privacy-first stance, reduces liability |
| 30 | **Two-tier stolen reporting** — "Reported Stolen" (unverified, shop has discretion) vs "Verified Stolen" (police report on file, system blocks device processing). No police report = no system enforcement. | Single-tier self-report = full block | User decision — legally defensible, protects shops from false reports |
| 31 | **Parts quality auto-tracked from inventory** — zero extra data entry for techs. Every repair records OEM vs aftermarket vs refurb. Transparency drives shop reputation. | Manual parts entry at checkout | User decision — accountability through transparency, builds trust |
| 32 | **Shop staff safety first** — shops are NEVER required to hold a device or confront someone if they feel unsafe. Platform advisory explicitly states this. | Mandate holding per policy | User decision — no policy is worth someone's physical safety |
| 33 | **Supabase = ALL platform operational data. SurrealDB = AI knowledge/intelligence ONLY.** SurrealDB is NOT for platform ops (tickets, inventory, payments, etc.). It's exclusively the AI brain (repair guides, diagnostic graphs, vectors, GraphRAG). | Single database for everything | User decision — clean separation of concerns, each DB does what it's best at |
| 34 | **Dual-track diagnostic system** — Track 1: structured if/then/else workflows (no AI, works offline). Track 2: AI conversational assistant (GraphRAG + BYOK LLM, requires internet). Both work together. | AI-only diagnostics | User decision — structured workflows are the backbone, AI is the second brain |
| 35 | **Shop software has TWO embedded databases** — local Postgres-compatible DB for offline ops (schema-compatible with Supabase), embedded SurrealDB for local AI context only. | Single embedded DB | User decision — each DB serves a different purpose, clean separation |
| 36 | **Feedback loop for platform intelligence growth** — successful repairs auto-reinforce, techs submit feedback when system was close/wrong, staff + AI review new data before incorporating into knowledge base. | Static knowledge base | User decision — platform gets smarter over time without manual curation |
| 37 | **Board viewer: full Rust port of OBV** with FlexBV5-level features + unique RYT additions (trace/inner-layer tracing, AI integration, ticket-bound annotations). BYOF policy — tool provided, files are not. Test corpus available for all 14+ formats. | FFI wrapping C++ OBV | User decision — pure Rust, no C++ dependency, full control, memory safe |
| 38 | **Three-tier AI access** — Consumer (self-help funnel, links to guides, funnels to support pros/shops), Support Pro (support-focused, user manuals/troubleshooting, no repair data), Shop/Tech (full professional diagnostic with board viewer + inventory). Each tier has different knowledge base access. | Single AI for everyone | User decision — each user type gets exactly what they need, nothing more |
| 39 | **AI cost model** — Free consumers = BYOK with guided Gemini key setup (zero cost to RYT). Premium consumers = monthly AI quota included in subscription (upgrade selling point). Support pros and shops = BYOK mandatory (business expense). | RYT subsidizes all AI | User decision — protects margins while making premium subscriptions more valuable |
| 40 | **Consumer app: native, Android-first launch** — both iOS and Android built, but iOS won't be officially supported at launch (no test device, no Apple Developer account yet). | PWA or web-only | User decision — native for best UX, Android first for practical reasons |
| 41 | **Support pro hybrid tier pricing** — RYT defines tiers with price ranges, support pros set their own price within each tier. Stripe Connect for payment. | Fixed pricing or free-form | User decision — gives structure while allowing market flexibility |
| 42 | **Support sessions use external tools** — Google Meet for screen share, LogMeIn for remote support, etc. RYT handles booking, payment, and chat only. | Build/embed video into platform | User decision — eliminates massive compute cost |
| 43 | **Session flow: browse + auto-match + shop referral** — three entry paths. On-demand + scheduled. Consumers save favorite support pros to profile. | Single match algorithm | User decision — maximum flexibility for consumers |
| 44 | **Support pro onboarding: application + expertise + competency test + RYT staff interview** — gated with quality enforcement (downgrade tiers or disqualify for bad track record). | Open signup | User decision — quality over quantity |
| 45 | **Scope boundaries: trifecta relationship model** — first-time referrals require shop acceptance, established relationships flow freely. Absolute data wall — support pros see zero shop data. | Open access | User decision — trust builds over time |
| 46 | **Platform-wide CMS principle** — all taxonomy/categories (device types, repair categories, support specialties) are admin-managed via UI, not hardcoded. | Hardcoded categories | User decision — extensible without code changes |
| 47 | **Support pros free to join** — no subscription fee. RYT earns from per-session application fee only. Optional paid tier later only if high-value features are added that cost RYT money. | Subscription required | User decision — low barrier = fast supply growth |
| 48 | **Supplier hybrid pricing** — base API access fee (monthly/annual) + transaction commission on orders placed through the platform. Premium placement optional add-on. | Flat fee or transaction-only | User decision — dual revenue stream from suppliers |
| 49 | **Suppliers are vetted/curated** — RYT vets suppliers before they can list. Quality check on product quality, fulfillment, returns, reputation. | Open signup | User decision — shop trust protection |
| 50 | **RYT provides API, suppliers build their integration** — RYT defines standardized catalog schema and endpoints. Suppliers use their own developers to build their connection. | RYT builds integrations | User decision — scalable, suppliers responsible for their own dev |
| 51 | **Order fulfillment: Stripe Connect pass-through** — payment captured by RYT (Stripe Connect), order transmitted to supplier via API, supplier ships direct. Same Stripe pattern across all platform payments. | Redirect to supplier payment | Architecture decision — industry standard |
| 52 | **Order tracking in-platform, disputes to supplier** — suppliers push tracking back via API, shops see status in RYT. Delivery acceptance auto-adds to inventory. Disputes/returns go directly to supplier. | Full mediation or no tracking | User decision — UX value without liability |
| 53 | **Supplier experience: API + Dashboard** — API for catalog/orders/tracking (machines), dashboard for analytics/billing/relationships (humans). Clean separation of concerns. | API-only or dashboard-only | User decision — best of both worlds |

---

## Open Questions

### Web Platform / Consumer
1. ~~What are the Family tier benefits?~~ → ANSWERED: Multi-manager authorization, accrued discounts, friends & extended family, member cap
2. ~~Are there tiers beyond Single and Family?~~ → ANSWERED: Premium Single, Premium Family, School (B2B), Business (B2B)
3. ~~What does the device profile form capture?~~ → ANSWERED: Deep per-device-type fields, consumer-facing fields separated
4. How does credential authorization work? Does the consumer grant access per-repair or per-shop-relationship? Is it time-limited? One-click revoke?
5. Shop directory — what filtering/search is available? Geographic radius? Ratings/reviews? Device specialization? Verified badges?
6. What is the platform's fee/commission model on Stripe payments?
7. How are refunds and payment disputes handled?
8. What are the platform staff roles beyond "admin"? (Content, support, partners, finance, dev?)
9. How many free DeviceCarFax searches per month for free-tier users?
10. What does the lost/stolen flagging workflow look like? Can only the owner flag? What proof is required?
11. Private transaction facilitation — flat commission or percentage? Points vs money?
12. What features are gated behind Premium tiers specifically?
13. What does "advanced AI tech support" look like as a paid feature? Live chat with AI? Guided diagnostics? Video call with AI overlay?

### AI / BYOK
14. How does BYOK integrate with the proprietary repair knowledge? Does the user's API key call our RAG system which then calls the LLM? Or direct LLM access?
15. What happens if a user doesn't have an API key and doesn't want to pay for live support? Is there a basic tier of self-help?

---

## Feature Inventory (MoSCoW)

*(To be populated in /ideate-discover)*
