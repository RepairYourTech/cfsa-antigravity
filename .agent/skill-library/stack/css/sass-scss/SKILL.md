---
name: sass-scss
description: Provides comprehensive SASS/SCSS patterns including the modern module system (@use/@forward), mixins, extends, functions, design token architecture, responsive breakpoint systems, theming with maps, nesting best practices, placeholder selectors, control directives, built-in modules, Dart Sass migration, CSS Modules integration, and performance considerations. Use when building maintainable stylesheets with SCSS preprocessing.
version: 1.0.0
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# SASS/SCSS Development Patterns

## Overview

Expert guide for building scalable, maintainable stylesheets with SCSS (Sassy CSS). Covers the modern module system (@use/@forward), design token architecture, responsive systems, theming, and best practices for Dart Sass (the only actively maintained implementation).

## When to Use

- Building large-scale design systems with shared tokens
- Projects requiring complex responsive breakpoint logic
- Theming systems with multiple color schemes
- Teams that benefit from enforced code organization via the module system
- When you need computed values at build time (not runtime like CSS custom properties)
- Legacy codebases migrating from @import to @use/@forward
- CSS Modules integration with component frameworks

## Instructions

1. **Use @use and @forward exclusively** -- @import is deprecated and will be removed
2. **Organize tokens in maps** for systematic access and iteration
3. **Keep nesting to 3 levels maximum** -- deeper nesting is a code smell
4. **Prefer mixins over @extend** in most cases for predictable output
5. **Use the built-in modules** (math, color, list, map, string) instead of custom functions
6. **Namespace all @use imports** for clarity
7. **Generate CSS custom properties from SCSS maps** for runtime theming

## Examples

### Project Structure

```
styles/
  _index.scss             # Main entry point (@forward all partials)
  abstracts/
    _index.scss           # @forward all abstracts
    _tokens.scss          # Design tokens as maps
    _breakpoints.scss     # Responsive breakpoint system
    _typography.scss      # Type scale and font stacks
    _functions.scss       # Custom Sass functions
    _mixins.scss          # Reusable mixins
    _placeholders.scss    # Placeholder selectors (%)
  base/
    _index.scss           # @forward all base
    _reset.scss           # CSS reset / normalize
    _root.scss            # :root custom properties
    _typography.scss      # Base type styles
  components/
    _index.scss           # @forward all components
    _button.scss          # Button component
    _card.scss            # Card component
    _form.scss            # Form elements
  layout/
    _index.scss           # @forward all layout
    _grid.scss            # Grid system
    _header.scss          # Header layout
    _sidebar.scss         # Sidebar layout
  themes/
    _index.scss           # @forward all themes
    _light.scss           # Light theme tokens
    _dark.scss            # Dark theme tokens
  utilities/
    _index.scss           # @forward all utilities
    _spacing.scss         # Spacing utility classes
    _visibility.scss      # Show/hide utilities
```

## Constraints and Warnings

- **@import is deprecated**: Dart Sass will remove @import support; migrate to @use/@forward
- **LibSass is dead**: Use Dart Sass only; LibSass does not support the module system
- **Ruby Sass is dead**: Has been unsupported since 2019
- **@extend across media queries**: Does not work; use mixins instead
- **Deep nesting**: More than 3 levels creates overly specific selectors
- **Large maps in loops**: Generating hundreds of utility classes bloats CSS output
- **Division operator**: Use math.div() instead of the `/` operator for division
- **CSS output size**: SCSS generates CSS; always check the compiled output size

## Core Concepts

### The Module System: @use

@use loads a module and makes its members available with a namespace:

```scss
// _tokens.scss
$brand-color: #3b82f6;
$spacing-unit: 0.25rem;

@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
```

```scss
// _button.scss
@use "../abstracts/tokens";

.btn {
  // Access with namespace
  background-color: tokens.$brand-color;
  padding: tokens.$spacing-unit * 4;
}

// Custom namespace
@use "../abstracts/tokens" as t;

.btn-alt {
  background-color: t.$brand-color;
}

// No namespace (use sparingly)
@use "../abstracts/tokens" as *;

.btn-flat {
  background-color: $brand-color;
}
```

### The Module System: @forward

@forward re-exports members from another module:

```scss
// abstracts/_index.scss
// Re-export everything from all abstract partials
@forward "tokens";
@forward "breakpoints";
@forward "typography";
@forward "functions";
@forward "mixins";
@forward "placeholders";
```

```scss
// components/_button.scss
// Now you only need one @use for all abstracts
@use "../abstracts" as a;

.btn {
  background: a.$brand-color;
  @include a.respond-to("md") {
    padding: a.$spacing-unit * 6;
  }
}
```

### @forward with Configuration

```scss
// abstracts/_tokens.scss
$brand-color: #3b82f6 !default;
$font-family: system-ui, sans-serif !default;

// themes/_dark.scss
@forward "../abstracts/tokens" with (
  $brand-color: #60a5fa,
  $font-family: "Inter", system-ui, sans-serif
);
```

### @forward with show/hide

```scss
// Only expose specific members
@forward "tokens" show $brand-color, $spacing-unit;

// Hide internal members
@forward "mixins" hide _internal-mixin;
```

## Design Token Architecture

### Token Maps

```scss
// abstracts/_tokens.scss
@use "sass:map";

// --- Color Tokens ---
$colors: (
  "primary": (
    "100": #dbeafe,
    "200": #bfdbfe,
    "300": #93c5fd,
    "400": #60a5fa,
    "500": #3b82f6,
    "600": #2563eb,
    "700": #1d4ed8,
    "800": #1e40af,
    "900": #1e3a8a,
  ),
  "neutral": (
    "100": #f5f5f5,
    "200": #e5e5e5,
    "300": #d4d4d4,
    "400": #a3a3a3,
    "500": #737373,
    "600": #525252,
    "700": #404040,
    "800": #262626,
    "900": #171717,
  ),
  "semantic": (
    "success": #22c55e,
    "warning": #f59e0b,
    "error": #ef4444,
    "info": #3b82f6,
  ),
);

// --- Spacing Tokens ---
$spacing: (
  "xs": 0.25rem,
  "sm": 0.5rem,
  "md": 1rem,
  "lg": 1.5rem,
  "xl": 2rem,
  "2xl": 3rem,
  "3xl": 4rem,
);

// --- Typography Tokens ---
$font-sizes: (
  "xs": 0.75rem,
  "sm": 0.875rem,
  "base": 1rem,
  "lg": 1.125rem,
  "xl": 1.25rem,
  "2xl": 1.5rem,
  "3xl": 1.875rem,
  "4xl": 2.25rem,
);

$font-weights: (
  "regular": 400,
  "medium": 500,
  "semibold": 600,
  "bold": 700,
);

// --- Radii ---
$radii: (
  "sm": 0.25rem,
  "md": 0.375rem,
  "lg": 0.5rem,
  "xl": 0.75rem,
  "full": 9999px,
);

// --- Shadows ---
$shadows: (
  "sm": (0 1px 2px rgba(0, 0, 0, 0.05)),
  "md": (0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)),
  "lg": (0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)),
);
```

### Token Access Functions

```scss
// abstracts/_functions.scss
@use "sass:map";
@use "sass:list";
@use "tokens" as t;

// Get a color from the palette
@function color($group, $shade: null) {
  @if $shade {
    $group-map: map.get(t.$colors, $group);
    @if not $group-map {
      @error "Color group '#{$group}' not found.";
    }
    $result: map.get($group-map, "#{$shade}");
    @if not $result {
      @error "Shade '#{$shade}' not found in '#{$group}'.";
    }
    @return $result;
  }
  @return map.get(t.$colors, "semantic", $group);
}

// Get spacing
@function space($size) {
  $result: map.get(t.$spacing, $size);
  @if not $result {
    @error "Spacing '#{$size}' not found. Available: #{map.keys(t.$spacing)}";
  }
  @return $result;
}

// Get font size
@function font-size($size) {
  $result: map.get(t.$font-sizes, $size);
  @if not $result {
    @error "Font size '#{$size}' not found.";
  }
  @return $result;
}

// Get radius
@function radius($size) {
  @return map.get(t.$radii, $size);
}
```

### Generate CSS Custom Properties from Maps

```scss
// base/_root.scss
@use "sass:map";
@use "../abstracts" as a;

:root {
  // Generate color custom properties
  @each $group, $shades in a.$colors {
    @if type-of($shades) == "map" {
      @each $shade, $value in $shades {
        --color-#{$group}-#{$shade}: #{$value};
      }
    } @else {
      --color-#{$group}: #{$shades};
    }
  }

  // Generate spacing custom properties
  @each $name, $value in a.$spacing {
    --space-#{$name}: #{$value};
  }

  // Generate font size custom properties
  @each $name, $value in a.$font-sizes {
    --text-#{$name}: #{$value};
  }
}
```

## Responsive Breakpoint System

### Breakpoint Map and Mixin

```scss
// abstracts/_breakpoints.scss
@use "sass:map";

$breakpoints: (
  "sm": 640px,
  "md": 768px,
  "lg": 1024px,
  "xl": 1280px,
  "2xl": 1536px,
);

// Mobile-first (min-width)
@mixin respond-to($breakpoint) {
  $value: map.get($breakpoints, $breakpoint);
  @if not $value {
    @error "Breakpoint '#{$breakpoint}' not found. Available: #{map.keys($breakpoints)}";
  }
  @media (min-width: $value) {
    @content;
  }
}

// Desktop-first (max-width)
@mixin respond-below($breakpoint) {
  $value: map.get($breakpoints, $breakpoint);
  @if not $value {
    @error "Breakpoint '#{$breakpoint}' not found.";
  }
  @media (max-width: ($value - 0.02px)) {
    @content;
  }
}

// Between two breakpoints
@mixin respond-between($lower, $upper) {
  $lower-val: map.get($breakpoints, $lower);
  $upper-val: map.get($breakpoints, $upper);
  @if not $lower-val or not $upper-val {
    @error "Invalid breakpoints: '#{$lower}' or '#{$upper}'.";
  }
  @media (min-width: $lower-val) and (max-width: ($upper-val - 0.02px)) {
    @content;
  }
}
```

### Using Breakpoints

```scss
@use "../abstracts" as a;

.sidebar {
  display: none;

  @include a.respond-to("lg") {
    display: block;
    width: 280px;
  }
}

.card-grid {
  display: grid;
  gap: a.space("md");
  grid-template-columns: 1fr;

  @include a.respond-to("sm") {
    grid-template-columns: repeat(2, 1fr);
  }

  @include a.respond-to("lg") {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Mixins vs Extends vs Functions

### When to Use Each

| Tool | Use When | Output |
|------|----------|--------|
| **@mixin** | Reusable blocks of declarations, accepts arguments | Duplicates CSS at each call site |
| **@extend / %placeholder** | Multiple selectors share identical styles, no arguments | Merges selectors (comma-separated) |
| **@function** | Computing and returning a single value | No CSS output, returns a value |

### Mixin Patterns

```scss
// abstracts/_mixins.scss
@use "sass:math";
@use "tokens" as t;
@use "breakpoints" as bp;

// Truncate text with ellipsis
@mixin truncate($lines: 1) {
  overflow: hidden;
  text-overflow: ellipsis;
  @if $lines == 1 {
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
  }
}

// Visually hidden (accessible)
@mixin visually-hidden {
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

// Focus ring
@mixin focus-ring($color: map-get(t.$colors, "primary", "500"), $offset: 2px) {
  &:focus-visible {
    outline: 2px solid $color;
    outline-offset: $offset;
  }
}

// Container
@mixin container($max-width: 1200px, $padding: map-get(t.$spacing, "md")) {
  width: 100%;
  max-width: $max-width;
  margin-inline: auto;
  padding-inline: $padding;
}

// Aspect ratio (for older browser support)
@mixin aspect-ratio($width, $height) {
  aspect-ratio: math.div($width, $height);

  // Fallback for older browsers
  @supports not (aspect-ratio: 1) {
    &::before {
      content: "";
      display: block;
      padding-top: math.percentage(math.div($height, $width));
    }
  }
}

// Transition shorthand
@mixin transition($properties...) {
  $result: ();
  @each $prop in $properties {
    $result: append($result, $prop 250ms cubic-bezier(0.22, 1, 0.36, 1), comma);
  }
  transition: $result;
}
```

### Placeholder Selectors (%)

```scss
// abstracts/_placeholders.scss

// Shared card base -- only output if extended
%card-base {
  border-radius: 0.5rem;
  overflow: hidden;
  background: white;
}

%reset-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

%reset-button {
  appearance: none;
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  padding: 0;
}
```

```scss
// components/_card.scss
@use "../abstracts" as a;

.card {
  @extend %card-base;
  box-shadow: map-get(a.$shadows, "md");
}

.card--flat {
  @extend %card-base;
  border: 1px solid map-get(a.$colors, "neutral", "200");
}

// Compiled output:
// .card, .card--flat { border-radius: 0.5rem; overflow: hidden; background: white; }
// .card { box-shadow: ... }
// .card--flat { border: ... }
```

### Functions

```scss
// abstracts/_functions.scss
@use "sass:math";
@use "sass:color";
@use "sass:string";

// Convert px to rem
@function to-rem($px, $base: 16) {
  @return math.div($px, $base) * 1rem;
}

// Strip units
@function strip-unit($value) {
  @return math.div($value, ($value * 0 + 1));
}

// Tint a color (mix with white)
@function tint($color, $percentage) {
  @return color.mix(white, $color, $percentage);
}

// Shade a color (mix with black)
@function shade($color, $percentage) {
  @return color.mix(black, $color, $percentage);
}
```

## Control Directives

### @each

```scss
@use "sass:map";
@use "../abstracts" as a;

// Generate utility classes from a map
@each $name, $value in a.$spacing {
  .m-#{$name} { margin: $value; }
  .p-#{$name} { padding: $value; }
  .mx-#{$name} { margin-inline: $value; }
  .my-#{$name} { margin-block: $value; }
  .px-#{$name} { padding-inline: $value; }
  .py-#{$name} { padding-block: $value; }
}

// Nested map iteration
@each $group, $shades in a.$colors {
  @if type-of($shades) == "map" {
    @each $shade, $value in $shades {
      .text-#{$group}-#{$shade} { color: $value; }
      .bg-#{$group}-#{$shade} { background-color: $value; }
    }
  }
}
```

### @for

```scss
// Generate grid column classes
@for $i from 1 through 12 {
  .col-#{$i} {
    grid-column: span $i;
  }
}

// Generate gap utilities
@for $i from 0 through 8 {
  .gap-#{$i} {
    gap: $i * 0.25rem;
  }
}
```

### @while

```scss
// Less common -- mostly used for complex computed sequences
$columns: 12;
$i: 1;

@while $i <= $columns {
  .col-offset-#{$i} {
    grid-column-start: $i + 1;
  }
  $i: $i + 1;
}
```

## Built-In Modules

### sass:math

```scss
@use "sass:math";

.element {
  // Division (/ operator is deprecated for division)
  width: math.div(100%, 3);

  // Rounding
  border-radius: math.round(3.7px); // 4px

  // Clamping
  font-size: math.clamp(1rem, 2vw, 2rem);

  // Min/Max
  width: math.min(100%, 600px);

  // Power
  line-height: math.pow(1.25, 2); // 1.5625

  // Percentage
  flex-basis: math.percentage(math.div(1, 3)); // 33.33333%

  // Constants
  transform: rotate(math.$pi * 1rad);
}
```

### sass:color

```scss
@use "sass:color";

$base: #3b82f6;

.element {
  // Lighten/darken
  background: color.adjust($base, $lightness: 20%);
  border-color: color.adjust($base, $lightness: -15%);

  // Change specific channels
  color: color.adjust($base, $saturation: -30%);

  // Scale relative to current value
  background: color.scale($base, $lightness: 30%);

  // Mix two colors
  border-color: color.mix($base, white, 50%);

  // Get channel values
  // $hue: color.hue($base);
  // $lightness: color.lightness($base);
  // $alpha: color.alpha($base);

  // Change alpha
  background: color.adjust($base, $alpha: -0.3);
}
```

### sass:map

```scss
@use "sass:map";

$theme: (
  "colors": (
    "primary": #3b82f6,
    "secondary": #10b981,
  ),
  "spacing": (
    "sm": 0.5rem,
    "md": 1rem,
  ),
);

// Get nested values
$primary: map.get($theme, "colors", "primary");

// Check if key exists
$has-colors: map.has-key($theme, "colors"); // true

// Merge maps
$extended: map.merge($theme, ("breakpoints": ("sm": 640px)));

// Deep merge
$deep: map.deep-merge($theme, (
  "colors": ("tertiary": #f59e0b),
));

// Get keys/values
$keys: map.keys($theme); // ("colors", "spacing")
$values: map.values(map.get($theme, "spacing")); // (0.5rem, 1rem)

// Remove a key
$without: map.remove($theme, "spacing");
```

### sass:list

```scss
@use "sass:list";

$fonts: "Inter", "Helvetica", "Arial", sans-serif;

// Access by index (1-based)
$first: list.nth($fonts, 1); // "Inter"

// Length
$count: list.length($fonts); // 4

// Append
$extended: list.append($fonts, "Georgia");

// Join two lists
$combined: list.join(("a", "b"), ("c", "d")); // "a", "b", "c", "d"

// Find index
$idx: list.index($fonts, "Arial"); // 3

// Separator
$sep: list.separator($fonts); // comma
```

### sass:string

```scss
@use "sass:string";

$class-name: "btn-primary";

// String operations
$upper: string.to-upper-case($class-name); // "BTN-PRIMARY"
$length: string.length($class-name); // 11
$slice: string.slice($class-name, 5); // "primary"
$index: string.index($class-name, "-"); // 4
$quoted: string.quote(hello); // "hello"
$unquoted: string.unquote("hello"); // hello

// Insert
$inserted: string.insert($class-name, "--large", 4); // "btn--large-primary"
```

## Theming with Maps

### Theme Definition

```scss
// themes/_light.scss
$light-theme: (
  "surface": #ffffff,
  "surface-raised": #f9fafb,
  "text": #111827,
  "text-muted": #6b7280,
  "border": #e5e7eb,
  "primary": #3b82f6,
  "primary-text": #ffffff,
);

// themes/_dark.scss
$dark-theme: (
  "surface": #111827,
  "surface-raised": #1f2937,
  "text": #f9fafb,
  "text-muted": #9ca3af,
  "border": #374151,
  "primary": #60a5fa,
  "primary-text": #111827,
);
```

### Theme Application

```scss
// abstracts/_mixins.scss
@use "sass:map";

@mixin apply-theme($theme) {
  @each $key, $value in $theme {
    --color-#{$key}: #{$value};
  }
}
```

```scss
// base/_root.scss
@use "../abstracts" as a;
@use "../themes/light" as light;
@use "../themes/dark" as dark;

:root {
  @include a.apply-theme(light.$light-theme);
}

@media (prefers-color-scheme: dark) {
  :root {
    @include a.apply-theme(dark.$dark-theme);
  }
}

[data-theme="dark"] {
  @include a.apply-theme(dark.$dark-theme);
}

[data-theme="light"] {
  @include a.apply-theme(light.$light-theme);
}
```

```scss
// components/_card.scss
// Now components use CSS custom properties, not SCSS variables
.card {
  background: var(--color-surface-raised);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

## Nesting Best Practices

### Good Nesting (Max 3 Levels)

```scss
// GOOD: Clear, shallow nesting
.nav {
  display: flex;
  gap: 1rem;

  &__item {
    position: relative;
  }

  &__link {
    color: var(--color-text);
    text-decoration: none;

    &:hover {
      color: var(--color-primary);
    }

    &--active {
      font-weight: 600;
    }
  }
}
```

### Bad Nesting (Too Deep)

```scss
// BAD: 5 levels deep -- creates .nav ul li a span selector
.nav {
  ul {
    li {
      a {
        span {
          color: red;
        }
      }
    }
  }
}
```

### Nesting Rules

1. Use `&` for BEM elements and modifiers
2. Use `&` for pseudo-classes and pseudo-elements
3. Nest media queries inside selectors (not selectors inside media queries)
4. Never nest more than 3 levels
5. If nesting feels deep, your component is too complex -- split it

## CSS Modules Integration

```scss
// Button.module.scss
@use "../abstracts" as a;

.root {
  display: inline-flex;
  align-items: center;
  gap: a.space("xs");
  padding: a.space("sm") a.space("md");
  border-radius: a.radius("md");
  font-weight: map-get(a.$font-weights, "semibold");
  @include a.transition(background-color, color, box-shadow);
  @include a.focus-ring;
}

.primary {
  composes: root;
  background: a.color("primary", 500);
  color: white;

  &:hover {
    background: a.color("primary", 600);
  }
}

.secondary {
  composes: root;
  background: transparent;
  color: a.color("primary", 500);
  border: 1px solid a.color("primary", 500);

  &:hover {
    background: a.color("primary", 100);
  }
}

.small {
  padding: a.space("xs") a.space("sm");
  font-size: a.font-size("sm");
}

.large {
  padding: a.space("md") a.space("lg");
  font-size: a.font-size("lg");
}
```

```tsx
// Button.tsx
import styles from "./Button.module.scss";

function Button({ variant = "primary", size = "md", children }) {
  const variantClass = styles[variant];
  const sizeClass = size !== "md" ? styles[size] : "";

  return (
    <button className={`${variantClass} ${sizeClass}`}>
      {children}
    </button>
  );
}
```

## Dart Sass Migration

### Migrating @import to @use/@forward

```scss
// OLD (deprecated):
@import "variables";
@import "mixins";
@import "components/button";

// NEW:
@use "abstracts" as a;
@use "components/button";
```

### Key Migration Differences

| @import | @use |
|---------|------|
| Global scope -- everything accessible everywhere | Namespaced -- must @use in each file that needs it |
| Can @import same file multiple times | @use loads once, cached |
| `$variable` accessible globally | `namespace.$variable` required |
| Mixin available globally | `@include namespace.mixin` required |
| Can cause duplicate CSS | Never duplicates |

### Migration Command

```bash
# Use the official migrator
npx sass-migrator module --migrate-deps style.scss
```

## Performance Considerations

### Selector Performance

```scss
// AVOID: Universal selector in key position
* { box-sizing: border-box; }
// BETTER: Scope to reset layer, which is fine
@layer reset { *, *::before, *::after { box-sizing: border-box; } }

// AVOID: Deep descendant selectors
.page .content .sidebar .widget .title { }
// BETTER: Direct class
.widget__title { }
```

### Output Size Control

```scss
// AVOID: Generating thousands of utility classes
@each $prop in (margin, padding) {
  @each $side in (top, right, bottom, left) {
    @for $i from 0 through 100 {
      .#{$prop}-#{$side}-#{$i} {
        #{$prop}-#{$side}: $i * 1px;
      }
    }
  }
}
// This generates 800 classes. Do not do this.

// BETTER: Generate only what you use from a curated scale
$spacing-scale: ("0": 0, "1": 0.25rem, "2": 0.5rem, "4": 1rem, "8": 2rem);
@each $name, $value in $spacing-scale {
  .mt-#{$name} { margin-top: $value; }
  .mb-#{$name} { margin-bottom: $value; }
}
```

### @extend vs @mixin Output

```scss
// @extend: merges selectors (smaller output when many elements share styles)
%sr-only { position: absolute; width: 1px; height: 1px; }
.label-hidden { @extend %sr-only; }
.skip-link { @extend %sr-only; }
// Output: .label-hidden, .skip-link { position: absolute; width: 1px; height: 1px; }

// @mixin: duplicates declarations (larger output but more predictable)
@mixin sr-only { position: absolute; width: 1px; height: 1px; }
.label-hidden { @include sr-only; }
.skip-link { @include sr-only; }
// Output: .label-hidden { position: absolute; ... } .skip-link { position: absolute; ... }

// Rule of thumb:
// - Use @extend / %placeholder for identical styles with no arguments
// - Use @mixin for parameterized or conditional styles
// - Prefer @mixin when in doubt -- it is more predictable
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Correct Approach |
|--------------|---------------|------------------|
| `@import "file"` | Deprecated, global scope pollution | `@use "file" as f` |
| Nesting 4+ levels deep | Overly specific selectors | Max 3 levels, use BEM |
| `$color / 2` for division | Deprecated slash division | `math.div($color, 2)` |
| Hardcoded colors in components | Not themeable, inconsistent | Use token maps and functions |
| `@extend` across media queries | Does not work in Sass | Use `@mixin` instead |
| `@extend .existing-class` | Can create unexpected selectors | `@extend %placeholder` only |
| Variables without `!default` in libraries | Cannot be overridden by consumers | Add `!default` to library variables |
| Generating 1000+ utility classes | Bloated CSS output | Use curated scales |
| Using LibSass or Ruby Sass | Dead projects, no module support | Use Dart Sass exclusively |
| Storing runtime values in `$vars` | Cannot change after compilation | Use CSS custom properties for runtime |

## Best Practices

1. **@use everywhere**: Every file that needs a variable or mixin must @use it explicitly
2. **@forward in _index.scss**: Each directory has an index that forwards its contents
3. **Token maps, not loose variables**: Group tokens by category in maps
4. **Generate CSS custom properties**: Bridge SCSS build-time power with CSS runtime flexibility
5. **3-level nesting max**: If deeper, your component needs splitting
6. **math.div() for division**: The `/` operator is deprecated for division
7. **Prefer @mixin over @extend**: More predictable, works across media queries
8. **Use built-in modules**: `sass:math`, `sass:color`, `sass:map` over custom functions
9. **Error in functions**: Use `@error` and `@warn` for invalid inputs to functions
10. **Audit compiled output**: Regularly check the generated CSS for bloat
11. **Use !default for library code**: Allow consumers to override token values
12. **Namespace imports**: `@use "tokens" as t` not `@use "tokens" as *`

## References

- Sass Documentation: https://sass-lang.com/documentation
- Sass Module System: https://sass-lang.com/blog/the-module-system-is-launched
- Sass Built-In Modules: https://sass-lang.com/documentation/modules
- Sass Migrator: https://sass-lang.com/documentation/cli/migrator
- Dart Sass: https://sass-lang.com/dart-sass
