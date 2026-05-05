---
name: chrome-extension
description: "Expert browser extension guide covering Manifest V3 architecture (service workers, content scripts, popup, sidepanel, options), Chrome APIs (storage, tabs, messaging, alarms, permissions), WXT framework (file-based entrypoints, HMR, multi-browser builds), content script isolation (Shadow DOM, ISOLATED/MAIN worlds), cross-browser compatibility, and Chrome Web Store submission. Use when building browser extensions for Chrome, Firefox, Edge, or Safari."
version: 1.0.0
---

# Browser Extension Expert Guide

> Use this skill when building browser extensions targeting Chrome (Manifest V3), Firefox, Edge, or Safari. Covers both raw MV3 APIs and the WXT framework.

## When to Use This Skill

- Building Chrome/Firefox/Edge/Safari extensions
- Designing extension architecture (background, content scripts, popup)
- Implementing content script ↔ background messaging
- Injecting UI into third-party web pages
- Working with Chrome APIs (storage, tabs, alarms)
- Setting up WXT or Plasmo for modern DX

## When NOT to Use This Skill

- Web applications → use frontend framework skills
- Mobile apps → use React Native or Flutter
- Desktop apps → use Tauri or Electron
- Userscripts → use Tampermonkey (no extension needed)

---

## 1. Architecture Overview (CRITICAL)

### Manifest V3 Components

```
Extension
├── Service Worker (background.ts)     — Event-driven, no DOM access
├── Content Scripts (content.ts)       — Injected into web pages, DOM access
├── Popup (popup.html/tsx)             — Toolbar icon click UI
├── Options Page (options.html/tsx)    — Extension settings UI
├── Side Panel (sidepanel.html/tsx)    — Chrome 114+ sidebar UI
├── DevTools Panel (devtools.html/tsx) — Developer tools panel
└── manifest.json                      — Permissions, entrypoints, metadata
```

| Component | DOM Access | Web APIs | Extension APIs | Lifecycle |
|-----------|-----------|----------|---------------|-----------|
| Service Worker | ❌ | Fetch, WebSocket | Full | Event-driven, terminates idle |
| Content Script | ✅ (host page) | Limited | `runtime`, `storage` | Per-page injection |
| Popup | ✅ (own DOM) | Full | Full | Opens/closes with click |
| Options | ✅ (own DOM) | Full | Full | Persistent tab |
| Side Panel | ✅ (own DOM) | Full | Full | Persistent sidebar |

### WXT Project Structure (Recommended)

```
entrypoints/
├── background.ts          — Service worker
├── content.ts             — Content script (main world: ISOLATED)
├── content/               — Content script with UI
│   ├── index.ts
│   └── App.tsx            — React/Vue/Svelte component
├── popup/                 — Popup page
│   ├── index.html
│   └── main.tsx
├── options/               — Options page
│   ├── index.html
│   └── main.tsx
└── sidepanel/             — Side panel (Chrome only)
    ├── index.html
    └── main.tsx
components/                — Shared UI components
utils/                     — Shared utilities
assets/                    — Icons, images
wxt.config.ts              — WXT configuration
```

---

## 2. WXT Framework Patterns

### Background (Service Worker)

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  console.log('Extension installed!', { id: browser.runtime.id });

  // Message handler
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_DATA') {
      fetchData().then(sendResponse);
      return true; // Keep channel open for async response
    }
    sendResponse({ success: true });
  });

  // Periodic tasks via alarms (NOT setInterval — service workers terminate)
  browser.alarms.create('sync-data', { periodInMinutes: 30 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'sync-data') {
      syncData();
    }
  });

  // First install / update handler
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
    }
  });
});
```

> **Critical**: Service workers terminate after ~30s idle. Use `browser.alarms` instead of `setInterval`. No persistent state — use `chrome.storage`.

### Content Script

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['*://*.example.com/*'],
  runAt: 'document_idle',
  world: 'ISOLATED',  // Default — can't access page JS variables

  main(ctx) {
    console.log('Content script loaded on:', window.location.href);

    // Send message to background
    const response = await browser.runtime.sendMessage({ type: 'GET_DATA' });

    // Watch for page changes (SPA support)
    const observer = new MutationObserver((mutations) => {
      // React to DOM changes
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup when extension context invalidated (HMR, update)
    ctx.onInvalidated(() => {
      observer.disconnect();
    });
  },
});
```

### Content Script with UI (Shadow DOM)

```typescript
// entrypoints/content/index.ts
import './style.css';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'my-extension-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const app = document.createElement('div');
        app.textContent = 'Hello from extension!';
        container.append(app);
        return app;
      },
      onRemove: (app) => {
        app?.remove();
      },
    });

    ui.mount();
  },
});
```

> **Rule**: Always use Shadow DOM for content script UI. Prevents CSS conflicts with the host page.

### Popup

```typescript
// entrypoints/popup/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    // Read from extension storage
    browser.storage.local.get('savedData').then((result) => {
      setData(result.savedData);
    });
  }, []);

  const handleAction = async () => {
    // Send message to background
    const response = await browser.runtime.sendMessage({ type: 'DO_ACTION' });
    console.log('Response:', response);
  };

  return (
    <div style={{ width: 350, padding: 16 }}>
      <h1>My Extension</h1>
      <button onClick={handleAction}>Do Action</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Popup />);
```

---

## 3. Chrome APIs (CRITICAL)

### Storage

```typescript
// ✅ Use chrome.storage, NOT localStorage (not available in service worker)

// chrome.storage.local — extension-only, no size limit (with permission)
await browser.storage.local.set({ key: 'value', settings: { theme: 'dark' } });
const result = await browser.storage.local.get(['key', 'settings']);

// chrome.storage.sync — synced across user's Chrome instances (100KB limit)
await browser.storage.sync.set({ preferences: { notifications: true } });

// Watch for changes (works in ALL contexts)
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.key) {
    console.log('key changed:', changes.key.oldValue, '→', changes.key.newValue);
  }
});
```

### Tabs

```typescript
// Query tabs
const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

// Execute script in tab
await browser.scripting.executeScript({
  target: { tabId: activeTab.id! },
  func: () => document.title,
});

// Listen for tab events
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Tab finished loading
  }
});
```

### Message Passing

```typescript
// Content Script → Background
const response = await browser.runtime.sendMessage({
  type: 'FETCH_DATA',
  payload: { url: window.location.href },
});

// Background → Content Script (specific tab)
await browser.tabs.sendMessage(tabId, {
  type: 'UPDATE_UI',
  payload: { highlight: true },
});

// Long-lived connection
const port = browser.runtime.connect({ name: 'sidebar' });
port.onMessage.addListener((msg) => { /* handle */ });
port.postMessage({ type: 'SUBSCRIBE' });
```

### Permissions

```json
{
  "permissions": ["storage", "alarms", "activeTab"],
  "optional_permissions": ["tabs", "history"],
  "host_permissions": ["*://*.example.com/*"]
}
```

| Permission | Use | Principle |
|-----------|-----|-----------|
| `activeTab` | Access current tab on click | ✅ Minimal — no warning |
| `tabs` | Query all tabs (titles, URLs) | ⚠️ Shows "read browsing history" |
| `host_permissions` | Inject into specific sites | ⚠️ "Read/change data on sites" |
| `<all_urls>` | Inject into all sites | 🔴 Max warning — avoid if possible |
| `storage` | Extension storage | ✅ No warning |

> **Rule**: Request `optional_permissions` at runtime when needed. Fewer install-time permissions = higher install rate.

---

## 4. WXT Configuration

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],  // or vue, svelte, solid
  manifest: {
    name: 'My Extension',
    description: 'A useful browser extension',
    permissions: ['storage', 'activeTab', 'alarms'],
    host_permissions: ['*://*.example.com/*'],
    action: {
      default_title: 'Click to open',
    },
  },
  // Multi-browser support
  runner: {
    startUrls: ['https://example.com'],
  },
});
```

### Build Commands

```bash
# Development with HMR
wxt dev                    # Chrome
wxt dev -b firefox         # Firefox

# Production build
wxt build                  # Chrome MV3
wxt build -b firefox       # Firefox MV2/MV3
wxt build -b safari        # Safari

# Create distributable zip
wxt zip                    # For Chrome Web Store
wxt zip -b firefox         # For Firefox Add-ons
```

---

## 5. Cross-Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Manifest V3 | ✅ Required | ✅ Supported | ✅ Required | ✅ Required |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Side Panel | ✅ (114+) | ❌ | ❌ | ✅ |
| `browser.*` API | ✅ (via polyfill) | ✅ Native | ✅ | ✅ (via polyfill) |
| Promise-based APIs | ✅ (MV3) | ✅ Native | ✅ | ✅ |

> WXT handles browser polyfills automatically. Use `browser.*` namespace (not `chrome.*`).

---

## 6. Common Anti-Patterns

1. **Using `setInterval` in service worker** — service workers terminate; use `browser.alarms`
2. **`localStorage` in background** — not available; use `browser.storage.local`
3. **Injecting CSS without Shadow DOM** — conflicts with host page styles
4. **Requesting `<all_urls>` by default** — scary permission dialog; use `activeTab` + optional permissions
5. **Not handling `context invalidated`** — content scripts break on extension update; use `ctx.onInvalidated()`
6. **Storing sensitive data in `chrome.storage`** — it's unencrypted; never store raw API keys
7. **Blocking popup render on async calls** — show loading state, fetch async
8. **Not testing in Firefox** — MV3 differences exist; test in both browsers
9. **Ignoring Content Security Policy** — MV3 forbids remote code; all JS must be bundled

---

## References

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate)
- [WXT Framework](https://wxt.dev/)
- [Firefox Extension Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Chrome Web Store Publishing](https://developer.chrome.com/docs/webstore/publish/)
