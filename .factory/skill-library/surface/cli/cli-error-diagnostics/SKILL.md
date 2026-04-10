---
name: cli-error-diagnostics
description: Error handling and diagnostic patterns for CLI tools covering structured error messages, actionable suggestions, verbose mode, diagnostic commands, log files, and crash reports. Use when building CLI tools that need clear, helpful error output.
version: 1.0.0
---

# CLI Error Diagnostics

Build CLI tools that produce clear, actionable error messages and provide diagnostic capabilities for troubleshooting.

## Structured Error Messages

Every error message must answer three questions: What happened? Why did it happen? What can the user do about it?

```
Error: Failed to deploy to production.
  Cause: Authentication token expired 2 hours ago.
  Fix: Run `mycli auth login` to refresh your credentials.
```

```typescript
import chalk from 'chalk';

interface CliError {
  message: string;
  cause?: string;
  fix?: string;
  code?: string;
  details?: string;
}

function formatError(error: CliError): string {
  const lines: string[] = [];

  lines.push(chalk.red(`Error${error.code ? ` [${error.code}]` : ''}: ${error.message}`));

  if (error.cause) {
    lines.push(chalk.dim(`  Cause: ${error.cause}`));
  }

  if (error.details) {
    lines.push(chalk.dim(`  Details: ${error.details}`));
  }

  if (error.fix) {
    lines.push(chalk.cyan(`  Fix: ${error.fix}`));
  }

  return lines.join('\n');
}

// Usage
function handleDeployError(error: unknown): never {
  if (error instanceof AuthExpiredError) {
    console.error(formatError({
      message: 'Failed to deploy to production.',
      cause: `Authentication token expired ${error.expiredAgo}.`,
      fix: 'Run `mycli auth login` to refresh your credentials.',
      code: 'AUTH_EXPIRED',
    }));
    process.exit(77);
  }

  if (error instanceof ConfigNotFoundError) {
    console.error(formatError({
      message: 'No configuration file found.',
      cause: `Searched in ${error.searchedPaths.join(', ')}.`,
      fix: 'Run `mycli init` to create a configuration file.',
      code: 'CONFIG_NOT_FOUND',
    }));
    process.exit(65);
  }

  // Unknown error
  console.error(formatError({
    message: 'An unexpected error occurred.',
    cause: (error as Error).message,
    fix: 'Run with --verbose for more details, or file an issue at https://github.com/example/mycli/issues',
    code: 'INTERNAL',
  }));
  process.exit(70);
}
```

**Anti-pattern**: `Error: Something went wrong` -- no context, no cause, no fix.
**Anti-pattern**: Printing a raw stack trace to users. Stack traces belong in `--verbose` mode or log files.

## Actionable Suggestions

### "Did You Mean?" for Typos

```typescript
import { distance } from 'fastest-levenshtein';

function suggestCommand(input: string, validCommands: string[]): string | null {
  const MAX_DISTANCE = 3;

  const suggestions = validCommands
    .map((cmd) => ({ cmd, dist: distance(input, cmd) }))
    .filter(({ dist }) => dist <= MAX_DISTANCE)
    .sort((a, b) => a.dist - b.dist);

  return suggestions.length > 0 ? suggestions[0].cmd : null;
}

// Usage
function handleUnknownCommand(input: string): never {
  const suggestion = suggestCommand(input, ['deploy', 'status', 'logs', 'config', 'auth']);

  const error: CliError = {
    message: `Unknown command: ${input}`,
    code: 'UNKNOWN_COMMAND',
  };

  if (suggestion) {
    error.fix = `Did you mean \`mycli ${suggestion}\`?`;
  } else {
    error.fix = 'Run `mycli --help` to see available commands.';
  }

  console.error(formatError(error));
  process.exit(2);
}
```

### Context-Aware Suggestions

```typescript
// Suggest fixes based on common error patterns
function suggestFix(error: Error): string | undefined {
  const msg = error.message.toLowerCase();

  if (msg.includes('eacces') || msg.includes('permission denied')) {
    return process.platform === 'win32'
      ? 'Try running the terminal as Administrator.'
      : 'Try running with `sudo` or check file permissions with `ls -la`.';
  }

  if (msg.includes('econnrefused')) {
    return 'The server may be down. Check your network connection or verify the API URL in your config.';
  }

  if (msg.includes('enotfound') || msg.includes('getaddrinfo')) {
    return 'DNS resolution failed. Check your internet connection or verify the hostname.';
  }

  if (msg.includes('certificate') || msg.includes('ssl') || msg.includes('tls')) {
    return 'TLS certificate validation failed. If behind a corporate proxy, set NODE_EXTRA_CA_CERTS.';
  }

  if (msg.includes('out of memory') || msg.includes('heap')) {
    return 'Try increasing memory with NODE_OPTIONS="--max-old-space-size=4096".';
  }

  return undefined;
}
```

## Verbose / Debug Mode

```typescript
enum LogLevel {
  Quiet = 0,
  Normal = 1,
  Verbose = 2,
  Debug = 3,
}

class Logger {
  constructor(private level: LogLevel) {}

  error(msg: string, details?: string): void {
    console.error(chalk.red(`Error: ${msg}`));
    if (details && this.level >= LogLevel.Verbose) {
      console.error(chalk.dim(details));
    }
  }

  warn(msg: string): void {
    if (this.level >= LogLevel.Normal) {
      console.error(chalk.yellow(`Warning: ${msg}`));
    }
  }

  info(msg: string): void {
    if (this.level >= LogLevel.Normal) {
      console.error(msg);
    }
  }

  verbose(msg: string): void {
    if (this.level >= LogLevel.Verbose) {
      console.error(chalk.dim(`  ${msg}`));
    }
  }

  debug(msg: string): void {
    if (this.level >= LogLevel.Debug) {
      console.error(chalk.gray(`[debug] ${msg}`));
    }
  }

  // Structured debug: show timing, context
  debugTiming(label: string, startTime: number): void {
    if (this.level >= LogLevel.Debug) {
      const elapsed = Date.now() - startTime;
      console.error(chalk.gray(`[debug] ${label}: ${elapsed}ms`));
    }
  }
}

// Initialize from flags
function createLogger(options: { verbose?: boolean; quiet?: boolean; debug?: boolean }): Logger {
  if (options.debug) return new Logger(LogLevel.Debug);
  if (options.verbose) return new Logger(LogLevel.Verbose);
  if (options.quiet) return new Logger(LogLevel.Quiet);
  return new Logger(LogLevel.Normal);
}
```

```
# Normal output
$ mycli deploy staging
Deploying to staging...
✓ Deployed v1.2.0 to staging

# Verbose output
$ mycli deploy staging --verbose
  Loading config from /home/user/.config/mycli/config.toml
  Resolved environment: staging (from argument)
  Authenticating with token from keyring
  Building from tag v1.2.0
Deploying to staging...
  Creating deployment manifest
  Uploading 3 artifacts (12.4 MB)
  Running health checks (attempt 1/3)
✓ Deployed v1.2.0 to staging in 34s

# Debug output
$ mycli deploy staging --debug
[debug] Config paths searched: .mycli.toml, /home/user/.config/mycli/config.toml
[debug] Config loaded: { environment: 'staging', replicas: 1 }
[debug] Auth token expires in 3420s
[debug] API request: POST https://api.example.com/deployments
[debug] API response: 201 Created (234ms)
[debug] Health check: GET https://staging.example.com/healthz -> 200 (89ms)
```

## Diagnostic Commands

### `mycli doctor` / `mycli check`

```typescript
interface Check {
  name: string;
  check: () => Promise<CheckResult>;
}

interface CheckResult {
  status: 'ok' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

const diagnosticChecks: Check[] = [
  {
    name: 'Configuration file',
    check: async () => {
      const configPath = getConfigPath();
      if (fs.existsSync(configPath)) {
        return { status: 'ok', message: `Found at ${configPath}` };
      }
      return {
        status: 'warn',
        message: 'No config file found',
        fix: 'Run `mycli init` to create one',
      };
    },
  },
  {
    name: 'Authentication',
    check: async () => {
      const token = await getStoredToken();
      if (!token) {
        return { status: 'fail', message: 'Not authenticated', fix: 'Run `mycli auth login`' };
      }
      if (isTokenExpired(token)) {
        return { status: 'fail', message: 'Token expired', fix: 'Run `mycli auth login`' };
      }
      return { status: 'ok', message: `Authenticated as ${token.user}` };
    },
  },
  {
    name: 'API connectivity',
    check: async () => {
      try {
        const start = Date.now();
        await fetch(`${getApiUrl()}/health`);
        const elapsed = Date.now() - start;
        return { status: 'ok', message: `Reachable (${elapsed}ms)` };
      } catch (error) {
        return {
          status: 'fail',
          message: `Cannot reach API: ${(error as Error).message}`,
          fix: 'Check your network connection and API URL in config',
        };
      }
    },
  },
  {
    name: 'Required tools',
    check: async () => {
      const missing: string[] = [];
      for (const tool of ['git', 'docker']) {
        try {
          execFileSync('which', [tool], { stdio: 'pipe' });
        } catch {
          missing.push(tool);
        }
      }
      if (missing.length > 0) {
        return { status: 'fail', message: `Missing: ${missing.join(', ')}`, fix: `Install ${missing.join(' and ')}` };
      }
      return { status: 'ok', message: 'git, docker found' };
    },
  },
];

async function runDoctor(): Promise<void> {
  console.log(chalk.bold('\nDiagnostics\n'));

  let hasFailures = false;

  for (const check of diagnosticChecks) {
    const result = await check.check();
    const icon = result.status === 'ok' ? chalk.green('✓')
               : result.status === 'warn' ? chalk.yellow('⚠')
               : chalk.red('✗');

    console.log(`  ${icon} ${check.name}: ${result.message}`);
    if (result.fix) {
      console.log(chalk.cyan(`    Fix: ${result.fix}`));
    }

    if (result.status === 'fail') hasFailures = true;
  }

  console.log('');
  process.exit(hasFailures ? 1 : 0);
}
```

```
$ mycli doctor

Diagnostics

  ✓ Configuration file: Found at /home/user/.config/mycli/config.toml
  ✗ Authentication: Token expired
    Fix: Run `mycli auth login`
  ✓ API connectivity: Reachable (89ms)
  ✓ Required tools: git, docker found
```

## Log File Locations

```typescript
import path from 'path';
import os from 'os';
import fs from 'fs';

function getLogDir(appName: string): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), appName, 'logs');
  }
  const stateDir = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return path.join(stateDir, appName);
}

function writeLogFile(appName: string, content: string): string {
  const logDir = getLogDir(appName);
  fs.mkdirSync(logDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(logDir, `${appName}-${timestamp}.log`);

  fs.writeFileSync(logPath, content, 'utf-8');

  // Rotate: keep only last 10 log files
  const files = fs.readdirSync(logDir)
    .filter((f) => f.endsWith('.log'))
    .sort()
    .reverse();

  for (const file of files.slice(10)) {
    fs.unlinkSync(path.join(logDir, file));
  }

  return logPath;
}
```

## Crash Report Formatting

```typescript
function generateCrashReport(error: Error): string {
  const report = [
    `mycli crash report`,
    `==================`,
    ``,
    `Date: ${new Date().toISOString()}`,
    `Version: ${getVersion()}`,
    `Node.js: ${process.version}`,
    `OS: ${os.platform()} ${os.release()} (${os.arch()})`,
    `Shell: ${process.env.SHELL || process.env.ComSpec || 'unknown'}`,
    ``,
    `Error: ${error.message}`,
    ``,
    `Stack trace:`,
    error.stack || '  (no stack trace available)',
    ``,
    `Configuration:`,
    `  Config path: ${getConfigPath() || 'not found'}`,
    `  API URL: ${getApiUrl()}`,
    ``,
    `Environment:`,
    `  MYCLI_* vars: ${Object.keys(process.env).filter((k) => k.startsWith('MYCLI_')).join(', ') || 'none'}`,
    `  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`,
    `  CI: ${process.env.CI || 'not set'}`,
  ].join('\n');

  return report;
}

function handleUnexpectedError(error: Error): never {
  const report = generateCrashReport(error);
  const logPath = writeLogFile('mycli', report);

  console.error(formatError({
    message: 'An unexpected error occurred.',
    code: 'CRASH',
    fix: [
      `A crash report has been saved to: ${logPath}`,
      `Please file an issue at https://github.com/example/mycli/issues`,
      `and include the crash report.`,
    ].join('\n        '),
  }));

  process.exit(70);
}

// Global error handlers
process.on('uncaughtException', handleUnexpectedError);
process.on('unhandledRejection', (reason) => {
  handleUnexpectedError(reason instanceof Error ? reason : new Error(String(reason)));
});
```

## Error Codes

```typescript
// Define a complete error code catalog
const ERROR_CODES = {
  // Authentication (100-199)
  AUTH_EXPIRED: { code: 100, exit: 77, message: 'Authentication token has expired' },
  AUTH_INVALID: { code: 101, exit: 77, message: 'Invalid authentication credentials' },
  AUTH_MISSING: { code: 102, exit: 77, message: 'No authentication credentials found' },

  // Configuration (200-299)
  CONFIG_NOT_FOUND: { code: 200, exit: 65, message: 'Configuration file not found' },
  CONFIG_INVALID: { code: 201, exit: 65, message: 'Configuration file is invalid' },
  CONFIG_VERSION: { code: 202, exit: 65, message: 'Configuration version not supported' },

  // Network (300-399)
  NET_UNREACHABLE: { code: 300, exit: 69, message: 'API server is unreachable' },
  NET_TIMEOUT: { code: 301, exit: 69, message: 'Request timed out' },
  NET_SSL: { code: 302, exit: 69, message: 'TLS certificate verification failed' },

  // Input (400-499)
  INPUT_INVALID: { code: 400, exit: 65, message: 'Invalid input data' },
  INPUT_MISSING: { code: 401, exit: 64, message: 'Required input not provided' },
} as const;
```

**Rule**: Error codes should be documented in `mycli --help` or `mycli help errors` so users and scripts can handle specific failures.

## Colored Error Output

```typescript
// Error output respects NO_COLOR and non-TTY
function printError(error: CliError): void {
  const useColor = process.stderr.isTTY && process.env.NO_COLOR === undefined;

  const red = useColor ? (s: string) => `\x1b[31m${s}\x1b[0m` : (s: string) => s;
  const dim = useColor ? (s: string) => `\x1b[2m${s}\x1b[0m` : (s: string) => s;
  const cyan = useColor ? (s: string) => `\x1b[36m${s}\x1b[0m` : (s: string) => s;

  process.stderr.write(red(`Error: ${error.message}`) + '\n');
  if (error.cause) process.stderr.write(dim(`  Cause: ${error.cause}`) + '\n');
  if (error.fix) process.stderr.write(cyan(`  Fix: ${error.fix}`) + '\n');
}
```

## Output Checklist

- [ ] Every error message includes what happened, why, and how to fix it
- [ ] "Did you mean?" suggestions for typos in commands and flags
- [ ] `--verbose` flag shows detailed progress and context
- [ ] `--debug` flag shows raw API requests, timing, and internal state
- [ ] `mycli doctor` command checks all prerequisites and dependencies
- [ ] Log files written to XDG state directory with automatic rotation
- [ ] Crash reports include version, OS, Node.js version, and sanitized config
- [ ] Defined error codes documented and machine-readable
- [ ] Errors go to stderr, never stdout
- [ ] Colors degrade gracefully with NO_COLOR and non-TTY
