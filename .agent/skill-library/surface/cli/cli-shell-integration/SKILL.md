---
name: cli-shell-integration
description: Shell integration patterns for CLI tools covering completion generation, man pages, piping, signal handling, stdin processing, and cross-platform shell support. Use when building CLI tools that need deep integration with bash, zsh, fish, and PowerShell.
version: 1.0.0
---

# CLI Shell Integration

Build CLI tools that integrate seamlessly with shell environments through completions, piping, signals, and cross-platform support.

## Shell Completion Generation

Tab completion is the single most impactful UX feature for CLI tools. Generate completions for all major shells.

### Bash Completions

```bash
# Generated completion script for bash
# Install: mycli completion bash > /etc/bash_completion.d/mycli
# Or: mycli completion bash >> ~/.bashrc

_mycli_completions() {
  local cur prev words cword
  _init_completion || return

  case "${prev}" in
    deploy)
      COMPREPLY=($(compgen -W "staging production dev" -- "${cur}"))
      return
      ;;
    --format|-f)
      COMPREPLY=($(compgen -W "table json csv" -- "${cur}"))
      return
      ;;
    --tag|-t)
      # Dynamic completion: fetch git tags
      COMPREPLY=($(compgen -W "$(git tag 2>/dev/null)" -- "${cur}"))
      return
      ;;
  esac

  if [[ "${cur}" == -* ]]; then
    COMPREPLY=($(compgen -W "--help --version --verbose --quiet --force --format --tag --dry-run" -- "${cur}"))
    return
  fi

  COMPREPLY=($(compgen -W "deploy status logs config auth" -- "${cur}"))
}

complete -F _mycli_completions mycli
```

### Zsh Completions

```zsh
# Generated completion script for zsh
# Install: mycli completion zsh > "${fpath[1]}/_mycli"

#compdef mycli

_mycli() {
  local -a commands
  commands=(
    'deploy:Deploy to an environment'
    'status:Show deployment status'
    'logs:View application logs'
    'config:Manage configuration'
    'auth:Authentication commands'
  )

  _arguments -C \
    '(-h --help)'{-h,--help}'[Show help]' \
    '(-V --version)'{-V,--version}'[Show version]' \
    '(-v --verbose)'{-v,--verbose}'[Verbose output]' \
    '1:command:->command' \
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        deploy)
          _arguments \
            '1:environment:(staging production dev)' \
            '(-t --tag)'{-t,--tag}'[Git tag]:tag:_git_tags' \
            '(-f --force)'{-f,--force}'[Skip confirmation]' \
            '--dry-run[Preview only]' \
            '--no-cache[Build without cache]'
          ;;
        config)
          local -a config_commands
          config_commands=(
            'get:Get a config value'
            'set:Set a config value'
            'list:List all config values'
          )
          _describe 'config command' config_commands
          ;;
      esac
      ;;
  esac
}

_mycli
```

### Fish Completions

```fish
# Generated completion script for fish
# Install: mycli completion fish > ~/.config/fish/completions/mycli.fish

# Disable file completions for mycli
complete -c mycli -f

# Top-level commands
complete -c mycli -n __fish_use_subcommand -a deploy -d 'Deploy to an environment'
complete -c mycli -n __fish_use_subcommand -a status -d 'Show deployment status'
complete -c mycli -n __fish_use_subcommand -a logs -d 'View application logs'
complete -c mycli -n __fish_use_subcommand -a config -d 'Manage configuration'

# Global flags
complete -c mycli -s h -l help -d 'Show help'
complete -c mycli -s V -l version -d 'Show version'
complete -c mycli -s v -l verbose -d 'Verbose output'

# Deploy subcommand
complete -c mycli -n '__fish_seen_subcommand_from deploy' -a 'staging production dev'
complete -c mycli -n '__fish_seen_subcommand_from deploy' -s t -l tag -d 'Git tag' -r
complete -c mycli -n '__fish_seen_subcommand_from deploy' -s f -l force -d 'Skip confirmation'
complete -c mycli -n '__fish_seen_subcommand_from deploy' -l dry-run -d 'Preview only'
```

### PowerShell Completions

```powershell
# Generated completion script for PowerShell
# Install: mycli completion powershell >> $PROFILE

Register-ArgumentCompleter -CommandName mycli -Native -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @{
        'deploy' = 'Deploy to an environment'
        'status' = 'Show deployment status'
        'logs' = 'View application logs'
        'config' = 'Manage configuration'
    }

    $words = $commandAst.ToString().Split(' ')

    if ($words.Count -eq 2) {
        $commands.GetEnumerator() | Where-Object { $_.Key -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_.Key, $_.Key, 'ParameterValue', $_.Value)
        }
    }
}
```

### Programmatic Completion Generation

```typescript
// Node.js - Generate completions from Commander.js definitions
import { Command } from 'commander';

function generateCompletions(program: Command, shell: 'bash' | 'zsh' | 'fish' | 'powershell'): string {
  const commands = program.commands.map((cmd) => ({
    name: cmd.name(),
    description: cmd.description(),
    options: cmd.options.map((opt) => ({
      short: opt.short,
      long: opt.long,
      description: opt.description,
      required: opt.required,
    })),
  }));

  switch (shell) {
    case 'bash': return generateBashCompletions(program.name(), commands);
    case 'zsh': return generateZshCompletions(program.name(), commands);
    case 'fish': return generateFishCompletions(program.name(), commands);
    case 'powershell': return generatePowerShellCompletions(program.name(), commands);
  }
}

// Add completion subcommand
program
  .command('completion')
  .argument('<shell>', 'Shell type: bash, zsh, fish, powershell')
  .description('Generate shell completion script')
  .action((shell) => {
    console.log(generateCompletions(program, shell));
  });
```

**Rule**: Provide an installation instruction in `mycli completion --help` that tells the user exactly where to put the output.

## Man Page Generation

```typescript
// Generate man page from Commander.js program definition
// Uses marked-man or a custom generator

function generateManPage(program: Command): string {
  const name = program.name();
  const version = program.version();

  return `
.TH ${name.toUpperCase()} 1 "${new Date().toISOString().slice(0, 10)}" "v${version}" "${name} manual"
.SH NAME
${name} \\- ${program.description()}
.SH SYNOPSIS
.B ${name}
[\\fIcommand\\fR]
[\\fIoptions\\fR]
.SH DESCRIPTION
${program.description()}
.SH COMMANDS
${program.commands.map((cmd) => `.TP\n.B ${cmd.name()}\n${cmd.description()}`).join('\n')}
.SH OPTIONS
${program.options.map((opt) => `.TP\n.BR ${opt.flags}\n${opt.description}`).join('\n')}
.SH EXIT STATUS
.TP
.B 0
Success
.TP
.B 1
General error
.TP
.B 2
Invalid arguments
.SH FILES
.TP
.I ~/.config/${name}/config.toml
Global configuration file
.TP
.I .${name}.toml
Project-specific configuration
.SH BUGS
Report bugs at https://github.com/example/${name}/issues
.SH AUTHORS
Written by the ${name} team.
`;
}
```

```bash
# Install man page
mycli man > /usr/local/share/man/man1/mycli.1
# Or during package installation:
install -Dm644 mycli.1 /usr/local/share/man/man1/mycli.1
```

## Piping and Streaming Output

### JSON Lines (JSONL / NDJSON)

```typescript
// Stream output as newline-delimited JSON for piping
async function streamResults(query: string): Promise<void> {
  const stream = createResultStream(query);

  for await (const item of stream) {
    // One JSON object per line -- parseable by jq, mlr, and other tools
    process.stdout.write(JSON.stringify(item) + '\n');
  }
}

// Usage: mycli search "query" --format jsonl | jq '.name'
```

### CSV Output

```typescript
function toCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const value = String(row[h] ?? '');
      // Escape fields containing commas, quotes, or newlines
      return value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

// Usage: mycli list --format csv | csvtool col 1,3 -
```

**Rule**: When `stdout` is piped (not a TTY), default to machine-readable output (JSON). When it is a TTY, default to human-readable output (table).

```typescript
function defaultFormat(): 'table' | 'json' {
  return process.stdout.isTTY ? 'table' : 'json';
}
```

## Signal Handling

```typescript
// Graceful shutdown on SIGINT (Ctrl+C) and SIGTERM
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    // Second signal: force exit
    console.error('\nForce exiting...');
    process.exit(130);
  }

  isShuttingDown = true;
  console.error(`\nReceived ${signal}. Cleaning up...`);

  try {
    await cleanup(); // Close connections, flush buffers, remove temp files
    process.exit(signal === 'SIGINT' ? 130 : 143);
  } catch (error) {
    console.error(`Cleanup failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Windows: handle Ctrl+C via readline
if (process.platform === 'win32') {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('SIGINT', () => process.emit('SIGINT' as any));
}
```

**Rule**: Exit code 130 for SIGINT (128 + signal number 2). Exit code 143 for SIGTERM (128 + signal number 15).
**Rule**: On first Ctrl+C, clean up gracefully. On second Ctrl+C, exit immediately.

## stdin Input Handling

```typescript
// Read from stdin when piped, or from file argument
async function getInput(fileArg?: string): Promise<string> {
  // Explicit file argument
  if (fileArg && fileArg !== '-') {
    return fs.promises.readFile(fileArg, 'utf-8');
  }

  // Read from stdin (piped or '-' argument)
  if (!process.stdin.isTTY || fileArg === '-') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  // No input provided
  console.error('Error: No input provided. Pass a filename or pipe data via stdin.');
  console.error('  mycli process input.txt');
  console.error('  cat input.txt | mycli process');
  console.error('  mycli process -  # read from stdin explicitly');
  process.exit(2);
}

// Streaming stdin for large inputs
async function* streamStdin(): AsyncGenerator<string> {
  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) {
    yield line;
  }
}
```

**Rule**: `-` as a filename means "read from stdin". This is a Unix convention that many tools follow.

## Shell Alias and Function Patterns

```bash
# Common patterns users create -- design your CLI to support these

# Alias with default flags
alias deploy='mycli deploy --verbose'

# Function wrapper with environment detection
mydeploy() {
  local env="${1:-staging}"
  mycli deploy "$env" --tag "$(git describe --tags --abbrev=0)"
}

# Pipeline composition
alias deploy-status='mycli status --format json | jq ".environments[] | select(.status != \"healthy\")"'
```

**Design for composition**: Output structured data that `jq`, `grep`, `awk`, and `cut` can process.

## PATH Management

```bash
# Installation should add the binary to a standard PATH location

# Option 1: Install to /usr/local/bin (requires sudo)
sudo install -m 755 mycli /usr/local/bin/mycli

# Option 2: Install to ~/.local/bin (no sudo, XDG-friendly)
install -Dm 755 mycli ~/.local/bin/mycli
# User adds to PATH in .bashrc/.zshrc: export PATH="$HOME/.local/bin:$PATH"

# Option 3: npm global install
npm install -g mycli  # Goes to npm prefix/bin

# Option 4: Cargo install
cargo install mycli  # Goes to ~/.cargo/bin
```

## Cross-Platform Considerations

| Feature | Unix (bash/zsh/fish) | Windows (cmd) | Windows (PowerShell) |
|---------|---------------------|---------------|---------------------|
| Path separator | `/` | `\` | `/` or `\` |
| Env var syntax | `$VAR` | `%VAR%` | `$env:VAR` |
| Pipe | `\|` | `\|` | `\|` |
| Redirect | `>`, `2>` | `>`, `2>` | `>`, `2>` |
| Null device | `/dev/null` | `NUL` | `$null` |
| Home directory | `$HOME` or `~` | `%USERPROFILE%` | `$HOME` or `~` |
| Glob expansion | Shell expands `*.txt` | App must expand | PowerShell expands |
| ANSI colors | Supported | Requires VT support (Win 10+) | Supported |
| Signals | SIGINT, SIGTERM | Limited (Ctrl+C) | Limited |

```typescript
// Cross-platform helpers
import os from 'os';

function getHomeDir(): string {
  return os.homedir(); // Works on all platforms
}

function getNullDevice(): string {
  return process.platform === 'win32' ? 'NUL' : '/dev/null';
}

function getPathSeparator(): string {
  return process.platform === 'win32' ? ';' : ':';
}

// Handle Windows glob expansion (Node.js does not expand globs on Windows)
async function expandGlobs(patterns: string[]): Promise<string[]> {
  if (process.platform !== 'win32') return patterns; // Shell already expanded

  const { glob } = await import('glob');
  const expanded: string[] = [];
  for (const pattern of patterns) {
    if (pattern.includes('*') || pattern.includes('?')) {
      expanded.push(...await glob(pattern));
    } else {
      expanded.push(pattern);
    }
  }
  return expanded;
}
```

## Output Checklist

- [ ] Shell completions generated for bash, zsh, fish, and PowerShell
- [ ] Completion install instructions included in `mycli completion --help`
- [ ] Man page generated and installable
- [ ] Output streams to stdout as JSON Lines when piped
- [ ] SIGINT/SIGTERM handled with graceful cleanup
- [ ] Second Ctrl+C forces immediate exit
- [ ] stdin accepted via pipe or `-` argument
- [ ] Output format auto-detected based on TTY status
- [ ] Cross-platform path and signal handling
- [ ] Binary installs to a standard PATH location
