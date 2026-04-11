# CLAUDE.md

## Environment

- **OS**: Windows — use PowerShell for console commands, prefer PowerShell-native tooling over Linux CLI equivalents.
- **Package manager**: Bun — use `bun` and `bunx` instead of npm/npx/yarn for all TypeScript/JavaScript tasks.

## Monorepo commands

- **Type-check all workspaces**: `bun run type-check-all` (run from repo root)
- **Type-check single workspace**: `bun run type-check` (run from workspace dir)
- **Run tests for packages/core**: `bun run vitest-agent` (run from packages/core)

## Code Guide

### Typescript

- Avoid `as` type-casting. Prefer actual inferred types. If inference fails, indicates different issue.
