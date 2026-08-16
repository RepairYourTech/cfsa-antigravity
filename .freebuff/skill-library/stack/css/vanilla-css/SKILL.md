---
name: vanilla-css
description: Provides comprehensive modern vanilla CSS patterns (2024+) including custom properties, container queries, cascade layers, :has() selector, native nesting, @scope, color-mix(), oklch colors, scroll-driven animations, view transitions, logical properties, subgrid, anchor positioning, popover API, @property, media queries, CSS reset best practices, BEM methodology, and progressive enhancement strategies. Use when building stylesheets without a preprocessor or framework.
version: 1.0.0
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Modern Vanilla CSS Development Patterns

## Overview

Expert guide for building production-quality stylesheets with modern vanilla CSS (2024+). Covers native features that replace preprocessors: nesting, custom properties, cascade layers, container queries, and more. No build step required for most features.

## When to Use

- Building stylesheets without a CSS preprocessor or utility framework
- Leveraging native CSS features that replace Sass/Less functionality
- Creating themeable design systems with custom properties
- Implementing responsive component-based layouts with container queries
- Building accessible, performant interfaces with progressive enhancement
- Styling web components or shadow DOM content
- Projects where minimal tooling and long-term maintainability matter

## Instructions

1. **Use cascade layers** to organize specificity and avoid wars
2. **Use custom properties** for all design tokens (colors, spacing, typography)
3. **Use native nesting** instead of preprocessor nesting (max 3 levels)
4. **Use container queries** for component-level responsiveness
5. **Use logical properties** instead of physical (inline/block, not left/right)
6. **Use oklch** for perceptually uniform color manipulation
7. **Progressive enhancement**: core layout works without newest features

## Examples

### Complete Modern Stylesheet Architecture

```css
/* === 1. Cascade Layers === */
@layer reset, tokens, base, layout, components, utilities, overrides;

/* === 2. Reset Layer === */
@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
    scroll-behavior: smooth;
  }

  body {
    min-block-size: 100dvh;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  img, picture, video, canvas, svg {
    display: block;
    max-inline-size: 100%;
  }

  input, button, textarea, select {
    font: inherit;
    color: inherit;
  }

  p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
  }
}

/* === 3. Design Tokens Layer === */
@layer tokens {
  :root {
    /* --- Color Palette (oklch) --- */
    --color-primary: oklch(55% 0.25 265);
    --color-primary-light: oklch(70% 0.2 265);
    --color-primary-dark: oklch(40% 0.25 265);
    --color-secondary: oklch(65% 0.15 160);

    --color-surface: oklch(99% 0 0);
    --color-surface-raised: oklch(97% 0 0);
    --color-surface-sunken: oklch(95% 0 0);

    --color-text: oklch(20% 0 0);
    --color-text-muted: oklch(45% 0 0);
    --color-text-on-primary: oklch(98% 0 0);

    --color-border: oklch(85% 0 0);
    --color-focus-ring: oklch(65% 0.25 265 / 0.5);

    --color-success: oklch(60% 0.2 145);
    --color-warning: oklch(75% 0.15 85);
    --color-error: oklch(55% 0.25 25);

    /* --- Spacing Scale --- */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
    --space-3xl: 4rem;

    /* --- Typography --- */
    --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --font-mono: ui-monospace, "Cascadia Code", "Fira Code", monospace;

    --text-xs: clamp(0.7rem, 0.65rem + 0.25vw, 0.75rem);
    --text-sm: clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem);
    --text-base: clamp(0.95rem, 0.9rem + 0.25vw, 1rem);
    --text-lg: clamp(1.1rem, 1rem + 0.5vw, 1.25rem);
    --text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
    --text-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
    --text-3xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);

    /* --- Border Radius --- */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-full: 9999px;

    /* --- Shadows --- */
    --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.05);
    --shadow-md: 0 4px 6px oklch(0% 0 0 / 0.07),
                 0 2px 4px oklch(0% 0 0 / 0.05);
    --shadow-lg: 0 10px 15px oklch(0% 0 0 / 0.1),
                 0 4px 6px oklch(0% 0 0 / 0.05);

    /* --- Transitions --- */
    --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --duration-fast: 150ms;
    --duration-normal: 250ms;
    --duration-slow: 400ms;

    /* --- Z-Index Scale --- */
    --z-dropdown: 100;
    --z-sticky: 200;
    --z-overlay: 300;
    --z-modal: 400;
    --z-popover: 500;
    --z-toast: 600;
  }
}
```

## Constraints and Warnings

- **Browser support**: Check caniuse.com for :has(), @layer, container queries, oklch
- **Native nesting**: Supported in all modern browsers but not IE or older Safari
- **Anchor positioning**: Still limited browser support as of 2024
- **Scroll-driven animations**: Chrome/Edge only as of late 2024
- **View transitions**: Same-document supported widely; cross-document is newer
- **@scope**: Limited browser support; use as progressive enhancement
- **@property**: Supported in Chromium and Safari 15.4+, Firefox 128+
- **No fallback = broken**: Always provide fallback for cutting-edge features

## Core Concepts

### Custom Properties (CSS Variables)

Custom properties cascade and can be scoped to any selector:

```css
/* Global tokens */
:root {
  --brand-hue: 265;
  --brand-color: oklch(55% 0.25 var(--brand-hue));
}

/* Component-scoped overrides */
.card {
  --card-padding: var(--space-lg);
  --card-radius: var(--radius-md);

  padding: var(--card-padding);
  border-radius: var(--card-radius);
  background: var(--color-surface-raised);
}

.card--compact {
  --card-padding: var(--space-sm);
  --card-radius: var(--radius-sm);
}
```

### Dark Mode Theming

```css
@layer tokens {
  :root {
    color-scheme: light dark;

    --color-surface: oklch(99% 0 0);
    --color-text: oklch(20% 0 0);
    --color-border: oklch(85% 0 0);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-surface: oklch(15% 0 0);
      --color-text: oklch(90% 0 0);
      --color-border: oklch(30% 0 0);
    }
  }

  /* Class-based override for manual toggle */
  [data-theme="dark"] {
    --color-surface: oklch(15% 0 0);
    --color-text: oklch(90% 0 0);
    --color-border: oklch(30% 0 0);
  }
}
```

### Cascade Layers (@layer)

Layers control specificity order regardless of selector weight:

```css
/* Declaration order sets priority (last wins) */
@layer reset, base, components, utilities;

@layer reset {
  /* Lowest priority -- easily overridden */
  a { color: inherit; text-decoration: none; }
}

@layer base {
  a { color: var(--color-primary); }
}

@layer components {
  .nav__link { color: var(--color-text); }
}

@layer utilities {
  /* Highest priority among layers */
  .text-primary { color: var(--color-primary); }
}

/* Unlayered styles beat ALL layers */
```

### Native CSS Nesting

```css
.card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  /* Direct child nesting */
  & .card__header {
    padding: var(--space-md);
    border-block-end: 1px solid var(--color-border);
  }

  & .card__body {
    padding: var(--space-lg);
  }

  /* Pseudo-classes */
  &:hover {
    box-shadow: var(--shadow-md);
  }

  &:focus-within {
    outline: 2px solid var(--color-focus-ring);
  }

  /* Media queries nest inside selectors */
  @media (width >= 768px) {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

### Container Queries

```css
/* Define a containment context */
.widget-container {
  container-type: inline-size;
  container-name: widget;
}

/* Respond to the container's size, not the viewport */
.widget {
  display: grid;
  gap: var(--space-sm);

  @container widget (inline-size >= 400px) {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  @container widget (inline-size >= 700px) {
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-lg);
  }
}
```

### The :has() Selector

The parent selector -- style an element based on its contents:

```css
/* Card that contains an image gets different layout */
.card:has(> img) {
  padding: 0;

  & img {
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }
}

/* Form group with invalid input */
.form-group:has(:invalid) {
  & .form-group__label {
    color: var(--color-error);
  }

  & .form-group__message {
    display: block;
  }
}

/* Style a label when its associated checkbox is checked */
label:has(input[type="checkbox"]:checked) {
  background: var(--color-primary-light);
}

/* Navigation link that is the current page */
.nav:has(.nav__link[aria-current="page"]) {
  border-block-end-color: var(--color-primary);
}
```

### @scope

Limit where styles apply without increasing specificity:

```css
@scope (.card) to (.card__footer) {
  /* Styles apply inside .card but NOT inside .card__footer */
  a {
    color: var(--color-primary);
    text-decoration: underline;
  }
}

@scope ([data-theme="admin"]) {
  .btn {
    --btn-bg: oklch(45% 0.2 25);
  }
}
```

### color-mix() and oklch Colors

```css
:root {
  --brand: oklch(55% 0.25 265);

  /* Generate tints and shades */
  --brand-100: color-mix(in oklch, var(--brand) 10%, white);
  --brand-200: color-mix(in oklch, var(--brand) 25%, white);
  --brand-300: color-mix(in oklch, var(--brand) 40%, white);
  --brand-500: var(--brand);
  --brand-700: color-mix(in oklch, var(--brand) 70%, black);
  --brand-900: color-mix(in oklch, var(--brand) 40%, black);

  /* Semi-transparent variants */
  --brand-overlay: color-mix(in oklch, var(--brand) 15%, transparent);

  /* Mix two brand colors */
  --accent: color-mix(in oklch, var(--brand) 50%, oklch(70% 0.2 145));
}
```

### @property (Typed Custom Properties)

```css
/* Register a custom property with type, inheritance, and initial value */
@property --gradient-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@property --color-progress {
  syntax: "<percentage>";
  inherits: true;
  initial-value: 0%;
}

/* Now you can animate custom properties */
.gradient-spinner {
  background: conic-gradient(
    from var(--gradient-angle),
    var(--color-primary),
    var(--color-secondary),
    var(--color-primary)
  );
  animation: spin-gradient 3s linear infinite;
}

@keyframes spin-gradient {
  to {
    --gradient-angle: 360deg;
  }
}
```

### Logical Properties

Replace physical properties (top/right/bottom/left) with flow-relative ones:

```css
/* Physical (breaks in RTL) */
.card-old {
  margin-left: 1rem;
  padding-top: 0.5rem;
  border-right: 1px solid gray;
  text-align: left;
}

/* Logical (works in LTR and RTL) */
.card {
  margin-inline-start: 1rem;
  padding-block-start: 0.5rem;
  border-inline-end: 1px solid var(--color-border);
  text-align: start;
}

/* Common logical property mappings:
   left/right       -> inline-start/inline-end
   top/bottom       -> block-start/block-end
   width            -> inline-size
   height           -> block-size
   margin-left      -> margin-inline-start
   padding-top      -> padding-block-start
   border-bottom    -> border-block-end
   text-align: left -> text-align: start
*/

.container {
  max-inline-size: 1200px;
  margin-inline: auto;
  padding-inline: var(--space-md);
  padding-block: var(--space-xl);
}
```

### Subgrid

```css
.page-grid {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--space-md), 1fr)
    [content-start] min(65ch, 100%)
    [content-end] minmax(var(--space-md), 1fr)
    [full-end];
}

/* Children inherit the parent grid tracks */
.page-grid > .card {
  grid-column: content;
  display: grid;
  grid-template-columns: subgrid;

  & .card__title,
  & .card__body {
    grid-column: content;
  }
}

/* Subgrid for aligned card layouts */
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.card-list > .card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3; /* header, body, footer */
}
```

### Anchor Positioning

```css
/* Define an anchor */
.trigger {
  anchor-name: --tooltip-anchor;
}

/* Position relative to the anchor */
.tooltip {
  position: fixed;
  position-anchor: --tooltip-anchor;
  inset-area: top;
  margin-block-end: var(--space-xs);

  /* Fallback if not enough space */
  position-try-fallbacks: flip-block, flip-inline;
}
```

### Popover API

```css
/* Style the popover */
[popover] {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  box-shadow: var(--shadow-lg);
  max-inline-size: 400px;

  /* Entry animation */
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity var(--duration-normal) var(--ease-out),
    transform var(--duration-normal) var(--ease-out),
    display var(--duration-normal) var(--ease-out) allow-discrete,
    overlay var(--duration-normal) var(--ease-out) allow-discrete;

  &:popover-open {
    opacity: 1;
    transform: translateY(0);
  }

  /* Starting style for entry animation */
  @starting-style {
    &:popover-open {
      opacity: 0;
      transform: translateY(-8px);
    }
  }
}

/* Style the backdrop */
[popover]::backdrop {
  background: oklch(0% 0 0 / 0.3);
  backdrop-filter: blur(4px);
}
```

### Scroll-Driven Animations

```css
/* Progress bar that tracks page scroll */
.scroll-progress {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: 3px;
  background: var(--color-primary);
  transform-origin: left;
  animation: grow-progress linear both;
  animation-timeline: scroll();
}

@keyframes grow-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Reveal elements as they enter the viewport */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  animation: reveal-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes reveal-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### View Transitions

```css
/* Define which elements participate in transitions */
.page-header {
  view-transition-name: page-header;
}

.hero-image {
  view-transition-name: hero-image;
}

/* Customize the transition animation */
::view-transition-old(hero-image) {
  animation: 300ms var(--ease-out) both fade-out;
}

::view-transition-new(hero-image) {
  animation: 300ms var(--ease-out) both fade-in;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}

/* Trigger from JavaScript */
/* document.startViewTransition(() => updateDOM()); */
```

## Layout Patterns

### Holy Grail Layout

```css
.layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: minmax(200px, 1fr) minmax(0, 3fr) minmax(200px, 1fr);
  grid-template-areas:
    "header header header"
    "nav    main   aside"
    "footer footer footer";
  min-block-size: 100dvh;

  @media (width < 768px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "nav"
      "main"
      "aside"
      "footer";
  }
}

.layout__header { grid-area: header; }
.layout__nav    { grid-area: nav; }
.layout__main   { grid-area: main; }
.layout__aside  { grid-area: aside; }
.layout__footer { grid-area: footer; }
```

### Fluid Typography and Spacing

```css
:root {
  /* Fluid type scale using clamp */
  --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.5vw, 1.375rem);
  --text-xl: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  --text-2xl: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  --text-3xl: clamp(2rem, 1.25rem + 3vw, 3.5rem);

  /* Fluid spacing */
  --space-fluid-sm: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --space-fluid-md: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  --space-fluid-lg: clamp(1.5rem, 1rem + 2.5vw, 3rem);
}
```

## Media Queries

### Preference Queries

```css
/* Reduced motion */
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

/* Color scheme */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: oklch(15% 0 0);
    --color-text: oklch(90% 0 0);
  }
}

/* Contrast preference */
@media (prefers-contrast: more) {
  :root {
    --color-text: oklch(0% 0 0);
    --color-border: oklch(30% 0 0);
  }
}

/* Reduced transparency */
@media (prefers-reduced-transparency: reduce) {
  .glass-panel {
    backdrop-filter: none;
    background: var(--color-surface);
  }
}
```

### Modern Range Syntax

```css
/* Old: @media (min-width: 768px) and (max-width: 1024px) */
/* New: */
@media (768px <= width <= 1024px) {
  .container { padding-inline: var(--space-lg); }
}

@media (width >= 1024px) {
  .sidebar { display: block; }
}

@media (width < 640px) {
  .desktop-only { display: none; }
}
```

## CSS Reset Best Practices

```css
@layer reset {
  /* Box model */
  *, *::before, *::after {
    box-sizing: border-box;
  }

  /* Remove default margin */
  * {
    margin: 0;
  }

  /* Full viewport height */
  html, body {
    min-block-size: 100dvh;
  }

  /* Typography defaults */
  body {
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* Media elements */
  img, picture, video, canvas, svg {
    display: block;
    max-inline-size: 100%;
    block-size: auto;
  }

  /* Form elements inherit font */
  input, button, textarea, select {
    font: inherit;
    color: inherit;
  }

  /* Avoid text overflow */
  p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
  }

  /* Remove list styles for lists with role */
  ul[role="list"], ol[role="list"] {
    list-style: none;
    padding: 0;
  }

  /* Anchor defaults */
  a {
    color: inherit;
    text-decoration-skip-ink: auto;
  }

  /* Table defaults */
  table {
    border-collapse: collapse;
  }

  /* Remove button styling */
  button {
    background: none;
    border: none;
    cursor: pointer;
  }
}
```

## BEM Methodology

Block-Element-Modifier naming for maintainable CSS:

```css
/* Block */
.card { }

/* Element (double underscore) */
.card__header { }
.card__body { }
.card__footer { }
.card__title { }
.card__action { }

/* Modifier (double hyphen) */
.card--featured { }
.card--compact { }
.card__action--primary { }
.card__action--disabled { }
```

### BEM with Native Nesting

```css
.card {
  background: var(--color-surface-raised);
  border-radius: var(--radius-md);
  overflow: hidden;

  &__header {
    padding: var(--space-md);
    border-block-end: 1px solid var(--color-border);
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  &__body {
    padding: var(--space-lg);
  }

  &__footer {
    padding: var(--space-md);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  /* Modifiers */
  &--featured {
    border: 2px solid var(--color-primary);

    & .card__header {
      background: var(--color-primary);
      color: var(--color-text-on-primary);
    }
  }

  &--compact {
    & .card__body {
      padding: var(--space-sm);
    }
  }
}
```

## Component Patterns

### Button Component

```css
.btn {
  --btn-bg: var(--color-primary);
  --btn-color: var(--color-text-on-primary);
  --btn-padding-inline: var(--space-lg);
  --btn-padding-block: var(--space-sm);
  --btn-radius: var(--radius-md);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding-block: var(--btn-padding-block);
  padding-inline: var(--btn-padding-inline);
  background: var(--btn-bg);
  color: var(--btn-color);
  border: 2px solid transparent;
  border-radius: var(--btn-radius);
  font-weight: 600;
  font-size: var(--text-base);
  line-height: 1;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);

  &:hover {
    --btn-bg: var(--color-primary-dark);
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  &--secondary {
    --btn-bg: transparent;
    --btn-color: var(--color-primary);
    border-color: var(--color-primary);

    &:hover {
      --btn-bg: var(--color-primary);
      --btn-color: var(--color-text-on-primary);
    }
  }

  &--sm {
    --btn-padding-inline: var(--space-md);
    --btn-padding-block: var(--space-xs);
    font-size: var(--text-sm);
  }

  &--lg {
    --btn-padding-inline: var(--space-xl);
    --btn-padding-block: var(--space-md);
    font-size: var(--text-lg);
  }
}
```

### Form Input

```css
.input {
  --input-border: var(--color-border);
  --input-bg: var(--color-surface);

  display: block;
  inline-size: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  transition: border-color var(--duration-fast);

  &:focus {
    --input-border: var(--color-primary);
    outline: 2px solid var(--color-focus-ring);
    outline-offset: -1px;
  }

  &[aria-invalid="true"] {
    --input-border: var(--color-error);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
```

## Progressive Enhancement

```css
/* Base: works everywhere */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.grid > * {
  flex: 1 1 250px;
}

/* Enhancement: container queries */
@supports (container-type: inline-size) {
  .grid-container {
    container-type: inline-size;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;

    @container (inline-size >= 500px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @container (inline-size >= 800px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}

/* Enhancement: :has() */
@supports selector(:has(*)) {
  .form-group:has(:invalid:not(:placeholder-shown)) {
    & .form-group__error {
      display: block;
    }
  }
}

/* Enhancement: oklch colors */
@supports (color: oklch(50% 0.2 265)) {
  :root {
    --color-primary: oklch(55% 0.25 265);
  }
}
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Correct Approach |
|--------------|---------------|------------------|
| `!important` everywhere | Breaks cascade, unmaintainable | Use @layer for specificity control |
| Deep nesting (4+ levels) | Hard to read, high specificity | Max 3 levels of nesting |
| Magic numbers (`margin: 37px`) | Arbitrary, not from a scale | Use design token variables |
| Physical properties only | Breaks RTL/vertical writing modes | Use logical properties |
| IDs for styling (`#header`) | Too specific, cannot reuse | Use classes with BEM |
| `px` for font sizes | Does not respect user preferences | Use `rem` or `clamp()` |
| Inline styles in HTML | Cannot be overridden easily | Use classes and custom properties |
| Using `@import` (non-layered) | Creates render-blocking requests | Use `@layer` or bundler imports |
| Animating `width`/`height` | Triggers layout, poor performance | Animate `transform` and `opacity` |
| `* { transition: all }` | Unexpected transitions everywhere | Target specific properties |
| Colors as hex in every rule | Hard to theme, no consistency | Define in `:root` as tokens |
| `float` for layout | Legacy, replaced by flexbox/grid | Use `display: flex` or `grid` |

## Best Practices

1. **Layer everything**: Use `@layer` to avoid specificity conflicts
2. **Token everything**: All values come from custom properties in `:root`
3. **Use oklch**: Perceptually uniform, easy to generate tints/shades
4. **Logical properties**: Always use inline/block instead of left/right/top/bottom
5. **Mobile-first**: Write base styles for small screens, enhance with `@media`
6. **Container queries for components**: Viewport media queries for layout, container queries for components
7. **Nest max 3 levels**: Deeper nesting is a code smell
8. **Fluid typography**: Use `clamp()` for text sizing
9. **Respect user preferences**: `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`
10. **Focus styles are mandatory**: Every interactive element needs `:focus-visible`
11. **Test RTL**: Logical properties make it easy but always verify
12. **Progressive enhance**: Feature-query new CSS with `@supports`

## References

- MDN Web Docs: https://developer.mozilla.org/en-US/docs/Web/CSS
- Can I Use: https://caniuse.com
- CSS Tricks: https://css-tricks.com
- Modern CSS: https://moderncss.dev
- Open Props: https://open-props.style
- Every Layout: https://every-layout.dev
