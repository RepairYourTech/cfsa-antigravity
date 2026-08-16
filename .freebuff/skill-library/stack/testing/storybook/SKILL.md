---
name: storybook
description: "Comprehensive Storybook component development guide covering Component Story Format (CSF3), args and argTypes, decorators, play functions for interaction testing, visual regression testing with Chromatic, auto-docs, MDX documentation, addons (a11y, viewport, controls, actions), composition, design systems, testing with @storybook/test, portable stories, MSW integration, CI pipeline, and performance optimization. Use when building component libraries, design systems, or interactive documentation."
version: 1.0.0
---

# Storybook Component Development

## 1. Component Story Format (CSF3)

### Basic Story

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary action',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: 'Disabled',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Submitting...',
    loading: true,
  },
};
```

### Args and ArgTypes

```typescript
const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    // Control type override
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'Visual style of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    // Color picker
    backgroundColor: {
      control: 'color',
    },
    // Range slider
    borderRadius: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
    },
    // Disable a control
    children: {
      control: false,
    },
    // Action logging
    onClick: {
      action: 'clicked',
      description: 'Callback when button is clicked',
    },
  },
  args: {
    // Default args for all stories in this file
    variant: 'primary',
    size: 'md',
    children: 'Button',
  },
} satisfies Meta<typeof Button>;
```

---

## 2. Decorators

### Layout and Provider Decorators

```typescript
// .storybook/preview.tsx
import type { Preview } from '@storybook/react';
import { ThemeProvider } from '../src/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../src/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
  },
});

const preview: Preview = {
  decorators: [
    // Theme provider wrapper
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
    // React Query provider
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
    // Layout wrapper
    (Story) => (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

### Per-Story Decorators

```typescript
export const InSidebar: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '250px', background: '#f5f5f5', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: 'Sidebar Item',
  },
};

// Router decorator for components that use routing
export const WithRouter: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
};
```

---

## 3. Play Functions (Interaction Testing)

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within, waitFor } from '@storybook/test';
import { LoginForm } from './LoginForm';

const meta = {
  title: 'Forms/LoginForm',
  component: LoginForm,
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FilledForm: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Type into form fields
    await user.type(canvas.getByLabelText('Email'), 'user@example.com');
    await user.type(canvas.getByLabelText('Password'), 'password123');

    // Click submit
    await user.click(canvas.getByRole('button', { name: 'Sign in' }));

    // Assert the callback was called
    await waitFor(() => {
      expect(args.onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Submit empty form
    await user.click(canvas.getByRole('button', { name: 'Sign in' }));

    // Assert validation errors appear
    await waitFor(() => {
      expect(canvas.getByText('Email is required')).toBeInTheDocument();
      expect(canvas.getByText('Password is required')).toBeInTheDocument();
    });
  },
};

export const PasswordToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    const passwordInput = canvas.getByLabelText('Password');
    await user.type(passwordInput, 'secret');

    // Password should be masked
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Toggle visibility
    await user.click(canvas.getByRole('button', { name: 'Show password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  },
};
```

### Composing Play Functions

```typescript
export const FullFlow: Story = {
  play: async (context) => {
    // Run the FilledForm play function first
    await FilledForm.play!(context);

    const canvas = within(context.canvasElement);

    // Then continue with additional interactions
    await waitFor(() => {
      expect(canvas.getByText('Welcome back!')).toBeInTheDocument();
    });
  },
};
```

---

## 4. Visual Regression Testing (Chromatic)

### Setup

```bash
# Install Chromatic
npm install --save-dev chromatic

# Run visual tests
npx chromatic --project-token=YOUR_TOKEN

# In CI (GitHub Actions)
# .github/workflows/chromatic.yml
```

```yaml
# .github/workflows/chromatic.yml
name: Chromatic
on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: true
```

### Controlling Snapshots

```typescript
export const AnimatedComponent: Story = {
  parameters: {
    // Disable Chromatic snapshot for animated stories
    chromatic: { disableSnapshot: true },
  },
};

export const ResponsiveLayout: Story = {
  parameters: {
    // Capture at multiple viewport widths
    chromatic: {
      viewports: [320, 768, 1200],
    },
  },
};

export const DarkMode: Story = {
  parameters: {
    chromatic: {
      // Capture both themes
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      },
    },
  },
};

// Delay snapshot until animations complete
export const WithAnimation: Story = {
  parameters: {
    chromatic: { delay: 500 },
  },
};
```

---

## 5. Auto-Docs and MDX Documentation

### Auto-Docs (Generated from Stories)

```typescript
// Enable by adding 'autodocs' tag
const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],  // Generates a Docs page automatically
  parameters: {
    docs: {
      description: {
        component: 'Primary UI button component. Supports multiple variants, '
          + 'sizes, and states including loading and disabled.',
      },
    },
  },
} satisfies Meta<typeof Button>;
```

### Custom MDX Documentation

```mdx
{/* Button.mdx */}
import { Meta, Story, Canvas, Controls, Source } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button

The Button component is the primary action element in the design system.

## Usage Guidelines

- Use **Primary** for the main call-to-action on a page.
- Use **Secondary** for less important actions.
- Use **Danger** for destructive actions (delete, remove).
- Never place two Primary buttons side by side.

## Interactive Example

<Canvas of={ButtonStories.Primary} />

## Controls

<Controls />

## Variants

<Canvas>
  <Story of={ButtonStories.Primary} />
  <Story of={ButtonStories.Secondary} />
  <Story of={ButtonStories.Danger} />
</Canvas>

## Accessibility

- All buttons have a visible focus ring.
- Disabled buttons use `aria-disabled` instead of the `disabled` attribute
  to remain in the tab order for screen readers.
- Loading buttons announce their state via `aria-busy="true"`.

## Source Code

<Source of={ButtonStories.Primary} />
```

---

## 6. Addons

### Accessibility Addon (@storybook/addon-a11y)

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    '@storybook/addon-a11y',
    // ... other addons
  ],
};

// Per-story a11y configuration
export const ContrastIssue: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
};

// Disable a11y for a specific story (rare, document why)
export const DecorativeOnly: Story = {
  parameters: {
    a11y: { disable: true },
  },
};
```

### Viewport Addon

```typescript
// .storybook/preview.ts
const preview: Preview = {
  parameters: {
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '812px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
  },
};

// Set default viewport for a story
export const MobileLayout: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};
```

### Actions Addon

```typescript
// Automatic action logging for props matching patterns
const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    onClick: { action: 'clicked' },
    onHover: { action: 'hovered' },
  },
} satisfies Meta<typeof Button>;

// Or use fn() from @storybook/test for assertions in play functions
import { fn } from '@storybook/test';

const meta = {
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;
```

---

## 7. MSW Integration

### Setup

```typescript
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon';

// Initialize MSW
initialize();

const preview: Preview = {
  loaders: [mswLoader],
};

export default preview;
```

### Per-Story API Mocking

```typescript
import { http, HttpResponse } from 'msw';

export const WithData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json([
            { id: '1', name: 'Alice', role: 'Admin' },
            { id: '2', name: 'Bob', role: 'User' },
          ]);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', async () => {
          // Never resolves -- shows loading state forever
          await new Promise(() => {});
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json([]);
        }),
      ],
    },
  },
};
```

---

## 8. Portable Stories

Run Storybook stories inside any test runner (Vitest, Jest, Playwright).

```typescript
// Button.test.tsx
import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import * as stories from './Button.stories';

const { Primary, Disabled, Loading } = composeStories(stories);

test('Primary button renders correctly', () => {
  render(<Primary />);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});

test('Disabled button is not clickable', () => {
  render(<Disabled />);
  expect(screen.getByRole('button')).toBeDisabled();
});

test('Loading button shows spinner', () => {
  render(<Loading />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

// Run play functions in tests
test('FilledForm play function', async () => {
  const { FilledForm } = composeStories(stories);
  const { container } = render(<FilledForm />);
  await FilledForm.play!({ canvasElement: container });
});
```

---

## 9. Building Design Systems

### Token-Based Stories

```typescript
// tokens/Colors.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Design Tokens/Colors',
  tags: ['autodocs'],
} satisfies Meta;

export default meta;

const colors = {
  primary: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a5f' },
  neutral: { 50: '#fafafa', 500: '#737373', 900: '#171717' },
  success: { 500: '#22c55e' },
  danger: { 500: '#ef4444' },
  warning: { 500: '#f59e0b' },
};

export const ColorPalette: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {Object.entries(colors).map(([name, shades]) => (
        <div key={name}>
          <h3>{name}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {Object.entries(shades).map(([shade, value]) => (
              <div key={shade} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: value,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                />
                <small>{shade}</small>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
```

### Component Status Badges

```typescript
// .storybook/preview.ts
const preview: Preview = {
  parameters: {
    badges: {
      stable: {
        title: 'Stable',
        color: '#22c55e',
      },
      beta: {
        title: 'Beta',
        color: '#f59e0b',
      },
      deprecated: {
        title: 'Deprecated',
        color: '#ef4444',
      },
    },
  },
};

// In stories
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    badges: ['stable'],
  },
} satisfies Meta<typeof Button>;
```

---

## 10. Storybook Configuration

### main.ts

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  // TypeScript configuration
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        // Filter out HTML attributes from docs
        return prop.parent
          ? !/node_modules/.test(prop.parent.fileName)
          : true;
      },
    },
  },
};

export default config;
```

---

## 11. CI Integration

### GitHub Actions

```yaml
name: Storybook CI
on:
  pull_request:
    branches: [main]

jobs:
  storybook:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      # Build Storybook (catches build errors)
      - run: npm run build-storybook

      # Run interaction tests
      - name: Run Storybook tests
        run: |
          npx concurrently -k -s first \
            "npx http-server storybook-static --port 6006 --silent" \
            "npx wait-on tcp:6006 && npx test-storybook"

      # Upload as artifact
      - uses: actions/upload-artifact@v4
        with:
          name: storybook
          path: storybook-static/
```

### test-storybook Configuration

```typescript
// .storybook/test-runner.ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page, context) {
    // Run a11y checks on every story automatically
    const storyContext = await getStoryContext(page, context);

    if (storyContext.parameters?.a11y?.disable) {
      return;
    }

    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  },
};

export default config;
```

---

## 12. Performance Optimization

### Lazy Loading Stories

```typescript
// Only load heavy dependencies when the story renders
export const HeavyComponent: Story = {
  render: () => {
    const [Component, setComponent] = useState<React.ComponentType | null>(null);

    useEffect(() => {
      import('../components/HeavyChart').then((mod) => {
        setComponent(() => mod.HeavyChart);
      });
    }, []);

    if (!Component) return <div>Loading...</div>;
    return <Component data={sampleData} />;
  },
};
```

### Build Optimization

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  // ...
  core: {
    disableTelemetry: true,
  },
  // Reduce build size by limiting stories in CI
  stories: process.env.CI
    ? ['../src/components/**/*.stories.tsx']
    : ['../src/**/*.stories.@(ts|tsx|mdx)'],
};
```

---

## 13. Anti-Patterns

### NEVER

- Write stories without proper args (always make stories configurable via Controls)
- Skip play functions for interactive components (forms, modals, dropdowns)
- Use hardcoded test data inline (extract to shared fixtures)
- Create stories that depend on external services without MSW mocks
- Ignore accessibility addon warnings (fix them or document exceptions)
- Put business logic inside stories (stories render components, nothing more)
- Skip autodocs tags on public components (every public component needs docs)
- Use `.storyName` when the export name suffices (use clear export names)

### ALWAYS

- Write at least one story per visual state (default, loading, error, empty, disabled)
- Include play functions for interactive components
- Set up global decorators for providers (theme, routing, query client)
- Use `fn()` for event handler props to enable action logging and assertions
- Configure viewport addon for responsive components
- Enable the a11y addon globally and fix all warnings
- Use CSF3 format (object-based stories with `args`)
- Test stories in CI with `test-storybook`
- Organize stories by domain: `Components/Forms/Input`, `Components/Layout/Grid`
- Document component usage guidelines in MDX or autodocs descriptions
