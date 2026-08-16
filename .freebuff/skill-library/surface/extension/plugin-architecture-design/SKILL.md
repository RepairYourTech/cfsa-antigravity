---
name: plugin-architecture-design
description: Plugin and extension system design covering discovery, lifecycle hooks, dependency injection, versioning, sandboxing, configuration schemas, event buses, and marketplace patterns. Use when building applications that need third-party extensibility.
version: 1.0.0
---

# Plugin Architecture Design

Design extension systems that allow third-party developers to safely extend your application with discoverable, versioned, and sandboxed plugins.

## Plugin Discovery and Loading

### Discovery Mechanisms

| Mechanism | How It Works | Example |
|-----------|-------------|---------|
| Directory scanning | Scan a known directory for plugin manifests | `~/.myapp/plugins/*/plugin.json` |
| Package manager | Install plugins via npm/cargo/pip | `npm install myapp-plugin-foo` |
| Registry API | Query a remote plugin registry | `GET /api/plugins?search=foo` |
| Configuration | User lists plugins in config file | `plugins: ["plugin-a", "plugin-b"]` |
| Convention-based | Name prefix in node_modules | `myapp-plugin-*` in `node_modules` |

```typescript
// Directory-based plugin discovery
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const PluginManifestSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  main: z.string(), // Entry point relative to plugin directory
  engines: z.object({
    myapp: z.string(), // Semver range: ">=1.0.0 <2.0.0"
  }),
  permissions: z.array(z.enum([
    'fs:read', 'fs:write', 'network', 'ui:sidebar', 'ui:statusbar',
    'commands', 'config', 'events',
  ])).default([]),
  activationEvents: z.array(z.string()).default(['*']),
  configuration: z.record(z.unknown()).optional(),
});

type PluginManifest = z.infer<typeof PluginManifestSchema>;

async function discoverPlugins(pluginDirs: string[]): Promise<PluginManifest[]> {
  const manifests: PluginManifest[] = [];

  for (const dir of pluginDirs) {
    if (!fs.existsSync(dir)) continue;

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(dir, entry.name, 'plugin.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
        const manifest = PluginManifestSchema.parse(raw);
        manifests.push(manifest);
      } catch (error) {
        console.warn(`Invalid plugin manifest at ${manifestPath}: ${(error as Error).message}`);
      }
    }
  }

  return manifests;
}
```

### npm-based Discovery

```typescript
// Discover plugins installed as npm packages
import { createRequire } from 'module';

async function discoverNpmPlugins(prefix: string): Promise<PluginManifest[]> {
  const require = createRequire(import.meta.url);
  const packageJson = require(path.join(process.cwd(), 'package.json'));

  const pluginDeps = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).filter((name) => name.startsWith(prefix));

  const manifests: PluginManifest[] = [];

  for (const dep of pluginDeps) {
    try {
      const pluginPkg = require(`${dep}/plugin.json`);
      manifests.push(PluginManifestSchema.parse(pluginPkg));
    } catch {
      // Not a valid plugin package
    }
  }

  return manifests;
}
```

## Plugin Lifecycle Hooks

```typescript
// Plugin interface that all plugins must implement
interface Plugin {
  /** Called when the plugin is first loaded. Set up resources. */
  activate(context: PluginContext): Promise<void>;

  /** Called when the plugin is disabled or the app shuts down. Clean up. */
  deactivate(): Promise<void>;
}

// Optional lifecycle hooks (implemented via interface extension)
interface PluginWithConfig extends Plugin {
  /** Called when plugin configuration changes */
  onConfigChanged(newConfig: Record<string, unknown>): Promise<void>;
}

interface PluginWithMigration extends Plugin {
  /** Called when the plugin is updated to a new version */
  onUpdate(previousVersion: string, currentVersion: string): Promise<void>;
}

// Plugin context provided by the host
interface PluginContext {
  /** Plugin's unique identifier */
  pluginId: string;

  /** Plugin's version */
  version: string;

  /** Scoped logger */
  logger: PluginLogger;

  /** Register a command */
  registerCommand(id: string, handler: CommandHandler): Disposable;

  /** Register a UI contribution */
  registerView(location: ViewLocation, factory: ViewFactory): Disposable;

  /** Subscribe to events */
  onEvent<T>(eventName: string, handler: (data: T) => void): Disposable;

  /** Emit events */
  emitEvent<T>(eventName: string, data: T): void;

  /** Access plugin-scoped storage */
  storage: PluginStorage;

  /** Access plugin configuration */
  config: PluginConfig;

  /** Register disposables for automatic cleanup */
  subscriptions: Disposable[];
}

// Disposable pattern for cleanup
interface Disposable {
  dispose(): void;
}
```

### Lifecycle State Machine

```
                    ┌───────────┐
                    │ Discovered│
                    └─────┬─────┘
                          │ load()
                    ┌─────▼─────┐
                    │  Loaded   │ (manifest parsed, dependencies checked)
                    └─────┬─────┘
                          │ activate()
                    ┌─────▼─────┐
               ┌──→ │  Active   │ ←──┐
               │    └─────┬─────┘    │
               │          │          │
      enable() │   deactivate()    activate()
               │          │          │
               │    ┌─────▼─────┐   │
               └──  │ Inactive  │ ──┘
                    └─────┬─────┘
                          │ uninstall()
                    ┌─────▼─────┐
                    │ Uninstalled│
                    └───────────┘
```

```typescript
// Plugin manager handling lifecycle
class PluginManager {
  private plugins = new Map<string, PluginInstance>();

  async loadPlugin(manifest: PluginManifest, pluginDir: string): Promise<void> {
    // Check compatibility
    if (!satisfies(APP_VERSION, manifest.engines.myapp)) {
      throw new Error(
        `Plugin ${manifest.name}@${manifest.version} requires myapp ${manifest.engines.myapp}, ` +
        `but running ${APP_VERSION}`
      );
    }

    // Check dependencies
    await this.resolveDependencies(manifest);

    // Load the plugin module
    const entryPoint = path.join(pluginDir, manifest.main);
    const module = await import(entryPoint);
    const plugin: Plugin = module.default || module;

    if (typeof plugin.activate !== 'function') {
      throw new Error(`Plugin ${manifest.name} does not export an activate function`);
    }

    this.plugins.set(manifest.name, {
      manifest,
      plugin,
      state: 'loaded',
      context: null,
    });
  }

  async activatePlugin(name: string): Promise<void> {
    const instance = this.plugins.get(name);
    if (!instance) throw new Error(`Plugin ${name} not found`);
    if (instance.state === 'active') return;

    const context = this.createContext(instance.manifest);
    instance.context = context;

    try {
      await instance.plugin.activate(context);
      instance.state = 'active';
    } catch (error) {
      // Activation failed -- clean up any partial registrations
      for (const sub of context.subscriptions) {
        sub.dispose();
      }
      instance.state = 'error';
      throw error;
    }
  }

  async deactivatePlugin(name: string): Promise<void> {
    const instance = this.plugins.get(name);
    if (!instance || instance.state !== 'active') return;

    try {
      await instance.plugin.deactivate();
    } finally {
      // Always clean up, even if deactivate throws
      if (instance.context) {
        for (const sub of instance.context.subscriptions) {
          sub.dispose();
        }
      }
      instance.state = 'inactive';
    }
  }

  async deactivateAll(): Promise<void> {
    // Deactivate in reverse order of activation
    const active = [...this.plugins.entries()]
      .filter(([, inst]) => inst.state === 'active')
      .reverse();

    for (const [name] of active) {
      try {
        await this.deactivatePlugin(name);
      } catch (error) {
        console.error(`Failed to deactivate plugin ${name}:`, error);
      }
    }
  }
}
```

## Dependency Injection for Plugins

```typescript
// Service registry -- plugins request services by interface, not implementation
class ServiceRegistry {
  private services = new Map<string, unknown>();

  register<T>(id: string, service: T): void {
    if (this.services.has(id)) {
      throw new Error(`Service ${id} is already registered`);
    }
    this.services.set(id, service);
  }

  get<T>(id: string): T {
    const service = this.services.get(id);
    if (!service) {
      throw new Error(`Service ${id} not found. Is the providing plugin active?`);
    }
    return service as T;
  }

  has(id: string): boolean {
    return this.services.has(id);
  }
}

// Host registers core services
const registry = new ServiceRegistry();
registry.register('storage', storageService);
registry.register('http', httpService);
registry.register('ui', uiService);

// Plugin accesses services through context
class PluginContextImpl implements PluginContext {
  constructor(
    private registry: ServiceRegistry,
    private manifest: PluginManifest,
  ) {}

  getService<T>(id: string): T {
    // Check if plugin has permission to access this service
    const requiredPermission = SERVICE_PERMISSIONS[id];
    if (requiredPermission && !this.manifest.permissions.includes(requiredPermission)) {
      throw new Error(
        `Plugin ${this.manifest.name} does not have permission "${requiredPermission}" ` +
        `required to access service "${id}"`
      );
    }
    return this.registry.get<T>(id);
  }
}
```

## Versioning and Compatibility Contracts

```typescript
// Plugin API versioning with semver
import { satisfies, valid } from 'semver';

// Host declares its API version
const HOST_API_VERSION = '2.3.0';

// Plugin declares compatible range
// manifest.json: "engines": { "myapp": ">=2.0.0 <3.0.0" }

function isPluginCompatible(manifest: PluginManifest): {
  compatible: boolean;
  reason?: string;
} {
  if (!valid(manifest.version)) {
    return { compatible: false, reason: `Invalid plugin version: ${manifest.version}` };
  }

  if (!satisfies(HOST_API_VERSION, manifest.engines.myapp)) {
    return {
      compatible: false,
      reason: `Plugin requires myapp ${manifest.engines.myapp}, running ${HOST_API_VERSION}`,
    };
  }

  return { compatible: true };
}

// API stability markers
interface HostAPI {
  /** @stable - Will not change in minor/patch versions */
  registerCommand(id: string, handler: CommandHandler): Disposable;

  /** @experimental - May change in minor versions */
  registerAIProvider(provider: AIProvider): Disposable;

  /** @deprecated - Use registerCommand instead. Will be removed in v3.0 */
  addCommand(id: string, handler: CommandHandler): void;
}
```

## Sandboxing Untrusted Plugins

```typescript
// Node.js vm module for basic sandboxing
import vm from 'vm';

function createSandboxedPlugin(code: string, manifest: PluginManifest): Plugin {
  const sandbox: Record<string, unknown> = {
    console: createScopedConsole(manifest.name),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    // Expose only permitted APIs
    ...(manifest.permissions.includes('network')
      ? { fetch: createScopedFetch(manifest.name) }
      : {}),
  };

  // Block access to dangerous globals
  // fs, child_process, process.env are NOT in the sandbox

  const context = vm.createContext(sandbox);
  const script = new vm.Script(code, {
    filename: `plugin:${manifest.name}/main.js`,
    timeout: 5000, // 5 second execution limit
  });

  script.runInContext(context);
  return sandbox.exports as Plugin;
}

// Worker-based isolation for stronger sandboxing
import { Worker } from 'worker_threads';

function createWorkerPlugin(pluginPath: string, manifest: PluginManifest): PluginProxy {
  const worker = new Worker(pluginPath, {
    workerData: { manifest },
    resourceLimits: {
      maxOldGenerationSizeMb: 64,  // Memory limit
      maxYoungGenerationSizeMb: 16,
      codeRangeSizeMb: 16,
    },
  });

  // Communicate via structured messages
  return new PluginProxy(worker, manifest);
}
```

## Plugin Configuration Schemas

```typescript
// Plugin declares its configuration schema in the manifest
// plugin.json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "configuration": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "description": "API key for the service",
        "secret": true
      },
      "maxRetries": {
        "type": "number",
        "default": 3,
        "minimum": 1,
        "maximum": 10,
        "description": "Maximum retry attempts"
      },
      "theme": {
        "type": "string",
        "enum": ["light", "dark", "auto"],
        "default": "auto",
        "description": "Plugin UI theme"
      }
    },
    "required": ["apiKey"]
  }
}
```

```typescript
// Host validates plugin configuration against its schema
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

function validatePluginConfig(
  manifest: PluginManifest,
  config: Record<string, unknown>
): { valid: boolean; errors?: string[] } {
  if (!manifest.configuration) return { valid: true };

  const validate = ajv.compile(manifest.configuration);
  const valid = validate(config);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors?.map((e) => `${e.instancePath} ${e.message}`) ?? [],
    };
  }

  return { valid: true };
}

// Plugin reads its configuration through context
class PluginConfig {
  constructor(
    private pluginId: string,
    private store: ConfigStore,
    private schema: Record<string, unknown>,
  ) {}

  get<T>(key: string): T {
    const value = this.store.get(`plugins.${this.pluginId}.${key}`);
    return value as T ?? this.getDefault(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    // Validate against schema before storing
    const config = { ...this.getAll(), [key]: value };
    const result = validatePluginConfig({ configuration: this.schema } as any, config);
    if (!result.valid) {
      throw new Error(`Invalid config: ${result.errors?.join(', ')}`);
    }
    await this.store.set(`plugins.${this.pluginId}.${key}`, value);
  }
}
```

## Event Bus / Hook System

```typescript
// Typed event bus for plugin communication
type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private interceptors = new Map<string, Set<(data: unknown) => unknown>>();

  on<T>(event: string, handler: EventHandler<T>): Disposable {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);

    return {
      dispose: () => {
        this.handlers.get(event)?.delete(handler as EventHandler);
      },
    };
  }

  async emit<T>(event: string, data: T): Promise<void> {
    // Run interceptors first (can modify data)
    let processedData: unknown = data;
    const interceptors = this.interceptors.get(event);
    if (interceptors) {
      for (const interceptor of interceptors) {
        processedData = await interceptor(processedData);
      }
    }

    // Notify all handlers
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const errors: Error[] = [];
    for (const handler of handlers) {
      try {
        await handler(processedData);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      console.error(`${errors.length} handler(s) failed for event "${event}":`, errors);
    }
  }

  /** Interceptors can modify event data before handlers receive it */
  intercept<T>(event: string, interceptor: (data: T) => T | Promise<T>): Disposable {
    if (!this.interceptors.has(event)) {
      this.interceptors.set(event, new Set());
    }
    this.interceptors.get(event)!.add(interceptor as (data: unknown) => unknown);

    return {
      dispose: () => {
        this.interceptors.get(event)?.delete(interceptor as (data: unknown) => unknown);
      },
    };
  }
}

// Usage in plugins
async function activate(context: PluginContext) {
  // Listen to host events
  context.subscriptions.push(
    context.onEvent('document:saved', async (doc: Document) => {
      await formatDocument(doc);
    })
  );

  // Emit custom events for other plugins
  context.emitEvent('my-plugin:analysis-complete', { results });
}
```

## Documentation for Plugin Authors

Every plugin system must provide:

| Document | Content |
|----------|---------|
| Getting Started Guide | Scaffold a plugin, run in development, install locally |
| API Reference | Every method, event, and type with examples |
| Plugin Manifest Reference | Every field in `plugin.json` with validation rules |
| Permissions Guide | What each permission grants, why it is needed |
| Publishing Guide | How to submit to the marketplace / registry |
| Migration Guide | Breaking changes between API versions |

## Plugin Marketplace Patterns

| Feature | Implementation |
|---------|---------------|
| Search | Full-text search on name, description, tags |
| Categories | Predefined taxonomy (themes, languages, tools, integrations) |
| Ratings/reviews | User ratings with verified-install badge |
| Install count | Track unique installs, not downloads |
| Compatibility | Filter by host version compatibility |
| Verified publisher | Badge for trusted developers |
| Security scan | Automated analysis on submission |
| Auto-update | Host checks for updates periodically |

## Output Checklist

- [ ] Plugin manifest schema defined and validated with Zod or JSON Schema
- [ ] Plugin discovery supports at least two mechanisms (directory + package manager)
- [ ] Lifecycle hooks: activate, deactivate, onConfigChanged, onUpdate
- [ ] Disposable pattern for automatic cleanup on deactivation
- [ ] Service registry with permission-gated access
- [ ] Semver compatibility checking for host/plugin versions
- [ ] Sandboxing for untrusted plugins (vm or worker threads)
- [ ] Plugin configuration validated against declared schema
- [ ] Typed event bus with interceptor support
- [ ] API stability markers (stable, experimental, deprecated)
- [ ] Plugin author documentation (getting started, API reference, publishing)
