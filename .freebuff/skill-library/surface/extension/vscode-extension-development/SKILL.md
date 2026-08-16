---
name: vscode-extension-development
description: VS Code extension development covering the Extension API, activation events, TreeViews, Webviews, Language Server Protocol, debugging, publishing, and testing. Use when building VS Code extensions that add commands, views, language support, or custom editors.
version: 1.0.0
---

# VS Code Extension Development

Build VS Code extensions that integrate deeply with the editor through commands, views, language features, and custom UI.

## Extension API Overview

| API Surface | What It Provides |
|------------|-----------------|
| `vscode.commands` | Register and execute commands |
| `vscode.window` | Editors, terminals, notifications, quick picks, webviews |
| `vscode.workspace` | Files, folders, configuration, file system watcher |
| `vscode.languages` | Language features (completion, hover, diagnostics) |
| `vscode.debug` | Debug adapters and debug sessions |
| `vscode.extensions` | Access other extensions, extension context |
| `vscode.env` | Environment info (machine ID, app name, clipboard) |
| `vscode.authentication` | OAuth-based authentication |

```typescript
// extension.ts - Entry point
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register a simple command
  const disposable = vscode.commands.registerCommand(
    'myext.helloWorld',
    () => {
      vscode.window.showInformationMessage('Hello from My Extension!');
    }
  );
  context.subscriptions.push(disposable);

  // Register a text editor command (only active when editor is focused)
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'myext.insertTimestamp',
      (textEditor, edit) => {
        const timestamp = new Date().toISOString();
        edit.insert(textEditor.selection.active, timestamp);
      }
    )
  );

  // Status bar item
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.text = '$(sync~spin) My Extension';
  statusBar.command = 'myext.showStatus';
  statusBar.tooltip = 'Click to show extension status';
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function deactivate() {
  // Clean up resources
}
```

**Rule**: Every disposable must be added to `context.subscriptions` for automatic cleanup when the extension is deactivated.

## Activation Events

Extensions are loaded lazily. Declare activation events to tell VS Code when to load your extension.

```json
{
  "activationEvents": [
    "onCommand:myext.helloWorld",
    "onLanguage:python",
    "onView:myext.sidebar",
    "workspaceContains:.myextrc",
    "onFileSystem:myext-fs",
    "onUri",
    "onStartupFinished",
    "*"
  ]
}
```

| Event | When It Fires |
|-------|--------------|
| `onCommand:id` | When the command is invoked |
| `onLanguage:lang` | When a file of that language is opened |
| `onView:viewId` | When the view is visible |
| `workspaceContains:glob` | When workspace has matching files |
| `onFileSystem:scheme` | When a file with that URI scheme is accessed |
| `onUri` | When a `vscode://` URI is opened for this extension |
| `onStartupFinished` | After VS Code startup completes |
| `*` | On startup (avoid -- slows VS Code launch) |

**Rule**: Never use `*` activation unless absolutely necessary. It forces your extension to load at startup, impacting VS Code performance.
**Rule**: For commands, VS Code automatically adds `onCommand:` activation events from `contributes.commands`. You only need to declare activation events for non-command triggers.

## package.json `contributes` Schema

```json
{
  "contributes": {
    "commands": [
      {
        "command": "myext.helloWorld",
        "title": "Hello World",
        "category": "My Extension",
        "icon": "$(megaphone)"
      },
      {
        "command": "myext.analyze",
        "title": "Analyze File",
        "category": "My Extension",
        "enablement": "editorLangId == typescript"
      }
    ],

    "keybindings": [
      {
        "command": "myext.analyze",
        "key": "ctrl+shift+a",
        "mac": "cmd+shift+a",
        "when": "editorTextFocus && editorLangId == typescript"
      }
    ],

    "menus": {
      "editor/context": [
        {
          "command": "myext.analyze",
          "group": "myext",
          "when": "editorLangId == typescript"
        }
      ],
      "view/title": [
        {
          "command": "myext.refresh",
          "group": "navigation",
          "when": "view == myext.sidebar"
        }
      ]
    },

    "viewsContainers": {
      "activitybar": [
        {
          "id": "myext-sidebar",
          "title": "My Extension",
          "icon": "resources/icon.svg"
        }
      ]
    },

    "views": {
      "myext-sidebar": [
        {
          "id": "myext.itemsList",
          "name": "Items",
          "contextualTitle": "My Extension Items"
        },
        {
          "id": "myext.details",
          "name": "Details",
          "type": "webview"
        }
      ]
    },

    "configuration": {
      "title": "My Extension",
      "properties": {
        "myext.apiUrl": {
          "type": "string",
          "default": "https://api.example.com",
          "description": "API endpoint URL",
          "scope": "resource"
        },
        "myext.maxResults": {
          "type": "number",
          "default": 50,
          "minimum": 10,
          "maximum": 200,
          "description": "Maximum number of results to display"
        },
        "myext.autoAnalyze": {
          "type": "boolean",
          "default": true,
          "description": "Automatically analyze files on save"
        }
      }
    }
  }
}
```

## TreeView and Data Provider

```typescript
// TreeView with async data loading
interface TreeItem {
  id: string;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;
  children?: TreeItem[];
  contextValue?: string; // For context menu filtering
  command?: vscode.Command; // Action on click
}

class ItemsProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private items: TreeItem[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.children
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.id = element.id;
    treeItem.description = element.description;
    treeItem.iconPath = element.iconPath;
    treeItem.contextValue = element.contextValue;
    treeItem.command = element.command;
    treeItem.tooltip = new vscode.MarkdownString(`**${element.label}**\n\n${element.description || ''}`);

    return treeItem;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root level -- fetch from API or workspace
      this.items = await this.fetchItems();
      return this.items;
    }
    return element.children || [];
  }

  private async fetchItems(): Promise<TreeItem[]> {
    // Fetch data from your service
    const data = await fetchFromApi();
    return data.map((item) => ({
      id: item.id,
      label: item.name,
      description: item.status,
      iconPath: new vscode.ThemeIcon(
        item.status === 'pass' ? 'check' : 'error',
        item.status === 'pass'
          ? new vscode.ThemeColor('testing.iconPassed')
          : new vscode.ThemeColor('testing.iconFailed')
      ),
      contextValue: 'item',
      command: {
        command: 'myext.openItem',
        title: 'Open Item',
        arguments: [item.id],
      },
    }));
  }
}

// Register in activate()
export function activate(context: vscode.ExtensionContext) {
  const provider = new ItemsProvider();
  const treeView = vscode.window.createTreeView('myext.itemsList', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  context.subscriptions.push(
    treeView,
    vscode.commands.registerCommand('myext.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('myext.openItem', (id: string) => openItem(id)),
  );
}
```

## Webview Communication

```typescript
// Create a Webview panel with bidirectional communication
function createDetailPanel(
  context: vscode.ExtensionContext,
  data: ItemDetail
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'myext.detail',
    `Detail: ${data.name}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media'),
      ],
    }
  );

  // Get URI for bundled resources
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview.js')
  );
  const styleUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview.css')
  );

  // Set HTML content with CSP
  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${panel.webview.cspSource};
                 script-src 'nonce-${getNonce()}';
                 img-src ${panel.webview.cspSource} https:;">
      <link href="${styleUri}" rel="stylesheet">
    </head>
    <body>
      <div id="app"></div>
      <script nonce="${getNonce()}" src="${scriptUri}"></script>
    </body>
    </html>
  `;

  // Send data to webview
  panel.webview.postMessage({ type: 'setData', data });

  // Receive messages from webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.type) {
        case 'save':
          await saveItem(message.data);
          vscode.window.showInformationMessage('Saved!');
          break;
        case 'openExternal':
          vscode.env.openExternal(vscode.Uri.parse(message.url));
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  return panel;
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
```

```typescript
// webview.js - Runs inside the Webview (sandboxed browser context)
const vscode = acquireVsCodeApi();

// Receive messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    case 'setData':
      renderData(message.data);
      break;
  }
});

// Send messages to extension
function handleSave(data) {
  vscode.postMessage({ type: 'save', data });
}

// Persist webview state across visibility changes
const previousState = vscode.getState();
if (previousState) {
  restoreState(previousState);
}

function updateState(newState) {
  vscode.setState(newState);
}
```

**Rule**: Always set a Content Security Policy on webviews. Use nonces for scripts.
**Rule**: Use `webview.asWebviewUri()` for all resource URIs. Never construct `vscode-webview-resource://` URIs manually.

## Language Server Protocol Integration

```typescript
// client/extension.ts - LSP client
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'myLanguage' },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.myextrc'),
    },
  };

  client = new LanguageClient(
    'myext-language-server',
    'My Language Server',
    serverOptions,
    clientOptions
  );

  client.start();
  context.subscriptions.push(client);
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
```

```typescript
// server/server.ts - LSP server
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  Diagnostic,
  DiagnosticSeverity,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', ':'],
      },
      hoverProvider: true,
      definitionProvider: true,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
  };
});

// Completion
connection.onCompletion((_textDocumentPosition) => {
  return [
    {
      label: 'myFunction',
      kind: CompletionItemKind.Function,
      detail: 'A useful function',
      documentation: 'Does something useful with the given parameters.',
    },
  ];
});

// Diagnostics on document change
documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

async function validateDocument(textDocument: TextDocument): Promise<void> {
  const diagnostics: Diagnostic[] = [];
  const text = textDocument.getText();

  // Example: flag lines with TODO
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const todoIndex = lines[i].indexOf('TODO');
    if (todoIndex !== -1) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: i, character: todoIndex },
          end: { line: i, character: todoIndex + 4 },
        },
        message: 'TODO found - consider addressing this.',
        source: 'myext',
      });
    }
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);
connection.listen();
```

## Debugging Extensions

```json
// .vscode/launch.json - Debug configuration
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "npm: watch"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/out/test/**/*.js"
      ],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

## Publishing to Marketplace

```bash
# Install vsce (Visual Studio Code Extension CLI)
npm install -g @vscode/vsce

# Package extension
vsce package
# Creates myext-1.0.0.vsix

# Publish to Visual Studio Marketplace
vsce publish
# Requires Personal Access Token from Azure DevOps

# Publish specific version
vsce publish 1.0.1
# Automatically updates package.json version

# Publish to Open VSX (alternative marketplace for VS Codium)
npx ovsx publish myext-1.0.0.vsix -p <token>
```

```json
// package.json - Required publisher field
{
  "publisher": "your-publisher-id",
  "repository": {
    "type": "git",
    "url": "https://github.com/you/myext"
  },
  "categories": ["Programming Languages", "Linters", "Other"],
  "keywords": ["keyword1", "keyword2"],
  "preview": false,
  "icon": "icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  }
}
```

## Telemetry and Settings

```typescript
// Respect VS Code telemetry settings
import TelemetryReporter from '@vscode/extension-telemetry';

const INSTRUMENTATION_KEY = 'your-app-insights-key';
let telemetry: TelemetryReporter;

export function activate(context: vscode.ExtensionContext) {
  telemetry = new TelemetryReporter(INSTRUMENTATION_KEY);
  context.subscriptions.push(telemetry);

  // TelemetryReporter automatically respects telemetry.telemetryLevel setting
  telemetry.sendTelemetryEvent('extensionActivated', {
    vscodeVersion: vscode.version,
  });
}

// Read extension settings
function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('myext');
  return {
    apiUrl: config.get<string>('apiUrl', 'https://api.example.com'),
    maxResults: config.get<number>('maxResults', 50),
    autoAnalyze: config.get<boolean>('autoAnalyze', true),
  };
}

// Watch for configuration changes
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('myext')) {
    const newConfig = getConfig();
    applyConfig(newConfig);
  }
});
```

## Testing Extensions

```typescript
// test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('publisher.myext'));
  });

  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('publisher.myext')!;
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('Command should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('myext.helloWorld'));
  });

  test('Should insert timestamp', async () => {
    const doc = await vscode.workspace.openTextDocument({ content: '' });
    const editor = await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand('myext.insertTimestamp');

    const text = editor.document.getText();
    assert.match(text, /\d{4}-\d{2}-\d{2}T/);
  });
});
```

```typescript
// test/suite/index.ts - Test runner
import path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 10000 });
  const testsRoot = path.resolve(__dirname);

  const files = await glob('**/**.test.js', { cwd: testsRoot });
  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
```

## Output Checklist

- [ ] Activation events are specific (no `*` unless necessary)
- [ ] All disposables added to `context.subscriptions`
- [ ] Commands registered in `contributes.commands` with titles and categories
- [ ] Keybindings use `when` clauses for context-appropriate activation
- [ ] TreeView uses `onDidChangeTreeData` for reactive updates
- [ ] Webviews have Content Security Policy with nonces
- [ ] Webview resources loaded via `asWebviewUri()`
- [ ] LSP client and server properly configured with capabilities
- [ ] Extension tested with VS Code extension test framework
- [ ] `package.json` includes publisher, repository, categories, and icon
- [ ] Telemetry respects `telemetry.telemetryLevel` setting
- [ ] Configuration properties have types, defaults, and descriptions
- [ ] Published to Visual Studio Marketplace and/or Open VSX
