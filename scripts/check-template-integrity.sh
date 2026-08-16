#!/usr/bin/env bash
set -Eeuo pipefail

# --- check-template-integrity.sh ---
# Full 4-component drift check.
# Used by the pre-commit hook and the audit script.
# Exit 0 = clean, Exit 1 = drift or violations found.

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly ROOT_DIR="$(dirname "$SCRIPT_DIR")"
readonly TEMPLATE_DIR="$ROOT_DIR/template"

errors=0
src_dirs_file=""
tpl_dirs_file=""
src_r_file=""
tpl_r_file=""

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
# 2. Root config files: GEMINI.md, AGENTS.md, CLAUDE.md, CODEX.md
# ──────────────────────────────────────
for file in GEMINI.md AGENTS.md CLAUDE.md CODEX.md; do
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
# 3. .agents/ directory drift
# ──────────────────────────────────────
if [[ ! -d "$TEMPLATE_DIR/.agents" ]]; then
    fail "template/.agents/ missing — template rebuild needed"
else
    # Compare everything except progress/memory (session-specific, gets cleaned)
    drift_output=$(diff -rq "$ROOT_DIR/.agents" "$TEMPLATE_DIR/.agents" 2>/dev/null \
        | grep -v "progress/memory" \
        | grep -v "progress/slices" \
        | grep -v "progress/blockers" \
        | grep -v "kit-sync.md" || true)

    drift_count=$(echo "$drift_output" | grep -c . || true)

    if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
        fail ".agents/ has $drift_count drifted file(s) from template/.agents/"
        echo "$drift_output" | head -10 >&2
    else
        info ".agents/ in sync"
    fi
fi

# ──────────────────────────────────────
# 4. .codex/ directory drift
# ──────────────────────────────────────
if [[ -d "$ROOT_DIR/.codex" ]]; then
    if [[ ! -d "$TEMPLATE_DIR/.codex" ]]; then
        fail "template/.codex/ missing — template rebuild needed"
    else
        drift_output=$(diff -rq "$ROOT_DIR/.codex" "$TEMPLATE_DIR/.codex" 2>/dev/null \
            | grep -v "progress/memory" \
            | grep -v "kit-sync.md" || true)

        drift_count=$(echo "$drift_output" | grep -c . || true)

        if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
            fail ".codex/ has $drift_count drifted file(s) from template/.codex/"
            echo "$drift_output" | head -10 >&2
        else
            info ".codex/ in sync"
        fi
    fi
fi

# ──────────────────────────────────────
# Cross-runtime reference allowlist
# ──────────────────────────────────────
# Standalone runtimes may reference `.agents/` (the shared canonical library
# of skills, rules, instructions, and the skill-library manifest). These
# "bridge-mode" references are intentional. References to any OTHER
# standalone runtime (.claude/, .codex/, .factory/, .freebuff/, .zcode/)
# remain violations.

# ──────────────────────────────────────
# 5. Codex standalone runtime guard
# ──────────────────────────────────────
codex_refs_file=$(mktemp)
trap 'rm -f "$src_dirs_file" "$tpl_dirs_file" "$codex_refs_file"' EXIT

if grep -R -nE "\.claude/(workflows|skills|commands|rules|instructions|skill-library)/|\.factory/(workflows|skills|commands|rules|instructions|skill-library)/|\.freebuff/(workflows|skills|commands|rules|instructions|skill-library)/|\.zcode/(workflows|skills|commands|rules|instructions|skill-library)/" "$ROOT_DIR/.codex" \
    --include='*.md' \
    --exclude='README.md' \
    --exclude-dir='progress' > "$codex_refs_file" 2>/dev/null; then
    ref_count=$(wc -l < "$codex_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected cross-runtime reference(s) under .codex/"
    head -10 "$codex_refs_file" >&2
else
    info "No runtime cross-runtime references remain under .codex/"
fi

if [[ ! -d "$ROOT_DIR/.codex/skill-library" || -L "$ROOT_DIR/.codex/skill-library" ]]; then
    fail ".codex/skill-library must exist as a real directory"
else
    info ".codex/skill-library is local"
fi

if [[ -d "$ROOT_DIR/.memory/pipeline/progress" ]]; then
    info ".memory/pipeline/progress/ exists"
else
    fail ".memory/pipeline/progress/ missing"
fi

if [[ -f "$ROOT_DIR/.memory/pipeline/kit-sync.md" ]]; then
    info ".memory/pipeline/kit-sync.md present"
else
    fail ".memory/pipeline/kit-sync.md missing"
fi

if [[ -f "$TEMPLATE_DIR/.memory/pipeline/kit-sync.md" ]]; then
    info "template/.memory/pipeline/kit-sync.md present"
else
    fail "template/.memory/pipeline/kit-sync.md missing — template rebuild needed"
fi

if [[ -d "$TEMPLATE_DIR/.memory/pipeline/progress" ]]; then
    info "template/.memory/pipeline/progress/ present"
else
    fail "template/.memory/pipeline/progress/ missing — template rebuild needed"
fi

if [[ -L "$TEMPLATE_DIR/.codex/skill-library" ]]; then
    fail "template/.codex/skill-library must not be a symlink"
else
    info "template/.codex/skill-library is local"
fi

if grep -R -nE "\.claude/(workflows|skills|commands|rules|instructions|skill-library)/|\.factory/(workflows|skills|commands|rules|instructions|skill-library)/|\.freebuff/(workflows|skills|commands|rules|instructions|skill-library)/|\.zcode/(workflows|skills|commands|rules|instructions|skill-library)/" "$TEMPLATE_DIR/.codex" \
    --include='*.md' \
    --exclude='README.md' \
    --exclude-dir='progress' > "$codex_refs_file" 2>/dev/null; then
    ref_count=$(wc -l < "$codex_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected cross-runtime reference(s) in template/.codex/"
    head -10 "$codex_refs_file" >&2
else
    info "No runtime cross-runtime references remain in template/.codex/"
fi

if [[ "$errors" -eq 0 ]]; then
    info "Codex standalone integrity checks passed"
fi

# ──────────────────────────────────────
# 6. .claude/ directory drift
# ──────────────────────────────────────
if [[ -d "$ROOT_DIR/.claude" ]]; then
    if [[ ! -d "$TEMPLATE_DIR/.claude" ]]; then
        fail "template/.claude/ missing — template rebuild needed"
    else
        drift_output=$(diff -rq "$ROOT_DIR/.claude" "$TEMPLATE_DIR/.claude" 2>/dev/null \
            | grep -v "memory/sessions" \
            | grep -v "progress/memory" \
            | grep -v "kit-sync.md" \
            | grep -v "settings.local.json" \
            | grep -v "/.claude/worktrees" || true)

        drift_output=$(echo "$drift_output" | grep -v "Only in .*\.claude: worktrees" || true)


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
# 7. docs/ directory drift (structure only — content is stripped)
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
# 9. Claude standalone runtime guard
# ──────────────────────────────────────
claude_workflows_file=$(mktemp)
claude_commands_file=$(mktemp)
missing_commands_file=$(mktemp)
extra_commands_file=$(mktemp)
claude_agent_refs_file=$(mktemp)
trap 'rm -f "$src_dirs_file" "$tpl_dirs_file" "$src_r_file" "$tpl_r_file" "$codex_refs_file" "$claude_workflows_file" "$claude_commands_file" "$missing_commands_file" "$extra_commands_file" "$claude_agent_refs_file"' EXIT

find "$ROOT_DIR/.claude/commands" -maxdepth 1 -name "*.md" -type f -print \
    | sed 's|.*/||' \
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

if grep -R -nE "\.codex/(workflows|skills|commands|rules|instructions|skill-library)/|\.factory/(workflows|skills|commands|rules|instructions|skill-library)/|\.freebuff/(workflows|skills|commands|rules|instructions|skill-library)/|\.zcode/(workflows|skills|commands|rules|instructions|skill-library)/" "$ROOT_DIR/.claude" \
    --include='*.md' \
    --exclude='README.md' \
    --exclude='settings.local.json' \
    --exclude-dir='memory' \
    --exclude-dir='progress' \
    --exclude-dir='worktrees' > "$claude_agent_refs_file"; then
    ref_count=$(wc -l < "$claude_agent_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected cross-runtime reference(s) under .claude/"
    head -10 "$claude_agent_refs_file" >&2
else
    info "No runtime cross-runtime references remain under .claude/"
fi

if [[ ! -d "$ROOT_DIR/.claude/skill-library" || -L "$ROOT_DIR/.claude/skill-library" ]]; then
    fail ".claude/skill-library must exist as a real directory"
else
    info ".claude/skill-library is local"
fi

if [[ -d "$ROOT_DIR/.memory/pipeline/progress" ]]; then
    info ".memory/pipeline/progress/ exists"
else
    fail ".memory/pipeline/progress/ missing"
fi

if [[ -f "$ROOT_DIR/.memory/pipeline/kit-sync.md" ]]; then
    info ".memory/pipeline/kit-sync.md present"
else
    fail ".memory/pipeline/kit-sync.md missing"
fi

if [[ -f "$TEMPLATE_DIR/.memory/pipeline/kit-sync.md" ]]; then
    info "template/.memory/pipeline/kit-sync.md present"
else
    fail "template/.memory/pipeline/kit-sync.md missing — template rebuild needed"
fi

if [[ -d "$TEMPLATE_DIR/.memory/pipeline/progress" ]]; then
    info "template/.memory/pipeline/progress/ present"
else
    fail "template/.memory/pipeline/progress/ missing — template rebuild needed"
fi

if [[ -L "$TEMPLATE_DIR/.claude/skill-library" ]]; then
    fail "template/.claude/skill-library must not be a symlink"
else
    info "template/.claude/skill-library is local"
fi

if grep -R -nE "\.codex/(workflows|skills|commands|rules|instructions|skill-library)/|\.factory/(workflows|skills|commands|rules|instructions|skill-library)/|\.freebuff/(workflows|skills|commands|rules|instructions|skill-library)/|\.zcode/(workflows|skills|commands|rules|instructions|skill-library)/" "$TEMPLATE_DIR/.claude" --include='*.md' --exclude='README.md' --exclude-dir='memory' --exclude-dir='progress' --exclude-dir='worktrees' > "$claude_agent_refs_file"; then
    ref_count=$(wc -l < "$claude_agent_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected cross-runtime reference(s) in template/.claude/"
    head -10 "$claude_agent_refs_file" >&2
else
    info "No runtime cross-runtime references remain in template/.claude/"
fi

for command_file in "$ROOT_DIR/.claude/commands"/*.md; do
    [[ -f "$command_file" ]] || continue
    command_name=$(basename "$command_file" .md)
    expected_reference=$(printf 'Reference: `.claude/skills/%s/SKILL.md`.' "$command_name")
    if ! grep -F -q "$expected_reference" "$command_file"; then
        fail "$(basename "$command_file") does not reference its Claude workflow file"
    fi
done

if [[ "$errors" -eq 0 ]]; then
    info "Claude standalone integrity checks passed"
fi

# ──────────────────────────────────────
# 10. .factory/ directory drift
# ──────────────────────────────────────
if [[ -d "$ROOT_DIR/.factory" ]]; then
    if [[ ! -d "$TEMPLATE_DIR/.factory" ]]; then
        fail "template/.factory/ missing — template rebuild needed"
    else
        drift_output=$(diff -rq "$ROOT_DIR/.factory" "$TEMPLATE_DIR/.factory" 2>/dev/null \
            | grep -v "memory/sessions" \
            | grep -v "progress/memory" \
            | grep -v "kit-sync.md" || true)

        drift_count=$(echo "$drift_output" | grep -c . || true)

        if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
            fail ".factory/ has $drift_count drifted file(s) from template/.factory/"
            echo "$drift_output" | head -10 >&2
        else
            info ".factory/ in sync"
        fi
    fi
fi

# ──────────────────────────────────────
# 11. Factory standalone runtime guard
# ──────────────────────────────────────
factory_refs_file=$(mktemp)
trap 'rm -f "$src_dirs_file" "$tpl_dirs_file" "$src_r_file" "$tpl_r_file" "$codex_refs_file" "$claude_workflows_file" "$claude_commands_file" "$missing_commands_file" "$extra_commands_file" "$claude_agent_refs_file" "$factory_refs_file"' EXIT

# No .agents/ references in .factory/
if grep -R -nE "\.agents/(workflows|skills|commands|rules|instructions|skill-library)/" "$ROOT_DIR/.factory" \
    --include='*.md' \
    --exclude='README.md' \
    --exclude-dir='memory' \
    --exclude-dir='progress' > "$factory_refs_file" 2>/dev/null; then
    ref_count=$(wc -l < "$factory_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected .agent reference(s) under .factory/"
    head -10 "$factory_refs_file" >&2
else
    info "No runtime .agent references remain under .factory/"
fi

# No .claude/ references in .factory/
if grep -R -n "\.claude/" "$ROOT_DIR/.factory" \
    --include='*.md' \
    --exclude='README.md' \
    --exclude-dir='memory' \
    --exclude-dir='progress' > "$factory_refs_file" 2>/dev/null; then
    ref_count=$(wc -l < "$factory_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected .claude reference(s) under .factory/"
    head -10 "$factory_refs_file" >&2
else
    info "No runtime .claude references remain under .factory/"
fi

if [[ ! -d "$ROOT_DIR/.factory/skill-library" || -L "$ROOT_DIR/.factory/skill-library" ]]; then
    fail ".factory/skill-library must exist as a real directory"
else
    info ".factory/skill-library is local"
fi

if [[ -d "$ROOT_DIR/.memory/pipeline/progress" ]]; then
    info ".memory/pipeline/progress/ exists"
else
    fail ".memory/pipeline/progress/ missing"
fi

if [[ -f "$ROOT_DIR/.memory/pipeline/kit-sync.md" ]]; then
    info ".memory/pipeline/kit-sync.md present"
else
    fail ".memory/pipeline/kit-sync.md missing"
fi

if [[ -f "$TEMPLATE_DIR/.memory/pipeline/kit-sync.md" ]]; then
    info "template/.memory/pipeline/kit-sync.md present"
else
    fail "template/.memory/pipeline/kit-sync.md missing — template rebuild needed"
fi

if [[ -d "$TEMPLATE_DIR/.memory/pipeline/progress" ]]; then
    info "template/.memory/pipeline/progress/ present"
else
    fail "template/.memory/pipeline/progress/ missing — template rebuild needed"
fi

if [[ -L "$TEMPLATE_DIR/.factory/skill-library" ]]; then
    fail "template/.factory/skill-library must not be a symlink"
else
    info "template/.factory/skill-library is local"
fi

# No .agents/ or .claude/ references in template/.factory/
if grep -R -nE "\.agents/(workflows|skills|commands|rules|instructions|skill-library)/|\.claude/(workflows|skills|commands|rules|instructions|skill-library)/" "$TEMPLATE_DIR/.factory" --include='*.md' --exclude='README.md' --exclude-dir='memory' --exclude-dir='progress' > "$factory_refs_file" 2>/dev/null; then
    ref_count=$(wc -l < "$factory_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected .agents/.claude reference(s) in template/.factory/"
    head -10 "$factory_refs_file" >&2
else
    info "No runtime .agents/.claude references remain in template/.factory/"
fi

if [[ "$errors" -eq 0 ]]; then
    info "Factory standalone integrity checks passed"
fi

# ──────────────────────────────────────
# 11b. .freebuff/ directory drift
# ──────────────────────────────────────
if [[ -d "$ROOT_DIR/.freebuff" ]]; then
    if [[ ! -d "$TEMPLATE_DIR/.freebuff" ]]; then
        fail "template/.freebuff/ missing — template rebuild needed"
    else
        drift_output=$(diff -rq "$ROOT_DIR/.freebuff" "$TEMPLATE_DIR/.freebuff" 2>/dev/null \
            | grep -v "memory/sessions" \
            | grep -v "progress/memory" \
            | grep -v "kit-sync.md" \
            | grep -v "settings.local.json" || true)

        drift_count=$(echo "$drift_output" | grep -c . || true)

        if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
            fail ".freebuff/ has $drift_count drifted file(s) from template/.freebuff/"
            echo "$drift_output" | head -10 >&2
        else
            info ".freebuff/ in sync"
        fi
    fi
fi

# ──────────────────────────────────────
# 11c. Freebuff standalone runtime guard
# ──────────────────────────────────────
freebuff_refs_file=$(mktemp)
trap 'rm -f "$src_dirs_file" "$tpl_dirs_file" "$src_r_file" "$tpl_r_file" "$codex_refs_file" "$claude_workflows_file" "$claude_commands_file" "$missing_commands_file" "$extra_commands_file" "$claude_agent_refs_file" "$factory_refs_file" "$freebuff_refs_file"' EXIT

# Freebuff commands must reference their own skills
for command_file in "$ROOT_DIR/.freebuff/commands"/*.md; do
    [[ -f "$command_file" ]] || continue
    command_name=$(basename "$command_file" .md)
    expected_reference=$(printf 'Reference: `.freebuff/skills/%s/SKILL.md`.' "$command_name")
    if ! grep -F -q "$expected_reference" "$command_file"; then
        fail "$(basename "$command_file") does not reference its Freebuff workflow file"
    fi
done

# Freebuff must be self-contained (no cross-runtime asset references)
if grep -R -nE "\.claude/(workflows|skills|commands|rules|instructions|skill-library)/|\.codex/(workflows|skills|commands|rules|instructions|skill-library)/|\.factory/(workflows|skills|commands|rules|instructions|skill-library)/|\.zcode/(workflows|skills|commands|rules|instructions|skill-library)/" "$ROOT_DIR/.freebuff" \
    --include='*.md' \
    --exclude='README.md' \
    --exclude-dir='memory' \
    --exclude-dir='progress' > "$freebuff_refs_file" 2>/dev/null; then
    ref_count=$(wc -l < "$freebuff_refs_file" | tr -d ' ')
    fail "Found $ref_count unexpected cross-runtime reference(s) under .freebuff/"
    head -10 "$freebuff_refs_file" >&2
else
    info "No runtime cross-runtime references remain under .freebuff/"
fi

if [[ ! -d "$ROOT_DIR/.freebuff/skill-library" || -L "$ROOT_DIR/.freebuff/skill-library" ]]; then
    fail ".freebuff/skill-library must exist as a real directory"
else
    info ".freebuff/skill-library is local"
fi

if [[ -L "$TEMPLATE_DIR/.freebuff/skill-library" ]]; then
    fail "template/.freebuff/skill-library must not be a symlink"
else
    info "template/.freebuff/skill-library is local"
fi

if [[ "$errors" -eq 0 ]]; then
    info "Freebuff standalone integrity checks passed"
fi

# ──────────────────────────────────────
# 11d. .zcode/ directory drift
# ──────────────────────────────────────
if [[ -d "$ROOT_DIR/.zcode" ]]; then
    if [[ ! -d "$TEMPLATE_DIR/.zcode" ]]; then
        fail "template/.zcode/ missing — template rebuild needed"
    else
        drift_output=$(diff -rq "$ROOT_DIR/.zcode" "$TEMPLATE_DIR/.zcode" 2>/dev/null || true)
        drift_count=$(echo "$drift_output" | grep -c . || true)

        if [[ "$drift_count" -gt 0 && -n "$drift_output" ]]; then
            fail ".zcode/ has $drift_count drifted file(s) from template/.zcode/"
            echo "$drift_output" | head -10 >&2
        else
            info ".zcode/ in sync"
        fi
    fi
fi

# ──────────────────────────────────────
# 11e. ZCode standalone runtime guard
# ──────────────────────────────────────
# ZCode command shims must point at the shared .agents/ skill library
for command_file in "$ROOT_DIR/.zcode/commands"/*.md; do
    [[ -f "$command_file" ]] || continue
    command_name=$(basename "$command_file" .md)
    expected_reference=$(printf 'Reference: `.agents/skills/%s/SKILL.md`.' "$command_name")
    if ! grep -F -q "$expected_reference" "$command_file"; then
        fail "$(basename "$command_file") does not reference its shared .agents/ workflow file"
    fi
done

if [[ ! -f "$ROOT_DIR/.zcode/config.json" ]]; then
    fail ".zcode/config.json missing"
else
    info ".zcode/config.json present"
fi

if [[ "$errors" -eq 0 ]]; then
    info "ZCode standalone integrity checks passed"
fi

# ──────────────────────────────────────
# 12. Unified memory scaffold checks
# ──────────────────────────────────────
if [[ ! -d "$ROOT_DIR/memory-src" ]]; then
    fail "memory-src/ missing from project root"
elif [[ ! -d "$TEMPLATE_DIR/.memory" ]]; then
    fail "template/.memory/ missing — template rebuild needed"
else
    memory_drift=$(diff -rq "$ROOT_DIR/memory-src" "$TEMPLATE_DIR/.memory" 2>/dev/null \
        | grep -v "Only in .*template/.memory: raw" \
        | grep -v "Only in .*template/.memory: wiki" \
        | grep -v "Only in .*template/.memory/raw:" \
        | grep -v "Only in .*template/.memory/wiki:" \
        | grep -v "raw/" \
        | grep -v "wiki/knowledge" \
        | grep -v "config.json" || true)

    memory_drift=$(echo "$memory_drift" | grep -v "Only in .*memory-src/raw: README.md" || true)

    # Ignore generated wiki index files that are scaffolded only in template/.memory
    memory_drift=$(echo "$memory_drift" | grep -v "Only in .*template/.memory/wiki: index.md" \
        | grep -v "Only in .*template/.memory/wiki: patterns.md" \
        | grep -v "Only in .*template/.memory/wiki: decisions.md" \
        | grep -v "Only in .*template/.memory/wiki: blockers.md" \
        | grep -v "Files .*memory-src/pipeline/kit-sync.md and .*template/.memory/pipeline/kit-sync.md differ" \
        | grep -v "Only in .*template/.memory/pipeline: kit-sync.md" || true)

    memory_drift_count=$(echo "$memory_drift" | grep -c . || true)
    if [[ "$memory_drift_count" -gt 0 && -n "$memory_drift" ]]; then
        fail "memory-src/ has $memory_drift_count drifted file(s) from template/.memory/"
        echo "$memory_drift" | head -10 >&2
    else
        info "memory-src/ in sync with template/.memory/"
    fi

    for required in \
        "$TEMPLATE_DIR/.memory/pipeline/compile.mjs" \
        "$TEMPLATE_DIR/.memory/mcp-server/index.mjs" \
        "$TEMPLATE_DIR/.memory/hooks/session-start.mjs" \
        "$TEMPLATE_DIR/.memory/schema/entry.schema.json" \
        "$TEMPLATE_DIR/.memory/config.json"; do
        if [[ -f "$required" ]]; then
            info "$(realpath --relative-to="$TEMPLATE_DIR" "$required") present"
        else
            fail "$(realpath --relative-to="$TEMPLATE_DIR" "$required") missing"
        fi
    done
fi

# ──────────────────────────────────────
# 13. Memory runtime install contract checks
# ──────────────────────────────────────
if grep -F -q 'template/.memory/' "$ROOT_DIR/bin/cli.mjs" && \
   grep -F -q 'Installed ${c.bold}.memory/${c.reset} runtime scaffold' "$ROOT_DIR/bin/cli.mjs"; then
    info "CLI contains unified memory runtime install contract"
else
    fail "bin/cli.mjs is missing unified memory runtime install contract"
fi

if grep -F -q 'writeJsonFile(mcpPath' "$ROOT_DIR/bin/cli.mjs" || \
   grep -F -q 'writeJsonFile(claudeSettingsPath' "$ROOT_DIR/bin/cli.mjs" || \
   grep -F -q 'mergeHookConfig(mergeHookConfig' "$ROOT_DIR/bin/cli.mjs"; then
    fail "bin/cli.mjs still auto-manages MCP client config or Claude settings"
else
    info "CLI leaves MCP client config and Claude settings user-managed"
fi

# ──────────────────────────────────────
# 14. Summary
# ──────────────────────────────────────
echo ""
if [[ "$errors" -gt 0 ]]; then
    echo "[integrity] FAILED — $errors issue(s) found. Run 'npm run build' to rebuild the template."
    exit 1
else
    echo "[integrity] PASSED — template fully in sync."
    exit 0
fi
