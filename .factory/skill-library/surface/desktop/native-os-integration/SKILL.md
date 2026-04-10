---
name: native-os-integration
description: Native OS integration patterns for desktop applications covering system tray, native menus, file associations, drag-and-drop, clipboard, global shortcuts, and multi-window management. Use when building desktop apps that need to feel like first-class citizens on macOS, Windows, and Linux.
version: 1.0.0
---

# Native OS Integration

Build desktop applications that integrate deeply with the operating system and feel like native first-class citizens.

## System Tray / Menu Bar Apps

System tray (Windows/Linux) and menu bar (macOS) provide persistent, low-profile app presence.

```typescript
// Electron - System tray with context menu
import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import path from 'path';

let tray: Tray | null = null;

function createTray(mainWindow: BrowserWindow) {
  const iconPath = path.join(__dirname, 'assets',
    process.platform === 'darwin' ? 'tray-icon-Template.png' : 'tray-icon.png'
  );
  // macOS: use "Template" suffix for automatic dark/light adaptation
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('MyApp - Running');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open MyApp',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Status: Connected',
      enabled: false, // Informational, not clickable
    },
    {
      label: 'Pause Sync',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        toggleSync(!menuItem.checked);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Windows/Linux: click opens app. macOS: click opens menu (convention).
  if (process.platform !== 'darwin') {
    tray.on('click', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }
}
```

**Rule**: macOS tray icons must use the `Template` suffix (e.g., `iconTemplate.png`) for automatic light/dark mode adaptation. Use 16x16 or 18x18 @1x images.
**Rule**: Do not create a tray icon unless the app has a reason to run in the background. Not every app needs a tray icon.

## Native Menus

### Application Menu (macOS Menu Bar / Windows Alt Menu)

```typescript
// Electron - Platform-adaptive application menu
import { Menu, app, shell } from 'electron';

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS requires an app-named first menu
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => openPreferences(),
        },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: () => createNewFile(),
        },
        {
          label: 'Open...',
          accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
          click: () => openFile(),
        },
        {
          label: 'Save',
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: () => saveFile(),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu with standard system operations
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.example.com'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/example/issues'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

### Context Menus (Right-Click)

```typescript
// Electron - Dynamic context menu
import { Menu, ipcMain, BrowserWindow } from 'electron';

ipcMain.handle('show-context-menu', (event, params: ContextMenuParams) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;

  const template: Electron.MenuItemConstructorOptions[] = [];

  if (params.type === 'file') {
    template.push(
      { label: 'Open', click: () => openFile(params.path) },
      { label: 'Rename', click: () => renameFile(params.path) },
      { type: 'separator' },
      { label: 'Delete', click: () => deleteFile(params.path) },
    );
  } else if (params.type === 'text-selection') {
    template.push(
      { role: 'copy' },
      { role: 'cut' },
      { role: 'paste' },
      { type: 'separator' },
      {
        label: `Search for "${params.selection?.slice(0, 30)}..."`,
        click: () => searchFor(params.selection!),
      },
    );
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window });
});
```

## File Associations and Protocol Handlers

Register your app to open specific file types or handle custom URL schemes.

```typescript
// Electron - Register file associations (in package.json / electron-builder)
// electron-builder.yml
fileAssociations:
  - ext: myproj
    name: MyApp Project
    description: MyApp project file
    mimeType: application/x-myapp-project
    role: Editor          # macOS
    icon: build/file-icon # Platform-specific icon

protocols:
  - name: MyApp Protocol
    schemes: [myapp]
    role: Viewer

// Handle file open (macOS: open-file event, Windows/Linux: process.argv)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  handleFileOpen(filePath);
});

// Handle protocol URL
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url); // myapp://action/param
});

// Windows/Linux: file path comes as command line argument
const filePath = process.argv.find((arg) => arg.endsWith('.myproj'));
if (filePath) handleFileOpen(filePath);
```

**Rule**: On macOS, `open-file` fires before `ready` if the app is launched by double-clicking a file. Queue the path and process it after `ready`.

## Drag-and-Drop from OS

```typescript
// Renderer process - Handle file drops from Finder/Explorer
function FileDropZone({ onFilesDropped }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).map((file) => ({
      name: file.name,
      path: (file as any).path, // Electron exposes file.path
      size: file.size,
      type: file.type,
    }));

    if (files.length > 0) {
      onFilesDropped(files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`drop-zone ${isDragOver ? 'drop-zone--active' : ''}`}
    >
      {isDragOver ? 'Drop files here' : 'Drag files to import'}
    </div>
  );
}
```

```typescript
// Electron - Drag OUT of app to OS
// Main process: handle drag start from renderer
ipcMain.handle('start-drag', (event, filePath: string) => {
  event.sender.startDrag({
    file: filePath,
    icon: nativeImage.createFromPath(path.join(__dirname, 'drag-icon.png')),
  });
});
```

## Clipboard Integration

```typescript
// Electron - Advanced clipboard operations
import { clipboard, nativeImage } from 'electron';

// Read/write text
clipboard.writeText('Hello from MyApp');
const text = clipboard.readText();

// Read/write HTML
clipboard.writeHTML('<b>Bold text</b>');
const html = clipboard.readHTML();

// Read/write images
const image = nativeImage.createFromPath('/path/to/image.png');
clipboard.writeImage(image);
const clipboardImage = clipboard.readImage();

// Write multiple formats simultaneously (paste target picks preferred format)
clipboard.write({
  text: 'Fallback plain text',
  html: '<b>Rich text</b>',
  rtf: '{\\rtf1 Rich text}',
});

// Clipboard monitoring for clipboard manager features
let lastClipboard = '';
setInterval(() => {
  const current = clipboard.readText();
  if (current !== lastClipboard) {
    lastClipboard = current;
    handleClipboardChange(current);
  }
}, 500);
```

## Native Notifications

```typescript
// Electron - Native OS notifications
import { Notification } from 'electron';

function showNotification(options: {
  title: string;
  body: string;
  icon?: string;
  urgency?: 'low' | 'normal' | 'critical'; // Linux only
  silent?: boolean;
  actions?: Array<{ type: 'button'; text: string }>;
}) {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: options.icon || path.join(__dirname, 'icon.png'),
    urgency: options.urgency,
    silent: options.silent,
    actions: options.actions,
  });

  notification.on('click', () => {
    // Bring app to foreground
    mainWindow?.show();
    mainWindow?.focus();
  });

  notification.on('action', (event, index) => {
    handleNotificationAction(index);
  });

  notification.show();
}
```

## Global Keyboard Shortcuts

```typescript
// Electron - Register global shortcuts (work even when app is not focused)
import { globalShortcut, app } from 'electron';

app.whenReady().then(() => {
  // Toggle app visibility
  const registered = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  if (!registered) {
    console.warn('Global shortcut registration failed (may be in use by another app)');
  }
});

// Unregister on quit to avoid OS shortcut conflicts
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
```

**Rule**: Always handle registration failure gracefully. Another app may have claimed the shortcut.
**Rule**: Document global shortcuts in preferences so users can change them. Hardcoded shortcuts conflict with accessibility tools.

## Startup Launch Registration

```typescript
// Electron - Launch at system login
import { app } from 'electron';

function setAutoLaunch(enabled: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true, // macOS: open in background
    path: process.execPath,
    args: ['--hidden'], // Custom arg to start minimized
  });
}

function getAutoLaunchEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}
```

**Rule**: Never enable auto-launch by default. It is a user preference, controlled via settings.

## Dock / Taskbar Badges

```typescript
// Electron - Badge indicators
import { app } from 'electron';

function setBadgeCount(count: number) {
  if (process.platform === 'darwin') {
    // macOS: red badge on dock icon
    app.dock.setBadge(count > 0 ? String(count) : '');
  } else if (process.platform === 'win32') {
    // Windows: overlay icon on taskbar
    if (count > 0) {
      const badge = createBadgeImage(count); // Generate small number image
      mainWindow?.setOverlayIcon(badge, `${count} notifications`);
    } else {
      mainWindow?.setOverlayIcon(null, '');
    }
  }
  // Linux: uses Unity launcher API (Ubuntu) -- limited support
}

// macOS: bounce dock icon for attention
function requestAttention() {
  if (process.platform === 'darwin') {
    app.dock.bounce('informational'); // Bounces once
    // 'critical' bounces until user focuses the app
  }
}
```

## Multi-Window Management

```typescript
// Electron - Multi-window with state persistence
import Store from 'electron-store';

const windowStateStore = new Store({ name: 'window-state' });

function createWindow(windowId: string, options: WindowOptions): BrowserWindow {
  const savedState = windowStateStore.get(windowId) as WindowState | undefined;

  const window = new BrowserWindow({
    x: savedState?.x,
    y: savedState?.y,
    width: savedState?.width ?? options.defaultWidth,
    height: savedState?.height ?? options.defaultHeight,
    minWidth: options.minWidth ?? 400,
    minHeight: options.minHeight ?? 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Restore maximized state
  if (savedState?.isMaximized) {
    window.maximize();
  }

  // Save window state on changes
  const saveState = () => {
    if (window.isDestroyed()) return;
    const bounds = window.getBounds();
    windowStateStore.set(windowId, {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized(),
    });
  };

  window.on('resize', saveState);
  window.on('move', saveState);
  window.on('maximize', saveState);
  window.on('unmaximize', saveState);

  return window;
}
```

## File System Access Patterns

```typescript
// Electron - File dialog with filters
import { dialog } from 'electron';

async function openFileDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Open Project',
    properties: ['openFile'],
    filters: [
      { name: 'Project Files', extensions: ['myproj', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

async function saveFileDialog(defaultName: string): Promise<string | null> {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Save As',
    defaultPath: defaultName,
    filters: [
      { name: 'Project Files', extensions: ['myproj'] },
    ],
  });

  if (result.canceled || !result.filePath) return null;
  return result.filePath;
}
```

**Anti-pattern**: Using `fs.readFileSync` in the renderer process. File I/O belongs in the main process, exposed via IPC.
**Anti-pattern**: Hardcoding path separators. Use `path.join()` for cross-platform compatibility.

## Output Checklist

- [ ] System tray icon adapts to OS theme (Template images on macOS)
- [ ] Application menu follows platform conventions (app menu on macOS, File menu on Windows)
- [ ] Context menus use native OS menu rendering
- [ ] File associations registered for supported file types
- [ ] Protocol handler registered for custom URL scheme
- [ ] Drag-and-drop works both into and out of the application
- [ ] Clipboard supports multiple formats (text, HTML, images)
- [ ] Native notifications used instead of in-app toasts for background events
- [ ] Global shortcuts registered with failure handling
- [ ] Auto-launch is opt-in, not default
- [ ] Window position and size persisted across sessions
- [ ] File dialogs use native OS dialogs with appropriate filters
