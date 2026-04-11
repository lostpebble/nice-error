# CLAUDE.md

## Environment

- **OS**: Windows — use PowerShell for console commands, and prefer PowerShell-native tooling over Linux CLI equivalents.
- **Package manager**: Bun — use `bun` and `bunx` instead of npm/npx/yarn for all TypeScript/JavaScript tasks.

## Monorepo commands

- **Type-check all workspaces**: `bun run type-check-all` (run from repo root)
- **Type-check a single workspace**: `bun run type-check` (run from the workspace directory)
- **Run tests for packages/core**: `bun run vitest-agent` (run from packages/core)

## Code Guide

### Typescript

- Avoid the use of "as" type-casting as much as possible. Prefer using the actual types as they are inferred. If they are not inferred properly, then it indicates a different issue.