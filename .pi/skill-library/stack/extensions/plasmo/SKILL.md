---
name: plasmo
description: "Plasmo browser extension framework patterns covering project setup, content scripts, popup/options pages, messaging, storage, and manifest configuration. Use when building browser extensions with Plasmo."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Plasmo

React-first browser extension framework. Automatic manifest generation, HMR, content script injection, and built-in messaging between extension contexts.

## When to Use

- Building browser extensions with React/TypeScript
- Want automatic manifest.json generation from code
- Need HMR for extension development
- Building extensions with content scripts, popups, or sidepanels

## When NOT to Use

- Building a vanilla JS extension (use WXT or raw manifest)
- Need framework-agnostic extension development (use WXT)
- Building Firefox-only extensions (Plasmo is Chrome-first)

## Setup

```bash
pnpm create plasmo          # Interactive setup
pnpm create plasmo my-ext   # Named project
pnpm create plasmo --with-tailwindcss  # With Tailwind
```

### Project Structure

```
src/
├── popup.tsx          # Popup page (auto-detected)
├── options.tsx        # Options page (auto-detected)
├── sidepanel.tsx      # Side panel (auto-detected)
├── background.ts      # Service worker (auto-detected)
├── content.tsx        # Content script (auto-detected)
├── contents/          # Multiple content scripts
│   ├── inline.tsx
│   └── overlay.tsx
└── tabs/              # Custom tab pages
    └── settings.tsx
```

## Popup

```tsx
// src/popup.tsx — auto-registered as popup
import { useState } from 'react';

function Popup() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ width: 300, padding: 16 }}>
      <h1>My Extension</h1>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
    </div>
  );
}

export default Popup;
```

## Content Scripts

```tsx
// src/content.tsx — injected into web pages
import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://example.com/*'],
  css: ['content.css'],
};

function ContentOverlay() {
  return (
    <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}>
      <button>Extension Active</button>
    </div>
  );
}

export default ContentOverlay;
```

### Inline Content Script (No React)

```typescript
// src/contents/injector.ts
import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://example.com/*'],
  run_at: 'document_end',
};

// Direct DOM manipulation
document.querySelectorAll('.ad-banner').forEach(el => el.remove());
```

## Background Service Worker

```typescript
// src/background.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id!, { action: 'toggle' });
});
```

## Messaging

```typescript
// src/background/messages/getData.ts
import type { PlasmoMessaging } from '@plasmohq/messaging';

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const data = await fetch('https://api.example.com/data');
  res.send({ data: await data.json() });
};

export default handler;
```

```tsx
// src/popup.tsx — call the message handler
import { sendToBackground } from '@plasmohq/messaging';

const response = await sendToBackground({ name: 'getData', body: { query: 'test' } });
console.log(response.data);
```

## Storage

```typescript
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

// Set/get
await storage.set('theme', 'dark');
const theme = await storage.get('theme');

// React hook
import { useStorage } from '@plasmohq/storage/hook';

function Options() {
  const [theme, setTheme] = useStorage('theme', 'light');
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme}</button>;
}
```

## Environment Variables

```env
# .env.development
PLASMO_PUBLIC_API_URL=http://localhost:3000
# .env.production
PLASMO_PUBLIC_API_URL=https://api.example.com
```

```tsx
// Use in code — only PLASMO_PUBLIC_ vars are accessible
const apiUrl = process.env.PLASMO_PUBLIC_API_URL;
```

## Build & Publish

```bash
pnpm dev              # Development with HMR
pnpm build            # Production build -> build/chrome-mv3-prod
pnpm build --target=firefox-mv2  # Firefox build
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Manually create manifest.json | Let Plasmo auto-generate it from your code structure |
| Use `chrome.storage` directly | Use `@plasmohq/storage` for a consistent API with React hooks |
| Use `chrome.runtime.sendMessage` | Use `@plasmohq/messaging` for type-safe message handlers |
| Put secrets in content scripts | Content scripts run in page context — use background for API keys |
| Import node modules in content scripts | Content scripts run in browser — use browser-compatible code |
| Skip permissions in `package.json` | Declare permissions in `package.json` under `manifest.permissions` |
| Use MV2 for new Chrome extensions | Target MV3 (Plasmo default) unless you need MV2 features |
| Bundle large dependencies in content scripts | Keep content scripts small — offload work to background |
