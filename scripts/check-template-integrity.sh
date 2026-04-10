#!/usr/bin/env bash
set -Eeuo pipefail

# --- check-template-integrity.sh ---
# Full 4-component drift check + workflow character limit enforcement.
# Used by the pre-commit hook and the audit script.
# Exit 0 = clean, Exit 1 = drift or violations found.

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly ROOT_DIR="$(dirname "$SCRIPT_DIR")"
readonly TEMPLATE_DIR="$ROOT_DIR/template"
readonly CHAR_LIMIT=12000

errors=0

info()  { echo "[integrity] ✅ $*"; }
fail()  { echo "[integrity] ❌ $*" >&2; errors=$((errors + 1)); }
warn()  { echo "[integrity] ⚠️  $*"; }

# ──────────────────────────────────────
# 1. Template must exist
# ──────────────────────────────────────
if [[ ! -d "$TEMPLATE_DIR" ]]; then
    fail "template/ directory does not exist — run 'npm run build' first"
    exit 1
fi

# ──────────────────────────────────────
# 2. Root config files: GEMINI.md, AGENTS.md, CLAUDE.md
# ──────────────────────────────────────
for file in GEMINI.md AGENTS.md CLAUDE.md; do
    src="$ROOT_DIR/$file"
    tpl="$TEMPLATE_DIR/$file"

    if [[ ! -f "$src" ]]; then
        fail "$file missing from project root"
        continue
    fi

    if [[ ! -f "$tpl" ]]; then
        fail "$file missing from template/ — template rebuild needed"
        continue
    fi

    if ! diff -q "$src" "$tpl" > /dev/null 2>&1; then
        fail "$file has drifted from template/$file"
    else
        info "$file in sync"
    fi
done

# ──────────────────────────────────────
# 3. .agent/ directory drift
# ──────────────────────────────────────
if [[ ! -d "$TEMPLATE_DIR/.agent" ]]; then
    fail "template/.agent/ missing — template rebuild needed"
else
    # Compare everything except progress/memory (session-specific, gets cleaned)
    drift_output=$(diff -rq "$ROOT_DIR/.agent" "$TEMPLATE_DIR/.agent" 2>/dev/null \
        | grep -v "progress/memory" \
        | grep -v "progress/slices" \
        | grep -v "progress/blockers" \
        | grep -v "kit-sync.md" || true)

    drift_count=$(echo "$drift_output" | grep -c . || true)

    if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
        fail ".agent/ has $drift_count drifted file(s) from template/.agent/"
        echo "$drift_output" | head -10 >&2
    else
        info ".agent/ in sync"
    fi
fi

# ──────────────────────────────────────
# 4. .claude/ directory drift
# ──────────────────────────────────────
if [[ -d "$ROOT_DIR/.claude" ]]; then
    if [[ ! -d "$TEMPLATE_DIR/.claude" ]]; then
        fail "template/.claude/ missing — template rebuild needed"
    else
        drift_output=$(diff -rq "$ROOT_DIR/.claude" "$TEMPLATE_DIR/.claude" 2>/dev/null \
            | grep -v "memory/sessions" \
            | grep -v "progress/memory" \
            | grep -v "kit-sync.md" \
            | grep -v "settings.local.json" || true)

        drift_count=$(echo "$drift_output" | grep -c . || true)

        if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
            fail ".claude/ has $drift_count drifted file(s) from template/.claude/"
            echo "$drift_output" | head -10 >&2
        else
            info ".claude/ in sync"
        fi
    fi
fi

# ──────────────────────────────────────
# 5. docs/ directory drift (structure only — content is stripped)
# ──────────────────────────────────────
if [[ ! -d "$TEMPLATE_DIR/docs" ]]; then
    fail "template/docs/ missing — template rebuild needed"
else
    # Check that docs/ dirs exist in template (content is stripped by build)
    src_dirs_file=$(mktemp)
    tpl_dirs_file=$(mktemp)
    trap 'rm -f "$src_dirs_file" "$tpl_dirs_file"' EXIT

    find "$ROOT_DIR/docs" -type d | sed "s|$ROOT_DIR/||" | sort > "$src_dirs_file"
    find "$TEMPLATE_DIR/docs" -type d | sed "s|$TEMPLATE_DIR/||" | sort > "$tpl_dirs_file"

    missing_dirs=$(comm -23 "$src_dirs_file" "$tpl_dirs_file" | wc -l | tr -d ' ')
    if [[ "$missing_dirs" -gt 0 ]]; then
        fail "docs/ has $missing_dirs directory(ies) missing from template"
    else
        info "docs/ structure in sync"
    fi

    # Check README.md and .gitkeep files are present
    src_r_file=$(mktemp)
    tpl_r_file=$(mktemp)
    trap 'rm -f "$src_dirs_file" "$tpl_dirs_file" "$src_r_file" "$tpl_r_file"' EXIT

    find "$ROOT_DIR/docs" \( -name "README.md" -o -name ".gitkeep" \) | sed "s|$ROOT_DIR/||" | sort > "$src_r_file"
    find "$TEMPLATE_DIR/docs" \( -name "README.md" -o -name ".gitkeep" \) | sed "s|$TEMPLATE_DIR/||" | sort > "$tpl_r_file"

    missing_readmes=$(comm -23 "$src_r_file" "$tpl_r_file" | wc -l | tr -d ' ')
    if [[ "$missing_readmes" -gt 0 ]]; then
        fail "docs/ has $missing_readmes README/gitkeep file(s) missing from template"
    else
        info "docs/ scaffolding files in sync"
    fi
fi

# ──────────────────────────────────────
# 6. Workflow character limit check
# ──────────────────────────────────────
over_limit=0
for f in "$ROOT_DIR/.agent/workflows/"*.md "$ROOT_DIR/.claude/skills/workflows/"workflow-*.md; do
    [[ -f "$f" ]] || continue
    sz=$(wc -c < "$f" | tr -d ' ')
    if [[ "$sz" -gt "$CHAR_LIMIT" ]]; then
        fail "$(basename "$f"): $sz chars (exceeds ${CHAR_LIMIT} limit)"
        over_limit=$((over_limit + 1))
    fi
done

if [[ "$over_limit" -eq 0 ]]; then
    info "All workflows under ${CHAR_LIMIT} char limit"
fi

# ──────────────────────────────────────
# 7. Claude standalone runtime guard
# ──────────────────────────────────────
claude_workflows_file=$(mktemp)
claude_commands_file=$(mktemp)
missing_commands_file=$(mktemp)
extra_commands_file=$(mktemp)
claude_agent_refs_file=$(mktemp)
trap 'rm -f "$src_dirs_file" "$tpl_dirs_file" "$src_r_file" "$tpl_r_file" "$claude_workflows_file" "$claude_commands_file" "$missing_commands_file" "$extra_commands_file" "$claude_agent_refs_file"' EXIT

find "$ROOT_DIR/.claude/skills/workflows" -maxdepth 1 -name "workflow-*.md" -type f -print \
    | sed 's|.*/workflow-||' \
    | sed 's|\.md$||' \
    | sort > "$claude_workflows_file"

find "$ROOT_DIR/.claude/commands" -maxdepth 1 -name "*.md" -type f -print \
    | sed 's|.*/||' \
    | sed 's|\.md$||' \
    | sort > "$claude_commands_file"

comm -23 "$claude_workflows_file" "$claude_commands_file" > "$missing_commands_file"
comm -13 "$claude_workflows_file" "$claude_commands_file" > "$extra_commands_file"

missing_count=$(wc -l < "$missing_commands_file" | tr -d ' ')
extra_count=$(wc -l < "$extra_commands_file" | tr -d ' ')

if [[ "$missing_count" -gt 0 ]]; then
    fail "Missing Claude command shim for $missing_count workflow(s)"
    head -10 "$missing_commands_file" >&2
fi

if [[ "$extra_count" -gt 0 ]]; then
    fail "Extra Claude command shim for $extra_count command(s)"
    head -10 "$extra_commands_file" >&2
fi

if [[ "$missing_count" -eq 0 && "$extra_count" -eq 0 ]]; then
    info "Claude commands and workflows are in sync"
fi

if grep -R -n "\.agent/" "$ROOT_DIR/.claude" \
    --include='*.md' \
    --exclude='README.md' \
    --exclude='settings.local.json' \
    --exclude-dir='memory' \
    --exclude-dir='progress' > "$claude_agent_refs_file"; then
    ref_count=$(wc -l < "$claude_agent_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected .agent reference(s) under .claude/"
    head -10 "$claude_agent_refs_file" >&2
else
    info "No runtime .agent references remain under .claude/"
fi

if [[ ! -d "$ROOT_DIR/.claude/skill-library" || -L "$ROOT_DIR/.claude/skill-library" ]]; then
    fail ".claude/skill-library must exist as a real directory"
else
    info ".claude/skill-library is local"
fi

if [[ -d "$ROOT_DIR/.claude/progress" ]]; then
    info ".claude/progress/ exists"
else
    fail ".claude/progress/ missing"
fi

if [[ -f "$ROOT_DIR/.claude/kit-sync.md" ]]; then
    info ".claude/kit-sync.md present"
else
    fail ".claude/kit-sync.md missing"
fi

if [[ -f "$TEMPLATE_DIR/.claude/kit-sync.md" ]]; then
    info "template/.claude/kit-sync.md present"
else
    fail "template/.claude/kit-sync.md missing — template rebuild needed"
fi

if [[ -d "$TEMPLATE_DIR/.claude/progress" ]]; then
    info "template/.claude/progress/ present"
else
    fail "template/.claude/progress/ missing — template rebuild needed"
fi

if [[ -L "$TEMPLATE_DIR/.claude/skill-library" ]]; then
    fail "template/.claude/skill-library must not be a symlink"
else
    info "template/.claude/skill-library is local"
fi

if grep -R -n "\.agent/" "$TEMPLATE_DIR/.claude" --include='*.md' --exclude='README.md' --exclude-dir='memory' --exclude-dir='progress' > "$claude_agent_refs_file"; then
    ref_count=$(wc -l < "$claude_agent_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected .agent reference(s) in template/.claude/"
    head -10 "$claude_agent_refs_file" >&2
else
    info "No runtime .agent references remain in template/.claude/"
fi

for command_file in "$ROOT_DIR/.claude/commands"/*.md; do
    [[ -f "$command_file" ]] || continue
    command_name=$(basename "$command_file" .md)
    expected_reference=$(printf 'Reference: `.claude/skills/workflows/workflow-%s.md`.' "$command_name")
    if ! grep -F -q "$expected_reference" "$command_file"; then
        fail "$(basename "$command_file") does not reference its Claude workflow file"
    fi
done

if [[ "$errors" -eq 0 ]]; then
    info "Claude standalone integrity checks passed"
fi

# ──────────────────────────────────────
# 8. Summary
# ──────────────────────────────────────
echo ""
if [[ "$errors" -gt 0 ]]; then
    echo "[integrity] FAILED — $errors issue(s) found. Run 'npm run build' to rebuild the template."
    exit 1
else
    echo "[integrity] PASSED — template fully in sync, all limits respected."
    exit 0
fi
