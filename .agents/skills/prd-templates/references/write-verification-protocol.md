# Write Verification Protocol

**Purpose**: Every file write MUST be verified by reading the file back. This protocol eliminates the ~18 instances of "write the completed section" without verification.

---

## Procedure

### 1. Write

Write the content to the target file at the specified section.

### 2. Read Back

Immediately after writing, read the target file. Locate the section header that was just written.

### 3. Verify

Check ALL of these conditions:

- [ ] The section header exists in the file
- [ ] The section content is non-empty (not just a header with no body)
- [ ] The content matches what was intended (key fields present, no truncation)

### 4. Handle Failure

**If ANY check fails:**

1. Log: "Write verification failed for `[file]` section `[section]`."
2. Retry the write once.
3. Read back again and re-verify.
4. If second attempt fails → **STOP**: "Unable to write `[section]` to `[file]` after 2 attempts. Investigate before proceeding."

### 5. Confirm

After successful verification, log: `Write verified: [file] § [section]`

---

## When to Use

Any workflow step that says:
- "Write the completed [section]"
- "Write [content] to [file]"
- "Update [file] with [content]"
- "Append [content] to [file]"

MUST follow this protocol. There are no exceptions. A write instruction without read-back verification is an enforcement failure.

---

## Scope

This protocol applies to **spec and instruction file writes** — the documents that drive downstream pipeline behavior. It does NOT apply to:
- Progress tracking file writes (those have their own verification in the completion checklist)
- Temporary/scratch files
- Audit report writes (those are progressive and self-verifying)
