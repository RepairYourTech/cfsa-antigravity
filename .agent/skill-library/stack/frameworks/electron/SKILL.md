---
name: electron
description: Provides comprehensive Electron desktop application development patterns including main/renderer process architecture, IPC communication (ipcMain, ipcRenderer, contextBridge), preload scripts, security best practices, BrowserWindow management, auto-updater, native menus, system tray, file dialogs, protocol handlers, Electron Forge and electron-builder, performance optimization, memory management, crash reporting, and testing strategies. Use when building cross-platform desktop apps with Electron.
version: 1.0.0
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Electron Desktop Application Development Patterns

## Overview

Expert guide for building cross-platform desktop applications with Electron. Covers the multi-process architecture, secure IPC communication, window management, native OS integration, packaging, performance optimization, and testing. Targets Electron 30+ with modern security defaults.

## When to Use

- Building cross-platform desktop applications (Windows, macOS, Linux)
- When you need full Node.js access for backend operations
- When Chromium rendering consistency across platforms matters
- When the team has strong JavaScript/TypeScript expertise
- Building apps that embed web content or wrap existing web apps
- When rich ecosystem of npm packages is an advantage
- Building IDEs, communication apps, media tools, or developer utilities

## Instructions

1. **Enable all security defaults**: contextIsolation, sandbox, no nodeIntegration
2. **Use preload scripts** for all main-to-renderer communication
3. **Validate all IPC messages** on both sides
4. **Use contextBridge** to expose a minimal, typed API
5. **Never load remote content** without strict CSP and webview sandboxing
6. **Manage window lifecycle** explicitly (remember bounds, handle close vs quit)
7. **Profile memory** regularly -- Electron apps are prone to leaks

## Examples

### Project Structure

```
my-electron-app/
  src/
    main/
      index.ts            # Main process entry
      ipc-handlers.ts     # IPC handler registration
      menu.ts             # Application menu
      tray.ts             # System tray
      updater.ts          # Auto-update logic
      windows/
        main-window.ts    # Main window factory
        settings-window.ts
    preload/
      index.ts            # Preload script
      api.ts              # contextBridge API definition
    renderer/
      index.html          # Entry HTML
      App.tsx             # React/Vue/Svelte app
      lib/
        electron-api.ts   # Typed wrapper for exposed API
  electron-builder.yml    # Build configuration
  forge.config.ts         # Electron Forge config (alternative)
  package.json
  tsconfig.json
```

## Constraints and Warnings

- **Bundle size**: Electron ships Chromium + Node.js (~150MB minimum)
- **Memory usage**: Each window is a separate Chromium process (50-100MB+)
- **Startup time**: Cold start can be 2-5 seconds depending on app complexity
- **Security surface**: Node.js in main process has full system access
- **Update complexity**: Auto-updates require code signing on macOS and Windows
- **macOS notarization**: Required for distribution outside the App Store
- **Native modules**: Must be rebuilt for Electron's Node.js version
- **Chromium version**: Locked to Electron's bundled version, not the user's browser

## Core Concepts

### Process Architecture

Electron has two types of processes:

```
Main Process (Node.js)
  - Runs in Node.js environment
  - Has full system access (file system, network, OS APIs)
  - Creates and manages BrowserWindows
  - Handles IPC from renderer processes
  - Manages app lifecycle, menus, tray, dialogs

Renderer Process (Chromium)
  - Runs in a Chromium browser context
  - One process per BrowserWindow
  - No direct Node.js access (when properly configured)
  - Communicates with main process via IPC through preload

Preload Script (Bridge)
  - Runs before renderer page loads
  - Has access to a limited set of Node.js/Electron APIs
  - Uses contextBridge to expose safe API to renderer
  - The ONLY bridge between renderer and main process
```

### Main Process Entry Point

```typescript
// src/main/index.ts
import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc-handlers";
import { createMainWindow } from "./windows/main-window";
import { createAppMenu } from "./menu";
import { setupTray } from "./tray";
import { setupAutoUpdater } from "./updater";

// Handle single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Store reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

app.whenReady().then(async () => {
  // Register IPC handlers BEFORE creating windows
  registerIpcHandlers();

  // Create the main window
  mainWindow = createMainWindow();

  // Set up application menu
  createAppMenu();

  // Set up system tray
  setupTray(mainWindow);

  // Check for updates (production only)
  if (!app.isPackaged) {
    // Skip in development
  } else {
    setupAutoUpdater(mainWindow);
  }

  // macOS: re-create window when dock icon clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

// Handle second instance (single instance lock)
app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Quit when all windows closed (except macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Security: prevent new webview/window creation
app.on("web-contents-created", (_event, contents) => {
  // Prevent navigation to external URLs
  contents.on("will-navigate", (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== "http://localhost:5173") {
      event.preventDefault();
    }
  });

  // Prevent opening new windows
  contents.setWindowOpenHandler(({ url }) => {
    // Open external links in the default browser
    if (url.startsWith("https://")) {
      import("electron").then(({ shell }) => shell.openExternal(url));
    }
    return { action: "deny" };
  });
});
```

### BrowserWindow Management

```typescript
// src/main/windows/main-window.ts
import { BrowserWindow, screen } from "electron";
import path from "node:path";
import { getWindowState, saveWindowState } from "../window-state";

export function createMainWindow(): BrowserWindow {
  // Restore previous window position/size
  const savedState = getWindowState("main", {
    width: 1200,
    height: 800,
  });

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 800,
    minHeight: 600,
    title: "My Application",
    show: false, // Show after ready-to-show to prevent flash
    backgroundColor: "#1a1a2e",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      // Security defaults (Electron 30+)
      contextIsolation: true,  // MUST be true
      nodeIntegration: false,  // MUST be false
      sandbox: true,           // MUST be true
      webSecurity: true,       // MUST be true
      allowRunningInsecureContent: false,
    },
  });

  // Show when ready (prevents white flash)
  win.once("ready-to-show", () => {
    win.show();
  });

  // Save window state on close
  win.on("close", () => {
    saveWindowState("main", win.getBounds());
  });

  // Load the app
  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return win;
}
```

### Window State Persistence

```typescript
// src/main/window-state.ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

const stateFile = path.join(app.getPath("userData"), "window-state.json");

function loadStateFile(): Record<string, WindowState> {
  try {
    const data = fs.readFileSync(stateFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function getWindowState(
  key: string,
  defaults: WindowState
): WindowState {
  const states = loadStateFile();
  return states[key] || defaults;
}

export function saveWindowState(
  key: string,
  bounds: Electron.Rectangle
): void {
  const states = loadStateFile();
  states[key] = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
  fs.writeFileSync(stateFile, JSON.stringify(states, null, 2));
}
```

### Preload Script and contextBridge

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

// Define the API exposed to the renderer
const electronAPI = {
  // --- File Operations ---
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("file:read", filePath),

  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke("file:write", filePath, content),

  showOpenDialog: (
    options: Electron.OpenDialogOptions
  ): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke("dialog:open", options),

  showSaveDialog: (
    options: Electron.SaveDialogOptions
  ): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke("dialog:save", options),

  // --- App Info ---
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke("app:version"),

  getPlatform: (): NodeJS.Platform =>
    process.platform as NodeJS.Platform,

  // --- Window Controls ---
  minimizeWindow: (): void =>
    ipcRenderer.send("window:minimize"),

  maximizeWindow: (): void =>
    ipcRenderer.send("window:maximize"),

  closeWindow: (): void =>
    ipcRenderer.send("window:close"),

  // --- Events (main -> renderer) ---
  onUpdateAvailable: (callback: (version: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, version: string) =>
      callback(version);
    ipcRenderer.on("update:available", handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener("update:available", handler);
  },

  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) =>
      callback(action);
    ipcRenderer.on("menu:action", handler);
    return () => ipcRenderer.removeListener("menu:action", handler);
  },
};

// Expose to renderer via window.electronAPI
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// Export type for use in renderer
export type ElectronAPI = typeof electronAPI;
```

### IPC Handlers (Main Process)

```typescript
// src/main/ipc-handlers.ts
import { ipcMain, dialog, app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

export function registerIpcHandlers(): void {
  // --- File Operations ---
  ipcMain.handle(
    "file:read",
    async (_event, filePath: string): Promise<string> => {
      // Validate path to prevent directory traversal
      const resolved = path.resolve(filePath);
      if (!isAllowedPath(resolved)) {
        throw new Error("Access denied: path outside allowed directories");
      }
      return fs.readFile(resolved, "utf-8");
    }
  );

  ipcMain.handle(
    "file:write",
    async (_event, filePath: string, content: string): Promise<void> => {
      const resolved = path.resolve(filePath);
      if (!isAllowedPath(resolved)) {
        throw new Error("Access denied: path outside allowed directories");
      }
      await fs.writeFile(resolved, content, "utf-8");
    }
  );

  // --- Dialogs ---
  ipcMain.handle(
    "dialog:open",
    async (event, options: Electron.OpenDialogOptions) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) throw new Error("No window found");
      return dialog.showOpenDialog(win, options);
    }
  );

  ipcMain.handle(
    "dialog:save",
    async (event, options: Electron.SaveDialogOptions) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) throw new Error("No window found");
      return dialog.showSaveDialog(win, options);
    }
  );

  // --- App Info ---
  ipcMain.handle("app:version", () => app.getVersion());

  // --- Window Controls ---
  ipcMain.on("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on("window:maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    }
  });

  ipcMain.on("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}

// Security: validate file paths
function isAllowedPath(filePath: string): boolean {
  const userDataPath = app.getPath("userData");
  const documentsPath = app.getPath("documents");
  const allowedRoots = [userDataPath, documentsPath];

  return allowedRoots.some((root) => filePath.startsWith(root));
}
```

### Typed API in Renderer

```typescript
// src/renderer/lib/electron-api.ts
// Import the type from preload (build-time only, not runtime)
import type { ElectronAPI } from "../../preload/index";

// Augment the Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Re-export for convenient access
export const electronAPI = window.electronAPI;
```

```tsx
// src/renderer/App.tsx
import { useState, useEffect } from "react";
import { electronAPI } from "./lib/electron-api";

function App() {
  const [version, setVersion] = useState("");
  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    electronAPI.getAppVersion().then(setVersion);

    // Listen for menu actions
    const cleanup = electronAPI.onMenuAction((action) => {
      switch (action) {
        case "open-file":
          handleOpenFile();
          break;
        case "save-file":
          handleSaveFile();
          break;
      }
    });

    return cleanup;
  }, []);

  async function handleOpenFile() {
    const result = await electronAPI.showOpenDialog({
      filters: [
        { name: "Text Files", extensions: ["txt", "md"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });

    if (!result.canceled && result.filePaths[0]) {
      const content = await electronAPI.readFile(result.filePaths[0]);
      setFileContent(content);
    }
  }

  async function handleSaveFile() {
    const result = await electronAPI.showSaveDialog({
      filters: [{ name: "Text Files", extensions: ["txt"] }],
    });

    if (!result.canceled && result.filePath) {
      await electronAPI.writeFile(result.filePath, fileContent);
    }
  }

  return (
    <div>
      <header>
        <span>My App v{version}</span>
        <div className="window-controls">
          <button onClick={() => electronAPI.minimizeWindow()}>-</button>
          <button onClick={() => electronAPI.maximizeWindow()}>[]</button>
          <button onClick={() => electronAPI.closeWindow()}>X</button>
        </div>
      </header>
      <main>
        <textarea
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
        />
      </main>
    </div>
  );
}
```

### IPC Patterns: invoke vs send

```typescript
// PATTERN 1: invoke/handle (request-response, returns a promise)
// Use for: requesting data, performing actions that return results

// Main process:
ipcMain.handle("db:query", async (_event, sql: string) => {
  return database.query(sql);
});

// Renderer (via preload):
const result = await electronAPI.queryDatabase("SELECT * FROM users");

// PATTERN 2: send/on (fire-and-forget, no response)
// Use for: notifications, window control, one-way commands

// Renderer sends:
ipcRenderer.send("window:minimize");

// Main process listens:
ipcMain.on("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

// PATTERN 3: Main-to-renderer (push from main process)
// Use for: update notifications, menu clicks, system events

// Main process pushes:
mainWindow.webContents.send("update:available", "2.0.0");

// Renderer listens (via preload):
ipcRenderer.on("update:available", (_event, version) => {
  showUpdateBanner(version);
});
```

### Native Menus

```typescript
// src/main/menu.ts
import { Menu, app, BrowserWindow, shell } from "electron";

export function createAppMenu(): void {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "Open File",
          accelerator: "CmdOrCtrl+O",
          click: (_item, window) => {
            window?.webContents.send("menu:action", "open-file");
          },
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: (_item, window) => {
            window?.webContents.send("menu:action", "save-file");
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },

    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },

    // View menu
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    // Help menu
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            shell.openExternal("https://docs.myapp.com");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

### System Tray

```typescript
// src/main/tray.ts
import { Tray, Menu, nativeImage, BrowserWindow, app } from "electron";
import path from "node:path";

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, "../../resources/tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Minimize to Tray",
      click: () => {
        mainWindow.hide();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("My Application");
  tray.setContextMenu(contextMenu);

  // Click tray icon to show window
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Minimize to tray instead of closing
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}
```

### Auto-Updater

```typescript
// src/main/updater.ts
import { autoUpdater } from "electron-updater";
import { BrowserWindow } from "electron";
import log from "electron-log";

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // Configure logging
  autoUpdater.logger = log;

  // Disable auto-download (let user decide)
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info.version);
    mainWindow.webContents.send("update:available", info.version);
  });

  autoUpdater.on("update-not-available", () => {
    log.info("No updates available");
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("update:progress", {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update:downloaded");
  });

  autoUpdater.on("error", (err) => {
    log.error("Update error:", err);
  });

  // Check for updates every 4 hours
  autoUpdater.checkForUpdates();
  setInterval(
    () => autoUpdater.checkForUpdates(),
    4 * 60 * 60 * 1000
  );
}

// Called from IPC when user clicks "Install Update"
export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}

// Called from IPC when user clicks "Download Update"
export function downloadUpdate(): void {
  autoUpdater.downloadUpdate();
}
```

### Protocol Handlers

```typescript
// src/main/index.ts
import { app, protocol, net } from "electron";
import path from "node:path";
import fs from "node:fs";

// Register a custom protocol for loading app assets
app.whenReady().then(() => {
  // Handle app:// protocol for loading local files securely
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    const filePath = path.join(
      __dirname,
      "../renderer",
      url.pathname
    );

    // Security: prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const rendererDir = path.resolve(__dirname, "../renderer");

    if (!resolvedPath.startsWith(rendererDir)) {
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(`file://${resolvedPath}`);
  });
});

// Register as default protocol handler (deep linking)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("myapp", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("myapp");
}

// Handle protocol URLs on macOS
app.on("open-url", (_event, url) => {
  handleDeepLink(url);
});

function handleDeepLink(url: string): void {
  const parsed = new URL(url);
  // myapp://open?file=/path/to/file
  if (parsed.hostname === "open") {
    const filePath = parsed.searchParams.get("file");
    if (filePath) {
      // Send to renderer
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        "deep-link:open-file",
        filePath
      );
    }
  }
}
```

## Security Best Practices

### Security Checklist

```typescript
// MANDATORY security settings for every BrowserWindow
const win = new BrowserWindow({
  webPreferences: {
    // These MUST be set correctly:
    contextIsolation: true,     // Isolate preload from renderer
    nodeIntegration: false,     // No Node.js in renderer
    sandbox: true,              // OS-level sandboxing
    webSecurity: true,          // Same-origin policy
    allowRunningInsecureContent: false,

    // These should be disabled unless specifically needed:
    webviewTag: false,          // No <webview> tags
    navigateOnDragDrop: false,  // No drag-and-drop navigation

    // Preload script is the ONLY bridge
    preload: path.join(__dirname, "preload.js"),
  },
});
```

### Content Security Policy

```html
<!-- src/renderer/index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://api.myapp.com;
  "
/>
```

### IPC Validation

```typescript
// src/main/ipc-handlers.ts
import { z } from "zod";

// Define schemas for IPC messages
const FileReadSchema = z.object({
  path: z.string().min(1).max(1024),
});

const FileWriteSchema = z.object({
  path: z.string().min(1).max(1024),
  content: z.string().max(10 * 1024 * 1024), // 10MB max
});

ipcMain.handle("file:read", async (_event, rawPath: unknown) => {
  // Validate input
  const parsed = FileReadSchema.safeParse({ path: rawPath });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  const filePath = path.resolve(parsed.data.path);
  if (!isAllowedPath(filePath)) {
    throw new Error("Access denied");
  }

  return fs.readFile(filePath, "utf-8");
});
```

## Performance Optimization

### Startup Time

```typescript
// Lazy-load heavy modules
app.whenReady().then(async () => {
  // Show window immediately with skeleton
  const win = createMainWindow();

  // Load heavy modules after window is visible
  const { initializeDatabase } = await import("./database");
  const { syncData } = await import("./sync");

  await initializeDatabase();
  await syncData();

  // Tell renderer initialization is complete
  win.webContents.send("app:ready");
});
```

### Memory Management

```typescript
// Destroy windows properly to free memory
function closeSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.destroy(); // Not just close()
    settingsWindow = null;    // Allow garbage collection
  }
}

// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
    console.warn("High memory usage:", {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    });
  }
}, 30_000);

// Renderer: clean up event listeners
useEffect(() => {
  const cleanup = electronAPI.onMenuAction(handleAction);
  return () => cleanup(); // Always clean up
}, []);
```

### Renderer Performance

```typescript
// Use web workers for heavy computation
const worker = new Worker(new URL("./worker.ts", import.meta.url));

worker.postMessage({ type: "parse", data: largeFileContent });
worker.onmessage = (event) => {
  setResults(event.data);
};

// Use virtual scrolling for large lists
// (Use a library like react-window or tanstack-virtual)

// Debounce IPC calls
import { debounce } from "./utils";

const debouncedSave = debounce(async (content: string) => {
  await electronAPI.writeFile(currentFilePath, content);
}, 1000);
```

## Build and Distribution

### Electron Forge Configuration

```typescript
// forge.config.ts
import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    name: "My App",
    executableName: "my-app",
    icon: "./resources/icon",
    asar: true,
    appBundleId: "com.mycompany.myapp",
    // macOS signing
    osxSign: {},
    osxNotarize: {
      appleId: process.env.APPLE_ID || "",
      appleIdPassword: process.env.APPLE_PASSWORD || "",
      teamId: process.env.APPLE_TEAM_ID || "",
    },
  },
  makers: [
    new MakerSquirrel({
      name: "my-app",
      setupIcon: "./resources/icon.ico",
    }),
    new MakerDMG({
      icon: "./resources/icon.icns",
    }),
    new MakerDeb({
      options: {
        icon: "./resources/icon.png",
        categories: ["Utility"],
      },
    }),
    new MakerRpm({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: "src/main/index.ts", config: "vite.main.config.ts" },
        { entry: "src/preload/index.ts", config: "vite.preload.config.ts" },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
```

### electron-builder Configuration

```yaml
# electron-builder.yml
appId: com.mycompany.myapp
productName: My App
directories:
  output: dist
  buildResources: resources

files:
  - "out/**/*"
  - "package.json"

asar: true

win:
  target:
    - nsis
    - portable
  icon: resources/icon.ico

mac:
  target:
    - dmg
    - zip
  icon: resources/icon.icns
  category: public.app-category.developer-tools
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist

linux:
  target:
    - AppImage
    - deb
    - rpm
  icon: resources/icons
  category: Utility

publish:
  provider: github
  owner: mycompany
  repo: my-app
```

### Build Commands

```bash
# Electron Forge
npx electron-forge start     # Development
npx electron-forge package   # Package (no installer)
npx electron-forge make       # Create distributable

# electron-builder
npx electron-builder --mac
npx electron-builder --win
npx electron-builder --linux
npx electron-builder --mac --win --linux  # All platforms
```

## Crash Reporting

```typescript
// src/main/index.ts
import { crashReporter } from "electron";

crashReporter.start({
  productName: "My App",
  submitURL: "https://crashes.myapp.com/submit",
  uploadToServer: true,
  compress: true,
  extra: {
    appVersion: app.getVersion(),
    platform: process.platform,
  },
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  log.error("Uncaught exception:", error);
  // Show error dialog to user
  dialog.showErrorBox(
    "Application Error",
    "An unexpected error occurred. The app will now restart."
  );
  app.relaunch();
  app.exit(1);
});
```

## Testing

### Main Process Tests

```typescript
// tests/main/ipc-handlers.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Electron modules
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  app: {
    getPath: vi.fn(() => "/mock/user/data"),
    getVersion: vi.fn(() => "1.0.0"),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}));

describe("IPC Handlers", () => {
  it("should validate file paths", () => {
    const isAllowed = isAllowedPath("/mock/user/data/file.txt");
    expect(isAllowed).toBe(true);
  });

  it("should reject paths outside allowed directories", () => {
    const isAllowed = isAllowedPath("/etc/passwd");
    expect(isAllowed).toBe(false);
  });
});
```

### E2E Tests with Playwright

```typescript
// tests/e2e/app.spec.ts
import { test, expect, _electron as electron } from "@playwright/test";

let electronApp: Awaited<ReturnType<typeof electron.launch>>;
let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: ["."],
    env: { NODE_ENV: "test" },
  });
  page = await electronApp.firstWindow();
});

test.afterAll(async () => {
  await electronApp.close();
});

test("should show the main window", async () => {
  const title = await page.title();
  expect(title).toBe("My Application");
});

test("should display app version", async () => {
  const version = await page.locator("[data-testid='app-version']").textContent();
  expect(version).toMatch(/v\d+\.\d+\.\d+/);
});

test("should open file dialog", async () => {
  // Mock the dialog at the Electron level
  await electronApp.evaluate(async ({ dialog }) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: ["/tmp/test.txt"],
    });
  });

  await page.click("button:has-text('Open File')");
  // Verify file content is displayed
  await expect(page.locator("textarea")).not.toBeEmpty();
});
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Correct Approach |
|--------------|---------------|------------------|
| `nodeIntegration: true` | Full Node.js in renderer, massive attack surface | `nodeIntegration: false` + preload |
| `contextIsolation: false` | Preload shares context with renderer | `contextIsolation: true` + contextBridge |
| `webSecurity: false` | Disables same-origin policy | Keep `webSecurity: true` always |
| Direct `require()` in renderer | Security hole, bypasses sandbox | Use contextBridge exposed API |
| `remote` module | Deprecated, synchronous IPC, security risk | Use `invoke`/`handle` pattern |
| Exposing entire `ipcRenderer` | Renderer can call any IPC channel | Expose specific, named functions only |
| Storing secrets in renderer | Webview is inspectable via DevTools | Store in main process, use env vars |
| Not destroying closed windows | Memory leak, window references persist | `window.destroy()` + null reference |
| Synchronous IPC (`sendSync`) | Blocks renderer thread | Use `invoke` (async) |
| Loading remote URLs without CSP | XSS and code injection risk | Strict CSP for all content |
| Global `require` in preload | Exposes Node.js modules to renderer | Only expose needed functions via contextBridge |
| `shell.openExternal(userInput)` | Arbitrary command execution | Validate URLs against allowlist |

## Best Practices

1. **Preload is the only bridge**: Never expose Node.js APIs directly to the renderer
2. **Validate all IPC input**: Use Zod schemas for IPC message validation
3. **Minimal API surface**: Only expose exactly what the renderer needs
4. **Type-safe IPC**: Define TypeScript types for all IPC channels
5. **Window state persistence**: Save and restore window position/size
6. **Graceful degradation**: Handle cases where IPC fails or times out
7. **Single instance lock**: Prevent multiple app instances from running
8. **Code sign everything**: Required for macOS notarization and Windows SmartScreen
9. **Lazy load heavy modules**: Import expensive modules after window is visible
10. **Monitor memory**: Set up alerts for excessive memory usage
11. **Test IPC handlers**: Unit test main process handlers without Electron
12. **Use Playwright for E2E**: Official Electron testing support

## References

- Electron Documentation: https://www.electronjs.org/docs
- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron Forge: https://www.electronforge.io
- electron-builder: https://www.electron.build
- Electron Fiddle: https://www.electronjs.org/fiddle
- Playwright Electron: https://playwright.dev/docs/api/class-electron
