---
name: git-advanced
description: "Comprehensive advanced Git patterns guide covering interactive rebase, cherry-pick, bisect for bug hunting, worktrees, reflog for recovery, stash management, submodules vs subtrees, hooks (pre-commit, commit-msg, pre-push), conventional commits, merge strategies, branch naming, git attributes (LFS, diff drivers), blame/log archaeology, patch workflow, sparse checkout, filter-repo, signing commits, and performance optimizations. Use when performing complex Git operations beyond basic add/commit/push."
version: 1.0.0
---

# Advanced Git Patterns

## 1. Interactive Rebase

### Rewriting History

```bash
# Rebase last N commits interactively
git rebase -i HEAD~5

# Rebase onto a branch
git rebase -i main

# The editor opens with a list of commits:
# pick abc1234 Add user model
# pick def5678 Fix typo in user model
# pick ghi9012 Add user validation
# pick jkl3456 WIP debugging
# pick mno7890 Add user tests

# Commands:
# pick   = use commit as-is
# reword = use commit but edit the message
# edit   = pause to amend the commit
# squash = meld into previous commit (keep message)
# fixup  = meld into previous commit (discard message)
# drop   = remove commit entirely
# exec   = run a shell command

# Example: squash WIP commit into the previous one:
# pick abc1234 Add user model
# pick def5678 Fix typo in user model
# pick ghi9012 Add user validation
# fixup jkl3456 WIP debugging
# pick mno7890 Add user tests
```

### Autosquash

```bash
# Create a fixup commit (will auto-squash into target)
git commit --fixup=abc1234

# Create a squash commit (auto-squash with message editing)
git commit --squash=abc1234

# Run rebase with autosquash
git rebase -i --autosquash main

# Enable autosquash by default
git config --global rebase.autosquash true
```

### Rebase onto

```bash
# Move a branch from one base to another
# Before: A-B-C-D (main)
#              \
#               E-F-G (feature, branched from C)

git rebase --onto D C feature

# After:  A-B-C-D (main)
#                  \
#                   E'-F'-G' (feature, now based on D)
```

### Abort and Continue

```bash
# If conflicts arise during rebase
git rebase --abort    # Cancel the entire rebase
git rebase --continue # After resolving conflicts, continue
git rebase --skip     # Skip the current commit
```

---

## 2. Cherry-Pick

```bash
# Apply a specific commit to the current branch
git cherry-pick abc1234

# Cherry-pick without committing (stage changes only)
git cherry-pick --no-commit abc1234

# Cherry-pick a range of commits
git cherry-pick abc1234..def5678    # Exclusive of abc1234
git cherry-pick abc1234^..def5678   # Inclusive of abc1234

# Cherry-pick from another remote
git fetch upstream
git cherry-pick upstream/main~3

# Resolve conflicts during cherry-pick
git cherry-pick --continue   # After resolving
git cherry-pick --abort      # Cancel
```

### When to Use Cherry-Pick

```
GOOD use cases:
- Backporting a bug fix to a release branch
- Extracting a single commit from a long-lived feature branch
- Applying a hotfix that was made on the wrong branch

AVOID:
- Cherry-picking many commits (use merge or rebase instead)
- Cherry-picking between branches that will be merged (creates duplicates)
```

---

## 3. Git Bisect (Bug Hunting)

```bash
# Start bisecting
git bisect start

# Mark current commit as bad (has the bug)
git bisect bad

# Mark a known good commit (did not have the bug)
git bisect good v1.0.0

# Git checks out a commit halfway between good and bad.
# Test it, then mark:
git bisect good    # Bug not present
# or
git bisect bad     # Bug present

# Git narrows the range and checks out the next commit.
# Repeat until the first bad commit is found.

# Reset when done
git bisect reset
```

### Automated Bisect

```bash
# Run a script to automatically test each commit
git bisect start HEAD v1.0.0
git bisect run npm test

# The script must exit 0 for "good" and non-zero for "bad"
# Git will find the first commit that broke the tests

# With a custom test script
git bisect run ./test-specific-bug.sh

# Skip untestable commits (e.g., won't compile)
git bisect skip
```

### Bisect with a Test Command

```bash
# Example: find when a specific test started failing
git bisect start HEAD v2.0.0
git bisect run sh -c 'npm run build && npm test -- --grep "user login"'

# Example: find when a file was deleted
git bisect start HEAD v1.0.0
git bisect run sh -c 'test -f src/utils/helpers.ts'
```

---

## 4. Worktrees

### Multiple Working Directories from One Repo

```bash
# List existing worktrees
git worktree list

# Create a new worktree for a branch
git worktree add ../project-feature feature-branch

# Create a new worktree with a new branch
git worktree add -b hotfix-123 ../project-hotfix main

# Remove a worktree
git worktree remove ../project-feature

# Prune stale worktree metadata
git worktree prune
```

### Use Cases

```
- Review a PR while your main worktree has uncommitted changes
- Run tests on one branch while developing on another
- Compare behavior between branches side by side
- Build documentation from one branch while coding on another

# Directory structure:
# ~/projects/myapp/              (main worktree)
# ~/projects/myapp-feature/      (feature worktree)
# ~/projects/myapp-hotfix/       (hotfix worktree)
# All share the same .git directory (disk-efficient)
```

---

## 5. Reflog (Recovery)

### View the Reflog

```bash
# Show reflog for HEAD (all recent actions)
git reflog

# Output example:
# abc1234 HEAD@{0}: commit: Add user tests
# def5678 HEAD@{1}: rebase (finish): returning to refs/heads/feature
# ghi9012 HEAD@{2}: rebase (pick): Add validation
# jkl3456 HEAD@{3}: reset: moving to HEAD~3
# mno7890 HEAD@{4}: commit: WIP changes (now "lost")

# Show reflog for a specific branch
git reflog show feature-branch

# Show reflog with timestamps
git reflog --date=iso
```

### Recovery Scenarios

```bash
# Recover from accidental reset --hard
git reflog
# Find the commit hash before the reset
git reset --hard HEAD@{2}

# Recover a deleted branch
git reflog
# Find the last commit on the deleted branch
git branch recovered-branch abc1234

# Recover from a bad rebase
git reflog
# Find HEAD before the rebase started
git reset --hard HEAD@{5}

# Recover dropped stash
git fsck --unreachable | grep commit
git show <commit-hash>
git stash apply <commit-hash>
```

### Reflog Expiry

```bash
# Reflog entries expire after 90 days (default)
# Unreachable entries expire after 30 days (default)

# Change expiry
git config gc.reflogExpire 180.days
git config gc.reflogExpireUnreachable 90.days

# Manually expire
git reflog expire --expire=now --all
git gc --prune=now
```

---

## 6. Stash Management

```bash
# Stash current changes (tracked files only)
git stash

# Stash with a descriptive message
git stash push -m "WIP: user authentication refactor"

# Stash including untracked files
git stash push -u -m "Include new config files"

# Stash including ignored files too
git stash push -a -m "Everything including ignored"

# Stash specific files
git stash push -m "Only these files" src/auth.ts src/login.tsx

# List stashes
git stash list
# stash@{0}: On feature: WIP: user authentication refactor
# stash@{1}: On main: Quick experiment

# Apply most recent stash (keep it in stash list)
git stash apply

# Apply and remove from stash list
git stash pop

# Apply a specific stash
git stash apply stash@{2}

# Show stash contents (diff)
git stash show -p stash@{0}

# Create a branch from a stash
git stash branch new-feature stash@{0}

# Drop a specific stash
git stash drop stash@{1}

# Clear all stashes
git stash clear
```

---

## 7. Submodules vs Subtrees

### Submodules

```bash
# Add a submodule
git submodule add https://github.com/user/library.git lib/library

# Clone a repo with submodules
git clone --recurse-submodules https://github.com/user/project.git

# Initialize submodules after cloning
git submodule update --init --recursive

# Update submodule to latest upstream commit
cd lib/library
git pull origin main
cd ../..
git add lib/library
git commit -m "Update library submodule to latest"

# Update all submodules
git submodule update --remote --merge

# Remove a submodule
git submodule deinit lib/library
git rm lib/library
rm -rf .git/modules/lib/library
```

### Subtrees

```bash
# Add a subtree (no .gitmodules file, simpler for contributors)
git subtree add --prefix=lib/library https://github.com/user/library.git main --squash

# Pull updates from upstream
git subtree pull --prefix=lib/library https://github.com/user/library.git main --squash

# Push changes back to upstream
git subtree push --prefix=lib/library https://github.com/user/library.git main
```

### Comparison

```
Submodules:
  + Exact version pinning
  + Keeps history separate
  + Smaller repo size (only metadata stored)
  - Requires extra commands to clone/update
  - Contributors must understand submodule workflow
  - Detached HEAD inside submodule

Subtrees:
  + No special commands for contributors (just clone and go)
  + Changes to subtree are regular commits
  + Works without network access
  - Larger repo size (full subtree code in repo)
  - Pushing back upstream is manual
  - History can become cluttered
```

---

## 8. Git Hooks

### Client-Side Hooks

```bash
# Hooks live in .git/hooks/ (not version-controlled by default)
# Use a tool like Husky, lefthook, or simple-git-hooks to share hooks

# pre-commit: runs before commit is created
# Use case: lint, format, run tests
.git/hooks/pre-commit

# commit-msg: runs after message is entered
# Use case: enforce conventional commit format
.git/hooks/commit-msg

# pre-push: runs before push
# Use case: run full test suite
.git/hooks/pre-push

# prepare-commit-msg: runs before editor opens
# Use case: prepend branch name to commit message
.git/hooks/prepare-commit-msg
```

### pre-commit Hook Example

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linter on staged files only
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

if [ -n "$STAGED_FILES" ]; then
    npx eslint $STAGED_FILES
    if [ $? -ne 0 ]; then
        echo "Lint errors found. Fix them before committing."
        exit 1
    fi
fi

# Run type check
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "Type errors found. Fix them before committing."
    exit 1
fi

exit 0
```

### commit-msg Hook (Conventional Commits)

```bash
#!/bin/sh
# .git/hooks/commit-msg

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Conventional commit pattern
PATTERN="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{1,72}"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
    echo "ERROR: Commit message does not follow Conventional Commits format."
    echo ""
    echo "Expected: <type>(<scope>): <description>"
    echo "Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
    echo ""
    echo "Examples:"
    echo "  feat(auth): add password reset flow"
    echo "  fix: resolve race condition in queue worker"
    echo "  docs(readme): update installation instructions"
    exit 1
fi

exit 0
```

### Husky Setup (Shared Hooks)

```bash
# Install
npm install --save-dev husky

# Initialize
npx husky init

# Add a pre-commit hook
echo "npx lint-staged" > .husky/pre-commit

# Add a commit-msg hook
echo 'npx --no-install commitlint --edit "$1"' > .husky/commit-msg
```

---

## 9. Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

```
feat:     New feature (MINOR in semver)
fix:      Bug fix (PATCH in semver)
docs:     Documentation only
style:    Formatting, semicolons, etc. (not CSS)
refactor: Code change that neither fixes nor adds
perf:     Performance improvement
test:     Adding or correcting tests
build:    Build system or dependencies
ci:       CI configuration
chore:    Maintenance tasks
revert:   Revert a previous commit
```

### Breaking Changes

```
feat(api)!: remove deprecated endpoints

BREAKING CHANGE: The /v1/users endpoint has been removed.
Use /v2/users instead.
```

### Examples

```
feat(auth): add OAuth2 login with Google
fix(parser): handle nested quotes in CSV import
docs(api): add rate limiting section to API docs
refactor(db): extract connection pool into separate module
perf(search): add index on created_at column
test(auth): add integration tests for token refresh
build: upgrade TypeScript to 5.4
ci: add Node 22 to test matrix
chore: remove unused dependencies
```

---

## 10. Merge Strategies

### Fast-Forward Only

```bash
# Only merge if it can be a fast-forward (linear history)
git merge --ff-only feature

# Fail if feature has diverged from main
# Configure as default
git config --global merge.ff only

# Per-branch configuration
git config branch.main.mergeoptions "--ff-only"
```

### Merge Commits (No Fast-Forward)

```bash
# Always create a merge commit (even if fast-forward is possible)
git merge --no-ff feature

# Preserves branch topology in history
# Result:  A-B-C---------M (main)
#              \         /
#               D-E-F-G (feature)
```

### Squash Merge

```bash
# Squash all feature commits into one commit on main
git merge --squash feature
git commit -m "feat(users): add user management module"

# Result:  A-B-C-S (main, S contains all changes from feature)
# The feature branch history is lost in main
```

### When to Use Each

```
Fast-forward:
  - Simple, linear changes
  - Single-commit features
  - Hotfixes to release branches

Merge commit:
  - Feature branches with multiple meaningful commits
  - When branch history is valuable
  - Team workflows where branch topology matters

Squash merge:
  - Feature branches with messy WIP commits
  - When only the final result matters
  - PRs where individual commits are not meaningful
```

---

## 11. Branch Naming Conventions

```
# Pattern: <type>/<ticket>-<description>

feature/AUTH-123-oauth-login
bugfix/BUG-456-fix-null-pointer
hotfix/HOT-789-security-patch
chore/CHORE-012-update-deps
docs/DOCS-345-api-reference
release/v2.1.0
experiment/try-new-parser

# Short-lived branches:
# - feature/* -- merged and deleted
# - bugfix/*  -- merged and deleted
# - hotfix/*  -- merged and deleted

# Long-lived branches:
# - main (or master) -- production
# - develop          -- integration (if using gitflow)
# - release/*        -- release candidates
```

---

## 12. Git Attributes

### LFS (Large File Storage)

```bash
# Install Git LFS
git lfs install

# Track file types
git lfs track "*.psd"
git lfs track "*.zip"
git lfs track "*.mp4"
git lfs track "assets/textures/**"

# This creates/updates .gitattributes:
# *.psd filter=lfs diff=lfs merge=lfs -text
# *.zip filter=lfs diff=lfs merge=lfs -text

# Commit .gitattributes first
git add .gitattributes
git commit -m "chore: configure Git LFS for binary assets"

# Then add and commit large files normally
git add assets/hero.psd
git commit -m "feat(assets): add hero character artwork"

# Check LFS status
git lfs ls-files
git lfs status
```

### Custom Diff Drivers

```gitattributes
# .gitattributes

# Treat these as binary (no diff)
*.png binary
*.jpg binary

# Use custom diff for lock files
package-lock.json diff=lockfile
yarn.lock diff=lockfile

# Normalize line endings
*.ts text eol=lf
*.tsx text eol=lf
*.json text eol=lf
*.md text eol=lf
*.sh text eol=lf
*.bat text eol=crlf

# Export-ignore (excluded from archives)
.github/ export-ignore
tests/ export-ignore
docs/ export-ignore
.gitattributes export-ignore
```

---

## 13. Blame and Log Archaeology

```bash
# Blame: show who last modified each line
git blame src/auth.ts

# Blame with line range
git blame -L 10,30 src/auth.ts

# Ignore whitespace changes in blame
git blame -w src/auth.ts

# Show blame before a specific commit (skip past a refactor)
git blame --ignore-rev abc1234 src/auth.ts

# Ignore bulk reformatting commits (create a file listing them)
echo "abc1234" >> .git-blame-ignore-revs
echo "def5678" >> .git-blame-ignore-revs
git config blame.ignoreRevsFile .git-blame-ignore-revs

# Log: search commit messages
git log --grep="fix.*auth" --oneline

# Log: search code changes (pickaxe -- find when a string was added/removed)
git log -S "function authenticate" --oneline

# Log: search code changes with regex
git log -G "authenticate\(" --oneline

# Log: show file history
git log --follow -p -- src/auth.ts

# Log: show changes between two dates
git log --after="2025-01-01" --before="2025-02-01" --oneline

# Log: show commits by author
git log --author="jane" --oneline

# Log: show a graph of branch history
git log --oneline --graph --all --decorate

# Show when a file was deleted
git log --diff-filter=D -- src/old-file.ts

# Show who has contributed the most lines to a file
git shortlog -sn -- src/auth.ts
```

---

## 14. Patch Workflow

```bash
# Create a patch file from the last commit
git format-patch -1 HEAD

# Create patches for a range of commits
git format-patch main..feature

# Create a single combined patch
git format-patch main..feature --stdout > combined.patch

# Apply a patch (creates commits)
git am 0001-feat-add-user-model.patch

# Apply a patch (without committing)
git apply feature.patch

# Check if a patch applies cleanly
git apply --check feature.patch

# Apply with 3-way merge (better conflict handling)
git am -3 0001-feat-add-user-model.patch

# Send patches via email (traditional open source workflow)
git send-email --to=maintainer@example.com 0001-feat-add-user-model.patch
```

---

## 15. Sparse Checkout

```bash
# Initialize sparse checkout
git clone --no-checkout https://github.com/user/monorepo.git
cd monorepo
git sparse-checkout init --cone

# Check out only specific directories
git sparse-checkout set packages/auth packages/shared

# Add more directories later
git sparse-checkout add packages/api

# List current sparse checkout paths
git sparse-checkout list

# Disable sparse checkout (get everything)
git sparse-checkout disable

# Non-cone mode (pattern-based)
git sparse-checkout init
git sparse-checkout set '*.md' 'docs/**' 'src/core/**'
```

---

## 16. filter-repo (Rewriting History)

```bash
# Install: pip install git-filter-repo

# Remove a file from entire history (e.g., accidentally committed secret)
git filter-repo --invert-paths --path secrets.env

# Remove a directory from entire history
git filter-repo --invert-paths --path vendor/

# Move all files into a subdirectory (preparing for monorepo merge)
git filter-repo --to-subdirectory-filter packages/auth

# Replace text in all files across history
git filter-repo --replace-text expressions.txt
# expressions.txt:
# old-api-key==>REDACTED
# secret-password==>REDACTED

# Filter by file size (remove files larger than 10MB)
git filter-repo --strip-blobs-bigger-than 10M

# WARNING: filter-repo rewrites ALL commit hashes.
# Force push is required after running it.
# Coordinate with all team members before using.
```

---

## 17. Signing Commits

### GPG Signing

```bash
# Generate a GPG key
gpg --full-generate-key

# List keys
gpg --list-secret-keys --keyid-format=long

# Configure Git to use the key
git config --global user.signingkey ABCDEF1234567890
git config --global commit.gpgsign true

# Sign a commit
git commit -S -m "feat: signed commit"

# Sign a tag
git tag -s v1.0.0 -m "Release v1.0.0"

# Verify a commit signature
git verify-commit HEAD

# Verify a tag signature
git verify-tag v1.0.0

# Show signatures in log
git log --show-signature
```

### SSH Signing (Simpler, Recommended for GitHub)

```bash
# Configure SSH signing
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# Verify SSH signatures
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers

# Create allowed_signers file
echo "user@example.com ssh-ed25519 AAAA..." > ~/.ssh/allowed_signers
```

---

## 18. Performance Optimizations

### Partial Clone

```bash
# Clone without blob data (download on demand)
git clone --filter=blob:none https://github.com/user/large-repo.git

# Clone without trees and blobs (blobless + treeless)
git clone --filter=tree:0 https://github.com/user/huge-repo.git

# Blobs are fetched on checkout/diff as needed
# Dramatically reduces clone time for large repos
```

### Shallow Clone

```bash
# Clone with limited history depth
git clone --depth=1 https://github.com/user/repo.git

# Fetch more history later
git fetch --deepen=50

# Convert to full clone
git fetch --unshallow
```

### Commit Graph

```bash
# Generate a commit-graph file (speeds up log, merge-base, etc.)
git commit-graph write --reachable

# Enable automatic maintenance
git config --global fetch.writeCommitGraph true
git maintenance start

# The commit graph caches commit metadata for O(1) lookups
# instead of O(n) traversal through pack files
```

### File System Monitor

```bash
# Enable FSMonitor (watches for file changes, speeds up status/diff)
git config core.fsmonitor true
git config core.untrackedCache true

# On macOS: uses FSEvents
# On Linux: uses inotify or Watchman
# On Windows: uses ReadDirectoryChangesW

# For very large repos, install Watchman:
# brew install watchman (macOS)
# Then: git config core.fsmonitor "$(which watchman)"
```

### Maintenance

```bash
# Run scheduled maintenance (gc, commit-graph, prefetch)
git maintenance start

# Manual maintenance
git maintenance run --task=gc
git maintenance run --task=commit-graph
git maintenance run --task=loose-objects

# Configure maintenance schedule
git maintenance register
```

---

## 19. Anti-Patterns

### NEVER

- Force push to main/master without team coordination
- Use `git push --force` (use `--force-with-lease` instead -- it checks for upstream changes)
- Commit secrets, credentials, or API keys (use `.gitignore` and git-secrets)
- Rebase commits that have been pushed and shared with others
- Use `git clean -fd` without checking `git clean -nd` first (dry run)
- Use `git reset --hard` without checking `git reflog` first
- Commit generated files (build output, node_modules, .env)
- Use merge commits for single-commit changes (use fast-forward)

### ALWAYS

- Write meaningful commit messages (describe WHY, not just WHAT)
- Use `--force-with-lease` instead of `--force` for push
- Check `git status` and `git diff` before committing
- Use `.gitignore` for build artifacts, dependencies, and IDE files
- Back up before destructive operations (reflog is your safety net)
- Use signed commits for production-critical repositories
- Configure line ending normalization in `.gitattributes`
- Use partial/sparse clone for large monorepos in CI
- Run `git maintenance` on repositories you work with frequently
