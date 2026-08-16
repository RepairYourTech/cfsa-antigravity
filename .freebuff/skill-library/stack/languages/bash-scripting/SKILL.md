---
name: bash-scripting
description: Bash scripting patterns for production-grade shell automation. Covers strict mode, defensive programming, argument parsing, error handling, safe file operations, logging, testing with Bats, ShellCheck linting, portability, and CI/CD integration.
version: 1.0.0
---

# Bash Scripting Patterns

Expert guidance for writing robust, portable, production-grade bash scripts. Covers defensive programming, error handling, safe file operations, testing, linting, and the most common pitfalls that cause scripts to fail silently in production.

## When to Use This Skill

- Writing automation scripts (deployment, backup, provisioning)
- Building CI/CD pipeline scripts
- Creating system administration utilities
- Developing installer or setup scripts
- Writing Docker entrypoint scripts
- Building CLI tools in pure bash

## Core Concepts

### 1. Strict Mode — Non-Negotiable

Every script starts with strict mode. No exceptions.

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

# Flag breakdown:
# -E  Inherit ERR trap in functions and subshells
# -e  Exit immediately on non-zero return
# -u  Exit on undefined variable reference
# -o pipefail  Pipe fails if ANY command fails, not just the last
```

**Additional hardening (Bash 4.4+):**

```bash
shopt -s inherit_errexit  # Subshells inherit -e
IFS=$'\n\t'               # Prevent word splitting on spaces
```

### 2. Script Boilerplate

Every production script follows this structure.

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

# --- Constants ---
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly VERSION="1.0.0"

# --- Defaults ---
VERBOSE=false
DRY_RUN=false
LOG_LEVEL="info"

# --- Cleanup ---
TMPDIR=""
cleanup() {
    local exit_code=$?
    if [[ -n "${TMPDIR:-}" && -d "$TMPDIR" ]]; then
        rm -rf -- "$TMPDIR"
    fi
    exit "$exit_code"
}
trap cleanup EXIT
trap 'echo "Error on line $LINENO (exit $?)" >&2' ERR

# --- Logging ---
log()   { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2; }
info()  { log "INFO:  $*"; }
warn()  { log "WARN:  $*"; }
error() { log "ERROR: $*"; }
debug() { [[ "$VERBOSE" == true ]] && log "DEBUG: $*" || true; }

# --- Usage ---
usage() {
    cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS] <argument>

Description of what this script does.

Options:
    -v, --verbose       Enable verbose/debug output
    -d, --dry-run       Preview changes without executing
    -h, --help          Show this help message
    --version           Show version

Examples:
    $SCRIPT_NAME -v /path/to/input
    $SCRIPT_NAME --dry-run --verbose /path/to/input
EOF
    exit "${1:-0}"
}

# --- Argument Parsing ---
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -v|--verbose)  VERBOSE=true; shift ;;
            -d|--dry-run)  DRY_RUN=true; shift ;;
            -h|--help)     usage 0 ;;
            --version)     echo "$SCRIPT_NAME $VERSION"; exit 0 ;;
            --)            shift; break ;;
            -*)            error "Unknown option: $1"; usage 1 ;;
            *)             break ;;
        esac
    done

    # Validate required arguments
    if [[ $# -lt 1 ]]; then
        error "Missing required argument"
        usage 1
    fi
}

# --- Main ---
main() {
    parse_args "$@"
    info "Starting $SCRIPT_NAME v$VERSION"

    TMPDIR=$(mktemp -d) || { error "Failed to create temp directory"; exit 1; }
    debug "Temp directory: $TMPDIR"

    # Implementation here

    info "Completed successfully"
}

main "$@"
```

### 3. Variable Safety

Quoting is the #1 source of bash bugs. Always quote.

```bash
# WRONG — word splitting and globbing
cp $source $dest
for f in $(ls *.txt); do echo "$f"; done

# RIGHT — always quote
cp "$source" "$dest"
for f in *.txt; do echo "$f"; done  # Shell glob, no ls

# Required variables — fail with message if unset
: "${REQUIRED_VAR:?REQUIRED_VAR is not set}"
: "${API_KEY:?API_KEY must be set in environment}"

# Default values — use if unset
port="${PORT:-8080}"
host="${HOST:-localhost}"

# Readonly constants
readonly MAX_RETRIES=3
readonly CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/myapp"
```

**Never use `eval` on user input:**

```bash
# WRONG — command injection
eval "$user_input"

# RIGHT — use arrays for dynamic command construction
declare -a cmd=("curl" "-s" "-o" "$output_file")
[[ "$VERBOSE" == true ]] && cmd+=("-v")
"${cmd[@]}" "$url"
```

### 4. Array Handling

```bash
# Declare and iterate safely
declare -a items=("item 1" "item 2" "item 3")
for item in "${items[@]}"; do
    echo "Processing: $item"
done

# Read command output into array safely
mapfile -t lines < <(some_command)
readarray -t numbers < <(seq 1 10)

# NUL-safe file iteration (handles spaces, newlines in filenames)
while IFS= read -r -d '' file; do
    echo "File: $file"
done < <(find . -type f -name "*.sh" -print0)

# Associative arrays (Bash 4+)
declare -A config=(
    [host]="localhost"
    [port]="8080"
    [debug]="false"
)
echo "${config[host]}:${config[port]}"

# Array length and slicing
echo "Count: ${#items[@]}"
echo "First: ${items[0]}"
echo "Last: ${items[-1]}"
subset=("${items[@]:1:2}")  # Slice from index 1, length 2
```

### 5. Safe File Operations

```bash
# Temporary files — always with cleanup trap
TMPDIR=$(mktemp -d) || exit 1
trap 'rm -rf -- "$TMPDIR"' EXIT

tmp_file="$TMPDIR/work.txt"
some_command > "$tmp_file"

# Safe directory detection
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

# Check before operating
[[ -f "$file" ]] || { error "File not found: $file"; exit 1; }
[[ -r "$file" ]] || { error "File not readable: $file"; exit 1; }
[[ -d "$dir" ]]  || { error "Directory not found: $dir"; exit 1; }
[[ -w "$dir" ]]  || { error "Directory not writable: $dir"; exit 1; }

# Create directories safely
mkdir -p "$output_dir" || { error "Cannot create $output_dir"; exit 1; }

# Restrictive umask for sensitive files
(umask 077; touch "$secure_file")

# End option parsing with -- for safety
rm -rf -- "$user_provided_path"
cp -- "$source" "$dest"
```

### 6. Error Handling and Traps

```bash
# Comprehensive trap setup
cleanup() {
    local exit_code=$?
    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    # Remove temp files
    [[ -n "${TMPDIR:-}" ]] && rm -rf -- "$TMPDIR"
    exit "$exit_code"
}

trap cleanup EXIT
trap 'echo "Error at line $LINENO: exit $?" >&2' ERR
trap 'echo "Interrupted" >&2; exit 130' INT
trap 'echo "Terminated" >&2; exit 143' TERM

# Retry logic
retry() {
    local -r max_attempts="${1:?}"
    local -r delay="${2:?}"
    shift 2
    local attempt=1

    until "$@"; do
        if (( attempt >= max_attempts )); then
            error "Failed after $max_attempts attempts: $*"
            return 1
        fi
        warn "Attempt $attempt failed, retrying in ${delay}s..."
        sleep "$delay"
        (( attempt++ ))
    done
}

# Usage: retry 3 5 curl -sf "$url" -o "$output"

# Timeout for external commands
timeout 30s curl -sf "$url" -o "$output" || {
    error "Download timed out after 30s"
    exit 1
}
```

### 7. Input Validation

```bash
# Validate numeric input
validate_integer() {
    local -r value="$1"
    local -r name="${2:-value}"
    if [[ ! "$value" =~ ^[0-9]+$ ]]; then
        error "$name must be a positive integer, got: $value"
        return 1
    fi
}

# Validate file arguments
validate_input_file() {
    local -r file="$1"
    [[ -f "$file" ]] || { error "Not a file: $file"; return 1; }
    [[ -r "$file" ]] || { error "Not readable: $file"; return 1; }
    [[ -s "$file" ]] || { warn "File is empty: $file"; }
}

# Validate required environment variables
require_env() {
    local -r var_name="$1"
    if [[ -z "${!var_name:-}" ]]; then
        error "Required environment variable $var_name is not set"
        exit 1
    fi
}

# Check required commands exist
require_command() {
    for cmd in "$@"; do
        command -v "$cmd" &>/dev/null || {
            error "Required command not found: $cmd"
            error "Install it and try again"
            exit 1
        }
    done
}

# Usage at script start
require_command curl jq grep sed
require_env API_KEY
```

### 8. Structured Logging

```bash
# Logging with levels and colors (when TTY)
declare -A LOG_COLORS=(
    [DEBUG]="\033[0;36m"    # Cyan
    [INFO]="\033[0;32m"     # Green
    [WARN]="\033[0;33m"     # Yellow
    [ERROR]="\033[0;31m"    # Red
)
readonly RESET="\033[0m"

_log() {
    local -r level="$1"; shift
    local -r timestamp="$(date +'%Y-%m-%d %H:%M:%S')"

    if [[ -t 2 ]]; then
        # TTY — use colors
        printf "${LOG_COLORS[$level]:-}[%s] %-5s %s${RESET}\n" \
            "$timestamp" "$level" "$*" >&2
    else
        # Piped/redirected — plain text
        printf "[%s] %-5s %s\n" "$timestamp" "$level" "$*" >&2
    fi
}

debug() { [[ "$VERBOSE" == true ]] && _log DEBUG "$*" || true; }
info()  { _log INFO "$*"; }
warn()  { _log WARN "$*"; }
error() { _log ERROR "$*"; }

# Log to file
exec 3>&1 4>&2  # Save stdout/stderr
exec 1> >(tee -a "$LOG_FILE") 2>&1  # Tee to log file
```

### 9. Dry-Run Support

```bash
# Wrap destructive operations
run() {
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] $*"
    else
        debug "Running: $*"
        "$@"
    fi
}

# Usage
run rm -rf -- "$old_backup"
run cp -a "$source" "$dest"
run systemctl restart myservice
```

### 10. Portability

```bash
# Detect platform
case "$(uname -s)" in
    Linux*)   PLATFORM="linux"  ;;
    Darwin*)  PLATFORM="macos"  ;;
    MINGW*)   PLATFORM="windows" ;;
    *)        PLATFORM="unknown" ;;
esac

# Handle GNU vs BSD tool differences
if [[ "$PLATFORM" == "macos" ]]; then
    # BSD sed requires explicit extension for -i
    sed_inplace() { sed -i '' "$@"; }
    # BSD stat syntax differs
    file_size() { stat -f%z "$1"; }
    # BSD date differs
    epoch() { date -j -f "%Y-%m-%d" "$1" "+%s"; }
else
    sed_inplace() { sed -i "$@"; }
    file_size() { stat -c%s "$1"; }
    epoch() { date -d "$1" "+%s"; }
fi

# Check bash version for modern features
check_bash_version() {
    local -r min_major="${1:-4}"
    local -r min_minor="${2:-4}"
    if (( BASH_VERSINFO[0] < min_major ||
         (BASH_VERSINFO[0] == min_major && BASH_VERSINFO[1] < min_minor) )); then
        error "Bash ${min_major}.${min_minor}+ required (found ${BASH_VERSION})"
        exit 1
    fi
}
```

## Testing with Bats

[Bats](https://github.com/bats-core/bats-core) is the standard testing framework for bash scripts.

### Test File Structure

```bash
#!/usr/bin/env bats
# tests/test_myscript.bats

setup() {
    # Runs before each test
    TMPDIR="$(mktemp -d)"
    export TMPDIR
    # Source the script's functions (if structured for sourcing)
    source "${BATS_TEST_DIRNAME}/../lib/functions.sh"
}

teardown() {
    # Runs after each test
    rm -rf -- "$TMPDIR"
}

@test "exits with error when no arguments provided" {
    run ./myscript.sh
    [ "$status" -eq 1 ]
    [[ "$output" == *"Missing required argument"* ]]
}

@test "creates output file in specified directory" {
    run ./myscript.sh -o "$TMPDIR/output.txt" input.txt
    [ "$status" -eq 0 ]
    [ -f "$TMPDIR/output.txt" ]
}

@test "dry-run does not modify files" {
    local target="$TMPDIR/existing.txt"
    echo "original" > "$target"
    run ./myscript.sh --dry-run "$target"
    [ "$status" -eq 0 ]
    [ "$(cat "$target")" = "original" ]
}

@test "validates numeric argument" {
    run ./myscript.sh --retries abc
    [ "$status" -eq 1 ]
    [[ "$output" == *"must be a positive integer"* ]]
}

@test "--help shows usage" {
    run ./myscript.sh --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"Usage:"* ]]
}

@test "--version shows version" {
    run ./myscript.sh --version
    [ "$status" -eq 0 ]
    [[ "$output" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}
```

### Running Tests

```bash
# Install Bats
git clone https://github.com/bats-core/bats-core.git
./bats-core/install.sh /usr/local

# Run tests
bats tests/
bats tests/test_myscript.bats --tap    # TAP output for CI
bats tests/ --jobs 4                    # Parallel execution
```

## ShellCheck — Mandatory

Every script must pass [ShellCheck](https://www.shellcheck.net/) with zero warnings.

```bash
# Lint all scripts
shellcheck -x *.sh lib/*.sh

# With severity filter
shellcheck --severity=warning *.sh

# Inline directives (use sparingly, with justification)
# shellcheck disable=SC2086  # Word splitting intended here
command $unquoted_var_intentionally
```

### Common ShellCheck Rules

| Code | Issue | Fix |
|------|-------|-----|
| SC2086 | Double quote to prevent globbing/splitting | Quote: `"$var"` |
| SC2046 | Quote to prevent word splitting | `"$(command)"` |
| SC2034 | Variable appears unused | Prefix with `_` or export |
| SC2155 | Declare and assign separately | `local var; var=$(cmd)` |
| SC2164 | Use `cd ... \|\| exit` | `cd "$dir" \|\| exit 1` |
| SC2128 | Expanding array without index | Use `"${arr[@]}"` |
| SC2206 | Quote to prevent splitting | `read -ra arr <<< "$line"` |

### Formatting with shfmt

```bash
# Install: go install mvdan.cc/sh/v3/cmd/shfmt@latest

# Format all scripts (Google style: 2-space indent, switch-case indent)
shfmt -w -i 2 -ci *.sh

# Check formatting (CI mode)
shfmt -d -i 2 -ci *.sh || { echo "Formatting issues found"; exit 1; }
```

## Common Pitfalls

### Word Splitting with `for` Loops

```bash
# WRONG — breaks on spaces in filenames
for f in $(ls *.txt); do
    echo "$f"
done

# RIGHT — use globbing directly
for f in *.txt; do
    [[ -f "$f" ]] || continue  # Handle no matches
    echo "$f"
done

# RIGHT — use find for recursive/complex matches
while IFS= read -r -d '' f; do
    echo "$f"
done < <(find . -name "*.txt" -print0)
```

### Declare and Assign Separately

```bash
# WRONG — masks the exit code of $(command)
local result=$(some_command)

# RIGHT — declare first, then assign
local result
result=$(some_command) || { error "Command failed"; return 1; }
```

### Process Substitution vs Pipes

```bash
# WRONG — while loop runs in subshell, variable changes are lost
cat file.txt | while read -r line; do
    count=$((count + 1))  # Lost after loop!
done

# RIGHT — use process substitution or redirection
count=0
while IFS= read -r line; do
    count=$((count + 1))
done < file.txt
echo "Lines: $count"
```

### Printf Over Echo

```bash
# WRONG — echo behavior varies across systems
echo -e "Hello\tWorld"    # May or may not interpret escapes
echo -n "No newline"      # Non-portable

# RIGHT — printf is consistent everywhere
printf "Hello\tWorld\n"
printf "%s" "No newline"
printf "Name: %s, Age: %d\n" "$name" "$age"
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|-----------------|
| `cd dir && ...` without error handling | Silent failure if cd fails | `cd "$dir" \|\| exit 1` |
| `cat file \| grep pattern` | Useless use of cat | `grep pattern file` |
| `echo "$password"` in logs | Leaks secrets | Redact or use masked output |
| `kill -9 $pid` as first resort | Prevents cleanup handlers | `kill -TERM` first, `-9` as fallback |
| `[ $var = "value" ]` unquoted | Fails on empty or spaced vars | `[[ "$var" == "value" ]]` |
| `export VAR=$(cmd)` | Masks exit code | `VAR=$(cmd); export VAR` |
| `ls \| wc -l` for file counting | Breaks on filenames with newlines | `find . -maxdepth 1 -type f \| wc -l` |
| Inline `if` without `else` | Silent pass on failure | Always handle the else case |
| `source ./config` unchecked | Fails if file doesn't exist | `[[ -f ./config ]] && source ./config` |
| `rm -rf $DIR/` unquoted | Deletes `/` if DIR is empty | `rm -rf -- "${DIR:?}/"` |

## Modern Bash Features (4.4+)

```bash
# Parameter transformations (Bash 4.4+)
name="hello world"
echo "${name@U}"  # HELLO WORLD (uppercase, Bash 5.0+)
echo "${name@L}"  # hello world (lowercase, Bash 5.0+)
echo "${name@Q}"  # 'hello world' (shell-quoted)

# Nameref variables (Bash 4.3+)
populate_array() {
    local -n arr_ref="$1"
    arr_ref=("one" "two" "three")
}
declare -a my_array
populate_array my_array
echo "${my_array[@]}"  # one two three

# EPOCHSECONDS / EPOCHREALTIME (Bash 5.0+)
echo "Unix time: $EPOCHSECONDS"
echo "Microseconds: $EPOCHREALTIME"

# wait -n: wait for ANY background job (Bash 4.3+)
for i in {1..5}; do
    sleep $((RANDOM % 5)) &
done
wait -n  # Returns when first job finishes

# mapfile with custom delimiter (Bash 4.4+)
mapfile -d ',' -t fields <<< "$csv_line"
```

## Parameter Expansion Reference

```bash
# Default values
${var:-default}     # Use default if unset or empty
${var:=default}     # Set and use default if unset or empty
${var:+alternate}   # Use alternate if set and non-empty
${var:?error msg}   # Exit with error if unset or empty

# String manipulation
${var#pattern}      # Remove shortest prefix match
${var##pattern}     # Remove longest prefix match
${var%pattern}      # Remove shortest suffix match
${var%%pattern}     # Remove longest suffix match
${var/old/new}      # Replace first occurrence
${var//old/new}     # Replace all occurrences

# Substring
${var:offset}       # Substring from offset
${var:offset:length}  # Substring with length
${#var}             # String length

# Common patterns
filename="${path##*/}"        # basename
extension="${filename##*.}"   # file extension
stem="${filename%.*}"         # filename without extension
directory="${path%/*}"        # dirname
```

## CI/CD Integration

```bash
# GitHub Actions workflow
# .github/workflows/shellcheck.yml
name: Shell Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ShellCheck
        uses: ludeeus/action-shellcheck@master
        with:
          severity: warning
      - name: shfmt
        run: |
          go install mvdan.cc/sh/v3/cmd/shfmt@latest
          shfmt -d -i 2 -ci .
      - name: Bats
        run: |
          sudo apt-get install -y bats
          bats tests/
```

## Project Structure

```
my-bash-project/
  bin/
    my-tool              # Main executable (no .sh extension for installed tools)
  lib/
    common.sh            # Shared functions (sourced, not executed)
    logging.sh           # Logging utilities
    validation.sh        # Input validation helpers
  tests/
    test_main.bats       # Bats test files
    test_validation.bats
    fixtures/            # Test input data
  .shellcheckrc          # ShellCheck configuration
  .editorconfig          # Editor settings (indent, line endings)
  Makefile               # Build/test/install targets
  README.md
```

### .shellcheckrc

```bash
# .shellcheckrc — project-wide ShellCheck settings
shell=bash
severity=style
enable=all
# Disable specific rules with justification:
# disable=SC2059  # If using printf format strings from variables intentionally
```

### Makefile

```makefile
.PHONY: lint test fmt check install

SCRIPTS := $(shell find bin/ lib/ -name '*.sh' -o -type f -executable)

lint:
	shellcheck -x $(SCRIPTS)

fmt:
	shfmt -w -i 2 -ci $(SCRIPTS)

test:
	bats tests/

check: lint test

install:
	install -Dm 755 bin/my-tool $(DESTDIR)/usr/local/bin/my-tool
```

## Exit Code Conventions

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments / usage error |
| `126` | Command found but not executable |
| `127` | Command not found |
| `128+N` | Killed by signal N (e.g., 130 = SIGINT, 143 = SIGTERM) |

## Resources

- **ShellCheck**: https://www.shellcheck.net/
- **Bats**: https://github.com/bats-core/bats-core
- **Google Shell Style Guide**: https://google.github.io/styleguide/shellguide.html
- **shfmt**: https://github.com/mvdan/sh
- **Bash Reference Manual**: https://www.gnu.org/software/bash/manual/
- **Pure Bash Bible**: https://github.com/dylanaraps/pure-bash-bible
- **Bash Pitfalls**: https://mywiki.wooledge.org/BashPitfalls
