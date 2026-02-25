---
name: dark-mode-theming
description: "Implement dark mode and theming systems with CSS custom properties, system preference detection, FOUC prevention, Tailwind dark variants, and accessible contrast maintenance across themes. Use when adding dark mode, theme switching, or design token systems."
version: 1.0.0
---

# Dark Mode & Theming

Build a robust theming system that respects user preferences, avoids flash-of-unstyled-content, and maintains accessibility across all themes.

## CSS Custom Properties as Theme Tokens

Define your entire color system as CSS custom properties. Every color in your app should reference a token, never a hardcoded hex value.

```css
/* src/styles/tokens.css */

/* Light theme (default) */
:root {
  /* Surfaces */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-bg-tertiary: #e8e8e8;
  --color-bg-elevated: #ffffff;

  /* Text */
  --color-text-primary: #111111;
  --color-text-secondary: #555555;
  --color-text-muted: #888888;
  --color-text-inverse: #ffffff;

  /* Interactive */
  --color-accent: #0066cc;
  --color-accent-hover: #0052a3;
  --color-accent-text: #ffffff;

  /* Borders */
  --color-border: #d4d4d4;
  --color-border-strong: #999999;

  /* Status */
  --color-success: #157a3e;
  --color-warning: #9a6700;
  --color-error: #cc1a1a;
  --color-info: #0066cc;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg-primary: #0d0d0d;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #262626;
  --color-bg-elevated: #1f1f1f;

  --color-text-primary: #eeeeee;
  --color-text-secondary: #aaaaaa;
  --color-text-muted: #777777;
  --color-text-inverse: #111111;

  --color-accent: #4da6ff;
  --color-accent-hover: #80bfff;
  --color-accent-text: #000000;

  --color-border: #333333;
  --color-border-strong: #555555;

  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-error: #f85149;
  --color-info: #58a6ff;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}
```

**Usage in components:**
```css
.card {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.card-title {
  color: var(--color-text-primary);
}

.card-description {
  color: var(--color-text-secondary);
}
```

---

## System vs User Preference Detection

### Detecting System Preference

```typescript
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

### Three-Way Preference: System, Light, Dark

```typescript
type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

function saveThemePreference(preference: ThemePreference): void {
  localStorage.setItem('theme-preference', preference);
}

function loadThemePreference(): ThemePreference {
  const saved = localStorage.getItem('theme-preference');
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return 'system';
}
```

### Listening for System Changes

```typescript
function watchSystemTheme(callback: (theme: ResolvedTheme) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function handler(event: MediaQueryListEvent) {
    const preference = loadThemePreference();
    if (preference === 'system') {
      callback(event.matches ? 'dark' : 'light');
    }
  }

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
```

---

## Avoiding FOUC (Flash of Unstyled Content)

The theme must be applied **before** the page renders. This requires a blocking inline script in `<head>`.

### Blocking Script Technique

```html
<!-- Place this in <head> BEFORE any stylesheets -->
<script>
  (function() {
    var preference = 'system';
    try { preference = localStorage.getItem('theme-preference') || 'system'; } catch(e) {}

    var theme;
    if (preference === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      theme = preference;
    }

    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

**Why this works:** The script runs synchronously before the browser paints, so the `data-theme` attribute is set before CSS is applied.

### Astro Implementation

```astro
---
// src/layouts/BaseLayout.astro
---
<html lang="en">
  <head>
    <script is:inline>
      (function() {
        var p = 'system';
        try { p = localStorage.getItem('theme-preference') || 'system'; } catch(e) {}
        var t = p === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : p;
        document.documentElement.setAttribute('data-theme', t);
      })();
    </script>
    <!-- Stylesheets load AFTER theme attribute is set -->
    <link rel="stylesheet" href="/styles/tokens.css" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

---

## Image and SVG Adaptation

### CSS Filter Approach (Quick)

```css
/* Invert images in dark mode (useful for diagrams, charts) */
[data-theme="dark"] img.invertible {
  filter: invert(1) hue-rotate(180deg);
}
```

### Source Switching (Preferred for Quality)

```html
<picture>
  <source srcset="/images/hero-dark.webp" media="(prefers-color-scheme: dark)" />
  <img src="/images/hero-light.webp" alt="Hero illustration" />
</picture>
```

### SVG with currentColor

```html
<!-- SVGs using currentColor automatically adapt to theme -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2L2 7l10 5 10-5-10-5z" />
</svg>
```

```css
.icon { color: var(--color-text-primary); }
.icon-muted { color: var(--color-text-muted); }
```

### Background Images

```css
.hero {
  background-image: var(--hero-image);
}

:root {
  --hero-image: url('/images/hero-light.jpg');
}

[data-theme="dark"] {
  --hero-image: url('/images/hero-dark.jpg');
}
```

---

## Third-Party Widget Theming

Many third-party widgets (embedded forms, maps, code blocks) do not follow your theme. Handle them explicitly.

```css
/* Syntax highlighting with theme tokens */
[data-theme="dark"] .shiki {
  background-color: var(--color-bg-secondary) !important;
}

/* Embedded iframes: some support color-scheme parameter */
[data-theme="dark"] iframe.themeable {
  filter: invert(1) hue-rotate(180deg);
  /* Last resort --- use sparingly */
}
```

**For widgets that support a theme parameter:**
```typescript
// Re-initialize widget when theme changes
function onThemeChange(theme: ResolvedTheme): void {
  // Recaptcha
  grecaptcha.render('captcha', { theme });

  // Stripe Elements
  elements.update({ appearance: { theme: theme === 'dark' ? 'night' : 'stripe' } });
}
```

---

## Contrast Maintenance Across Themes

Every color pairing must meet WCAG AA contrast ratios in both themes.

| Pairing | Minimum Ratio | Verification |
|---------|--------------|--------------|
| `--color-text-primary` on `--color-bg-primary` | 7:1 (AAA) | Both themes |
| `--color-text-secondary` on `--color-bg-primary` | 4.5:1 (AA) | Both themes |
| `--color-text-muted` on `--color-bg-primary` | 4.5:1 (AA) | Both themes |
| `--color-accent` on `--color-bg-primary` | 4.5:1 (AA) | Both themes |
| `--color-accent-text` on `--color-accent` | 4.5:1 (AA) | Both themes |
| Status colors on background | 4.5:1 (AA) | Both themes |

**Testing contrast programmatically:**
```typescript
// Use a tool like `wcag-contrast` to verify at build time
import { getContrastRatio } from 'wcag-contrast';

const ratio = getContrastRatio('#eeeeee', '#0d0d0d');
console.assert(ratio >= 4.5, `Contrast ratio ${ratio} is below 4.5:1`);
```

---

## Theme Toggle Component

```tsx
function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(() => loadThemePreference());
  const resolvedTheme = resolveTheme(preference);

  function cycleTheme() {
    const next: ThemePreference =
      preference === 'system' ? 'light'
      : preference === 'light' ? 'dark'
      : 'system';

    setPreference(next);
    saveThemePreference(next);
    document.documentElement.setAttribute('data-theme', resolveTheme(next));
  }

  const label =
    preference === 'system' ? 'Theme: System'
    : preference === 'light' ? 'Theme: Light'
    : 'Theme: Dark';

  return (
    <button
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      type="button"
    >
      {preference === 'system' && <MonitorIcon aria-hidden="true" />}
      {preference === 'light' && <SunIcon aria-hidden="true" />}
      {preference === 'dark' && <MoonIcon aria-hidden="true" />}
    </button>
  );
}
```

**Alternative: dropdown select for clarity:**
```tsx
function ThemeSelect() {
  const [preference, setPreference] = useState<ThemePreference>(loadThemePreference());

  function handleChange(value: ThemePreference) {
    setPreference(value);
    saveThemePreference(value);
    document.documentElement.setAttribute('data-theme', resolveTheme(value));
  }

  return (
    <label>
      Theme
      <select value={preference} onChange={(e) => handleChange(e.target.value as ThemePreference)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
```

---

## Tailwind CSS Dark Mode

### Class Strategy (Recommended for User Control)

```javascript
// tailwind.config.js
export default {
  darkMode: 'selector', // Tailwind v4: uses [data-theme="dark"] or .dark
};
```

```html
<!-- Usage in templates -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <p class="text-gray-600 dark:text-gray-400">Secondary text</p>
  <button class="bg-blue-600 dark:bg-blue-400 text-white dark:text-black">
    Action
  </button>
</div>
```

### Combining Tailwind with CSS Custom Properties

Use Tailwind for layout/spacing and custom properties for theme colors:

```css
/* In your Tailwind CSS */
@theme {
  --color-surface: var(--color-bg-primary);
  --color-on-surface: var(--color-text-primary);
}
```

```html
<div class="bg-surface text-on-surface p-4 rounded-lg">
  Theme-aware via tokens, layout via Tailwind
</div>
```

---

## Smooth Theme Transitions

```css
/* Apply transition only to theme-related properties */
* {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease,
              box-shadow 0.2s ease;
}

/* Disable transitions during theme load to prevent FOUC */
html.no-transitions * {
  transition: none !important;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
```

**Apply no-transitions class during theme switch:**
```typescript
function setTheme(theme: ResolvedTheme): void {
  document.documentElement.classList.add('no-transitions');
  document.documentElement.setAttribute('data-theme', theme);

  // Re-enable transitions after a single frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
    });
  });
}
```

---

## Color Palette Design for Dual Themes

### Design Principles

1. **Do not just invert colors.** Dark mode needs its own palette with adjusted saturation and lightness.
2. **Reduce saturation in dark mode.** Fully saturated colors on dark backgrounds cause eye strain.
3. **Elevate with lighter surfaces, not shadows.** In dark mode, higher elevation = lighter surface (Material Design principle).
4. **Test with real content.** A palette that looks good on a demo page may fail with actual text and images.

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| Pure black (#000) background | Use very dark gray (#0d0d0d or #121212) |
| White text on pure black (#fff on #000) | Use off-white (#eeeeee) for less harsh contrast |
| Same border color in both themes | Borders need to be lighter in dark mode |
| Colored backgrounds unchanged | Adjust saturation and lightness per theme |

---

## Testing Themes

### Automated

```typescript
// Playwright test for both themes
import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
  test(`renders correctly in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await expect(page).toHaveScreenshot(`homepage-${theme}.png`);
  });
}
```

### Manual Checklist

- [ ] Toggle between light, dark, and system --- no FOUC
- [ ] All text meets contrast requirements in both themes
- [ ] Images and icons are visible and appropriate in both themes
- [ ] Form inputs, borders, and placeholders are visible in both themes
- [ ] Status colors (error, success, warning) are distinguishable in both themes
- [ ] Third-party widgets adapt or remain usable
- [ ] Preference persists across page reloads and sessions
- [ ] System preference change is reflected when set to "system"

## References

- [Material Design Dark Theme](https://m3.material.io/styles/color/dark-theme)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [prefers-color-scheme on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [A Complete Guide to Dark Mode on the Web](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/)
