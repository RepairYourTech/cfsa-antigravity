---
name: cli-ux-design
description: Terminal user experience patterns covering argument conventions, help text, colored output, progress indicators, interactive prompts, table formatting, exit codes, and subcommand design. Use when building command-line tools that need professional, user-friendly terminal interfaces.
version: 1.0.0
---

# CLI UX Design

Build command-line tools with professional terminal UX that follows established conventions and degrades gracefully.

## Argument and Flag Conventions

### POSIX / GNU Standards

| Convention | Example | Rule |
|-----------|---------|------|
| Short flags | `-v`, `-f` | Single character, single dash |
| Long flags | `--verbose`, `--file` | Full word, double dash |
| Combined short flags | `-vf` (same as `-v -f`) | Only boolean flags combine |
| Flag with value | `-f output.txt` or `--file=output.txt` | Space or `=` separator |
| Positional arguments | `mycli build src/` | After all flags |
| `--` separator | `mycli -- -f` | Everything after `--` is positional |
| Standard flags | `--help`, `--version`, `--verbose`, `--quiet` | Always implement these |

```typescript
// Node.js - Commander.js argument definitions
import { Command } from 'commander';

const program = new Command();

program
  .name('deploy')
  .description('Deploy application to production')
  .version('1.2.0', '-V, --version', 'Display version number')
  .argument('<environment>', 'Target environment (staging, production)')
  .option('-f, --force', 'Skip confirmation prompts')
  .option('-t, --tag <tag>', 'Deploy specific git tag')
  .option('-r, --replicas <count>', 'Number of replicas', parseInt, 3)
  .option('--no-cache', 'Build without cache')
  .option('--dry-run', 'Show what would happen without executing')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress all output except errors')
  .action(async (environment, options) => {
    await deploy(environment, options);
  });

program.parse();
```

```rust
// Rust - clap argument definitions
use clap::Parser;

#[derive(Parser)]
#[command(name = "deploy")]
#[command(about = "Deploy application to production")]
#[command(version)]
struct Cli {
    /// Target environment (staging, production)
    environment: String,

    /// Skip confirmation prompts
    #[arg(short, long)]
    force: bool,

    /// Deploy specific git tag
    #[arg(short, long)]
    tag: Option<String>,

    /// Number of replicas
    #[arg(short, long, default_value_t = 3)]
    replicas: u32,

    /// Build without cache
    #[arg(long)]
    no_cache: bool,

    /// Show what would happen without executing
    #[arg(long)]
    dry_run: bool,

    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,

    /// Suppress all output except errors
    #[arg(short, long)]
    quiet: bool,
}
```

**Rule**: Every CLI must support `--help` and `--version`. These are non-negotiable.
**Anti-pattern**: Flags that require values but accept no space separator (`-foutput.txt`). Always support both `-f output.txt` and `--file=output.txt`.

## Help Text Formatting

Follow the `man` page convention: NAME, SYNOPSIS, DESCRIPTION, OPTIONS, EXAMPLES, EXIT STATUS.

```
USAGE:
  deploy <environment> [options]

ARGUMENTS:
  environment    Target environment (staging, production)

OPTIONS:
  -f, --force              Skip confirmation prompts
  -t, --tag <tag>          Deploy specific git tag
  -r, --replicas <count>   Number of replicas (default: 3)
      --no-cache           Build without cache
      --dry-run            Show what would happen without executing
  -v, --verbose            Enable verbose output
  -q, --quiet              Suppress all output except errors
  -h, --help               Show this help message
  -V, --version            Show version number

EXAMPLES:
  deploy staging                       Deploy to staging with defaults
  deploy production --tag v1.2.0       Deploy specific tag to production
  deploy staging --dry-run --verbose   Preview staging deployment

ENVIRONMENT VARIABLES:
  DEPLOY_TOKEN    Authentication token (required)
  DEPLOY_REGION   Target region (default: us-east-1)
```

**Rule**: Align option descriptions vertically. Short flag, long flag, value placeholder, then description.
**Rule**: Include at least 2-3 real-world examples in `--help` output. Examples are the most-read part of help text.

## Colored Output with NO_COLOR / TERM Support

```typescript
import chalk from 'chalk';

// Respect NO_COLOR standard (https://no-color.org)
// chalk does this automatically, but verify for custom implementations
function supportsColor(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  if (!process.stdout.isTTY) return false;
  if (process.env.TERM === 'dumb') return false;
  return true;
}

// Semantic color usage
const log = {
  success: (msg: string) => console.log(chalk.green(`  ✓ ${msg}`)),
  error: (msg: string) => console.error(chalk.red(`  ✗ ${msg}`)),
  warning: (msg: string) => console.error(chalk.yellow(`  ⚠ ${msg}`)),
  info: (msg: string) => console.log(chalk.blue(`  ℹ ${msg}`)),
  dim: (msg: string) => console.log(chalk.dim(`    ${msg}`)),
  heading: (msg: string) => console.log(chalk.bold(`\n${msg}`)),
};

// Usage
log.heading('Deploying to production');
log.info('Building from tag v1.2.0');
log.success('Build completed in 23s');
log.warning('Cache was stale, rebuilt from scratch');
log.error('Health check failed after 3 retries');
```

**Rule**: Errors and warnings go to `stderr`. Success and info go to `stdout`. This allows `mycli 2>/dev/null` to show only results.
**Rule**: Never use color as the only indicator of meaning. Pair with symbols: checkmark for success, X for error, triangle for warning.

## Progress Bars and Spinners

```typescript
import ora from 'ora';
import cliProgress from 'cli-progress';

// Spinner for indeterminate operations
async function withSpinner<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const spinner = ora(label).start();

  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

// Usage
const config = await withSpinner('Loading configuration', loadConfig);
await withSpinner('Deploying to staging', () => deploy('staging'));

// Progress bar for determinate operations
function downloadWithProgress(url: string, total: number) {
  const bar = new cliProgress.SingleBar({
    format: '  Downloading |{bar}| {percentage}% | {value}/{total} MB',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });

  bar.start(total, 0);

  // Update during download
  onProgress((downloaded) => bar.update(downloaded));
  onComplete(() => bar.stop());
}
```

**Rule**: Use spinners for operations with unknown duration. Use progress bars for operations with measurable progress.
**Anti-pattern**: Showing a spinner on a non-TTY. Check `process.stdout.isTTY` and fall back to simple log lines.

## Interactive Prompts with Non-TTY Fallback

```typescript
import inquirer from 'inquirer';

async function confirmDeployment(environment: string, options: DeployOptions): Promise<boolean> {
  // Non-interactive mode: use --force flag
  if (!process.stdin.isTTY || options.force) {
    if (!options.force) {
      console.error('Error: Confirmation required. Use --force to skip or run in an interactive terminal.');
      process.exit(1);
    }
    return true;
  }

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Deploy to ${environment}? This will affect live users.`,
      default: false,
    },
  ]);

  return confirmed;
}

// Select prompt with search
async function selectEnvironment(): Promise<string> {
  if (!process.stdin.isTTY) {
    console.error('Error: Environment selection requires an interactive terminal. Pass environment as argument.');
    process.exit(1);
  }

  const { environment } = await inquirer.prompt([
    {
      type: 'list',
      name: 'environment',
      message: 'Select target environment:',
      choices: [
        { name: 'Development', value: 'dev' },
        { name: 'Staging', value: 'staging' },
        { name: 'Production (requires approval)', value: 'production' },
      ],
    },
  ]);

  return environment;
}
```

**Rule**: Every interactive prompt must have a non-interactive equivalent (flag or argument). CI/CD pipelines do not have TTYs.

## Table and List Formatting

```typescript
import { table } from 'table';

// Simple aligned table
function printTable(headers: string[], rows: string[][]) {
  const config = {
    border: {
      topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
      bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
      bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
      joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼',
    },
  };

  console.log(table([headers, ...rows], config));
}

// For machine consumption, output JSON
function printOutput(data: unknown[], format: 'table' | 'json' | 'csv') {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(data, null, 2));
      break;
    case 'csv':
      console.log(toCsv(data));
      break;
    case 'table':
    default:
      printTable(Object.keys(data[0] as object), data.map((row) => Object.values(row as object).map(String)));
  }
}
```

```
┌─────────────┬──────────┬────────┬─────────┐
│ Environment │ Status   │ Uptime │ Version │
├─────────────┼──────────┼────────┼─────────┤
│ production  │ healthy  │ 14d    │ v1.2.0  │
│ staging     │ healthy  │ 3d     │ v1.3.0  │
│ development │ degraded │ 1h     │ v1.3.1  │
└─────────────┴──────────┴────────┴─────────┘
```

## Paging Long Output

```typescript
import { spawn } from 'child_process';

function pageOutput(content: string) {
  if (!process.stdout.isTTY) {
    // Not a terminal, just print
    process.stdout.write(content);
    return;
  }

  const pager = process.env.PAGER || 'less';
  const pagerProcess = spawn(pager, ['-R'], { // -R for color passthrough
    stdio: ['pipe', process.stdout, process.stderr],
  });

  pagerProcess.stdin.write(content);
  pagerProcess.stdin.end();
}
```

## Exit Codes and Meanings

| Code | Meaning | When to Use |
|------|---------|-------------|
| 0 | Success | Operation completed without errors |
| 1 | General error | Catch-all for failures |
| 2 | Misuse of command | Invalid arguments, missing required flags |
| 64 | Usage error (EX_USAGE) | Incorrect usage syntax |
| 65 | Data error (EX_DATAERR) | Input data was incorrect |
| 69 | Unavailable (EX_UNAVAILABLE) | Service unavailable |
| 70 | Internal error (EX_SOFTWARE) | Unexpected internal error |
| 73 | Can't create (EX_CANTCREAT) | Cannot create output file |
| 77 | Permission denied (EX_NOPERM) | Insufficient permissions |
| 130 | Interrupted (SIGINT) | User pressed Ctrl+C |

```typescript
// Define exit codes as constants
const EXIT = {
  SUCCESS: 0,
  ERROR: 1,
  INVALID_ARGS: 2,
  AUTH_FAILED: 77,
  SERVICE_UNAVAILABLE: 69,
} as const;

// Use in main function
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args) process.exit(EXIT.INVALID_ARGS);

    await run(args);
    process.exit(EXIT.SUCCESS);
  } catch (error) {
    if (error instanceof AuthError) process.exit(EXIT.AUTH_FAILED);
    if (error instanceof NetworkError) process.exit(EXIT.SERVICE_UNAVAILABLE);
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(EXIT.ERROR);
  }
}
```

**Rule**: Exit code 0 means success. Any non-zero means failure. Scripts and CI depend on this.

## stderr vs stdout Separation

| Stream | Content |
|--------|---------|
| `stdout` | Results, data, formatted output (piped to next command or file) |
| `stderr` | Errors, warnings, progress indicators, debug info (shown to user) |

```typescript
// Correct separation
console.log(JSON.stringify(results));      // stdout: pipeable data
console.error('Processing complete');       // stderr: status message
console.error(`Processed ${count} items`); // stderr: progress info

// Example: mycli list --format json 2>/dev/null | jq '.name'
// stdout (JSON data) goes to jq, stderr (progress) goes to /dev/null
```

## Subcommand Patterns

```
mycli <command> [subcommand] [options] [arguments]
```

```typescript
// Commander.js - Subcommand pattern
const program = new Command();

program
  .name('mycli')
  .description('My application CLI')
  .version('1.0.0');

// mycli deploy <env>
program
  .command('deploy')
  .description('Deploy to an environment')
  .argument('<environment>')
  .option('--tag <tag>', 'Git tag to deploy')
  .action(deploy);

// mycli config get <key>
const configCmd = program
  .command('config')
  .description('Manage configuration');

configCmd
  .command('get')
  .argument('<key>')
  .description('Get a configuration value')
  .action(configGet);

configCmd
  .command('set')
  .argument('<key>')
  .argument('<value>')
  .description('Set a configuration value')
  .action(configSet);

configCmd
  .command('list')
  .description('List all configuration values')
  .option('--format <format>', 'Output format', 'table')
  .action(configList);
```

## Version Display Conventions

```
$ mycli --version
mycli 1.2.0

$ mycli --version --verbose
mycli 1.2.0
  Node.js: v20.11.0
  OS: linux x64
  Config: /home/user/.config/mycli/config.toml
```

## Popular CLI Libraries

| Language | Library | Strengths |
|----------|---------|-----------|
| Node.js | Commander.js | Simple, well-documented, widely used |
| Node.js | yargs | Rich feature set, middleware support |
| Node.js | Clipanion | Type-safe, used by Yarn |
| Deno | Cliffy | Native Deno support, inspired by Commander |
| Rust | clap | Derive macros, shell completions, fast |
| Go | cobra | Industry standard, used by kubectl, Hugo |
| Python | click | Decorator-based, composable |
| Python | typer | Type hints to CLI, built on click |

## Output Checklist

- [ ] `--help` and `--version` flags implemented
- [ ] Arguments follow POSIX/GNU conventions
- [ ] Help text includes real-world examples
- [ ] Colors respect NO_COLOR and non-TTY environments
- [ ] Errors and progress go to stderr, data goes to stdout
- [ ] Spinners/progress bars degrade to log lines on non-TTY
- [ ] Interactive prompts have non-interactive equivalents
- [ ] Table output has JSON/CSV alternative (`--format` flag)
- [ ] Exit codes follow Unix conventions (0 = success)
- [ ] Long output is paged when running in a terminal
- [ ] Subcommands have individual help text
