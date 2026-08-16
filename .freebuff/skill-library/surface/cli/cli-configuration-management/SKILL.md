---
name: cli-configuration-management
description: Configuration file patterns for CLI tools covering file formats, XDG Base Directory spec, config precedence, merging, secret handling, validation, and migration. Use when building CLI tools that need persistent user or project configuration.
version: 1.0.0
---

# CLI Configuration Management

Implement robust configuration for CLI tools with proper file discovery, precedence, and migration.

## Config File Formats

| Format | Pros | Cons | Best For |
|--------|------|------|----------|
| TOML | Human-readable, typed values, comments | Less familiar to some users | Rust/Go CLIs, Cargo, Poetry |
| YAML | Widespread, supports complex structures, comments | Indentation-sensitive, type coercion gotchas | DevOps tools, k8s, Docker Compose |
| JSON | Universal, strict parsing | No comments, verbose | JavaScript ecosystem, APIs |
| JSON5 / JSONC | JSON with comments and trailing commas | Non-standard, needs special parser | VS Code settings, tsconfig |
| INI | Simple, widely supported | No nesting, no arrays | Legacy tools, git config |

```toml
# TOML - Recommended for new CLI tools
# ~/.config/mycli/config.toml

[defaults]
environment = "staging"
output_format = "table"
color = "auto"  # "auto", "always", "never"

[auth]
# Token stored in OS keyring, not here
provider = "oauth"
api_url = "https://api.example.com"

[deploy]
replicas = 3
timeout = 300
health_check_path = "/healthz"

[deploy.staging]
replicas = 1
auto_approve = true

[deploy.production]
replicas = 5
auto_approve = false
require_tag = true
```

**Rule**: TOML is the recommended format for new CLI tools. It has typed values (strings, integers, booleans, dates), supports comments, and avoids YAML's type coercion pitfalls (e.g., YAML parses `no` as `false`).

## XDG Base Directory Spec

The XDG Base Directory specification defines standard locations for config, data, cache, and state files on Unix systems.

| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `$XDG_CONFIG_HOME` | `~/.config` | Configuration files | `~/.config/mycli/config.toml` |
| `$XDG_DATA_HOME` | `~/.local/share` | Persistent data | `~/.local/share/mycli/db.sqlite` |
| `$XDG_CACHE_HOME` | `~/.cache` | Non-essential cached data | `~/.cache/mycli/http-cache/` |
| `$XDG_STATE_HOME` | `~/.local/state` | State data (logs, history) | `~/.local/state/mycli/history` |

```typescript
import os from 'os';
import path from 'path';

function getConfigDir(appName: string): string {
  // Windows: %APPDATA%\mycli
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
  }

  // macOS: ~/Library/Application Support/mycli (or XDG if set)
  // Linux: $XDG_CONFIG_HOME/mycli or ~/.config/mycli
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgConfig, appName);
}

function getDataDir(appName: string): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), appName);
  }

  const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgData, appName);
}

function getCacheDir(appName: string): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), appName, 'cache');
  }

  // macOS: ~/Library/Caches/mycli
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', appName);
  }

  const xdgCache = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(xdgCache, appName);
}
```

**Rule**: Always use `$XDG_CONFIG_HOME` if set. Never hardcode `~/.config` without checking the environment variable first.
**Anti-pattern**: Dumping everything into `~/.mycli/`. Separate config, data, cache, and state into XDG directories.

## Config Precedence

Configuration values are resolved in order from highest to lowest priority.

```
Environment Variables (MYCLI_*)
        ↓ overrides
Command-line Flags (--option=value)
        ↓ overrides
Project Config (.mycli.toml in cwd or parent dirs)
        ↓ overrides
User/Global Config (~/.config/mycli/config.toml)
        ↓ overrides
Built-in Defaults
```

```typescript
import { z } from 'zod';
import TOML from '@iarna/toml';
import fs from 'fs';
import path from 'path';

const ConfigSchema = z.object({
  environment: z.enum(['dev', 'staging', 'production']).default('staging'),
  outputFormat: z.enum(['table', 'json', 'csv']).default('table'),
  color: z.enum(['auto', 'always', 'never']).default('auto'),
  replicas: z.number().int().min(1).max(20).default(3),
  timeout: z.number().int().min(1).default(300),
  verbose: z.boolean().default(false),
});

type Config = z.infer<typeof ConfigSchema>;

function resolveConfig(flags: Partial<Config>): Config {
  // 1. Built-in defaults (from Zod schema defaults)
  const defaults = ConfigSchema.parse({});

  // 2. Global config
  const globalConfig = loadTomlConfig(
    path.join(getConfigDir('mycli'), 'config.toml')
  );

  // 3. Project config (walk up from cwd)
  const projectConfig = loadTomlConfig(
    findProjectConfig(process.cwd(), '.mycli.toml')
  );

  // 4. Environment variables
  const envConfig: Partial<Config> = {};
  if (process.env.MYCLI_ENVIRONMENT) envConfig.environment = process.env.MYCLI_ENVIRONMENT as Config['environment'];
  if (process.env.MYCLI_OUTPUT_FORMAT) envConfig.outputFormat = process.env.MYCLI_OUTPUT_FORMAT as Config['outputFormat'];
  if (process.env.MYCLI_REPLICAS) envConfig.replicas = parseInt(process.env.MYCLI_REPLICAS, 10);
  if (process.env.MYCLI_VERBOSE) envConfig.verbose = process.env.MYCLI_VERBOSE === 'true';

  // 5. Command-line flags (highest priority)
  const merged = { ...defaults, ...globalConfig, ...projectConfig, ...envConfig, ...stripUndefined(flags) };

  return ConfigSchema.parse(merged);
}

function findProjectConfig(startDir: string, filename: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null; // Reached root
    dir = parent;
  }
}

function loadTomlConfig(filePath: string | null): Partial<Config> {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return TOML.parse(content) as Partial<Config>;
  } catch (error) {
    console.error(`Warning: Failed to parse config at ${filePath}: ${(error as Error).message}`);
    return {};
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
```

## Config File Discovery and Merging

```typescript
// Walk up directory tree looking for project config
// Similar to how .eslintrc, .prettierrc, .gitignore work

function findConfigFiles(startDir: string): string[] {
  const configs: string[] = [];
  let dir = startDir;

  while (true) {
    const candidate = path.join(dir, '.mycli.toml');
    if (fs.existsSync(candidate)) {
      configs.unshift(candidate); // Parent configs first (lower priority)
    }

    // Stop at git repo root or filesystem root
    if (fs.existsSync(path.join(dir, '.git'))) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return configs;
}

// Merge multiple config files (deepest directory wins)
function mergeProjectConfigs(configPaths: string[]): Partial<Config> {
  let merged: Partial<Config> = {};
  for (const configPath of configPaths) {
    const config = loadTomlConfig(configPath);
    merged = { ...merged, ...config };
  }
  return merged;
}
```

## Secret Handling in Config

```typescript
import keytar from 'keytar';

const SERVICE_NAME = 'mycli';

// Secrets NEVER go in config files
async function getApiToken(): Promise<string> {
  // 1. Check environment variable first (CI/CD)
  if (process.env.MYCLI_API_TOKEN) {
    return process.env.MYCLI_API_TOKEN;
  }

  // 2. Check OS keyring
  const stored = await keytar.getPassword(SERVICE_NAME, 'api-token');
  if (stored) return stored;

  // 3. Interactive prompt (only in TTY)
  if (process.stdin.isTTY) {
    const token = await promptForToken();
    await keytar.setPassword(SERVICE_NAME, 'api-token', token);
    return token;
  }

  console.error('Error: API token required. Set MYCLI_API_TOKEN or run `mycli auth login`.');
  process.exit(1);
}

// Warn if secrets are found in config files
function auditConfigForSecrets(configPath: string): void {
  const content = fs.readFileSync(configPath, 'utf-8');
  const sensitivePatterns = [
    /token\s*=\s*["'][^"']+["']/i,
    /password\s*=\s*["'][^"']+["']/i,
    /secret\s*=\s*["'][^"']+["']/i,
    /api[_-]?key\s*=\s*["'][^"']+["']/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(content)) {
      console.error(
        `Warning: Possible secret found in ${configPath}. ` +
        `Use 'mycli auth login' to store credentials securely in the OS keyring.`
      );
      break;
    }
  }
}
```

**Rule**: Config files should never contain secrets. Secrets belong in the OS keyring or environment variables.
**Rule**: If a config file contains what looks like a secret, warn the user loudly.

## Config Validation and Migration

```typescript
import { z } from 'zod';

// Versioned config schema
const ConfigV1Schema = z.object({
  version: z.literal(1),
  server: z.string().url(),
  timeout: z.number(),
});

const ConfigV2Schema = z.object({
  version: z.literal(2),
  api: z.object({
    url: z.string().url(),
    timeout: z.number(),
    retries: z.number().default(3),
  }),
});

type ConfigV1 = z.infer<typeof ConfigV1Schema>;
type ConfigV2 = z.infer<typeof ConfigV2Schema>;

const CURRENT_VERSION = 2;

function migrateConfig(raw: unknown): ConfigV2 {
  const obj = raw as Record<string, unknown>;
  const version = (obj.version as number) ?? 1;

  if (version === CURRENT_VERSION) {
    return ConfigV2Schema.parse(raw);
  }

  if (version === 1) {
    const v1 = ConfigV1Schema.parse(raw);
    const migrated: ConfigV2 = {
      version: 2,
      api: {
        url: v1.server,
        timeout: v1.timeout,
        retries: 3,
      },
    };

    console.error(`Migrated config from v${version} to v${CURRENT_VERSION}`);
    return ConfigV2Schema.parse(migrated);
  }

  throw new Error(`Unknown config version: ${version}. Expected ${CURRENT_VERSION}.`);
}
```

## `init` / `config set` Subcommand Patterns

```typescript
// mycli init - Create config file interactively
async function initConfig(): Promise<void> {
  const configPath = path.join(getConfigDir('mycli'), 'config.toml');

  if (fs.existsSync(configPath)) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: `Config already exists at ${configPath}. Overwrite?`,
      default: false,
    }]);
    if (!overwrite) return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'environment',
      message: 'Default environment:',
      choices: ['dev', 'staging', 'production'],
      default: 'staging',
    },
    {
      type: 'list',
      name: 'outputFormat',
      message: 'Default output format:',
      choices: ['table', 'json', 'csv'],
      default: 'table',
    },
  ]);

  const toml = generateToml(answers);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, toml, 'utf-8');
  console.log(`Config written to ${configPath}`);
}

// mycli config set <key> <value>
async function configSet(key: string, value: string): Promise<void> {
  const configPath = path.join(getConfigDir('mycli'), 'config.toml');
  const config = loadTomlConfig(configPath) ?? {};

  // Dot notation: "deploy.replicas" -> config.deploy.replicas
  setNestedValue(config, key, parseValue(value));

  // Validate the full config
  const validated = ConfigSchema.safeParse(config);
  if (!validated.success) {
    console.error(`Invalid value for ${key}: ${validated.error.message}`);
    process.exit(1);
  }

  fs.writeFileSync(configPath, TOML.stringify(config), 'utf-8');
  console.log(`Set ${key} = ${value}`);
}

// mycli config get <key>
function configGet(key: string): void {
  const config = resolveConfig({});
  const value = getNestedValue(config, key);

  if (value === undefined) {
    console.error(`Unknown config key: ${key}`);
    process.exit(1);
  }

  console.log(value);
}

// mycli config list
function configList(options: { format: string }): void {
  const config = resolveConfig({});
  if (options.format === 'json') {
    console.log(JSON.stringify(config, null, 2));
  } else {
    for (const [key, value] of flattenConfig(config)) {
      console.log(`${key} = ${value}`);
    }
  }
}
```

## Dotfile Conventions

| Pattern | Example | Used By |
|---------|---------|---------|
| Dotfile in home | `~/.myclirc` | Older tools (bash, vim) |
| XDG config dir | `~/.config/mycli/config.toml` | Modern tools (recommended) |
| Project dotfile | `.mycli.toml` in project root | ESLint, Prettier, EditorConfig |
| package.json field | `"mycli": { ... }` in package.json | Jest, Babel (JS ecosystem only) |

**Rule**: For new tools, use XDG config directory for global config and a dotfile in project root for project config. Do not create dotfiles in `$HOME` directly.

## Output Checklist

- [ ] Config file uses TOML (or YAML if ecosystem expects it)
- [ ] Config file location follows XDG Base Directory spec
- [ ] Config precedence: env vars > flags > project config > global config > defaults
- [ ] Project config discovered by walking up directory tree
- [ ] Config validated with Zod schema
- [ ] Config migration handles version upgrades
- [ ] Secrets stored in OS keyring, not config files
- [ ] Warning emitted if secrets detected in config files
- [ ] `mycli init` creates config interactively
- [ ] `mycli config get/set/list` subcommands available
- [ ] Config file paths reported in `--verbose` output
