---
name: vscode-extension
description: "Expert VS Code extension development guide covering Extension Host architecture, activation events, commands, contribution points (menus, keybindings, settings, views), Webview API, Language Server Protocol (LSP), TreeView/TreeDataProvider, Testing (vscode-test), packaging (vsce/ovsx), and publishing. Use when building VS Code extensions, language servers, or editor tooling."
version: 1.0.0
---

# VS Code Extension Development Guide

> Use this skill when building Visual Studio Code extensions. Covers the Extension API, contribution points, Webviews, Language Server Protocol, and publishing.

## When to Use This Skill

- Building VS Code extensions (commands, UI, language features)
- Implementing language support (syntax, intellisense, diagnostics)
- Creating custom views (TreeView, Webview, sidebar panels)
- Building editor integrations (formatters, linters, debuggers)
- Publishing to VS Code Marketplace or Open VSX

## When NOT to Use This Skill

- Browser extensions → use Browser Extension skill
- JetBrains plugins → different architecture entirely
- Standalone desktop apps → use Tauri or Electron
- VS Code themes only → simpler `contributes.themes` in package.json

---

## 1. Architecture Overview (CRITICAL)

```
VS Code
├── Main Process (Electron)
│   └── Extension Host (separate process per window)
│       ├── Your Extension (activate/deactivate)
│       ├── Other Extensions
│       └── Language Server (optional, separate process)
└── Renderer Process
    ├── Editor UI
    ├── Sidebar Views (TreeView, WebviewView)
    └── Webview Panels (custom HTML/CSS/JS)
```

| Component | Runs In | Access | Use For |
|-----------|---------|--------|---------|
| Extension code | Extension Host | Full VS Code API | Commands, providers, logic |
| Webview | Renderer (iframe) | Message passing only | Rich custom UI |
| Language Server | Separate process | LSP protocol | Heavy language analysis |
| TreeView | Extension Host | TreeDataProvider API | List/tree sidebar panels |

### Extension Lifecycle

```typescript
// extension.ts — entry point
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Called when activation event fires
  // Register commands, providers, listeners HERE
  console.log('Extension activated');

  const disposable = vscode.commands.registerCommand('myExt.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World!');
  });

  context.subscriptions.push(disposable); // Auto-cleanup on deactivate
}

export function deactivate() {
  // Optional cleanup
}
```

> **Rule**: Push ALL disposables to `context.subscriptions`. Never register listeners without cleanup.

---

## 2. package.json (CRITICAL)

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "version": "0.1.0",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "myExt.helloWorld",
        "title": "Hello World",
        "category": "My Extension",
        "icon": "$(sparkle)"
      }
    ],
    "menus": {
      "editor/context": [
        { "command": "myExt.helloWorld", "when": "editorTextFocus" }
      ],
      "commandPalette": [
        { "command": "myExt.helloWorld", "when": "editorLangId == typescript" }
      ]
    },
    "keybindings": [
      {
        "command": "myExt.helloWorld",
        "key": "ctrl+shift+h",
        "mac": "cmd+shift+h",
        "when": "editorTextFocus"
      }
    ],
    "configuration": {
      "title": "My Extension",
      "properties": {
        "myExt.enableFeature": {
          "type": "boolean",
          "default": true,
          "description": "Enable the main feature"
        },
        "myExt.maxResults": {
          "type": "number",
          "default": 10,
          "description": "Maximum number of results"
        }
      }
    },
    "viewsContainers": {
      "activitybar": [
        { "id": "myExtView", "title": "My Extension", "icon": "resources/icon.svg" }
      ]
    },
    "views": {
      "myExtView": [
        { "id": "myExt.treeView", "name": "Explorer" }
      ]
    }
  }
}
```

### Activation Events

| Event | When | Example |
|-------|------|---------|
| `onCommand:myExt.cmd` | Command executed | Always use for commands |
| `onLanguage:typescript` | File of language opened | Language features |
| `workspaceContains:**/tsconfig.json` | Workspace has file | Project-specific tools |
| `onView:myExt.treeView` | View becomes visible | Sidebar panels |
| `onUri` | Extension URI handler invoked | Deep linking |
| `*` | Always (startup) | 🔴 Avoid — slows VS Code startup |

> **Rule**: Use the most specific activation event possible. `*` is banned for production extensions.

---

## 3. Commands & Configuration

### Commands

```typescript
// Register with arguments
context.subscriptions.push(
  vscode.commands.registerCommand('myExt.openFile', async (uri: vscode.Uri) => {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  })
);

// Register text editor command (has activeTextEditor guaranteed)
context.subscriptions.push(
  vscode.commands.registerTextEditorCommand('myExt.insertSnippet', (editor, edit) => {
    edit.insert(editor.selection.active, 'inserted text');
  })
);
```

### Reading Configuration

```typescript
const config = vscode.workspace.getConfiguration('myExt');
const enabled = config.get<boolean>('enableFeature', true);
const maxResults = config.get<number>('maxResults', 10);

// Watch for config changes
context.subscriptions.push(
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('myExt.enableFeature')) {
      // Re-initialize feature
    }
  })
);
```

---

## 4. TreeView (Sidebar Panel)

```typescript
class MyTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root items
      return this.getRootItems();
    }
    // Child items
    return element.children ?? [];
  }

  private getRootItems(): TreeItem[] {
    return [
      new TreeItem('Item 1', vscode.TreeItemCollapsibleState.Collapsed),
      new TreeItem('Item 2', vscode.TreeItemCollapsibleState.None),
    ];
  }
}

class TreeItem extends vscode.TreeItem {
  children?: TreeItem[];

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    this.tooltip = `Click to interact with ${label}`;
    this.iconPath = new vscode.ThemeIcon('file');
  }
}

// Register in activate()
const treeProvider = new MyTreeProvider();
const treeView = vscode.window.createTreeView('myExt.treeView', {
  treeDataProvider: treeProvider,
  showCollapseAll: true,
});
context.subscriptions.push(treeView);
```

---

## 5. Webview Panel (Custom UI)

```typescript
function createWebviewPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'myExtWebview',
    'My Webview',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,  // Keep state when panel hidden
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media'),
      ],
    }
  );

  // Get URI for bundled resources
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src ${panel.webview.cspSource}; style-src ${panel.webview.cspSource};">
    </head>
    <body>
      <h1>Hello from Webview</h1>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;

  // Extension → Webview messaging
  panel.webview.postMessage({ type: 'update', data: { count: 42 } });

  // Webview → Extension messaging
  panel.webview.onDidReceiveMessage((message) => {
    switch (message.type) {
      case 'save':
        saveData(message.payload);
        break;
    }
  }, undefined, context.subscriptions);
}
```

> **Rule**: Always set Content-Security-Policy in Webviews. Never use inline scripts — load from bundled files via `asWebviewUri`.

---

## 6. Language Features

### Diagnostics (Linting/Errors)

```typescript
const diagnosticCollection = vscode.languages.createDiagnosticCollection('myExt');
context.subscriptions.push(diagnosticCollection);

function updateDiagnostics(document: vscode.TextDocument) {
  const diagnostics: vscode.Diagnostic[] = [];

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    if (line.text.includes('TODO')) {
      diagnostics.push(new vscode.Diagnostic(
        line.range,
        'TODO found',
        vscode.DiagnosticSeverity.Warning,
      ));
    }
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

context.subscriptions.push(
  vscode.workspace.onDidChangeTextDocument((e) => updateDiagnostics(e.document)),
  vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
);
```

### Completion Provider

```typescript
context.subscriptions.push(
  vscode.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems(document, position) {
      const item = new vscode.CompletionItem('mySnippet', vscode.CompletionItemKind.Snippet);
      item.insertText = new vscode.SnippetString('console.log(${1:message});');
      item.documentation = 'Inserts a console.log statement';
      return [item];
    }
  }, '.') // Trigger on '.'
);
```

### Language Server Protocol (LSP)

```typescript
// For complex language features, use a separate Language Server process
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

const serverModule = context.asAbsolutePath('out/server.js');
const client = new LanguageClient(
  'myLanguageServer',
  'My Language Server',
  {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  },
  { documentSelector: [{ scheme: 'file', language: 'mylang' }] }
);

client.start();
context.subscriptions.push(client);
```

> **Rule**: Use LSP for heavy language analysis (type checking, multi-file analysis). Use inline providers for lightweight features (simple completions, snippets).

---

## 7. Testing

```typescript
// src/test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Command registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('myExt.helloWorld'));
  });

  test('Opens document', async () => {
    const uri = vscode.Uri.file('/tmp/test.ts');
    const doc = await vscode.workspace.openTextDocument(uri);
    assert.strictEqual(doc.languageId, 'typescript');
  });
});
```

```bash
# Run tests with VS Code test runner
npx vscode-test    # Downloads VS Code, runs tests in Extension Host
```

---

## 8. Packaging & Publishing

```bash
# Install vsce
npm install -g @vscode/vsce

# Package as .vsix
vsce package

# Publish to VS Code Marketplace
vsce publish

# Publish to Open VSX (Eclipse foundation)
npx ovsx publish -p <token>
```

### Pre-publish Checklist

- [ ] `engines.vscode` set to minimum supported version
- [ ] `activationEvents` are specific (no `*`)
- [ ] Extension bundle is small (use esbuild/webpack)
- [ ] README has screenshots and feature descriptions
- [ ] CHANGELOG.md is up to date
- [ ] Icon is 128×128px

---

## 9. Common Anti-Patterns

1. **`activationEvents: ["*"]`** — activates on every VS Code start; use specific triggers
2. **Not disposing listeners** — memory leaks; always push to `context.subscriptions`
3. **Synchronous file I/O** — blocks Extension Host; use `vscode.workspace.fs` async APIs
4. **Inline scripts in Webview** — CSP violation; load from bundled files via `asWebviewUri`
5. **Heavy computation in Extension Host** — blocks ALL extensions; offload to Language Server or Worker
6. **Not bundling** — shipping `node_modules` → massive extension; use esbuild to bundle
7. **Hardcoded file paths** — use `context.extensionUri` and `vscode.Uri.joinPath` for portability
8. **Ignoring `when` clauses** — commands appear everywhere; scope with `when` in menus/keybindings
9. **No error handling in providers** — unhandled errors crash the provider silently

---

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
