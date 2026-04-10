---
name: playwright
description: "Comprehensive Playwright E2E testing guide covering configuration, test patterns, locator strategies, network mocking, authentication, visual regression, debugging, and CI/CD integration. Use when writing end-to-end tests, setting up Playwright projects, or debugging test failures."
version: 1.0.0
---

# Playwright E2E Testing

## 1. Configuration

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',

  // Run all tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests (more retries on CI)
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI to avoid resource contention
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  // Shared settings for all projects
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',        // Capture trace on retry
    screenshot: 'only-on-failure',   // Screenshot on failure
    video: 'retain-on-failure',      // Video on failure
    actionTimeout: 10_000,           // Timeout for each action (click, fill, etc.)
    navigationTimeout: 30_000,       // Timeout for page.goto
  },

  // Test projects (browsers and devices)
  projects: [
    // Desktop browsers
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },

    // Mobile viewports
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },

    // Authenticated tests (uses stored auth state)
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Dev server (start before tests if not running)
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

---

## 2. Test Structure and Patterns

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test('should create a new account with valid data', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('SecureP@ss123');
    await page.getByLabel('Confirm password').fill('SecureP@ss123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('SecureP@ss123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
    await expect(page).toHaveURL('/register'); // stays on the same page
  });
});
```

### Page Object Model

Encapsulate page interactions for reuse and maintainability.

```typescript
// tests/e2e/pages/login-page.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}

// Usage in tests
import { LoginPage } from './pages/login-page';

test('should login with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await loginPage.expectRedirectToDashboard();
});
```

### Fixtures

Custom fixtures provide reusable setup for multiple tests.

```typescript
// tests/e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';

type AppFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: DashboardPage;
};

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  authenticatedPage: async ({ page }, use) => {
    // Login before providing the fixture
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'password123');
    const dashboard = new DashboardPage(page);
    await use(dashboard);
  },
});

export { expect };
```

### Parameterized Tests

```typescript
const testCases = [
  { role: 'admin', expectNav: ['Dashboard', 'Users', 'Settings'] },
  { role: 'user', expectNav: ['Dashboard', 'Profile'] },
  { role: 'viewer', expectNav: ['Dashboard'] },
];

for (const { role, expectNav } of testCases) {
  test(`${role} should see correct navigation items`, async ({ page }) => {
    await loginAs(page, role);
    for (const item of expectNav) {
      await expect(page.getByRole('link', { name: item })).toBeVisible();
    }
  });
}
```

---

## 3. Locator Strategies

### Priority Order (Most to Least Preferred)

```typescript
// 1. Role-based (best: semantic, resilient, accessible)
page.getByRole('button', { name: 'Submit' });
page.getByRole('heading', { name: 'Dashboard', level: 1 });
page.getByRole('link', { name: 'Settings' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('checkbox', { name: 'Accept terms' });
page.getByRole('combobox', { name: 'Country' });
page.getByRole('navigation');
page.getByRole('dialog');

// 2. Label-based (great for form fields)
page.getByLabel('Email address');
page.getByLabel('Password');

// 3. Placeholder-based (acceptable for inputs without labels)
page.getByPlaceholder('Search...');

// 4. Text-based (good for static content)
page.getByText('Welcome back');
page.getByText(/total: \$[\d.]+/i);  // regex for dynamic content

// 5. Test ID (fallback when semantic locators are impossible)
page.getByTestId('user-avatar');
page.getByTestId('chart-container');

// 6. CSS selector (last resort)
page.locator('.custom-widget >> .inner-element');

// AVOID: fragile selectors
page.locator('#app > div:nth-child(3) > button');  // Breaks on any DOM change
page.locator('.btn-primary');                        // Class names change
```

### Filtering and Chaining

```typescript
// Filter within a section
const productCard = page.getByRole('article').filter({ hasText: 'Widget Pro' });
await productCard.getByRole('button', { name: 'Add to cart' }).click();

// Find nth match
await page.getByRole('listitem').nth(2).click();

// Filter by child element
const row = page.getByRole('row').filter({
  has: page.getByRole('cell', { name: 'alice@example.com' }),
});
await row.getByRole('button', { name: 'Edit' }).click();
```

---

## 4. Assertions

### Common Assertions

```typescript
// Visibility
await expect(page.getByText('Success')).toBeVisible();
await expect(page.getByText('Error')).not.toBeVisible();
await expect(page.getByRole('dialog')).toBeHidden();

// Text content
await expect(page.getByRole('heading')).toHaveText('Dashboard');
await expect(page.getByRole('heading')).toContainText('Dash');

// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/dashboard\?.*/);

// Input values
await expect(page.getByLabel('Email')).toHaveValue('user@example.com');
await expect(page.getByLabel('Email')).toBeEmpty();

// Attributes
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();
await expect(page.getByRole('checkbox')).toBeChecked();
await expect(page.getByRole('link')).toHaveAttribute('href', '/settings');

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);

// CSS
await expect(page.getByTestId('status')).toHaveCSS('color', 'rgb(255, 0, 0)');

// Page title
await expect(page).toHaveTitle('Dashboard | My App');
```

### Soft Assertions

Soft assertions do not stop the test on failure. All failures are reported at the end.

```typescript
test('dashboard displays all widgets', async ({ page }) => {
  await page.goto('/dashboard');

  // Continue checking even if one fails
  await expect.soft(page.getByTestId('revenue-widget')).toBeVisible();
  await expect.soft(page.getByTestId('users-widget')).toBeVisible();
  await expect.soft(page.getByTestId('orders-widget')).toBeVisible();
  await expect.soft(page.getByTestId('chart-widget')).toBeVisible();
});
```

---

## 5. Auto-Waiting

Playwright automatically waits for elements to be actionable before performing actions. You rarely need explicit waits.

```typescript
// Playwright auto-waits for:
// - Element to be attached to DOM
// - Element to be visible
// - Element to be stable (no animations)
// - Element to be enabled
// - Element to receive events
await page.getByRole('button', { name: 'Submit' }).click(); // waits automatically

// Wait for navigation
await page.goto('/dashboard');  // waits for load event

// Wait for a specific condition
await page.waitForURL('/dashboard');
await page.waitForResponse(resp => resp.url().includes('/api/data') && resp.status() === 200);

// Wait for element state
await page.getByRole('dialog').waitFor({ state: 'hidden' });

// ANTI-PATTERN: Hard waits -- never use these
await page.waitForTimeout(3000);  // BAD: arbitrary delay, flaky, slow
```

---

## 6. Network Mocking

```typescript
// Mock an API response
test('displays products from API', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: '1', name: 'Widget', price: 29.99 },
        { id: '2', name: 'Gadget', price: 49.99 },
      ]),
    });
  });

  await page.goto('/products');
  await expect(page.getByText('Widget')).toBeVisible();
  await expect(page.getByText('$29.99')).toBeVisible();
});

// Mock an error response
test('shows error state on API failure', async ({ page }) => {
  await page.route('**/api/products', (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal error' }) })
  );

  await page.goto('/products');
  await expect(page.getByText('Failed to load products')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

// Abort requests (e.g., block analytics)
test('page loads without analytics', async ({ page }) => {
  await page.route('**/analytics/**', (route) => route.abort());
  await page.goto('/dashboard');
});

// Modify a real response
test('inject extra data into API response', async ({ page }) => {
  await page.route('**/api/user', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.featureFlags = { newDashboard: true };
    await route.fulfill({ response, body: JSON.stringify(json) });
  });

  await page.goto('/dashboard');
});
```

---

## 7. Authentication Setup

### Global Setup with Storage State

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('e2e-user@example.com');
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for the redirect after login
  await page.waitForURL('/dashboard');

  // Save the authentication state (cookies, localStorage)
  await page.context().storageState({ path: authFile });
});

// In playwright.config.ts:
// projects: [
//   { name: 'setup', testMatch: /.*\.setup\.ts/ },
//   {
//     name: 'authenticated',
//     use: { storageState: authFile },
//     dependencies: ['setup'],
//   },
// ]
```

### Multiple Auth Roles

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('auth as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/admin');
  await page.context().storageState({ path: 'tests/e2e/.auth/admin.json' });
});

setup('auth as user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill(process.env.USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});

// In config: separate projects for admin vs user tests
// projects: [
//   { name: 'admin tests', use: { storageState: 'tests/e2e/.auth/admin.json' }, dependencies: ['setup'] },
//   { name: 'user tests', use: { storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['setup'] },
// ]
```

---

## 8. Visual Regression Testing

```typescript
test('homepage matches snapshot', async ({ page }) => {
  await page.goto('/');

  // Full page screenshot comparison
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference
  });

  // Component-level screenshot
  const hero = page.getByTestId('hero-section');
  await expect(hero).toHaveScreenshot('hero-section.png');
});

// Update snapshots: npx playwright test --update-snapshots
```

**Best practices**:
- Mask dynamic content (timestamps, avatars) with `mask: [page.getByTestId('timestamp')]`
- Use `maxDiffPixelRatio` to handle anti-aliasing differences across OS
- Run visual tests on a single OS/browser in CI for consistency
- Store snapshots in version control

---

## 9. Debugging

### Trace Viewer

```bash
# Run with trace recording
npx playwright test --trace on

# View trace after test failure
npx playwright show-trace test-results/test-name/trace.zip
```

### UI Mode (Interactive Debugging)

```bash
# Run in UI mode -- visual test runner with time travel
npx playwright test --ui
```

### Debug Mode

```bash
# Run with browser visible and Playwright Inspector
npx playwright test --debug

# Debug a specific test
npx playwright test tests/e2e/login.spec.ts --debug
```

### In-Test Debugging

```typescript
test('debug example', async ({ page }) => {
  await page.goto('/dashboard');

  // Pause execution and open inspector
  await page.pause();

  // Console output
  page.on('console', (msg) => console.log(`BROWSER: ${msg.text()}`));
});
```

---

## 10. CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: corepack enable pnpm && pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm exec playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

### Parallel Execution and Sharding

```bash
# Shard tests across CI machines
# Machine 1:
npx playwright test --shard=1/4
# Machine 2:
npx playwright test --shard=2/4
# Machine 3:
npx playwright test --shard=3/4
# Machine 4:
npx playwright test --shard=4/4
```

---

## 11. Common Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|-------------|---------------|-----------------|
| `page.waitForTimeout(3000)` | Arbitrary delay, flaky, slow | Use auto-waiting or `waitForURL`, `waitForResponse` |
| `page.locator('#root > div > div:nth-child(2) > button')` | Breaks on any DOM change | Use `getByRole`, `getByLabel`, `getByText` |
| Testing implementation details | Coupled to internal structure | Test user-visible behavior |
| Sharing state between tests | Order-dependent, flaky | Each test should set up its own state |
| Not cleaning up test data | Tests interfere with each other | Use API calls in `beforeEach`/`afterEach` to reset |
| Asserting too much in one test | Hard to debug failures | One logical assertion per test |
| Not using `expect` (just clicking and hoping) | Silent failures | Always assert expected outcomes |
| Mocking everything | Not testing real integration | Mock external services only, test your own stack |

---

## 12. Critical Reminders

### ALWAYS

- Use semantic locators (`getByRole`, `getByLabel`, `getByText`) as first choice
- Let Playwright auto-wait instead of adding explicit waits
- Use `storageState` for authentication (login once, reuse across tests)
- Run tests in CI on every PR
- Save traces, screenshots, and videos on failure
- Use `test.describe` to group related tests
- Add `--forbid-only` in CI to prevent `test.only` from being committed

### NEVER

- Use `page.waitForTimeout()` (hard waits cause flakiness)
- Use CSS class selectors as primary locators (they change with styling)
- Share mutable state between test files
- Skip error state testing (always test what happens when things fail)
- Run visual regression tests across different operating systems without masking
- Commit `.auth/` storage state files (add to `.gitignore`)
