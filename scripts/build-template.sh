#!/usr/bin/env bash
set -Eeuo pipefail

# --- build-template.sh ---
# Syncs kit source files into template/ for npm publishing.
# Run this before `npm publish` to ensure the template is up to date.

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly ROOT_DIR="$(dirname "$SCRIPT_DIR")"
readonly TEMPLATE_DIR="$ROOT_DIR/template"

info()  { echo "[build-template] INFO:  $*"; }
warn()  { echo "[build-template] WARN:  $*" >&2; }
error() { echo "[build-template] ERROR: $*" >&2; }

# Clean previous template
if [[ -d "$TEMPLATE_DIR" ]]; then
    info "Cleaning previous template/"
    rm -rf -- "$TEMPLATE_DIR"
fi

mkdir -p "$TEMPLATE_DIR"

# --- Copy kit components ---

# .agents/ — full directory
info "Copying .agents/"
cp -a "$ROOT_DIR/.agents" "$TEMPLATE_DIR/.agents"

# .codex/ — full directory
if [[ -d "$ROOT_DIR/.codex" ]]; then
    info "Copying .codex/"
    cp -a "$ROOT_DIR/.codex" "$TEMPLATE_DIR/.codex"
else
    warn ".codex/ directory not found — skipping"
fi

# .claude/ — full directory except transient worktrees
if [[ -d "$ROOT_DIR/.claude" ]]; then
    info "Copying .claude/"
    cp -a "$ROOT_DIR/.claude" "$TEMPLATE_DIR/.claude"
    if [[ -d "$TEMPLATE_DIR/.claude/worktrees" ]]; then
        info "Removing .claude/worktrees/ (transient worktree artifacts)"
        rm -rf -- "$TEMPLATE_DIR/.claude/worktrees"
    fi
else
    warn ".claude/ directory not found — skipping"
fi

# .factory/ — full directory
if [[ -d "$ROOT_DIR/.factory" ]]; then
    info "Copying .factory/"
    cp -a "$ROOT_DIR/.factory" "$TEMPLATE_DIR/.factory"
else
    warn ".factory/ directory not found — skipping"
fi

# docs/ — full directory
info "Copying docs/"
cp -a "$ROOT_DIR/docs" "$TEMPLATE_DIR/docs"

# memory-src/ — unified memory scaffold source
if [[ -d "$ROOT_DIR/memory-src" ]]; then
    info "Copying memory-src/ -> template/.memory/"
    cp -a "$ROOT_DIR/memory-src" "$TEMPLATE_DIR/.memory"
else
    warn "memory-src/ directory not found — skipping"
fi

# Root config files
for file in GEMINI.md AGENTS.md CLAUDE.md CODEX.md; do
    if [[ -f "$ROOT_DIR/$file" ]]; then
        info "Copying $file"
        cp "$ROOT_DIR/$file" "$TEMPLATE_DIR/$file"
    else
        warn "$file not found — skipping"
    fi
done

# --- Strip dev-only content ---

# Remove canonical progress contents (session-specific)
if [[ -d "$TEMPLATE_DIR/.memory/pipeline/progress" ]]; then
    info "Cleaning .memory/pipeline/progress/ (session-specific data)"
    find "$TEMPLATE_DIR/.memory/pipeline/progress" -type f -name "*.md" ! -name "README.md" -delete 2>/dev/null || true
fi

# Remove any authoritative vault spec content from template/.memory/wiki/specs/ (project-specific)
if [[ -d "$TEMPLATE_DIR/.memory/wiki/specs" ]]; then
    info "Cleaning .memory/wiki/specs/ authoritative content (project-specific specs)"
    find "$TEMPLATE_DIR/.memory/wiki/specs" -type f \
        ! -name "README.md" \
        ! -name ".gitkeep" \
        -delete 2>/dev/null || true
fi

# Initialize template/.memory/ runtime directories and strip generated content
if [[ -d "$TEMPLATE_DIR/.memory" ]]; then
    info "Preparing template/.memory/ scaffold"
    mkdir -p \
        "$TEMPLATE_DIR/.memory/.obsidian" \
        "$TEMPLATE_DIR/.memory/raw/sessions" \
        "$TEMPLATE_DIR/.memory/raw/events" \
        "$TEMPLATE_DIR/.memory/raw/daily" \
        "$TEMPLATE_DIR/.memory/raw/assets" \
        "$TEMPLATE_DIR/.memory/pipeline/progress/phases" \
        "$TEMPLATE_DIR/.memory/pipeline/progress/slices" \
        "$TEMPLATE_DIR/.memory/pipeline/progress/sessions" \
        "$TEMPLATE_DIR/.memory/pipeline/progress/memory" \
        "$TEMPLATE_DIR/.memory/wiki/knowledge" \
        "$TEMPLATE_DIR/.memory/schema"

    if [[ -f "$TEMPLATE_DIR/.memory/wiki-home.md" ]]; then :; else
        cat > "$TEMPLATE_DIR/.memory/wiki-home.md" << 'EOF'
# Memory Vault Home

Use [[wiki/index]] as the primary navigation hub.
EOF
    fi

    if [[ -f "$TEMPLATE_DIR/.memory/raw/README.md" ]]; then :; fi
    if [[ -f "$TEMPLATE_DIR/.memory/wiki/README.md" ]]; then :; fi

    find "$TEMPLATE_DIR/.memory/raw" -type f ! -name ".gitkeep" -delete 2>/dev/null || true
    find "$TEMPLATE_DIR/.memory/pipeline/progress" -type f -name "*.md" ! -name "README.md" -delete 2>/dev/null || true
    find "$TEMPLATE_DIR/.memory/wiki/knowledge" -type f ! -name "README.md" ! -name ".gitkeep" -delete 2>/dev/null || true
    find "$TEMPLATE_DIR/.memory/schema" -type f ! -name "*.json" -delete 2>/dev/null || true

    touch "$TEMPLATE_DIR/.memory/raw/sessions/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/raw/events/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/raw/daily/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/pipeline/progress/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/pipeline/progress/phases/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/pipeline/progress/slices/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/pipeline/progress/sessions/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/pipeline/progress/memory/.gitkeep"
    touch "$TEMPLATE_DIR/.memory/wiki/knowledge/.gitkeep"

    cat > "$TEMPLATE_DIR/.memory/config.json" << 'EOF'
{
  "version": 1,
  "backend": "jsonl",
  "retrieval": "index-guided",
  "agents": ["claude", "gemini", "factory", "codex"]
}
EOF
fi

# --- Generate canonical kit sync state (sync tracking for installations) ---
COMMIT_HASH=$(git rev-parse HEAD)
KIT_VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

info "Generating kit sync state (commit: ${COMMIT_HASH:0:8}, version: $KIT_VERSION)"
mkdir -p "$TEMPLATE_DIR/.memory/pipeline"
cat > "$TEMPLATE_DIR/.memory/pipeline/kit-sync.md" << EOF
# Kit Sync State

upstream: https://github.com/RepairYourTech/cfsa-antigravity
last_synced_commit: $COMMIT_HASH
last_synced_at: $BUILD_TIMESTAMP
kit_version: $KIT_VERSION
installed_runtimes:
  - agents
  - codex
  - claude
  - factory
EOF

# --- Summary ---
file_count=$(find "$TEMPLATE_DIR" -type f | wc -l | tr -d ' ')
dir_count=$(find "$TEMPLATE_DIR" -type d | wc -l | tr -d ' ')

info "Template built: $file_count files in $dir_count directories"
info "Ready to publish — run: npm publish"
