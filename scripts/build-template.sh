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

# .agent/ — full directory
info "Copying .agent/"
cp -a "$ROOT_DIR/.agent" "$TEMPLATE_DIR/.agent"

# .claude/ — full directory
if [[ -d "$ROOT_DIR/.claude" ]]; then
    info "Copying .claude/"
    cp -a "$ROOT_DIR/.claude" "$TEMPLATE_DIR/.claude"
else
    warn ".claude/ directory not found — skipping"
fi

# docs/ — full directory
info "Copying docs/"
cp -a "$ROOT_DIR/docs" "$TEMPLATE_DIR/docs"

# Root config files
for file in GEMINI.md AGENTS.md CLAUDE.md; do
    if [[ -f "$ROOT_DIR/$file" ]]; then
        info "Copying $file"
        cp "$ROOT_DIR/$file" "$TEMPLATE_DIR/$file"
    else
        warn "$file not found — skipping"
    fi
done

# --- Strip dev-only content ---

# Remove .agent/progress/ contents (session-specific)
if [[ -d "$TEMPLATE_DIR/.agent/progress" ]]; then
    info "Cleaning .agent/progress/ (session-specific data)"
    find "$TEMPLATE_DIR/.agent/progress" -type f -name "*.md" ! -name "README.md" -delete 2>/dev/null || true
fi

# Remove .claude/progress/ contents (session-specific)
if [[ -d "$TEMPLATE_DIR/.claude/progress" ]]; then
    info "Cleaning .claude/progress/ (session-specific data)"
    find "$TEMPLATE_DIR/.claude/progress" -type f -name "*.md" ! -name "README.md" -delete 2>/dev/null || true
fi

# Remove .claude/memory/sessions/ contents (session-specific)
if [[ -d "$TEMPLATE_DIR/.claude/memory/sessions" ]]; then
    info "Cleaning .claude/memory/sessions/ (session-specific data)"
    find "$TEMPLATE_DIR/.claude/memory/sessions" -type f -name "*.md" ! -name "README.md" -delete 2>/dev/null || true
fi

# Remove any docs/plans/ content (project-specific)
if [[ -d "$TEMPLATE_DIR/docs/plans" ]]; then
    info "Cleaning docs/plans/ content (project-specific specs)"
    # Keep the directory structure but remove spec content
    find "$TEMPLATE_DIR/docs/plans" -type f \
        ! -name "README.md" \
        ! -name ".gitkeep" \
        -delete 2>/dev/null || true
fi

# Remove any docs/audits/ content (project-specific)
if [[ -d "$TEMPLATE_DIR/docs/audits" ]]; then
    info "Cleaning docs/audits/ content (project-specific audits)"
    find "$TEMPLATE_DIR/docs/audits" -type f \
        ! -name "README.md" \
        ! -name ".gitkeep" \
        -delete 2>/dev/null || true
fi

# --- Generate kit-sync.md (sync tracking for installations) ---
COMMIT_HASH=$(git rev-parse HEAD)
KIT_VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

info "Generating kit sync state (commit: ${COMMIT_HASH:0:8}, version: $KIT_VERSION)"
for sync_file in "$TEMPLATE_DIR/.agent/kit-sync.md" "$TEMPLATE_DIR/.claude/kit-sync.md"; do
cat > "$sync_file" << EOF
# Kit Sync State

upstream: https://github.com/RepairYourTech/cfsa-antigravity
last_synced_commit: $COMMIT_HASH
last_synced_at: $BUILD_TIMESTAMP
kit_version: $KIT_VERSION
EOF
done

# --- Summary ---
file_count=$(find "$TEMPLATE_DIR" -type f | wc -l | tr -d ' ')
dir_count=$(find "$TEMPLATE_DIR" -type d | wc -l | tr -d ' ')

info "Template built: $file_count files in $dir_count directories"
info "Ready to publish — run: npm publish"
