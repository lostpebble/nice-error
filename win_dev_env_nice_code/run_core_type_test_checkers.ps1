wt -w 0 nt -d ".\packages\nice-error" pwsh -NoExit -Command "bun run vitest" `; `
      nt -d ".\packages\nice-error" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\common-errors" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\nice-action" pwsh -NoExit -Command "bun run vitest" `; `
      nt -d ".\packages\nice-action" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\nice-connect" pwsh -NoExit -Command "bun run vitest" `; `
      nt -d ".\packages\nice-connect" pwsh -NoExit -Command "bun run type-check-watch"