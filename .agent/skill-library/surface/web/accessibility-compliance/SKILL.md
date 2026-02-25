---
name: accessibility-compliance
description: "Ensure WCAG 2.1/2.2 compliance across web applications. Use when asked to audit accessibility, add ARIA support, fix keyboard navigation, improve screen reader experience, or meet legal compliance (ADA, EAA, Section 508)."
version: 1.0.0
---

# Accessibility Compliance

Comprehensive accessibility reference based on WCAG 2.1/2.2 and WAI-ARIA Authoring Practices. Every web application must be usable by people with disabilities --- this is not a feature, it is a baseline requirement.

## WCAG Principles: POUR

| Principle | Description |
|-----------|-------------|
| **P**erceivable | Content can be perceived through different senses |
| **O**perable | Interface can be operated by all users (keyboard, voice, switch) |
| **U**nderstandable | Content and interface behavior are predictable and clear |
| **R**obust | Content works with current and future assistive technologies |

## Conformance Levels

| Level | Requirement | When to Target |
|-------|-------------|----------------|
| **A** | Minimum accessibility | Always --- these are non-negotiable barriers |
| **AA** | Standard compliance | Default target --- legal requirement in most jurisdictions (ADA, EAA) |
| **AAA** | Enhanced accessibility | Target for specific content (gov, healthcare, education) --- not realistic site-wide |

**Rule of thumb:** Target AA for all production code. Target AAA for text contrast and reading level when feasible.

---

## Semantic HTML

Semantic HTML is the foundation. ARIA should supplement native semantics, never replace them.

### Document Landmarks

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/" aria-current="page">Home</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <aside aria-label="Sidebar">
    <!-- Secondary content -->
  </aside>

  <main id="main-content" tabindex="-1">
    <h1>Page Title</h1>
    <!-- Primary page content -->
  </main>

  <footer>
    <nav aria-label="Footer navigation">
      <!-- Footer links -->
    </nav>
  </footer>
</body>
```

### Heading Hierarchy

Headings must follow a logical hierarchy. Never skip levels for visual styling.

```html
<!-- WRONG: skipped h2 -->
<h1>Dashboard</h1>
<h3>Recent Activity</h3>

<!-- CORRECT: logical hierarchy -->
<h1>Dashboard</h1>
<h2>Recent Activity</h2>
<h3>Today</h3>
<h3>This Week</h3>
<h2>Settings</h2>
```

### Lists

Use semantic list elements for grouped content --- screen readers announce "list of N items."

```html
<!-- Navigation as list -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li aria-current="page">Widget Pro</li>
  </ol>
</nav>

<!-- Tag/chip groups as list -->
<ul aria-label="Applied filters" role="list">
  <li>Category: Electronics <button aria-label="Remove filter: Electronics">x</button></li>
  <li>Price: Under $50 <button aria-label="Remove filter: Price under $50">x</button></li>
</ul>
```

---

## ARIA Roles, States, and Properties

### The First Rule of ARIA

**Do not use ARIA if a native HTML element provides the same semantics.**

```html
<!-- WRONG: ARIA on a div -->
<div role="button" tabindex="0" onclick="submit()">Submit</div>

<!-- CORRECT: native button -->
<button type="submit">Submit</button>

<!-- WRONG: ARIA checkbox -->
<div role="checkbox" aria-checked="false" tabindex="0">Enable notifications</div>

<!-- CORRECT: native checkbox -->
<label>
  <input type="checkbox" name="notifications" />
  Enable notifications
</label>
```

### When ARIA IS Needed

Use ARIA for custom widgets that have no native HTML equivalent.

**Tabs:**
```html
<div role="tablist" aria-label="Account settings">
  <button role="tab" id="tab-profile" aria-selected="true"
          aria-controls="panel-profile">Profile</button>
  <button role="tab" id="tab-security" aria-selected="false"
          aria-controls="panel-security" tabindex="-1">Security</button>
  <button role="tab" id="tab-billing" aria-selected="false"
          aria-controls="panel-billing" tabindex="-1">Billing</button>
</div>

<div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
  <!-- Profile content -->
</div>
<div role="tabpanel" id="panel-security" aria-labelledby="tab-security" hidden>
  <!-- Security content -->
</div>
<div role="tabpanel" id="panel-billing" aria-labelledby="tab-billing" hidden>
  <!-- Billing content -->
</div>
```

**Combobox / Autocomplete:**
```html
<label for="search-input">Search</label>
<div role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-owns="search-results">
  <input id="search-input" type="text" aria-autocomplete="list"
         aria-controls="search-results" aria-activedescendant="result-2" />
</div>
<ul id="search-results" role="listbox">
  <li id="result-1" role="option">React</li>
  <li id="result-2" role="option" aria-selected="true">React Router</li>
  <li id="result-3" role="option">React Query</li>
</ul>
```

**Disclosure (expand/collapse):**
```html
<button aria-expanded="false" aria-controls="faq-answer-1">
  What is your return policy?
</button>
<div id="faq-answer-1" hidden>
  <p>You can return items within 30 days of purchase.</p>
</div>
```

### ARIA States Reference

| Attribute | Purpose | Values |
|-----------|---------|--------|
| `aria-expanded` | Collapsible sections, menus | `true` / `false` |
| `aria-selected` | Tabs, listbox options | `true` / `false` |
| `aria-checked` | Custom checkboxes, switches | `true` / `false` / `mixed` |
| `aria-pressed` | Toggle buttons | `true` / `false` |
| `aria-disabled` | Disabled controls (keeps focusable) | `true` / `false` |
| `aria-hidden` | Hide from assistive tech (still visible) | `true` / `false` |
| `aria-invalid` | Form validation errors | `true` / `false` / `grammar` / `spelling` |
| `aria-busy` | Content loading/updating | `true` / `false` |
| `aria-current` | Current item in a set | `page` / `step` / `location` / `date` / `true` |

---

## Keyboard Navigation

### Tab Order

All interactive elements must be reachable via Tab in a logical order that matches visual layout.

```html
<!-- tabindex values -->
<!-- 0: follows natural DOM order (use this) -->
<button tabindex="0">Interactive element in DOM order</button>

<!-- -1: focusable via JS only, not in tab order -->
<div tabindex="-1" id="main-content">Focusable by script, not Tab</div>

<!-- positive: NEVER USE --- creates unpredictable tab order -->
<!-- <div tabindex="5">DO NOT DO THIS</div> -->
```

### Focus Management

**Modal dialog focus trap:**
```typescript
function trapFocus(modal: HTMLElement): () => void {
  const focusableSelector = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelector);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Save the element that opened the modal
  const previouslyFocused = document.activeElement as HTMLElement;

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  modal.addEventListener('keydown', handleKeydown);
  firstElement.focus();

  // Return cleanup function that restores focus
  return () => {
    modal.removeEventListener('keydown', handleKeydown);
    previouslyFocused?.focus();
  };
}
```

**Roving tabindex for composite widgets (tabs, toolbars, menus):**
```typescript
function rovingTabindex(container: HTMLElement, selector: string): void {
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector));

  items.forEach((item, index) => {
    item.setAttribute('tabindex', index === 0 ? '0' : '-1');
  });

  container.addEventListener('keydown', (event: KeyboardEvent) => {
    const currentIndex = items.indexOf(event.target as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    items[currentIndex].setAttribute('tabindex', '-1');
    items[nextIndex].setAttribute('tabindex', '0');
    items[nextIndex].focus();
  });
}
```

### Focus Indicators

```css
/* NEVER remove focus outlines globally */
/* *:focus { outline: none; }  --- BANNED */

/* Use :focus-visible for keyboard-only focus styles */
:focus-visible {
  outline: 2px solid var(--color-focus, #005fcc);
  outline-offset: 2px;
}

/* Remove outline only for mouse clicks, keep for keyboard */
:focus:not(:focus-visible) {
  outline: none;
}

/* High-contrast focus for dark backgrounds */
.dark-section :focus-visible {
  outline-color: #ffffff;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3);
}
```

### Skip Links

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <a href="#search" class="skip-link">Skip to search</a>
  <!-- header, nav... -->
  <main id="main-content" tabindex="-1">...</main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  font-weight: bold;
  z-index: 10000;
  text-decoration: none;
}

.skip-link:focus {
  top: 8px;
}
```

---

## Screen Reader Patterns

### Live Regions

Use `aria-live` to announce dynamic content changes.

```html
<!-- Polite: announces after current speech finishes -->
<div aria-live="polite" aria-atomic="true" class="visually-hidden">
  <!-- Inject status messages here via JS -->
</div>

<!-- Assertive: interrupts current speech (use sparingly) -->
<div role="alert" aria-live="assertive">
  <!-- Critical error messages only -->
</div>

<!-- Status: polite + role=status (for non-critical updates) -->
<div role="status" aria-live="polite">
  3 results found
</div>

<!-- Log: polite, new entries appended (chat, activity feed) -->
<div role="log" aria-live="polite" aria-relevant="additions">
  <!-- Chat messages appended here -->
</div>
```

**Announcing dynamic changes:**
```typescript
function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.getElementById(`${priority}-announcer`);
  if (!announcer) return;

  // Clear and re-set to force re-announcement
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

// Usage
announce('Item added to cart');
announce('Form submission failed. 2 errors found.', 'assertive');
```

### Visually Hidden Class

Content that must be read by screen readers but hidden visually.

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Allow the element to be focusable when navigated to */
.visually-hidden.focusable:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## Color Contrast

### Requirements

| Element | AA Minimum | AAA Enhanced |
|---------|------------|--------------|
| Normal text (< 18px / < 14px bold) | 4.5:1 | 7:1 |
| Large text (>= 18px / >= 14px bold) | 3:1 | 4.5:1 |
| UI components and graphical objects | 3:1 | 3:1 |
| Disabled controls | No requirement | No requirement |
| Logos and brand text | No requirement | No requirement |

### Never Rely on Color Alone

```html
<!-- WRONG: only color indicates error -->
<input style="border-color: red" />

<!-- CORRECT: color + icon + text + ARIA -->
<div class="field-group">
  <label for="email">Email address</label>
  <input id="email" type="email"
         aria-invalid="true"
         aria-describedby="email-error" />
  <p id="email-error" class="error-message" role="alert">
    <svg aria-hidden="true" class="error-icon"><!-- icon --></svg>
    Please enter a valid email address (e.g., user@example.com)
  </p>
</div>
```

### Link Distinction

Links within body text must be distinguishable from surrounding text by more than color alone (underline, bold, icon, or 3:1 contrast difference from surrounding text).

```css
/* Links in body text must have underline OR 3:1 contrast difference from surrounding text */
p a, li a, td a {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Navigation links where context makes role obvious can omit underline */
nav a {
  text-decoration: none;
}
nav a:hover,
nav a:focus-visible {
  text-decoration: underline;
}
```

---

## Reduced Motion

```css
/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Provide alternatives, not just removal */
@media (prefers-reduced-motion: no-preference) {
  .hero-animation {
    animation: slide-in 0.5s ease-out;
  }
}

/* Always safe: opacity transitions are fine for reduced motion users */
.fade-in {
  opacity: 0;
  transition: opacity 0.2s ease-in;
}
.fade-in.visible {
  opacity: 1;
}
```

**In JavaScript:**
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateElement(element: HTMLElement): void {
  if (prefersReducedMotion) {
    element.style.opacity = '1'; // Instant, no animation
    return;
  }
  element.animate(
    [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 300, easing: 'ease-out' }
  );
}
```

---

## Form Accessibility

### Labels

Every form control must have a programmatically associated label.

```html
<!-- Explicit label (preferred) -->
<label for="username">Username</label>
<input id="username" type="text" name="username" required />

<!-- Implicit label -->
<label>
  Username
  <input type="text" name="username" required />
</label>

<!-- NEVER use placeholder as the only label -->
<!-- WRONG -->
<input type="email" placeholder="Email" />

<!-- CORRECT: label + optional placeholder -->
<label for="email">Email address</label>
<input id="email" type="email" placeholder="user@example.com" />
```

### Error Messages

```html
<form novalidate>
  <!-- Error summary at top of form -->
  <div id="error-summary" role="alert" aria-live="assertive" tabindex="-1">
    <h2>There are 2 errors in this form</h2>
    <ul>
      <li><a href="#email">Email address is required</a></li>
      <li><a href="#password">Password must be at least 8 characters</a></li>
    </ul>
  </div>

  <!-- Individual field with error -->
  <div class="field-group">
    <label for="email">
      Email address
      <span aria-hidden="true">*</span>
      <span class="visually-hidden">(required)</span>
    </label>
    <input id="email" type="email" name="email"
           required
           aria-required="true"
           aria-invalid="true"
           aria-describedby="email-error email-hint" />
    <p id="email-hint" class="hint">We will never share your email.</p>
    <p id="email-error" class="error-message">Email address is required</p>
  </div>
</form>
```

### Required Fields

```html
<!-- Indicate required at the form level -->
<p>Fields marked with <span aria-hidden="true">*</span>
   <span class="visually-hidden">asterisk</span> are required.</p>

<!-- On the field -->
<label for="name">
  Full name <span aria-hidden="true">*</span>
</label>
<input id="name" type="text" required aria-required="true" />
```

---

## Table Accessibility

### Data Tables

```html
<table>
  <caption>Q3 2025 Sales by Region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Revenue</th>
      <th scope="col">Growth</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North America</th>
      <td>$1.2M</td>
      <td>+15%</td>
    </tr>
    <tr>
      <th scope="row">Europe</th>
      <td>$800K</td>
      <td>+8%</td>
    </tr>
  </tbody>
</table>
```

### Complex Tables

```html
<table>
  <caption>Employee Schedule</caption>
  <thead>
    <tr>
      <td></td>
      <th scope="col" id="mon">Monday</th>
      <th scope="col" id="tue">Tuesday</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row" id="morning">Morning</th>
      <td headers="mon morning">Alice</td>
      <td headers="tue morning">Bob</td>
    </tr>
  </tbody>
</table>
```

### Layout Tables (Avoid)

If you must use a table for layout (you should not), add `role="presentation"` to remove table semantics from the accessibility tree.

---

## Image Alternatives

```html
<!-- Informative image: describe the content -->
<img src="chart.png" alt="Bar chart showing 40% increase in Q3 sales compared to Q2" />

<!-- Decorative image: empty alt -->
<img src="decorative-swirl.png" alt="" role="presentation" />

<!-- Functional image (inside a link/button): describe the action -->
<a href="/home">
  <img src="logo.svg" alt="Acme Corp - Go to homepage" />
</a>

<!-- Complex image with long description -->
<figure>
  <img src="infographic.png" alt="2025 industry trends infographic"
       aria-describedby="infographic-desc" />
  <figcaption id="infographic-desc">
    The infographic shows five key trends: AI adoption increased 45%,
    remote work stabilized at 35%, cloud spending grew 22%...
  </figcaption>
</figure>

<!-- Icon buttons -->
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false"><!-- X icon --></svg>
</button>

<!-- SVG with title -->
<svg role="img" aria-labelledby="svg-title">
  <title id="svg-title">Warning: connection unstable</title>
  <!-- SVG paths -->
</svg>
```

---

## Testing Tools and Methods

### Automated Testing

| Tool | What It Catches | Integration |
|------|----------------|-------------|
| **axe-core** | ~57% of WCAG issues | Jest, Playwright, CI/CD |
| **Lighthouse** | Performance + a11y audit | Chrome DevTools, CLI |
| **eslint-plugin-jsx-a11y** | JSX-specific issues | ESLint config |
| **pa11y** | WCAG conformance | CLI, CI/CD |
| **Storybook a11y addon** | Component-level issues | Storybook |

**axe with Playwright:**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page has no accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

**axe with Vitest and Testing Library:**
```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('form is accessible', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist

- [ ] **Keyboard only:** Complete all tasks using only keyboard (Tab, Enter, Space, Escape, Arrows)
- [ ] **Screen reader:** Test with NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android)
- [ ] **Zoom 200%:** All content remains usable at 200% browser zoom
- [ ] **Zoom 400%:** Content reflows without horizontal scroll (WCAG 2.1 1.4.10)
- [ ] **High contrast:** Test with Windows High Contrast Mode and forced-colors
- [ ] **Reduced motion:** Test with prefers-reduced-motion: reduce
- [ ] **No images:** Verify alt text conveys meaning when images fail to load
- [ ] **Focus order:** Tab order matches visual/logical order
- [ ] **Error recovery:** Users can identify and correct all form errors

### Screen Reader Commands

| Action | VoiceOver (macOS) | NVDA (Windows) |
|--------|-------------------|----------------|
| Start/Stop | Cmd + F5 | Ctrl + Alt + N |
| Next item | VO + Right | Down Arrow |
| Previous item | VO + Left | Up Arrow |
| Activate | VO + Space | Enter |
| Headings list | VO + U, arrows | H / Shift + H |
| Landmarks | VO + U, arrows | D / Shift + D |
| Forms mode | Auto | Enter on form field |

---

## Legal Requirements

| Standard | Jurisdiction | Level | Applies To |
|----------|-------------|-------|------------|
| **ADA Title III** | United States | WCAG 2.1 AA (DOJ guidance) | Public accommodations (most commercial websites) |
| **Section 508** | United States | WCAG 2.0 AA | Federal agencies and contractors |
| **EAA (European Accessibility Act)** | European Union | EN 301 549 / WCAG 2.1 AA | Products and services sold in the EU (June 2025) |
| **AODA** | Ontario, Canada | WCAG 2.0 AA | Organizations with 50+ employees |
| **DDA** | United Kingdom | WCAG 2.1 AA | Public sector and large organizations |

---

## Common Anti-Patterns

| Anti-Pattern | Why It Is Wrong | Correct Approach |
|-------------|-----------------|------------------|
| Div/span soup with click handlers | Not focusable, no role, no keyboard support | Use `<button>` or `<a href>` |
| `aria-label` on non-interactive `<div>` | Screen readers may ignore or misrepresent | Use heading, visually-hidden text, or landmark role |
| Placeholder as sole label | Disappears on input, low contrast, not announced consistently | Use `<label>` element |
| `tabindex="5"` (positive values) | Creates unpredictable tab order | Use `tabindex="0"` and DOM order |
| `role="button"` without keyboard handler | Looks like a button but Enter/Space does nothing | Use native `<button>` or add keydown handler |
| `aria-hidden="true"` on focusable element | Creates ghost focus (focused but invisible to AT) | Remove from tab order too: `tabindex="-1"` |
| Auto-playing video/audio | Disorienting, interferes with screen readers | Require user-initiated playback |
| Custom `<select>` without listbox role | Broken for keyboard and screen reader users | Use native `<select>` or full ARIA listbox pattern |
| `outline: none` globally | Removes keyboard focus indicator for all users | Use `:focus-visible` for keyboard-only styles |
| `title` attribute for tooltips | Inconsistent AT support, not keyboard accessible | Use `aria-describedby` pointing to visible text |
| Infinite scroll without alternatives | Keyboard users cannot reach footer, disorienting | Provide "Load more" button or pagination |
| Low-contrast disabled buttons | Users cannot tell what is disabled | Ensure 3:1 contrast or add text indicator |

---

## Accessibility Decision Tree

```
Is there a native HTML element for this?
  YES --> Use it. Done.
  NO  --> Does this widget exist in WAI-ARIA Authoring Practices?
            YES --> Follow that pattern exactly (roles, states, keyboard)
            NO  --> Simplify the design. Complex custom widgets are a11y debt.
```

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WCAG 2.2 What's New](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Deque axe Rules](https://dequeuniversity.com/rules/axe/)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
