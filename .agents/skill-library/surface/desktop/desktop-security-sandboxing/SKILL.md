---
name: desktop-security-sandboxing
description: Security patterns for desktop applications covering file system sandboxing, IPC security, credential storage, context isolation, and framework-specific hardening for Electron and Tauri. Use when building desktop apps that handle sensitive data or need defense-in-depth.
version: 1.0.0
---

# Desktop Security & Sandboxing

Secure desktop applications against local attacks, privilege escalation, and data theft with defense-in-depth.

## File System Permissions and Sandboxing

Desktop apps often request unrestricted file system access. Minimize the attack surface.

| Approach | Scope | Use Case |
|----------|-------|----------|
| App sandbox (macOS) | App can only access its container + user-granted files | Mac App Store apps, Tauri |
| Flatpak sandbox | App isolated with portal-based file access | Linux distribution via Flathub |
| Custom restricted paths | App only reads/writes within `userData` directory | Self-contained apps |
| User-granted access | App requests specific files via native dialog | Document-based apps |

```typescript
// Electron - Restrict file access to specific directories
import { app } from 'electron';
import path from 'path';

const ALLOWED_DIRS = [
  app.getPath('userData'),     // App data directory
  app.getPath('temp'),         // Temporary files
  app.getPath('downloads'),    // Only if user explicitly grants via dialog
];

function isPathAllowed(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  return ALLOWED_DIRS.some((dir) => resolved.startsWith(dir));
}

// Always validate paths before file operations
function safeReadFile(filePath: string): Buffer {
  if (!isPathAllowed(filePath)) {
    throw new Error(`Access denied: ${filePath} is outside allowed directories`);
  }
  return fs.readFileSync(filePath);
}
```

**Anti-pattern**: Accepting arbitrary file paths from the renderer process without validation. A compromised renderer could read `/etc/passwd` or `~/.ssh/id_rsa`.

## IPC Security (Main/Renderer in Electron)

The main process has full Node.js access. The renderer process should be treated as untrusted.

### The Security Architecture

```
┌─────────────────────────────────────┐
│  Renderer (Untrusted)               │
│  - No Node.js access                │
│  - No direct fs/net/child_process   │
│  - Communicates only via preload    │
│                                     │
│  window.api.saveFile(data)          │
│           │                         │
└───────────┼─────────────────────────┘
            │ contextBridge
┌───────────┼─────────────────────────┐
│  Preload Script (Bridge)            │
│  - Exposes specific, typed APIs     │
│  - Validates arguments              │
│  - No raw IPC exposure              │
│                                     │
│  ipcRenderer.invoke('save-file',    │
│    validated(data))                  │
│           │                         │
└───────────┼─────────────────────────┘
            │ IPC
┌───────────┼─────────────────────────┐
│  Main Process (Trusted)             │
│  - Full Node.js access              │
│  - Validates all IPC inputs again   │
│  - Executes file system operations  │
│                                     │
│  ipcMain.handle('save-file',        │
│    handler)                         │
└─────────────────────────────────────┘
```

```typescript
// preload.ts - Expose ONLY specific, validated APIs
import { contextBridge, ipcRenderer } from 'electron';

// Never expose ipcRenderer.send or ipcRenderer.on directly
contextBridge.exposeInMainWorld('api', {
  // Each method is a specific, typed operation
  saveFile: (content: string, name: string): Promise<boolean> => {
    if (typeof content !== 'string' || typeof name !== 'string') {
      throw new Error('Invalid arguments');
    }
    if (name.includes('..') || name.includes('/')) {
      throw new Error('Invalid filename');
    }
    return ipcRenderer.invoke('save-file', { content, name });
  },

  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-version');
  },

  onUpdateAvailable: (callback: (version: string) => void) => {
    const handler = (_event: unknown, version: string) => callback(version);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
});
```

```typescript
// main.ts - Validate all inputs from renderer
import { ipcMain } from 'electron';
import { z } from 'zod';

const SaveFileSchema = z.object({
  content: z.string().max(10_000_000), // 10MB limit
  name: z.string().regex(/^[a-zA-Z0-9._-]+$/), // Alphanumeric only
});

ipcMain.handle('save-file', async (_event, args: unknown) => {
  const parsed = SaveFileSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  const filePath = path.join(app.getPath('userData'), parsed.data.name);
  await fs.promises.writeFile(filePath, parsed.data.content, 'utf-8');
  return true;
});
```

**Anti-pattern**: `contextBridge.exposeInMainWorld('electron', { ipcRenderer })` -- this gives the renderer full IPC access, defeating the purpose of context isolation.

## Context Isolation

Context isolation prevents the renderer's JavaScript from accessing Electron internals or the preload script's scope.

```typescript
// BrowserWindow configuration - security defaults
const mainWindow = new BrowserWindow({
  webPreferences: {
    // MANDATORY security settings
    contextIsolation: true,        // Isolate preload from renderer
    nodeIntegration: false,        // No Node.js in renderer
    nodeIntegrationInWorker: false,
    sandbox: true,                 // OS-level process sandbox

    // Additional hardening
    webSecurity: true,             // Enforce same-origin policy
    allowRunningInsecureContent: false,
    experimentalFeatures: false,

    preload: path.join(__dirname, 'preload.js'),
  },
});

// Block navigation to untrusted URLs
mainWindow.webContents.on('will-navigate', (event, url) => {
  const allowed = ['https://myapp.example.com'];
  if (!allowed.some((origin) => url.startsWith(origin))) {
    event.preventDefault();
    console.warn(`Blocked navigation to: ${url}`);
  }
});

// Block new window creation
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  // Open external links in the default browser
  if (url.startsWith('https://')) {
    shell.openExternal(url);
  }
  return { action: 'deny' }; // Never allow new Electron windows from renderer
});
```

## CSP for Desktop Apps

```typescript
// Electron - Set Content Security Policy via headers
import { session } from 'electron';

session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        [
          "default-src 'self'",
          "script-src 'self'",          // No inline scripts, no eval
          "style-src 'self' 'unsafe-inline'", // Allow inline styles (React)
          "img-src 'self' data: https:",
          "font-src 'self'",
          "connect-src 'self' https://api.example.com wss://ws.example.com",
          "frame-src 'none'",           // No iframes
          "object-src 'none'",          // No plugins
          "base-uri 'self'",
        ].join('; '),
      ],
    },
  });
});
```

**Rule**: Desktop CSP should be as strict as web CSP. Electron apps are web apps with elevated privileges, making CSP even more important.

## Credential Storage

Never store passwords, tokens, or API keys in plain text files. Use the OS keychain.

| Platform | System | API |
|----------|--------|-----|
| macOS | Keychain | `SecItemAdd` / `SecItemCopyMatching` |
| Windows | Credential Manager | `CredWrite` / `CredRead` |
| Linux | libsecret (GNOME Keyring / KWallet) | `secret_password_store` / `secret_password_lookup` |

```typescript
// Cross-platform credential storage via keytar
import keytar from 'keytar';

const SERVICE_NAME = 'com.example.myapp';

async function storeCredential(account: string, password: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, account, password);
}

async function getCredential(account: string): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, account);
}

async function deleteCredential(account: string): Promise<boolean> {
  return keytar.deletePassword(SERVICE_NAME, account);
}

// Store OAuth tokens securely
async function storeAuthTokens(tokens: AuthTokens): Promise<void> {
  await keytar.setPassword(
    SERVICE_NAME,
    'auth-tokens',
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    })
  );
}

async function getAuthTokens(): Promise<AuthTokens | null> {
  const stored = await keytar.getPassword(SERVICE_NAME, 'auth-tokens');
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthTokens;
  } catch {
    await keytar.deletePassword(SERVICE_NAME, 'auth-tokens');
    return null;
  }
}
```

**Anti-pattern**: Storing tokens in `localStorage`, `electron-store`, or JSON files in `userData`. These are readable by any process with file system access.
**Anti-pattern**: Storing encryption keys alongside encrypted data. The key must be in the OS keychain, the data in the app directory.

## Preventing Local Privilege Escalation

```typescript
// Never run shell commands with user-controlled input
import { exec } from 'child_process'; // AVOID
import { execFile } from 'child_process'; // PREFER

// BAD: shell injection via user input
exec(`convert ${userInput} output.png`); // userInput: "file.png; rm -rf /"

// GOOD: execFile does not spawn a shell
execFile('convert', [userInput, 'output.png']); // Arguments are passed directly

// GOOD: validate all arguments
const ALLOWED_FORMATS = ['png', 'jpg', 'webp'] as const;

function convertImage(inputPath: string, format: string): Promise<void> {
  // Validate format against allowlist
  if (!ALLOWED_FORMATS.includes(format as any)) {
    throw new Error(`Invalid format: ${format}`);
  }

  // Validate path is within allowed directory
  const resolved = path.resolve(inputPath);
  if (!resolved.startsWith(app.getPath('userData'))) {
    throw new Error('Path outside allowed directory');
  }

  return new Promise((resolve, reject) => {
    execFile('convert', [resolved, `output.${format}`], (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
```

## Update Verification

```typescript
// Verify update signatures before installing
import { autoUpdater } from 'electron-updater';

// electron-updater verifies signatures automatically when configured
// For custom update servers, verify manually:

import crypto from 'crypto';

function verifyUpdateSignature(
  updatePath: string,
  signature: string,
  publicKey: string
): boolean {
  const fileBuffer = fs.readFileSync(updatePath);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(fileBuffer);
  return verifier.verify(publicKey, signature, 'base64');
}

// Reject updates from non-HTTPS sources
autoUpdater.on('error', (error) => {
  if (error.message.includes('net::ERR_SSL')) {
    console.error('Update download failed SSL verification - aborting');
    // Do NOT fall back to HTTP
  }
});
```

## Electron-Specific Security Checklist

| Setting | Required Value | Why |
|---------|---------------|-----|
| `contextIsolation` | `true` | Prevents renderer from accessing Node.js via preload |
| `nodeIntegration` | `false` | No Node.js in renderer process |
| `sandbox` | `true` | OS-level process sandboxing |
| `webSecurity` | `true` | Enforces same-origin policy |
| `allowRunningInsecureContent` | `false` | No HTTP resources on HTTPS pages |
| `enableRemoteModule` | `false` (removed in v14+) | Remote module bypasses IPC security |
| `webviewTag` | `false` (unless needed) | Webviews are hard to secure |

## Tauri Security Model Comparison

Tauri provides stronger security defaults than Electron:

| Feature | Electron | Tauri |
|---------|----------|-------|
| Renderer access | Full web API, optional Node.js | Web API only, no Node.js |
| Backend communication | IPC (main process is Node.js) | Commands (backend is Rust) |
| File system access | Unrestricted (main process) | Scoped to allowlisted paths |
| Shell commands | `child_process` (unrestricted) | `shell.execute` with allowlist |
| HTTP requests | Unrestricted | Scoped to allowlisted URLs |
| Auto-update | Signature optional | Signature mandatory |
| Binary size | ~150MB+ | ~5-10MB |

```rust
// Tauri - Scoped file system access (tauri.conf.json)
{
  "tauri": {
    "allowlist": {
      "fs": {
        "scope": ["$APPDATA/*", "$DOWNLOAD/*"],
        "readFile": true,
        "writeFile": true,
        "readDir": false,
        "createDir": false,
        "removeFile": false
      },
      "shell": {
        "scope": [
          {
            "name": "open-url",
            "cmd": "open",
            "args": [{ "validator": "\\S+" }]
          }
        ]
      },
      "http": {
        "scope": ["https://api.example.com/*"]
      }
    }
  }
}
```

## Output Checklist

- [ ] Context isolation enabled, nodeIntegration disabled, sandbox enabled
- [ ] IPC APIs are specific, typed, and validate all inputs on both sides
- [ ] No raw `ipcRenderer` exposed to renderer process
- [ ] CSP headers set (no unsafe-eval, no unsafe-inline for scripts)
- [ ] Credentials stored in OS keychain (not files or localStorage)
- [ ] File paths validated against allowlisted directories
- [ ] No shell command execution with user-controlled input
- [ ] Navigation restricted to trusted origins
- [ ] New window creation blocked (external links open in default browser)
- [ ] Update signatures verified before installation
- [ ] Updates served over HTTPS only
- [ ] Renderer cannot access arbitrary file system paths
