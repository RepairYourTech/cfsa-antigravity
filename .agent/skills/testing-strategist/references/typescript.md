# TypeScript Testing Patterns

Language-specific patterns for the `testing-strategist` skill. Read `SKILL.md` first for universal methodology.

---

## Framework Stack

| Level | Tool | Purpose |
|-------|------|---------|
| Unit | **Jest** or **Vitest** | Test runner, assertions, mocking |
| Component | **React Testing Library** | User-centric component testing |
| Integration | **Supertest** | HTTP API testing |
| E2E | **Playwright** | Browser automation |

## Commands

```bash
npm test                    # Run tests
npm test -- --watch         # Watch mode
npm run test:coverage       # Coverage report
npx playwright test         # E2E tests
open coverage/lcov-report/index.html  # View HTML report
```

---

## Unit Test: Business Logic

```typescript
// src/lib/pricing.ts
export function calculateTotal(items: { price: number; quantity: number }[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function applyDiscount(total: number, discountPercent: number) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Invalid discount percentage')
  }
  return total * (1 - discountPercent / 100)
}

// src/lib/pricing.test.ts
import { calculateTotal, applyDiscount } from './pricing'

describe('calculateTotal', () => {
  it('calculates total for single item', () => {
    const items = [{ price: 10, quantity: 2 }]
    expect(calculateTotal(items)).toBe(20)
  })

  it('calculates total for multiple items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 }
    ]
    expect(calculateTotal(items)).toBe(35)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0)
  })
})

describe('applyDiscount', () => {
  it('applies discount correctly', () => {
    expect(applyDiscount(100, 20)).toBe(80)
  })

  it('throws error for invalid discount', () => {
    expect(() => applyDiscount(100, -10)).toThrow('Invalid discount')
    expect(() => applyDiscount(100, 150)).toThrow('Invalid discount')
  })
})
```

## Unit Test: React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-primary')
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## Unit Test: Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter())
    act(() => { result.current.increment() })
    expect(result.current.count).toBe(1)
  })

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    act(() => {
      result.current.increment()
      result.current.reset()
    })
    expect(result.current.count).toBe(10)
  })
})
```

---

## Integration Test: API Routes

```typescript
import { testClient } from '@/lib/test-utils'

describe('POST /api/posts', () => {
  beforeEach(async () => {
    await db.post.deleteMany()
  })

  it('creates a new post', async () => {
    const response = await testClient
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test Post', content: 'This is a test post' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      title: 'Test Post',
      content: 'This is a test post'
    })

    // Verify in database
    const posts = await db.post.findMany()
    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('Test Post')
  })

  it('returns 400 for invalid data', async () => {
    const response = await testClient
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: '' })

    expect(response.status).toBe(400)
    expect(response.body.errors).toBeDefined()
  })

  it('returns 401 for unauthenticated request', async () => {
    const response = await testClient.post('/api/posts')
      .send({ title: 'Test', content: 'Test' })

    expect(response.status).toBe(401)
  })
})
```

## Integration Test: Database Operations

```typescript
describe('userRepository', () => {
  beforeEach(async () => { await db.user.deleteMany() })
  afterAll(async () => { await db.$disconnect() })

  describe('createUser', () => {
    it('creates user with hashed password', async () => {
      const user = await createUser({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(user.email).toBe('test@example.com')
      expect(user.password).not.toBe('password123')
      expect(user.password).toMatch(/^\$2[aby]/) // bcrypt hash
    })

    it('throws error for duplicate email', async () => {
      await createUser({ email: 'test@example.com', password: 'pass' })
      await expect(createUser({ email: 'test@example.com', password: 'pass' }))
        .rejects.toThrow()
    })
  })
})
```

---

## E2E Test: Playwright

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign up and log in', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'SecurePass123!')
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Welcome')
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials')
    await expect(page).toHaveURL('/login')
  })
})
```

---

## Mocking

```typescript
// Mock external API
import { fetchUserData } from '@/lib/api'

jest.mock('@/lib/api')
const mockFetchUserData = fetchUserData as jest.MockedFunction<typeof fetchUserData>

it('displays user data', async () => {
  mockFetchUserData.mockResolvedValue({
    id: '1', name: 'John Doe', email: 'john@example.com'
  })

  render(<UserProfile userId="1" />)

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})

// Mock Date
beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2024-01-01'))
})
afterAll(() => { jest.useRealTimers() })

// Mock Math.random
const mockRandom = jest.spyOn(Math, 'random')
mockRandom.mockReturnValue(0.5)
// ... assertions ...
mockRandom.mockRestore()
```

---

## Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/types/**'
  ],
  coverageThresholds: {
    global: {
      branches: 70, functions: 70, lines: 70, statements: 70
    },
    './src/lib/auth/**': {
      branches: 90, functions: 90, lines: 90
    }
  }
}
```

## CI/CD

```yaml
- name: Run Tests
  run: npm test -- --coverage
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Assertion Examples

### ❌ Shallow (BANNED)
```typescript
expect(result).toBeDefined()
expect(result).toBeTruthy()
```

### ✅ Deep (REQUIRED)
```typescript
expect(result).toEqual({
  id: expect.any(String),
  name: 'Test',
  items: expect.arrayContaining([
    expect.objectContaining({ amount: 100 })
  ])
})
```
