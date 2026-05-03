---
name: app-store-submission
description: App store submission checklist covering Apple App Store and Google Play requirements, review guidelines, privacy labels, age ratings, staged rollouts, and common rejection reasons. Use when preparing a mobile app for store submission or updating an existing listing.
version: 1.0.0
---

# App Store Submission

Prepare mobile applications for successful submission to the Apple App Store and Google Play Store.

## Screenshot Requirements

### Apple App Store

| Device | Size (pixels) | Required |
|--------|--------------|----------|
| iPhone 6.9" (16 Pro Max) | 1320 x 2868 | Yes (covers 6.5" too) |
| iPhone 6.7" (15 Plus/Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1284 x 2778 | Yes |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Only if supporting older devices |
| iPad Pro 12.9" (6th gen) | 2048 x 2732 | Yes (if universal app) |
| iPad Pro 13" (M4) | 2064 x 2752 | Yes (if universal app) |

- **Count**: 1-10 screenshots per localization
- **Format**: PNG or JPEG, no alpha channel
- **Content rules**: Screenshots must reflect actual app experience. No misleading imagery. App Store Review Guideline 2.3.
- **Video previews**: 15-30 seconds, app-captured footage, no device frames in video itself.

### Google Play Store

| Asset | Size | Required |
|-------|------|----------|
| Phone screenshots | 16:9 or 9:16, min 320px, max 3840px | 2-8 required |
| 7" tablet screenshots | Same ratios | Required if targeting tablets |
| 10" tablet screenshots | Same ratios | Required if targeting tablets |
| Feature graphic | 1024 x 500 | Required |
| Icon | 512 x 512, 32-bit PNG | Required |

**Tip**: Use a single set of master screenshots at the highest resolution and crop/resize per target. Tools like `fastlane snapshot` (iOS) and `fastlane screengrab` (Android) automate capture.

## App Store Review Guidelines Compliance (Apple)

### Most Common Rejection Categories

| Guideline | Section | What It Means |
|-----------|---------|--------------|
| **Performance: App Completeness** | 2.1 | No placeholder content, broken links, or lorem ipsum |
| **Performance: Bugs** | 2.1 | App must not crash. Test on oldest supported OS version |
| **Design: Minimum Functionality** | 4.2 | App must offer sufficient functionality beyond a website |
| **Design: Spam** | 4.3 | No duplicate apps, template apps without substantial changes |
| **Legal: Privacy** | 5.1 | Privacy policy URL required. Data collection must match privacy labels |
| **Business: Payments** | 3.1.1 | Digital goods MUST use In-App Purchase. Physical goods MAY use external payment |
| **Safety: User-Generated Content** | 1.2 | Must have reporting, blocking, content filtering, and moderation |
| **Safety: Kids Category** | 1.3 | No third-party analytics, no ads (or certified COPPA-compliant ads) |

### Pre-Submission Checklist for Apple

```
- [ ] App launches without crash on all supported devices and OS versions
- [ ] No placeholder/test content in any screen
- [ ] Privacy policy URL in App Store Connect and in-app settings
- [ ] All claimed features actually work (reviewers test everything)
- [ ] Login credentials provided in review notes (demo account)
- [ ] Sign in with Apple offered if any third-party login exists
- [ ] IPv6-only network compatibility (Apple tests on IPv6)
- [ ] No references to other platforms ("also on Android")
- [ ] IDFA usage declared if using AdSupport framework
- [ ] Push notification entitlement only if actually using push
```

## Privacy Nutrition Labels (iOS) / Data Safety (Android)

### Apple Privacy Labels

You must declare what data you collect, how it is used, and whether it is linked to the user's identity.

| Category | Examples |
|----------|---------|
| **Data Used to Track You** | Advertising ID, email used for cross-app tracking |
| **Data Linked to You** | Name, email, phone (tied to identity) |
| **Data Not Linked to You** | Crash logs, anonymized analytics |
| **Data Not Collected** | Must be genuinely not collected, including by SDKs |

```
Categories to audit:
- Contact Info (name, email, phone, address)
- Health & Fitness
- Financial Info
- Location (coarse vs precise)
- Sensitive Info
- Contacts (address book)
- User Content (photos, files, messages)
- Browsing/Search History
- Identifiers (user ID, device ID)
- Usage Data (interaction data, ads data)
- Diagnostics (crash data, performance data)
```

**Rule**: Every SDK you include (analytics, crash reporting, ads) adds to your privacy labels. Audit `Podfile.lock` and `package.json` for data collection by dependencies.

### Google Data Safety

Google requires a Data Safety section in Play Console covering:

| Question | What to Declare |
|----------|----------------|
| Does your app collect data? | Yes/No per data type |
| Is data shared with third parties? | Yes/No per data type |
| Is data encrypted in transit? | Must be Yes (HTTPS) |
| Can users request data deletion? | Must provide mechanism |
| Committed to Play Families policy? | Required for kids apps |

## Age Rating Questionnaires

### Apple (App Store)

Complete the age rating questionnaire in App Store Connect. Ratings are based on content:

| Content | None | Infrequent/Mild | Frequent/Intense |
|---------|------|-----------------|------------------|
| Violence (cartoon/realistic) | 4+ | 9+ / 12+ | 17+ |
| Profanity | 4+ | 12+ | 17+ |
| Sexual content | 4+ | 12+ | 17+ |
| Gambling (simulated/real) | 4+ | 12+ | 17+ |
| Drugs/alcohol/tobacco | 4+ | 12+ | 17+ |
| Horror/fear | 4+ | 9+ | 17+ |
| User-generated content | 17+ unless moderated | - | - |

### Google (Play Store)

Uses the IARC rating system. Complete the questionnaire in Play Console.

| IARC Rating | Age | Comparable To |
|-------------|-----|---------------|
| IARC 3+ | 3+ | ESRB Everyone |
| IARC 7+ | 7+ | ESRB Everyone 10+ |
| IARC 12+ | 12+ | ESRB Teen |
| IARC 16+ | 16+ | ESRB Mature |
| IARC 18+ | 18+ | ESRB Adults Only |

**Rule**: AI-generated content apps must account for the full range of possible outputs when rating. If AI can produce mature content, the app is rated accordingly even with filters.

## In-App Purchase Review Rules

| Rule | Apple | Google |
|------|-------|--------|
| Digital goods | Must use IAP | Must use Play Billing |
| Physical goods / services | External payment OK | External payment OK |
| Subscriptions | StoreKit 2 / original API | Play Billing Library |
| Restore purchases | Required | Required |
| Free trial | Must clearly state duration and price after | Must clearly state |
| Consumables | Must be delivered immediately | Must be acknowledged within 3 days |
| Price display | Must show localized price from StoreKit | Must show localized price from BillingClient |

```typescript
// React Native IAP - Purchase validation (server-side)
import { validateReceiptIos, validateReceiptAndroid } from 'react-native-iap';

// NEVER validate receipts on-device only -- send to your server
async function validatePurchase(
  platform: 'ios' | 'android',
  receipt: string
): Promise<PurchaseValidation> {
  const response = await fetch('/api/purchases/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, receipt }),
  });

  return response.json();
}
```

**Anti-pattern**: Validating receipts client-side only. Receipts must be verified server-side to prevent fraud.

## TestFlight / Internal Testing Tracks

### Apple TestFlight

| Track | Limit | Review Required | Duration |
|-------|-------|-----------------|----------|
| Internal (team) | 100 testers | No | 90 days per build |
| External (public link) | 10,000 testers | Yes (first build) | 90 days per build |

### Google Play Internal Testing

| Track | Limit | Review Required | Duration |
|-------|-------|-----------------|----------|
| Internal testing | 100 testers | No | No limit |
| Closed testing | Unlimited (by email list) | Yes (faster review) | No limit |
| Open testing | Unlimited (public opt-in) | Yes | No limit |

**Rule**: Always test on the Internal track before promoting to closed/open/production. Internal track has no review delay.

## Staged Rollouts

| Platform | Feature | How It Works |
|----------|---------|-------------|
| Apple | Phased release | 1%, 2%, 5%, 10%, 20%, 50%, 100% over 7 days (automatic unless paused) |
| Google | Staged rollout | Custom percentage (e.g., 5%, 25%, 50%, 100%), manual promotion |

```bash
# Fastlane - Staged rollout to Google Play
fastlane supply --track production --rollout 0.1  # 10% rollout

# Promote after monitoring crash-free rate
fastlane supply --track production --rollout 1.0  # 100%
```

**Rule**: Monitor crash-free rate during staged rollout. Halt rollout if crash-free rate drops below 99.5%.

## Crash-Free Rate Thresholds

| Metric | Target | Action if Below |
|--------|--------|----------------|
| Crash-free users | > 99.5% | Halt rollout, investigate top crash |
| Crash-free sessions | > 99.9% | Monitor closely |
| ANR rate (Android) | < 0.47% | Google will flag your app |
| Disk writes (iOS) | < 73.1 MB/day (90th percentile) | Apple may reject updates |
| Launch time | < 2s (cold start) | Optimize startup |

## Common Rejection Reasons and Fixes

| Rejection | Fix |
|-----------|-----|
| "Your app crashed during review" | Test on physical device matching reviewer's device. Provide demo account in review notes. |
| "Your app uses a login but does not offer Sign in with Apple" | Add Sign in with Apple as an option alongside other social logins. |
| "We noticed your app includes placeholder content" | Remove all lorem ipsum, test data, and TODO comments from UI. |
| "Your app's privacy policy is not accessible" | Ensure privacy policy URL works and is linked in both App Store Connect and in-app settings. |
| "Your app's In-App Purchase products are not available" | Ensure IAP products are in "Ready to Submit" state in App Store Connect and agreements are signed. |
| "Guideline 4.2 - Minimum Functionality" | App must provide value beyond what a mobile website could offer. Add native features. |
| "Guideline 2.1 - Performance: App Completeness" | All features claimed in metadata must work. Remove or hide incomplete features. |
| "Guideline 5.1.1 - Data Collection and Storage" | Privacy labels must accurately reflect all data collected, including by third-party SDKs. |

## App Store Optimization (ASO) Basics

| Element | Apple | Google | Best Practice |
|---------|-------|--------|---------------|
| App name | 30 chars | 30 chars | Brand + primary keyword |
| Subtitle | 30 chars | N/A | Secondary keyword phrase |
| Short description | N/A | 80 chars | Call-to-action with keywords |
| Keywords field | 100 chars (comma-separated) | N/A | No spaces after commas, no duplicates of title words |
| Description | 4000 chars | 4000 chars | Keywords in first 3 lines. Google indexes full text; Apple does not |
| Category | Primary + secondary | Primary + secondary | Match user search intent |
| Ratings & reviews | Critical for ranking | Critical for ranking | Prompt for review after positive moments (SKStoreReviewController / in-app review API) |

```typescript
// In-app review prompt (do NOT override or customize the system dialog)
import InAppReview from 'react-native-in-app-review';

async function requestReviewIfAppropriate() {
  // Only prompt after the user has experienced value
  const isAvailable = InAppReview.isAvailable();
  if (isAvailable) {
    await InAppReview.RequestInAppReview();
  }
}
```

**Rule**: Apple limits review prompts to 3 per 365 days. Do not call `requestReview()` after negative experiences (errors, cancellations).

## CI/CD Automation

```bash
# Fastlane - Full submission pipeline
# iOS
fastlane ios beta   # Build + upload to TestFlight
fastlane ios release # Build + submit for review

# Android
fastlane android beta   # Build + upload to internal track
fastlane android release # Build + upload to production (staged rollout)
```

```ruby
# Fastlane - Example iOS lane
lane :release do
  increment_build_number
  build_app(scheme: "MyApp", export_method: "app-store")
  upload_to_app_store(
    skip_metadata: false,
    skip_screenshots: false,
    submit_for_review: true,
    automatic_release: false, # Manual release after approval
    phased_release: true      # 7-day staged rollout
  )
end
```

## Output Checklist

- [ ] Screenshots captured for all required device sizes
- [ ] App tested on oldest supported OS version and physical device
- [ ] Privacy labels / data safety declaration completed and accurate
- [ ] Age rating questionnaire completed
- [ ] Demo account credentials provided in review notes
- [ ] Sign in with Apple implemented (if any social login exists)
- [ ] In-app purchases tested and in "Ready to Submit" state
- [ ] No placeholder content, broken links, or test data in app
- [ ] Privacy policy URL accessible in-app and in store listing
- [ ] Internal testing track validated before production submission
- [ ] Staged rollout configured (not 100% on day one)
- [ ] Crash monitoring active before and during rollout
- [ ] CI/CD pipeline automates build, upload, and submission
