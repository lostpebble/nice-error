# CLAUDE.md

## Environment

- **OS**: Windows — use PowerShell for console commands, prefer PowerShell-native tooling over Linux CLI equivalents.
- **Package manager**: Bun — use `bun` and `bunx` instead of npm/npx/yarn for all TypeScript/JavaScript tasks.

## Monorepo commands

- **Type-check all workspaces**: `bun run type-check-all` (run from repo root)
- **Type-check single workspace**: `bun run type-check` (run from workspace dir)
- **Run tests for packages/core**: `bun run vitest-agent` (run from packages/core)

## Code Guide

### TypeScript

- Avoid `as` type-casting. Prefer actual inferred types. If inference fails, indicates different issue.
- For `null` or `undefined` conditional checks- always use `!=` when expecting to check against any of them (unless there is a reason to check exactly for one or the other). This ensure we catch both of these conditions (nullish), no matter what the return value might be.
- All "type" type definitions should start with a "T". E.g. "TNiceActionResult"
- All "interface" type definitions should start with an "I". E.g. "IUser"