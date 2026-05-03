# PRD: Codex Runtime Support

## Summary

Add full first-class support for Codex to CFSA Antigravity so users can install, discover, and operate the pipeline using an explicit Codex installation path and Codex-specific guidance rather than relying on generic `AGENTS.md` fallback behavior.

## Problem

The kit currently has explicit runtime support for Antigravity, Claude Code, and Factory, plus root guidance for Gemini. Codex can follow the project informally through `AGENTS.md`, but there is no installer option, no dedicated root guidance file, no status reporting path, and no documentation that treats Codex as a supported target. That creates an uneven user experience and makes Codex support look incidental rather than deliberate.

## Goal

Make Codex a documented, installable, maintainable runtime on par with the existing supported agents.

## Non-Goals

- Redesigning the CFSA pipeline itself
- Changing the progressive decision lock model
- Rewriting all runtime content from scratch when equivalent content can be adapted
- Introducing online dependencies or external services for Codex support

## Users

- Maintainers publishing the kit
- Developers installing CFSA into a project and using Codex as their coding agent
- Contributors updating workflows and docs across supported runtimes

## Proposed Scope

1. Add a dedicated Codex installation path to the kit source and publish Codex guidance in `template/`
2. Extend the CLI installer to support a Codex agent option and install the correct runtime directory
3. Extend `status` detection so Codex installations are recognized and validated
4. Add Codex-facing documentation alongside existing agent documentation
5. Update architecture docs to describe the Codex runtime as a first-class supported environment
6. Preserve existing Antigravity and Claude behavior without regression

## Functional Requirements

### Runtime support

- Codex must be a first-class install target
- Codex support must ship a standalone `.codex/` runtime tree so Codex can discover workflow skills and runtime assets in its native project directory
- A dedicated `CODEX.md` guidance file must exist in source and template output

### CLI support

- `cfsa-antigravity init --agent codex` must install the Codex runtime
- Help text and usage examples must mention Codex
- `cfsa-antigravity status` must detect a Codex install and report missing/present components correctly

### Documentation support

- Root docs must list Codex as explicitly supported
- Contributor docs must explain how Codex runtime files fit into the architecture and publishing flow
- Agent-setup docs must explain how Codex users should operate the installed kit

### Template/build support

- The build process must publish Codex runtime assets into `template/`
- Integrity checks must include Codex runtime expectations where appropriate

## Constraints

- Changes should be minimal and pattern-aligned with existing runtime architecture
- Template placeholders must remain placeholders in kit source
- Existing installers and published flows for Antigravity and Claude must stay intact
- The implementation should avoid duplicating logic when the CLI can generalize across runtimes cleanly

## Design Approach

Prefer a surgical extension of the current runtime model:

1. Adapt the standalone skill-based runtime shape for Codex under `.codex/`
2. Add a Codex-specific root guidance file for parity and discoverability
3. Add an explicit installer/status path for Codex
4. Update source-of-truth docs first, then CLI/build logic, then published template expectations

## Risks

- Incomplete template/build wiring causing Codex support to work in source but not in published package
- Documentation inconsistency if Codex is added in README but omitted from architecture or contribution docs

## Acceptance Criteria

- `package.json` usage and [bin/cli.mjs](../../bin/cli.mjs) support a Codex agent installation path
- `CODEX.md` exists in source and is included in the built template
- Root and architecture documentation explicitly describe Codex as supported
- Template integrity checks pass after the change
- Existing Antigravity and Claude install paths still behave as before

## Verification Plan

- Run the project build command to regenerate `template/`
- Run the project integrity check command
- Manually inspect CLI help/status behavior for Codex references
- Confirm published-template source paths contain Codex runtime assets
