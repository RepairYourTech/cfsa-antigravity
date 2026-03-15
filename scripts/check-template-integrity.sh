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
# 2. Root config files: GEMINI.md, AGENTS.md
# ──────────────────────────────────────
for file in GEMINI.md AGENTS.md; do
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
        | grep -v "progress/blockers" || true)

    drift_count=$(echo "$drift_output" | grep -c . || true)

    if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
        fail ".agent/ has $drift_count drifted file(s) from template/.agent/"
        echo "$drift_output" | head -10 >&2
    else
        info ".agent/ in sync"
    fi
fi

# ──────────────────────────────────────
# 4. docs/ directory drift (structure only — content is stripped)
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
# 5. Workflow character limit check
# ──────────────────────────────────────
over_limit=0
for f in "$ROOT_DIR/.agent/workflows/"*.md; do
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
# Summary
# ──────────────────────────────────────
echo ""
if [[ "$errors" -gt 0 ]]; then
    echo "[integrity] FAILED — $errors issue(s) found. Run 'npm run build' to rebuild the template."
    exit 1
else
    echo "[integrity] PASSED — template fully in sync, all limits respected."
    exit 0
fi
