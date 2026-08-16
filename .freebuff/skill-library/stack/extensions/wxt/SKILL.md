---
name: wxt
description: "WXT browser extension framework patterns covering project setup, entrypoints, content scripts, background scripts, storage, messaging, and cross-browser compatibility. Use when building browser extensions with WXT."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# WXT

Framework-agnostic browser extension framework. Supports React, Vue, Svelte, or vanilla JS. File-based entrypoints, auto-imports, and cross-browser compatibility (Chrome, Firefox, Safari, Edge).

## When to Use

- Building browser extensions with any UI framework (or none)
- Need cross-browser support (Chrome + Firefox + Safari)
- Want file-based routing for extension entrypoints
- Need HMR and a modern dev experience for extension development

## When NOT to Use

- Want a React-only opinionated framework (use Plasmo)
- Building a simple bookmarklet or userscript (overkill)
- Extension is trivial (single content script with no build step)

## Setup

```bash
npx wxt@latest init my-extension
cd my-extension
npm install
npm run dev            # Development with HMR
```

### Project Structure

```
entrypoints/
├── popup/
│   ├── index.html     # Popup page
│   └── main.tsx       # React/Vue/Svelte entry
├── options/
│   ├── index.html     # Options page
│   └── main.tsx
├── background.ts      # Service worker
├── content.ts         # Content script (auto-injected)
└── content/           # Content script with UI
    ├── index.tsx
    └── style.css
public/
└── icon/
    ├── 16.png
    ├── 48.png
    └── 128.png
wxt.config.ts          # WXT configuration
```

## Configuration

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],  // or @wxt-dev/module-vue, @wxt-dev/module-svelte
  manifest: {
    permissions: ['storage', 'activeTab', 'contextMenus'],
    host_permissions: ['https://example.com/*'],
    name: 'My Extension',
    description: 'Does useful things',
  },
});
```

## Content Scripts

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['https://example.com/*'],
  runAt: 'document_end',

  main() {
    console.log('Content script loaded on:', window.location.href);
    document.querySelectorAll('.ad-container').forEach(el => el.remove());
  },
});
```

### Content Script with UI

```tsx
// entrypoints/content/index.tsx
import ReactDOM from 'react-dom/client';

export default defineContentScript({
  matches: ['https://example.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'my-extension-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<OverlayWidget />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
  },
});

function OverlayWidget() {
  return <div style={{ position: 'fixed', bottom: 16, right: 16 }}>Extension UI</div>;
}
```

## Background Script

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  // Runs as service worker (MV3) or background page (MV2)
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
    }
  });

  chrome.contextMenus.create({
    id: 'my-action',
    title: 'Do Something',
    contexts: ['selection'],
  });

  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'my-action') {
      console.log('Selected text:', info.selectionText);
    }
  });
});
```

## Storage

```typescript
// utils/storage.ts
import { storage } from 'wxt/storage';

// Define typed storage items
export const userSettings = storage.defineItem<{
  theme: 'light' | 'dark';
  notifications: boolean;
}>('local:settings', { fallback: { theme: 'light', notifications: true } });

// Usage
const settings = await userSettings.getValue();
await userSettings.setValue({ theme: 'dark', notifications: false });

// Watch for changes
userSettings.watch((newValue) => {
  console.log('Settings changed:', newValue);
});
```

## Messaging

```typescript
// utils/messaging.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  getTabData(tabId: number): { title: string; url: string };
  toggleFeature(enabled: boolean): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

```typescript
// background.ts — handle messages
onMessage('getTabData', async ({ data: tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  return { title: tab.title ?? '', url: tab.url ?? '' };
});

// popup — send messages
const tabData = await sendMessage('getTabData', currentTabId);
```

## Build

```bash
npm run dev                # Chrome dev with HMR
npm run dev:firefox        # Firefox dev
npm run build              # Chrome production build
npm run build:firefox      # Firefox production build
npm run zip                # Build + create .zip for store submission
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use `chrome.*` APIs for cross-browser | Use `browser.*` (WXT polyfills automatically) |
| Manually write manifest.json | Use `wxt.config.ts` and file-based entrypoints |
| Import node modules in content scripts | Only browser-compatible code in entrypoints |
| Use `localStorage` in extensions | Use `wxt/storage` for cross-context persistence |
| Skip Shadow DOM for content UI | Use `createShadowRootUi` to isolate styles from the host page |
| Bundle heavy deps in content scripts | Keep content scripts lean — offload to background |
| Target only Chrome MV3 | Test with `dev:firefox` for cross-browser compatibility |
| Use untyped messaging | Use `defineExtensionMessaging` for type-safe communication |
