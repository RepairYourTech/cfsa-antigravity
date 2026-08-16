---
name: desktop-ux-conventions
description: Platform-specific UX conventions for macOS, Windows, and Linux desktop applications covering keyboard shortcuts, window management, menus, preferences, dark mode, and interaction patterns. Use when designing or auditing desktop app user experience for platform consistency.
version: 1.0.0
---

# Desktop UX Conventions

Build desktop applications that feel native on each platform by following established UX conventions.

## macOS vs Windows vs Linux UX Differences

| Convention | macOS | Windows | Linux (GNOME/KDE) |
|------------|-------|---------|-------------------|
| Close button position | Top-left (red circle) | Top-right (X) | Top-right (varies by DE) |
| Close behavior | Closes window, app stays in Dock | Closes window, may exit app | Closes window |
| Quit behavior | Cmd+Q quits app | Alt+F4 closes window | Ctrl+Q or Alt+F4 |
| Settings/Preferences | App menu > Preferences (Cmd+,) | File > Options or Tools > Settings | Edit > Preferences or hamburger menu |
| Primary action button | Right-most in dialog | Right-most in dialog | Right-most (GNOME HIG) |
| Destructive button color | No special color (text label) | No special color | Red (GNOME HIG) |
| Confirmation dialogs | Minimal (undo preferred over confirm) | Frequent (confirm before destructive) | Varies |
| Scrollbar visibility | Hidden until scroll (overlay) | Always visible (thin) | Follows DE settings |
| Title bar | Minimal, often no title text | Shows window title | Shows window title |
| Menu bar | Global (top of screen) | Per-window | Per-window or global (KDE) |

## Keyboard Shortcut Conventions

### Standard Shortcuts by Platform

| Action | macOS | Windows / Linux |
|--------|-------|----------------|
| Copy | Cmd+C | Ctrl+C |
| Paste | Cmd+V | Ctrl+V |
| Cut | Cmd+X | Ctrl+X |
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Shift+Z | Ctrl+Y or Ctrl+Shift+Z |
| Select All | Cmd+A | Ctrl+A |
| Find | Cmd+F | Ctrl+F |
| Save | Cmd+S | Ctrl+S |
| New | Cmd+N | Ctrl+N |
| Open | Cmd+O | Ctrl+O |
| Print | Cmd+P | Ctrl+P |
| Close window | Cmd+W | Ctrl+W or Alt+F4 |
| Quit app | Cmd+Q | Alt+F4 |
| Preferences | Cmd+, | Ctrl+, (no universal standard) |
| Zoom in | Cmd+= | Ctrl+= |
| Zoom out | Cmd+- | Ctrl+- |
| Full screen | Ctrl+Cmd+F or globe+F | F11 |
| Switch tab | Cmd+Shift+[ / ] | Ctrl+Tab / Ctrl+Shift+Tab |

```typescript
// Electron - Platform-aware accelerator
const isMac = process.platform === 'darwin';

const shortcuts = {
  save: isMac ? 'Cmd+S' : 'Ctrl+S',
  preferences: isMac ? 'Cmd+,' : 'Ctrl+,',
  quit: isMac ? 'Cmd+Q' : 'Alt+F4',
  redo: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
};

// Electron uses 'CommandOrControl' as a platform-adaptive modifier
Menu.buildFromTemplate([
  {
    label: 'Save',
    accelerator: 'CommandOrControl+S', // Cmd on macOS, Ctrl on Windows/Linux
    click: () => saveFile(),
  },
]);
```

**Rule**: Use `CommandOrControl` in Electron for cross-platform shortcuts. Never hardcode `Cmd` or `Ctrl` alone.
**Anti-pattern**: Using Ctrl+Q on macOS. The standard quit shortcut is Cmd+Q. Ctrl+Q has no meaning on macOS.

## Window Management

### Remember Position and Size

```typescript
// Persist and restore window geometry
interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  displayId?: string; // Track which monitor
}

function restoreWindowState(id: string, defaults: { width: number; height: number }): WindowState {
  const saved = store.get(`windowState.${id}`) as WindowState | undefined;

  if (saved) {
    // Verify the saved position is still on a connected display
    const displays = screen.getAllDisplays();
    const isOnScreen = displays.some((display) => {
      const { x, y, width, height } = display.bounds;
      return saved.x >= x && saved.x < x + width &&
             saved.y >= y && saved.y < y + height;
    });

    if (isOnScreen) return saved;
  }

  // Center on primary display
  const primary = screen.getPrimaryDisplay();
  return {
    x: Math.round((primary.bounds.width - defaults.width) / 2),
    y: Math.round((primary.bounds.height - defaults.height) / 2),
    width: defaults.width,
    height: defaults.height,
    isMaximized: false,
  };
}
```

**Rule**: Always validate that saved window coordinates are on a connected display. Users disconnect monitors, and saved positions off-screen make the app invisible.

### macOS Window Behavior

```typescript
// macOS: closing all windows should NOT quit the app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  // macOS: app stays in Dock, Cmd+Q to quit
});

// macOS: clicking Dock icon should re-create window
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
```

## Menu Bar Structure

### macOS Standard Menu Order

```
[App Name] | File | Edit | View | [App-Specific] | Window | Help
```

### Windows / Linux Standard Menu Order

```
File | Edit | View | [App-Specific] | Tools | Help
```

| Menu | Expected Contents |
|------|-------------------|
| File | New, Open, Save, Save As, Export, separator, Close/Quit |
| Edit | Undo, Redo, separator, Cut, Copy, Paste, Select All, separator, Find |
| View | Zoom In/Out, Reset Zoom, separator, Toggle Sidebar, Full Screen |
| Window (macOS) | Minimize, Zoom, separator, Bring All to Front |
| Help | Documentation link, About (Windows/Linux), Report Issue |

**Rule**: macOS `About` goes in the app menu, not Help. Windows/Linux `About` goes in Help.
**Rule**: macOS `Preferences` goes in the app menu. Windows `Options`/`Settings` goes in File or Tools.

## Undo/Redo Stacks

```typescript
// Generic undo/redo manager
interface UndoAction {
  type: string;
  description: string; // For Edit menu: "Undo Paste", "Redo Delete"
  undo: () => void;
  redo: () => void;
}

class UndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxSize = 100;

  execute(action: UndoAction): void {
    action.redo(); // Execute the action
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack on new action

    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  undo(): string | null {
    const action = this.undoStack.pop();
    if (!action) return null;

    action.undo();
    this.redoStack.push(action);
    return action.description;
  }

  redo(): string | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    action.redo();
    this.undoStack.push(action);
    return action.description;
  }

  // For Edit menu label: "Undo Paste" vs "Undo"
  get undoLabel(): string {
    const top = this.undoStack.at(-1);
    return top ? `Undo ${top.description}` : 'Undo';
  }

  get redoLabel(): string {
    const top = this.redoStack.at(-1);
    return top ? `Redo ${top.description}` : 'Redo';
  }
}
```

## Preferences / Settings Patterns

| Platform | Location | Pattern |
|----------|----------|---------|
| macOS | App menu > Preferences (Cmd+,) | Modal window or panel |
| Windows | File > Options or dedicated Settings view | Full window or dialog |
| Linux | Edit > Preferences or hamburger > Preferences | Full window (GNOME) |

```tsx
// Preferences layout - follow platform conventions
function PreferencesWindow() {
  const categories = [
    { id: 'general', label: 'General', icon: <GearIcon /> },
    { id: 'appearance', label: 'Appearance', icon: <PaletteIcon /> },
    { id: 'editor', label: 'Editor', icon: <CodeIcon /> },
    { id: 'keybindings', label: 'Keyboard Shortcuts', icon: <KeyboardIcon /> },
    { id: 'advanced', label: 'Advanced', icon: <WrenchIcon /> },
  ];

  const [activeCategory, setActiveCategory] = useState('general');

  return (
    <div className="preferences">
      {/* macOS: toolbar-style tabs at top */}
      {/* Windows/Linux: sidebar navigation */}
      <nav className="preferences-nav">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`nav-item ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </nav>
      <main className="preferences-content">
        <PreferencesPanel category={activeCategory} />
      </main>
    </div>
  );
}
```

**Rule**: Settings should take effect immediately (live preview). Avoid "Apply" buttons unless the change requires a restart.

## Dark Mode Integration

```typescript
// Electron - Follow OS dark mode preference
import { nativeTheme } from 'electron';

// Read current OS theme
const isDark = nativeTheme.shouldUseDarkColors;

// Listen for OS theme changes
nativeTheme.on('updated', () => {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  mainWindow?.webContents.send('theme-changed', theme);
});

// Allow user override: 'system', 'light', 'dark'
function setThemePreference(preference: 'system' | 'light' | 'dark') {
  nativeTheme.themeSource = preference;
  store.set('theme', preference);
}
```

```css
/* CSS - Respect OS preference with user override */
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --border: #e5e5e5;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #1a1a1a;
    --text: #e5e5e5;
    --border: #333333;
  }
}

[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #e5e5e5;
  --border: #333333;
}
```

**Rule**: Always support at least three options: System (follow OS), Light, Dark. "System" should be the default.

## Drag-and-Drop Feedback

| State | Visual Feedback |
|-------|----------------|
| Drag started | Source item shows drag preview (ghost image) |
| Over valid target | Target highlights (border, background color change) |
| Over invalid target | Cursor shows "not allowed" (no-drop cursor) |
| Drop | Brief animation showing item landing |
| Cancel (Escape or drop outside) | Item snaps back to original position |

## Right-Click Context Menus

| Item Type | Expected Context Menu Actions |
|-----------|------------------------------|
| Text field | Cut, Copy, Paste, Select All, Spell Check |
| File/item in list | Open, Rename, Duplicate, Delete, Show in Finder/Explorer |
| Image | Copy Image, Save Image As, Open in Viewer |
| Link | Open Link, Copy Link Address |
| Tab | Close Tab, Close Other Tabs, Duplicate Tab |
| Empty area | Paste, New Item, Sort Options |

**Rule**: Context menus should contain only actions relevant to the clicked item. Do not dump all possible actions into every context menu.

## Status Bar Patterns

| Content | Example |
|---------|---------|
| Cursor position | `Ln 42, Col 17` |
| File encoding | `UTF-8` |
| Language/mode | `TypeScript` |
| Sync status | `Synced` / `2 pending` |
| Connection status | `Connected` / `Offline` |
| Background task progress | `Indexing: 73%` |

**Rule**: Status bar items should be informational. Clickable status bar items should open relevant settings or dialogs, not trigger destructive actions.

## Output Checklist

- [ ] Keyboard shortcuts use platform-correct modifiers (Cmd on macOS, Ctrl on Windows/Linux)
- [ ] Window position and size remembered and validated against connected displays
- [ ] Close behavior follows platform convention (macOS: app stays in Dock)
- [ ] Menu bar follows platform standard order (app-name menu on macOS)
- [ ] Undo/redo stack implemented for all destructive user actions
- [ ] Preferences accessible via platform-standard shortcut and menu location
- [ ] Dark mode follows OS preference with user override option
- [ ] Context menus contain relevant actions for the clicked element
- [ ] Drag-and-drop provides clear visual feedback for all states
- [ ] Status bar shows useful, non-intrusive information
