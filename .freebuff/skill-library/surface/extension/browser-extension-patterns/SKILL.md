---
name: browser-extension-patterns
description: Browser extension development patterns covering Manifest V3, content scripts, service workers, message passing, storage, permissions, cross-browser compatibility, and store submission. Use when building Chrome, Firefox, or Safari browser extensions.
version: 1.0.0
---

# Browser Extension Patterns

Build browser extensions that work across Chrome, Firefox, and Safari with Manifest V3, minimal permissions, and reliable background processing.

## Manifest V3

Manifest V3 (MV3) is required for Chrome extensions and supported by Firefox and Safari. Key changes from V2:

| Feature | Manifest V2 | Manifest V3 |
|---------|-------------|-------------|
| Background | Persistent background page | Service worker (event-driven) |
| Remote code | `eval()`, remote scripts allowed | Blocked entirely |
| Network requests | `webRequest` blocking | `declarativeNetRequest` rules |
| Content Security | Relaxed CSP | Strict CSP, no `unsafe-eval` |
| Host permissions | In `permissions` | Separate `host_permissions` |
| Action | `browser_action` / `page_action` | Unified `action` |

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "A useful browser extension",
  "permissions": [
    "storage",
    "activeTab",
    "contextMenus"
  ],
  "host_permissions": [
    "https://api.example.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

**Rule**: Request the minimum permissions needed. `"<all_urls>"` triggers a scary permission prompt and slows review.
**Rule**: Use `activeTab` instead of broad host permissions when you only need access to the current tab on user action.

## Content Scripts vs Background Service Workers

### Content Scripts

Run in the context of web pages. They can read and modify the DOM but have a separate JavaScript environment.

```typescript
// content.ts - Runs in the context of matching web pages
// Has access to DOM but NOT to extension APIs directly

// Inject UI into the page
function injectSidebar() {
  const container = document.createElement('div');
  container.id = 'my-extension-sidebar';
  container.attachShadow({ mode: 'closed' }); // Shadow DOM to avoid CSS conflicts

  const shadow = container.shadowRoot!;
  const style = document.createElement('style');
  style.textContent = `
    :host {
      position: fixed;
      right: 0;
      top: 0;
      width: 350px;
      height: 100vh;
      z-index: 2147483647;
      font-family: system-ui, sans-serif;
    }
  `;
  shadow.appendChild(style);

  const app = document.createElement('div');
  app.className = 'extension-app';
  shadow.appendChild(app);

  document.body.appendChild(container);
  return app;
}

// Read page content
function extractPageData(): PageData {
  return {
    title: document.title,
    url: window.location.href,
    selectedText: window.getSelection()?.toString() || '',
    metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
  };
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_DATA') {
    sendResponse(extractPageData());
    return true; // Keep channel open for async response
  }

  if (message.type === 'HIGHLIGHT_TEXT') {
    highlightText(message.query);
    sendResponse({ success: true });
  }
});
```

**Rule**: Use Shadow DOM when injecting UI to prevent CSS conflicts with the host page.
**Rule**: Content scripts cannot use most `chrome.*` APIs directly. Use message passing to communicate with the service worker.

### Background Service Worker

```typescript
// background.ts - Event-driven service worker
// Has access to ALL extension APIs but NO DOM access

// Service workers are ephemeral -- they start on events and stop when idle
// NEVER rely on global state persisting between events

// Use chrome.storage instead of global variables
async function getState<T>(key: string, defaultValue: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T) ?? defaultValue;
}

async function setState<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// Extension install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First install: set defaults, show onboarding
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    await chrome.tabs.create({ url: 'onboarding.html' });
  }

  if (details.reason === 'update') {
    // Migration on update
    await migrateStorage(details.previousVersion!);
  }

  // Register context menu items
  chrome.contextMenus.create({
    id: 'save-selection',
    title: 'Save to My Extension',
    contexts: ['selection'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-selection' && info.selectionText) {
    await saveSelection({
      text: info.selectionText,
      url: tab?.url || '',
      timestamp: Date.now(),
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_DATA') {
    // Service worker can make cross-origin requests
    fetchData(message.url)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Required for async sendResponse
  }
});
```

**Anti-pattern**: Storing state in global variables in the service worker. Service workers are terminated after ~30 seconds of inactivity. Use `chrome.storage.local` or `chrome.storage.session`.

## Message Passing Architecture

```
┌─────────────┐    chrome.runtime.sendMessage     ┌──────────────────┐
│ Content      │ ──────────────────────────────→   │ Background       │
│ Script       │ ←──────────────────────────────   │ Service Worker   │
│              │    sendResponse / chrome.tabs.    │                  │
└─────────────┘    sendMessage                     └──────────────────┘
                                                         ↑↓
┌─────────────┐    chrome.runtime.sendMessage     ┌──────────────────┐
│ Popup /      │ ──────────────────────────────→   │ Background       │
│ Side Panel   │ ←──────────────────────────────   │ Service Worker   │
└─────────────┘    sendResponse                    └──────────────────┘
```

```typescript
// Type-safe message passing
interface MessageMap {
  GET_PAGE_DATA: { request: void; response: PageData };
  SAVE_ITEM: { request: SaveItemPayload; response: { id: string } };
  GET_SETTINGS: { request: void; response: Settings };
  UPDATE_SETTINGS: { request: Partial<Settings>; response: Settings };
}

type MessageType = keyof MessageMap;

// Typed sender (from popup or content script)
async function sendMessage<T extends MessageType>(
  type: T,
  payload?: MessageMap[T]['request']
): Promise<MessageMap[T]['response']> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
}

// Typed handler (in background service worker)
function handleMessage<T extends MessageType>(
  type: T,
  handler: (payload: MessageMap[T]['request']) => Promise<MessageMap[T]['response']>
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== type) return;

    handler(message.payload)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ error: (error as Error).message }));

    return true; // Keep channel open for async response
  });
}

// Registration
handleMessage('GET_SETTINGS', async () => {
  return getState('settings', DEFAULT_SETTINGS);
});

handleMessage('SAVE_ITEM', async (payload) => {
  const id = await saveToStorage(payload);
  return { id };
});
```

## Storage APIs

| API | Scope | Limit | Sync |
|-----|-------|-------|------|
| `chrome.storage.local` | Per device | 10 MB (unlimitedStorage: unlimited) | No |
| `chrome.storage.sync` | Synced across signed-in browsers | 100 KB total, 8 KB per item | Yes |
| `chrome.storage.session` | Per browser session, cleared on close | 10 MB | No |

```typescript
// Storage with type safety and defaults
interface StorageSchema {
  settings: Settings;
  savedItems: SavedItem[];
  lastSyncTimestamp: number;
}

const STORAGE_DEFAULTS: StorageSchema = {
  settings: { theme: 'system', language: 'en', notifications: true },
  savedItems: [],
  lastSyncTimestamp: 0,
};

async function getStorage<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as StorageSchema[K]) ?? STORAGE_DEFAULTS[key];
}

async function setStorage<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// Listen for storage changes (reactive)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`Storage ${key} changed:`, oldValue, '->', newValue);
  }
});
```

## Permission Model

```typescript
// Request optional permissions at runtime (better UX than upfront)
async function requestHostPermission(origin: string): Promise<boolean> {
  return chrome.permissions.request({
    origins: [`${origin}/*`],
  });
}

// Check if permission is granted before using it
async function hasPermission(permission: string): Promise<boolean> {
  return chrome.permissions.contains({
    permissions: [permission],
  });
}

// manifest.json - Declare optional permissions
// "optional_permissions": ["tabs", "bookmarks", "history"],
// "optional_host_permissions": ["https://*.github.com/*"]
```

**Rule**: Use `optional_permissions` for features the user may not need. Request them when the user activates the feature, not at install time.

## Popup vs Side Panel vs Content Injection

| Surface | Lifecycle | Best For |
|---------|-----------|----------|
| Popup | Opens on icon click, closes on blur | Quick actions, status display |
| Side Panel (Chrome 114+) | Persistent panel alongside page | Reference tools, note-taking |
| Content script injection | Runs on matching pages | Page augmentation, overlays |
| Options page | Separate tab/window | Settings, configuration |
| DevTools panel | Inside DevTools | Developer tools, debugging |

```typescript
// Side Panel registration (Chrome 114+)
// manifest.json: "side_panel": { "default_path": "sidepanel.html" }

// Open side panel programmatically
chrome.sidePanel.setOptions({
  tabId: tab.id,
  path: 'sidepanel.html',
  enabled: true,
});

// Open side panel on action click instead of popup
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});
```

## Cross-Browser Compatibility

| API | Chrome | Firefox | Safari |
|-----|--------|---------|--------|
| Namespace | `chrome.*` | `browser.*` (Promise-based) or `chrome.*` | `browser.*` |
| Service worker | Yes (MV3) | Yes (MV3, Firefox 109+) | Yes (MV3, Safari 15.4+) |
| Side panel | Yes (Chrome 114+) | No | No |
| `declarativeNetRequest` | Yes | Yes (Firefox 113+) | Yes |
| `offscreen` document | Yes | No | No |

```typescript
// Cross-browser compatibility layer
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Promisify Chrome callback APIs for consistency
function promisify<T>(fn: (...args: any[]) => void, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(...args, (result: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

// Or use webextension-polyfill for automatic Promise wrapping
// import browser from 'webextension-polyfill';
```

## CSP Restrictions for Extensions

MV3 enforces strict CSP. You cannot:

- Use `eval()` or `new Function()`
- Load remote scripts (`<script src="https://...">`)
- Use inline scripts (`<script>alert('hi')</script>`)
- Use inline event handlers (`<button onclick="...">`)

```json
// manifest.json - Extension CSP (MV3 defaults, cannot be relaxed for scripts)
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Rule**: All JavaScript must be bundled and shipped with the extension. No CDN scripts, no dynamic code generation.
**Workaround**: For sandboxed pages that need `eval()` (e.g., template engines), use the `sandbox` key in manifest to create sandboxed pages with relaxed CSP, communicating via `postMessage`.

## Web Store Review Requirements

### Chrome Web Store

| Requirement | Details |
|------------|---------|
| Manifest V3 | Required for new submissions as of 2024 |
| Single purpose | Extension must have one clear, well-defined purpose |
| Privacy policy | Required if collecting user data |
| Permissions justification | Must justify every permission in the review form |
| Data use disclosure | Must declare what data is collected and why |
| No obfuscated code | All code must be human-readable (minified is OK, obfuscated is not) |
| Review time | 1-3 business days (first submission may take longer) |

### Firefox Add-ons (AMO)

| Requirement | Details |
|------------|---------|
| Source code | May be requested for review (provide build instructions) |
| No remote code | Same as Chrome MV3 |
| Privacy policy | Required for data-collecting extensions |
| Review time | Auto-review for many, manual review 1-7 days |

## Extension Debugging

```typescript
// Background service worker debugging
// Chrome: chrome://extensions > "Service worker" link > DevTools
// Firefox: about:debugging > This Firefox > your extension

// Content script debugging
// Chrome DevTools > Sources > Content Scripts folder

// Reload extension during development
chrome.management.getSelf((info) => {
  console.log('Extension ID:', info.id);
  console.log('Version:', info.version);
});

// Development-only: auto-reload on file changes
// Use web-ext (Firefox) or Chrome Extension Reloader
```

```bash
# Firefox: web-ext for development
npx web-ext run --source-dir=./dist --target=firefox-desktop

# Chrome: load unpacked in chrome://extensions with Developer Mode enabled
```

## Output Checklist

- [ ] Manifest V3 with minimal required permissions
- [ ] Optional permissions requested at runtime when feature is activated
- [ ] Content scripts use Shadow DOM for injected UI
- [ ] Service worker does not rely on global state
- [ ] Message passing is type-safe with consistent request/response format
- [ ] Storage uses `chrome.storage` (not `localStorage`)
- [ ] Cross-browser compatibility via polyfill or abstraction layer
- [ ] No remote code, no `eval()`, no inline scripts
- [ ] Privacy policy provided for data-collecting features
- [ ] Extension tested on Chrome, Firefox, and Safari
- [ ] Icons provided at 16, 32, 48, and 128px sizes
- [ ] Single clear purpose documented in description
